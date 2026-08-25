import { useEffect, useMemo, useState } from 'react';
import { supabase } from '../../../supabaseClient';
import { downloadCsv, fmtBytes, logAudit, timeAgo } from '../../../lib/admin';
import type { EvidenceFile } from '../../../lib/ai';
import Toast from '../../../components/Toast';
import { useScrollLock } from '../../../lib/useScrollLock';

type Report = {
  id: string;
  report_no: string | null;
  title: string;
  category: string;
  status: string;
  evidence: EvidenceFile[] | null;
  created_at: string;
};

type AuditRow = { id: string; actor: string; action: string; detail: string | null; created_at: string };

const MEDIA_KIND = (t: string) => (t.startsWith('image') ? 'Photo' : t.startsWith('video') ? 'Video' : t.startsWith('audio') ? 'Audio' : 'File');

export default function AdminEvidenceVault() {
  const [reports, setReports] = useState<Report[]>([]);
  const [audit, setAudit] = useState<AuditRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  useScrollLock(modalOpen);
  const [targetId, setTargetId] = useState('');
  const [files, setFiles] = useState<File[]>([]);
  const [uploading, setUploading] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchAll = async () => {
    const [repRes, audRes] = await Promise.all([
      supabase
        .from('incident_reports')
        .select('id, report_no, title, category, status, evidence, created_at')
        .order('created_at', { ascending: false })
        .limit(200),
      supabase.from('ai_audit_logs').select('id, actor, action, detail, created_at').ilike('detail', '%evidence%').order('created_at', { ascending: false }).limit(20),
    ]);
    return {
      reports: (repRes.data ?? []) as Report[],
      audit: (audRes.data ?? []) as AuditRow[],
      error: repRes.error?.message ?? null,
    };
  };

  useEffect(() => {
    void (async () => {
      const { reports, audit } = await fetchAll();
      setReports(reports);
      setAudit(audit);
      setLoading(false);
    })();
  }, []);

  const allEvidence = useMemo(
    () => reports.flatMap((r) => (r.evidence ?? []).map((e) => ({ ...e, report_no: r.report_no, report_id: r.id, category: r.category }))),
    [reports],
  );

  const stats = useMemo(() => {
    const total = allEvidence.reduce((a, e) => a + (e.size ?? 0), 0);
    return {
      totalFiles: allEvidence.length,
      totalSize: total,
      photos: allEvidence.filter((e) => MEDIA_KIND(e.type) === 'Photo').length,
      videos: allEvidence.filter((e) => MEDIA_KIND(e.type) === 'Video').length,
      linkedReports: reports.filter((r) => (r.evidence ?? []).length > 0).length,
    };
  }, [allEvidence, reports]);

  const selected = useMemo(() => reports.find((r) => r.id === selectedId) ?? null, [reports, selectedId]);

  const exportCsv = () => {
    downloadCsv(
      `evidence-manifest-${new Date().toISOString().slice(0, 10)}.csv`,
      allEvidence.map((e) => ({
        report_no: e.report_no ?? '',
        file: e.name,
        type: MEDIA_KIND(e.type),
        size: fmtBytes(e.size),
        url: e.url,
      })),
    );
  };

  const handleUpload = async () => {
    if (!targetId || files.length === 0) return;
    setUploading(true);
    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();
      if (!session?.user) throw new Error('You must be signed in to upload evidence.');

      const items: EvidenceFile[] = [];
      for (const file of files) {
        const safeName = file.name.replace(/[^\w.-]+/g, '_');
        const path = `${session.user.id}/${crypto.randomUUID()}-${safeName}`;
        const { error } = await supabase.storage.from('evidence').upload(path, file, { cacheControl: '3600', contentType: file.type || 'application/octet-stream' });
        if (error) throw new Error(`Failed to upload ${file.name}: ${error.message}`);
        const { data } = supabase.storage.from('evidence').getPublicUrl(path);
        items.push({ name: file.name, type: file.type, size: file.size, url: data.publicUrl });
      }

      const report = reports.find((r) => r.id === targetId);
      const { error } = await supabase
        .from('incident_reports')
        .update({ evidence: [...(report?.evidence ?? []), ...items] })
        .eq('id', targetId);
      if (error) throw new Error(error.message);

      await logAudit('Evidence upload', `Attached ${items.length} evidence file(s) to ${report?.report_no ?? 'a report'}.`);
      setToast({ type: 'success', message: `${items.length} evidence file(s) attached.` });
      setModalOpen(false);
      setFiles([]);
      const { reports: fresh } = await fetchAll();
      setReports(fresh);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Upload failed.' });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-end">
        <div className="flex gap-3">
          <button type="button" onClick={exportCsv} className="flex items-center gap-2 px-4 py-2 border border-border-subtle rounded-lg text-label-md font-medium text-on-surface hover:bg-surface-variant transition-colors">
            <span className="material-symbols-outlined text-[18px]">download</span>
            Export Manifest (CSV)
          </button>
          <button type="button" onClick={() => setModalOpen(true)} className="flex items-center gap-2 px-4 py-2 bg-secondary text-on-secondary rounded-lg text-label-md font-medium hover:bg-secondary/90 transition-colors">
            <span className="material-symbols-outlined text-[18px]">upload</span>
            Upload Evidence
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-12 text-center text-sm text-on-surface-variant">Loading evidence vault…</div>
      ) : (
        <>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Total Evidence</span>
                <span className="material-symbols-outlined text-on-surface-variant text-lg">inventory_2</span>
              </div>
              <div className="font-headline-md text-headline-md font-bold">{stats.totalFiles} files</div>
              <div className="font-label-sm text-label-sm text-on-surface-variant">{fmtBytes(stats.totalSize)} total</div>
            </div>
            <div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Photos</span>
                <span className="material-symbols-outlined text-on-surface-variant text-lg">photo_camera</span>
              </div>
              <div className="font-headline-md text-headline-md font-bold">{stats.photos}</div>
              <div className="font-label-sm text-label-sm text-on-surface-variant">indexed</div>
            </div>
            <div className="bg-surface-container-lowest border border-border-subtle rounded-lg p-4">
              <div className="flex items-center justify-between mb-2">
                <span className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Video / Audio</span>
                <span className="material-symbols-outlined text-on-surface-variant text-lg">videocam</span>
              </div>
              <div className="font-headline-md text-headline-md font-bold">{stats.videos}</div>
              <div className="font-label-sm text-label-sm text-on-surface-variant">clips</div>
            </div>
            <div className="bg-surface-container-lowest border border-success-green/30 rounded-lg p-4 bg-success-green/5">
              <div className="flex items-center justify-between mb-2">
                <span className="font-caps-xs text-caps-xs text-success-green uppercase tracking-wider">Linked Reports</span>
                <span className="material-symbols-outlined text-success-green text-lg">verified_user</span>
              </div>
              <div className="font-headline-md text-headline-md font-bold text-success-green">{stats.linkedReports}</div>
              <div className="font-label-sm text-label-sm text-success-green font-medium">with attachments</div>
            </div>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Evidence grid */}
            <div className="lg:col-span-2 bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
              <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Evidence Files</h3>
                <span className="text-xs text-on-surface-variant">{allEvidence.length} files</span>
              </div>
              <div className="p-4 max-h-[520px] overflow-y-auto grid grid-cols-2 md:grid-cols-3 gap-3">
                {allEvidence.length === 0 ? (
                  <div className="col-span-full p-12 text-center text-sm text-on-surface-variant">No evidence files yet. Uploads from incident reports appear here.</div>
                ) : (
                  allEvidence.map((e) => (
                    <a key={e.url} href={e.url} target="_blank" rel="noreferrer" onClick={() => setSelectedId(e.report_id)}
                      className="group border border-border-subtle rounded-lg overflow-hidden bg-surface-container-low hover:shadow-md transition-shadow">
                      {e.type.startsWith('image/') ? (
                        <div className="aspect-video bg-slate-100 overflow-hidden">
                          <img src={e.url} alt={e.name} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                        </div>
                      ) : (
                        <div className="aspect-video bg-slate-100 flex flex-col items-center justify-center gap-1 text-on-surface-variant">
                          <span className="material-symbols-outlined text-[28px]">{e.type.startsWith('video') ? 'videocam' : e.type.startsWith('audio') ? 'mic' : 'description'}</span>
                          <span className="text-[10px] font-semibold">{MEDIA_KIND(e.type)}</span>
                        </div>
                      )}
                      <div className="p-2.5">
                        <p className="text-xs font-semibold text-on-surface truncate" title={e.name}>{e.name}</p>
                        <p className="text-[10px] text-on-surface-variant">{e.report_no ?? '—'} · {fmtBytes(e.size)}</p>
                      </div>
                    </a>
                  ))
                )}
              </div>
            </div>

            {/* Detail / chain of custody */}
            <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm flex flex-col">
              <div className="px-5 py-4 border-b border-border-subtle">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Chain of Custody</h3>
              </div>
              <div className="flex-1 p-5 overflow-y-auto max-h-[520px] space-y-4">
                {audit.map((a) => (
                  <div key={a.id} className="flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-secondary mt-2 shrink-0"></span>
                    <div>
                      <p className="text-body-sm text-on-surface"><span className="font-semibold">{a.actor}</span> · {a.action}</p>
                      <p className="text-xs text-on-surface-variant">{a.detail ?? '—'}</p>
                      <p className="text-[11px] text-on-surface-variant/70 mt-0.5">{timeAgo(a.created_at)}</p>
                    </div>
                  </div>
                ))}
                {audit.length === 0 && <p className="text-sm text-on-surface-variant">No custody records yet.</p>}
              </div>
            </div>
          </div>
        </>
      )}

      {modalOpen && (
        <div className="fixed inset-0 z-[120] bg-black/50 flex items-center justify-center p-4">
          <div className="bg-surface-container-lowest rounded-xl border border-border-subtle shadow-xl w-full max-w-2xl">
            <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Upload Evidence</h3>
              <button type="button" onClick={() => setModalOpen(false)} className="text-on-surface-variant hover:text-on-surface" aria-label="Close">
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Attach to incident report</label>
                <select
                  className="w-full bg-surface-container-low border border-border-subtle rounded-md px-3 py-2 text-body-sm text-on-surface focus:outline-none focus:border-secondary"
                  value={targetId}
                  onChange={(e) => setTargetId(e.target.value)}
                >
                  <option value="">Select a report…</option>
                  {reports.map((r) => (
                    <option key={r.id} value={r.id}>{r.report_no ?? 'Report'} — {r.title}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs text-on-surface-variant mb-1.5">Files</label>
                <input
                  type="file"
                  multiple
                  accept="image/*,video/*,audio/*"
                  onChange={(e) => setFiles(Array.from(e.target.files ?? []))}
                  className="w-full text-body-sm"
                />
              </div>
              <button
                type="button"
                disabled={uploading || !targetId || files.length === 0}
                onClick={handleUpload}
                className="w-full bg-secondary text-on-secondary rounded-lg py-2 text-label-md font-medium hover:bg-secondary/90 disabled:opacity-50 transition-colors"
              >
                {uploading ? 'Uploading…' : `Upload ${files.length} file${files.length === 1 ? '' : 's'}`}
              </button>
            </div>
          </div>
        </div>
      )}

      {selected && (
        <div className="fixed bottom-8 right-8 bg-surface-container-high text-on-surface px-4 py-3 rounded-lg shadow-lg text-sm z-[130]">
          {selected.report_no} — {selected.title}
          <button type="button" onClick={() => setSelectedId(null)} className="ml-3 text-on-surface-variant hover:text-on-surface">✕</button>
        </div>
      )}
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
