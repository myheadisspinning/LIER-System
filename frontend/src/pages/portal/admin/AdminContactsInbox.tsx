import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { fmtDate, isOnlineSince, logAudit, markInquiriesRead } from '../../../lib/admin';

type Inquiry = {
  id: string;
  sender_name: string;
  sender_email: string | null;
  sender_phone: string | null;
  subject: string;
  message: string;
  status: string;
  created_by: string | null;
  created_at: string;
};

type Msg = {
  id: string;
  inquiry_id: string;
  sender_role: string;
  sender_name: string;
  message: string;
  created_at: string;
};

type ResidentProfile = { id: string; fullname: string | null; phone: string | null };

const STATUS_BADGE: Record<string, string> = {
  Open: 'bg-error-red/10 text-error-red',
  'In Progress': 'bg-warning-amber/10 text-warning-amber',
  Resolved: 'bg-success-green/10 text-success-green',
  Closed: 'bg-slate-100 text-slate-500',
};

const FILTERS = [
  { key: 'active', label: 'Active' },
  { key: 'archived', label: 'Archived' },
  { key: 'all', label: 'All' },
] as const;
type FilterKey = (typeof FILTERS)[number]['key'];

const isArchivedStatus = (s: string) => s === 'Resolved' || s === 'Closed';

const timeShort = (iso: string) => new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function AdminContactsInbox() {
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<FilterKey>('active');
  const [loading, setLoading] = useState(true);
  const [reply, setReply] = useState('');
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [profiles, setProfiles] = useState<Record<string, ResidentProfile>>({});
  const [onlineIds, setOnlineIds] = useState<Set<string>>(new Set());

  const fetchInquiries = async () => {
    const res = await supabase.from('inquiries').select('*').order('created_at', { ascending: false }).limit(100);
    return (res.data ?? []) as Inquiry[];
  };

  const fetchMessages = async () => {
    const res = await supabase.from('inquiry_messages').select('*').order('created_at', { ascending: true });
    return (res.data ?? []) as Msg[];
  };

  const fetchProfiles = async (inqs: Inquiry[]) => {
    const ids = [...new Set(inqs.map((i) => i.created_by).filter((x): x is string => !!x))];
    if (ids.length === 0) {
      setProfiles({});
      return;
    }
    const res = await supabase.from('public_users').select('id, fullname, phone').in('id', ids);
    const map: Record<string, ResidentProfile> = {};
    for (const p of (res.data ?? []) as ResidentProfile[]) map[p.id] = p;
    setProfiles(map);
  };

  const fetchPresence = async (inqs: Inquiry[]) => {
    const ids = [...new Set(inqs.map((i) => i.created_by).filter((x): x is string => !!x))];
    if (ids.length === 0) {
      setOnlineIds(new Set());
      return;
    }
    const res = await supabase
      .from('presence')
      .select('user_id, last_seen_at')
      .in('user_id', ids);
    const online = new Set<string>();
    for (const p of (res.data ?? []) as { user_id: string; last_seen_at: string }[]) {
      if (isOnlineSince(p.last_seen_at)) online.add(p.user_id);
    }
    setOnlineIds(online);
  };

  useEffect(() => {
    void (async () => {
      const inqs = await fetchInquiries();
      setInquiries(inqs);
      const msgs = await fetchMessages();
      setMessages(msgs);
      await Promise.all([fetchProfiles(inqs), fetchPresence(inqs)]);
      setActiveId((prev) => prev ?? inqs[0]?.id ?? null);
      setLoading(false);
      void markInquiriesRead();
    })();
    const timer = window.setInterval(() => {
      void (async () => {
        const inqs = await fetchInquiries();
        setInquiries(inqs);
        const msgs = await fetchMessages();
        setMessages(msgs);
        await Promise.all([fetchProfiles(inqs), fetchPresence(inqs)]);
      })();
    }, 5_000);
    return () => window.clearInterval(timer);
  }, []);

  const active = inquiries.find((i) => i.id === activeId) ?? null;
  const isArchived = !!active && isArchivedStatus(active.status);
  const thread = useMemo(() => messages.filter((m) => m.inquiry_id === activeId), [messages, activeId]);

  const countByStatus = (predicate: (s: string) => boolean) => inquiries.filter((i) => predicate(i.status)).length;
  const tabCounts: Record<FilterKey, number> = {
    active: countByStatus((s) => s === 'Open' || s === 'In Progress'),
    archived: countByStatus(isArchivedStatus),
    all: inquiries.length,
  };

  const residentName = (i: Inquiry) => (i.created_by ? profiles[i.created_by]?.fullname || i.sender_name : i.sender_name);
  const residentPhone = (i: Inquiry) => {
    if (i.created_by) {
      const p = profiles[i.created_by];
      return p?.phone || i.sender_phone || i.sender_email || '—';
    }
    return i.sender_phone || i.sender_email || '—';
  };
  const isResidentOnline = (i: Inquiry) => !!i.created_by && onlineIds.has(i.created_by);

  const visible = inquiries.filter((i) => {
    const inFilter =
      filter === 'all' ? true : filter === 'archived' ? isArchivedStatus(i.status) : i.status === 'Open' || i.status === 'In Progress';
    if (!inFilter) return false;
    const q = query.trim().toLowerCase();
    return q === '' || i.sender_name.toLowerCase().includes(q) || i.subject.toLowerCase().includes(q) || i.message.toLowerCase().includes(q);
  });

  const setStatus = async (status: string) => {
    if (!active) return;
    const { error } = await supabase.from('inquiries').update({ status }).eq('id', active.id);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      await logAudit('Update inquiry', `Marked "${active.subject}" as ${status}.`);
      const inqs = await fetchInquiries();
      setInquiries(inqs);
      await Promise.all([fetchProfiles(inqs), fetchPresence(inqs)]);
    }
  };

  const reopenInquiry = async () => {
    if (!active) return;
    setSending(true);
    try {
      const { error } = await supabase.from('inquiries').update({ status: 'In Progress' }).eq('id', active.id);
      if (error) throw new Error(error.message);
      await logAudit('Reopen inquiry', `Reopened archived conversation "${active.subject}".`);
      setToast({ type: 'success', message: 'Inquiry reopened from the archive.' });
      const inqs = await fetchInquiries();
      setInquiries(inqs);
      await Promise.all([fetchProfiles(inqs), fetchPresence(inqs)]);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to reopen inquiry.' });
    } finally {
      setSending(false);
    }
  };

  const sendReply = async () => {
    if (!active || !reply.trim()) return;
    setSending(true);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const meta = session?.user?.user_metadata as Record<string, unknown> | undefined;
      const staffName = (typeof meta?.fullname === 'string' && meta.fullname) ||
        (typeof meta?.full_name === 'string' && meta.full_name) ||
        (typeof meta?.name === 'string' && meta.name) ||
        session?.user?.email ?? 'Barangay Staff';
      const { error } = await supabase.from('inquiry_messages').insert({
        inquiry_id: active.id,
        sender_role: 'staff',
        sender_name: staffName,
        message: reply.trim(),
      });
      if (error) throw new Error(error.message);
      if (active.status === 'Open') await supabase.from('inquiries').update({ status: 'In Progress' }).eq('id', active.id);
      await logAudit('Reply inquiry', `Replied to "${active.subject}".`);
      setReply('');
      setToast({ type: 'success', message: 'Reply sent to resident.' });
      const inqs = await fetchInquiries();
      setInquiries(inqs);
      const msgs = await fetchMessages();
      setMessages(msgs);
      await Promise.all([fetchProfiles(inqs), fetchPresence(inqs)]);
      void markInquiriesRead();
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to send reply.' });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex flex-col xl:flex-row gap-6 h-[72vh] min-h-[520px]">
      <section className="xl:w-[320px] w-full bg-white border border-border-subtle rounded-xl flex flex-col overflow-hidden shrink-0">
        <div className="p-4 border-b border-border-subtle bg-surface/50">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase mb-3">Message Threads</div>
          <div className="flex space-x-1 bg-surface-container rounded-lg p-1 mb-3">
            {FILTERS.map((f) => (
              <button
                key={f.key}
                type="button"
                onClick={() => setFilter(f.key)}
                className={`flex-1 px-2 py-1.5 rounded font-label-md text-label-md transition-colors flex items-center justify-center gap-1 ${
                  filter === f.key ? 'bg-white shadow-sm text-secondary' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {f.label}
                <span className={`font-caps-xs text-[9px] px-1.5 py-0.5 rounded-full ${filter === f.key ? 'bg-secondary/10 text-secondary' : 'bg-surface-dim text-on-surface-variant'}`}>
                  {tabCounts[f.key]}
                </span>
              </button>
            ))}
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline text-[20px]">search</span>
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="w-full bg-[#f1f5f9] border-none rounded py-2 pl-10 pr-3 text-body-sm focus:ring-1 focus:ring-secondary outline-none placeholder:text-outline"
              placeholder="Search residents..."
              type="text"
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-sm text-on-surface-variant">Loading inquiries…</div>
          ) : visible.length === 0 ? (
            <div className="p-6 text-center text-sm text-on-surface-variant">No inquiries yet.</div>
          ) : (
            visible.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setActiveId(i.id)}
                className={`w-full text-left p-4 border-b border-border-subtle cursor-pointer transition-colors ${
                  activeId === i.id ? 'bg-surface-variant/30 border-l-4 border-secondary' : 'hover:bg-surface-bg'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <div className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-1">
                    {residentName(i)}
                    {i.status === 'Open' && <span className="w-2 h-2 rounded-full bg-error-red"></span>}
                    {isResidentOnline(i) && (
                      <span className="w-2 h-2 rounded-full bg-success-green animate-pulse" title="Resident online now"></span>
                    )}
                  </div>
                  <span className="font-label-sm text-label-sm text-outline">{timeShort(i.created_at)}</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface-variant truncate mb-2">{i.subject} — {i.message}</p>
                <div className="flex gap-2">
                  <span className="px-2 py-0.5 bg-surface-dim text-on-surface-variant rounded font-caps-xs text-caps-xs">INQUIRY</span>
                  {i.status === 'Open' && <span className="px-2 py-0.5 bg-error-container text-on-error-container rounded font-caps-xs text-caps-xs">UNREAD</span>}
                  {isArchivedStatus(i.status) && (
                    <span className="px-2 py-0.5 bg-slate-100 text-slate-500 rounded font-caps-xs text-caps-xs">ARCHIVED</span>
                  )}
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className="flex-1 bg-white border border-border-subtle rounded-xl flex flex-col overflow-hidden shadow-sm">
        {active ? (
          <>
            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface/50">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-headline-md text-headline-md">
                  {residentName(active).slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <h2 className="font-headline-md text-headline-md text-on-surface">{residentName(active)}</h2>
                    {isResidentOnline(active) && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-success-green/10 text-success-green flex items-center gap-1">
                        <span className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse"></span>ONLINE
                      </span>
                    )}
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_BADGE[active.status] ?? 'bg-slate-100 text-slate-500'}`}>{active.status}</span>
                    {isArchived && (
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">ARCHIVED</span>
                    )}
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{active.subject}</p>
                </div>
              </div>
              <div className="flex gap-2">
                <select
                  value={active.status}
                  disabled={isArchived}
                  onChange={(e) => setStatus(e.target.value)}
                  className="bg-white border border-border-subtle rounded-md px-2 py-1.5 text-xs text-on-surface focus:outline-none focus:border-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {['Open', 'In Progress', 'Resolved', 'Closed'].map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-surface-bg/50">
              <div className="flex justify-center">
                <span className="px-3 py-1 bg-surface-dim text-on-surface-variant rounded-full font-caps-xs text-caps-xs uppercase tracking-wider">
                  Opened {timeShort(active.created_at)}
                </span>
              </div>
              <div className="flex justify-start">
                <div className="max-w-[75%] bg-surface border border-border-subtle rounded-xl rounded-tl-none p-3 shadow-sm">
                  <p className="font-body-md text-body-md text-on-surface font-semibold mb-1">{active.subject}</p>
                  <p className="font-body-md text-body-md text-on-surface">{active.message}</p>
                  <div className="text-right mt-1">
                    <span className="font-label-sm text-label-sm text-outline">{timeShort(active.created_at)}</span>
                  </div>
                </div>
              </div>
              {thread.map((m) =>
                m.sender_role === 'staff' ? (
                  <div key={m.id} className="flex justify-end">
                    <div className="max-w-[75%] bg-secondary-fixed border border-secondary-fixed-dim rounded-xl rounded-tr-none p-3 shadow-sm">
                      <p className="font-label-sm text-label-sm text-on-secondary-fixed-variant mb-0.5">{m.sender_name} · Staff</p>
                      <p className="font-body-md text-body-md text-on-secondary-fixed">{m.message}</p>
                      <div className="text-right mt-1 flex items-center justify-end gap-1">
                        <span className="font-label-sm text-label-sm text-on-secondary-fixed-variant">{timeShort(m.created_at)}</span>
                        <span className="material-symbols-outlined text-[14px] text-secondary">done_all</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex justify-start">
                    <div className="max-w-[75%] bg-surface border border-border-subtle rounded-xl rounded-tl-none p-3 shadow-sm">
                      <p className="font-body-md text-body-md text-on-surface">{m.message}</p>
                      <div className="text-right mt-1">
                        <span className="font-label-sm text-label-sm text-outline">{timeShort(m.created_at)}</span>
                      </div>
                    </div>
                  </div>
                )
              )}
            </div>
            {isArchived ? (
              <div className="p-4 border-t border-border-subtle bg-slate-50">
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 text-sm text-slate-500">
                    <span className="material-symbols-outlined text-[18px]">archive</span>
                    <span>This conversation is archived. Re-open it to send replies.</span>
                  </div>
                  <button
                    type="button"
                    disabled={sending}
                    onClick={() => void reopenInquiry()}
                    className="flex items-center gap-2 bg-secondary text-white px-4 py-2 rounded-lg font-label-md text-label-md font-semibold hover:bg-secondary/90 transition-colors disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">unarchive</span>
                    {sending ? 'Reopening…' : 'Reopen Inquiry'}
                  </button>
                </div>
              </div>
            ) : (
              <div className="p-4 border-t border-border-subtle bg-white">
                <div className="flex items-end gap-2">
                  <div className="flex-1">
                    <textarea
                      className="w-full bg-[#f1f5f9] border border-transparent rounded-lg py-3 px-4 text-body-md focus:border-secondary focus:ring-0 outline-none resize-none"
                      placeholder="Type a response..."
                      rows={2}
                      value={reply}
                      onChange={(e) => setReply(e.target.value)}
                    ></textarea>
                  </div>
                  <button
                    type="button"
                    disabled={sending || !reply.trim()}
                    onClick={sendReply}
                    className="bg-secondary text-on-secondary h-12 px-6 rounded-lg font-label-md text-label-md font-semibold hover:bg-secondary/90 transition-colors flex items-center justify-center shadow-md disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">{sending ? 'hourglass_top' : 'send'}</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">Select an inquiry to view the thread.</div>
        )}
      </section>

      <section className="xl:w-[300px] w-full bg-white border border-border-subtle rounded-xl flex flex-col overflow-hidden shrink-0 shadow-sm">
        <div className="p-4 border-b border-border-subtle bg-surface/50">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase">Context &amp; Actions</div>
        </div>
        {active ? (
          <div className="p-4 overflow-y-auto">
            <div className="bg-surface-bg border border-border-subtle rounded p-4 mb-6">
              <div className="font-caps-xs text-caps-xs text-outline font-bold uppercase mb-2">Inquiry Details</div>
              <div className="flex flex-col gap-2">
                <div className="flex justify-between items-center gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Contact:</span>
                  <span className="font-label-md text-label-md text-on-surface font-medium text-right">{residentPhone(active)}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Status:</span>
                  <span className={`px-2 py-0.5 rounded font-caps-xs text-caps-xs ${STATUS_BADGE[active.status] ?? 'bg-slate-100 text-slate-500'}`}>{active.status}</span>
                </div>
                <div className="flex justify-between items-center gap-2">
                  <span className="font-label-sm text-label-sm text-on-surface-variant">Submitted:</span>
                  <span className="font-label-md text-label-md text-on-surface font-medium">{fmtDate(active.created_at, 'short')}</span>
                </div>
              </div>
            </div>
            <div className="mb-6">
              <div className="font-caps-xs text-caps-xs text-outline font-bold uppercase mb-3">Thread Stats</div>
              <div className="flex items-start gap-2 mb-2">
                <span className="material-symbols-outlined text-[16px] text-outline mt-0.5">forum</span>
                <div>
                  <div className="font-label-md text-label-md text-on-surface">{thread.length} messages</div>
                  <div className="font-label-sm text-label-sm text-outline">
                    {thread.filter((m) => m.sender_role === 'staff').length} staff · {thread.filter((m) => m.sender_role === 'resident').length} resident
                  </div>
                </div>
              </div>
            </div>
            <div className="flex flex-col gap-3">
              {isArchived ? (
                <button
                  type="button"
                  disabled={sending}
                  onClick={() => void reopenInquiry()}
                  className="w-full bg-secondary text-white py-2 px-4 rounded font-label-md text-label-md font-semibold hover:bg-secondary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">unarchive</span>
                  {sending ? 'Reopening…' : 'Reopen Inquiry'}
                </button>
              ) : (
                <>
                  <button
                    type="button"
                    disabled={active.status === 'Resolved' || active.status === 'Closed'}
                    onClick={() => setStatus('Resolved')}
                    className="w-full bg-success-green text-white py-2 px-4 rounded font-label-md text-label-md font-semibold hover:bg-success-green/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">check</span>
                    Mark as Resolved
                  </button>
                  <button
                    type="button"
                    disabled={active.status === 'Closed'}
                    onClick={() => setStatus('Closed')}
                    className="w-full bg-surface-dim text-on-surface py-2 px-4 rounded font-label-md text-label-md font-medium hover:bg-outline-variant transition-colors flex items-center justify-center gap-2 border border-border-subtle disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">lock</span>
                    Close Inquiry
                  </button>
                </>
              )}
            </div>
          </div>
        ) : (
          <div className="p-6 text-sm text-on-surface-variant">No active inquiry selected.</div>
        )}
      </section>

      {toast && <div className="fixed bottom-8 right-8 bg-surface-container-high text-on-surface px-4 py-3 rounded-lg shadow-lg text-sm z-[150]">{toast.message}</div>}
    </div>
  );
}
