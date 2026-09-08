import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { fmtDurationMs, PRIORITY_BADGE, STATUS_BADGE, deriveUnitStatus, fetchOpenUnitAssignments } from '../../../lib/admin';

type Incident = {
  id: string;
  report_no: string | null;
  title: string;
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

type Unit = { id: string; name: string; type: string; status: string; lat: number | null; lng: number | null; last_location: string | null; duty_days?: number[] | null };

const ACTIVE_STATUSES = ['Pending', 'Verifying', 'Assigned', 'Progress'];

export default function AdminDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [openAssignments, setOpenAssignments] = useState<Record<string, string[]>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const refresh = async () => {
      const [repRes, unitRes, openMap] = await Promise.all([
        supabase
          .from('incident_reports')
          .select('id, report_no, title, category, priority, status, address, lat, lng, created_at, assigned_at, resolved_at')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('dispatch_units').select('id, name, type, status, manual_status, lat, lng, last_location, duty_days').order('name'),
        fetchOpenUnitAssignments(),
      ]);
      if (cancelled) return;
      setIncidents((repRes.data ?? []) as Incident[]);
      setUnits((unitRes.data ?? []) as Unit[]);
      setOpenAssignments(openMap);
      return;
    };

    void (async () => {
      await refresh();
      if (cancelled) return;
      setLoading(false);
      channel = supabase
        .channel('admin-dashboard')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_reports' }, () => void refresh())
        .on('postgres_changes', { event: '*', schema: 'public', table: 'dispatch_units' }, () => void refresh())
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const stats = useMemo(() => {
    const active = incidents.filter((i) => ACTIVE_STATUSES.includes(i.status));
    const resolved = incidents.filter((i) => i.status === 'Resolved');
    const critical = incidents.filter((i) => i.priority === 'CRITICAL' && ACTIVE_STATUSES.includes(i.status));
    const unitField = units.filter((u) => deriveUnitStatus(u, openAssignments) !== 'Off-Duty');
    const unitBusy = units.filter((u) => ['En Route', 'On Scene', 'Busy'].includes(deriveUnitStatus(u, openAssignments)));

    const durations: number[] = [];
    for (const i of incidents) {
      if (i.resolved_at && i.created_at) durations.push(new Date(i.resolved_at).getTime() - new Date(i.created_at).getTime());
    }
    const avgResolve = durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null;
    const clearance = incidents.length ? (resolved.length / incidents.length) * 100 : 0;
    return {
      active: active.length,
      critical: critical.length,
      unitField: unitField.length,
      unitBusy: unitBusy.length,
      avgResolve,
      clearance,
      resolved: resolved.length,
    };
  }, [incidents, units, openAssignments]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of incidents) map.set(i.category, (map.get(i.category) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [incidents]);

  const maxCat = Math.max(1, ...byCategory.map((c) => c.count));

  return (
    <div className="flex flex-col gap-4">
      {loading && <div className="p-12 text-center text-sm text-on-surface-variant">Loading command dashboard…</div>}
      {!loading && (
        <>
          {/* KPI ROW */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6 xl:col-span-3 bg-surface-container-lowest border border-border-subtle border-t-2 border-t-error rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="material-symbols-outlined text-error text-[22px]">emergency_home</span>
                <span className="px-2 py-1 rounded-full bg-error/10 text-error text-[11px] font-bold">{stats.critical} critical</span>
              </div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Active Incidents</p>
              <p className="font-headline-md text-headline-md font-bold text-on-surface">{stats.active}</p>
              <p className="text-xs text-on-surface-variant mt-1.5">across all statuses</p>
            </div>
            <div className="col-span-12 md:col-span-6 xl:col-span-3 bg-surface-container-lowest border border-border-subtle border-t-2 border-t-secondary rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="material-symbols-outlined text-secondary text-[22px]">local_police</span>
                <span className="px-2 py-1 rounded-full bg-secondary/10 text-sky-700 text-[11px] font-bold">{stats.unitBusy} busy</span>
              </div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Units On Field</p>
              <p className="font-headline-md text-headline-md font-bold text-on-surface">{stats.unitField}</p>
              <p className="text-xs text-on-surface-variant mt-1.5">responder units on duty</p>
            </div>
            <div className="col-span-12 md:col-span-6 xl:col-span-3 bg-surface-container-lowest border border-border-subtle border-t-2 border-t-tertiary rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="material-symbols-outlined text-tertiary text-[22px]">timer</span>
                <span className="px-2 py-1 rounded-full bg-tertiary/10 text-teal-700 text-[11px] font-bold">{stats.resolved} done</span>
              </div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Avg Resolution Time</p>
              <p className="font-headline-md text-headline-md font-bold text-on-surface">{fmtDurationMs(stats.avgResolve)}</p>
              <p className="text-xs text-on-surface-variant mt-1.5">from report to resolved</p>
            </div>
            <div className="col-span-12 md:col-span-6 xl:col-span-3 bg-surface-container-lowest border border-border-subtle border-t-2 border-t-secondary rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="material-symbols-outlined text-secondary text-[22px]">verified</span>
                <span className="px-2 py-1 rounded-full bg-secondary/10 text-secondary text-[11px] font-bold">{stats.resolved}</span>
              </div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Clearance Rate</p>
              <p className="font-headline-md text-headline-md font-bold text-on-surface">{stats.clearance.toFixed(1)}%</p>
              <div className="mt-2 h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min(100, stats.clearance)}%` }}></div>
              </div>
            </div>
          </div>

          {/* CONTENT */}
          <div className="grid grid-cols-12 gap-4">
            {/* Latest Reports */}
            <div className="col-span-12 xl:col-span-8 bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border-subtle flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">assignment</span>
                  Latest Reports
                </h3>
                <span className="text-xs text-on-surface-variant">most recent first</span>
              </div>
              {incidents.length === 0 ? (
                <div className="p-8 text-center text-sm text-on-surface-variant">No reports yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left">
                    <thead>
                      <tr className="border-b border-border-subtle bg-surface-container-low text-on-surface-variant">
                        <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest">Report</th>
                        <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest">Category</th>
                        <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest">Status</th>
                        <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest">Priority</th>
                        <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest">Date</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border-subtle">
                      {incidents.slice(0, 6).map((i) => (
                        <tr key={i.id} className="hover:bg-surface-container-low transition-colors">
                          <td className="px-5 py-3">
                            <p className="text-sm font-semibold text-on-surface">{i.report_no ?? i.id.slice(0, 8).toUpperCase()}</p>
                            <p className="text-xs text-on-surface-variant max-w-[200px] truncate">{i.title}</p>
                          </td>
                          <td className="px-5 py-3 text-sm text-on-surface-variant">{i.category}</td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border border-transparent ${STATUS_BADGE[i.status] ?? 'bg-surface-container-low text-on-surface-variant'}`}>
                              {i.status}
                            </span>
                          </td>
                          <td className="px-5 py-3">
                            <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border ${PRIORITY_BADGE[i.priority]}`}>{i.priority}</span>
                          </td>
                          <td className="px-5 py-3 text-sm text-on-surface-variant whitespace-nowrap">
                            {new Date(i.created_at).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' })}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Category breakdown */}
            <div className="col-span-12 xl:col-span-4 bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm p-5">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary">category</span>
                By Category
              </h3>
              {byCategory.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No incident data yet.</p>
              ) : (
                <div className="space-y-3">
                  {byCategory.map((c) => (
                    <div key={c.category}>
                      <div className="flex justify-between text-body-sm mb-1">
                        <span className="font-medium text-on-surface">{c.category}</span>
                        <span className="text-on-surface-variant">{c.count}</span>
                      </div>
                      <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-secondary rounded-full" style={{ width: `${(c.count / maxCat) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 border-t border-border-subtle pt-4">
                <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-3">Priority Split</h4>
                <div className="flex flex-wrap gap-2">
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => {
                    const n = incidents.filter((i) => i.priority === p).length;
                    return (
                      <span key={p} className={`px-2 py-1 rounded-full text-xs font-semibold ${PRIORITY_BADGE[p]}`}>
                        {p}: {n}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

