import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';

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

const timeAgo = (iso: string) => {
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 3600) return `${Math.max(1, Math.floor(secs / 60))}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric' });
};

export default function Advisories() {
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>('All Advisories');
  const [query, setQuery] = useState('');

  useEffect(() => {
    void (async () => {
      const res = await supabase
        .from('broadcasts')
        .select('id, title, message, type, audience, sent_at')
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
      })) as Advisory[];
      setAdvisories(rows);
      setLoading(false);
    })();
  }, []);

  const featured = useMemo(() => advisories.find((a) => a.type === 'Emergency' || a.type === 'Alert') ?? advisories[0], [advisories]);
  const gridItems = useMemo(() => advisories.filter((a) => a.id !== featured?.id), [advisories, featured]);

  const visible = gridItems.filter((a) => {
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
      ) : (
        <>
          {featured && (
            <div className="bg-surface-container-lowest border border-error-red/30 rounded-2xl p-6 mb-6 relative overflow-hidden shadow-sm">
              <div className="absolute top-0 right-0 w-64 h-64 bg-error-red/5 rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none"></div>
              <div className="flex items-start justify-between gap-6 relative z-10">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-4 flex-wrap">
                    <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-error-red text-on-error font-caps-xs text-caps-xs uppercase tracking-wider">
                      <span className="material-symbols-outlined text-[14px]">campaign</span>
                      {featured.type} ADVISORY
                    </span>
                    <span className="text-on-surface-variant font-label-sm text-label-sm flex items-center gap-1">
                      <span className="material-symbols-outlined text-[16px]">schedule</span>
                      Issued {featured.time} · Barangay Culiat Command
                    </span>
                  </div>
                  <h3 className="font-headline-lg text-headline-lg text-on-background mb-4">{featured.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-4xl">{featured.body}</p>
                </div>
                <div className="hidden lg:block w-72 h-48 bg-[#f1f5f9] rounded border border-border-subtle relative overflow-hidden flex-shrink-0">
                  <div className="absolute inset-0 bg-gradient-to-br from-secondary/20 via-transparent to-transparent"></div>
                  <div className="absolute top-2 right-2 bg-white/90 px-2 py-1 rounded shadow text-xs font-bold text-error-red flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-error-red animate-pulse"></span> LIVE
                  </div>
                </div>
              </div>
            </div>
          )}

          {visible.length === 0 ? (
            <div className="bg-surface-container-lowest border border-border-subtle rounded p-8 text-center shadow-sm">
              <p className="font-body-md text-body-md text-on-surface-variant">No advisories match your search.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {visible.map((a) => (
                <div
                  key={a.id}
                  className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-6 hover:border-secondary/50 transition-all duration-200 flex flex-col h-full shadow-[0_1px_2px_rgba(2,6,23,0.05)] hover:shadow-[0_1px_2px_rgba(2,6,23,0.05),0_16px_40px_-20px_rgba(2,6,23,0.25)] hover:-translate-y-0.5"
                >
                  <div className="flex justify-between items-start mb-4">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded font-caps-xs text-caps-xs uppercase tracking-wider ${toneClasses[a.tone]}`}>
                      {a.type}
                    </span>
                    <span className="text-on-surface-variant font-label-sm text-label-sm">{a.time}</span>
                  </div>
                  <h4 className="font-headline-md text-headline-md text-on-background mb-3">{a.title}</h4>
                  <p className="font-body-sm text-body-sm text-on-surface-variant mb-6 flex-1">{a.body}</p>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}
