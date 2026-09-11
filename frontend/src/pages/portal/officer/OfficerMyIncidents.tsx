import Ph from '../../../components/PhIcon';
import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import IncidentDetailModal from '../../../components/IncidentDetailModal';
import { fmtDate, getAdminProfile, logAudit, PRIORITY_BADGE } from '../../../lib/admin';
import Toast from '../../../components/Toast';
import Pagination from '../../../components/Pagination';

type Incident = {
  id: string;
  report_no: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  threat: number;
  confidence: number;
  status: string;
  incident_status: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  assigned_at: string | null;
  resolved_at: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  Pending: 'bg-warning-amber/10 text-warning-amber',
  Verifying: 'bg-sky-100 text-sky-700',
  Assigned: 'bg-blue-100 text-blue-700',
  Progress: 'bg-warning-amber/10 text-warning-amber',
  Resolved: 'bg-success-green/10 text-success-green',
  Rejected: 'bg-error-red/10 text-error-red',
};

const tabs = ['All', 'Assigned', 'Progress', 'Resolved'] as const;
type Tab = (typeof tabs)[number];

export default function OfficerMyIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [officerName, setOfficerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Tab>('All');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [selectedIncidentId, setSelectedIncidentId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchAll = async (uid: string | null) => {
    if (!uid) return [] as Incident[];
    const res = await supabase
      .from('incident_reports')
      .select('id, report_no, title, description, category, priority, threat, confidence, status, incident_status, address, lat, lng, created_at, assigned_at, resolved_at')
      .eq('dispatch_unit_id', uid)
      .order('created_at', { ascending: false });
    return (res.data ?? []) as Incident[];
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    void (async () => {
      const profile = await getAdminProfile();
      if (cancelled) return;
      setOfficerName(profile.fullname);
      const res = await supabase.from('dispatch_units').select('id, name').eq('lead_officer_id', profile.id).maybeSingle();
      const uid = (res.data?.id as string | undefined) ?? null;
      if (cancelled) return;
      setUnitId(uid);
      setIncidents(await fetchAll(uid));
      setLoading(false);

      if (uid) {
        channel = supabase
          .channel(`officer-incidents-${uid}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_reports', filter: `dispatch_unit_id=eq.${uid}` }, async () => {
            if (!cancelled) setIncidents(await fetchAll(uid));
          })
          .subscribe();
      }
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const visible = useMemo(
    () =>
      incidents.filter((i) => {
        const q = query.trim().toLowerCase();
        const matchesQuery = q === '' || i.title.toLowerCase().includes(q) || (i.report_no ?? '').toLowerCase().includes(q) || (i.address ?? '').toLowerCase().includes(q);
        const matchesFilter = filter === 'All' || i.status === filter;
        return matchesQuery && matchesFilter;
      }),
    [incidents, query, filter]
  );

  useEffect(() => {
    setCurrentPage(1);
  }, [query, filter]);

  const totalPages = Math.max(1, Math.ceil(visible.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedVisible = visible.slice(startIndex, endIndex);

  const counts = useMemo(
    () => ({
      assigned: incidents.filter((i) => i.status === 'Assigned').length,
      progress: incidents.filter((i) => i.status === 'Progress').length,
      resolved: incidents.filter((i) => i.status === 'Resolved').length,
    }),
    [incidents]
  );

  const acknowledge = async (i: Incident) => {
    setBusyId(i.id);
    const { error } = await supabase.from('incident_reports').update({ status: 'Progress' }).eq('id', i.id);
    setBusyId(null);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      await logAudit('Acknowledge dispatch', `${i.report_no ?? i.title} acknowledged by ${officerName}.`);
      setIncidents(await fetchAll(unitId));
    }
  };

  const resolve = async (i: Incident) => {
    setBusyId(i.id);
    const { error } = await supabase.from('incident_reports').update({ status: 'Resolved', resolved_at: new Date().toISOString() }).eq('id', i.id);
    setBusyId(null);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      await logAudit('Resolved case', `${i.report_no ?? i.title} closed on site.`);
      setToast({ type: 'success', message: 'Incident marked as resolved.' });
      setIncidents(await fetchAll(unitId));
    }
  };

  return (
    <div className="w-full space-y-4 sm:space-y-6">

      <div className="grid grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-3 sm:p-4">
          <div className="text-[11px] text-on-surface-variant uppercase tracking-wider">Assigned</div>
          <div className="text-xl sm:text-2xl font-bold text-blue-700">{counts.assigned}</div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-3 sm:p-4">
          <div className="text-[11px] text-on-surface-variant uppercase tracking-wider">In Progress</div>
          <div className="text-xl sm:text-2xl font-bold text-warning-amber">{counts.progress}</div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-3 sm:p-4">
          <div className="text-[11px] text-on-surface-variant uppercase tracking-wider">Resolved</div>
          <div className="text-xl sm:text-2xl font-bold text-success-green">{counts.resolved}</div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-2xl border border-border-subtle overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex flex-col sm:flex-row justify-between items-center gap-4 bg-surface-bg/50">
          <div className="flex space-x-1 bg-surface-container rounded-lg p-1 w-full sm:w-auto">
            {tabs.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setFilter(t)}
                className={`flex-1 whitespace-nowrap px-1.5 sm:px-3 py-1.5 rounded text-[11px] sm:text-xs font-semibold transition-colors leading-none ${
                  filter === t ? 'bg-surface-container-lowest shadow-sm text-secondary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {t}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-3 w-full sm:w-auto">
            <div className="relative flex-1 sm:w-64">
              <Ph className="absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]" name="search" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full bg-surface-container-lowest border border-border-subtle rounded-md py-1.5 pl-9 pr-3 text-body-sm focus:border-secondary focus:ring-1 focus:ring-secondary transition-all"
                placeholder="Search incident, report no, address..."
                type="text"
              />
            </div>
          </div>
        </div>

        {loading ? (
          <div className="p-6 sm:p-10 text-center text-sm text-on-surface-variant">Loading incidents…</div>
        ) : !unitId ? (
          <div className="p-6 sm:p-10 text-center text-sm text-on-surface-variant">No dispatch unit linked to your account. Ask an admin to assign one.</div>
        ) : visible.length === 0 ? (
          <div className="p-6 sm:p-10 text-center text-sm text-on-surface-variant">No incidents match your filters.</div>
        ) : (
          <>
            <div className="lg:hidden divide-y divide-border-subtle">
              {paginatedVisible.map((i) => (
                <div key={i.id} className="p-4 space-y-3">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="font-label-md text-label-md text-on-surface font-medium">{i.title}</div>
                      <div className="text-xs text-on-surface-variant mt-0.5">{i.category} · {i.address || 'No address'}</div>
                      <div className="text-[10px] text-on-surface-variant/70 mt-0.5">AI threat {i.threat}% · confidence {i.confidence}%</div>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-[11px] font-bold ${PRIORITY_BADGE[i.priority] ?? 'bg-slate-100 text-slate-600'}`}>{i.priority}</span>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_BADGE[i.status] ?? 'bg-slate-100 text-slate-600'}`}>{i.status}</span>
                    <span className="text-xs text-on-surface-variant">{fmtDate(i.created_at, 'short')}</span>
                  </div>
                  <div className="flex flex-wrap gap-2 pt-1">
                    {i.status === 'Assigned' && (
                      <button type="button" disabled={busyId === i.id} onClick={() => acknowledge(i)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-on-secondary rounded-md text-xs font-semibold hover:bg-secondary/90 disabled:opacity-50 transition-colors whitespace-nowrap">
                        <Ph className="text-[16px]" name="check_circle" />
                        Acknowledge
                      </button>
                    )}
                    {(i.status === 'Progress' || i.status === 'Assigned') && (
                      <button type="button" disabled={busyId === i.id} onClick={() => resolve(i)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success-green text-white rounded-md text-xs font-semibold hover:bg-success-green/90 disabled:opacity-50 transition-colors whitespace-nowrap">
                        <Ph className="text-[16px]" name="task_alt" />
                        Resolve
                      </button>
                    )}
                    <button type="button" onClick={() => setSelectedIncidentId(i.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle rounded-md text-xs font-semibold text-on-surface-variant hover:border-secondary hover:text-secondary transition-colors whitespace-nowrap">
                      <Ph className="text-[16px]" name="visibility" />
                      View Details
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="hidden lg:block overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-container-low">
                    <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Incident</th>
                    <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Priority</th>
                    <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Reported</th>
                    <th className="sticky right-0 z-10 py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider text-right bg-surface-container-low">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {paginatedVisible.map((i) => (
                    <tr key={i.id} className="hover:bg-surface-container-low transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-label-md text-label-md text-on-surface font-medium">{i.title}</div>
                        <div className="text-xs text-on-surface-variant mt-0.5">{i.category} · {i.address || 'No address'}</div>
                        <div className="text-[10px] text-on-surface-variant/70 mt-0.5">AI threat {i.threat}% · confidence {i.confidence}%</div>
                      </td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${PRIORITY_BADGE[i.priority] ?? 'bg-slate-100 text-slate-600'}`}>{i.priority}</span></td>
                      <td className="py-3 px-4"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_BADGE[i.status] ?? 'bg-slate-100 text-slate-600'}`}>{i.status}</span></td>
                      <td className="py-3 px-4 text-xs text-on-surface-variant whitespace-nowrap">{fmtDate(i.created_at, 'short')}</td>
                      <td className="sticky right-0 z-10 py-3 px-4 bg-surface-container-lowest shadow-[-8px_0_12px_-8px_rgba(0,0,0,0.35)]">
                        <div className="flex flex-wrap items-center justify-end gap-2">
                          {i.status === 'Assigned' && (
                            <button type="button" disabled={busyId === i.id} onClick={() => acknowledge(i)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-secondary text-on-secondary rounded-md text-xs font-semibold hover:bg-secondary/90 disabled:opacity-50 transition-colors whitespace-nowrap">
                              <Ph className="text-[16px]" name="check_circle" />
                              Acknowledge
                            </button>
                          )}
                          {(i.status === 'Progress' || i.status === 'Assigned') && (
                            <button type="button" disabled={busyId === i.id} onClick={() => resolve(i)} className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-success-green text-white rounded-md text-xs font-semibold hover:bg-success-green/90 disabled:opacity-50 transition-colors whitespace-nowrap">
                              <Ph className="text-[16px]" name="task_alt" />
                              Resolve
                            </button>
                          )}
                          <button type="button" onClick={() => setSelectedIncidentId(i.id)} className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-border-subtle rounded-md text-xs font-semibold text-on-surface-variant hover:border-secondary hover:text-secondary transition-colors whitespace-nowrap">
                            <Ph className="text-[16px]" name="visibility" />
                            View Details
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      <Pagination
        currentPage={currentPage}
        totalPages={totalPages}
        itemsPerPage={itemsPerPage}
        onPageChange={setCurrentPage}
        onItemsPerPageChange={(items) => {
          setItemsPerPage(items);
          setCurrentPage(1);
        }}
        totalItems={visible.length}
        startIndex={startIndex}
        endIndex={endIndex}
      />

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <IncidentDetailModal reportId={selectedIncidentId} onClose={() => setSelectedIncidentId(null)} isAdmin />
    </div>
  );
}