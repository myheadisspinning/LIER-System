import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { supabase } from '../../../supabaseClient';
import { uploadEvidence } from '../../../lib/ai';
import Toast from '../../../components/Toast';
import { useScrollLock } from '../../../lib/useScrollLock';

type Filter = 'All Files' | 'CCTV / Video' | 'Photos' | 'Audio / Voice';

const filters: Filter[] = ['All Files', 'CCTV / Video', 'Photos', 'Audio / Voice'];

interface VaultItem {
  name: string;
  size: string;
  uploaded: string;
  kind: 'video' | 'photo' | 'audio';
  linked: boolean;
  linkedCase?: string;
  linkedReportTitle?: string;
  linkedReportStatus?: string;
  duration?: string;
  verified?: boolean;
  autoDelete?: string;
  thumb: string;
  url: string;
  reportId?: string;
  fileSize: number;
}

interface ReportEvidence {
  id: string;
  report_no: string;
  title: string;
  status: string;
  evidence: Array<{
    name: string;
    type: string;
    size: number;
    url: string;
  }>;
  created_at: string;
}

const getKind = (type: string): 'video' | 'photo' | 'audio' => {
  if (type.startsWith('video/')) return 'video';
  if (type.startsWith('image/')) return 'photo';
  return 'audio';
};

const formatSize = (bytes: number): string => {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr);
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
};

export default function EvidenceVault() {
  const [filter, setFilter] = useState<Filter>('All Files');
  const [search, setSearch] = useState('');
  const [inspect, setInspect] = useState<VaultItem | null>(null);

  useScrollLock(inspect != null);
  const [items, setItems] = useState<VaultItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          if (!cancelled) setLoading(false);
          return;
        }

        const { data: reports, error } = await supabase
          .from('incident_reports')
          .select('id, report_no, title, status, evidence, created_at')
          .eq('user_id', session.user.id)
          .order('created_at', { ascending: false });

        if (error) throw error;

        const evidenceItems: VaultItem[] = [];
        (reports || []).forEach((report: ReportEvidence) => {
          if (report.evidence && report.evidence.length > 0) {
            report.evidence.forEach((file) => {
              evidenceItems.push({
                name: file.name,
                size: formatSize(file.size),
                uploaded: `Uploaded: ${formatDate(report.created_at)}`,
                kind: getKind(file.type),
                linked: true,
                linkedCase: report.report_no,
                linkedReportTitle: report.title,
                linkedReportStatus: report.status,
                thumb: file.type.startsWith('image/') ? file.url : '',
                url: file.url,
                reportId: report.id,
                fileSize: file.size,
              });
            });
          }
        });

        if (!cancelled) setItems(evidenceItems);
      } catch (error) {
        console.error('Error fetching evidence:', error);
        if (!cancelled) setToast({ type: 'error', message: 'Failed to load evidence files' });
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    setUploading(true);
    try {
      const fileArray = Array.from(files);
      const uploadedFiles = await uploadEvidence(fileArray);

      const newItems: VaultItem[] = uploadedFiles.map((file) => ({
        name: file.name,
        size: formatSize(file.size),
        uploaded: `Uploaded: ${formatDate(new Date().toISOString())}`,
        kind: getKind(file.type),
        linked: false,
        autoDelete: 'Auto-deletes in 30 Days',
        thumb: file.type.startsWith('image/') ? file.url : '',
        url: file.url,
        fileSize: file.size,
      }));

      setItems((prev) => [...newItems, ...prev]);
      setToast({ type: 'success', message: `${uploadedFiles.length} file(s) uploaded successfully` });
    } catch (error) {
      console.error('Upload error:', error);
      setToast({ type: 'error', message: error instanceof Error ? error.message : 'Upload failed' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleDownload = async (item: VaultItem) => {
    try {
      const link = document.createElement('a');
      link.href = item.url;
      link.download = item.name;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Download error:', error);
      setToast({ type: 'error', message: 'Download failed' });
    }
  };

  const handleView = (item: VaultItem) => {
    window.open(item.url, '_blank');
  };

  const totalBytes = items.reduce((sum, item) => sum + item.fileSize, 0);
  const totalMB = (totalBytes / (1024 * 1024)).toFixed(1);
  const percentage = ((totalBytes / (500 * 1024 * 1024)) * 100).toFixed(1);
  const unlinkedCount = items.filter((item) => !item.linked).length;

  const visible = items.filter((i) => {
    const matchesFilter =
      filter === 'All Files' ||
      (filter === 'CCTV / Video' && i.kind === 'video') ||
      (filter === 'Photos' && i.kind === 'photo') ||
      (filter === 'Audio / Voice' && i.kind === 'audio');

    const matchesSearch =
      search === '' ||
      i.name.toLowerCase().includes(search.toLowerCase()) ||
      i.uploaded.toLowerCase().includes(search.toLowerCase());

    return matchesFilter && matchesSearch;
  });

  return (
    <div className="w-full">
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}

      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <div className="relative flex-1">
          <span className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-outline">search</span>
          <input
            className="w-full pl-10 pr-4 py-2 border border-outline-variant rounded-lg font-body-sm text-body-sm bg-surface-container-lowest focus:outline-none focus:ring-2 focus:ring-secondary/20 focus:border-secondary"
            placeholder="Search files by name, date, or hash..."
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
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
        <label className="bg-gradient-to-r from-primary to-[#2b2b2b] text-on-primary px-6 py-2 rounded-lg flex items-center justify-center gap-2 font-body-sm font-semibold shrink-0 hover:shadow-md transition-all duration-200 active:scale-[0.98] cursor-pointer">
          <span className="material-symbols-outlined text-[18px]">{uploading ? 'hourglass_empty' : 'upload'}</span>
          {uploading ? 'Uploading...' : 'Upload New File'}
          <input type="file" multiple accept="image/*,video/*,audio/*" onChange={handleUpload} className="hidden" disabled={uploading} />
        </label>
      </div>

      <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-5 shadow-sm mb-8 flex flex-col lg:flex-row lg:items-center gap-5">
        <div className="flex-1">
          <div className="flex justify-between items-end mb-2">
            <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider text-xs">Storage Used</span>
            <span className="font-body-sm text-body-sm font-semibold">{totalMB} MB / 500 MB</span>
          </div>
          <div className="w-full bg-surface-variant rounded-full h-2">
            <div className="bg-gradient-to-r from-secondary to-[#316bf3] h-2 rounded-full" style={{ width: `${Math.min(parseFloat(percentage), 100)}%` }}></div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0 text-on-surface-variant">
          <span className="material-symbols-outlined text-[18px]">lock</span>
          <span className="font-body-sm text-body-sm text-xs">Unlinked files auto-purge after 30 days.</span>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-secondary/5 border border-secondary/20 text-secondary shrink-0">
          <span className="material-symbols-outlined text-[18px]">shield</span>
          <span className="font-body-sm text-body-sm text-xs font-semibold">{unlinkedCount} file{unlinkedCount !== 1 ? 's' : ''} unlinked</span>
        </div>
      </div>

      {unlinkedCount > 0 && (
        <div className="bg-secondary-fixed text-on-secondary-fixed p-4 rounded-lg border border-secondary-fixed-dim mb-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary">info</span>
            <span className="font-body-sm text-body-sm">You have {unlinkedCount} unlinked media file{unlinkedCount !== 1 ? 's' : ''}. Want to attach {unlinkedCount !== 1 ? 'them' : 'it'} to an open incident report?</span>
          </div>
          <button
            type="button"
            className="px-4 py-2 bg-surface-container-lowest text-primary border border-primary font-body-sm text-body-sm rounded font-semibold shrink-0 w-full sm:w-auto"
          >
            Link Files to Open Case
          </button>
        </div>
      )}

      {loading ? (
        <div className="flex items-center justify-center py-12">
          <span className="material-symbols-outlined text-4xl text-secondary animate-spin">progress_activity</span>
        </div>
      ) : visible.length === 0 ? (
        <div className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-12 text-center">
          <span className="material-symbols-outlined text-6xl text-on-surface-variant mb-4">folder_open</span>
          <p className="font-headline-md text-headline-md text-on-surface mb-2">No evidence files found</p>
          <p className="font-body-sm text-body-sm text-on-surface-variant">Upload files to get started</p>
        </div>
      ) : (
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
                {item.thumb ? (
                  <img className="bg-cover bg-center w-full h-full object-cover" alt={item.name} src={item.thumb} />
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="material-symbols-outlined text-6xl text-on-surface-variant">
                      {item.kind === 'video' ? 'videocam' : item.kind === 'audio' ? 'mic' : 'image'}
                    </span>
                  </div>
                )}
                {item.kind === 'video' && item.thumb && (
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
                  <button type="button" onClick={() => handleView(item)} className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-body-sm text-body-sm">
                    <span className="material-symbols-outlined text-[18px]">visibility</span> View
                  </button>
                  <button type="button" onClick={() => handleDownload(item)} className="text-on-surface-variant hover:text-primary transition-colors flex items-center gap-1 font-body-sm text-body-sm ml-2">
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
      )}

      {inspect && createPortal(
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
                {inspect.thumb ? (
                  <img className="w-full h-full object-cover" alt={inspect.name} src={inspect.thumb} />
                ) : (
                  <span className="material-symbols-outlined text-white text-6xl drop-shadow-lg">
                    {inspect.kind === 'video' ? 'videocam' : inspect.kind === 'audio' ? 'mic' : 'image'}
                  </span>
                )}
                {inspect.kind === 'video' && inspect.thumb && (
                  <>
                    <span className="absolute text-white text-6xl drop-shadow-lg">play_circle</span>
                    <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/70 to-transparent flex gap-4 items-center">
                      <span className="material-symbols-outlined text-white">play_arrow</span>
                      <div className="h-1 flex-1 bg-white/50 rounded-full">
                        <div className="h-full w-1/3 bg-primary rounded-full"></div>
                      </div>
                      <span className="text-white text-xs">00:32 / {inspect.duration ?? '--:--'}</span>
                    </div>
                  </>
                )}
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-surface-container-lowest border border-outline-variant rounded-xl p-6 shadow-sm">
                  <h4 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider mb-4 border-b border-outline-variant pb-2">File Details</h4>
                  <div className="flex flex-col gap-2">
                    <div className="flex items-start gap-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px] mt-0.5">description</span>
                      <div>
                        <span className="block font-body-sm text-xs text-on-surface-variant">File Name</span>
                        <span className="text-sm font-semibold">{inspect.name}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 mt-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px] mt-0.5">data_usage</span>
                      <div>
                        <span className="block font-body-sm text-xs text-on-surface-variant">File Size</span>
                        <span className="font-body-sm text-sm">{inspect.size}</span>
                      </div>
                    </div>
                    <div className="flex items-start gap-2 mt-2">
                      <span className="material-symbols-outlined text-on-surface-variant text-[16px] mt-0.5">schedule</span>
                      <div>
                        <span className="block font-body-sm text-xs text-on-surface-variant">Uploaded</span>
                        <span className="text-sm font-semibold">{inspect.uploaded}</span>
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
                        {inspect.linked ? (
                          <>
                            #{inspect.linkedCase} - {inspect.linkedReportTitle}
                          </>
                        ) : (
                          'This file is not associated with a case.'
                        )}
                      </span>
                    </div>
                  </div>
                  <div className="mt-auto">
                    <label className="block font-body-sm text-xs text-on-surface-variant mb-1">Link to another report</label>
                    <select className="w-full p-2 border border-outline-variant rounded font-body-sm text-body-sm bg-surface-container-lowest mb-3">
                      <option>Select open incident report...</option>
                    </select>
                    <button type="button" className="w-full bg-surface-container-lowest border border-outline text-on-surface py-2 rounded font-body-sm text-body-sm font-semibold hover:bg-surface-container-low transition-colors">
                      Update Association
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
}
