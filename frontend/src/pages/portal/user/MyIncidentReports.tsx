import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import IncidentDetailModal from '../../../components/IncidentDetailModal';
import { useScrollLock } from '../../../lib/useScrollLock';

interface ReportCase {
  id: string;
  dbId: string;
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
    dbId: r.id,
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
  const [query, setQuery] = useState('');
  const [cases, setCases] = useState<ReportCase[]>([]);
  const [selectedId, setSelectedId] = useState<string>('');
  const [modalOpen, setModalOpen] = useState(false);
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
        setSelectedId(mapped[0]?.dbId ?? '');
      }
      setLoading(false);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useScrollLock(modalOpen);

  const filtered = cases.filter((c) => {
    if (tab === 'Active Cases') return c.status === 'Under Investigation';
    if (tab === 'Resolved / Closed') return c.status === 'Resolved' || c.status === 'Rejected';
    return true;
  }).filter((c) => {
    const q = query.trim().toLowerCase();
    if (!q) return true;
    return (
      c.id.toLowerCase().includes(q) ||
      c.title.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q) ||
      c.location.toLowerCase().includes(q)
    );
  });

  const handleViewDetails = (id: string) => {
    setSelectedId(id);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
  };

  return (
    <>
      <div className="space-y-4 sm:space-y-6">
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
                  placeholder="Search Case ID, title, category..."
                  type="text"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
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
                  <tr className="border-b border-border-subtle bg-surface-container-low">
                    <th className="py-2 px-3 sm:px-4 sm:py-3 font-caps-xs text-caps-xs text-on-surface-variant">CASE REFERENCE</th>
                    <th className="py-2 px-3 sm:px-4 sm:py-3 font-caps-xs text-caps-xs text-on-surface-variant">CATEGORY</th>
                    <th className="py-2 px-3 sm:px-4 sm:py-3 font-caps-xs text-caps-xs text-on-surface-variant">DATE &amp; LOCATION</th>
                    <th className="py-2 px-3 sm:px-4 sm:py-3 font-caps-xs text-caps-xs text-on-surface-variant">STATUS</th>
                    <th className="py-2 px-3 sm:px-4 sm:py-3 font-caps-xs text-caps-xs text-on-surface-variant text-right">ACTION</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filtered.map((c) => (
                    <tr key={c.id} className="hover:bg-surface-container-low transition-colors">
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
                          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border ${
                            c.status === 'Under Investigation'
                              ? 'bg-warning-amber/10 text-warning-amber border-warning-amber/20'
                              : c.status === 'Resolved'
                                ? 'bg-success-green/10 text-success-green border-success-green/20'
                                : 'bg-surface-container-low text-on-surface-variant border-border-subtle'
                          }`}
                        >
                          <span
                            className={`w-1.5 h-1.5 rounded-full ${
                              c.status === 'Under Investigation' ? 'bg-warning-amber' : c.status === 'Resolved' ? 'bg-success-green' : 'bg-outline'
                            }`}
                          ></span>
                          {c.status}
                        </span>
                      </td>
                      <td className="py-3 px-3 sm:px-4 sm:py-4 text-right">
                        <button type="button" className="text-secondary font-label-md text-label-md hover:underline" onClick={() => handleViewDetails(c.dbId)}>
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

      <IncidentDetailModal reportId={modalOpen ? selectedId : null} onClose={handleCloseModal} isAdmin={false} />
    </>
  );
}

