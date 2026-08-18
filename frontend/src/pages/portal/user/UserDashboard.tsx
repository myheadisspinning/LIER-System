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
  red: 'bg-cc-red/10 text-cc-red border border-cc-red/30',
  blue: 'bg-cc-blue/10 text-cc-blue border border-cc-blue/30',
  green: 'bg-cc-emerald/10 text-cc-emerald border border-cc-emerald/30',
  safety: 'bg-cc-teal/10 text-cc-teal border border-cc-teal/30',
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
  if (priority === 'CRITICAL') return 'bg-cc-red/15 text-cc-red border-cc-red/30';
  if (priority === 'HIGH') return 'bg-cc-accent/15 text-cc-accent border-cc-accent/30';
  if (priority === 'MEDIUM') return 'bg-cc-teal/15 text-cc-teal border-cc-teal/30';
  return 'bg-cc-hover text-cc-muted border-cc-border-strong';
};

const statusMeta = (status: string) => {
  if (status === 'Resolved')
    return { label: 'Resolved', chip: 'bg-cc-emerald/15 text-cc-emerald border-cc-emerald/30', dot: 'bg-cc-emerald' };
  if (status === 'Rejected')
    return { label: 'Rejected', chip: 'bg-cc-red/15 text-cc-red border-cc-red/30', dot: 'bg-cc-red' };
  return { label: 'Under Investigation', chip: 'bg-cc-accent/15 text-cc-accent border-cc-accent/30', dot: 'bg-cc-accent' };
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
    <div className="-m-5 lg:-m-8 bg-cc-bg text-cc-body font-body rounded-2xl px-5 lg:px-8 py-6 lg:py-8 relative overflow-hidden">
      <div
        className="pointer-events-none absolute inset-0"
        style={{
          background:
            'radial-gradient(1100px 500px at 88% -10%, var(--color-cc-glow-blue), transparent 60%), radial-gradient(900px 460px at -8% 2%, var(--color-cc-glow-accent), transparent 55%)',
        }}
      ></div>
      <div className="relative">
        {/* ============ GREETING + QUICK ACTIONS ============ */}
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h2 className="text-2xl font-bold text-cc-heading tracking-tight">
              {greeting}, {firstName}
            </h2>
            <p className="text-sm text-cc-muted mt-1">
              Here&apos;s what&apos;s happening with your reports and community alerts.
            </p>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/user/emergency-sos"
              className="inline-flex items-center gap-2 bg-cc-red text-white px-4 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">sos</span> Emergency SOS
            </Link>
            <Link
              to="/user/report-incident"
              className="inline-flex items-center gap-2 bg-cc-accent text-cc-on-accent px-4 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98]"
            >
              <span className="material-symbols-outlined text-[18px]">add</span> New Report
            </Link>
          </div>
        </div>

        {/* ============ KPI ROW ============ */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
          <div className="bg-cc-card p-6 rounded-2xl border border-cc-border border-t-2 border-t-cc-emerald shadow-cc-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-cc-emerald/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-cc-emerald" style={{ fontSize: 22 }}>description</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cc-emerald/10 text-cc-emerald border border-cc-emerald/25 text-[11px] font-bold">
                {loading ? '…' : `${active} active`}
              </span>
            </div>
            <p className="text-[10px] font-bold text-cc-muted uppercase tracking-widest mb-1">My Reports</p>
            <p className="font-headline-md text-headline-md font-bold text-cc-heading">{loading ? '—' : total}</p>
            <p className="text-xs text-cc-muted mt-1.5">Submitted to Barangay Culiat</p>
          </div>
          <div className="bg-cc-card p-6 rounded-2xl border border-cc-border border-t-2 border-t-cc-blue shadow-cc-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-cc-blue/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-cc-blue" style={{ fontSize: 22 }}>folder_open</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cc-blue/10 text-cc-blue border border-cc-blue/25 text-[11px] font-bold">IN PROGRESS</span>
            </div>
            <p className="text-[10px] font-bold text-cc-muted uppercase tracking-widest mb-1">Active Cases</p>
            <p className="font-headline-md text-headline-md font-bold text-cc-heading">{loading ? '—' : active}</p>
            <p className="text-xs text-cc-muted mt-1.5">Under investigation</p>
          </div>
          <div className="bg-cc-card p-6 rounded-2xl border border-cc-border border-t-2 border-t-cc-teal shadow-cc-card">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-cc-teal/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-cc-teal" style={{ fontSize: 22 }}>task_alt</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cc-teal/10 text-cc-teal border border-cc-teal/25 text-[11px] font-bold">CLOSED</span>
            </div>
            <p className="text-[10px] font-bold text-cc-muted uppercase tracking-widest mb-1">Resolved</p>
            <p className="font-headline-md text-headline-md font-bold text-cc-heading">{loading ? '—' : resolved}</p>
            <p className="text-xs text-cc-muted mt-1.5">Settled &amp; closed</p>
          </div>
          <Link to="/user/advisories" className="bg-cc-card p-6 rounded-2xl border border-cc-border border-t-2 border-t-cc-red shadow-cc-card hover:border-cc-red/40 transition-colors">
            <div className="flex items-center justify-between mb-4">
              <div className="w-10 h-10 rounded-xl bg-cc-red/15 flex items-center justify-center">
                <span className="material-symbols-outlined text-cc-red" style={{ fontSize: 22 }}>notifications_active</span>
              </div>
              <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-cc-red/10 text-cc-red border border-cc-red/25 text-[11px] font-bold">NEW</span>
            </div>
            <p className="text-[10px] font-bold text-cc-muted uppercase tracking-widest mb-1">Community Alerts</p>
            <p className="font-headline-md text-headline-md font-bold text-cc-heading">{ADVISORIES.length}</p>
            <p className="text-xs text-cc-muted mt-1.5">Latest barangay announcements</p>
          </Link>
        </div>

        {/* ============ QUICK ACTION MODULES ============ */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 mt-6">
          <Link to="/user/report-incident" className="group bg-cc-card rounded-2xl border border-cc-border shadow-cc-card p-5 flex items-center gap-4 hover:border-cc-accent/50 transition-colors">
            <span className="w-11 h-11 rounded-xl bg-cc-accent/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-cc-accent">campaign</span>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-cc-heading">Report an Incident</span>
              <span className="block text-xs text-cc-muted">Submit a new report with location &amp; media</span>
            </span>
            <span className="material-symbols-outlined text-cc-muted group-hover:text-cc-accent ml-auto transition-colors">arrow_forward</span>
          </Link>
          <Link to="/user/emergency-sos" className="group bg-cc-card rounded-2xl border border-cc-border shadow-cc-card p-5 flex items-center gap-4 hover:border-cc-red/50 transition-colors">
            <span className="w-11 h-11 rounded-xl bg-cc-red/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-cc-red">emergency</span>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-cc-heading">Emergency SOS</span>
              <span className="block text-xs text-cc-muted">1-tap distress call to responders</span>
            </span>
            <span className="material-symbols-outlined text-cc-muted group-hover:text-cc-red ml-auto transition-colors">arrow_forward</span>
          </Link>
          <Link to="/user/evidence-vault" className="group bg-cc-card rounded-2xl border border-cc-border shadow-cc-card p-5 flex items-center gap-4 hover:border-cc-teal/50 transition-colors">
            <span className="w-11 h-11 rounded-xl bg-cc-teal/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-cc-teal">inventory_2</span>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-cc-heading">Evidence Vault</span>
              <span className="block text-xs text-cc-muted">Store &amp; link your media evidence</span>
            </span>
            <span className="material-symbols-outlined text-cc-muted group-hover:text-cc-teal ml-auto transition-colors">arrow_forward</span>
          </Link>
          <Link to="/user/case-chat" className="group bg-cc-card rounded-2xl border border-cc-border shadow-cc-card p-5 flex items-center gap-4 hover:border-cc-blue/50 transition-colors">
            <span className="w-11 h-11 rounded-xl bg-cc-blue/15 flex items-center justify-center shrink-0">
              <span className="material-symbols-outlined text-cc-blue">chat</span>
            </span>
            <span className="min-w-0">
              <span className="block text-sm font-bold text-cc-heading">Case Chat</span>
              <span className="block text-xs text-cc-muted">Message desk officers securely</span>
            </span>
            <span className="material-symbols-outlined text-cc-muted group-hover:text-cc-blue ml-auto transition-colors">arrow_forward</span>
          </Link>
        </div>

        {/* ============ RECENT REPORTS + AI TRIAGE + CHAT ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <section className="lg:col-span-8 bg-cc-card rounded-2xl border border-cc-border shadow-cc-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h3 className="font-headline-md text-headline-md font-bold text-cc-heading">My Recent Reports</h3>
              <Link to="/user/my-incident-reports" className="inline-flex items-center gap-1 text-xs font-bold text-cc-accent hover:underline">
                View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            {loading ? (
              <div className="p-10 text-center text-sm text-cc-muted">Loading your reports…</div>
            ) : error ? (
              <div className="p-10 text-center text-sm text-cc-red">{error}</div>
            ) : reports.length === 0 ? (
              <div className="p-10 text-center">
                <span className="material-symbols-outlined text-4xl text-cc-muted">inbox</span>
                <p className="text-sm text-cc-muted mt-3 mb-4">You haven&apos;t submitted any reports yet.</p>
                <Link
                  to="/user/report-incident"
                  className="inline-flex items-center gap-2 bg-cc-accent text-cc-on-accent px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98]"
                >
                  <span className="material-symbols-outlined text-[18px]">add</span> Report an Incident
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left">
                  <thead className="border-b border-cc-border bg-cc-hover">
                    <tr>
                      <th className="py-3 px-4 text-xs font-bold text-cc-muted uppercase tracking-widest">Report</th>
                      <th className="py-3 px-4 text-xs font-bold text-cc-muted uppercase tracking-widest">Category</th>
                      <th className="py-3 px-4 text-xs font-bold text-cc-muted uppercase tracking-widest">Date &amp; Location</th>
                      <th className="py-3 px-4 text-xs font-bold text-cc-muted uppercase tracking-widest">Status</th>
                      <th className="py-3 px-4 text-xs font-bold text-cc-muted uppercase tracking-widest">AI Priority</th>
                      <th className="py-3 px-4 text-xs font-bold text-cc-muted uppercase tracking-widest text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-cc-border">
                    {reports.map((r) => {
                      const sm = statusMeta(r.status);
                      return (
                        <tr key={r.id} className="hover:bg-cc-hover transition-colors">
                          <td className="py-4 px-4">
                            <div className="text-sm font-semibold text-cc-heading">{r.report_no ?? r.id.slice(0, 8).toUpperCase()}</div>
                            <div className="text-xs text-cc-muted mt-0.5 max-w-[180px] truncate">{r.title}</div>
                          </td>
                          <td className="py-4 px-4 text-sm text-cc-body">{r.category}</td>
                          <td className="py-4 px-4">
                            <div className="text-sm text-cc-body">{formatDate(r.created_at)}</div>
                            <div className="text-xs text-cc-muted max-w-[140px] truncate">{r.address ?? 'Location on file'}</div>
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
                            <Link to="/user/my-incident-reports" className="text-xs font-bold text-cc-accent hover:underline">
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
            <section className="bg-cc-card rounded-2xl border border-cc-border shadow-cc-card p-6">
              <div className="flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-cc-accent">smart_toy</span>
                <h3 className="font-headline-md text-headline-md font-bold text-cc-heading">Latest AI Triage</h3>
              </div>
              {!latest ? (
                <p className="text-sm text-cc-muted">
                  {loading ? 'Analyzing your latest report…' : 'Submit a report and the AI will classify it here.'}
                </p>
              ) : (
                <div className="space-y-4">
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <p className="text-[10px] font-bold text-cc-muted uppercase tracking-widest mb-0.5">Detected Category</p>
                      <p className="text-sm font-bold text-cc-heading">{latest.category}</p>
                    </div>
                    <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-bold border ${priorityChip(latest.priority)}`}>
                      {latest.priority}
                    </span>
                  </div>
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <p className="text-[10px] font-bold text-cc-muted uppercase tracking-widest">AI Confidence</p>
                      <p className="text-xs font-bold text-cc-accent">{latest.confidence}%</p>
                    </div>
                    <div className="h-1.5 bg-cc-track rounded-full overflow-hidden">
                      <div className="h-full bg-cc-accent rounded-full" style={{ width: `${latest.confidence}%` }}></div>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-lg bg-cc-hover border border-cc-border p-3">
                      <p className="text-[10px] font-bold text-cc-muted uppercase tracking-widest mb-1">Threat</p>
                      <p className="text-lg font-bold text-cc-heading">{latest.threat}/5</p>
                    </div>
                    <div className="rounded-lg bg-cc-hover border border-cc-border p-3">
                      <p className="text-[10px] font-bold text-cc-muted uppercase tracking-widest mb-1">Assigned</p>
                      <p className="text-xs font-bold text-cc-heading leading-tight truncate">{unit}</p>
                    </div>
                  </div>
                  <Link
                    to="/user/my-incident-reports"
                    className="w-full flex items-center justify-center gap-1.5 py-2 rounded-lg border border-cc-accent bg-cc-accent/10 text-cc-accent text-xs font-bold hover:bg-cc-accent/15 transition-colors"
                  >
                    Track this case <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                  </Link>
                </div>
              )}
            </section>

            <section className="bg-cc-card rounded-2xl border border-cc-border shadow-cc-card p-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline-md text-headline-md font-bold text-cc-heading flex items-center gap-2">
                  <span className="material-symbols-outlined text-cc-blue">chat</span> Case Chat
                </h3>
                <Link to="/user/case-chat" className="text-xs font-bold text-cc-accent hover:underline">
                  Open
                </Link>
              </div>
              <div className="bg-cc-hover border border-cc-border rounded-xl p-4">
                <div className="flex items-center gap-2 mb-2">
                  <div className="w-8 h-8 rounded-full bg-cc-blue/20 flex items-center justify-center">
                    <span className="material-symbols-outlined text-[16px] text-cc-blue">shield_person</span>
                  </div>
                  <div>
                    <p className="text-xs font-bold text-cc-heading">Desk Officer</p>
                    <p className="text-[10px] text-cc-muted">Barangay Command Center</p>
                  </div>
                  <span className="ml-auto text-[10px] text-cc-muted">10:55 AM</span>
                </div>
                <p className="text-sm text-cc-heading italic">
                  &quot;Good day! We&apos;re verifying the footage you attached. Kindly wait for the next update.&quot;
                </p>
              </div>
              <div className="flex items-center gap-2 mt-3 text-xs text-cc-muted">
                <span className="material-symbols-outlined text-[14px]">lock</span> Secure conversation with your desk officer
              </div>
            </section>
          </div>
        </div>

        {/* ============ COMMUNITY ALERTS + EVIDENCE SNAPSHOT ============ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mt-6">
          <section className="lg:col-span-7 bg-cc-card rounded-2xl border border-cc-border shadow-cc-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h3 className="font-headline-md text-headline-md font-bold text-cc-heading">Community Alerts</h3>
              <Link to="/user/advisories" className="inline-flex items-center gap-1 text-xs font-bold text-cc-accent hover:underline">
                View All Advisories <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            <div className="space-y-4">
              {ADVISORIES.map((a) => (
                <div key={a.title} className="flex gap-4 border border-cc-border rounded-xl p-4 bg-cc-hover/50">
                  <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded text-[10px] font-bold uppercase tracking-wider h-fit shrink-0 ${toneClasses[a.tone]}`}>
                    <span className="material-symbols-outlined text-[12px]">campaign</span>
                    {a.category}
                  </span>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-bold text-cc-heading leading-snug">{a.title}</p>
                    </div>
                    <p className="text-xs text-cc-muted mt-1 leading-relaxed">{a.body}</p>
                    <p className="text-[10px] text-cc-muted mt-1.5">{a.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </section>

          <section className="lg:col-span-5 bg-cc-card rounded-2xl border border-cc-border shadow-cc-card p-6">
            <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
              <h3 className="font-headline-md text-headline-md font-bold text-cc-heading">My Evidence</h3>
              <Link to="/user/evidence-vault" className="inline-flex items-center gap-1 text-xs font-bold text-cc-accent hover:underline">
                Open Vault <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
              </Link>
            </div>
            <div className="space-y-4">
              {VAULT_ITEMS.map((item) => (
                <div key={item.name} className="flex items-center gap-4 border border-cc-border rounded-xl p-3 bg-cc-hover/50">
                  <div className="relative w-16 h-11 rounded-lg overflow-hidden shrink-0 border border-cc-border-strong bg-cc-hover">
                    <img className="w-full h-full object-cover" src={item.thumb} alt={item.name} />
                    {item.kind === 'video' && (
                      <span className="absolute inset-0 flex items-center justify-center">
                        <span className="material-symbols-outlined text-white text-lg drop-shadow-md">play_circle</span>
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-bold text-cc-heading truncate">{item.name}</p>
                    <p className="text-xs text-cc-muted">
                      {item.size} • {item.uploaded}
                    </p>
                  </div>
                  <span className="material-symbols-outlined text-cc-muted">verified</span>
                </div>
              ))}
            </div>
            <p className="text-[10px] text-cc-muted mt-4 flex items-center gap-1.5">
              <span className="material-symbols-outlined text-[13px]">lock</span> Unlinked media auto-purges after 30 days
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
