import { useEffect, useRef, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { getAdminProfile, fetchStaffPresence, isOnlineSince, markInquiriesRead, type PresenceRow } from '../../../lib/admin';

type Inquiry = {
  id: string;
  sender_name: string;
  subject: string;
  message: string;
  status: string;
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
};

const timeShort = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });

export default function CaseChat() {
  const [profile, setProfile] = useState<{ id: string; fullname: string; role: string | null } | null>(null);
  const [inquiries, setInquiries] = useState<Inquiry[]>([]);
  const [lastByInquiry, setLastByInquiry] = useState<Record<string, string>>({});
  const [messages, setMessages] = useState<Msg[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [adminPresence, setAdminPresence] = useState<PresenceRow[]>([]);
  const [draft, setDraft] = useState('');
  const [query, setQuery] = useState('');
  const [composerOpen, setComposerOpen] = useState(false);
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [newTopic, setNewTopic] = useState('');
  const [newSubject, setNewSubject] = useState('');
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const activeIdRef = useRef<string | null>(null);
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    activeIdRef.current = activeId;
  }, [activeId]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end', behavior: 'smooth' });
  }, [messages, activeId]);

  useEffect(() => {
    void (async () => {
      const p = await getAdminProfile();
      setProfile(p);
      const incRes = await supabase
        .from('incident_reports')
        .select('id, report_no, title')
        .eq('user_id', p.id)
        .order('created_at', { ascending: false })
        .limit(50);
      setIncidents((incRes.data ?? []) as Incident[]);
      const res = await supabase
        .from('inquiries')
        .select('id, sender_name, subject, message, status, created_at')
        .eq('created_by', p.id)
        .order('created_at', { ascending: false })
        .limit(100);
      const rows = (res.data ?? []) as Inquiry[];
      setInquiries(rows);
      const ids = rows.map((r) => r.id);
      const last: Record<string, string> = {};
      if (ids.length > 0) {
        const msgRes = await supabase
          .from('inquiry_messages')
          .select('id, inquiry_id, message, created_at')
          .in('inquiry_id', ids)
          .order('created_at', { ascending: true });
        for (const m of (msgRes.data ?? []) as { inquiry_id: string; message: string }[]) {
          last[m.inquiry_id] = m.message;
        }
      }
      setLastByInquiry(last);
      if (rows.length > 0) setActiveId(rows[0].id);
      setLoading(false);
      void markInquiriesRead();
    })();
  }, []);

  useEffect(() => {
    if (!activeId) return;
    void (async () => {
      const res = await supabase
        .from('inquiry_messages')
        .select('id, inquiry_id, sender_role, sender_name, message, created_at')
        .eq('inquiry_id', activeId)
        .order('created_at', { ascending: true });
      setMessages((res.data ?? []) as Msg[]);
    })();
  }, [activeId]);

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
        const id = activeIdRef.current;
        const res = await supabase
          .from('inquiries')
          .select('id, sender_name, subject, message, status, created_at')
          .eq('created_by', profile?.id ?? '')
          .order('created_at', { ascending: false })
          .limit(100);
        const rows = (res.data ?? []) as Inquiry[];
        setInquiries(rows);
        const ids = rows.map((r) => r.id);
        const last: Record<string, string> = {};
        if (ids.length > 0) {
          const msgRes = await supabase
            .from('inquiry_messages')
            .select('id, inquiry_id, message, created_at')
            .in('inquiry_id', ids)
            .order('created_at', { ascending: true });
          for (const m of (msgRes.data ?? []) as { inquiry_id: string; message: string }[]) {
            last[m.inquiry_id] = m.message;
          }
        }
        setLastByInquiry(last);
        if (id) {
          const msgRes = await supabase
            .from('inquiry_messages')
            .select('id, inquiry_id, sender_role, sender_name, message, created_at')
            .eq('inquiry_id', id)
            .order('created_at', { ascending: true });
          setMessages((msgRes.data ?? []) as Msg[]);
        }
      })();
    }, 5_000);
    return () => {
      window.clearInterval(presenceTimer);
      window.clearInterval(pollTimer);
    };
  }, [profile?.id]);

  const active = inquiries.find((i) => i.id === activeId) ?? null;
  const isClosed = !!active && (active.status === 'Resolved' || active.status === 'Closed');
  const onlineStaff = adminPresence.filter((p) => isOnlineSince(p.last_seen_at));
  const onlineStaffCount = onlineStaff.length;

  const visible = inquiries.filter((i) => {
    const q = query.trim().toLowerCase();
    return q === '' || i.subject.toLowerCase().includes(q) || i.message.toLowerCase().includes(q);
  });

  const threadPreview = (i: Inquiry) => lastByInquiry[i.id] ?? i.message;

  const caseLabel = (i: Incident) => `Case ${i.report_no ?? i.id.slice(0, 8).toUpperCase()} — ${i.title}`;

  const openComposer = () => {
    setNewTopic('');
    setNewSubject('');
    setNewMessage('');
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
    if (!newSubject.trim() || !newMessage.trim() || !profile) return;
    setSending(true);
    try {
      const { error } = await supabase.from('inquiries').insert({
        sender_name: profile.fullname,
        subject: newSubject.trim(),
        message: newMessage.trim(),
        status: 'Open',
        created_by: profile.id,
      });
      if (error) throw new Error(error.message);
      setComposerOpen(false);
      setNewTopic('');
      setNewSubject('');
      setNewMessage('');
      const res = await supabase
        .from('inquiries')
        .select('id, sender_name, subject, message, status, created_at')
        .eq('created_by', profile.id)
        .order('created_at', { ascending: false })
        .limit(100);
      const rows = (res.data ?? []) as Inquiry[];
      setInquiries(rows);
      if (rows.length > 0) {
        setActiveId(rows[0].id);
        const msgRes = await supabase
          .from('inquiry_messages')
          .select('id, inquiry_id, sender_role, sender_name, message, created_at')
          .eq('inquiry_id', rows[0].id)
          .order('created_at', { ascending: true });
        setMessages((msgRes.data ?? []) as Msg[]);
      }
      setToast({ type: 'success', message: 'Inquiry sent to the barangay.' });
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to send inquiry.' });
    } finally {
      setSending(false);
    }
  };

  const statusBadge = (s: string) =>
    s === 'Open' ? 'bg-error-red/10 text-error-red' : s === 'In Progress' ? 'bg-warning-amber/10 text-warning-amber' : s === 'Resolved' ? 'bg-success-green/10 text-success-green' : 'bg-slate-100 text-slate-500';

  return (
    <div className="lg:h-[calc(100vh-17rem)] min-h-[520px] bg-surface-container-lowest rounded-2xl border border-border-subtle flex overflow-hidden shadow-[0_1px_2px_rgba(2,6,23,0.05)]">
      <div className={`w-full lg:w-[30%] lg:min-w-[300px] border-r border-border-subtle flex-col bg-surface/50 lg:flex ${active ? 'hidden' : 'flex'}`}>
        <div className="p-4 border-b border-border-subtle">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-headline-md text-headline-md text-on-surface">Messages</h2>
            <button
              type="button"
              onClick={openComposer}
              className="relative group flex items-center gap-1 px-3 py-1.5 bg-secondary text-on-secondary rounded-lg text-label-md font-medium hover:bg-secondary/90 transition-colors"
            >
              <span className="material-symbols-outlined text-[16px]">add</span>
              New Message
              <span className="absolute -top-9 right-0 bg-sidebar-bg text-white text-[10px] font-bold px-3 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none shadow-lg">
                Choose topic of incident reported
              </span>
            </button>
          </div>
          <div className="relative">
            <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
            <input
              className="w-full bg-surface-container border border-border-subtle rounded-lg py-2 pl-10 pr-3 font-body-sm text-body-sm focus:outline-none focus:ring-1 focus:ring-secondary focus:border-secondary transition-all"
              placeholder="Search conversations..."
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
          </div>
        </div>
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="p-6 text-center text-sm text-on-surface-variant">Loading messages…</div>
          ) : visible.length === 0 ? (
            <div className="p-6 text-center text-sm text-on-surface-variant">
              {query.trim() ? 'No conversations match your search.' : 'No messages yet. Send the barangay an inquiry to start a conversation.'}
            </div>
          ) : (
            visible.map((i) => (
              <button
                key={i.id}
                type="button"
                onClick={() => setActiveId(i.id)}
                className={`w-full text-left p-4 border-b border-border-subtle cursor-pointer transition-colors ${
                  activeId === i.id ? 'bg-secondary/5 border-l-4 border-l-secondary' : 'hover:bg-black/5'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className={`font-label-md text-label-md ${activeId === i.id ? 'font-bold text-on-surface' : 'font-medium text-on-surface'}`}>{i.subject}</span>
                  <span className={`font-caps-xs text-caps-xs ${activeId === i.id ? 'text-secondary font-bold' : 'text-outline'}`}>{timeShort(i.created_at)}</span>
                </div>
                <p className="font-body-sm text-body-sm text-on-surface truncate">{threadPreview(i)}</p>
                <div className="flex gap-2 mt-2">
                  <span className="font-caps-xs text-caps-xs text-on-surface-variant">Barangay Inbox</span>
                  <span className={`px-2 py-0.5 rounded font-caps-xs text-caps-xs ${statusBadge(i.status)}`}>{i.status}</span>
                </div>
              </button>
            ))
          )}
        </div>
      </div>

      <div className={`flex-1 flex-col bg-surface-container-lowest min-w-0 lg:flex ${active ? 'flex' : 'hidden'}`}>
        {active ? (
          <>
            <div className="p-4 border-b border-border-subtle flex justify-between items-center bg-surface/30">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center font-headline-md text-headline-md">
                  <span className="material-symbols-outlined text-secondary">policy</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-[16px] font-bold text-on-surface leading-tight">{active.subject}</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${statusBadge(active.status)}`}>{active.status}</span>
                    <span className={`font-label-sm text-label-sm flex items-center gap-1 ${onlineStaffCount > 0 ? 'text-success-green' : 'text-outline'}`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${onlineStaffCount > 0 ? 'bg-success-green animate-pulse' : 'bg-slate-300'}`}></span>
                      {onlineStaffCount > 0 ? `${onlineStaffCount} barangay staff online` : 'Admin offline — replies during office hours'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 bg-surface-bg/50">
              <div className="flex justify-center">
                <span className="px-3 py-1 bg-surface-dim text-on-surface-variant rounded-full font-caps-xs text-[10px] uppercase tracking-wider">
                  Inquiry opened {timeShort(active.created_at)}
                </span>
              </div>
              <div className="flex flex-col gap-1 items-end max-w-[80%] self-end">
                <span className="font-label-sm text-[11px] text-outline mr-1">You · {timeShort(active.created_at)}</span>
                <div className="bg-secondary text-white p-3 rounded-2xl rounded-br-sm font-body-sm text-body-sm shadow-sm">
                  <p className="font-semibold mb-1">{active.subject}</p>
                  <p>{active.message}</p>
                </div>
              </div>
              {messages.map((m) =>
                m.sender_role === 'staff' ? (
                  <div key={m.id} className="flex justify-start items-end gap-2 max-w-[75%]">
                    <div className="w-8 h-8 rounded-full bg-secondary-fixed text-on-secondary-fixed flex items-center justify-center shrink-0 mb-1">
                      <span className="material-symbols-outlined text-[16px] text-secondary">policy</span>
                    </div>
                    <div className="flex-1 min-w-0">
                      <span className="font-label-sm text-[11px] text-outline ml-1">{m.sender_name} · Barangay Staff</span>
                      <div className="bg-surface-container border border-border-subtle text-on-surface p-3 rounded-2xl rounded-bl-sm font-body-sm text-body-sm shadow-sm mt-0.5">
                        {m.message}
                      </div>
                      <div className="text-right mt-0.5 mr-1">
                        <span className="font-label-sm text-label-sm text-outline">{timeShort(m.created_at)}</span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div key={m.id} className="flex flex-col gap-1 items-end max-w-[80%] self-end">
                    <span className="font-label-sm text-[11px] text-outline mr-1">You · {timeShort(m.created_at)}</span>
                    <div className="bg-secondary text-white p-3 rounded-2xl rounded-br-sm font-body-sm text-body-sm shadow-sm">{m.message}</div>
                  </div>
                ),
              )}
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
                    <p className="font-body-sm text-body-sm text-on-surface-variant mt-0.5">Start a new message if you need further help from the barangay.</p>
                  </div>
                </div>
                <p className="text-center font-caps-xs text-[9px] text-outline mt-2">Direct line to the Barangay desk — conversations are logged for transparency.</p>
              </div>
            ) : (
              <div className="p-4 border-t border-border-subtle bg-surface/30">
                <div className="flex items-end gap-2 bg-surface-container-lowest border border-border-subtle rounded-xl p-2 focus-within:border-secondary focus-within:ring-1 focus-within:ring-secondary transition-all shadow-sm">
                  <textarea
                    className="w-full bg-transparent border-none resize-none py-2.5 font-body-sm text-body-sm focus:ring-0 text-on-surface max-h-32 overflow-y-auto"
                    placeholder="Type a message..."
                    rows={1}
                    style={{ minHeight: 44 }}
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
                    className="bg-secondary text-white p-2.5 rounded-lg hover:bg-on-secondary-fixed-variant transition-colors shrink-0 flex items-center justify-center h-10 w-10 shadow-sm disabled:opacity-50"
                  >
                    <span className="material-symbols-outlined">{sending ? 'hourglass_top' : 'send'}</span>
                  </button>
                </div>
                <p className="text-center font-caps-xs text-[9px] text-outline mt-2">Direct line to the Barangay desk — conversations are logged for transparency.</p>
              </div>
            )}
          </>
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-on-surface-variant text-sm gap-2">
            <span className="material-symbols-outlined text-4xl text-outline">chat</span>
            Select a conversation to view the thread.
          </div>
        )}
      </div>

      {composerOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl">
              <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">New Message</h3>
              <button type="button" onClick={() => setComposerOpen(false)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Topic / Related Case</label>
                <select
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-md px-3 py-2 text-body-sm text-[#0f172a] focus:outline-none focus:border-[#0051d5]"
                  value={newTopic}
                  onChange={(e) => onPickTopic(e.target.value)}
                >
                  <option value="" disabled>
                    Choose topic of incident reported…
                  </option>
                  <option value="general">General / Other inquiry — ask the admin anything</option>
                  {incidents.map((inc) => (
                    <option key={inc.id} value={inc.id}>
                      {caseLabel(inc)}
                    </option>
                  ))}
                </select>
                {newTopic === 'general' && (
                  <p className="mt-1.5 text-[11px] text-secondary">Subject: General Inquiry — you can ask the admin anything.</p>
                )}
                {newTopic !== 'general' && newTopic !== '' && (
                  <p className="mt-1.5 text-[11px] text-secondary">Topic set to the case title of the incident reported.</p>
                )}
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Message</label>
                <textarea
                  className="w-full bg-[#f8fafc] border border-[#e2e8f0] rounded-md px-3 py-2 text-body-sm text-[#0f172a] focus:outline-none focus:border-[#0051d5] resize-none"
                  rows={4}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  placeholder="Good day po!"
                ></textarea>
              </div>
              <button
                type="button"
                disabled={sending || !newSubject.trim() || !newMessage.trim()}
                onClick={() => void createInquiry()}
                className="w-full bg-secondary/10 text-secondary border border-secondary/25 rounded-lg py-2 text-label-md font-medium hover:bg-secondary/20 disabled:opacity-50 transition-colors"
              >
                {sending ? 'Sending…' : 'Send to Barangay'}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="fixed bottom-8 right-8 bg-surface-container-high text-on-surface px-4 py-3 rounded-lg shadow-lg text-sm z-[150]">{toast.message}</div>}
    </div>
  );
}
