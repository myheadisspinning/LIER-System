import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { downloadCsv, fmtDate, timeAgo } from '../../../lib/admin';

type LogRow = {
  id: string;
  actor: string;
  action: string;
  detail: string | null;
  metadata: Record<string, unknown>;
  created_at: string;
};

export default function AdminAuditLogs() {
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [actionFilter, setActionFilter] = useState('All Action Types');
  const [selected, setSelected] = useState<LogRow | null>(null);

  const fetchLogs = async () => {
    const res = await supabase.from('ai_audit_logs').select('id, actor, action, detail, metadata, created_at').order('created_at', { ascending: false }).limit(300);
    return { logs: (res.data ?? []) as LogRow[], error: res.error?.message ?? null };
  };

  useEffect(() => {
    void (async () => {
      const { logs, error } = await fetchLogs();
      if (error) setError(error);
      setLogs(logs);
      setLoading(false);
    })();
  }, []);

  const actionTypes = useMemo(() => Array.from(new Set(logs.map((l) => l.action))).sort(), [logs]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return logs.filter((l) => {
      if (actionFilter !== 'All Action Types' && l.action !== actionFilter) return false;
      if (!q) return true;
      return (
        l.actor.toLowerCase().includes(q) ||
        l.action.toLowerCase().includes(q) ||
        (l.detail ?? '').toLowerCase().includes(q) ||
        String(l.metadata?.ip ?? '').toLowerCase().includes(q)
      );
    });
  }, [logs, search, actionFilter]);

  const exportCsv = () => {
    downloadCsv(
      `audit-log-${new Date().toISOString().slice(0, 10)}.csv`,
      filtered.map((l) => ({
        timestamp: new Date(l.created_at).toISOString(),
        actor: l.actor,
        action: l.action,
        detail: l.detail ?? '',
        ip: l.metadata?.ip ?? '',
      })),
    );
  };

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-4">
        <div className="flex justify-between items-end">
          <div>
            <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">System Audit &amp; Security Logs</h2>
            <p className="font-body-md text-body-md text-on-surface-variant">Immutable log of every classified report, dispatch action, and account change across the portal.</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-3 bg-surface-container-lowest p-3 border border-border-subtle rounded-lg">
          <div className="relative flex-1 min-w-[200px]">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant text-[18px]">search</span>
            <input className="w-full bg-[#f1f5f9] border-none rounded text-body-sm pl-10 pr-3 py-2 text-on-surface focus:ring-1 focus:ring-secondary outline-none" placeholder="Search actors, actions, details..." type="text" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <div className="flex items-center gap-3">
            <select className="bg-[#f1f5f9] border-none rounded text-body-sm py-2 pl-3 pr-8 text-on-surface focus:ring-1 focus:ring-secondary outline-none cursor-pointer" value={actionFilter} onChange={(e) => setActionFilter(e.target.value)}>
              <option>All Action Types</option>
              {actionTypes.map((a) => (
                <option key={a}>{a}</option>
              ))}
            </select>
          </div>
          <button type="button" onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 border border-border-subtle rounded text-label-md font-medium text-on-surface hover:bg-surface-variant transition-colors ml-auto">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Audit Log (CSV)
          </button>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row gap-4">
        <div className="flex-1 bg-surface-container-lowest border border-border-subtle rounded-xl flex flex-col overflow-hidden shadow-sm">
          <div className="bg-surface-variant/50 px-4 py-2 border-b border-border-subtle flex items-center justify-between">
            <h3 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Audit Trail</h3>
            <span className="font-label-sm text-label-sm text-on-surface-variant">Showing {filtered.length} of {logs.length} records</span>
          </div>
          <div className="flex-1 overflow-x-auto">
            {loading ? (
              <div className="p-12 text-center text-sm text-on-surface-variant">Loading audit trail…</div>
            ) : error ? (
              <div className="p-12 text-center text-sm text-error-red">{error}</div>
            ) : filtered.length === 0 ? (
              <div className="p-12 text-center text-sm text-on-surface-variant">No audit records found for the current filters.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface z-10 border-b border-border-subtle shadow-sm">
                  <tr>
                    <th className="font-caps-xs text-caps-xs text-on-surface-variant py-2 px-4 font-bold w-[170px]">Timestamp</th>
                    <th className="font-caps-xs text-caps-xs text-on-surface-variant py-2 px-4 font-bold">User / System</th>
                    <th className="font-caps-xs text-caps-xs text-on-surface-variant py-2 px-4 font-bold">Action Type</th>
                    <th className="font-caps-xs text-caps-xs text-on-surface-variant py-2 px-4 font-bold hidden lg:table-cell">Detail</th>
                    <th className="font-caps-xs text-caps-xs text-on-surface-variant py-2 px-4 font-bold text-right w-[80px]">View</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle">
                  {filtered.map((l) => (
                    <tr key={l.id} className="hover:bg-surface-variant/50 transition-colors cursor-pointer" onClick={() => setSelected(l)}>
                      <td className="py-2.5 px-4 whitespace-nowrap text-on-surface-variant text-body-sm">
                        <span className="block font-medium text-on-surface">{fmtDate(l.created_at, 'short')}</span>
                        <span className="text-[11px]">{timeAgo(l.created_at)}</span>
                      </td>
                      <td className="py-2.5 px-4 text-body-sm text-on-surface">{l.actor}</td>
                      <td className="py-2.5 px-4"><span className="px-2 py-1 rounded-full bg-surface-container-highest text-on-surface-variant text-xs font-semibold">{l.action}</span></td>
                      <td className="py-2.5 px-4 text-body-sm text-on-surface-variant hidden lg:table-cell max-w-[280px] truncate">{l.detail ?? '—'}</td>
                      <td className="py-2.5 px-4 text-right">
                        <button type="button" onClick={() => setSelected(l)} className="text-on-surface-variant hover:text-secondary" aria-label="View audit record">
                          <span className="material-symbols-outlined text-[18px]">visibility</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* Detail drawer */}
        <aside className={`xl:w-[360px] bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden transition-opacity ${selected ? '' : 'opacity-100'}`}>
          {selected ? (
            <div className="flex flex-col h-full">
              <div className="px-5 py-4 border-b border-border-subtle flex items-center justify-between">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Audit Event</h3>
                <button type="button" onClick={() => setSelected(null)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
                  <span className="material-symbols-outlined">close</span>
                </button>
              </div>
              <div className="p-5 space-y-4">
                <div className="bg-surface-container-low rounded-lg border border-border-subtle p-4 space-y-2">
                  <p className="text-xs text-on-surface-variant">Timestamp</p>
                  <p className="text-body-sm font-medium text-on-surface">{fmtDate(selected.created_at)}</p>
                  <p className="text-xs text-on-surface-variant">User / System</p>
                  <p className="text-body-sm font-medium text-on-surface">{selected.actor}</p>
                  <p className="text-xs text-on-surface-variant">Action Type</p>
                  <p className="text-body-sm font-medium text-on-surface">{selected.action}</p>
                  {selected.detail && (
                    <>
                      <p className="text-xs text-on-surface-variant">Detail</p>
                      <p className="text-body-sm text-on-surface leading-relaxed">{selected.detail}</p>
                    </>
                  )}
                </div>
                {Object.keys(selected.metadata ?? {}).length > 0 && (
                  <div>
                    <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-2">Metadata</h4>
                    <pre className="bg-[#0f172a] text-slate-200 text-[11px] rounded-lg p-4 overflow-x-auto whitespace-pre-wrap">{JSON.stringify(selected.metadata, null, 2)}</pre>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center text-sm text-on-surface-variant">Select an audit record to view its full details.</div>
          )}
        </aside>
      </div>
    </div>
  );
}
