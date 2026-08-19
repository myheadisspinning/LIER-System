import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { downloadCsv, fmtDate, logAudit } from '../../../lib/admin';

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

type Archive = { id: string; title: string; report_type: string; period_label: string | null; created_at: string };

export default function AdminReportsAnalytics() {
  const [rows, setRows] = useState<Row[]>([]);
  const [archives, setArchives] = useState<Archive[]>([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Archive | null>(null);

  useEffect(() => {
    void (async () => {
      const [repRes, arcRes] = await Promise.all([
        supabase
          .from('incident_reports')
          .select('id, report_no, category, priority, status, address, created_at, assigned_at, resolved_at')
          .order('created_at', { ascending: false })
          .limit(500),
        supabase.from('report_archives').select('id, title, report_type, period_label, created_at').order('created_at', { ascending: false }).limit(50),
      ]);
      setRows((repRes.data ?? []) as Row[]);
      setArchives((arcRes.data ?? []) as Archive[]);
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

  const saveArchive = async () => {
    const now = new Date();
    const label = `${now.toLocaleString('en-PH', { month: 'long', year: 'numeric' })}`;
    const { error } = await supabase.from('report_archives').insert({
      title: `${label} Monthly Safety Summary`,
      report_type: 'Monthly Summary',
      period_label: label,
      data: {
        month_count: stats.month,
        clearance: stats.clearance,
        avg_resolve_ms: stats.avgResolve,
        by_category: byCategory,
        by_month: byMonth,
      },
    });
    if (error) {
      setToast({ type: 'error', message: error.message });
      return;
    }
    await logAudit('Export report', `Saved ${label} Monthly Safety Summary snapshot.`);
    setToast({ type: 'success', message: `${label} summary archived.` });
    const res = await supabase.from('report_archives').select('id, title, report_type, period_label, created_at').order('created_at', { ascending: false }).limit(50);
    setArchives((res.data ?? []) as Archive[]);
  };

  const deleteArchive = async (id: string) => {
    const { error } = await supabase.from('report_archives').delete().eq('id', id);
    if (error) {
      setToast({ type: 'error', message: error.message });
      return;
    }
    setArchives((prev) => prev.filter((a) => a.id !== id));
  };

  return (
    <div className="space-y-6">
      {loading && <div className="p-12 text-center text-sm text-on-surface-variant">Loading analytics…</div>}
      {!loading && (
        <>
          <div className="flex justify-between items-end">
            <div>
              <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Reports &amp; Analytics</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Live operational statistics computed from submitted incident reports.</p>
            </div>
            <div className="flex gap-3">
              <button type="button" onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 border border-border-subtle rounded-lg text-label-md font-medium text-on-surface hover:bg-surface-variant transition-colors">
                <span className="material-symbols-outlined text-[18px]">download</span>
                Export Raw CSV
              </button>
              <button type="button" onClick={saveArchive} className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-lg text-label-md font-medium hover:bg-secondary/90 transition-colors">
                <span className="material-symbols-outlined text-[18px]">archive</span>
                Save Monthly Summary
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

          <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Archived Reports</h3>
            </div>
            <div className="overflow-x-auto">
              {archives.length === 0 ? (
                <div className="p-10 text-center text-sm text-on-surface-variant">No archived summaries yet. Use "Save Monthly Summary" to generate one.</div>
              ) : (
                <table className="w-full text-left border-collapse">
                  <thead className="bg-slate-50 border-b border-border-subtle">
                    <tr>
                      <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Title</th>
                      <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Type</th>
                      <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Period</th>
                      <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Created</th>
                      <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border-subtle">
                    {archives.map((a) => (
                      <tr key={a.id} className="hover:bg-slate-50">
                        <td className="py-3 px-4 font-medium text-on-surface">{a.title}</td>
                        <td className="py-3 px-4 text-on-surface-variant">{a.report_type}</td>
                        <td className="py-3 px-4 text-on-surface-variant">{a.period_label ?? '—'}</td>
                        <td className="py-3 px-4 text-on-surface-variant">{fmtDate(a.created_at, 'short')}</td>
                        <td className="py-3 px-4 text-right">
                          <button type="button" onClick={() => setConfirmDelete(a)} className="text-error-red hover:opacity-70" aria-label="Delete archive">
                            <span className="material-symbols-outlined text-[18px]">delete</span>
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        </>
      )}
      {confirmDelete && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-md p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-error-red/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px] text-error-red">warning</span>
              </span>
              <div>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Delete Archive</h3>
                <p className="text-body-sm text-on-surface-variant">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-body-sm text-on-surface-variant mb-1">Are you sure you want to delete this archived report?</p>
            <p className="text-body-sm text-on-surface font-semibold mb-6">{confirmDelete.title}</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmDelete(null)} className="px-4 py-2 border border-border-subtle rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors">
                Cancel
              </button>
              <button type="button" onClick={async () => { await deleteArchive(confirmDelete.id); setConfirmDelete(null); }} className="px-4 py-2 bg-error-red text-white rounded-lg text-sm font-medium hover:bg-error-red/90 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-8 right-8 bg-surface-container-high text-on-surface px-4 py-3 rounded-lg shadow-lg text-sm z-[150]">{toast.message}</div>}
    </div>
  );
}
