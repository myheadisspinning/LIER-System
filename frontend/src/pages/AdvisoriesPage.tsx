import { useEffect, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import Pagination from '../components/Pagination';
import { useScrollLock } from '../lib/useScrollLock';

const PAGE_SIZE = 6;

type Category = 'All' | 'Emergency & Crime' | 'Weather & Floods' | 'Barangay Services' | 'Public Safety';

const categories: Category[] = ['All', 'Emergency & Crime', 'Weather & Floods', 'Barangay Services', 'Public Safety'];

interface Advisory {
  id: string;
  category: Category;
  tone: 'red' | 'blue' | 'green' | 'safety';
  time: string;
  title: string;
  body: string;
  type: string;
  audience: string;
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
  if (secs < 60) return 'Just now';
  if (secs < 3600) return `${Math.floor(secs / 60)}m ago`;
  if (secs < 86400) return `${Math.floor(secs / 3600)}h ago`;
  return new Date(iso).toLocaleDateString('en-PH', { month: 'short', day: 'numeric', year: 'numeric' });
};

const TRUNCATE_LEN = 150;

export default function AdvisoriesPage() {
  const [advisories, setAdvisories] = useState<Advisory[]>([]);
  const [loading, setLoading] = useState(true);
  const [category, setCategory] = useState<Category>('All');
  const [query, setQuery] = useState('');
  const [selectedAdvisory, setSelectedAdvisory] = useState<Advisory | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const listTopRef = useRef<HTMLDivElement>(null);

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
        time: timeAgo(b.sent_at ?? ''),
        title: b.title,
        body: b.message,
        type: b.type,
        audience: b.audience,
        image_url: b.image_url ?? null,
      })) as Advisory[];
      setAdvisories(rows);
      setLoading(false);
    })();
  }, []);

  const visible = advisories.filter((a) => {
    const matchesCategory = category === 'All' || a.category === category;
    const matchesQuery =
      query.trim() === '' ||
      a.title.toLowerCase().includes(query.toLowerCase()) ||
      a.body.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  const totalPages = Math.max(1, Math.ceil(visible.length / PAGE_SIZE));
  const safePage = Math.min(currentPage, totalPages);
  const displayed = visible.slice((safePage - 1) * PAGE_SIZE, safePage * PAGE_SIZE);

  useEffect(() => {
    setCurrentPage(1);
  }, [category, query, advisories]);

  const handlePageChange = (page: number) => {
    setCurrentPage(page);
    listTopRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col">
      <SiteHeader active="/advisories" />

      <section className="pt-20 pb-8 md:pb-10 bg-primary-container">
          <div className="max-w-7xl mx-auto px-4 md:px-margin-desktop text-center">
          <div className="inline-flex items-center gap-sm bg-white/15 backdrop-blur-sm px-md py-xs rounded-full mb-base">
            <span className="material-symbols-outlined text-sm text-white">notifications_active</span>
            <span className="text-white font-label-md text-xs tracking-wider uppercase font-bold">Official Advisories</span>
          </div>
          <h1 className="font-display-lg text-3xl md:text-5xl text-white font-bold mb-sm">Community Alerts &amp; Advisories</h1>
          <p className="font-body-md text-surface-container-low/80 max-w-2xl mx-auto">Stay informed with official announcements, emergency alerts, and community updates from Barangay Culiat.</p>
        </div>
      </section>

      <section className="py-xl flex-1">
        <div className="max-w-7xl mx-auto px-4 md:px-margin-desktop">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle p-4 flex flex-col md:flex-row justify-between items-center mb-8 md:mb-12 gap-4 shadow-sm">
            <div className="flex flex-wrap gap-2">
              {categories.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCategory(c)}
                  className={`px-4 py-1.5 rounded-lg font-label-md text-label-md transition-colors ${
                    category === c
                      ? 'bg-secondary text-on-secondary hover:bg-secondary/90'
                      : 'bg-surface-container-low text-on-surface-variant border border-border-subtle hover:bg-surface-container'
                  }`}
                >
                  {c}
                </button>
              ))}
            </div>
            <div className="relative w-full md:w-auto">
              <span className="material-symbols-outlined text-on-surface-variant absolute left-3 top-1/2 -translate-y-1/2 text-lg">search</span>
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="w-full md:w-64 bg-surface-container-low border border-border-subtle rounded-lg pl-10 pr-3 py-2 text-sm focus:outline-none focus:border-secondary"
                placeholder="Search advisories..."
                type="text"
              />
            </div>
          </div>

          {loading ? (
            <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-6 md:p-12 text-center text-sm text-on-surface-variant shadow-sm">Loading advisories...</div>
          ) : advisories.length === 0 ? (
            <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-6 md:p-12 text-center text-on-surface-variant shadow-sm">
              <span className="material-symbols-outlined text-4xl text-on-surface-variant/40 mb-3 block">notifications_off</span>
              <p className="font-body-md">No official advisories have been published yet.</p>
            </div>
          ) : visible.length === 0 ? (
            <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-6 md:p-10 text-center shadow-sm">
              <p className="text-on-surface-variant">No advisories match your search.</p>
            </div>
          ) : (
            <>
            <div ref={listTopRef} className="scroll-mt-24" />
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
              {displayed.map((a) => {
                const needsTruncate = a.body.length > TRUNCATE_LEN;
                return (
                  <div
                    key={a.id}
                    className="bg-surface-container-lowest border border-border-subtle rounded-2xl overflow-hidden hover:border-secondary/50 transition-all duration-200 flex flex-col h-full shadow-sm hover:shadow-md hover:-translate-y-0.5"
                  >
                    {a.image_url && (
                      <div className="h-28 md:h-36 overflow-hidden">
                        <img src={a.image_url} alt={a.title} className="w-full h-full object-cover" />
                      </div>
                    )}
                    <div className="p-4 md:p-6 flex flex-col flex-1">
                      <div className="flex justify-between items-start mb-3 md:mb-4">
                        <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg font-caps-xs text-caps-xs uppercase tracking-wider ${toneClasses[a.tone]}`}>
                          <span className="material-symbols-outlined text-[14px]">{iconFor(a.type)}</span>
                          {a.type}
                        </span>
                        <span className="text-on-surface-variant font-label-sm text-label-sm">{a.time}</span>
                      </div>
                      <h3 className="font-headline-md text-lg md:text-xl text-on-surface font-bold mb-2">{a.title}</h3>
                      <p className={`font-body-sm text-on-surface-variant flex-1 leading-relaxed ${needsTruncate ? 'line-clamp-2 md:line-clamp-3' : ''}`}>{a.body}</p>
                      {needsTruncate && (
                        <button
                          type="button"
                          onClick={() => setSelectedAdvisory(a)}
                          className="mt-2 text-secondary font-label-sm text-label-sm font-semibold hover:underline text-left"
                        >
                          View More
                        </button>
                      )}
                      <div className="mt-3 md:mt-4 pt-3 border-t border-border-subtle">
                        <span className="text-[11px] text-on-surface-variant/60 font-label-sm">{a.audience}</span>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
            <div className="mt-4 md:mt-6 rounded-xl border border-border-subtle overflow-hidden">
              <Pagination
                currentPage={safePage}
                totalPages={totalPages}
                itemsPerPage={PAGE_SIZE}
                onPageChange={handlePageChange}
                onItemsPerPageChange={() => {}}
                totalItems={visible.length}
                startIndex={(safePage - 1) * PAGE_SIZE}
                endIndex={safePage * PAGE_SIZE}
                hidePerPage
              />
            </div>
            </>
          )}
        </div>
      </section>

      {selectedAdvisory && (
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
                  {selectedAdvisory.time} -+ {selectedAdvisory.audience}
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
        </div>
      )}

      <SiteFooter />
    </div>
  );
}
