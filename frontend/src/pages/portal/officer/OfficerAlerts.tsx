import { useEffect, useState } from 'react';
import { supabase } from '../../../supabaseClient';

type Broadcast = {
  id: string;
  title: string;
  message: string;
  type: string;
  sent_at: string | null;
};

const TYPE_BADGE: Record<string, string> = {
  Advisory: 'bg-sky-100 text-sky-700',
  Alert: 'bg-error-red/10 text-error-red',
  Announcement: 'bg-secondary/10 text-secondary',
  Weather: 'bg-teal-100 text-teal-700',
  Emergency: 'bg-error-red/10 text-error-red',
};

const timeAgo = (iso: string | null) => {
  if (!iso) return '—';
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

export default function OfficerAlerts() {
  const [broadcasts, setBroadcasts] = useState<Broadcast[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    void (async () => {
      const res = await supabase.from('broadcasts').select('id, title, message, type, sent_at').eq('status', 'Sent').order('sent_at', { ascending: false }).limit(50);
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
          {broadcasts.map((b) => (
            <div key={b.id} className="bg-white rounded-xl border border-border-subtle p-5 shadow-sm flex items-start gap-4">
              <span className={`w-10 h-10 rounded-lg flex items-center justify-center shrink-0 ${TYPE_BADGE[b.type]}`}>
                <span className="material-symbols-outlined text-[20px]">{b.type === 'Alert' || b.type === 'Emergency' ? 'campaign' : b.type === 'Weather' ? 'cloud' : 'notifications'}</span>
              </span>
              <div className="flex-1 min-w-[200px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <h3 className="font-headline-md text-headline-md font-bold text-on-surface">{b.title}</h3>
                  <span className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${TYPE_BADGE[b.type]}`}>{b.type}</span>
                </div>
                <p className="text-sm text-on-surface-variant mt-1">{b.message}</p>
                <p className="text-[11px] text-on-surface-variant/70 mt-1.5">Published {timeAgo(b.sent_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
