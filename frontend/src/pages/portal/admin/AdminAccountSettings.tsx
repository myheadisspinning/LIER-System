import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { fmtDate, isOnlineSince, logAudit, timeAgo } from '../../../lib/admin';
import Toast from '../../../components/Toast';

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
  emergency_contact_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
};

type Filter = 'All' | 'Active' | 'Pending' | 'Suspended';

const ROLE_BADGE: Record<string, string> = {
  user: 'bg-surface-container-high text-on-surface-variant',
};

const ROLE_LABEL: Record<string, string> = {
  user: 'User Account',
};

const initials = (name: string) =>
  name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase() ?? '')
    .join('') || '?';

export default function AdminAccountSettings() {
  const [users, setUsers] = useState<Acct[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Filter>('All');
  const [query, setQuery] = useState('');
  const [activeId, setActiveId] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [form, setForm] = useState({ email: '', password: '', fullname: '', role: 'user' });
  const [tempPw, setTempPw] = useState<{ name: string; pw: string } | null>(null);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [editOpen, setEditOpen] = useState(false);
  const [editForm, setEditForm] = useState({ fullname: '', phone: '', address: '', dob: '', gender: '' });
  const [deleteConfirm, setDeleteConfirm] = useState<Acct | null>(null);
  const [presenceMap, setPresenceMap] = useState<Map<string, string>>(new Map());

  const fetchUsers = async () => {
    const res = await supabase.rpc('admin_list_users', { p_scope: 'residents' });
    if (res.error) throw new Error(res.error.message);
    return (res.data ?? []) as Acct[];
  };

  const fetchPresence = async () => {
    const { data } = await supabase.from('presence').select('user_id, last_seen_at');
    const map = new Map<string, string>();
    for (const row of (data ?? []) as { user_id: string; last_seen_at: string }[]) {
      map.set(row.user_id, row.last_seen_at);
    }
    setPresenceMap(map);
  };

  useEffect(() => {
    void (async () => {
      try {
        const rows = await fetchUsers();
        setUsers(rows);
        if (rows.length > 0) setActiveId(rows[0].id);
        await fetchPresence();
      } catch (e) {
        setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to load accounts.' });
      } finally {
        setLoading(false);
      }
    })();
    const interval = window.setInterval(fetchPresence, 15_000);
    return () => window.clearInterval(interval);
  }, []);

  const active = users.find((u) => u.id === activeId) ?? null;

  const stats = useMemo(
    () => ({
      total: users.length,
      verified: users.filter((u) => u.email_confirmed_at).length,
      pending: users.filter((u) => !u.email_confirmed_at).length,
      suspended: users.filter((u) => u.suspended).length,
      onlineNow: users.filter((u) => isOnlineSince(presenceMap.get(u.id))).length,
    }),
    [users, presenceMap]
  );

  const visible = users.filter((u) => {
    const q = query.trim().toLowerCase();
    const matchesQuery =
      q === '' || u.fullname.toLowerCase().includes(q) || u.email.toLowerCase().includes(q);
    const matchesFilter =
      filter === 'All' ||
      (filter === 'Active' && !u.suspended && !!u.email_confirmed_at) ||
      (filter === 'Pending' && !u.email_confirmed_at) ||
      (filter === 'Suspended' && u.suspended);
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
      setForm({ email: '', password: '', fullname: '', role: 'user' });
      const rows = await fetchUsers();
      setUsers(rows);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to create account.' });
    } finally {
      setSaving(false);
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

  const openEdit = (u: Acct) => {
    setEditForm({
      fullname: u.fullname,
      phone: u.phone || '',
      address: u.address || '',
      dob: u.dob || '',
      gender: u.gender || '',
    });
    setEditOpen(true);
  };

  const saveEdit = async () => {
    if (!active) return;
    if (!editForm.fullname.trim()) {
      setToast({ type: 'error', message: 'Full name is required.' });
      return;
    }
    setSaving(true);
    try {
      const res = await supabase.rpc('admin_update_user', {
        p_user_id: active.id,
        p_fullname: editForm.fullname.trim(),
        p_phone: editForm.phone.trim() || null,
        p_address: editForm.address.trim() || null,
        p_dob: editForm.dob || null,
        p_gender: editForm.gender || null,
      });
      if (res.error) throw new Error(res.error.message);
      await logAudit('Update user', `Updated profile for ${editForm.fullname.trim()}.`);
      setToast({ type: 'success', message: 'User information updated successfully.' });
      setEditOpen(false);
      const rows = await fetchUsers();
      setUsers(rows);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to update user.' });
    } finally {
      setSaving(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteConfirm) return;
    setBusyId(deleteConfirm.id);
    try {
      const res = await supabase.rpc('admin_delete_user', { p_user_id: deleteConfirm.id });
      if (res.error) throw new Error(res.error.message);
      await logAudit('Delete user', `Deleted user ${deleteConfirm.fullname} (${deleteConfirm.email}).`);
      setToast({ type: 'success', message: `${deleteConfirm.fullname} has been deleted.` });
      setDeleteConfirm(null);
      setActiveId(null);
      const rows = await fetchUsers();
      setUsers(rows);
      if (rows.length > 0) setActiveId(rows[0].id);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to delete user.' });
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-5 gap-6">
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-border-subtle flex flex-col justify-between">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-3">Total User Accounts</div>
          <div className="font-display-lg text-display-lg text-on-surface">{stats.total}</div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-border-subtle flex flex-col justify-between">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-3">Verified</div>
          <div className="font-display-lg text-display-lg text-success-green">{stats.verified}</div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-border-subtle flex flex-col justify-between">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-3">Pending Verification</div>
          <div className="font-display-lg text-display-lg text-warning-amber">{stats.pending}</div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-border-subtle flex flex-col justify-between">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-3">Suspended Accounts</div>
          <div className="font-display-lg text-display-lg text-error-red">{stats.suspended}</div>
        </div>
        <div className="bg-surface-container-lowest p-6 rounded-xl border border-border-subtle flex flex-col justify-between">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-3">Online Now</div>
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-green opacity-75"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-success-green"></span>
            </span>
            <span className="font-display-lg text-display-lg text-success-green">{stats.onlineNow}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col xl:flex-row justify-between items-start xl:items-center gap-6">
        <div className="flex flex-1 w-full xl:w-auto gap-4 items-center bg-surface-container-lowest p-1.5 rounded-xl border border-border-subtle flex-wrap">
          {(['All', 'Active', 'Pending', 'Suspended'] as Filter[]).map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-1.5 font-label-md text-label-md rounded-lg transition-colors ${filter === f ? 'bg-surface-container text-on-surface shadow-sm font-medium' : 'text-on-surface-variant hover:bg-surface-container-low'}`}
            >
              {f === 'Active' ? 'Active Users' : f === 'Pending' ? 'Pending' : f === 'Suspended' ? 'Suspended' : 'All Accounts'}
            </button>
          ))}
          <div className="h-6 w-[1px] bg-border-subtle mx-2 hidden xl:block"></div>
          <div className="relative flex-1 max-w-xs hidden xl:block">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[18px]">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 bg-surface-bg border-none rounded-lg font-body-sm text-body-sm text-on-surface focus:ring-1 focus:ring-secondary placeholder:text-outline-variant"
              placeholder="Search accounts..."
              type="text"
            />
          </div>
        </div>
        <button
          type="button"
          onClick={() => setFormOpen(true)}
          className="bg-secondary hover:bg-secondary/90 text-on-secondary px-5 py-2 rounded-lg font-label-md text-label-md flex items-center gap-2 shadow-sm transition-colors whitespace-nowrap"
        >
          <span className="material-symbols-outlined text-[18px]">person_add</span>
          Register New Account
        </button>
      </div>

      <div className="flex flex-col lg:flex-row gap-6 min-h-[600px]">
        <div className="w-full lg:w-[65%] bg-surface-container-lowest rounded-xl border border-border-subtle flex flex-col overflow-hidden">
          <div className="px-6 py-3 border-b border-border-subtle bg-surface-bg/50">
            <h3 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-bold">Account Directory</h3>
          </div>
          <div className="flex-1 overflow-auto">
            {loading ? (
              <div className="p-10 text-center text-sm text-on-surface-variant">Loading accounts…</div>
            ) : visible.length === 0 ? (
              <div className="p-10 text-center text-sm text-on-surface-variant">No accounts match your filters.</div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="border-b border-border-subtle bg-surface-bg">
                    <th className="px-6 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-medium">Account Holder</th>
                    <th className="px-6 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-medium">Type/Role</th>
                    <th className="px-6 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-medium">Registered</th>
                    <th className="px-6 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-medium">Online</th>
                    <th className="px-6 py-3 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-medium">Status</th>
                  </tr>
                </thead>
                <tbody className="font-body-sm text-body-sm divide-y divide-border-subtle">
                  {visible.map((u) => (
                    <tr
                      key={u.id}
                      onClick={() => setActiveId(u.id)}
                      className={`hover:bg-surface-bg transition-colors cursor-pointer ${activeId === u.id ? 'bg-secondary/5' : ''} ${u.suspended ? 'opacity-75' : ''}`}
                    >
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold text-xs overflow-hidden">
                            {u.avatar_url ? (
                              <img src={u.avatar_url} alt="" className="w-full h-full object-cover" />
                            ) : (
                              initials(u.fullname)
                            )}
                          </div>
                          <div>
                            <div className="font-medium text-on-surface">{u.fullname}</div>
                            <div className="text-on-surface-variant text-xs">{u.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[u.role] ?? 'bg-surface-container-high text-on-surface-variant'}`}>
                          {ROLE_LABEL[u.role] ?? u.role}
                        </span>
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">{fmtDate(u.created_at, 'short')}</td>
                      <td className="px-6 py-4">
                        {isOnlineSince(presenceMap.get(u.id)) ? (
                          <span className="inline-flex items-center gap-1.5 text-success-green text-xs font-medium">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-green opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-success-green"></span>
                            </span>
                            Online
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-on-surface-variant text-xs">
                            <span className="w-2 h-2 rounded-full bg-outline/40"></span>
                            {timeAgo(presenceMap.get(u.id)) !== '—' ? timeAgo(presenceMap.get(u.id)) : 'Offline'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        {u.suspended ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-error-red/10 text-error-red border border-error-red/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-error-red"></span> Suspended
                          </span>
                        ) : u.email_confirmed_at ? (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-success-green/10 text-success-green border border-success-green/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-success-green"></span> Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium bg-warning-amber/10 text-warning-amber border border-warning-amber/20">
                            <span className="w-1.5 h-1.5 rounded-full bg-warning-amber"></span> Pending
                          </span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        <div className="w-full lg:w-[35%] bg-surface-container-lowest rounded-xl border border-border-subtle flex flex-col shadow-sm relative overflow-hidden">
          <div className="h-1.5 w-full bg-[#1E40AF]"></div>
          {active ? (
            <>
              <div className="p-6 border-b border-border-subtle flex-shrink-0">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <div className="w-14 h-14 rounded-full bg-secondary/10 flex items-center justify-center text-secondary font-headline-lg text-headline-lg border-2 border-secondary/20 overflow-hidden">
                      {active.avatar_url ? (
                        <img src={active.avatar_url} alt="" className="w-full h-full object-cover" />
                      ) : (
                        initials(active.fullname)
                      )}
                    </div>
                    <div>
                      <h3 className="font-headline-md text-headline-md text-on-surface leading-tight">{active.fullname}</h3>
                      <p className="font-body-sm text-body-sm text-secondary font-medium">{ROLE_LABEL[active.role] ?? active.role}</p>
                    </div>
                  </div>
                  {active.suspended ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-error-red/10 text-error-red uppercase tracking-wider">Suspended</span>
                  ) : (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-green/10 text-success-green uppercase tracking-wider">Active</span>
                  )}
                </div>
                <div className="grid grid-cols-2 gap-y-3 gap-x-4 mt-6">
                  <div>
                    <div className="font-caps-xs text-caps-xs text-outline mb-1 uppercase">Email</div>
                    <div className="font-body-sm text-body-sm text-on-surface font-medium break-all">{active.email}</div>
                  </div>
                  <div>
                    <div className="font-caps-xs text-caps-xs text-outline mb-1 uppercase">Registered</div>
                    <div className="font-body-sm text-body-sm text-on-surface font-medium">{fmtDate(active.created_at, 'short')}</div>
                  </div>
                </div>
              </div>
              <div className="flex-1 overflow-y-auto p-6 bg-surface-bg/30 space-y-5">
                <div>
                  <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-bold mb-3">Personal Information</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="font-caps-xs text-caps-xs text-outline mb-1 uppercase">Full Name</div>
                      <div className="font-body-sm text-body-sm text-on-surface font-medium">{active.fullname}</div>
                    </div>
                    <div>
                      <div className="font-caps-xs text-caps-xs text-outline mb-1 uppercase">Date of Birth</div>
                      <div className="font-body-sm text-body-sm text-on-surface font-medium">{active.dob ? fmtDate(active.dob, 'short') : '—'}</div>
                    </div>
                    <div>
                      <div className="font-caps-xs text-caps-xs text-outline mb-1 uppercase">Gender</div>
                      <div className="font-body-sm text-body-sm text-on-surface font-medium capitalize">{active.gender || '—'}</div>
                    </div>
                    <div>
                      <div className="font-caps-xs text-caps-xs text-outline mb-1 uppercase">Phone</div>
                      <div className="font-body-sm text-body-sm text-on-surface font-medium">{active.phone || '—'}</div>
                    </div>
                    <div>
                      <div className="font-caps-xs text-caps-xs text-outline mb-1 uppercase">Address</div>
                      <div className="font-body-sm text-body-sm text-on-surface font-medium">{active.address || '—'}</div>
                    </div>
                  </div>
                </div>
                {(active.emergency_contact_name || active.emergency_contact_phone) && (
                  <div>
                    <h4 className="font-caps-xs text-caps-xs text-error-red uppercase tracking-wider font-bold mb-3 flex items-center gap-1">
                      <span className="material-symbols-outlined text-[14px]">emergency</span>
                      Emergency Contact
                    </h4>
                    <div className="space-y-3">
                      <div>
                        <div className="font-caps-xs text-caps-xs text-outline mb-1 uppercase">Contact Name</div>
                        <div className="font-body-sm text-body-sm text-on-surface font-medium">{active.emergency_contact_name}</div>
                      </div>
                      <div>
                        <div className="font-caps-xs text-caps-xs text-outline mb-1 uppercase">Relationship</div>
                        <div className="font-body-sm text-body-sm text-on-surface font-medium capitalize">{active.emergency_contact_relationship || '—'}</div>
                      </div>
                      <div>
                        <div className="font-caps-xs text-caps-xs text-outline mb-1 uppercase">Emergency Phone</div>
                        <div className="font-body-sm text-body-sm text-on-surface font-medium">{active.emergency_contact_phone ? `+63 ${active.emergency_contact_phone}` : '—'}</div>
                      </div>
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-bold mb-3">Account Information</h4>
                  <div className="space-y-3">
                    <div>
                      <div className="font-caps-xs text-caps-xs text-outline mb-1 uppercase">Role</div>
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${ROLE_BADGE[active.role] ?? 'bg-surface-container-high text-on-surface-variant'}`}>
                        {ROLE_LABEL[active.role] ?? active.role}
                      </span>
                      <p className="text-[11px] text-on-surface-variant mt-1.5">Staff roles are managed by the Superadmin.</p>
                    </div>
                    <div>
                      <div className="font-caps-xs text-caps-xs text-outline mb-1 uppercase">Email Verification</div>
                      <div className="font-body-sm text-body-sm font-medium">
                        {active.email_confirmed_at ? (
                          <span className="inline-flex items-center gap-1.5 text-success-green">
                            <span className="material-symbols-outlined text-[16px]">check_circle</span>
                            Verified on {fmtDate(active.email_confirmed_at, 'short')}
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1.5 text-warning-amber">
                            <span className="material-symbols-outlined text-[16px]">pending</span>
                            Pending Verification
                          </span>
                        )}
                      </div>
                    </div>
                    <div>
                      <div className="font-caps-xs text-caps-xs text-outline mb-1 uppercase">Last Seen</div>
                      <div className="font-body-sm text-body-sm font-medium">
                        {isOnlineSince(presenceMap.get(active.id)) ? (
                          <span className="inline-flex items-center gap-1.5 text-success-green">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-success-green opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-success-green"></span>
                            </span>
                            Online Now
                          </span>
                        ) : (
                          <span className="text-on-surface-variant">
                            {timeAgo(presenceMap.get(active.id)) !== '—' ? timeAgo(presenceMap.get(active.id)) : 'No activity recorded'}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                <div>
                  <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider font-bold mb-3">Account Actions</h4>
                  <div className="space-y-2">
                    <button
                      type="button"
                      disabled={busyId === active.id}
                      onClick={() => openEdit(active)}
                      className="w-full py-2 px-4 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-bg transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">edit</span>
                      Edit User Information
                    </button>
                    <button
                      type="button"
                      disabled={busyId === active.id}
                      onClick={() => resetPw(active)}
                      className="w-full py-2 px-4 rounded-lg border border-outline-variant text-on-surface font-label-md text-label-md hover:bg-surface-bg transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">lock_reset</span>
                      Trigger Password Reset
                    </button>
                    <button
                      type="button"
                      disabled={busyId === active.id}
                      onClick={() => toggleSuspend(active)}
                      className={`w-full py-2 px-4 rounded-lg border font-label-md text-label-md transition-colors flex justify-center items-center gap-2 disabled:opacity-50 ${active.suspended ? 'border-success-green/30 text-success-green hover:bg-success-green/5' : 'border-error-red/30 text-error-red hover:bg-error-red/5'}`}
                    >
                      <span className="material-symbols-outlined text-[18px]">{active.suspended ? 'check_circle' : 'block'}</span>
                      {active.suspended ? 'Re-activate Account' : 'Suspend Account Access'}
                    </button>
                    <button
                      type="button"
                      disabled={busyId === active.id}
                      onClick={() => setDeleteConfirm(active)}
                      className="w-full py-2 px-4 rounded-lg border border-error-red/30 text-error-red font-label-md text-label-md hover:bg-error-red/5 transition-colors flex justify-center items-center gap-2 disabled:opacity-50"
                    >
                      <span className="material-symbols-outlined text-[18px]">delete</span>
                      Delete Account
                    </button>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center text-sm text-on-surface-variant">Select an account to manage.</div>
          )}
        </div>
      </div>

      {formOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
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
                <select disabled className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface opacity-60">
                  <option value="user">User Account</option>
                </select>
                <p className="text-[11px] text-on-surface-variant mt-1">New accounts are created as resident users.</p>
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
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl">
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

      {editOpen && active && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center sticky top-0 bg-surface-container-lowest z-10">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Edit User Information</h3>
              <button type="button" onClick={() => setEditOpen(false)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Full Name *</label>
                <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={editForm.fullname} onChange={(e) => setEditForm({ ...editForm, fullname: e.target.value })} placeholder="Full name" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Phone</label>
                <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={editForm.phone} onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })} placeholder="Phone number" />
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Address</label>
                <textarea className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary resize-none" rows={2} value={editForm.address} onChange={(e) => setEditForm({ ...editForm, address: e.target.value })} placeholder="Address" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Date of Birth</label>
                  <input type="date" className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={editForm.dob} onChange={(e) => setEditForm({ ...editForm, dob: e.target.value })} />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Gender</label>
                  <select className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={editForm.gender} onChange={(e) => setEditForm({ ...editForm, gender: e.target.value })}>
                    <option value="">Select Gender</option>
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Other</option>
                  </select>
                </div>
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setEditOpen(false)} className="flex-1 bg-surface-container-low border border-border-subtle text-on-surface rounded-lg py-2 text-label-md font-medium hover:bg-surface-bg transition-colors">
                  Cancel
                </button>
                <button type="button" disabled={saving} onClick={saveEdit} className="flex-1 bg-secondary hover:bg-secondary/90 text-on-secondary rounded-lg py-2 text-label-md font-medium disabled:opacity-50 transition-colors">
                  {saving ? 'Saving…' : 'Save Changes'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md font-bold text-error-red">Delete Account</h3>
              <button type="button" onClick={() => setDeleteConfirm(null)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close"><span className="material-symbols-outlined">close</span></button>
            </div>
            <div className="p-5">
              <div className="flex items-start gap-3 mb-4">
                <span className="material-symbols-outlined text-error-red text-3xl">warning</span>
                <div className="flex-1">
                  <p className="text-sm text-on-surface mb-2">Are you sure you want to delete this account?</p>
                  <div className="bg-surface-container-low border border-border-subtle rounded-lg p-3">
                    <p className="font-semibold text-on-surface">{deleteConfirm.fullname}</p>
                    <p className="text-xs text-on-surface-variant">{deleteConfirm.email}</p>
                  </div>
                  <p className="text-xs text-error-red mt-3 font-medium">⚠️ This action cannot be undone. All user data will be permanently deleted.</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button type="button" onClick={() => setDeleteConfirm(null)} className="flex-1 bg-surface-container-low border border-border-subtle text-on-surface rounded-lg py-2 text-label-md font-medium hover:bg-surface-bg transition-colors">
                  Cancel
                </button>
                <button type="button" disabled={busyId === deleteConfirm.id} onClick={confirmDelete} className="flex-1 bg-error-red hover:bg-error-red/90 text-on-error rounded-lg py-2 text-label-md font-medium disabled:opacity-50 transition-colors">
                  {busyId === deleteConfirm.id ? 'Deleting…' : 'Delete Account'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
