import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { getAdminProfile, fetchStaffPresence, isOnlineSince, markInquiriesRead, type PresenceRow } from '../../../lib/admin';
import Toast from '../../../components/Toast';

type Inquiry = {
  id: string;
  sender_name: string;
  subject: string;
  message: string;
  status: string;
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

type Incident = {
  id: string;
  report_no: string | null;
  title: string;
  category: string;
};

const timeShort = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

const dayLabel = (iso: string) => {
  const d = new Date(iso);
  const today = new Date();
  const yest = new Date();
  yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-PH', { month: 'long', day: 'numeric', year: 'numeric' });
};

const caseIcon = (category: string) => {
  const c = category.toLowerCase();
  if (c.includes('fire')) return 'local_fire_department';
  if (c.includes('medic')) return 'medical_services';
  if (c.includes('crime') || c.includes('theft')) return 'local_police';
  return 'fact_check';
};

type TimelineItem =
  | { kind: 'day'; label: string; key: string }
  | { kind: 'inquiry'; key: string }
  | { kind: 'msg'; m: Msg; showMeta: boolean; key: string };

export default function CaseChat() {
  const [profile, setProfile] = useState<{ id: string; fullname: string; role: string | null } | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [viewingPastId, setViewingPastId] = useState<string | null>(null);
  const [adminPresence, setAdminPresence] = useState<PresenceRow[]>([]);
  const [draft, setDraft] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [pastChatsOpen, setPastChatsOpen] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [sending, setSending] = useState(false);
  const [startingChat, setStartingChat] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const endRef = useRef<HTMLDivElement | null>(null);

  const openThread = inquiries.find((i) => i.status === 'Open' || i.status === 'In Progress') ?? null;
  const archivedThreads = inquiries.filter((i) => i.status === 'Resolved' || i.status === 'Closed');
  const currentId = viewingPastId ?? openThread?.id ?? null;
  const active = inquiries.find((i) => i.id === currentId) ?? null;
  const isClosed = !!active && (active.status === 'Resolved' || active.status === 'Closed');
  const isViewingPast = !!viewingPastId;

  const onlineStaff = adminPresence.filter((p) => isOnlineSince(p.last_seen_at));
  const onlineStaffCount = onlineStaff.length;

  const caseLabel = (i: Incident) => `Case ${i.report_no ?? i.id.slice(0, 8).toUpperCase()}`;
  const firstName = profile?.fullname.split(' ')[0] ?? 'there';

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, currentId]);

  useEffect(() => {
    void (async () => {
      const p = await getAdminProfile();
      setProfile(p);
      const incRes = await supabase
        .from('incident_reports')
        .select('id, report_no, title, category')
        .eq('user_id', p.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setIncidents((incRes.data ?? []) as Incident[]);
      const res = await supabase
        .from('inquiries')
        .select('id, sender_name, subject, message, status, incident_id, created_at')
        .eq('created_by', p.id)
        .order('created_at', { ascending: false })
        .limit(100);
      setInquiries((res.data ?? []) as Inquiry[]);
      setLoading(false);
      void markInquiriesRead();
    })();
  }, []);

  useEffect(() => {
    if (!currentId) return;
    void (async () => {
      const res = await supabase
        .from('inquiry_messages')
        .select('id, inquiry_id, sender_role, sender_name, message, created_at')
        .eq('inquiry_id', currentId)
        .order('created_at', { ascending: true });
      setMessages((res.data ?? []) as Msg[]);
    })();
  }, [currentId]);

  useEffect(() => {
    void (async () => {
      const rows = await fetchStaffPresence();
      setAdminPresence(rows);
    })();
    const presenceTimer = window.setInterval(() => {
      void (async () => {
        const rows = await fetchStaffPresence();
        setAdminPresence(rows);
      })();
    }, 10_000);
    const pollTimer = window.setInterval(() => {
      void (async () => {
        const res = await supabase
          .from('inquiries')
          .select('id, sender_name, subject, message, status, incident_id, created_at')
          .eq('created_by', profile?.id ?? '')
          .order('created_at', { ascending: false })
          .limit(100);
        setInquiries((res.data ?? []) as Inquiry[]);
        if (currentId) {
          const msgRes = await supabase
            .from('inquiry_messages')
            .select('id, inquiry_id, sender_role, sender_name, message, created_at')
            .eq('inquiry_id', currentId)
            .order('created_at', { ascending: true });
          setMessages((msgRes.data ?? []) as Msg[]);
        }
      })();
    }, 5_000);
    return () => {
      window.clearInterval(presenceTimer);
      window.clearInterval(pollTimer);
    };
  }, [profile?.id, currentId]);

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
    for (const m of messages) {
      pushDay(m.created_at);
      items.push({ kind: 'msg', m, showMeta: m.sender_role !== prevRole, key: m.id });
      prevRole = m.sender_role;
    }
    return items;
  };

  const timeline = active ? buildTimeline() : [];

  const startTopic = (value: string) => {
    setNewTopic(value);
    if (value === 'general') {
      setNewSubject('General Inquiry');
    } else {
      const inc = incidents.find((i) => i.id === value);
      if (inc) setNewSubject(inc.title);
    }
    setComposerOpen(true);
  };

  const onPickTopic = (value: string) => {
    setNewTopic(value);
    if (value === 'general') {
      setNewSubject('General Inquiry');
    } else if (value) {
      const inc = incidents.find((i) => i.id === value);
      if (inc) setNewSubject(inc.title);
    }
  };

  const send = async () => {
    const text = draft.trim();
    if (!active || !text || !profile || isClosed) return;
    setSending(true);
    try {
      const { error } = await supabase.from('inquiry_messages').insert({
        inquiry_id: active.id,
        sender_role: 'resident',
        sender_name: profile.fullname,
        message: text,
      });
      if (error) throw new Error(error.message);
      setDraft('');
      const res = await supabase
        .from('inquiry_messages')
        .select('id, inquiry_id, sender_role, sender_name, message, created_at')
        .eq('inquiry_id', active.id)
        .order('created_at', { ascending: true });
      setMessages((res.data ?? []) as Msg[]);
      void markInquiriesRead();
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to send message.' });
    } finally {
      setSending(false);
    }
  };

  const createInquiry = async () => {
    if (!newSubject.trim() || !profile) return;
    if (openThread) {
      setToast({ type: 'error', message: 'You already have an ongoing conversation. Please wait for it to be resolved before starting a new one.' });
      return;
    }
    const autoMessage =
      newTopic === 'general'
        ? 'Hi! I have a general inquiry for the barangay.'
        : `Started a chat about ${newSubject}.`;
    setSending(true);
    try {
      const insertData: Record<string, unknown> = {
        sender_name: profile.fullname,
        subject: newSubject.trim(),
        message: autoMessage,
        status: 'Open',
        created_by: profile.id,
      };
      if (newTopic && newTopic !== 'general') {
        insertData.incident_id = newTopic;
      }
      const { error } = await supabase.from('inquiries').insert(insertData);
      if (error) throw new Error(error.message);
      setComposerOpen(false);
      setNewTopic('');
      setNewSubject('');
      setStartingChat(true);
      await new Promise((r) => setTimeout(r, 1200));
      const res = await supabase
        .from('inquiries')
        .select('id, sender_name, subject, message, status, incident_id, created_at')
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false })
        .limit(100);
      setInquiries((res.data ?? []) as Inquiry[]);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to start chat.' });
    } finally {
      setSending(false);
      setStartingChat(false);
    }
  };

  const statusBadge = (s: string) =>
    s === 'Open' ? 'bg-error-red/10 text-error-red' : s === 'In Progress' ? 'bg-warning-amber/10 text-warning-amber' : s === 'Resolved' ? 'bg-success-green/10 text-success-green' : 'bg-slate-100 text-slate-500';

  if (loading) {
    return (
      <div className="lg:h-[calc(100vh-17rem)] min-h-[520px] bg-surface-container-lowest rounded-2xl border border-border-subtle flex items-center justify-center">
        <p className="text-on-surface-variant">Loading…</p>
      </div>
    );
  }

  return (
    <div className="lg:h-[calc(100vh-17rem)] min-h-[520px] bg-surface-container-lowest rounded-2xl border border-border-subtle flex flex-col overflow-hidden shadow-[0_1px_2px_rgba(2,6,23,0.05)]">
      {startingChat ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6">
          <div className="w-16 h-16 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center mb-4">
            <span className="material-symbols-outlined text-3xl animate-spin">hourglass_top</span>
          </div>
          <h3 className="font-headline-md text-headline-md text-on-surface mb-2">Starting your chat…</h3>
          <p className="font-body-sm text-body-sm text-outline">Connecting you to the Barangay desk</p>
        </div>
      ) : !openThread && !viewingPastId ? (
        <div className="flex-1 flex flex-col items-center justify-center p-6 overflow-y-auto">
          <div className="max-w-2xl w-full">
            <div className="text-center mb-8">
              <div className="relative inline-block mb-4">
                <div className="w-20 h-20 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-4xl">policy</span>
                </div>
                {onlineStaffCount > 0 && (
                  <span className="absolute bottom-0 right-0 w-5 h-5 rounded-full bg-success-green border-2 border-surface-container-lowest"></span>
                )}
              </div>
              <h2 className="font-headline-md text-headline-md text-on-surface mb-2">Hi {firstName}! 👋</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">How can we help you today?</p>
              <p className="font-body-sm text-body-sm text-outline mt-1">
                {onlineStaffCount > 0 ? `${onlineStaffCount} staff online · typically replies within minutes` : 'Replies during office hours'}
              </p>
            </div>

            <div>
              <h3 className="font-label-md text-label-md font-bold text-on-surface mb-3 text-center">Choose a topic to start a chat</h3>
              <div className="grid gap-3 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => startTopic('general')}
                  className="p-4 bg-surface-container rounded-2xl border border-border-subtle hover:border-secondary hover:shadow-md transition-all text-left group"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shrink-0">
                      <span className="material-symbols-outlined text-[20px]">help</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <h4 className="font-label-md text-label-md font-bold text-on-surface mb-1">General Inquiry</h4>
                      <p className="font-body-sm text-body-sm text-on-surface-variant">Ask the admin anything</p>
                    </div>
                    <span className="material-symbols-outlined text-outline group-hover:text-secondary transition-colors">arrow_forward</span>
                  </div>
                </button>
                {incidents.map((inc) => (
                  <button
                    key={inc.id}
                    type="button"
                    onClick={() => startTopic(inc.id)}
                    className="p-4 bg-surface-container rounded-2xl border border-border-subtle hover:border-secondary hover:shadow-md transition-all text-left group"
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shrink-0">
                        <span className="material-symbols-outlined text-[20px]">{caseIcon(inc.category)}</span>
                      </div>
                      <div className="flex-1 min-w-0">
                        <h4 className="font-label-md text-label-md font-bold text-on-surface mb-1">{caseLabel(inc)}</h4>
                        <p className="font-body-sm text-body-sm text-on-surface-variant truncate">{inc.title}</p>
                      </div>
                      <span className="material-symbols-outlined text-outline group-hover:text-secondary transition-colors">arrow_forward</span>
                    </div>
                  </button>
                ))}
              </div>
            </div>

            {archivedThreads.length > 0 && (
              <div className="mt-8 text-center">
                <button
                  type="button"
                  onClick={() => setPastChatsOpen(true)}
                  className="text-secondary font-label-md text-label-md hover:underline"
                >
                  View past chats ({archivedThreads.length})
                </button>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface-container-lowest/80">
            <div className="flex items-center gap-3">
              {isViewingPast && (
                <button
                  type="button"
                  onClick={() => setViewingPastId(null)}
                  className="-ml-1 p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors shrink-0"
                  aria-label="Back to current chat"
                >
                  <span className="material-symbols-outlined">arrow_back</span>
                </button>
              )}
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center">
                  <span className="material-symbols-outlined text-[20px] text-secondary">policy</span>
                </div>
                {!isViewingPast && onlineStaffCount > 0 && (
                  <span className="absolute bottom-0 right-0 w-3 h-3 rounded-full bg-success-green border-2 border-surface-container-lowest"></span>
                )}
              </div>
              <div>
                <h3 className="font-headline-md text-[16px] font-bold text-on-surface leading-tight">Barangay Support</h3>
                <span className="font-label-sm text-label-sm flex items-center gap-1">
                  {isViewingPast ? (
                    <span className="text-outline">Viewing past conversation</span>
                  ) : onlineStaffCount > 0 ? (
                    <>
                      <span className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse"></span>
                      <span className="text-success-green">{onlineStaffCount} staff online</span>
                    </>
                  ) : (
                    <span className="text-outline">Replies during office hours</span>
                  )}
                </span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(active?.status ?? '')}`}>{active?.status}</span>
              {!isViewingPast && archivedThreads.length > 0 && (
                <button
                  type="button"
                  onClick={() => setPastChatsOpen(true)}
                  className="p-1.5 rounded-lg text-on-surface-variant hover:bg-black/5 transition-colors"
                  aria-label="Past chats"
                  title="Past chats"
                >
                  <span className="material-symbols-outlined text-[20px]">history</span>
                </button>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4 bg-surface-bg/50">
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
                  <div key={item.key} className="flex flex-col gap-1 items-end max-w-[80%] self-end">
                    <span className="font-label-sm text-[11px] text-outline mr-1">You · {timeShort(active?.created_at ?? '')}</span>
                    <div className="bg-secondary text-white p-3 rounded-2xl rounded-br-sm font-body-sm text-body-sm shadow-sm">
                      <p className="font-semibold mb-1">{active?.subject}</p>
                      <p>{active?.message}</p>
                    </div>
                  </div>
                );
              }
              const m = item.m;
              if (m.sender_role === 'staff') {
                return (
                  <div key={item.key} className="flex justify-start items-end gap-2 max-w-[75%]">
                    {item.showMeta && (
                      <div className="w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shrink-0 mb-1">
                        <span className="material-symbols-outlined text-[16px] text-secondary">policy</span>
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      {item.showMeta && (
                        <span className="font-label-sm text-[11px] text-outline ml-1">Desk Officer</span>
                      )}
                      <div className="bg-surface-container border border-border-subtle text-on-surface p-3 rounded-2xl rounded-bl-sm font-body-sm text-body-sm shadow-sm mt-0.5">
                        {m.message}
                      </div>
                      <div className="text-right mt-0.5 mr-1">
                        <span className="font-label-sm text-label-sm text-outline">{timeShort(m.created_at)}</span>
                      </div>
                    </div>
                  </div>
                );
              }
              return (
                <div key={item.key} className="flex flex-col gap-1 items-end max-w-[80%] self-end">
                  <span className="font-label-sm text-[11px] text-outline mr-1">You · {timeShort(m.created_at)}</span>
                  <div className="bg-secondary text-white p-3 rounded-2xl rounded-br-sm font-body-sm text-body-sm shadow-sm">{m.message}</div>
                </div>
              );
            })}
            <div ref={endRef} />
          </div>
          {isClosed ? (
            <div className="p-4 border-t border-border-subtle bg-surface/30">
              <div className="flex items-center gap-3 bg-surface-container-lowest border border-border-subtle rounded-xl p-3">
                <span className={`material-symbols-outlined text-[22px] shrink-0 ${active.status === 'Resolved' ? 'text-success-green' : 'text-outline'}`}>
                  {active.status === 'Resolved' ? 'task_alt' : 'archive'}
                </span>
                <div>
                  <p className="font-body-sm text-body-sm text-on-surface font-semibold">This conversation is {active.status === 'Resolved' ? 'resolved' : 'closed'} — it is now read-only.</p>
                  {!isViewingPast && <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">You can start a new chat once this one is archived.</p>}
                </div>
              </div>
              <p className="text-center font-caps-xs text-[9px] text-outline mt-2">Direct line to the Barangay desk — conversations are logged for transparency.</p>
            </div>
          ) : (
            <div className="p-4 border-t border-border-subtle bg-surface-container-lowest">
              <div className="flex items-end gap-2 bg-surface-container rounded-full border border-border-subtle px-3 py-2 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all shadow-sm">
                <textarea
                  className="w-full bg-transparent border-none resize-none py-1 font-body-sm text-body-sm focus:ring-0 text-on-surface max-h-32 overflow-y-auto placeholder:text-outline"
                  placeholder="Type a message..."
                  rows={1}
                  style={{ minHeight: 28 }}
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      void send();
                    }
                  }}
                ></textarea>
                <button
                  type="button"
                  onClick={() => void send()}
                  disabled={sending || !draft.trim()}
                  className="bg-secondary text-white rounded-full hover:bg-on-secondary-fixed-variant transition-colors shrink-0 flex items-center justify-center h-9 w-9 shadow-sm disabled:opacity-50"
                >
                  <span className="material-symbols-outlined text-[18px]">{sending ? 'hourglass_top' : 'send'}</span>
                </button>
              </div>
              <p className="text-center font-caps-xs text-[9px] text-outline mt-2">Direct line to the Barangay desk — conversations are logged for transparency.</p>
            </div>
          )}
        </>
      )}

      {composerOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Start a new chat</h3>
              <button type="button" onClick={() => setComposerOpen(false)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Topic</label>
                <select
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-md px-3 py-2 text-body-sm text-[#0f172a] focus:outline-none focus:border-[#0051d5]"
                  value={newTopic}
                  onChange={(e) => onPickTopic(e.target.value)}
                >
                  <option value="" disabled>
                    Choose a topic…
                  </option>
                  <option value="general">General / Other inquiry</option>
                  {incidents.map((inc) => (
                    <option key={inc.id} value={inc.id}>
                      {caseLabel(inc)} — {inc.title}
                    </option>
                  ))}
                </select>
                {newTopic === 'general' && (
                  <p className="mt-1.5 text-[11px] text-secondary">Subject: General Inquiry</p>
                )}
                {newTopic !== 'general' && newTopic !== '' && (
                  <p className="mt-1.5 text-[11px] text-secondary">Subject: {newSubject}</p>
                )}
              </div>
              <button
                type="button"
                disabled={sending || !newSubject.trim()}
                onClick={() => void createInquiry()}
                className="w-full bg-secondary text-white border border-secondary rounded-lg py-2.5 text-label-md font-medium hover:bg-secondary/90 disabled:opacity-50 transition-colors"
              >
                {sending ? 'Starting…' : 'Start Chat'}
              </button>
            </div>
          </div>
        </div>
      )}

      {pastChatsOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl max-h-[80vh] flex flex-col">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Past Chats</h3>
              <button type="button" onClick={() => setPastChatsOpen(false)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-4">
              {archivedThreads.length === 0 ? (
                <p className="text-center text-on-surface-variant py-8">No past chats yet.</p>
              ) : (
                <div className="space-y-2">
                  {archivedThreads.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => {
                        setViewingPastId(t.id);
                        setPastChatsOpen(false);
                      }}
                      className="w-full text-left p-3 bg-surface-container rounded-lg border border-border-subtle hover:border-secondary transition-colors"
                    >
                      <div className="flex justify-between items-start mb-1">
                        <span className="font-label-md text-label-md font-medium text-on-surface">{t.subject}</span>
                        <span className={`px-2 py-0.5 rounded font-caps-xs text-caps-xs ${statusBadge(t.status)}`}>{t.status}</span>
                      </div>
                      <p className="font-body-sm text-body-sm text-on-surface-variant line-clamp-2">{t.message}</p>
                      <p className="font-caps-xs text-caps-xs text-outline mt-1">{timeShort(t.created_at)}</p>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
