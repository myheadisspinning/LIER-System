import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../../../supabaseClient';

type DbReport = {
 id: string;
 report_no: string | null;
 title: string;
 category: string;
 status: string;
 priority: string;
 address: string | null;
 created_at: string;
};

const priorityChip = (priority: string) => {
 if (priority === 'CRITICAL') return 'bg-error/15 text-error border-error/30';
 if (priority === 'HIGH') return 'bg-secondary/15 text-secondary border-secondary/30';
 if (priority === 'MEDIUM') return 'bg-tertiary/15 text-tertiary border-tertiary/30';
 return 'bg-surface-container-low text-on-surface-variant border-border-subtle';
};

const statusMeta = (status: string) => {
 if (status === 'Resolved')
 return { label: 'Resolved', chip: 'bg-success-green/15 text-success-green border-success-green/30', dot: 'bg-success-green' };
 if (status === 'Rejected')
 return { label: 'Rejected', chip: 'bg-error/15 text-error border-error/30', dot: 'bg-error' };
 return { label: 'Under Investigation', chip: 'bg-secondary/15 text-secondary border-secondary/30', dot: 'bg-secondary' };
};

const formatDate = (value: string) =>
 new Date(value).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });

export default function UserDashboard() {
 const [reports, setReports] = useState<DbReport[]>([]);
 const [name, setName] = useState('');
 const [loading, setLoading] = useState(true);
 const [error, setError] = useState<string | null>(null);
 const [advisoryCount, setAdvisoryCount] = useState(0);

useEffect(() => {
  let cancelled = false;
  let channel: ReturnType<typeof supabase.channel> | null = null;

  const refreshReports = async (userId: string) => {
   const repRes = await supabase
    .from('incident_reports')
    .select('id, report_no, title, category, status, priority, address, created_at')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(6);
   if (cancelled) return;
   if (repRes.error) setError(repRes.error.message);
   else setReports((repRes.data as DbReport[] | null) ?? []);
  };

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
   const userId = session.user.id;
   const meta = session.user.user_metadata as Record<string, unknown> | undefined;
   const fullname = (typeof meta?.fullname === 'string' && meta.fullname.trim()) ||
   (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
   (typeof meta?.name === 'string' && meta.name.trim()) || '';
   if (!cancelled) setName(fullname || session.user.email || '');
   const [advisoryRes] = await Promise.all([
    supabase.from('broadcasts').select('id', { count: 'exact', head: true }),
    refreshReports(userId),
   ]);
   if (cancelled) return;
   setAdvisoryCount(advisoryRes.count ?? 0);
   setLoading(false);
   channel = supabase
    .channel(`user-dashboard-${userId}`)
    .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_reports', filter: `user_id=eq.${userId}` }, () => void refreshReports(userId))
    .on('postgres_changes', { event: '*', schema: 'public', table: 'broadcasts' }, () => {
     if (cancelled) return;
     void supabase.from('broadcasts').select('id', { count: 'exact', head: true }).then((r) => { if (!cancelled) setAdvisoryCount(r.count ?? 0); });
    })
    .subscribe();
  })();
  return () => {
   cancelled = true;
   if (channel) void supabase.removeChannel(channel);
  };
 }, []);

 const total = reports.length;
 const active = reports.filter((r) => r.status !== 'Resolved' && r.status !== 'Rejected').length;
 const resolved = reports.filter((r) => r.status === 'Resolved').length;
 const firstName = name.split(/\s+/)[0] || 'Resident';

 const byCategory = (() => {
  const map = new Map<string, number>();
  for (const r of reports) map.set(r.category, (map.get(r.category) ?? 0) + 1);
  return Array.from(map.entries())
   .map(([category, count]) => ({ category, count }))
   .sort((a, b) => b.count - a.count);
 })();
 const maxCat = Math.max(1, ...byCategory.map((c) => c.count));

 const hour = new Date().getHours();
 const greeting = hour < 12 ? 'Good morning' : hour < 18 ? 'Good afternoon' : 'Good evening';

  return (
  <div className="-m-4 lg:-m-8 bg-surface-container-low text-on-surface font-body rounded-2xl px-4 sm:px-5 lg:px-8 py-4 sm:py-6 lg:py-8 relative overflow-hidden">
   <div className="relative">
   {/* ============ GREETING ============ */}
   <div className="mb-4 sm:mb-6">
    <h2 className="text-xl sm:text-2xl font-bold text-on-surface tracking-tight">
     {greeting}, {firstName}
    </h2>
    <p className="text-sm text-on-surface-variant mt-1 hidden sm:block">
     Here&apos;s what&apos;s happening with your reports and community alerts.
    </p>
   </div>

   {/* ============ KPI ROW ============ */}
   <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-6">
    <div className="bg-surface-container-lowest border border-border-subtle border-t-2 border-t-cc-emerald rounded-xl p-4 sm:p-5 shadow-sm">
    <div className="flex items-center justify-between mb-2.5 sm:mb-3">
     <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-success-green/15 flex items-center justify-center">
     <span className="material-symbols-outlined text-success-green text-[18px] sm:text-[22px]">description</span>
     </div>
     <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-success-green/10 text-success-green border border-success-green/25 text-[11px] font-bold">
     {loading ? '…' : `${active} active`}
     </span>
    </div>
    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">My Reports</p>
    <p className="font-headline-md text-headline-md font-bold text-on-surface">{loading ? '—' : total}</p>
    <p className="text-xs text-on-surface-variant mt-1.5 hidden sm:block">Submitted to Barangay Culiat</p>
    </div>
    <div className="bg-surface-container-lowest border border-border-subtle border-t-2 border-t-cc-blue rounded-xl p-4 sm:p-5 shadow-sm">
    <div className="flex items-center justify-between mb-2.5 sm:mb-3">
     <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-secondary/15 flex items-center justify-center">
     <span className="material-symbols-outlined text-secondary text-[18px] sm:text-[22px]">folder_open</span>
     </div>
     <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-secondary/10 text-secondary border border-secondary/25 text-[11px] font-bold">IN PROGRESS</span>
    </div>
    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Active Cases</p>
    <p className="font-headline-md text-headline-md font-bold text-on-surface">{loading ? '—' : active}</p>
    <p className="text-xs text-on-surface-variant mt-1.5 hidden sm:block">Under investigation</p>
    </div>
    <div className="bg-surface-container-lowest border border-border-subtle border-t-2 border-t-cc-teal rounded-xl p-4 sm:p-5 shadow-sm">
    <div className="flex items-center justify-between mb-2.5 sm:mb-3">
     <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-tertiary/15 flex items-center justify-center">
     <span className="material-symbols-outlined text-tertiary text-[18px] sm:text-[22px]">task_alt</span>
     </div>
     <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-tertiary/10 text-tertiary border border-tertiary/25 text-[11px] font-bold">CLOSED</span>
    </div>
    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Resolved</p>
    <p className="font-headline-md text-headline-md font-bold text-on-surface">{loading ? '—' : resolved}</p>
    <p className="text-xs text-on-surface-variant mt-1.5 hidden sm:block">Settled &amp; closed</p>
    </div>
    <Link to="/user/advisories" className="bg-surface-container-lowest border border-border-subtle border-t-2 border-t-cc-red rounded-xl p-4 sm:p-5 shadow-sm hover:border-error/40 transition-colors">
    <div className="flex items-center justify-between mb-2.5 sm:mb-3">
     <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-error/15 flex items-center justify-center">
     <span className="material-symbols-outlined text-error text-[18px] sm:text-[22px]">notifications_active</span>
     </div>
     <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-error/10 text-error border border-error/25 text-[11px] font-bold">NEW</span>
    </div>
    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Community Alerts</p>
    <p className="font-headline-md text-headline-md font-bold text-on-surface">{loading ? '—' : advisoryCount}</p>
    <p className="text-xs text-on-surface-variant mt-1.5 hidden sm:block">Latest barangay announcements</p>
    </Link>
   </div>

   {/* ============ CONTENT ============ */}
   <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 mt-4 sm:mt-6">
    {/* My Recent Reports */}
    <section className="lg:col-span-8 bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
    <div className="px-5 py-4 border-b border-border-subtle flex flex-wrap items-center justify-between gap-2">
     <h3 className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2">
     <span className="material-symbols-outlined text-secondary">assignment</span>
     My Recent Reports
     </h3>
     <Link to="/user/my-incident-reports" className="inline-flex items-center gap-1 text-xs font-bold text-secondary hover:underline">
     View All <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
     </Link>
    </div>
    {loading ? (
     <div className="p-6 sm:p-10 text-center text-sm text-on-surface-variant">Loading your reports…</div>
    ) : error ? (
     <div className="p-6 sm:p-10 text-center text-sm text-error">{error}</div>
    ) : reports.length === 0 ? (
     <div className="p-6 sm:p-10 text-center">
     <span className="material-symbols-outlined text-4xl text-on-surface-variant">inbox</span>
     <p className="text-sm text-on-surface-variant mt-3 mb-4">You haven&apos;t submitted any reports yet.</p>
     <Link
      to="/user/report-incident"
      className="inline-flex items-center gap-2 bg-secondary text-on-secondary px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition-all active:scale-[0.98]"
     >
      <span className="material-symbols-outlined text-[18px]">add</span> Report an Incident
     </Link>
     </div>
    ) : (
     <div className="overflow-x-auto">
     <table className="w-full text-left">
      <thead className="border-b border-border-subtle bg-surface-container-low text-on-surface-variant">
      <tr>
       <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest">Report</th>
       <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest">Category</th>
       <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest">Date &amp; Location</th>
       <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest">Status</th>
       <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest">AI Priority</th>
       <th className="px-5 py-2.5 text-[11px] font-bold uppercase tracking-widest text-right">Action</th>
      </tr>
      </thead>
      <tbody className="divide-y divide-border-subtle">
      {reports.map((r) => {
       const sm = statusMeta(r.status);
       return (
       <tr key={r.id} className="hover:bg-surface-container-low transition-colors">
        <td className="px-5 py-3">
        <div className="text-sm font-semibold text-on-surface">{r.report_no ?? r.id.slice(0, 8).toUpperCase()}</div>
        <div className="text-xs text-on-surface-variant mt-0.5 max-w-[180px] truncate">{r.title}</div>
        </td>
        <td className="px-5 py-3 text-sm text-on-surface-variant">{r.category}</td>
        <td className="px-5 py-3">
        <div className="text-sm text-on-surface-variant">{formatDate(r.created_at)}</div>
        <div className="text-xs text-on-surface-variant max-w-[140px] truncate">{r.address ?? 'Location on file'}</div>
        </td>
        <td className="px-5 py-3">
        <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold border ${sm.chip}`}>
         <span className={`w-1.5 h-1.5 rounded-full mr-1.5 ${sm.dot}`}></span>
         {sm.label}
        </span>
        </td>
        <td className="px-5 py-3">
        <span className={`inline-flex px-2.5 py-1 rounded-full text-[11px] font-bold border ${priorityChip(r.priority)}`}>
         {r.priority}
        </span>
        </td>
        <td className="px-5 py-3 text-right">
        <Link to="/user/my-incident-reports" className="text-xs font-bold text-secondary hover:underline">
         Track
        </Link>
        </td>
       </tr>
       );
      })}
      </tbody>
     </table>
     </div>
    )}
    </section>

    {/* By Category */}
    <section className="lg:col-span-4 bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm p-5">
    <h3 className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2 mb-4">
     <span className="material-symbols-outlined text-secondary">category</span>
     By Category
    </h3>
    {reports.length === 0 ? (
     <p className="text-sm text-on-surface-variant">No report data yet.</p>
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
      const n = reports.filter((r) => r.priority === p).length;
      return (
      <span key={p} className={`px-2 py-1 rounded-full text-xs font-semibold ${priorityChip(p)}`}>
       {p}: {n}
      </span>
      );
     })}
     </div>
    </div>
    </section>
   </div>
  </div>
 </div>
  );
}






