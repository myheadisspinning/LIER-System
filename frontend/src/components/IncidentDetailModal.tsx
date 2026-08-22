import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import { fmtDate, PRIORITY_BADGE, STATUS_BADGE } from '../lib/admin';
import { useScrollLock } from '../lib/useScrollLock';

type EvidenceItem = { name: string; type: string; size: number; url: string };

type DetailRow = {
  id: string;
  report_no: string | null;
  title: string;
  description: string | null;
  additional_context: string | null;
  category: string;
  priority: string;
  status: string;
  incident_status: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  incident_time: string | null;
  created_at: string;
  assigned_at: string | null;
  resolved_at: string | null;
  status_updated_at: string | null;
  ai_dispatch: string | null;
  ai_actions: string[];
  confidence: number | null;
  threat: number | null;
  anonymous: boolean;
  evidence: EvidenceItem[];
  dispatch_unit_name: string | null;
  user_id: string | null;
};

type ReporterProfile = {
  id: string;
  fullname: string;
  phone: string | null;
  address: string | null;
  emergency_contact_name: string | null;
  emergency_contact_relationship: string | null;
  emergency_contact_phone: string | null;
};

const INCIDENT_STATUS_STYLES: Record<string, string> = {
  Ongoing: 'bg-error-red/10 text-error-red',
  Happened: 'bg-warning-amber/10 text-warning-amber',
  Unconfirmed: 'bg-slate-100 text-slate-600',
};

const meterColor = (v: number) => (v >= 70 ? 'bg-error-red' : v >= 40 ? 'bg-warning-amber' : 'bg-secondary');

function Meter({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <div className="flex justify-between text-xs mb-1">
        <span className="text-on-surface-variant">{label}</span>
        <span className="font-semibold text-on-surface">{value}%</span>
      </div>
      <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
        <div className={`h-full rounded-full ${meterColor(value)}`} style={{ width: `${value}%` }}></div>
      </div>
    </div>
  );
}

export default function IncidentDetailModal({
  reportId,
  onClose,
  unmaskAnonymous = false,
}: {
  reportId: string | null;
  onClose: () => void;
  unmaskAnonymous?: boolean;
}) {
  const navigate = useNavigate();
  const [detail, setDetail] = useState<DetailRow | null>(null);
  const [detailId, setDetailId] = useState<string | null>(null);
  const [reporter, setReporter] = useState<{ id: string; profile: ReporterProfile } | null>(null);
  const [failure, setFailure] = useState<{ id: string; message: string } | null>(null);

  useEffect(() => {
    if (!reportId) return undefined;
    let cancelled = false;
    void (async () => {
      const res = await supabase
        .from('incident_reports')
        .select('id, report_no, title, description, additional_context, category, priority, status, incident_status, address, lat, lng, incident_time, created_at, assigned_at, resolved_at, status_updated_at, ai_dispatch, ai_actions, confidence, threat, anonymous, evidence, dispatch_unit:dispatch_unit_id(name), user_id')
        .eq('id', reportId)
        .maybeSingle();
      if (cancelled) return;
      if (res.error || !res.data) {
        setFailure({ id: reportId, message: res.error?.message ?? 'Incident not found.' });
        return;
      }
      const raw = res.data as unknown as Omit<DetailRow, 'dispatch_unit_name' | 'evidence' | 'ai_actions'> & {
        dispatch_unit: { name: string } | { name: string }[] | null;
        evidence: EvidenceItem[] | null;
        ai_actions: string[] | null;
      };
      const embed = raw.dispatch_unit;
      setDetail({
        ...raw,
        dispatch_unit_name: (Array.isArray(embed) ? embed[0]?.name : embed?.name) ?? null,
        evidence: raw.evidence ?? [],
        ai_actions: raw.ai_actions ?? [],
      });
      setDetailId(reportId);
      if (raw.user_id && (!raw.anonymous || unmaskAnonymous)) {
        const { data: profile } = await supabase
          .from('public_users')
          .select('id, fullname, phone, address, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone')
          .eq('id', raw.user_id)
          .maybeSingle();
        if (!cancelled && profile) setReporter({ id: reportId, profile: profile as ReporterProfile });
      } else {
        setReporter(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [reportId, unmaskAnonymous]);

  useEffect(() => {
    if (!reportId) return undefined;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [reportId, onClose]);

  useScrollLock(!!reportId);

  if (!reportId) return null;

  const active = detailId === reportId ? detail : null;
  const activeReporter = reporter?.id === reportId ? reporter.profile : null;
  const activeError = failure?.id === reportId ? failure.message : '';
  const loading = !active && !activeError;

  const timeline = active
    ? [
        { label: 'Reported', ts: active.created_at },
        { label: 'Assigned to unit', ts: active.assigned_at },
        { label: 'Last status update', ts: active.status_updated_at },
        { label: 'Closed', ts: active.resolved_at },
      ].filter((t): t is { label: string; ts: string } => t.ts != null)
    : [];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm p-4" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-2xl w-full max-w-3xl max-h-[88vh] flex flex-col animate-dialog-in"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-5 border-b border-border-subtle flex justify-between items-start gap-4 shrink-0">
          <div className="min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-[11px] font-bold text-blue-600 uppercase tracking-wider">{active?.report_no ?? '—'}</span>
              {active && (
                <>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_BADGE[active.priority] ?? ''}`}>{active.priority}</span>
                  <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${STATUS_BADGE[active.status] ?? 'bg-slate-100 text-slate-600'}`}>{active.status}</span>
                </>
              )}
            </div>
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface mt-1 truncate">{active?.title ?? 'Loading incident…'}</h3>
          </div>
          <button type="button" onClick={onClose} aria-label="Close" className="text-on-surface-variant hover:text-on-surface shrink-0">
            <span className="material-symbols-outlined">close</span>
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5 space-y-5">
          {loading && <div className="py-12 text-center text-sm text-on-surface-variant">Loading full details…</div>}
          {!loading && activeError && <div className="py-12 text-center text-sm text-error-red">{activeError}</div>}

          {!loading && active && (
            <>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-x-6 gap-y-4">
                <div>
                  <p className="text-xs text-on-surface-variant">Category</p>
                  <p className="text-sm text-on-surface font-medium">{active.category}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Severity</p>
                  <p className="text-sm font-semibold">{active.priority}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Incident Status</p>
                  <p><span className={`inline-block px-2 py-0.5 rounded-full text-xs font-semibold ${INCIDENT_STATUS_STYLES[active.incident_status] ?? 'bg-slate-100 text-slate-600'}`}>{active.incident_status}</span></p>
                </div>
                <div className="col-span-2 md:col-span-1">
                  <p className="text-xs text-on-surface-variant">Location</p>
                  <p className="text-sm text-on-surface">{active.address ?? 'No address'}</p>
                  {active.lat != null && active.lng != null && (
                    <p className="text-[11px] text-on-surface-variant mt-0.5">{active.lat.toFixed(5)}, {active.lng.toFixed(5)}</p>
                  )}
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Time Reported</p>
                  <p className="text-sm text-on-surface">{fmtDate(active.created_at, 'medium')}</p>
                </div>
                <div>
                  <p className="text-xs text-on-surface-variant">Responder Unit</p>
                  <p className="text-sm text-on-surface">{active.dispatch_unit_name ?? '—'}</p>
                </div>
              </div>

              {(active.description || active.additional_context) && (
                <div className="bg-surface-container-low rounded-lg border border-border-subtle p-4 space-y-3">
                  {active.description && (
                    <div>
                      <p className="text-xs text-on-surface-variant mb-1">Description</p>
                      <p className="text-sm text-on-surface leading-relaxed">{active.description}</p>
                    </div>
                  )}
                  {active.additional_context && (
                    <div>
                      <p className="text-xs text-on-surface-variant mb-1">Additional Context</p>
                      <p className="text-sm text-on-surface leading-relaxed">{active.additional_context}</p>
                    </div>
                  )}
                </div>
              )}

              {(active.ai_dispatch || active.ai_actions.length > 0 || active.confidence != null || active.threat != null) && (
                <div>
                  <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-3">AI Assessment</h4>
                  <div className="bg-surface-container-low rounded-lg border border-border-subtle p-4 space-y-4">
                    {active.ai_dispatch && (
                      <div className="flex items-start gap-2">
                        <span className="material-symbols-outlined text-[18px] text-secondary mt-0.5">smart_toy</span>
                        <p className="text-sm text-on-surface">{active.ai_dispatch}</p>
                      </div>
                    )}
                    {active.ai_actions.length > 0 && (
                      <ul className="space-y-1.5">
                        {active.ai_actions.map((a) => (
                          <li key={a} className="flex items-start gap-1.5 text-sm text-on-surface">
                            <span className="material-symbols-outlined text-[14px] text-success-green mt-0.5">check_circle</span>
                            {a}
                          </li>
                        ))}
                      </ul>
                    )}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                      {active.confidence != null && <Meter label="AI Confidence" value={active.confidence} />}
                      {active.threat != null && <Meter label="Threat Score" value={active.threat} />}
                    </div>
                  </div>
                </div>
              )}

              {timeline.length > 0 && (
                <div>
                  <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-3">Case Timeline</h4>
                  <ol className="relative border-l-2 border-border-subtle ml-2 space-y-4">
                    {timeline.map((t) => (
                      <li key={`${t.label}-${t.ts}`} className="ml-4">
                        <span className={`absolute -left-[7px] w-3 h-3 rounded-full border-2 border-white ${t.label === 'Closed' ? 'bg-success-green' : t.label === 'Reported' ? 'bg-secondary' : 'bg-outline-variant'}`}></span>
                        <p className="text-sm font-medium text-on-surface">{t.label}</p>
                        <p className="text-xs text-on-surface-variant">{fmtDate(t.ts, 'medium')}</p>
                      </li>
                    ))}
                  </ol>
                </div>
              )}

              <div>
                <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-3">Reporter Info</h4>
                {active.anonymous && !unmaskAnonymous ? (
                  <div className="bg-surface-container-low rounded-lg border border-border-subtle p-4 flex items-center gap-2 text-sm text-on-surface-variant">
                    <span className="material-symbols-outlined text-[18px]">visibility_off</span>
                    Anonymous report — reporter identity withheld.
                  </div>
                ) : activeReporter ? (
                  <div className={`bg-surface-container-low rounded-lg border p-4 space-y-3 ${active.anonymous ? 'border-warning-amber/40' : 'border-border-subtle'}`}>
                    {active.anonymous && (
                      <p className="flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-warning-amber">
                        <span className="material-symbols-outlined text-[14px]">admin_panel_settings</span>
                        Identity unmasked · Superadmin privilege
                      </p>
                    )}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-on-surface-variant">Name</p>
                        <p className="text-sm text-on-surface font-medium">{activeReporter.fullname}</p>
                      </div>
                      <div>
                        <p className="text-xs text-on-surface-variant">Phone</p>
                        <p className="text-sm text-on-surface font-medium">{activeReporter.phone ? `+63 ${activeReporter.phone}` : '—'}</p>
                      </div>
                      <div className="col-span-2">
                        <p className="text-xs text-on-surface-variant">Address</p>
                        <p className="text-sm text-on-surface font-medium">{activeReporter.address || '—'}</p>
                      </div>
                    </div>
                    {activeReporter.emergency_contact_name && (
                      <div className="pt-3 border-t border-border-subtle">
                        <p className="text-xs text-error-red font-semibold uppercase mb-2 flex items-center gap-1">
                          <span className="material-symbols-outlined text-[14px]">emergency</span>
                          Emergency Contact
                        </p>
                        <div className="grid grid-cols-3 gap-4">
                          <div>
                            <p className="text-xs text-on-surface-variant">Name</p>
                            <p className="text-sm text-on-surface font-medium">{activeReporter.emergency_contact_name}</p>
                          </div>
                          <div>
                            <p className="text-xs text-on-surface-variant">Relationship</p>
                            <p className="text-sm text-on-surface font-medium capitalize">{activeReporter.emergency_contact_relationship}</p>
                          </div>
                          <div>
                            <p className="text-xs text-on-surface-variant">Phone</p>
                            <p className="text-sm text-on-surface font-medium">{activeReporter.emergency_contact_phone ? `+63 ${activeReporter.emergency_contact_phone}` : '—'}</p>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-surface-container-low rounded-lg border border-border-subtle p-4 text-sm text-on-surface-variant">No reporter information available.</div>
                )}
              </div>

              <div>
                <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-3">Evidence ({active.evidence.length})</h4>
                {active.evidence.length > 0 ? (
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {active.evidence.map((ev) =>
                      ev.type.startsWith('image/') ? (
                        <a key={ev.url} href={ev.url} target="_blank" rel="noreferrer" className="aspect-square bg-surface-container-highest rounded-md border border-border-subtle overflow-hidden group relative block">
                          <img className="w-full h-full object-cover" src={ev.url} alt={ev.name} />
                          <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity">
                            <span className="material-symbols-outlined text-white">zoom_in</span>
                          </div>
                        </a>
                      ) : (
                        <a key={ev.url} href={ev.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-border-subtle bg-surface-container-low hover:bg-surface-container-highest transition-colors text-on-surface-variant h-fit">
                          <span className="material-symbols-outlined text-[16px]">{ev.type.startsWith('video') ? 'videocam' : 'mic'}</span>
                          <span className="text-[10px] font-semibold truncate">{ev.name}</span>
                        </a>
                      ),
                    )}
                  </div>
                ) : (
                  <div className="bg-surface-container-low rounded-lg border border-border-subtle p-4 text-sm text-on-surface-variant">No evidence attached.</div>
                )}
              </div>
            </>
          )}
        </div>

        <div className="p-4 border-t border-border-subtle flex justify-end gap-2 shrink-0">
          <button
            type="button"
            onClick={onClose}
            className="bg-surface-container-low hover:bg-surface-container-high border border-border-subtle text-on-surface font-label-md text-label-md py-2 px-4 rounded-md transition-colors"
          >
            Close
          </button>
          <button
            type="button"
            onClick={() => navigate(`/admin/incident-reporting?case=${reportId}`)}
            disabled={!active}
            className="bg-secondary hover:bg-secondary/90 text-white font-label-md text-label-md py-2 px-4 rounded-md transition-colors flex items-center gap-2 disabled:opacity-60"
          >
            <span className="material-symbols-outlined text-[18px]">open_in_new</span>
            Open in Incident Reporting
          </button>
        </div>
      </div>
    </div>
  );
}
