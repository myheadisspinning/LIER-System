import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { fmtDate, getAdminProfile, logAudit, PRIORITY_BADGE } from '../../../lib/admin';
import Toast from '../../../components/Toast';

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

export default function OfficerMyIncidents() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [unitId, setUnitId] = useState<string | null>(null);
  const [unitName, setUnitName] = useState('');
  const [officerName, setOfficerName] = useState('');
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState('All');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

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
    void (async () => {
      const profile = await getAdminProfile();
      setOfficerName(profile.fullname);
      const res = await supabase.from('dispatch_units').select('id, name').eq('lead_officer_id', profile.id).maybeSingle();
      const uid = (res.data?.id as string | undefined) ?? null;
      setUnitId(uid);
      setUnitName((res.data?.name as string | undefined) ?? '');
      setIncidents(await fetchAll(uid));
      setLoading(false);
    })();
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
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Assigned Incidents</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Dispatch tasks routed to {unitName || 'your unit'} by the command center.</p>
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border-subtle p-4">
          <div className="text-[11px] text-on-surface-variant uppercase tracking-wider">Assigned</div>
          <div className="text-2xl font-bold text-blue-700">{counts.assigned}</div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-4">
          <div className="text-[11px] text-on-surface-variant uppercase tracking-wider">In Progress</div>
          <div className="text-2xl font-bold text-warning-amber">{counts.progress}</div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-4">
          <div className="text-[11px] text-on-surface-variant uppercase tracking-wider">Resolved</div>
          <div className="text-2xl font-bold text-success-green">{counts.resolved}</div>
        </div>
      </div>

      <div className="bg-surface-container-lowest border border-border-subtle rounded p-3 flex flex-col md:flex-row gap-3 items-center">
        <div className="relative w-full md:max-w-sm">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[20px]">search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full bg-white border border-border-subtle rounded pl-10 pr-3 py-2 text-sm focus:ring-2 focus:ring-secondary/50 focus:outline-none"
            placeholder="Search incident, report no, address..."
            type="text"
          />
        </div>
        <div className="flex bg-surface-container-low rounded-lg p-1 flex-wrap">
          {['All', 'Assigned', 'Progress', 'Resolved'].map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-3 py-1 rounded font-label-sm text-label-sm transition-colors ${filter === f ? 'bg-white shadow-sm text-on-surface' : 'text-on-surface-variant hover:bg-white/50'}`}
            >
              {f}
            </button>
          ))}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Incident Log</h3>
        </div>
        {loading ? (
          <div className="p-12 text-center text-sm text-on-surface-variant">Loading incidents…</div>
        ) : !unitId ? (
          <div className="p-12 text-center text-sm text-on-surface-variant">No dispatch unit linked to your account. Ask an admin to assign one.</div>
        ) : visible.length === 0 ? (
          <div className="p-12 text-center text-sm text-on-surface-variant">No incidents match your filters.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left">
              <thead className="bg-surface-bg border-b border-border-subtle">
                <tr>
                  <th className="px-5 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-semibold">Incident</th>
                  <th className="px-5 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-semibold">Priority</th>
                  <th className="px-5 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-semibold">Status</th>
                  <th className="px-5 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-semibold">Reported</th>
                  <th className="px-5 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-semibold text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {visible.map((i) => (
                  <tr key={i.id} className="hover:bg-surface-bg/50 transition-colors">
                    <td className="px-5 py-4">
                      <div className="font-label-md text-label-md text-on-surface font-medium">{i.title}</div>
                      <div className="text-xs text-on-surface-variant mt-0.5">{i.category} · {i.address || 'No address'}</div>
                      <div className="text-[10px] text-on-surface-variant/70 mt-0.5">AI threat {i.threat}% · confidence {i.confidence}%</div>
                    </td>
                    <td className="px-5 py-4"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${PRIORITY_BADGE[i.priority] ?? 'bg-slate-100 text-slate-600'}`}>{i.priority}</span></td>
                    <td className="px-5 py-4"><span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_BADGE[i.status] ?? 'bg-slate-100 text-slate-600'}`}>{i.status}</span></td>
                    <td className="px-5 py-4 text-xs text-on-surface-variant">{fmtDate(i.created_at, 'short')}</td>
                    <td className="px-5 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {i.status === 'Assigned' && (
                          <button type="button" disabled={busyId === i.id} onClick={() => acknowledge(i)} className="px-3 py-1.5 bg-secondary text-on-secondary rounded-md text-xs font-semibold hover:bg-secondary/90 disabled:opacity-50 transition-colors">
                            Acknowledge
                          </button>
                        )}
                        {(i.status === 'Progress' || i.status === 'Assigned') && (
                          <button type="button" disabled={busyId === i.id} onClick={() => resolve(i)} className="px-3 py-1.5 bg-success-green text-white rounded-md text-xs font-semibold hover:bg-success-green/90 disabled:opacity-50 transition-colors">
                            Resolve
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
