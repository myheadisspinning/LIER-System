import { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../supabaseClient';
import { useScrollLock } from '../../../lib/useScrollLock';

type Category = 'All Advisories' | 'Emergency & Crime' | 'Weather & Floods' | 'Barangay Services' | 'Public Safety';

const categories: Category[] = ['All Advisories', 'Emergency & Crime', 'Weather & Floods', 'Barangay Services', 'Public Safety'];

interface Advisory {
  id: string;
  category: Category;
  tone: 'red' | 'blue' | 'green' | 'safety';
  time: string;
  title: string;
  body: string;
  type: string;
  image_url: string | null;
}

const catFor = (type: string): Category => {
  if (type === 'Emergency' || type === 'Alert') return 'Emergency & Crime';
  if (type === 'Weather') return 'Weather & Floods';
  if (type === 'Advisory') return 'Public Safety';
  return 'Barangay Services';
};

const toneFor = (type: string): Advisory['tone'] => {
  if (type === 'Emergency' || type === 'Alert') return 'red';
  if (type === 'Weather') return 'blue';
  if (type === 'Advisory') return 'safety';
  return 'green';
};

const toneClasses: Record<Advisory['tone'], string> = {
  red: 'bg-error-red/10 text-error-red border border-error-red/30',
  blue: 'bg-blue-100 text-[#1E40AF] border border-blue-200',
  green: 'bg-green-100 text-green-800 border border-green-200',
  safety: 'bg-[#1E40AF]/10 text-[#1E40AF] border border-[#1E40AF]/20',
};

const iconFor = (type: string) => {
  if (type === 'Emergency' || type === 'Alert') return 'campaign';
  if (type === 'Weather') return 'cloud';
  if (type === 'Advisory') return 'info';
  return 'notifications';
};

const timeAgo = (iso: string) => {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

const TRUNCATE_LEN = 150;

export default function Advisories() {
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>('All Advisories');
  const [query, setQuery] = useState('');
  const [selectedAdvisory, setSelectedAdvisory] = useState<Advisory | null>(null);

  useScrollLock(selectedAdvisory != null);

  useEffect(() => {
    void (async () => {
      const res = await supabase
        .from('broadcasts')
        .select('id, title, message, type, audience, sent_at, image_url')
        .eq('status', 'Sent')
        .order('sent_at', { ascending: false })
        .limit(50);
      const rows = (res.data ?? []).map((b) => ({
        id: b.id,
        category: catFor(b.type),
        tone: toneFor(b.type),
        time: timeAgo(b.sent_at ?? b.id),
        title: b.title,
        body: b.message,
        type: b.type,
        image_url: b.image_url ?? null,
      })) as Advisory[];
      setAdvisories(rows);
      setLoading(false);
    })();
  }, []);

  const visible = advisories.filter((a) => {
    const matchesCategory = category === 'All Advisories' || a.category === category;
    const matchesQuery =
      query.trim() === '' ||
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.body.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <div className="w-full">
      <div className="bg-surface-container-lowest border border-border-subtle rounded p-3 flex flex-col md:flex-row justify-between items-center mb-6 gap-4">
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => setCategory(c)}
              className={`px-4 py-1.5 rounded font-label-md text-label-md transition-colors ${
                category === c
                  ? 'bg-secondary text-on-secondary hover:bg-secondary/90'
                  : 'bg-[#f1f5f9] text-on-surface-variant rounded border border-border-subtle hover:bg-surface-variant'
              }`}
            >
              {c}
            </button>
          ))}
        </div>
        <div className="relative w-full md:w-auto">
          <span className="material-symbols-outlined text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2">search</span>
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full md:w-64 bg-[#f1f5f9] border border-border-subtle rounded pl-10 pr-3 py-1.5 text-sm focus:ring-secondary focus:border-secondary"
            placeholder="Search advisories..."
            type="text"
          />
        </div>
      </div>

      {loading ? (
        <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-10 text-center text-sm text-on-surface-variant shadow-sm">Loading advisories…</div>
      ) : advisories.length === 0 ? (
        <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-10 text-center text-sm text-on-surface-variant shadow-sm">No official advisories have been published yet.</div>
      ) : visible.length === 0 ? (
        <div className="bg-surface-container-lowest border border-border-subtle rounded p-8 text-center shadow-sm">
          <p className="font-body-md text-body-md text-on-surface-variant">No advisories match your search.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {visible.map((a) => {
            const needsTruncate = a.body.length > TRUNCATE_LEN;
            return (
              <div
                key={a.id}
                className="bg-surface-container-lowest border border-border-subtle rounded-2xl overflow-hidden hover:border-secondary/50 transition-all duration-200 flex flex-col h-full shadow-[0_1px_2px_rgba(2,6,23,0.05)] hover:shadow-[0_1px_2px_rgba(2,6,23,0.05),0_16px_40px_-20px_rgba(2,6,23,0.25)] hover:-translate-y-0.5"
              >
                {a.image_url && (
                  <div className="h-36 overflow-hidden">
                    <img src={a.image_url} alt={a.title} className="w-full h-full object-cover" />
                  </div>
                )}
                <div className="p-6 flex flex-col flex-1">
                  <div className="flex justify-between items-start mb-4">
                    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-caps-xs text-caps-xs uppercase tracking-wider ${toneClasses[a.tone]}`}>
                      <span className="material-symbols-outlined text-[14px]">{iconFor(a.type)}</span>
                      {a.type}
                    </span>
                    <span className="text-on-surface-variant font-label-sm text-label-sm">{a.time}</span>
                  </div>
                  <h3 className="font-headline-md text-headline-md text-on-background mb-2">{a.title}</h3>
                  <p className={`font-body-sm text-body-sm text-on-surface-variant flex-1 leading-relaxed ${needsTruncate ? 'line-clamp-3' : ''}`}>{a.body}</p>
                  {needsTruncate && (
                    <button
                      type="button"
                      onClick={() => setSelectedAdvisory(a)}
                      className="mt-2 text-secondary font-label-sm text-label-sm font-semibold hover:underline text-left"
                    >
                      View More
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {selectedAdvisory && createPortal(
        <div className="fixed inset-0 z-[300] flex items-center justify-center p-4 md:p-lg">
          <div className="absolute inset-0 bg-black/50" onClick={() => setSelectedAdvisory(null)} />
          <div className="relative bg-surface-container-lowest w-full max-w-3xl max-h-[85vh] overflow-hidden rounded-2xl shadow-2xl border border-border-subtle flex flex-col">
            <div className="px-6 py-4 flex justify-between items-center shrink-0 border-b border-border-subtle z-10 bg-surface-container-lowest">
              <div className="flex items-center gap-3">
                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-caps-xs text-caps-xs uppercase tracking-wider ${toneClasses[selectedAdvisory.tone]}`}>
                  <span className="material-symbols-outlined text-[14px]">{iconFor(selectedAdvisory.type)}</span>
                  {selectedAdvisory.type}
                </span>
                <span className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
                  <span className="material-symbols-outlined text-[16px]">schedule</span>
                  {selectedAdvisory.time}
                </span>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAdvisory(null)}
                className="text-on-surface-variant hover:text-on-surface p-2 rounded-full hover:bg-surface-container transition-colors"
              >
                <span className="material-symbols-outlined text-2xl">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {selectedAdvisory.image_url && (
                <div className="w-full max-h-80 overflow-hidden">
                  <img src={selectedAdvisory.image_url} alt={selectedAdvisory.title} className="w-full h-full object-cover" />
                </div>
              )}
              <div className="p-6 md:p-8">
                <h2 className="font-headline-lg text-headline-lg text-on-surface font-bold mb-4">{selectedAdvisory.title}</h2>
                <p className="font-body-md text-on-surface-variant leading-relaxed whitespace-pre-wrap">{selectedAdvisory.body}</p>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
