import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';

type Broadcast = {
  id: string;
  title: string;
  message: string;
  type: string;
  sent_at: string | null;
  image_url: string | null;
};

const TYPE_BADGE: Record<string, string> = {
  Advisory: 'bg-sky-100 text-sky-700',
  Alert: 'bg-error-red/10 text-error-red',
  Announcement: 'bg-secondary/10 text-secondary',
  Weather: 'bg-teal-100 text-teal-700',
  Emergency: 'bg-error-red/10 text-error-red',
};

const TYPE_ICON: Record<string, string> = {
  Alert: 'campaign',
  Emergency: 'campaign',
  Weather: 'cloud',
  Advisory: 'info',
  Announcement: 'notifications',
};

const timeAgo = (iso: string | null) => {
  if (!iso) return '—';
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

const TRUNCATE_LEN = 150;

export default function OfficerAlerts() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedBroadcast, setSelectedBroadcast] = useState<Broadcast | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await supabase.from('broadcasts').select('id, title, message, type, sent_at, image_url').eq('status', 'Sent').order('sent_at', { ascending: false }).limit(50);
      setBroadcasts((res.data ?? []) as Broadcast[]);
      setLoading(false);
    })();
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h2 className="font-headline-lg text-headline-lg font-bold text-on-surface">Community Alerts</h2>
        <p className="font-body-md text-body-md text-on-surface-variant">Official alerts and announcements issued by Barangay Culiat Leadership.</p>
      </div>

      {loading ? (
        <div className="bg-white rounded-xl border border-border-subtle p-12 text-center text-sm text-on-surface-variant">Loading alerts…</div>
      ) : broadcasts.length === 0 ? (
        <div className="bg-white rounded-xl border border-border-subtle p-12 text-center text-sm text-on-surface-variant">No published alerts yet.</div>
      ) : (
        <div className="space-y-4">
          {broadcasts.map((b) => {
            const needsTruncate = b.message.length > TRUNCATE_LEN;
            return (
              <div key={b.id} className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
                {b.image_url && (
                  <div className="h-40 overflow-hidden">
                    <img src={b.image_url} alt={b.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-5 flex items-start gap-4">
                  <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${TYPE_BADGE[b.type]}`}>
                    <span className="material-symbols-outlined text-[20px]">{TYPE_ICON[b.type] ?? 'notifications'}</span>
                  </span>
                  <div className="flex-1 min-w-[200px]">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="font-headline-md text-headline-md font-bold text-on-surface">{b.title}</h3>
                      <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${TYPE_BADGE[b.type]}`}>{b.type}</span>
                    </div>
                    <p className={`text-sm text-on-surface-variant mt-1 ${needsTruncate ? 'line-clamp-3' : ''}`}>{b.message}</p>
                    {needsTruncate && (
                      <button
                        type="button"
                        onClick={() => setSelectedBroadcast(b)}
                        className="mt-2 text-secondary font-label-sm text-label-sm font-semibold hover:underline text-left"
                      >
                        View More
                      </button>
                    )}
                    <p className="text-[11px] text-on-surface-variant/70 mt-1.5">Published {timeAgo(b.sent_at)}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedBroadcast && (
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-lg">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedBroadcast(null)} />
          <div className="relative bg-surface-container-lowest w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border border-border-subtle flex flex-col">
            <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b border-border-subtle z-10 bg-surface-container-lowest">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-caps-xs text-caps-xs uppercase tracking-wider ${TYPE_BADGE[selectedBroadcast.type]}`}>
                  <span className="material-symbols-outlined text-[14px]">{TYPE_ICON[selectedBroadcast.type] ?? 'notifications'}</span>
                  {selectedBroadcast.type}
                </span>
                <span className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  Published {timeAgo(selectedBroadcast.sent_at)}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedBroadcast(null)}
                className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedBroadcast.image_url && (
                <div className="w-full max-h-80 overflow-hidden">
                  <img src={selectedBroadcast.image_url} alt={selectedBroadcast.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6 md:p-8">
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mb-4">{selectedBroadcast.title}</h2>
                <p className="font-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap">{selectedBroadcast.message}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
