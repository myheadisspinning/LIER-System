import { useState } from 'react';

type Filter = 'All Files' | 'CCTV / Video' | 'Photos' | 'Audio / Voice';

const filters: Filter[] = ['All Files', 'CCTV / Video', 'Photos', 'Audio / Voice'];

interface VaultItem {
  name: string;
  size: string;
  uploaded: string;
  kind: 'video' | 'photo';
  linked: boolean;
  linkedCase?: string;
  duration?: string;
  verified?: boolean;
  autoDelete?: string;
  thumb: string;
}

const items: VaultItem[] = [
  {
    name: 'Visayas_Ave_CCTV_Snippet_Aug6.mp4',
    size: '14.2 MB',
    uploaded: 'Uploaded: Aug 6, 2026',
    kind: 'video',
    linked: true,
    linkedCase: 'BLT-2026-0891',
    duration: '01:45',
    verified: true,
    thumb:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuAe3Xj2sd0Fxuq6NZ7aLkADPR844_kr1yRYPfLEE9eSXBuasjolvIbOLds_ApeZxmin4JGGzQLjnDyX7mnqpJ6I36j_ypuEVDhzOd2BaRnqU4IQGO4kXW_XbjdQxCXYFl0m98yhZpOlfrFimgf-CUcWXvMpbK-m_7Ee2L6FnLLILxDDrzM334DQCKXmS-PCe-HFAz-6i2lszfFaaGKa6hrX8q-ub7N69OzoKozFzyqxSZ2bzb5bnFsC',
  },
  {
    name: 'Street_Light_Damage_Purok3.jpg',
    size: '3.1 MB',
    uploaded: 'Uploaded: Aug 4, 2026',
    kind: 'photo',
    linked: false,
    autoDelete: 'Auto-deletes in 22 Days',
    thumb:
      'https://lh3.googleusercontent.com/aida-public/AB6AXuCCvXnW5zKFDWFvGW1MML9wSqW_6_hDbMI4CwmDkb9qyDPlPr4yIkW8DX6ij24feZ-BcpkxR1I6dT_xRhZ2mYQ9RdJl4RL9zDENjvmQ_tv8JP6cBwRFIitYuvWizwTjOKZiea-U_kaS8yKu9g3fWDq5-x-UWdpw4suBfYZe1Z7ghfPhF6ZyIM3okPZ2_u3Jv4nb_YcV05-0WIyIB_doV2VrLNXKitf7gSWt4yjS2-qidnHBf-seE2_c',
  },
];

export default function EvidenceVault() {
  const [filter, setFilter] = useState<Filter>('All Files');
  const [inspect, setInspect] = useState<VaultItem | null>(null);

  const visible = items.filter((i) => {
    if (filter === 'CCTV / Video') return i.kind === 'video';
    if (filter === 'Photos') return i.kind === 'photo';
    return true;
  });

  return (
    <div className="w-full">
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input
            className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg font-body-sm text-body-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
            placeholder="Search files by name, date, or hash..."
            type="text"
          />
        </div>
        <div className="flex gap-2 overflow-x-auto pb-2 md:pb-0">
          {filters.map((f) => (
            <button
              key={f}
              type="button"
              onClick={() => setFilter(f)}
              className={`px-4 py-2 bg-surface-container-lowest border font-body-sm text-body-sm rounded-lg whitespace-nowrap transition-colors ${
                filter === f ? 'border-primary text-primary' : 'border-outline-variant text-on-surface-variant hover:bg-surface-container-low'
              }`}
            >
              {f}
            </button>
          ))}
        </div>
        <button
          type="button"
          className="bg-gradient-to-r from-primary to-[#2b2b2b] text-on-primary px-6 py-2 rounded-lg flex items-center justify-center gap-2 font-body-sm font-semibold shrink-0 hover:shadow-md transition-all duration-200 active:scale-[0.98]"
        >
          <span className="material-symbols-outlined text-[18px]">upload</span> Upload New File
        </button>
      </div>

      <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-5 shadow-sm mb-8 flex flex-col lg:flex-row lg:items-center gap-5">
        <div className="flex-1">
          <div className="flex justify-between items-end mb-2">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-xs">Storage Used</span>
            <span className="font-body-sm text-body-sm font-semibold">128 MB / 500 MB</span>
          </div>
          <div className="w-full bg-surface-variant rounded-full h-2">
            <div className="bg-gradient-to-r from-secondary to-[#316bf3] h-2 rounded-full" style={{ width: '25.6%' }}></div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">lock</span>
          <span className="font-body-sm text-body-sm text-xs">Unlinked files auto-purge after 30 days.</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/5 border border-secondary/20 text-secondary shrink-0">
          <span className="material-symbols-outlined text-[18px]">shield</span>
          <span className="font-body-sm text-body-sm text-xs font-semibold">2 files unlinked</span>
        </div>
      </div>

      <div className="bg-secondary-fixed text-on-secondary-fixed p-4 rounded-lg border border-secondary-fixed-dim mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="material-symbols-outlined text-secondary">info</span>
          <span className="font-body-sm text-body-sm">You have 2 unlinked media files. Want to attach them to an open incident report?</span>
        </div>
        <button
          type="button"
          className="px-4 py-2 bg-surface-container-lowest text-primary border border-primary font-body-sm text-body-sm rounded font-semibold shrink-0 w-full sm:w-auto"
        >
          Link Files to Open Case
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
        {visible.map((item) => (
          <div
            key={item.name}
            className="bg-surface-container-lowest border border-border-subtle p-6 rounded-2xl shadow-[0_1px_2px_rgba(2,6,23,0.05)] flex flex-col relative group hover:shadow-[0_1px_2px_rgba(2,6,23,0.05),0_16px_40px_-20px_rgba(2,6,23,0.25)] hover:-translate-y-0.5 transition-all duration-200"
          >
            <div className="absolute top-4 right-4 z-10">
              {item.linked ? (
                <span className="px-2 py-1 rounded-full font-label-md text-label-md flex items-center gap-1 shadow-sm bg-surface-container-lowest border border-secondary/20 text-secondary">
                  <span className="material-symbols-outlined text-[12px]">link</span> Linked to Case #{item.linkedCase}
                </span>
              ) : (
                <span className="px-2 py-1 rounded-full font-label-md text-label-md flex items-center gap-1 shadow-sm bg-warning-amber/10 text-warning-amber border border-warning-amber/30">
                  <span className="material-symbols-outlined text-[12px]">warning</span> Unlinked
                </span>
              )}
            </div>
            <div
              className="aspect-video bg-surface-container-highest rounded mb-4 relative overflow-hidden group-hover:opacity-90 transition-opacity cursor-pointer border border-outline-variant"
              onClick={() => setInspect(item)}
            >
              <img className="bg-cover bg-center w-full h-full object-cover" alt={item.name} src={item.thumb} />
              {item.kind === 'video' && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <span className="material-symbols-outlined text-white text-4xl drop-shadow-md">play_circle</span>
                </div>
              )}
              {item.duration && (
                <div className="absolute bottom-2 right-2 bg-on-surface text-on-primary px-1.5 py-0.5 rounded text-xs">{item.duration}</div>
              )}
            </div>
            <h3 className="font-headline-md text-headline-md mb-2 truncate text-[16px]" title={item.name}>
              {item.name}
            </h3>
            <div className="flex flex-wrap gap-2 mb-4">
              <span className="bg-surface-container px-2 py-1 rounded font-body-sm text-[12px] text-on-surface-variant border border-outline-variant">{item.size}</span>
              {item.verified && (
                <span className="px-2 py-1 rounded font-body-sm text-[12px] flex items-center gap-1 border border-success-green/30 text-success-green bg-success-green/10">
                  <span className="material-symbols-outlined text-[14px]">verified</span> SHA-256 Verified
                </span>
              )}
              <span className="bg-surface-container px-2 py-1 rounded font-body-sm text-[12px] text-on-surface-variant border border-outline-variant">{item.uploaded}</span>
            </div>
            {item.autoDelete && (
              <div className="mb-4">
                <span className="text-error px-2 py-1 rounded font-body-sm text-[12px] flex items-center gap-1 bg-error-container border border-error-container w-fit">
                  <span className="material-symbols-outlined text-[14px]">timer</span> {item.autoDelete}
                </span>
              </div>
            )}
            <div className="mt-auto pt-4 border-t border-outline-variant flex justify-between items-center">
              <div className="flex gap-2">
                <button type="button" onClick={() => setInspect(item)} className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[18px]">visibility</span> View
                </button>
                <button type="button" className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-body-sm text-body-sm ml-2">
                  <span className="material-symbols-outlined text-[18px]">download</span> Download
                </button>
              </div>
              {item.linked ? (
                <button type="button" className="text-error hover:text-on-error-container transition-colors flex items-center gap-1 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[18px]">link_off</span> Unlink
                </button>
              ) : (
                <button type="button" className="text-primary hover:text-primary-container font-semibold transition-colors flex items-center gap-1 font-body-sm text-body-sm">
                  <span className="material-symbols-outlined text-[18px]">add</span> Link to Incident
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {inspect && (
        <div className="fixed inset-0 bg-on-surface/80 z-50 flex items-center justify-center p-4 backdrop-blur-sm">
          <div className="bg-surface-container-lowest w-full max-w-4xl rounded-lg shadow-2xl flex flex-col border border-outline-variant max-h-[90vh]">
            <div className="flex justify-between items-center p-4 border-b border-outline-variant">
              <h2 className="font-headline-md text-headline-md text-on-surface truncate pr-4">{inspect.name}</h2>
              <button type="button" className="text-on-surface-variant hover:text-on-surface transition-colors" onClick={() => setInspect(null)}>
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6 bg-surface-container-low">
              <div className="w-full bg-on-surface aspect-video rounded-md border border-outline-variant flex items-center justify-center mb-6 relative shadow-inner">
                <img className="w-full h-full object-cover" alt={inspect.name} src={inspect.thumb} />
                <span className="absolute text-white text-6xl drop-shadow-lg">play_circle</span>
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent flex gap-4 items-center">
                  <span className="material-symbols-outlined text-white">play_arrow</span>
                  <div className="h-1 flex-1 bg-white/50 rounded-full">
                    <div className="h-full w-1/3 bg-primary rounded-full"></div>
                  </div>
                  <span className="text-white text-xs">00:32 / {inspect.duration ?? '--:--'}</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Chain-of-Custody</h4>
                  <div className="mb-3">
                    <label className="block font-body-sm text-xs text-on-surface-variant mb-1">SHA-256 Checksum</label>
                    <div className="bg-surface-container p-2 rounded border border-outline-variant flex justify-between items-center">
                      <span className="text-[11px] text-on-surface break-all">e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855</span>
                      <button type="button" className="text-outline hover:text-primary">
                        <span className="material-symbols-outlined text-[16px]">content_copy</span>
                      </button>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px] mt-0.5">schedule</span>
                      <div>
                        <span className="block font-body-sm text-xs text-on-surface-variant">Recorded Timestamp</span>
                        <span className="text-sm font-semibold">Aug 6, 2026 — 21:14 PST</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 mt-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px] mt-0.5">location_on</span>
                      <div>
                        <span className="block font-body-sm text-xs text-on-surface-variant">Location Metadata</span>
                        <span className="font-body-sm text-sm">Near Purok 3 Hall</span>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm flex flex-col">
                  <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">Case Association</h4>
                  <div className="bg-primary-fixed/30 border border-primary-fixed p-3 rounded mb-4 flex items-center gap-3">
                    <span className="material-symbols-outlined text-primary text-[20px]">link</span>
                    <div>
                      <span className="block font-body-sm text-xs text-primary font-semibold">{inspect.linked ? 'Currently Linked' : 'Not Linked'}</span>
                      <span className="text-sm text-on-surface">
                        {inspect.linked ? `#${inspect.linkedCase} - Vandalism` : 'This file is not associated with a case.'}
                      </span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <label className="block font-body-sm text-xs text-on-surface-variant mb-1">Link to another report</label>
                    <select className="w-full p-2 border border-outline-variant rounded font-body-sm text-body-sm bg-surface-container-lowest mb-3">
                      <option>Select open incident report...</option>
                      <option>#BLT-2026-0902 - Noise Complaint</option>
                    </select>
                    <button type="button" className="w-full bg-surface-container-lowest border border-outline text-on-surface py-2 rounded font-body-sm text-body-sm font-semibold hover:bg-surface-container-low transition-colors">
                      Update Association
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
