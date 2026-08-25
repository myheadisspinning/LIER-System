import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { fmtDate, isOnlineSince, logAudit, markInquiriesRead } from '../../../lib/admin';
import Toast from '../../../components/Toast';
import IncidentDetailModal from '../../../components/IncidentDetailModal';

type Inquiry = {
  id: string;
  sender_name: string;
  sender_email: string | null;
  sender_phone: string | null;
  subject: string;
  message: string;
  status: string;
  created_by: string | null;
  incident_id: string | null;
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

type ResidentProfile = { id: string; fullname: string | null; phone: string | null; avatar_url: string | null };

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

const timeAgo = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return 'Just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
};

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
};

const CANNED_RESPONSES = [
  'Good day! We have received your concern and our team is looking into it now.',
  'Could you share more details (time, place, people involved) so we can assist faster?',
  'Thank you for your patience. We will update you as soon as possible.',
  'This matter has been resolved. Reply here anytime if you need further help.',
];

type TimelineItem =
  | { kind: 'day'; label: string; key: string }
  | { kind: 'inquiry'; key: string }
  | { kind: 'msg'; m: Msg; showMeta: boolean; key: string };

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
  const [detailReportId, setDetailReportId] = useState<string | null>(null);

  const lastByInquiry = useMemo(() => {
    const map: Record<string, string> = {};
    for (const m of messages) {
      map[m.inquiry_id] = m.message;
    }
    return map;
  }, [messages]);

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
    const res = await supabase.from('public_users').select('id, fullname, phone, avatar_url').in('id', ids);
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

  const buildTimeline = (): TimelineItem[] => {
    if (!active) return [];
    const items: TimelineItem[] = [];
    let lastDay = '';
    let prevRole = '';
    const pushDay = (iso: string) => {
      const label = dayLabel(iso);
      if (label !== lastDay) {
        items.push({ kind: 'day', label, key: `day-${label}` });
        lastDay = label;
      }
    };
    pushDay(active.created_at);
    items.push({ kind: 'inquiry', key: 'inquiry' });
    for (const m of thread) {
      pushDay(m.created_at);
      items.push({ kind: 'msg', m, showMeta: m.sender_role !== prevRole, key: m.id });
      prevRole = m.sender_role;
    }
    return items;
  };

  const timeline = active ? buildTimeline() : [];

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
      const staffName = ((typeof meta?.fullname === 'string' && meta.fullname) ||
        (typeof meta?.full_name === 'string' && meta.full_name) ||
        (typeof meta?.name === 'string' && meta.name) ||
        session?.user?.email) ?? 'Barangay Staff';
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
      <section className={`xl:w-[320px] w-full bg-white border border-border-subtle rounded-xl flex flex-col overflow-hidden shrink-0 ${active ? 'hidden xl:flex' : 'flex'}`}>
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
                <div className="flex gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm shrink-0 overflow-hidden ${
                    i.status === 'Open' ? 'bg-error-red' : i.status === 'In Progress' ? 'bg-warning-amber' : 'bg-slate-400'
                  }`}>
                    {i.created_by && profiles[i.created_by]?.avatar_url ? (
                      <img src={profiles[i.created_by].avatar_url} alt="" className="w-full h-full object-cover" />
                    ) : (
                      residentName(i).slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex justify-between items-start mb-1">
                      <span className="font-label-md text-label-md font-bold text-on-surface flex items-center gap-1 truncate">
                        {residentName(i)}
                        {i.status === 'Open' && <span className="w-2 h-2 rounded-full bg-error-red"></span>}
                        {isResidentOnline(i) && (
                          <span className="w-2 h-2 rounded-full bg-success-green animate-pulse" title="Resident online now"></span>
                        )}
                      </span>
                      <span className="font-label-sm text-label-sm text-outline shrink-0 ml-2">{timeAgo(i.created_at)}</span>
                    </div>
                    <p className="font-body-sm text-body-sm text-on-surface font-medium truncate mb-1">{i.subject}</p>
                    <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{lastByInquiry[i.id] ?? i.message}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      <section className={`flex-1 bg-white border border-border-subtle rounded-xl flex flex-col overflow-hidden shadow-sm ${active ? 'flex' : 'hidden xl:flex'}`}>
        {active ? (
          <>
            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface/50">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setActiveId(null)}
                  className="xl:hidden -ml-1 p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors shrink-0"
                  aria-label="Back to inbox"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
                <div className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold text-sm overflow-hidden ${
                  active.status === 'Open' ? 'bg-error-red' : active.status === 'In Progress' ? 'bg-warning-amber' : 'bg-slate-400'
                }`}>
                  {active.created_by && profiles[active.created_by]?.avatar_url ? (
                    <img src={profiles[active.created_by].avatar_url} alt="" className="w-full h-full object-cover" />
                  ) : (
                    residentName(active).slice(0, 2).toUpperCase()
                  )}
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
                  </div>
                  <p className="font-body-sm text-body-sm text-on-surface-variant">{active.subject}</p>
                </div>
              </div>
              {active.incident_id && (
                <button
                  type="button"
                  onClick={() => setDetailReportId(active.incident_id)}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-secondary/10 text-secondary border border-secondary/25 rounded-lg text-label-md font-medium hover:bg-secondary/20 transition-colors"
                >
                  <span className="material-symbols-outlined text-[18px]">description</span>
                  View case details
                </button>
              )}
            </div>
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4 bg-surface-bg/50">
              {timeline.map((item) => {
                if (item.kind === 'day') {
                  return (
                    <div key={item.key} className="flex justify-center">
                      <span className="px-3 py-1 bg-surface-dim text-on-surface-variant rounded-full font-caps-xs text-[10px] uppercase tracking-wider">
                        {item.label}
                      </span>
                    </div>
                  );
                }
                if (item.kind === 'inquiry') {
                  return (
                    <div key={item.key} className="flex justify-start">
                      <div className="max-w-[75%] bg-surface border border-border-subtle rounded-xl rounded-tl-none p-3 shadow-sm">
                        <p className="font-body-md text-body-md text-on-surface font-semibold mb-1">{active.subject}</p>
                        <p className="font-body-md text-body-md text-on-surface">{active.message}</p>
                        <div className="text-right mt-1">
                          <span className="font-label-sm text-label-sm text-outline">{timeShort(active.created_at)}</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                const m = item.m;
                if (m.sender_role === 'staff') {
                  return (
                    <div key={item.key} className="flex justify-end">
                      <div className="max-w-[75%] bg-secondary-fixed border border-secondary-fixed-dim rounded-xl rounded-tr-none p-3 shadow-sm">
                        {item.showMeta && (
                          <p className="font-label-sm text-label-sm text-on-secondary-fixed-variant mb-0.5">Desk Officer</p>
                        )}
                        <p className="font-body-md text-body-md text-on-secondary-fixed">{m.message}</p>
                        <div className="text-right mt-1 flex items-center justify-end gap-1">
                          <span className="font-label-sm text-label-sm text-on-secondary-fixed-variant">{timeShort(m.created_at)}</span>
                          <span className="material-symbols-outlined text-[14px] text-secondary">done_all</span>
                        </div>
                      </div>
                    </div>
                  );
                }
                return (
                  <div key={item.key} className="flex justify-start">
                    <div className="max-w-[75%] bg-surface border border-border-subtle rounded-xl rounded-tl-none p-3 shadow-sm">
                      <p className="font-body-md text-body-md text-on-surface">{m.message}</p>
                      <div className="text-right mt-1">
                        <span className="font-label-sm text-label-sm text-outline">{timeShort(m.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
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
                <div className="flex gap-2 mb-3 overflow-x-auto pb-1">
                  {CANNED_RESPONSES.map((c, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setReply(c)}
                      className="shrink-0 px-3 py-1.5 bg-surface-container border border-border-subtle rounded-full font-body-sm text-body-sm text-on-surface hover:border-secondary hover:text-secondary transition-colors"
                    >
                      {c.length > 40 ? `${c.slice(0, 40)}…` : c}
                    </button>
                  ))}
                </div>
                <div className="flex items-end gap-2 bg-surface-container rounded-full border border-border-subtle px-3 py-2 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all shadow-sm">
                  <textarea
                    className="w-full bg-transparent border-none outline-none resize-none py-1 font-body-sm text-body-sm focus:ring-0 text-on-surface max-h-32 overflow-y-auto placeholder:text-outline"
                    placeholder="Type a response..."
                    rows={1}
                    style={{ minHeight: 28 }}
                    value={reply}
                    onChange={(e) => setReply(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault();
                        void sendReply();
                      }
                    }}
                  ></textarea>
                  <button
                    type="button"
                    disabled={sending || !reply.trim()}
                    onClick={() => void sendReply()}
                    className="bg-secondary text-white rounded-full hover:bg-on-secondary-fixed-variant transition-colors shrink-0 flex items-center justify-center h-9 w-9 shadow-sm disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined text-[18px]">{sending ? 'hourglass_top' : 'send'}</span>
                  </button>
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-on-surface-variant text-sm">Select an inquiry to view the thread.</div>
        )}
      </section>

      <section className="xl:w-[300px] w-full bg-white border border-border-subtle rounded-xl flex flex-col overflow-hidden shrink-0 shadow-sm hidden xl:flex">
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

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      {detailReportId && (
        <IncidentDetailModal
          reportId={detailReportId}
          onClose={() => setDetailReportId(null)}
        />
      )}
    </div>
  );
}
