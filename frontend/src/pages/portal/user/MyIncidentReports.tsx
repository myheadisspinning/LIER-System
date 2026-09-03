import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';

interface ReportCase {
  id: string;
  title: string;
  category: string;
  date: string;
  location: string;
  status: 'Under Investigation' | 'Resolved' | 'Rejected';
  officer: string;
  note?: string;
  confidence: number;
  priority: string;
  steps: { label: string; sub: string; state: 'done' | 'active' | 'pending' }[];
}

type DbReport = {
  id: string;
  report_no: string | null;
  title: string;
  category: string;
  status: string;
  confidence: number;
  priority: string;
  address: string | null;
  ai_dispatch: string | null;
  dispatch_unit: { name: string }[] | null;
  created_at: string;
};

function toCase(r: DbReport): ReportCase {
  const status: ReportCase['status'] =
    r.status === 'Resolved' ? 'Resolved' : r.status === 'Rejected' ? 'Rejected' : 'Under Investigation';
  const unit = r.dispatch_unit?.[0]?.name ?? r.ai_dispatch ?? 'Awaiting assignment';

  const steps = [
    { label: 'Report Received & AI Triaged', sub: new Date(r.created_at).toLocaleString('en-PH'), state: 'done' as const },
    { label: 'Desk Officer Assigned', sub: r.status === 'Pending' ? 'Pending' : 'Command center reviewing', state: r.status === 'Pending' ? ('pending' as const) : ('done' as const) },
    { label: 'Field Verification & Unit Dispatch', sub: unit, state: r.status === 'Progress' || r.status === 'Resolved' ? ('done' as const) : r.status === 'Assigned' || r.status === 'Verifying' ? ('active' as const) : ('pending' as const) },
    { label: 'Final Settlement / Case Closed', sub: r.status === 'Resolved' ? 'Resolved' : 'Pending', state: r.status === 'Resolved' ? ('done' as const) : r.status === 'Progress' ? ('active' as const) : ('pending' as const) },
  ];

  return {
    id: r.report_no ?? r.id.slice(0, 8).toUpperCase(),
    title: r.title,
    category: r.category,
    date: new Date(r.created_at).toLocaleDateString('en-PH', { year: 'numeric', month: 'short', day: 'numeric' }),
    location: r.address ?? 'Location on file',
    status,
    officer: unit,
    note: r.status === 'Assigned' || r.status === 'Verifying' ? (r.ai_dispatch ?? undefined) : undefined,
    confidence: r.confidence,
    priority: r.priority,
    steps,
  };
}

const tabs = ['All Reports', 'Active Cases', 'Resolved / Closed'] as const;
type Tab = (typeof tabs)[number];

export default function MyIncidentReports() {
  const [tab, setTab] = useState<Tab>('All Reports');
  const [cases, setCases] = useState<ReportCase[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
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
      const { data, error: err } = await supabase
        .from('incident_reports')
        .select('id, report_no, title, category, status, confidence, priority, address, ai_dispatch, dispatch_unit:dispatch_unit_id(name), created_at')
        .eq('user_id', session.user.id)
        .order('created_at', { ascending: false });
      if (cancelled) return;
      if (err) {
        setError(err.message);
      } else {
        const mapped = (data as DbReport[]).map(toCase);
        setCases(mapped);
        setSelectedId(mapped[0]?.id ?? '');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = cases.filter((c) => {
    if (tab === 'Active Cases') return c.status === 'Under Investigation';
    if (tab === 'Resolved / Closed') return c.status === 'Resolved';
    return true;
  });

  const current = cases.find((c) => c.id === selectedId) ?? cases[0];

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter items-start">
        <div className="lg:col-span-7 space-y-4">
          <div className="bg-surface-container-lowest rounded-2xl border border-border-subtle overflow-hidden">
            <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-bg/50">
              <div className="flex space-x-1 bg-surface-container rounded-lg p-1">
                {tabs.map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setTab(t)}
                    className={`px-4 py-1.5 rounded font-label-md text-label-md transition-colors ${
                      tab === t ? 'bg-surface-container-lowest shadow-sm text-secondary' : 'text-on-surface-variant hover:text-on-surface'
                    }`}
                  >
                    {t}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-3 w-full sm:w-auto">
                <div className="relative flex-1 sm:w-64">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
                  <input
                    className="w-full bg-surface-container-lowest border border-border-subtle rounded-md py-1.5 pl-9 pr-3 text-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                    placeholder="Search Case ID..."
                    type="text"
                  />
                </div>
              </div>
            </div>
            {loading ? (
              <div className="p-6 sm:p-10 text-center text-sm text-on-surface-variant">Loading your reports…</div>
            ) : error ? (
              <div className="p-6 sm:p-10 text-center text-sm text-error">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="p-6 sm:p-10 text-center text-sm text-on-surface-variant">No reports yet. Submit an incident to see it here.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="border-b border-border-subtle bg-surface-bg">
                      <th className="py-2 px-3 sm:px-4 sm:py-3 font-caps-xs text-caps-xs text-on-surface-variant">CASE REFERENCE</th>
                      <th className="py-2 px-3 sm:px-4 sm:py-3 font-caps-xs text-caps-xs text-on-surface-variant">CATEGORY</th>
                      <th className="py-2 px-3 sm:px-4 sm:py-3 font-caps-xs text-caps-xs text-on-surface-variant">DATE &amp; LOCATION</th>
                      <th className="py-2 px-3 sm:px-4 sm:py-3 font-caps-xs text-caps-xs text-on-surface-variant">STATUS</th>
                      <th className="py-2 px-3 sm:px-4 sm:py-3 font-caps-xs text-caps-xs text-on-surface-variant text-right">ACTION</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {filtered.map((c) => (
                      <tr
                        key={c.id}
                        onClick={() => setSelectedId(c.id)}
                        className={`hover:bg-slate-50 transition-colors cursor-pointer ${selectedId === c.id ? 'bg-secondary/5' : ''}`}
                      >
                        <td className="py-3 px-3 sm:px-4 sm:py-4">
                          <div className="font-label-md text-label-md font-bold text-on-surface">{c.id}</div>
                          <div className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">{c.title}</div>
                        </td>
                        <td className="py-3 px-3 sm:px-4 sm:py-4 text-body-sm">{c.category}</td>
                        <td className="py-3 px-3 sm:px-4 sm:py-4">
                          <div className="font-body-sm text-body-sm">{c.date}</div>
                          <div className="font-body-sm text-body-sm text-on-surface-variant">{c.location}</div>
                        </td>
                        <td className="py-3 px-3 sm:px-4 sm:py-4">
                          <span
                            className={`inline-flex items-center px-2 py-1 rounded font-label-sm text-label-sm border ${
                              c.status === 'Under Investigation'
                                ? 'bg-warning-amber/10 text-[#92400e] border-warning-amber/20'
                                : c.status === 'Resolved'
                                  ? 'bg-success-green/10 text-[#166534] border-success-green/20'
                                  : 'bg-slate-100 text-slate-500 border-slate-200'
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full mr-1.5 ${
                                c.status === 'Under Investigation' ? 'bg-warning-amber' : c.status === 'Resolved' ? 'bg-success-green' : 'bg-slate-400'
                              }`}
                            ></span>
                            {c.status}
                          </span>
                        </td>
                        <td className="py-3 px-3 sm:px-4 sm:py-4 text-right">
                          <button type="button" className="text-secondary font-label-md text-label-md hover:underline" onClick={() => setSelectedId(c.id)}>
                            View Details
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5 relative">
          <div className="bg-surface-container-lowest rounded-2xl border border-border-subtle shadow-[0_1px_2px_rgba(2,6,23,0.05),0_12px_32px_-16px_rgba(2,6,23,0.18)] overflow-hidden sticky top-24">
            <div className="p-4 sm:p-6 border-b border-border-subtle bg-gradient-to-br from-surface-bg to-white">
              <div className="font-caps-xs text-caps-xs text-secondary mb-2">CASE DETAILS</div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Case #{current?.id}</h3>
              <p className="font-body-md text-body-md text-on-surface-variant mt-1">{current?.title}</p>
            </div>
            {!current ? (
              <div className="p-6 sm:p-10 text-center text-sm text-on-surface-variant">Select a report to view its progress.</div>
            ) : (
              <div className="p-4 sm:p-6 space-y-6 sm:space-y-8">
                <div>
                  <h4 className="font-caps-xs text-caps-xs text-on-surface-variant mb-4">PROGRESS TRACKER</h4>
                  <div className="relative pl-6 space-y-4 sm:space-y-6 before:absolute before:inset-y-0 before:left-[11px] before:w-[2px] before:bg-border-subtle">
                    {current.steps.map((step) => (
                      <div key={step.label} className="relative">
                        <div
                          className={`absolute -left-[30px] w-6 h-6 rounded-full flex items-center justify-center z-10 shadow-sm ${
                            step.state === 'done'
                              ? 'bg-secondary text-white'
                              : step.state === 'active'
                                ? 'bg-white border-2 border-secondary'
                                : 'bg-surface-container-high'
                          }`}
                        >
                          {step.state === 'done' && <span className="material-symbols-outlined text-[14px]">check</span>}
                          {step.state === 'active' && <div className="w-2 h-2 rounded-full bg-secondary animate-pulse"></div>}
                          {step.state === 'pending' && <span className="material-symbols-outlined text-[14px] text-on-surface-variant">schedule</span>}
                        </div>
                        <div className={`font-label-md text-label-md ${step.state === 'active' ? 'text-secondary font-bold' : 'text-on-surface'}`}>
                          {step.label}
                        </div>
                        {step.state === 'active' && current.note ? (
                          <div className="font-body-sm text-body-sm text-on-surface-variant mt-2 bg-warning-amber/5 border border-warning-amber/10 p-3 rounded text-[#92400e]">
                            <strong className="font-label-sm block mb-1">Command Center Note:</strong>
                            "{current.note}"
                          </div>
                        ) : (
                          <div className="font-body-sm text-body-sm text-on-surface-variant">{step.sub}</div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-caps-xs text-caps-xs text-on-surface-variant mb-3 flex justify-between items-center">
                    AI TRIAGE
                    <span className="text-secondary font-label-sm lowercase normal-case cursor-pointer hover:underline">View All</span>
                  </h4>
                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded bg-secondary/5 border border-secondary/10 p-3">
                      <p className="text-[10px] font-bold uppercase text-on-surface-variant">Confidence</p>
                      <p className="text-xl font-bold text-secondary">{current.confidence}%</p>
                    </div>
                    <div className="rounded bg-secondary/5 border border-secondary/10 p-3">
                      <p className="text-[10px] font-bold uppercase text-on-surface-variant">Priority</p>
                      <p className="text-xl font-bold text-on-surface">{current.priority}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}
            <div className="p-4 border-t border-border-subtle bg-surface-bg flex justify-end">
              <button
                type="button"
                className="px-4 py-2 border border-border-subtle rounded text-on-surface-variant font-label-md hover:bg-surface-container-lowest transition-colors flex items-center gap-2"
              >
                <span className="material-symbols-outlined text-[18px]">upload</span>
                Upload More Evidence
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
