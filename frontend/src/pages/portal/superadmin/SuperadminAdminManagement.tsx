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
};

type Filter = 'All' | 'Staff' | 'Officers';

const ROLE_BADGE: Record<string, string> = {
  superadmin: 'bg-error-red/10 text-error-red',
  admin: 'bg-primary text-white',
  officer: 'bg-[#1E40AF]/10 text-[#1E40AF]',
  user: 'bg-surface-container-high text-on-surface-variant',
};

const ROLE_LABEL: Record<string, string> = {
  superadmin: 'Superadmin',
  admin: 'Admin',
  officer: 'Duty Officer',
  user: 'Resident User',
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

export default function SuperadminAdminManagement() {
  const [users, setUsers] = useState<Acct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', fullname: '', role: 'officer' });
  const [tempPw, setTempPw] = useState<{ name: string; pw: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchUsers = async () => {
    const res = await supabase.rpc('admin_list_users', { p_scope: 'staff' });
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
        setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to load accounts.' });
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  const active = users.find((u) => u.id === activeId) ?? null;

  const stats = useMemo(
    () => ({
      admins: users.filter((u) => u.role === 'admin' || u.role === 'superadmin').length,
      officers: users.filter((u) => u.role === 'officer').length,
      active: users.filter((u) => !u.suspended).length,
      suspended: users.filter((u) => u.suspended).length,
    }),
    [users]
  );

  const visible = users.filter((u) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q === '' || u.fullname.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Staff' && (u.role === 'admin' || u.role === 'superadmin')) ||
      (filter === 'Officers' && u.role === 'officer');
    return matchesQuery && matchesFilter;
  });

  const createUser = async () => {
    if (!form.email.trim() || !form.password || !form.fullname.trim()) return;
    setSaving(true);
    try {
      const res = await supabase.rpc('admin_create_user', {
        p_email: form.email.trim(),
        p_password: form.password,
        p_fullname: form.fullname.trim(),
        p_role: form.role,
      });
      if (res.error) throw new Error(res.error.message);
      await logAudit('Create account', `Created ${form.role} account for ${form.email.trim()}.`);
      setToast({ type: 'success', message: 'Account created successfully.' });
      setFormOpen(false);
      setForm({ email: '', password: '', fullname: '', role: 'officer' });
      const rows = await fetchUsers();
      setUsers(rows);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to create account.' });
    } finally {
      setSaving(false);
    }
  };

  const changeRole = async (u: Acct, role: string) => {
    setBusyId(u.id);
    const res = await supabase.rpc('admin_set_role', { p_user_id: u.id, p_role: role });
    setBusyId(null);
    if (res.error) {
      setToast({ type: 'error', message: res.error.message });
    } else {
      setToast({ type: 'success', message: `${u.fullname} is now ${ROLE_LABEL[role]}.` });
      try {
        setUsers(await fetchUsers());
      } catch (e) {
        setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to refresh accounts.' });
      }
    }
  };

  const resetPw = async (u: Acct) => {
    setBusyId(u.id);
    const res = await supabase.rpc('admin_reset_password', { p_user_id: u.id });
    setBusyId(null);
    if (res.error) {
      setToast({ type: 'error', message: res.error.message });
    } else if (typeof res.data === 'string') {
      setTempPw({ name: u.fullname, pw: res.data });
    }
  };

  const toggleSuspend = async (u: Acct) => {
    setBusyId(u.id);
    const res = await supabase.rpc('admin_suspend_user', { p_user_id: u.id, p_suspended: !u.suspended });
    setBusyId(null);
    if (res.error) {
      setToast({ type: 'error', message: res.error.message });
    } else {
      setToast({ type: 'success', message: u.suspended ? `${u.fullname} re-activated.` : `${u.fullname} suspended.` });
      try {
        setUsers(await fetchUsers());
      } catch (e) {
        setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to refresh accounts.' });
      }
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 mb-md">
        <div>
          <h2 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-background mb-2">Admin Management</h2>
          <p className="font-body-md text-body-md text-on-surface-variant max-w-2xl">Manage authorized personnel accounts, roles, permissions, and system access.</p>
        </div>
        <div className="flex flex-wrap gap-3">
          <button type="button" onClick={() => setFormOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-lg font-label-md text-label-md shadow-sm hover:shadow-md transition-shadow">
            <span className="material-symbols-outlined text-[18px]">person_add</span>
            + Add Admin
          </button>
          <button type="button" className="flex items-center gap-2 px-4 py-2 bg-primary-container text-on-primary rounded-lg font-label-md text-label-md shadow-sm hover:shadow-md transition-shadow">
            <span className="material-symbols-outlined text-[18px]">local_police</span>
            + Add Officer
          </button>
          <button type="button" className="flex items-center gap-2 px-4 py-2 border-1.5 border-outline-variant text-on-surface bg-surface rounded-lg font-label-md text-label-md hover:bg-surface-container-low transition-colors">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export List
          </button>
        </div>
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-lg">
        <div className="bg-surface rounded-2xl p-md border border-outline-variant/30 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-primary-fixed/30 rounded-full blur-xl group-hover:bg-primary-fixed/50 transition-colors"></div>
          <div className="flex items-center gap-3 mb-4 text-on-surface-variant">
            <span className="material-symbols-outlined bg-surface-container-high p-2 rounded-lg text-secondary">shield_person</span>
            <span className="font-label-md text-label-md uppercase tracking-wider">Total Admins</span>
          </div>
          <div className="font-display-lg-mobile text-display-lg-mobile text-on-background">{stats.admins}</div>
        </div>
        <div className="bg-surface rounded-2xl p-md border border-outline-variant/30 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-secondary-fixed/30 rounded-full blur-xl group-hover:bg-secondary-fixed/50 transition-colors"></div>
          <div className="flex items-center gap-3 mb-4 text-on-surface-variant">
            <span className="material-symbols-outlined bg-surface-container-high p-2 rounded-lg text-secondary-container">local_police</span>
            <span className="font-label-md text-label-md uppercase tracking-wider">Total Officers</span>
          </div>
          <div className="font-display-lg-mobile text-display-lg-mobile text-on-background">{stats.officers}</div>
        </div>
        <div className="bg-surface rounded-2xl p-md border border-outline-variant/30 shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-surface-container-highest/50 rounded-full blur-xl group-hover:bg-surface-container-highest transition-colors"></div>
          <div className="flex items-center gap-3 mb-4 text-on-surface-variant">
            <span className="material-symbols-outlined bg-surface-container-high p-2 rounded-lg text-on-secondary-fixed-variant">check_circle</span>
            <span className="font-label-md text-label-md uppercase tracking-wider">Active Accounts</span>
          </div>
          <div className="font-display-lg-mobile text-display-lg-mobile text-on-background">{stats.active}</div>
        </div>
        <div className="bg-surface rounded-2xl p-md border-l-4 border-l-error shadow-sm relative overflow-hidden group">
          <div className="absolute -right-4 -top-4 w-24 h-24 bg-error-container/30 rounded-full blur-xl group-hover:bg-error-container/50 transition-colors"></div>
          <div className="flex items-center gap-3 mb-4 text-on-surface-variant">
            <span className="material-symbols-outlined bg-error-container/50 p-2 rounded-lg text-error">gpp_bad</span>
            <span className="font-label-md text-label-md uppercase tracking-wider">Suspended</span>
          </div>
          <div className="font-display-lg-mobile text-display-lg-mobile text-error">{stats.suspended}</div>
        </div>
      </div>
      <div className="flex flex-col lg:flex-row gap-6 h-[800px]">
        <div className="flex-1 bg-surface rounded-2xl border border-outline-variant/30 shadow-sm flex flex-col overflow-hidden glass-panel relative z-10">
          <div className="p-md border-b border-outline-variant/30 bg-surface/50">
            <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-4">
              <div className="flex space-x-1 bg-surface-container-low p-1 rounded-lg">
                {(['All', 'Staff', 'Officers'] as Filter[]).map((f) => (
                  <button
                    key={f}
                    type="button"
                    onClick={() => setFilter(f)}
                    className={`px-4 py-2 rounded-md font-label-md text-label-md transition-colors ${filter === f ? 'bg-surface text-secondary shadow-sm' : 'text-on-surface-variant hover:bg-surface/50'}`}
                  >
                    {f === 'Staff' ? 'Admins & Staff' : f === 'Officers' ? 'Duty Officers' : 'All Accounts'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2">
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
                  <input
                    value={query}
                    onChange={(e) => setQuery(e.target.value)}
                    className="pl-9 pr-3 py-2 bg-white border border-outline-variant/50 rounded-lg text-on-surface-variant font-label-md text-label-md"
                    placeholder="Search accounts..."
                    type="text"
                  />
                </div>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-auto custom-scrollbar">
            {loading ? (
              <div className="p-10 text-center text-sm text-on-surface-variant">Loading accounts…</div>
            ) : visible.length === 0 ? (
              <div className="p-10 text-center text-sm text-on-surface-variant">No accounts match your filters.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead className="sticky top-0 bg-surface-container-lowest border-b border-outline-variant/30 z-10">
                  <tr className="font-label-md text-label-md text-on-surface-variant">
                    <th className="py-4 px-md font-medium uppercase tracking-wider w-12"></th>
                    <th className="py-4 px-md font-medium uppercase tracking-wider">Personnel</th>
                    <th className="py-4 px-md font-medium uppercase tracking-wider hidden sm:table-cell">Role</th>
                    <th className="py-4 px-md font-medium uppercase tracking-wider hidden lg:table-cell">Status</th>
                    <th className="py-4 px-md font-medium uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="font-body-md text-body-md text-on-surface divide-y divide-outline-variant/20 bg-white/50">
                  {visible.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => setActiveId(u.id)}
                      className={`hover:bg-surface-container-lowest/80 transition-colors cursor-pointer ${activeId === u.id ? 'bg-secondary/5 border-l-4 border-l-secondary-container' : ''} ${u.suspended ? 'opacity-75' : ''}`}
                    >
                      <td className="py-3 px-md">
                        <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-xs">
                          {initials(u.fullname)}
                        </div>
                      </td>
                      <td className="py-3 px-md">
                        <div className="font-semibold text-on-background">{u.fullname}</div>
                        <div className="text-caption text-on-surface-variant">{u.email}</div>
                      </td>
                      <td className="py-3 px-md hidden sm:table-cell">
                        <span className={`inline-flex items-center px-2 py-1 rounded text-caption font-medium ${ROLE_BADGE[u.role] ?? 'bg-surface-container-high text-on-surface-variant'}`}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="py-3 px-md hidden lg:table-cell">
                        {u.suspended ? (
                          <span className="inline-flex items-center gap-1 text-error">
                            <span className="w-2 h-2 rounded-full bg-error"></span> Suspended
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-secondary">
                            <span className="w-2 h-2 rounded-full bg-secondary"></span> Active
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-md text-right">
                        <button type="button" className="text-outline hover:text-secondary p-1 rounded transition-colors"><span className="material-symbols-outlined">more_vert</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>
        {active && (
          <div className="w-full lg:w-[400px] bg-surface rounded-2xl border border-outline-variant/30 shadow-xl flex flex-col overflow-hidden transform transition-transform origin-right z-20">
            <div className="relative h-32 bg-primary-container p-md flex items-end">
              <div className="absolute inset-0 bg-gradient-to-t from-primary-container to-transparent opacity-50"></div>
              <button type="button" onClick={() => setActiveId(null)} className="absolute top-4 right-4 text-on-primary/70 hover:text-on-primary bg-black/20 rounded-full p-1 transition-colors">
                <span className="material-symbols-outlined">close</span>
              </button>
              <div className="relative flex items-center gap-4 translate-y-8">
                <div className="w-20 h-20 rounded-xl bg-white p-1 shadow-md flex items-center justify-center">
                  <div className="w-full h-full rounded-lg bg-secondary/20 flex items-center justify-center text-secondary font-headline-lg text-headline-lg">
                    {initials(active.fullname)}
                  </div>
                </div>
                <div>
                  <h3 className="font-headline-md text-headline-md text-on-background mt-8">{active.fullname}</h3>
                  <p className="text-secondary font-label-md text-label-md">{ROLE_LABEL[active.role] ?? active.role}</p>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto mt-10 p-md space-y-6">
              <div className="flex justify-between items-center bg-surface-container-low p-3 rounded-xl border border-outline-variant/20">
                <div className="flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[20px]">directions_run</span>
                  <span className="font-label-md text-label-md text-on-surface">Duty Status</span>
                </div>
                <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full font-label-md text-label-md border ${active.suspended ? 'bg-error-container/20 text-error border-error/30' : 'bg-secondary-container/20 text-secondary-container border-secondary-container/30'}`}>
                  <span className={`w-2 h-2 rounded-full ${active.suspended ? 'bg-error' : 'bg-secondary-container animate-pulse'}`}></span>
                  {active.suspended ? 'Suspended' : 'Active'}
                </span>
              </div>
              <div>
                <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Officer Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-surface-bright p-3 rounded-lg border border-outline-variant/20">
                    <div className="text-caption text-outline mb-1">Email</div>
                    <div className="font-body-md text-body-md font-medium text-on-surface break-all">{active.email}</div>
                  </div>
                  <div className="bg-surface-bright p-3 rounded-lg border border-outline-variant/20">
                    <div className="text-caption text-outline mb-1">Registered</div>
                    <div className="font-body-md text-body-md font-medium text-on-surface">{fmtDate(active.created_at, 'short')}</div>
                  </div>
                </div>
              </div>
              <div>
                <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-3">Role</h4>
                <select
                  value={active.role}
                  disabled={busyId === active.id}
                  onChange={(e) => changeRole(active, e.target.value)}
                  className="w-full bg-surface-container-lowest border border-outline-variant rounded-lg px-3 py-2.5 text-sm text-on-surface focus:outline-none focus:border-secondary disabled:opacity-50"
                >
                  {['user', 'officer', 'admin', 'superadmin'].map((r) => (
                    <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>
                  ))}
                </select>
                <p className="text-[11px] text-on-surface-variant mt-1.5">Changing a role immediately updates access across all portals.</p>
              </div>
              <div>
                <h4 className="font-label-md text-label-md text-error uppercase tracking-wider mb-3">Security Controls</h4>
                <div className="space-y-3">
                  <button type="button" disabled={busyId === active.id} onClick={() => resetPw(active)} className="w-full flex justify-between items-center px-4 py-3 bg-surface-container-lowest border border-outline-variant/40 rounded-xl hover:border-secondary transition-colors text-left group disabled:opacity-50">
                    <div>
                      <div className="font-label-md text-label-md text-on-surface group-hover:text-secondary transition-colors">Force Password Reset</div>
                      <div className="text-caption text-outline mt-0.5">Require user to change password on next login.</div>
                    </div>
                    <span className="material-symbols-outlined text-outline group-hover:text-secondary">lock_reset</span>
                  </button>
                  <button type="button" disabled={busyId === active.id} onClick={() => toggleSuspend(active)} className={`w-full flex justify-between items-center px-4 py-3 border rounded-xl transition-colors text-left group disabled:opacity-50 ${active.suspended ? 'bg-success-green/5 border-success-green/30 hover:bg-success-green/10' : 'bg-error-container/20 border-error/30 hover:bg-error-container/40'}`}>
                    <div>
                      <div className={`font-label-md text-label-md ${active.suspended ? 'text-success-green' : 'text-error'}`}>{active.suspended ? 'Re-activate Account' : 'Suspend Account Access'}</div>
                      <div className={`text-caption ${active.suspended ? 'text-on-surface-variant' : 'text-on-error-container/70'} mt-0.5`}>{active.suspended ? 'Restore account access.' : 'Log out from all active devices immediately.'}</div>
                    </div>
                    <span className={`material-symbols-outlined ${active.suspended ? 'text-success-green' : 'text-error'}`}>{active.suspended ? 'check_circle' : 'block'}</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      {formOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-md max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center sticky top-0 bg-surface-container-lowest z-10">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Register New Account</h3>
              <button type="button" onClick={() => setFormOpen(false)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Full Name</label>
                <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.fullname} onChange={(e) => setForm({ ...form, fullname: e.target.value })} placeholder="Full name" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Email</label>
                <input type="email" className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@email.com" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Temporary Password</label>
                <input type="password" className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="8+ characters" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Role</label>
                <select className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}>
                  {['officer', 'admin', 'user'].map((r) => <option key={r} value={r}>{ROLE_LABEL[r] ?? r}</option>)}
                </select>
              </div>
              <button type="button" disabled={saving} onClick={createUser} className="w-full bg-secondary hover:bg-secondary/90 text-on-secondary rounded-lg py-2 text-label-md font-medium disabled:opacity-50 transition-colors">
                {saving ? 'Creating…' : 'Create Account'}
              </button>
            </div>
          </div>
        </div>
      )}
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
