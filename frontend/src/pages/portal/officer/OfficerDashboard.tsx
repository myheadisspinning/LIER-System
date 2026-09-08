import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { getAdminProfile, deriveUnitStatus, fetchOpenUnitAssignments, fmtDate, fmtDurationMs, logAudit, PRIORITY_BADGE } from '../../../lib/admin';
import Toast from '../../../components/Toast';
import Pagination from '../../../components/Pagination';

type Incident = {
  id: string;
  report_no: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  assigned_at: string | null;
  resolved_at: string | null;
};

type Unit = {
  id: string;
  name: string;
  type: string;
  status: string;
  duty_days?: number[] | null;
  last_location: string | null;
};

const STATUS_BADGE: Record<string, string> = {
  Pending: 'bg-warning-amber/10 text-warning-amber',
  Verifying: 'bg-secondary/10 text-secondary',
  Assigned: 'bg-secondary/10 text-secondary',
  Progress: 'bg-warning-amber/10 text-warning-amber',
  Resolved: 'bg-success-green/10 text-success-green',
  Rejected: 'bg-error/10 text-error',
};

const ACTIVE = ['Assigned', 'Progress'];

export default function OfficerDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [unit, setUnit] = useState<Unit | null>(null);
  const [openAssignments, setOpenAssignments] = useState<Record<string, string[]>>({});
  const [officerName, setOfficerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [busyId, setBusyId] = useState<string | null>(null);
const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  const fetchUnit = async () => {
    const profile = await getAdminProfile();
    setOfficerName(profile.fullname);
    const res = await supabase.from('dispatch_units').select('id, name, type, status, manual_status, duty_days, last_location').eq('lead_officer_id', profile.id).maybeSingle();
    const u = (res.data as Unit | null) ?? null;
    setUnit(u);
    return u;
  };

  const fetchIncidents = async (unitId: string | null) => {
    if (!unitId) return [] as Incident[];
    const res = await supabase
      .from('incident_reports')
      .select('id, report_no, title, description, category, priority, status, address, lat, lng, created_at, assigned_at, resolved_at')
      .eq('dispatch_unit_id', unitId)
      .order('created_at', { ascending: false });
    return (res.data ?? []) as Incident[];
  };

useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const refresh = async () => {
      const u = await fetchUnit();
      if (cancelled) return;
      const [incidents, openMap] = await Promise.all([fetchIncidents(u?.id ?? null), fetchOpenUnitAssignments()]);
      if (cancelled) return;
      setIncidents(incidents);
      setOpenAssignments(openMap);
      return u;
    };

    void (async () => {
      const u = await refresh();
      if (cancelled) return;
      setLoading(false);
      if (u) {
        channel = supabase
          .channel(`officer-dashboard-${u.id}`)
          .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_reports', filter: `dispatch_unit_id=eq.${u.id}` }, () => void refresh())
          .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_units', filter: `id=eq.${u.id}` }, () => void refresh())
          .subscribe();
      }
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

const mine = useMemo(() => incidents.filter((i) => i.status !== 'Rejected'), [incidents]);
  const totalPages = Math.max(1, Math.ceil(mine.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedMine = mine.slice(startIndex, endIndex);
  const activeCases = useMemo(() => incidents.filter((i) => ACTIVE.includes(i.status)), [incidents]);
  const resolved = useMemo(() => incidents.filter((i) => i.status === 'Resolved'), [incidents]);
  const pending = useMemo(() => incidents.filter((i) => i.status === 'Assigned'), [incidents]);

  const avgResponse = useMemo(() => {
    const durs = resolved.map((r) => (r.assigned_at && r.resolved_at ? new Date(r.resolved_at).getTime() - new Date(r.assigned_at).getTime() : null)).filter((v): v is number => v !== null);
    if (durs.length === 0) return null;
    return durs.reduce((a, b) => a + b, 0) / durs.length;
  }, [resolved]);

  const acknowledge = async (i: Incident) => {
    setBusyId(i.id);
    const { error } = await supabase.from('incident_reports').update({ status: 'Progress' }).eq('id', i.id);
    setBusyId(null);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      await logAudit('Acknowledge dispatch', `${i.report_no ?? i.title} acknowledged by ${officerName}.`);
      setToast({ type: 'success', message: 'Dispatch acknowledged. Responders on the way.' });
      setIncidents(await fetchIncidents(unit?.id ?? null));
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
      setIncidents(await fetchIncidents(unit?.id ?? null));
    }
  };

return (
    <div className="w-full space-y-4 sm:space-y-6">
      <div className="flex justify-between items-end flex-wrap gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">Good day, {officerName.split(' ')[0] || 'Officer'}.</h2>
          <p className="text-sm text-on-surface-variant mt-1">
            {unit ? `Your unit · ${unit.name} (${unit.type}) — ${deriveUnitStatus(unit, openAssignments)}.` : 'You are not linked to a dispatch unit yet. Contact your admin to assign you.'}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-success-green/10 text-success-green border border-success-green/20 text-xs font-bold">
            <span className="w-2 h-2 rounded-full bg-success-green animate-pulse"></span> ON DUTY
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-4 sm:p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Active Assignments</div>
          <div className="font-display-lg text-display-lg font-bold text-on-surface">{activeCases.length}</div>
        </div>
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-4 sm:p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Awaiting Acknowledgment</div>
          <div className="font-display-lg text-display-lg font-bold text-warning-amber">{pending.length}</div>
        </div>
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-4 sm:p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Resolved By Unit</div>
          <div className="font-display-lg text-display-lg font-bold text-success-green">{resolved.length}</div>
        </div>
        <div className="bg-surface-container-lowest border border-border-subtle rounded-xl p-4 sm:p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Avg Response-to-Resolve</div>
          <div className="font-display-lg text-display-lg font-bold text-secondary">{avgResponse != null ? fmtDurationMs(avgResponse) : '—'}</div>
        </div>
      </div>

      <div className="bg-surface-container-lowest rounded-xl border border-border-subtle overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Assigned Incidents</h3>
          <span className="text-xs text-on-surface-variant">All assignments for {unit?.name ?? 'your unit'}</span>
        </div>
        {loading ? (
          <div className="p-12 text-center text-sm text-on-surface-variant">Loading incidents…</div>
        ) : !unit ? (
          <div className="p-12 text-center text-sm text-on-surface-variant">No dispatch unit linked to your account. Ask an admin to assign one.</div>
        ) : mine.length === 0 ? (
          <div className="p-12 text-center text-sm text-on-surface-variant">No incidents assigned to your unit yet.</div>
) : (
          <>
          <div className="divide-y divide-border-subtle">
            {paginatedMine.map((i) => (
              <div key={i.id} className="px-5 py-4 flex flex-wrap items-start gap-4">
                <div className="flex-1 min-w-[240px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-headline-md text-headline-md font-bold text-on-surface">{i.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${PRIORITY_BADGE[i.priority] ?? 'bg-slate-100 text-slate-600'}`}>{i.priority}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_BADGE[i.status] ?? 'bg-slate-100 text-slate-600'}`}>{i.status}</span>
                  </div>
                  <p className="text-sm text-on-surface-variant mt-1 line-clamp-2">{i.description || 'No description.'}</p>
                  <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
                    {i.report_no ?? 'Report'} · {i.category} · {i.address || 'Address unavailable'}
                    {i.assigned_at && <> · Assigned {fmtDate(i.assigned_at, 'short')}</>}
                    {i.resolved_at && <> · Resolved {fmtDate(i.resolved_at, 'short')}</>}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {i.status === 'Assigned' && (
                    <button type="button" disabled={busyId === i.id} onClick={() => acknowledge(i)} className="px-4 py-2 bg-secondary text-on-secondary rounded-lg text-xs font-semibold hover:bg-secondary/90 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">check_circle</span> Acknowledge
                    </button>
                  )}
                  {(i.status === 'Progress' || i.status === 'Assigned') && (
                    <button type="button" disabled={busyId === i.id} onClick={() => resolve(i)} className="px-4 py-2 bg-success-green text-white rounded-lg text-xs font-semibold hover:bg-success-green/90 disabled:opacity-50 transition-colors flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-[16px]">task_alt</span> Mark Resolved
                    </button>
                  )}
{i.status === 'Resolved' && (
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-success-green">
                      <span className="material-symbols-outlined text-[16px]">verified</span> Completed
                    </span>
                  )}
                </div>
              </div>
            ))}
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
            totalItems={mine.length}
            startIndex={startIndex}
            endIndex={endIndex}
          />
          </>
        )}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}

