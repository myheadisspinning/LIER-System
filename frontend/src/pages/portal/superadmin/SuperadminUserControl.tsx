import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { fmtDate, logAudit } from '../../../lib/admin';

type Acct = {
  id: string;
  email: string;
  fullname: string;
  role: string;
  email_confirmed_at: string | null;
  created_at: string;
  suspended: boolean;
  phone: string | null;
  address: string | null;
  dob: string | null;
  gender: string | null;
  avatar_url: string | null;
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

const shortId = (id: string) => `CBR-${id.replace(/[^a-zA-Z0-9]/g, '').slice(0, 6).toUpperCase()}`;

export default function SuperadminUserControl() {
  const [users, setUsers] = useState<Acct[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [verifyFilter, setVerifyFilter] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [tempPw, setTempPw] = useState<{ name: string; pw: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchUsers = async () => {
    const res = await supabase.rpc('admin_list_users', { p_scope: 'residents' });
    if (res.error) throw new Error(res.error.message);
    return (res.data ?? []) as Acct[];
  };

  useEffect(() => {
    void (async () => {
      try {
        const rows = await fetchUsers();
        setUsers(rows);
        if (rows.length > 0) setActiveId(rows[0].id);
      } catch (e) {
        setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to load users.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const active = users.find((u) => u.id === activeId) ?? null;

  const stats = useMemo(
    () => ({
      total: users.length,
      verified: users.filter((u) => u.email_confirmed_at).length,
      pending: users.filter((u) => !u.email_confirmed_at).length,
      suspended: users.filter((u) => u.suspended).length,
    }),
    [users]
  );

  const visible = useMemo(() => {
    const q = query.trim().toLowerCase();
    return users.filter((u) => {
      const matchesQuery =
        q === '' ||
        u.fullname.toLowerCase().includes(q) ||
        u.email.toLowerCase().includes(q) ||
        (u.phone ?? '').includes(q);
      const matchesStatus =
        statusFilter === '' || (statusFilter === 'suspended' ? u.suspended : !u.suspended);
      const matchesVerify =
        verifyFilter === '' ||
        (verifyFilter === 'verified' ? !!u.email_confirmed_at : !u.email_confirmed_at);
      return matchesQuery && matchesStatus && matchesVerify;
    });
  }, [users, query, statusFilter, verifyFilter]);

  const exportCsv = () => {
    const header = ['Name', 'Email', 'Phone', 'Address', 'Role', 'Verification', 'Status', 'Registered'];
    const rows = visible.map((u) => [
      u.fullname,
      u.email,
      u.phone ?? '',
      u.address ?? '',
      u.role,
      u.email_confirmed_at ? 'Verified' : 'Pending',
      u.suspended ? 'Suspended' : 'Active',
      fmtDate(u.created_at, 'short'),
    ]);
    const csv = [header, ...rows]
      .map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(','))
      .join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'culiat-user-accounts.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const toggleSuspend = async (u: Acct) => {
    setBusyId(u.id);
    const res = await supabase.rpc('admin_suspend_user', { p_user_id: u.id, p_suspended: !u.suspended });
    setBusyId(null);
    if (res.error) {
      setToast({ type: 'error', message: res.error.message });
      return;
    }
    await logAudit(u.suspended ? 'Unsuspend user' : 'Suspend user', `${u.suspended ? 'Unsuspended' : 'Suspended'} ${u.fullname}.`);
    setToast({ type: 'success', message: u.suspended ? `${u.fullname} re-activated.` : `${u.fullname} suspended.` });
    try {
      setUsers(await fetchUsers());
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to refresh users.' });
    }
  };

  const resetPw = async (u: Acct) => {
    setBusyId(u.id);
    const res = await supabase.rpc('admin_reset_password', { p_user_id: u.id });
    setBusyId(null);
    if (res.error) {
      setToast({ type: 'error', message: res.error.message });
    } else if (typeof res.data === 'string') {
      await logAudit('Reset password', `Reset password for ${u.fullname}.`);
      setTempPw({ name: u.fullname, pw: res.data });
    }
  };

  return (
    <div>
      <div className="flex flex-col md:flex-row md:items-end justify-between mb-lg gap-md">
        <div>
          <h2 className="font-headline-lg text-headline-lg text-on-surface mb-xs">User Control</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">Manage resident accounts, verification status, and account access.</p>
        </div>
        <div className="flex gap-sm">
          <button
            type="button"
            onClick={exportCsv}
            className="px-4 py-2 rounded-lg border-1.5 border-secondary text-secondary font-label-md text-label-md hover:bg-secondary/5 transition-colors flex items-center gap-2"
          >
            <span className="material-symbols-outlined text-sm">download</span> Export Users
          </button>
        </div>
      </div>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-gutter mb-lg">
        <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/30 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1">Total Users</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">{stats.total}</h3>
            </div>
            <div className="p-2 rounded-lg bg-surface-container-high text-secondary">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
            </div>
          </div>
          <div className="text-sm text-on-surface-variant flex items-center gap-1 z-10 font-caption">Registered resident accounts</div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>group</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/30 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group">
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1">Verified Users</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">{stats.verified}</h3>
            </div>
            <div className="p-2 rounded-lg bg-surface-container-high text-[#16a34a]">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
            </div>
          </div>
          <div className="text-sm text-on-surface-variant flex items-center gap-1 z-10 font-caption">
            <span className="text-on-surface font-medium">{stats.total ? Math.round((stats.verified / stats.total) * 100) : 0}%</span> confirmed
          </div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>verified</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/30 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group border-l-4 border-l-[#eab308]">
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1">Pending Verification</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">{stats.pending}</h3>
            </div>
            <div className="p-2 rounded-lg bg-[#fef9c3] text-[#ca8a04]">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
            </div>
          </div>
          <div className="text-sm text-on-surface-variant flex items-center gap-1 z-10 font-caption">Awaiting email confirmation</div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>pending_actions</span>
          </div>
        </div>
        <div className="bg-surface-container-lowest rounded-xl p-md border border-outline-variant/30 shadow-sm flex flex-col justify-between h-32 relative overflow-hidden group border-l-4 border-l-error">
          <div className="flex justify-between items-start z-10">
            <div>
              <p className="font-caption text-caption text-on-surface-variant uppercase tracking-wider mb-1">Suspended</p>
              <h3 className="font-headline-lg text-headline-lg text-on-surface">{stats.suspended}</h3>
            </div>
            <div className="p-2 rounded-lg bg-error-container text-on-error-container">
              <span className="material-symbols-outlined" style={{ fontVariationSettings: "'FILL' 1" }}>block</span>
            </div>
          </div>
          <div className="text-sm text-on-surface-variant flex items-center gap-1 z-10 font-caption">Restricted access</div>
          <div className="absolute -right-4 -bottom-4 opacity-5 group-hover:opacity-10 transition-opacity">
            <span className="material-symbols-outlined text-8xl" style={{ fontVariationSettings: "'FILL' 1" }}>block</span>
          </div>
        </div>
      </div>
      <div className="flex gap-gutter h-[calc(100vh-320px)] min-h-[600px]">
        <div className="flex-1 bg-surface-container-lowest rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col overflow-hidden relative z-10">
          <div className="p-md border-b border-outline-variant/30 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-sm bg-surface/50 backdrop-blur-md">
            <div className="relative w-full sm:w-72">
              <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant">search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2 bg-surface-variant/50 border border-outline-variant/30 rounded-lg text-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary transition-all min-h-[48px]"
                placeholder="Search by name, email, or phone..."
                type="text"
              />
            </div>
            <div className="flex items-center gap-2 w-full sm:w-auto overflow-x-auto pb-2 sm:pb-0">
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="min-h-[48px] bg-surface-variant/50 border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
              >
                <option value="">All Status</option>
                <option value="active">Active</option>
                <option value="suspended">Suspended</option>
              </select>
              <select
                value={verifyFilter}
                onChange={(e) => setVerifyFilter(e.target.value)}
                className="min-h-[48px] bg-surface-variant/50 border border-outline-variant/30 rounded-lg px-3 py-2 text-sm text-on-surface focus:outline-none focus:border-secondary"
              >
                <option value="">Verification</option>
                <option value="verified">Verified</option>
                <option value="pending">Pending</option>
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-10 text-center text-sm text-on-surface-variant">Loading users…</div>
            ) : visible.length === 0 ? (
              <div className="p-10 text-center text-sm text-on-surface-variant">No users match your filters.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="bg-surface-container sticky top-0 z-10">
                  <tr>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">User</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Resident ID</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Contact</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Verification</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap">Status</th>
                    <th className="py-3 px-4 font-label-md text-label-md text-on-surface-variant whitespace-nowrap text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-outline-variant/20 font-body-md text-sm">
                  {visible.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => setActiveId(u.id)}
                      className={`hover:bg-surface-container-high/30 transition-colors cursor-pointer ${activeId === u.id ? 'bg-surface-container-highest/20' : ''} ${u.suspended ? 'opacity-75' : ''}`}
                    >
                      <td className="py-3 px-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full ${u.suspended ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'} flex items-center justify-center font-bold relative overflow-hidden`}>
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              initials(u.fullname)
                            )}
                            <div className={`absolute bottom-0 right-0 w-3 h-3 rounded-full border-2 border-surface-container-lowest ${u.suspended ? 'bg-error' : u.email_confirmed_at ? 'bg-[#16a34a]' : 'bg-outline'}`}></div>
                          </div>
                          <div>
                            <div className={`font-medium text-on-surface ${u.suspended ? 'line-through decoration-error/50' : ''}`}>{u.fullname}</div>
                            <div className="text-xs text-on-surface-variant">Reg: {fmtDate(u.created_at, 'short')}</div>
                          </div>
                        </div>
                      </td>
                      <td className="py-3 px-4 text-on-surface-variant font-mono text-xs">{shortId(u.id)}</td>
                      <td className="py-3 px-4">
                        <div className="text-on-surface break-all">{u.email}</div>
                        <div className="text-xs text-on-surface-variant">{u.phone ? `+63 ${u.phone}` : 'No phone'}</div>
                      </td>
                      <td className="py-3 px-4">
                        {u.email_confirmed_at ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#dcfce7] text-[#166534] text-xs font-medium">
                            <span className="material-symbols-outlined text-[14px]">verified</span> Verified
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fef9c3] text-[#854d0e] text-xs font-medium">
                            <span className="material-symbols-outlined text-[14px]">pending</span> Pending
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        {u.suspended ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-error-container text-on-error-container text-xs font-medium">
                            <span className="material-symbols-outlined text-[14px]">block</span> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-1 rounded-full bg-surface-container-high text-on-surface text-xs font-medium border border-outline-variant/30">
                            Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => setActiveId(u.id)}
                          className="text-on-surface-variant hover:text-secondary p-1 rounded-md hover:bg-surface-variant/50"
                        >
                          <span className="material-symbols-outlined">more_vert</span>
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="p-3 border-t border-outline-variant/30 flex justify-between items-center bg-surface text-sm text-on-surface-variant">
            <div>Showing {visible.length} of {stats.total} entries</div>
          </div>
        </div>
        <div className="w-[400px] shrink-0 glass-panel rounded-2xl flex flex-col overflow-hidden relative shadow-lg">
          <div className="h-24 bg-gradient-to-r from-secondary-container to-primary-container absolute top-0 w-full z-0"></div>
          {active ? (
            <div className="p-md pt-lg relative z-10 flex-1 overflow-y-auto no-scrollbar">
              <div className="flex flex-col items-center mb-6 text-center">
                <div className="w-20 h-20 rounded-full bg-surface shadow-md border-4 border-surface p-1 mb-3 relative overflow-hidden">
                  {active.avatar_url ? (
                    <img src={active.avatar_url} alt="" className="w-full h-full object-cover rounded-full" />
                  ) : (
                    <div className={`w-full h-full rounded-full ${active.suspended ? 'bg-error-container text-on-error-container' : 'bg-secondary-container text-on-secondary-container'} flex items-center justify-center text-xl font-bold`}>
                      {initials(active.fullname)}
                    </div>
                  )}
                  <div className={`absolute bottom-0 right-0 w-4 h-4 rounded-full border-2 border-surface ${active.suspended ? 'bg-error' : 'bg-[#16a34a]'}`}></div>
                </div>
                <h3 className="font-headline-md text-headline-md text-on-surface m-0">{active.fullname}</h3>
                <p className="font-mono text-xs text-on-surface-variant mb-2 bg-surface-variant/50 px-2 py-1 rounded inline-block mt-1">{shortId(active.id)}</p>
                <div className="flex gap-2 justify-center mt-2 flex-wrap">
                  {active.email_confirmed_at ? (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#dcfce7] text-[#166534] text-xs font-medium border border-[#bbf7d0]">
                      <span className="material-symbols-outlined text-[14px]">verified</span> Email Verified
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-[#fef9c3] text-[#854d0e] text-xs font-medium border border-[#fde68a]">
                      <span className="material-symbols-outlined text-[14px]">pending</span> Pending Verification
                    </span>
                  )}
                  <span className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border ${active.suspended ? 'bg-error-container text-on-error-container border-error/30' : 'bg-surface-container-high text-on-surface border-outline-variant/30'}`}>
                    {active.suspended ? 'Suspended Account' : 'Active Account'}
                  </span>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-2 mb-6">
                <button
                  type="button"
                  disabled={busyId === active.id}
                  onClick={() => resetPw(active)}
                  className="py-2 border border-secondary text-secondary rounded-lg text-sm font-medium hover:bg-secondary/5 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-sm">lock_reset</span> Reset Password
                </button>
                <button
                  type="button"
                  disabled={busyId === active.id}
                  onClick={() => toggleSuspend(active)}
                  className={`py-2 rounded-lg text-sm font-medium transition-colors shadow-sm flex justify-center items-center gap-2 disabled:opacity-50 ${active.suspended ? 'bg-success-green text-on-success-green hover:bg-success-green/90' : 'bg-error text-on-error hover:bg-error/90'}`}
                >
                  <span className="material-symbols-outlined text-sm">{active.suspended ? 'check_circle' : 'block'}</span>
                  {active.suspended ? 'Re-activate' : 'Suspend'}
                </button>
              </div>
              <div className="space-y-6">
                <div>
                  <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3 border-b border-outline-variant/30 pb-1">Contact Information</h4>
                  <div className="space-y-3 text-sm">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px] mt-0.5">mail</span>
                      <div>
                        <p className="text-on-surface font-medium break-all">{active.email}</p>
                        <p className="text-xs text-on-surface-variant">{active.email_confirmed_at ? 'Confirmed email' : 'Email not yet confirmed'}</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px] mt-0.5">call</span>
                      <div>
                        <p className="text-on-surface font-medium">{active.phone ? `+63 ${active.phone}` : '—'}</p>
                        <p className="text-xs text-on-surface-variant">Mobile Number</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px] mt-0.5">home_pin</span>
                      <div>
                        <p className="text-on-surface font-medium">{active.address ?? '—'}</p>
                        <p className="text-xs text-on-surface-variant">Registered Address</p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-on-surface-variant text-[18px] mt-0.5">cake</span>
                      <div>
                        <p className="text-on-surface font-medium">{active.dob ?? '—'}</p>
                        <p className="text-xs text-on-surface-variant">{active.gender ? `${active.gender[0].toUpperCase()}${active.gender.slice(1)}` : 'Gender'} • Date of Birth</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3 border-b border-outline-variant/30 pb-1">Account</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-surface-container/50 rounded-lg p-3 border border-outline-variant/20">
                      <div className="text-caption text-outline mb-1">Role</div>
                      <div className="text-sm font-medium text-on-surface capitalize">{active.role}</div>
                    </div>
                    <div className="bg-surface-container/50 rounded-lg p-3 border border-outline-variant/20">
                      <div className="text-caption text-outline mb-1">Registered</div>
                      <div className="text-sm font-medium text-on-surface">{fmtDate(active.created_at, 'short')}</div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-label-md text-label-md text-error uppercase tracking-wider mb-3 border-b border-error/20 pb-1">Security Controls</h4>
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={busyId === active.id}
                      onClick={() => resetPw(active)}
                      className="w-full text-left py-2 px-3 rounded text-sm text-on-surface hover:bg-surface-variant/50 flex items-center gap-2 transition-colors disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">key</span> Force Password Reset
                    </button>
                    <button
                      type="button"
                      disabled={busyId === active.id}
                      onClick={() => toggleSuspend(active)}
                      className={`w-full text-left py-2 px-3 rounded text-sm hover:bg-surface-variant/50 flex items-center gap-2 transition-colors disabled:opacity-50 ${active.suspended ? 'text-success-green' : 'text-error'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{active.suspended ? 'check_circle' : 'block'}</span>
                      {active.suspended ? 'Re-activate Account' : 'Suspend Account Access'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant relative z-10">Select a user to manage.</div>
          )}
        </div>
      </div>

      {tempPw && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-md">
            <div className="px-5 py-4 border-b border-border-subtle">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Temporary Password</h3>
            </div>
            <div className="p-5">
              <p className="text-sm text-on-surface-variant mb-3">Share this temporary password securely with <span className="font-semibold text-on-surface">{tempPw.name}</span>. They must change it on next sign-in.</p>
              <div className="bg-surface-container-low border border-border-subtle rounded-lg px-4 py-3 font-mono text-lg text-on-surface text-center tracking-wider">{tempPw.pw}</div>
              <button type="button" onClick={() => setTempPw(null)} className="mt-4 w-full bg-secondary hover:bg-secondary/90 text-on-secondary rounded-lg py-2 text-label-md font-medium transition-colors">Done</button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-8 right-8 bg-surface-container-high text-on-surface px-4 py-3 rounded-lg shadow-lg text-sm z-[150]">{toast.message}</div>}
    </div>
  );
}
