import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import IncidentDetailModal from '../../../components/IncidentDetailModal';
import { fmtDate, PRIORITY_BADGE, STATUS_BADGE } from '../../../lib/admin';
import Pagination from '../../../components/Pagination';

type Row = {
  id: string;
  report_no: string | null;
  title: string;
  category: string;
  priority: string;
  status: string;
  address: string | null;
  created_at: string;
  resolved_at: string | null;
  dispatch_unit_name: string | null;
  user_id: string | null;
  anonymous: boolean;
};

type ReporterProfile = {
  id: string;
  fullname: string;
};

const ARCHIVED_STATUSES = ['Resolved', 'Rejected'];

export default function AdminIncidentArchive() {
  const [rows, setRows] = useState<Row[]>([]);
  const [reporterMap, setReporterMap] = useState<Record<string, ReporterProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  useEffect(() => {
    void (async () => {
      const res = await supabase
        .from('incident_reports')
        .select('id, report_no, title, category, priority, status, address, created_at, resolved_at, anonymous, dispatch_unit:dispatch_unit_id(name), user_id')
        .in('status', ARCHIVED_STATUSES)
        .order('resolved_at', { ascending: false, nullsFirst: false })
        .limit(2000);
      if (res.error) setError(res.error.message);
      const mapped = (res.data ?? []).map((r) => {
        const embed = (r as unknown as { dispatch_unit: { name: string } | { name: string }[] | null }).dispatch_unit;
        return {
          ...r,
          dispatch_unit_name: (Array.isArray(embed) ? embed[0]?.name : embed?.name) ?? null,
        };
      }) as Row[];

      const userIds = [...new Set(mapped.map((r) => r.user_id).filter(Boolean))] as string[];
      const rMap: Record<string, ReporterProfile> = {};
      if (userIds.length > 0) {
        const { data: reporterRows } = await supabase
          .from('public_users')
          .select('id, fullname')
          .in('id', userIds);
        for (const row of (reporterRows ?? []) as ReporterProfile[]) {
          rMap[row.id] = row;
        }
      }

      setRows(mapped);
      setReporterMap(rMap);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return rows.filter((r) => {
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.report_no ?? '').toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.address ?? '').toLowerCase().includes(q)
      );
    });
  }, [rows, search, statusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedRows = filtered.slice(startIndex, endIndex);

  const stats = useMemo(
    () => ({
      resolved: rows.filter((r) => r.status === 'Resolved').length,
      rejected: rows.filter((r) => r.status === 'Rejected').length,
    }),
    [rows],
  );

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white rounded-xl border border-border-subtle p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-2">TOTAL ARCHIVED</div>
          <div className="font-display-lg text-display-lg text-on-surface">{rows.length}</div>
          <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">Closed incidents on record</div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-2">RESOLVED</div>
          <div className="font-display-lg text-display-lg text-success-green">{stats.resolved}</div>
          <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">Successfully closed cases</div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-2">REJECTED</div>
          <div className="font-display-lg text-display-lg text-error-red">{stats.rejected}</div>
          <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">Dismissed or invalid reports</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center flex-wrap gap-3">
          <div>
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Incident Archive</h3>
            <p className="text-xs text-on-surface-variant mt-0.5">Resolved and rejected reports · click a case to view full details</p>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <div className="relative w-64">
              <span className="material-symbols-outlined absolute left-3 top-2 text-on-surface-variant text-[20px]">search</span>
              <input
                className="w-full bg-surface-container-low border border-border-subtle text-on-surface rounded-md pl-10 pr-3 py-2 font-body-sm text-body-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
                placeholder="Search archive..."
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <select
              className="bg-white border border-border-subtle rounded-lg px-3 py-2 font-label-md text-label-md text-on-surface focus:ring-2 focus:ring-secondary focus:border-secondary outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All</option>
              {ARCHIVED_STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <span className="text-xs text-on-surface-variant">Showing {filtered.length} of {rows.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-on-surface-variant">Loading archive…</div>
          ) : error ? (
            <div className="p-12 text-center text-sm text-error-red">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-on-surface-variant">No archived incidents found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-border-subtle">
                <tr>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Case ID</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Incident</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Reporter</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Location</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Responder</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Priority</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Status</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Reported</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Closed</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {paginatedRows.map((r) => (
                  <tr key={r.id} onClick={() => setSelectedId(r.id)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="py-3 px-4 font-medium text-secondary">{r.report_no ?? '—'}</td>
                    <td className="py-3 px-4">
                      <p className="text-on-surface font-medium">{r.title}</p>
                      <p className="text-xs text-on-surface-variant">{r.category}</p>
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant text-sm">{r.anonymous ? 'Anonymous' : r.user_id && reporterMap[r.user_id] ? reporterMap[r.user_id].fullname : '—'}</td>
                    <td className="py-3 px-4 text-on-surface-variant max-w-[180px] truncate">{r.address ?? '—'}</td>
                    <td className="py-3 px-4 text-on-surface">{r.dispatch_unit_name ?? '—'}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${PRIORITY_BADGE[r.priority]}`}>{r.priority}</span></td>
                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{r.status}</span></td>
                    <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">{fmtDate(r.created_at, 'short')}</td>
                    <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">{fmtDate(r.resolved_at ?? r.created_at, 'short')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
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
          totalItems={filtered.length}
          startIndex={startIndex}
          endIndex={endIndex}
        />
      </div>
      <IncidentDetailModal reportId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
