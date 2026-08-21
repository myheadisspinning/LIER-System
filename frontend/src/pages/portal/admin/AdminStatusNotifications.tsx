import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { fmtDate, logAudit } from '../../../lib/admin';
import Toast from '../../../components/Toast';

type Broadcast = {
  id: string;
  title: string;
  message: string;
  type: string;
  audience: string;
  status: string;
  scheduled_at: string | null;
  sent_at: string | null;
  created_at: string;
};

const TYPE_COLOR: Record<string, string> = {
  Advisory: 'bg-sky-100 text-sky-700',
  Alert: 'bg-error-red/10 text-error-red',
  Announcement: 'bg-secondary/10 text-secondary',
  Weather: 'bg-teal-100 text-teal-700',
  Emergency: 'bg-error-red/10 text-error-red',
};

const STATUS_BADGE: Record<string, string> = {
  Draft: 'bg-slate-100 text-slate-500',
  Scheduled: 'bg-warning-amber/10 text-warning-amber',
  Sent: 'bg-success-green/10 text-success-green',
};

export default function AdminStatusNotifications() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [composerOpen, setComposerOpen] = useState(false);
  const [form, setForm] = useState({ title: '', message: '', type: 'Announcement', audience: 'Everyone' });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [schedule, setSchedule] = useState(false);
  const [scheduledAt, setScheduledAt] = useState('');
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<Broadcast | null>(null);

  const fetchAll = async () => {
    const res = await supabase.from('broadcasts').select('*').order('created_at', { ascending: false }).limit(100);
    return (res.data ?? []) as Broadcast[];
  };

  useEffect(() => {
    void (async () => {
      setBroadcasts(await fetchAll());
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const sent = broadcasts.filter((b) => b.status === 'Sent').length;
    const scheduled = broadcasts.filter((b) => b.status === 'Scheduled').length;
    const alerts = broadcasts.filter((b) => b.type === 'Alert' || b.type === 'Emergency').length;
    return { total: broadcasts.length, sent, scheduled, alerts };
  }, [broadcasts]);

  const uploadImage = async (): Promise<string | null> => {
    if (!imageFile) return null;
    const path = `broadcasts/${crypto.randomUUID()}-${imageFile.name.replace(/[^\w.-]+/g, '_')}`;
    const { error } = await supabase.storage.from('broadcasts').upload(path, imageFile, { cacheControl: '3600', contentType: imageFile.type || 'image/jpeg' });
    if (error) throw new Error(`Image upload failed: ${error.message}`);
    const { data } = supabase.storage.from('broadcasts').getPublicUrl(path);
    return data.publicUrl;
  };

  const send = async (immediate: boolean) => {
    if (!form.title.trim() || !form.message.trim()) return;
    setSaving(true);
    try {
      const status = immediate ? 'Sent' : schedule ? 'Scheduled' : 'Draft';
      const image_url = await uploadImage();
      const payload: Record<string, unknown> = {
        title: form.title.trim(),
        message: form.message.trim(),
        type: form.type,
        audience: form.audience,
        status,
        image_url,
        sent_at: immediate ? new Date().toISOString() : null,
        scheduled_at: schedule && scheduledAt ? new Date(scheduledAt).toISOString() : null,
      };
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) payload.created_by = session.user.id;
      const { error } = await supabase.from('broadcasts').insert(payload);
      if (error) throw new Error(error.message);
      await logAudit(status === 'Sent' ? 'Broadcast alert' : 'Schedule broadcast', `Created "${payload.title}" (${payload.type}, ${status}).`);
      setToast({ type: 'success', message: status === 'Sent' ? 'Broadcast sent to residents.' : 'Broadcast saved.' });
      setComposerOpen(false);
      setForm({ title: '', message: '', type: 'Announcement', audience: 'Everyone' });
      setImageFile(null);
      setSchedule(false);
      setScheduledAt('');
      setBroadcasts(await fetchAll());
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Failed to send.' });
    } finally {
      setSaving(false);
    }
  };

  const publishNow = async (b: Broadcast) => {
    const { error } = await supabase.from('broadcasts').update({ status: 'Sent', sent_at: new Date().toISOString(), scheduled_at: null }).eq('id', b.id);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      await logAudit('Broadcast alert', `Published "${b.title}" immediately.`);
      setBroadcasts(await fetchAll());
    }
  };

  const remove = async (b: Broadcast) => {
    const { error } = await supabase.from('broadcasts').delete().eq('id', b.id);
    if (error) {
      setToast({ type: 'error', message: error.message });
    } else {
      setBroadcasts(await fetchAll());
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div>
          <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Status Notifications</h2>
          <p className="font-body-md text-body-md text-on-surface-variant">Compose and publish alerts and announcements shown to residents in the Community Alerts feed.</p>
        </div>
        <button type="button" onClick={() => setComposerOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-lg text-label-md font-medium hover:bg-secondary/90 transition-colors">
          <span className="material-symbols-outlined text-[18px]">add_alert</span>
          Create New Broadcast Alert
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-border-subtle p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Total Broadcasts</div>
          <div className="font-display-lg text-display-lg font-bold text-on-surface">{stats.total}</div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Sent</div>
          <div className="font-display-lg text-display-lg font-bold text-success-green">{stats.sent}</div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Scheduled</div>
          <div className="font-display-lg text-display-lg font-bold text-warning-amber">{stats.scheduled}</div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-1">Alerts / Emergency</div>
          <div className="font-display-lg text-display-lg font-bold text-error-red">{stats.alerts}</div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border-subtle">
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Broadcast History</h3>
        </div>
        {loading ? (
          <div className="p-12 text-center text-sm text-on-surface-variant">Loading broadcasts…</div>
        ) : broadcasts.length === 0 ? (
          <div className="p-12 text-center text-sm text-on-surface-variant">No broadcasts yet. Create one to reach residents.</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {broadcasts.map((b) => (
              <div key={b.id} className="px-5 py-4 flex flex-wrap items-start gap-4">
                <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLOR[b.type]}`}>
                  <span className="material-symbols-outlined text-[20px]">{b.type === 'Alert' || b.type === 'Emergency' ? 'campaign' : b.type === 'Weather' ? 'cloud' : 'notifications'}</span>
                </span>
                <div className="flex-1 min-w-[200px]">
                  <div className="flex items-center gap-2 flex-wrap">
                    <h4 className="font-headline-md text-headline-md font-bold text-on-surface">{b.title}</h4>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${TYPE_COLOR[b.type]}`}>{b.type}</span>
                    <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${STATUS_BADGE[b.status]}`}>{b.status}</span>
                  </div>
                  <p className="text-body-sm text-on-surface-variant mt-1">{b.message}</p>
                  <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
                    {b.status === 'Sent' ? `Sent ${fmtDate(b.sent_at, 'short')}` : b.status === 'Scheduled' ? `Scheduled ${fmtDate(b.scheduled_at, 'short')}` : `Draft · created ${fmtDate(b.created_at, 'short')}`} · {b.audience}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  {b.status !== 'Sent' && (
                    <button type="button" onClick={() => publishNow(b)} className="px-3 py-1.5 bg-success-green text-white rounded-md text-xs font-semibold hover:bg-success-green/90 transition-colors">
                      Send Now
                    </button>
                  )}
                  <button type="button" onClick={() => setConfirmDelete(b)} className="px-3 py-1.5 border border-border-subtle rounded-md text-xs font-semibold text-on-surface-variant hover:text-error-red transition-colors">
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {composerOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-4xl max-h-[90vh] overflow-y-auto">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center sticky top-0 bg-surface-container-lowest z-10">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">New Broadcast Alert</h3>
              <button type="button" onClick={() => setComposerOpen(false)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-5">
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Title</label>
                  <input className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} placeholder="e.g. Flash Flood Warning" />
                </div>
                <div>
                  <label className="block text-xs text-on-surface-variant mb-1.5">Message</label>
                  <textarea rows={4} className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary resize-none" value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} placeholder="Details residents need to know…" />
                  <p className="text-[11px] text-on-surface-variant text-right mt-1">{form.message.length} / 500 chars</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs text-on-surface-variant mb-1.5">Type</label>
                    <select className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value })}>
                      {['Announcement', 'Advisory', 'Alert', 'Weather', 'Emergency'].map((t) => (
                        <option key={t}>{t}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs text-on-surface-variant mb-1.5">Audience</label>
                    <select className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={form.audience} onChange={(e) => setForm({ ...form, audience: e.target.value })}>
                      {['Everyone', 'Purok 1', 'Purok 2', 'Purok 3', 'Purok 4', 'Purok 5', 'Purok 6', 'Purok 7', 'Staff Only'].map((a) => (
                        <option key={a}>{a}</option>
                      ))}
                    </select>
                  </div>
                </div>
                <label className="flex items-center gap-2 text-sm text-on-surface">
                  <input type="checkbox" checked={schedule} onChange={(e) => setSchedule(e.target.checked)} className="w-4 h-4 text-secondary rounded" />
                  Schedule this broadcast
                </label>
                {schedule && (
                  <div>
                    <label className="block text-xs text-on-surface-variant mb-1.5">Send At</label>
                    <input type="datetime-local" className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary" value={scheduledAt} onChange={(e) => setScheduledAt(e.target.value)} />
                  </div>
                )}
                <div className="space-y-2">
                  <label className="block text-xs text-on-surface-variant">Image (optional)</label>
                  {imageFile && (
                    <div className="rounded-lg overflow-hidden border border-border-subtle h-36">
                      <img src={URL.createObjectURL(imageFile)} alt="Preview" className="w-full h-full object-cover" />
                    </div>
                  )}
                  <input type="file" accept="image/*" id="broadcast-image" onChange={(e) => setImageFile(e.target.files?.[0] ?? null)} className="hidden" />
                  <label htmlFor="broadcast-image" className="inline-flex items-center gap-2 px-4 py-2 bg-secondary/10 text-secondary rounded-lg text-sm font-medium hover:bg-secondary/20 cursor-pointer transition-colors">
                    <span className="material-symbols-outlined text-[18px]">upload</span>
                    Choose Image
                  </label>
                  {imageFile && <span className="text-xs text-on-surface-variant ml-2">{imageFile.name}</span>}
                </div>
                <div className="flex gap-2">
                  <button type="button" disabled={saving} onClick={() => send(true)} className="flex-1 bg-success-green text-white rounded-lg py-2 text-label-md font-medium hover:bg-success-green/90 disabled:opacity-50 transition-colors">
                    {saving ? 'Sending…' : 'Send Immediate Broadcast'}
                  </button>
                  <button type="button" disabled={saving} onClick={() => send(false)} className="flex-1 bg-secondary text-on-secondary rounded-lg py-2 text-label-md font-medium hover:bg-secondary/90 disabled:opacity-50 transition-colors">
                    {schedule ? 'Schedule' : 'Save as Draft'}
                  </button>
                </div>
              </div>

              <div className="lg:border-l lg:pl-5 border-border-subtle">
                <p className="text-xs text-on-surface-variant uppercase tracking-wider font-bold mb-3">Live Preview</p>
                {form.title.trim() || form.message.trim() ? (
                  <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
                    <div className="px-5 py-4 flex items-start gap-4">
                      <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${TYPE_COLOR[form.type]}`}>
                        <span className="material-symbols-outlined text-[20px]">{form.type === 'Alert' || form.type === 'Emergency' ? 'campaign' : form.type === 'Weather' ? 'cloud' : 'notifications'}</span>
                      </span>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="font-headline-md text-headline-md font-bold text-on-surface">{form.title.trim() || 'Untitled Broadcast'}</h4>
                          <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${TYPE_COLOR[form.type]}`}>{form.type}</span>
                          <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-500">Draft</span>
                        </div>
                        {form.message.trim() && (
                          <p className="text-body-sm text-on-surface-variant mt-1 whitespace-pre-wrap">{form.message.trim()}</p>
                        )}
                        {imageFile && (
                          <div className="mt-2 rounded-lg overflow-hidden border border-border-subtle h-28">
                            <img src={URL.createObjectURL(imageFile)} alt="Attachment" className="w-full h-full object-cover" />
                          </div>
                        )}
                        <p className="text-[11px] text-on-surface-variant/70 mt-1.5">
                          {schedule && scheduledAt ? `Scheduled ${new Date(scheduledAt).toLocaleString()}` : `Draft · created ${new Date().toLocaleString()}`} · {form.audience}
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="bg-white rounded-xl border border-dashed border-border-subtle p-10 flex flex-col items-center gap-2 text-on-surface-variant">
                    <span className="material-symbols-outlined text-3xl">visibility</span>
                    <p className="text-sm text-center">Start typing to see a live preview of your broadcast.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <span className="w-10 h-10 rounded-full bg-error-red/10 flex items-center justify-center shrink-0">
                <span className="material-symbols-outlined text-[20px] text-error-red">warning</span>
              </span>
              <div>
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Delete Broadcast</h3>
                <p className="text-body-sm text-on-surface-variant">This action cannot be undone.</p>
              </div>
            </div>
            <p className="text-body-sm text-on-surface-variant mb-1">Are you sure you want to delete this broadcast?</p>
            <p className="text-body-sm text-on-surface font-semibold mb-6">"{confirmDelete.title}"</p>
            <div className="flex gap-2 justify-end">
              <button type="button" onClick={() => setConfirmDelete(null)} className="px-4 py-2 border border-border-subtle rounded-lg text-sm font-medium text-on-surface-variant hover:bg-surface-container-low transition-colors">
                Cancel
              </button>
              <button type="button" onClick={async () => { await remove(confirmDelete); setConfirmDelete(null); }} className="px-4 py-2 bg-error-red text-white rounded-lg text-sm font-medium hover:bg-error-red/90 transition-colors">
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
