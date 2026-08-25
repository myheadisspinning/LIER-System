import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import IncidentDetailModal from '../../../components/IncidentDetailModal';
import Toast from '../../../components/Toast';
import Pagination from '../../../components/Pagination';

type EvidenceItem = { name: string; type: string; size: number; url: string };

type RegistryRow = {
  id: string;
  report_no: string | null;
  title: string;
  category: string;
  priority: string;
  status: string;
  incident_time: string | null;
  created_at: string;
  lat: number | null;
  lng: number | null;
  address: string | null;
  anonymous: boolean;
  user_id: string | null;
  evidence: EvidenceItem[] | null;
  confidence: number | null;
};

type Profile = {
  id: string;
  fullname: string;
  phone: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
};

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-cc-red/15 text-cc-red border-cc-red/25',
  HIGH: 'bg-cc-accent/15 text-cc-accent border-cc-accent/25',
  MEDIUM: 'bg-cc-teal/15 text-cc-teal border-cc-teal/25',
  LOW: 'bg-cc-teal/15 text-cc-teal border-cc-teal/25',
};

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-cc-muted/10 text-cc-muted',
  Verifying: 'bg-cc-accent/15 text-cc-accent',
  Assigned: 'bg-cc-blue/15 text-cc-blue',
  Progress: 'bg-cc-accent/15 text-cc-accent',
  Resolved: 'bg-cc-emerald/15 text-cc-emerald',
  Rejected: 'bg-cc-red/15 text-cc-red',
};

const ACTIVE_STATUSES = ['Pending', 'Verifying', 'Assigned', 'Progress'];
const ARCHIVED_STATUSES = ['Resolved', 'Rejected'];

export default function SuperadminReportRegistry() {
  const [reports, setReports] = useState<RegistryRow[]>([]);
  const [users, setUsers] = useState<Record<string, Profile>>({});
  const [revealed, setRevealed] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [tab, setTab] = useState<'active' | 'archive'>('active');
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(20);

  const fetchAll = async () => {
    const [repRes, userRes] = await Promise.all([
      supabase
        .from('incident_reports')
        .select('id, report_no, title, category, priority, status, incident_time, created_at, lat, lng, address, anonymous, user_id, evidence, confidence')
        .order('created_at', { ascending: false })
        .limit(100),
      supabase.from('public_users').select('id, fullname, phone, address, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone').limit(1000),
    ]);
    const userMap: Record<string, Profile> = {};
    (userRes.data ?? []).forEach((u) => {
      userMap[u.id] = u;
    });
    return {
      reports: (repRes.data ?? []) as RegistryRow[],
      users: userMap,
      repError: repRes.error?.message ?? null,
      userError: userRes.error?.message ?? null,
    };
  };

  useEffect(() => {
    void (async () => {
      const { reports, users, repError, userError } = await fetchAll();
      if (repError) setError(repError);
      if (userError && !repError) setError(userError);
      setReports(reports);
      setUsers(users);
      setLoading(false);
    })();
  }, []);

  const toggleReveal = (id: string) => {
    setRevealed((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const tabFiltered = reports.filter((r) => (tab === 'archive' ? ARCHIVED_STATUSES : ACTIVE_STATUSES).includes(r.status));

  const filtered = tabFiltered.filter((r) => {
    if (!search.trim()) return true;
    const q = search.trim().toLowerCase();
    return (
      (r.report_no ?? '').toLowerCase().includes(q) ||
      r.title.toLowerCase().includes(q) ||
      r.category.toLowerCase().includes(q)
    );
  });

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, tab]);

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filtered.slice(startIndex, endIndex);

  const activeCount = reports.filter((r) => ACTIVE_STATUSES.includes(r.status)).length;
  const archivedCount = reports.length - activeCount;

  const reporterLabel = (r: RegistryRow) => {
    const profile = r.user_id ? users[r.user_id] : undefined;
    return profile?.fullname ?? 'Unknown Resident';
  };

  const renderReporter = (r: RegistryRow) => {
    const profile = r.user_id ? users[r.user_id] : undefined;
    if (!r.anonymous) {
      return (
        <div className="flex flex-col gap-0.5 items-start">
          <span className="text-sm text-cc-heading">uploaded by <span className="font-semibold">{reporterLabel(r)}</span></span>
          {profile?.phone && <span className="text-[11px] text-cc-muted">+63 {profile.phone}</span>}
          {profile?.emergency_contact_name && (
            <span className="text-[10px] text-cc-red flex items-center gap-1">
              <span className="material-symbols-outlined text-[11px]">emergency</span>
              {profile.emergency_contact_name} ({profile.emergency_contact_relationship}) — +63 {profile.emergency_contact_phone}
            </span>
          )}
        </div>
      );
    }
    const isRevealed = revealed.has(r.id);
    return (
      <div className="flex flex-col gap-1 items-start">
        <div className="flex items-center gap-2">
          <span className="text-sm text-cc-body">uploaded by <span className="font-semibold text-cc-heading">{isRevealed ? reporterLabel(r) : 'Anonymous'}</span></span>
          <span className="text-[9px] font-bold uppercase px-1.5 py-0.5 rounded bg-cc-accent/15 text-cc-accent border border-cc-accent/25">Anonymous</span>
        </div>
        {isRevealed && profile && (
          <div className="flex flex-col gap-0.5">
            {profile.phone && <span className="text-[11px] text-cc-muted">+63 {profile.phone}</span>}
            {profile.emergency_contact_name && (
              <span className="text-[10px] text-cc-red flex items-center gap-1">
                <span className="material-symbols-outlined text-[11px]">emergency</span>
                {profile.emergency_contact_name} ({profile.emergency_contact_relationship}) — +63 {profile.emergency_contact_phone}
              </span>
            )}
          </div>
        )}
        <button
          type="button"
          onClick={() => toggleReveal(r.id)}
          className="text-[10px] font-bold uppercase tracking-wider text-cc-accent hover:underline flex items-center gap-1"
        >
          <span className="material-symbols-outlined text-[13px]">{isRevealed ? 'visibility_off' : 'visibility'}</span>
          {isRevealed ? 'Hide identity' : 'Reveal identity'}
        </button>
      </div>
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h3 className="font-headline-md text-headline-md font-bold text-cc-heading flex items-center gap-2">
            <span className="material-symbols-outlined text-cc-accent">list_alt</span>
            Report Registry
          </h3>
          <p className="text-sm text-cc-body mt-1">Every submitted incident report with reporter attribution. Anonymous identities are visible only to the superadmin.</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex rounded-lg border border-cc-border overflow-hidden text-[11px] font-bold uppercase tracking-wider">
            <button
              type="button"
              onClick={() => setTab('active')}
              className={`px-3.5 py-2 transition-colors ${tab === 'active' ? 'bg-cc-accent text-white' : 'bg-cc-input text-cc-muted hover:text-cc-heading'}`}
            >
              Active ({activeCount})
            </button>
            <button
              type="button"
              onClick={() => setTab('archive')}
              className={`px-3.5 py-2 transition-colors ${tab === 'archive' ? 'bg-cc-accent text-white' : 'bg-cc-input text-cc-muted hover:text-cc-heading'}`}
            >
              Archive ({archivedCount})
            </button>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cc-muted text-lg">search</span>
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search report no, title, category..."
              className="pl-10 pr-4 py-2 bg-cc-input border border-cc-border rounded-lg focus:ring-1 focus:ring-cc-accent w-72 text-sm text-cc-heading placeholder:text-cc-muted focus:outline-none"
            />
          </div>
        </div>
      </div>

      <div className="bg-cc-card rounded-2xl border border-cc-border shadow-cc-card overflow-hidden">
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-cc-muted">Loading registry…</div>
          ) : error ? (
            <div className="p-12 text-center text-sm text-cc-red">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-cc-muted">No reports found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-cc-hover border-b border-cc-border">
                  <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">Report</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">Incident</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">Category</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">Priority</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">Status</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">Uploaded by</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest">Submitted</th>
                  <th className="px-6 py-4 text-[10px] font-bold text-cc-muted uppercase tracking-widest text-right">Evidence</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cc-border">
                {paginatedReports.map((r) => (
                  <tr key={r.id} onClick={() => setSelectedId(r.id)} className="hover:bg-cc-hover transition-colors cursor-pointer">
                    <td className="px-6 py-4">
                      <span className="text-xs font-bold text-cc-accent font-mono">{r.report_no ?? '—'}</span>
                    </td>
                    <td className="px-6 py-4 max-w-[260px]">
                      <p className="text-sm font-semibold text-cc-heading truncate" title={r.title}>{r.title}</p>
                      {r.address && <p className="text-[11px] text-cc-muted truncate flex items-center gap-1 mt-0.5"><span className="material-symbols-outlined text-[12px]">location_on</span>{r.address}</p>}
                    </td>
                    <td className="px-6 py-4">
                      <span className="text-xs text-cc-body font-medium">{r.category}</span>
                      {typeof r.confidence === 'number' && <span className="text-[10px] text-cc-muted block">{r.confidence}% conf.</span>}
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase border ${PRIORITY_STYLES[r.priority] ?? 'bg-cc-muted/10 text-cc-muted'}`}>{r.priority}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold uppercase ${STATUS_STYLES[r.status] ?? 'bg-cc-muted/10 text-cc-muted'}`}>{r.status}</span>
                    </td>
                    <td className="px-6 py-4">{renderReporter(r)}</td>
                    <td className="px-6 py-4 text-xs text-cc-muted">{new Date(r.incident_time ?? r.created_at).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}</td>
                    <td className="px-6 py-4 text-right">
                      <span className="inline-flex items-center gap-1 text-xs text-cc-muted">
                        <span className="material-symbols-outlined text-[14px]">attach_file</span>
                        {(r.evidence ?? []).length}
                      </span>
                    </td>
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

      <div className="bg-cc-card border border-cc-border rounded-xl p-4 flex items-start gap-3">
        <span className="material-symbols-outlined text-cc-accent">verified_user</span>
        <p className="text-xs text-cc-body leading-relaxed">
          Reports posted anonymously are labeled "Anonymous" by default. Only the superadmin can reveal the real reporter identity — click any row for full details or use the Reveal identity action.
        </p>
      </div>

      <IncidentDetailModal reportId={selectedId} onClose={() => setSelectedId(null)} unmaskAnonymous />

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
