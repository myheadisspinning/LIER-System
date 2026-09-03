import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { downloadCsv } from '../../../lib/admin';
import Toast from '../../../components/Toast';

type Row = {
  id: string;
  report_no: string | null;
  category: string;
  priority: string;
  status: string;
  address: string | null;
  created_at: string;
  assigned_at: string | null;
  resolved_at: string | null;
};

export default function AdminReportsAnalytics() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    void (async () => {
      const repRes = await supabase
        .from('incident_reports')
        .select('id, report_no, category, priority, status, address, created_at, assigned_at, resolved_at')
        .order('created_at', { ascending: false })
        .limit(500);
      setRows((repRes.data ?? []) as Row[]);
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const month = rows.filter((r) => new Date(r.created_at) >= monthStart);
    const resolved = rows.filter((r) => r.status === 'Resolved');
    const durations = resolved
      .map((r) => (r.resolved_at ? new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime() : null))
      .filter((d): d is number => d != null);
    const avgResolve = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    const clearance = rows.length ? (resolved.length / rows.length) * 100 : 0;
    const prevStart = new Date(monthStart);
    prevStart.setMonth(prevStart.getMonth() - 1);
    const prev = rows.filter((r) => new Date(r.created_at) >= prevStart && new Date(r.created_at) < monthStart);
    const delta = prev.length ? ((month.length - prev.length) / prev.length) * 100 : 0;
    return { month: month.length, prev: prev.length, delta, avgResolve, clearance, resolved: resolved.length };
  }, [rows]);

  const byMonth = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const d = new Date(r.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([key, count]) => ({ key, count, label: key.split('-').slice(1).reverse().join('/') }))
      .sort((a, b) => a.key.localeCompare(b.key))
      .slice(-8);
  }, [rows]);

  const maxMonth = Math.max(1, ...byMonth.map((m) => m.count));

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) map.set(r.category, (map.get(r.category) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [rows]);

  const maxCat = Math.max(1, ...byCategory.map((c) => c.count));

  const byPurok = useMemo(() => {
    const map = new Map<string, number>();
    for (const r of rows) {
      const key = (r.address ?? '').trim() ? r.address!.trim() : 'Unspecified';
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    return Array.from(map.entries())
      .map(([purok, count]) => ({ purok, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 7);
  }, [rows]);

  const maxPurok = Math.max(1, ...byPurok.map((p) => p.count));

  const exportCsv = () => {
    downloadCsv(
      `incident-report-${new Date().toISOString().slice(0, 10)}.csv`,
      rows.map((r) => ({
        report_no: r.report_no ?? '',
        category: r.category,
        priority: r.priority,
        status: r.status,
        address: r.address ?? '',
        created_at: new Date(r.created_at).toISOString(),
        resolved_at: r.resolved_at ? new Date(r.resolved_at).toISOString() : '',
      })),
    );
  };

  return (
    <div className="space-y-6">
      {loading && <div className="p-12 text-center text-sm text-on-surface-variant">Loading analytics…</div>}
      {!loading && (
        <>
          <div className="flex justify-between items-end">
            <div className="flex gap-3">
              <button type="button" onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 border border-border-subtle rounded-lg text-label-md font-medium text-on-surface hover:bg-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export Raw CSV
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <div className="bg-white rounded-xl border border-border-subtle p-6">
              <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-2">INCIDENT VOLUME (THIS MONTH)</div>
              <div className="font-display-lg text-display-lg text-on-surface">{stats.month}</div>
              <div className="mt-2 font-label-sm text-label-sm flex items-center gap-1 text-on-surface-variant">
                <span className={stats.delta >= 0 ? 'text-warning-amber' : 'text-success-green'}>{stats.delta >= 0 ? '▲' : '▼'} {Math.abs(stats.delta).toFixed(1)}%</span>
                vs last month
              </div>
            </div>
            <div className="bg-white rounded-xl border border-border-subtle p-6">
              <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-2">AVG RESOLUTION TIME</div>
              <div className="font-display-lg text-display-lg text-secondary">
                {stats.avgResolve ? `${(stats.avgResolve / 3600000).toFixed(1)} Hrs` : '—'}
              </div>
              <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">Report → Resolved</div>
            </div>
            <div className="bg-white rounded-xl border border-border-subtle p-6">
              <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-2">CLEARANCE RATE</div>
              <div className="font-display-lg text-display-lg text-success-green">{stats.clearance.toFixed(1)}%</div>
              <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">{stats.resolved} resolved of {rows.length}</div>
            </div>
            <div className="bg-white rounded-xl border border-border-subtle p-6">
              <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-2">TOTAL RECORDS</div>
              <div className="font-display-lg text-display-lg text-on-surface">{rows.length}</div>
              <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">Incidents tracked in the system</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-xl border border-border-subtle p-6">
              <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-4">INCIDENT VOLUME BY MONTH</div>
              <div className="flex items-end gap-2 h-44">
                {byMonth.map((m) => (
                  <div key={m.key} className="flex-1 flex flex-col items-center gap-1">
                    <span className="text-[10px] font-bold text-on-surface">{m.count}</span>
                    <div className="w-full bg-secondary/25 rounded-t" style={{ height: `${Math.max(3, (m.count / maxMonth) * 100)}%` }}></div>
                    <span className="text-[10px] text-on-surface-variant">{m.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="bg-white rounded-xl border border-border-subtle p-6">
              <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-4">INCIDENTS BY CATEGORY</div>
              <div className="space-y-3">
                {byCategory.map((c) => (
                  <div key={c.category}>
                    <div className="flex justify-between text-sm mb-1">
                      <span className="font-medium text-on-surface">{c.category}</span>
                      <span className="text-on-surface-variant">{c.count}</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <div className="h-full bg-secondary rounded-full" style={{ width: `${(c.count / maxCat) * 100}%` }}></div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-border-subtle p-6">
            <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-4">INCIDENTS BY LOCATION</div>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              {byPurok.map((p) => (
                <div key={p.purok} className="border border-border-subtle rounded-lg p-4">
                  <p className="text-xs text-on-surface-variant truncate mb-2" title={p.purok}>{p.purok}</p>
                  <p className="font-display-md text-display-md font-bold text-on-surface">{p.count}</p>
                  <div className="mt-2 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${(p.count / maxPurok) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>

        </>
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
