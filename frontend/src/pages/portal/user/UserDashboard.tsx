import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';

type DbReport = {
  id: string;
  report_no: string | null;
  title: string;
  category: string;
  status: string;
  confidence: number;
  priority: string;
  threat: number;
  address: string | null;
  ai_dispatch: string | null;
  dispatch_unit: { name: string }[] | null;
  created_at: string;
};

interface Advisory {
  category: string;
  tone: 'red' | 'blue' | 'green' | 'safety';
  time: string;
  title: string;
  body: string;
}

interface VaultItem {
  name: string;
  kind: 'photo' | 'video';
  size: string;
  uploaded: string;
  thumb: string;
}

const ADVISORIES: Advisory[] = [
  {
    category: 'Emergency & Crime',
    tone: 'red',
    time: 'Issued 30 mins ago',
    title: 'Preemptive Evacuation: Low-lying areas of Purok 4 & 5',
    body: 'Water levels at Tullahan River reached critical status. Residents are advised to evacuate to Culiat High School or the Barangay Covered Court immediately.',
  },
  {
    category: 'Barangay Services',
    tone: 'blue',
    time: '2 hrs ago',
    title: 'Scheduled Power Interruption in Purok 2 — Aug 10',
    body: 'Meralco will conduct line maintenance along Regalado Ave. Expect power interruption from 8:00 AM to 3:00 PM.',
  },
  {
    category: 'Public Safety',
    tone: 'safety',
    time: 'Aug 5',
    title: 'CCTV Installation & Enhanced Tanod Night Patrols',
    body: 'New surveillance cameras activated along Union St. Roving patrols increased between 10 PM and 4 AM.',
  },
];

const toneClasses: Record<Advisory['tone'], string> = {
  red: 'bg-error-red/10 text-error-red border border-error-red/30',
  blue: 'bg-sky-500/10 text-sky-600 border border-sky-500/30',
  green: 'bg-success-green/10 text-success-green border border-success-green/30',
  safety: 'bg-teal-500/10 text-teal-600 border border-teal-500/30',
};

const VAULT_ITEMS: VaultItem[] = [
  {
    name: 'Visayas_Ave_CCTV_Snippet_Aug6.mp4',
    kind: 'video',
    size: '14.2 MB',
    uploaded: 'Aug 6, 2026',
    thumb:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAe3Xj2sd0Fxuq6NZ7aLkADPR844_kr1yRYPfLEE9eSXBuasjolvIbOLds_ApeZxmin4JGGzQLjnDyX7mnqpJ6I36j_ypuEVDhzOd2BaRnqU4IQGO4kXW_XbjdQxCXYFl0m98yhZpOlfrFimgf-CUcWXvMpbK-m_7Ee2L6FnLLILxDDrzM334DQCKXmS-PCe-HFAz-6i2lszfFaaGKa6hrX8q-ub7N69OzoKozFzyqxSZ2bzb5bnFsC',
  },
  {
    name: 'Street_Light_Damage_Purok3.jpg',
    kind: 'photo',
    size: '3.1 MB',
    uploaded: 'Aug 4, 2026',
    thumb:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCCvXnW5zKFDWFvGW1MML9wSqW_6_hDbMI4CwmDkb9qyDPlPr4yIkW8DX6ij24feZ-BcpkxR1I6dT_xRhZ2mYQ9RdJl4RL9zDENjvmQ_tv8JP6cBwRFIitYuvWizwTjOKZiea-U_kaS8yKu9g3fWDq5-x-UWdpw4suBfYZe1Z7ghfPhF6ZyIM3okPZ2_u3Jv4nb_YcV05-0WIyIB_doV2VrLNXKitf7gSWt4yjS2-qidnHBf-seE2_c',
  },
];

const priorityChip = (priority: string) => {
  if (priority === 'CRITICAL') return 'bg-error-red/15 text-error-red border-error-red/30';
  if (priority === 'HIGH') return 'bg-secondary/15 text-secondary border-secondary/30';
  if (priority === 'MEDIUM') return 'bg-teal-500/15 text-teal-600 border-teal-500/30';
  return 'bg-surface-container-low text-on-surface-variant border-border-subtle';
};

const statusMeta = (status: string) => {
  if (status === 'Resolved')
    return { label: 'Resolved', chip: 'bg-success-green/15 text-success-green border-success-green/30', dot: 'bg-success-green' };
  if (status === 'Rejected')
    return { label: 'Rejected', chip: 'bg-error-red/15 text-error-red border-error-red/30', dot: 'bg-error-red' };
  return { label: 'Under Investigation', chip: 'bg-secondary/15 text-secondary border-secondary/30', dot: 'bg-secondary' };
};

const formatDate = (value: string) =>
  new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

export default function UserDashboard() {
  const [reports, setReports] = useState<DbReport[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      setError(null);
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) {
        setLoading(false);
        return;
      }
      const meta = session.user.user_metadata as Record<string, unknown> | undefined;
      const fullname = (typeof meta?.fullname === 'string' && meta.fullname.trim()) ||
        (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
        (typeof meta?.name === 'string' && meta.name.trim()) || '';
      if (!cancelled) setName(fullname || session.user.email || '');
      const { data, error: err } = await supabase
        .from('incident_reports')
        .select(
          'id, report_no, title, category, status, confidence, priority, threat, address, ai_dispatch, dispatch_unit:dispatch_unit_id(name), created_at',
        )
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false })
        .limit(6);
      if (cancelled) return;
      if (err) {
        setError(err.message);
      } else {
        setReports((data as DbReport[] | null) ?? []);
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const total = reports.length;
  const active = reports.filter((r) => r.status !== 'Resolved' && r.status !== 'Rejected').length;
  const resolved = reports.filter((r) => r.status === 'Resolved').length;
  const latest = reports[0];
  const unit = latest?.dispatch_unit?.[0]?.name ?? latest?.ai_dispatch ?? 'Awaiting assignment';
  const firstName = name.split(/\s+/)[0] || 'Resident';

  const hour = new Date().getHours();
  const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
    <div className="-m-5 lg:-m-8 bg-surface-container-low text-on-surface font-body rounded-2xl px-5 lg:px-8 py-6 lg:py-8 relative overflow-hidden">
      <div className="relative">
        {/* ============ GREETING + QUICK ACTIONS ============ */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-on-surface tracking-tight">
              {greeting}, {firstName}
            </h2>
            <p className="text-sm text-on-surface-variant mt-1">
              Here&apos;s what&apos;s happening with your reports and community alerts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/user/emergency-sos"
              className="inline-flex items-center gap-2 bg-error-red text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">sos</span> Emergency SOS
            </Link>
            <Link
              to="/user/report-incident"
              className="inline-flex items-center gap-2 bg-secondary text-on-secondary px-4 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span> New Report
            </Link>
          </div>
        </div>

        {/* ============ KPI ROW ============ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-white p-6 rounded-2xl border border-border-subtle border-t-2 border-t-cc-emerald shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-success-green/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-success-green" style={{ fontSize: 22 }}>description</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success-green/10 text-success-green border border-success-green/25 text-[11px] font-bold">
                {loading ? '…' : `${active} active`}
              </span>
            </div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">My Reports</p>
            <p className="font-headline-md text-headline-md font-bold text-on-surface">{loading ? '—' : total}</p>
            <p className="text-xs text-on-surface-variant mt-1.5">Submitted to Barangay Culiat</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-border-subtle border-t-2 border-t-cc-blue shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-sky-500/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-sky-600" style={{ fontSize: 22 }}>folder_open</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-sky-500/10 text-sky-600 border border-sky-500/25 text-[11px] font-bold">IN PROGRESS</span>
            </div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Active Cases</p>
            <p className="font-headline-md text-headline-md font-bold text-on-surface">{loading ? '—' : active}</p>
            <p className="text-xs text-on-surface-variant mt-1.5">Under investigation</p>
          </div>
          <div className="bg-white p-6 rounded-2xl border border-border-subtle border-t-2 border-t-cc-teal shadow-sm">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-teal-500/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-teal-600" style={{ fontSize: 22 }}>task_alt</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-teal-500/10 text-teal-600 border border-teal-500/25 text-[11px] font-bold">CLOSED</span>
            </div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Resolved</p>
            <p className="font-headline-md text-headline-md font-bold text-on-surface">{loading ? '—' : resolved}</p>
            <p className="text-xs text-on-surface-variant mt-1.5">Settled &amp; closed</p>
          </div>
          <Link to="/user/advisories" className="bg-white p-6 rounded-2xl border border-border-subtle border-t-2 border-t-cc-red shadow-sm hover:border-error-red/40 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-error-red/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-error-red" style={{ fontSize: 22 }}>notifications_active</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-error-red/10 text-error-red border border-error-red/25 text-[11px] font-bold">NEW</span>
            </div>
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Community Alerts</p>
            <p className="font-headline-md text-headline-md font-bold text-on-surface">{ADVISORIES.length}</p>
            <p className="text-xs text-on-surface-variant mt-1.5">Latest barangay announcements</p>
          </Link>
        </div>

        {/* ============ QUICK ACTION MODULES ============ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <Link to="/user/report-incident" className="group bg-white rounded-2xl border border-border-subtle shadow-sm p-5 flex items-center gap-4 hover:border-secondary/50 transition-colors">
            <span className="w-11 h-11 rounded-xl bg-secondary/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-secondary">campaign</span>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-on-surface">Report an Incident</span>
              <span className="block text-xs text-on-surface-variant">Submit a new report with location &amp; media</span>
            </span>
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-secondary ml-auto transition-colors">arrow_forward</span>
          </Link>
          <Link to="/user/emergency-sos" className="group bg-white rounded-2xl border border-border-subtle shadow-sm p-5 flex items-center gap-4 hover:border-error-red/50 transition-colors">
            <span className="w-11 h-11 rounded-xl bg-error-red/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-error-red">emergency</span>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-on-surface">Emergency SOS</span>
              <span className="block text-xs text-on-surface-variant">1-tap distress call to responders</span>
            </span>
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-error-red ml-auto transition-colors">arrow_forward</span>
          </Link>
          <Link to="/user/evidence-vault" className="group bg-white rounded-2xl border border-border-subtle shadow-sm p-5 flex items-center gap-4 hover:border-teal-500/50 transition-colors">
            <span className="w-11 h-11 rounded-xl bg-teal-500/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-teal-600">inventory_2</span>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-on-surface">Evidence Vault</span>
              <span className="block text-xs text-on-surface-variant">Store &amp; link your media evidence</span>
            </span>
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-teal-600 ml-auto transition-colors">arrow_forward</span>
          </Link>
          <Link to="/user/case-chat" className="group bg-white rounded-2xl border border-border-subtle shadow-sm p-5 flex items-center gap-4 hover:border-sky-500/50 transition-colors">
            <span className="w-11 h-11 rounded-xl bg-sky-500/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-sky-600">chat</span>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-on-surface">Case Chat</span>
              <span className="block text-xs text-on-surface-variant">Message desk officers securely</span>
            </span>
            <span className="material-symbols-outlined text-on-surface-variant group-hover:text-sky-600 ml-auto transition-colors">arrow_forward</span>
          </Link>
        </div>

        {/* ============ RECENT REPORTS + AI TRIAGE + CHAT ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <section className="lg:col-span-8 bg-white rounded-2xl border border-border-subtle shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">My Recent Reports</h3>
              <Link to="/user/my-incident-reports" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline">
                View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            {loading ? (
              <div className="p-10 text-center text-sm text-on-surface-variant">Loading your reports…</div>
            ) : error ? (
              <div className="p-10 text-center text-sm text-error-red">{error}</div>
            ) : reports.length === 0 ? (
              <div className="p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-on-surface-variant">inbox</span>
                <p className="text-sm text-on-surface-variant mt-3 mb-4">You haven&apos;t submitted any reports yet.</p>
                <Link
                  to="/user/report-incident"
                  className="inline-flex items-center gap-2 bg-secondary text-on-secondary px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span> Report an Incident
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-border-subtle bg-surface-container-low">
                    <tr>
                      <th className="py-3 px-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Report</th>
                      <th className="py-3 px-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Category</th>
                      <th className="py-3 px-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Date &amp; Location</th>
                      <th className="py-3 px-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">Status</th>
                      <th className="py-3 px-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest">AI Priority</th>
                      <th className="py-3 px-4 text-xs font-bold text-on-surface-variant uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {reports.map((r) => {
                      const sm = statusMeta(r.status);
                      return (
                        <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="py-4 px-4">
                            <div className="text-sm font-semibold text-on-surface">{r.report_no ?? r.id.slice(0, 8).toUpperCase()}</div>
                            <div className="text-xs text-on-surface-variant mt-0.5 max-w-[180px] truncate">{r.title}</div>
                          </td>
                          <td className="py-4 px-4 text-sm text-on-surface-variant">{r.category}</td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-on-surface-variant">{formatDate(r.created_at)}</div>
                            <div className="text-xs text-on-surface-variant max-w-[140px] truncate">{r.address ?? 'Location on file'}</div>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sm.chip}`}>
                              <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${sm.dot}`}></span>
                              {sm.label}
                            </span>
                          </td>
                          <td className="py-4 px-4">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${priorityChip(r.priority)}`}>
                              {r.priority}
                            </span>
                          </td>
                          <td className="py-4 px-4 text-right">
                            <Link to="/user/my-incident-reports" className="text-xs font-bold text-secondary hover:underline">
                              Track
                            </Link>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <div className="lg:col-span-4 space-y-6">
            <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary">smart_toy</span>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Latest AI Triage</h3>
              </div>
              {!latest ? (
                <p className="text-sm text-on-surface-variant">
                  {loading ? 'Analyzing your latest report…' : 'Submit a report and the AI will classify it here.'}
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-0.5">Detected Category</p>
                      <p className="text-sm font-bold text-on-surface">{latest.category}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${priorityChip(latest.priority)}`}>
                      {latest.priority}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest">AI Confidence</p>
                      <p className="text-xs font-bold text-secondary">{latest.confidence}%</p>
                    </div>
                    <div className="h-1.5 bg-surface-container-highest rounded-full overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: `${latest.confidence}%` }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-surface-container-low border border-border-subtle p-3">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Threat</p>
                      <p className="text-lg font-bold text-on-surface">{latest.threat}/5</p>
                    </div>
                    <div className="rounded-lg bg-surface-container-low border border-border-subtle p-3">
                      <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Assigned</p>
                      <p className="text-xs font-bold text-on-surface leading-tight truncate">{unit}</p>
                    </div>
                  </div>
                  <Link
                    to="/user/my-incident-reports"
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-secondary bg-secondary/10 text-secondary text-xs font-bold hover:bg-secondary/15 transition-colors"
                  >
                    Track this case <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>
              )}
            </section>

            <section className="bg-white rounded-2xl border border-border-subtle shadow-sm p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-sky-600">chat</span> Case Chat
                </h3>
                <Link to="/user/case-chat" className="text-xs font-bold text-secondary hover:underline">
                  Open
                </Link>
              </div>
              <div className="bg-surface-container-low border border-border-subtle rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-sky-500/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px] text-sky-600">shield_person</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-on-surface">Desk Officer</p>
                    <p className="text-[10px] text-on-surface-variant">Barangay Command Center</p>
                  </div>
                  <span className="ml-auto text-[10px] text-on-surface-variant">10:55 AM</span>
                </div>
                <p className="text-sm text-on-surface italic">
                  &quot;Good day! We&apos;re verifying the footage you attached. Kindly wait for the next update.&quot;
                </p>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-on-surface-variant">
                <span className="material-symbols-outlined text-[14px]">lock</span> Secure conversation with your desk officer
              </div>
            </section>
          </div>
        </div>

        {/* ============ COMMUNITY ALERTS + EVIDENCE SNAPSHOT ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <section className="lg:col-span-7 bg-white rounded-2xl border border-border-subtle shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Community Alerts</h3>
              <Link to="/user/advisories" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline">
                View All Advisories <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            <div className="space-y-4">
              {ADVISORIES.map((a) => (
                <div key={a.title} className="flex gap-4 border border-border-subtle rounded-xl p-4 bg-surface-container-low/50">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider h-fit shrink-0 ${toneClasses[a.tone]}`}>
                    <span className="material-symbols-outlined text-[12px]">campaign</span>
                    {a.category}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-on-surface leading-snug">{a.title}</p>
                    </div>
                    <p className="text-xs text-on-surface-variant mt-1 leading-relaxed">{a.body}</p>
                    <p className="text-[10px] text-on-surface-variant mt-1.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="lg:col-span-5 bg-white rounded-2xl border border-border-subtle shadow-sm p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">My Evidence</h3>
              <Link to="/user/evidence-vault" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline">
                Open Vault <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            <div className="space-y-4">
              {VAULT_ITEMS.map((item) => (
                <div key={item.name} className="flex items-center gap-4 border border-border-subtle rounded-xl p-3 bg-surface-container-low/50">
                  <div className="relative w-16 h-11 rounded-lg overflow-hidden shrink-0 border border-border-subtle bg-surface-container-low">
                    <img className="w-full h-full object-cover" src={item.thumb} alt={item.name} />
                    {item.kind === 'video' && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-lg drop-shadow-md">play_circle</span>
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-on-surface truncate">{item.name}</p>
                    <p className="text-xs text-on-surface-variant">
                      {item.size} • {item.uploaded}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-on-surface-variant">verified</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-on-surface-variant mt-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px]">lock</span> Unlinked media auto-purges after 30 days
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}



