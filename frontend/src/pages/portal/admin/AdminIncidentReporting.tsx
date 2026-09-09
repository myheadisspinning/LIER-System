import { useEffect, useMemo, useRef, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { latLngBounds, type Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../../supabaseClient';
import Toast from '../../../components/Toast';
import IncidentDetailModal from '../../../components/IncidentDetailModal';
import AiVerdictBanner from '../../../components/AiVerdictBanner';
import { BARANGAY_HALL_CENTER } from '../../../lib/geo';
import { PRIORITY_COLORS, pinIconFor } from '../../../lib/mapPins';
import Pagination from '../../../components/Pagination';
import { classifyIncident, assessIncident, type IncidentAssessment } from '../../../lib/ai';

type EvidenceItem = { name: string; type: string; size: number; url: string };

type ReportRow = {
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
  ai_dispatch: string | null;
  ai_actions: string[];
  ai_assessment: IncidentAssessment | null;
  threat: number | null;
  confidence: number | null;
  evidence: EvidenceItem[] | null;
  dispatch_unit_name: string | null;
  user_id: string | null;
  anonymous: boolean;
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

const STATUS_OPTIONS = ['Pending', 'Verifying', 'Assigned', 'Progress'];

const PRIORITY_STYLES: Record<string, string> = {
  CRITICAL: 'bg-error-red/10 text-error-red',
  HIGH: 'bg-warning-amber/10 text-warning-amber',
  MEDIUM: 'bg-sky-100 text-sky-700',
  LOW: 'bg-slate-100 text-slate-600',
};

const STATUS_STYLES: Record<string, string> = {
  Pending: 'bg-surface-container-highest text-on-surface-variant',
  Verifying: 'bg-warning-amber/10 text-warning-amber',
  Assigned: 'bg-sky-100 text-sky-700',
  Progress: 'bg-warning-amber/10 text-warning-amber',
  Resolved: 'bg-success-green/10 text-success-green',
  Rejected: 'bg-error-red/10 text-error-red',
};

const INCIDENT_STATUS_STYLES: Record<string, string> = {
  Ongoing: 'bg-error-red/10 text-error-red',
  Happened: 'bg-warning-amber/10 text-warning-amber',
  Unconfirmed: 'bg-slate-100 text-slate-600',
};

const VERDICT_STYLES: Record<string, { badge: string; label: string; icon: string }> = {
  legitimate: { badge: 'bg-success-green/10 text-success-green border border-success-green/20', label: 'Genuine Report', icon: 'verified' },
  ambiguous: { badge: 'bg-warning-amber/10 text-warning-amber border border-warning-amber/20', label: 'Unclear · Needs Verification', icon: 'help' },
  spam_or_troll: { badge: 'bg-error-red/10 text-error-red border border-error-red/20', label: 'Possible Spam / Troll', icon: 'report' },
};

const meterColor = (v: number) => (v >= 70 ? 'bg-error-red' : v >= 40 ? 'bg-warning-amber' : 'bg-secondary');

function RecenterControl({ trigger }: { trigger: number }) {
  const map = useMap();
  useEffect(() => {
    if (trigger > 0) {
      map.setView(BARANGAY_HALL_CENTER, 14, { animate: true, duration: 1 });
    }
  }, [trigger, map]);
  return null;
}

function PinsLayer({
  reports,
  selectedId,
  onSelect,
}: {
  reports: ReportRow[];
  selectedId: string | null;
  onSelect: (id: string) => void;
}) {
  const map = useMap();
  const [refs] = useState<Map<string, LeafletMarker>>(() => new Map());

  useEffect(() => {
    if (reports.length === 0) {
      map.setView(BARANGAY_HALL_CENTER, 14);
      return;
    }
    map.fitBounds(
      latLngBounds(reports.map((r) => [r.lat as number, r.lng as number])),
      { padding: [44, 44] },
    );
  }, [reports, map]);

  useEffect(() => {
    if (!selectedId) return;
    const marker = refs.get(selectedId);
    if (marker) {
      // Offset the fly target so the pin rests below the map center — the
      // incident popup above the pin is tall and needs that room to stay
      // fully visible instead of clipping at the top of the map.
      const zoom = Math.max(map.getZoom(), 15);
      const targetPoint = map.project(marker.getLatLng(), zoom).subtract([0, 80]);
      map.flyTo(map.unproject(targetPoint, zoom), zoom, { duration: 0.8 });
      marker.openPopup();
    }
  }, [selectedId, map, refs]);

  return (
    <>
      {reports.map((r) => (
        <Marker
          key={r.id}
          position={[r.lat as number, r.lng as number]}
          icon={pinIconFor(r.priority)}
          ref={(m) => {
            if (m) refs.set(r.id, m);
            else refs.delete(r.id);
          }}
          eventHandlers={{ click: () => onSelect(r.id) }}
        >
          <Popup>
            <div className="min-w-[180px]">
              {r.ai_assessment?.verdict && (
                <div className="mb-1">
                  <AiVerdictBanner assessment={r.ai_assessment} compact />
                </div>
              )}
              <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{r.report_no ?? 'Report'}</p>
              <p className="text-sm font-semibold text-slate-900 leading-snug mt-0.5">{r.title}</p>
              <div className="flex items-center gap-2 mt-1">
                <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${PRIORITY_STYLES[r.priority] ?? 'bg-slate-100 text-slate-600'}`}>{r.priority}</span>
                <span className="text-[11px] text-slate-500">{r.category}</span>
              </div>
              <p className="text-[11px] text-slate-500 mt-1">{new Date(r.incident_time ?? r.created_at).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}</p>
            </div>
          </Popup>
        </Marker>
      ))}
    </>
  );
}

export default function AdminIncidentReporting() {
  const navigate = useNavigate();
   const [reports, setReports] = useState<ReportRow[]>([]);
   const [reporterMap, setReporterMap] = useState<Record<string, ReporterProfile>>({});
   const [selectedId, setSelectedId] = useState<string | null>(null);
   const [modalReportId, setModalReportId] = useState<string | null>(null);
   const [modalLoading, setModalLoading] = useState(false);
   const [search, setSearch] = useState('');
   const [statusFilter, setStatusFilter] = useState('All');
   const [loading, setLoading] = useState(true);
   const [error, setError] = useState<string | null>(null);
   const [busy, setBusy] = useState(false);
   const [aiAnalyzing, setAiAnalyzing] = useState(false);
   const [assessing, setAssessing] = useState(false);
   const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
   const [tile, setTile] = useState<'street' | 'satellite'>('street');
   const [recenterTrigger, setRecenterTrigger] = useState(0);
   const [searchParams] = useSearchParams();
   const initialCaseRef = useRef(searchParams.get('case'));
   const [currentPage, setCurrentPage] = useState(1);
   const [itemsPerPage, setItemsPerPage] = useState(10);
   const [openMenuId, setOpenMenuId] = useState<string | null>(null);
   const [menuPos, setMenuPos] = useState<{ left: number; top: number; bottom: number } | null>(null);

  const fetchAll = async () => {
    const res = await supabase
      .from('incident_reports')
      .select('id, report_no, title, description, additional_context, category, priority, status, incident_status, address, lat, lng, incident_time, created_at, ai_dispatch, ai_actions, ai_assessment, threat, confidence, evidence, anonymous, dispatch_unit:dispatch_unit_id(name), user_id')
      .order('created_at', { ascending: false })
      .limit(200);
    const mapped = (res.data ?? []).map((r) => {
      const embed = (r as unknown as { dispatch_unit: { name: string } | { name: string }[] | null }).dispatch_unit;
      const rawAssessment = (r as unknown as { ai_assessment: unknown }).ai_assessment;
      const assessment =
        rawAssessment && typeof rawAssessment === 'object' && (rawAssessment as IncidentAssessment)?.verdict
          ? (rawAssessment as IncidentAssessment)
          : null;
      return {
        ...r,
        dispatch_unit_name: (Array.isArray(embed) ? embed[0]?.name : embed?.name) ?? null,
        ai_assessment: assessment,
      };
    }) as ReportRow[];

    const userIds = [...new Set(mapped.map((r) => r.user_id).filter(Boolean))] as string[];
    const rMap: Record<string, ReporterProfile> = {};
    if (userIds.length > 0) {
      const { data: reporterRows } = await supabase
        .from('public_users')
        .select('id, fullname, phone, address, emergency_contact_name, emergency_contact_relationship, emergency_contact_phone')
        .in('id', userIds);
      for (const row of (reporterRows ?? []) as ReporterProfile[]) {
        rMap[row.id] = row;
      }
    }

    return { reports: mapped, reporterMap: rMap, error: res.error?.message ?? null };
  };

  useEffect(() => {
    let channel: ReturnType<typeof supabase.channel> | null = null;
    let cancelled = false;

    const refresh = async () => {
      const { reports, reporterMap: rMap, error } = await fetchAll();
      if (cancelled) return;
      if (error) setError(error);
      setReports(reports);
      setReporterMap(rMap);
      return;
    };

    void (async () => {
      const { reports, reporterMap: rMap, error } = await fetchAll();
      if (error) setError(error);
      setReports(reports);
      setReporterMap(rMap);
      setSelectedId((prev) => {
        const firstActive = reports.find((r) => r.status !== 'Resolved' && r.status !== 'Rejected');
        return prev ?? initialCaseRef.current ?? firstActive?.id ?? reports[0]?.id ?? null;
      });
      setLoading(false);
      channel = supabase
        .channel('admin-incident-reporting')
        .on('postgres_changes', { event: '*', schema: 'public', table: 'incident_reports' }, () => void refresh())
        .subscribe();
    })();

    return () => {
      cancelled = true;
      if (channel) void supabase.removeChannel(channel);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
      if (r.status === 'Resolved' || r.status === 'Rejected') return false;
      if (statusFilter !== 'All' && r.status !== statusFilter) return false;
      if (!q) return true;
      return (
        (r.report_no ?? '').toLowerCase().includes(q) ||
        r.title.toLowerCase().includes(q) ||
        r.category.toLowerCase().includes(q) ||
        (r.address ?? '').toLowerCase().includes(q)
      );
    });
  }, [reports, search, statusFilter]);

  // Reset to page 1 when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [search, statusFilter]);

  // Pagination calculations
  const totalPages = Math.ceil(filtered.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  const paginatedReports = filtered.slice(startIndex, endIndex);

  const mapPins = useMemo(() => filtered.filter((r) => r.lat != null && r.lng != null), [filtered]);

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? filtered[0] ?? null,
    [reports, filtered, selectedId],
  );

  useEffect(() => {
    if (selectedId) {
      document.getElementById(`report-row-${selectedId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedId]);

   const selectReport = (id: string) => { setSelectedId(id); setOpenMenuId(null); };

   const openModal = (id: string) => {
     setModalLoading(true);
     setTimeout(() => {
       setModalReportId(id);
       setModalLoading(false);
     }, 300);
   };

   const handleStatusChange = async (id: string, newStatus: string) => {
     setOpenMenuId(null);
     setBusy(true);
     try {
       const { error } = await supabase.from('incident_reports').update({ status: newStatus }).eq('id', id);
       if (error) throw new Error(error.message);
       setReports((prev) => prev.map((r) => r.id === id ? { ...r, status: newStatus } : r));
       setToast({ type: 'success', message: `Report status updated to ${newStatus}.` });
     } catch (e) {
       setToast({ type: 'error', message: e instanceof Error ? e.message : 'Status update failed.' });
     } finally {
       setBusy(false);
     }
   };

  const resolveReport = async () => {
    if (!selected) return;
    if (selected.status !== 'Progress') {
      setToast({ type: 'error', message: 'Only reports already in progress can be marked as Resolved.' });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from('incident_reports').update({ status: 'Resolved' }).eq('id', selected.id);
      if (error) throw new Error(error.message);
      await supabase.from('ai_audit_logs').insert({
        actor: 'Admin_Desk',
        action: 'Resolved case',
        detail: `${selected.report_no ?? 'Report'} closed.`,
      });
      setToast({ type: 'success', message: `Report ${selected.report_no} marked as Resolved.` });
      const { reports } = await fetchAll();
      setReports(reports);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Update failed.' });
    } finally {
      setBusy(false);
    }
  };

  const acknowledgeReport = async () => {
    if (!selected) return;
    if (selected.status !== 'Assigned') {
      setToast({ type: 'error', message: 'Only reports assigned to a unit can be acknowledged to start processing.' });
      return;
    }
    setBusy(true);
    try {
      const { error } = await supabase.from('incident_reports').update({ status: 'Progress' }).eq('id', selected.id);
      if (error) throw new Error(error.message);
      await supabase.from('ai_audit_logs').insert({
        actor: 'Admin_Desk',
        action: 'Acknowledge dispatch',
        detail: `${selected.report_no ?? 'Report'} advanced to Progress by Admin_Desk.`,
      });
      setToast({ type: 'success', message: `Report ${selected.report_no} is now in progress.` });
      const { reports } = await fetchAll();
      setReports(reports);
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Update failed.' });
    } finally {
      setBusy(false);
    }
  };

  // Run a fresh on-demand AI analysis for the selected incident and store the
  // resulting dispatch recommendation on the report row (visible in the modal too).
  const generateAiRecommendation = async () => {
    if (!selected || aiAnalyzing) return;
    setAiAnalyzing(true);
    try {
      const res = await classifyIncident({
        title: selected.title,
        description: [selected.description, selected.additional_context].filter(Boolean).join(' '),
        categoryHint: selected.category,
        lat: selected.lat,
        lng: selected.lng,
      });
      const { error } = await supabase
        .from('incident_reports')
        .update({
          ai_actions: res.actions,
          ai_dispatch: res.dispatch,
          priority: res.priority,
          threat: res.threat,
          confidence: res.confidence,
        })
        .eq('id', selected.id);
      if (error) throw new Error(error.message);
      await supabase.from('ai_audit_logs').insert({
        actor: 'Admin_Desk',
        action: 'Generated AI dispatch recommendation',
        detail: `${selected.report_no ?? 'Report'} re-analyzed -> "${res.category}" (${res.confidence}% confidence, ${res.priority} priority).`,
        metadata: { source: res.source, aiError: res.aiError },
      });
      setReports((prev) =>
        prev.map((r) =>
          r.id === selected.id
            ? {
                ...r,
                ai_actions: res.actions,
                ai_dispatch: res.dispatch,
                priority: res.priority,
                threat: res.threat,
                confidence: res.confidence,
              }
            : r,
        ),
      );
      setToast({ type: 'success', message: `AI dispatch recommendation updated for ${selected.report_no ?? 'this incident'}.` });
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'AI recommendation failed.' });
    } finally {
      setAiAnalyzing(false);
    }
  };

  // Run an on-demand AI credibility / spam-troll / worth-the-problem check for the
  // selected incident and store the result on the report row (visible in the modal too).
  const assessNow = async () => {
    if (!selected || assessing) return;
    setAssessing(true);
    try {
      const res = await assessIncident({
        title: selected.title,
        description: [selected.description, selected.additional_context].filter(Boolean).join(' '),
        categoryHint: selected.category,
        priority: selected.priority,
        threat: selected.threat,
        lat: selected.lat,
        lng: selected.lng,
      });
      const { error } = await supabase
        .from('incident_reports')
        .update({ ai_assessment: res })
        .eq('id', selected.id);
      if (error) throw new Error(error.message);
      await supabase.from('ai_audit_logs').insert({
        actor: 'Admin_Desk',
        action: 'Assessed incident credibility',
        detail: `${selected.report_no ?? 'Report'} judged "${res.verdict}" (spam ${res.spam_confidence}%, worth dispatch: ${res.worth_dispatch}).`,
        metadata: { source: res.source, aiError: res.aiError },
      });
      setReports((prev) =>
        prev.map((r) => (r.id === selected.id ? { ...r, ai_assessment: res } : r)),
      );
      setToast({ type: 'success', message: `AI credibility check complete for ${selected.report_no ?? 'this incident'}.` });
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'AI assessment failed.' });
    } finally {
      setAssessing(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      {/* Map + Detail Panel */}
      <div className="flex flex-col xl:flex-row gap-4 h-[500px]">
        <section className="flex-1 flex flex-col bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden h-full">
          <div className="p-4 border-b border-border-subtle flex items-center justify-between flex-wrap gap-3">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">map</span>
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Incident Locations Map</h3>
              <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-[11px] font-bold">{mapPins.length} PIN{mapPins.length === 1 ? '' : 'S'}</span>
            </div>
            <div className="flex items-center gap-3">
              {Object.entries(PRIORITY_COLORS).filter(([k]) => k !== 'LOW').map(([p, c]) => (
                <span key={p} className="flex items-center gap-1.5 text-[11px] font-semibold text-on-surface-variant">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: c }}></span>
                  {p}
                </span>
              ))}
              <button type="button" onClick={() => setTile((t) => (t === 'street' ? 'satellite' : 'street'))} className="flex items-center gap-1 px-2 py-1 bg-surface-container-low border border-border-subtle rounded hover:bg-surface-container-high transition-colors text-[11px]">
                <span className="material-symbols-outlined text-[14px]">layers</span>
                {tile === 'street' ? 'Satellite' : 'Street'}
              </button>
              <button type="button" onClick={() => setRecenterTrigger((t) => t + 1)} className="flex items-center gap-1 px-2 py-1 bg-surface-container-low border border-border-subtle rounded hover:bg-surface-container-high transition-colors text-[11px]">
                <span className="material-symbols-outlined text-[14px]">pin_drop</span>
                Barangay Hall
              </button>
            </div>
          </div>
          <div className="relative flex-1 bg-slate-100 overflow-hidden isolate">
            <MapContainer center={BARANGAY_HALL_CENTER} zoom={13} className="w-full h-full absolute inset-0" scrollWheelZoom>
              <TileLayer
                attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
              />
              {tile === 'satellite' && (
                <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" opacity={0.9} />
              )}
              <PinsLayer reports={mapPins} selectedId={selectedId} onSelect={selectReport} />
              <RecenterControl trigger={recenterTrigger} />
            </MapContainer>
            {mapPins.length === 0 && !loading && (
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div className="bg-white/90 border border-border-subtle rounded-lg px-5 py-3 text-sm text-on-surface-variant shadow-sm">No pinned incident locations for the current filters.</div>
              </div>
            )}
          </div>
        </section>

        <div className="xl:w-[35%] bg-white rounded-xl border border-border-subtle shadow-sm flex flex-col overflow-hidden h-full">
          {selected ? (
            <>
              <div className="p-4 border-b border-border-subtle flex justify-between items-center shrink-0">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">{selected.report_no ?? 'Report'}</h3>
                <div className="flex gap-2">
                  <button type="button" className="text-on-surface-variant hover:text-secondary" aria-label="View full details" onClick={() => openModal(selected.id)}><span className="material-symbols-outlined">visibility</span></button>
                  <button type="button" className="text-on-surface-variant hover:text-secondary" aria-label="Print"><span className="material-symbols-outlined">print</span></button>
                  <button type="button" className="text-on-surface-variant hover:text-secondary" aria-label="Close"><span className="material-symbols-outlined">close</span></button>
                </div>
              </div>
              <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                {selected.ai_assessment?.verdict && (
                  <AiVerdictBanner assessment={selected.ai_assessment} />
                )}
                <div className="bg-surface-container-low border border-border-subtle p-3 rounded-lg flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary text-[18px]">local_shipping</span>
                  <p className="text-sm text-on-surface">Assigned Unit: <span className="font-medium">{selected.dispatch_unit_name ?? 'None'}</span></p>
                </div>
                <div>
                  <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-2">Incident Details</h4>
                  <div className="bg-surface-container-low rounded-lg p-3 border border-border-subtle space-y-2">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-on-surface-variant">Category</p>
                        <p className="text-sm text-on-surface">{selected.category}</p>
                      </div>
                      <div>
                        <p className="text-xs text-on-surface-variant">Severity</p>
                        <p className={`text-sm font-semibold ${PRIORITY_STYLES[selected.priority] ?? 'text-on-surface'}`}>{selected.priority}</p>
                      </div>
                      <div>
                        <p className="text-xs text-on-surface-variant">Location</p>
                        <p className="text-sm text-on-surface">{selected.address ?? 'No address'}</p>
                      </div>
                      <div>
                        <p className="text-xs text-on-surface-variant">Time Reported</p>
                        <p className="text-sm text-on-surface">{new Date(selected.incident_time ?? selected.created_at).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })}</p>
                      </div>
                      <div>
                        <p className="text-xs text-on-surface-variant">Incident Status</p>
                        <p className="text-sm font-semibold"><span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${INCIDENT_STATUS_STYLES[selected.incident_status] ?? 'bg-slate-100 text-slate-600'}`}>{selected.incident_status}</span></p>
                      </div>
                    </div>
                    <div className="pt-1 space-y-2">
                      {selected.description && (
                        <div>
                          <p className="text-xs text-on-surface-variant mb-1">Description</p>
                          <p className="text-sm text-on-surface leading-relaxed max-h-[80px] overflow-y-auto">{selected.description}</p>
                        </div>
                      )}
                      {selected.additional_context && (
                        <div>
                          <p className="text-xs text-on-surface-variant mb-1">Additional Context</p>
                          <p className="text-sm text-on-surface leading-relaxed max-h-[80px] overflow-y-auto">{selected.additional_context}</p>
                        </div>
                      )}
                      <div>
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-secondary">smart_toy</span>
                            AI Recommended Dispatch Actions
                          </p>
                          <button
                            type="button"
                            onClick={generateAiRecommendation}
                            disabled={aiAnalyzing}
                            className="bg-surface-container-low hover:bg-surface-container-high border border-border-subtle text-secondary text-[11px] font-semibold px-2 py-1 rounded-md transition-colors flex items-center gap-1 disabled:opacity-60 shrink-0"
                          >
                            <span className={`material-symbols-outlined text-[13px] ${aiAnalyzing ? 'animate-spin' : ''}`}>{aiAnalyzing ? 'progress_activity' : 'refresh'}</span>
                            {aiAnalyzing ? 'Analyzing…' : (selected.ai_actions ?? []).length > 0 ? 'Regenerate with AI' : 'Generate AI Recommendation'}
                          </button>
                        </div>
                        {aiAnalyzing ? (
                          <p className="text-xs text-secondary font-medium flex items-center gap-1.5 leading-relaxed">
                            <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                            AI is analyzing the incident to recommend dispatch actions…
                          </p>
                        ) : (selected.ai_actions ?? []).length > 0 ? (
                          <ul className="grid grid-cols-2 gap-2">
                            {selected.ai_actions.map((a) => (
                              <li key={a} className="flex items-start gap-1.5 text-sm text-on-surface">
                                <span className="material-symbols-outlined text-[14px] text-success-green">check_circle</span>
                                {a}
                              </li>
                            ))}
                          </ul>
                        ) : (
                          <p className="text-sm text-on-surface-variant leading-relaxed italic">No AI recommendation stored for this incident yet — generate one above.</p>
                        )}
                      </div>
                      <div className="pt-2 border-t border-border-subtle">
                        <div className="flex items-center justify-between gap-2 mb-1">
                          <p className="text-xs font-semibold text-on-surface-variant uppercase tracking-wider flex items-center gap-1.5">
                            <span className="material-symbols-outlined text-[14px] text-secondary">verified_user</span>
                            AI Credibility
                          </p>
                          <button
                            type="button"
                            onClick={assessNow}
                            disabled={assessing}
                            className="bg-surface-container-low hover:bg-surface-container-high border border-border-subtle text-secondary text-[11px] font-semibold px-2 py-1 rounded-md transition-colors flex items-center gap-1 disabled:opacity-60 shrink-0"
                          >
                            <span className={`material-symbols-outlined text-[13px] ${assessing ? 'animate-spin' : ''}`}>{assessing ? 'progress_activity' : 'refresh'}</span>
                            {assessing ? 'Assessing…' : selected.ai_assessment?.verdict ? 'Re-check with AI' : 'Check with AI'}
                          </button>
                        </div>
                        {assessing ? (
                          <p className="text-xs text-secondary font-medium flex items-center gap-1.5 leading-relaxed">
                            <span className="material-symbols-outlined text-[14px] animate-spin">progress_activity</span>
                            AI is reviewing this report's credibility…
                          </p>
                        ) : selected.ai_assessment?.verdict ? (
                          <div className="space-y-2">
                            <div className="flex items-center justify-between gap-2 flex-wrap">
                              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wide flex items-center gap-1 ${VERDICT_STYLES[selected.ai_assessment.verdict]?.badge ?? 'bg-slate-100 text-slate-600'}`}>
                                <span className="material-symbols-outlined text-[12px]">{VERDICT_STYLES[selected.ai_assessment.verdict]?.icon ?? 'info'}</span>
                                {VERDICT_STYLES[selected.ai_assessment.verdict]?.label ?? selected.ai_assessment.verdict}
                              </span>
                            </div>
                            <div>
                              <div className="flex justify-between text-[11px] mb-1">
                                <span className="text-on-surface-variant">Spam / Troll likelihood</span>
                                <span className="font-semibold text-on-surface">{selected.ai_assessment.spam_confidence}%</span>
                              </div>
                              <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                <div className={`h-full rounded-full ${meterColor(selected.ai_assessment.spam_confidence)}`} style={{ width: `${selected.ai_assessment.spam_confidence}%` }}></div>
                              </div>
                            </div>
                            <div className="flex items-start gap-1.5">
                              <span className={`material-symbols-outlined text-[14px] mt-[1px] ${selected.ai_assessment.worth_dispatch ? 'text-success-green' : 'text-warning-amber'}`}>{selected.ai_assessment.worth_dispatch ? 'check_circle' : 'help'}</span>
                              <p className="text-sm text-on-surface leading-tight">
                                <span className="font-semibold">Recommended action: </span>
                                <span className={selected.ai_assessment.worth_dispatch ? 'text-success-green font-semibold' : 'text-warning-amber font-semibold'}>
                                  {selected.ai_assessment.worth_dispatch ? 'Dispatch responders' : 'Verify before dispatching'}
                                </span>
                              </p>
                            </div>
                            {selected.ai_assessment.worth_reason && (
                              <p className="text-sm text-on-surface-variant leading-relaxed">{selected.ai_assessment.worth_reason}</p>
                            )}
                            {selected.ai_assessment.flags.length > 0 && (
                              <div className="flex flex-wrap gap-1.5">
                                {selected.ai_assessment.flags.map((f) => (
                                  <span key={f} className="text-[10px] bg-surface-container-highest text-on-surface-variant rounded-full px-2 py-0.5">{f}</span>
                                ))}
                              </div>
                            )}
                          </div>
                        ) : (
                          <p className="text-sm text-on-surface-variant leading-relaxed italic">Not assessed yet — run an AI credibility check to screen this report for spam or trolling.</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
                {selected.anonymous ? (
                  <div>
                    <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-2">Reporter Info</h4>
                    <div className="bg-surface-container-low rounded-lg border border-border-subtle p-3 flex items-center gap-2 text-sm text-on-surface-variant min-h-[120px]">
                      <span className="material-symbols-outlined text-[18px]">visibility_off</span>
                      Anonymous report — reporter identity withheld.
                    </div>
                  </div>
                ) : selected.user_id && reporterMap[selected.user_id] && (
                  <div>
                    <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-2">Reporter Info</h4>
                    <div className="bg-surface-container-low rounded-lg p-3 border border-border-subtle space-y-2 min-h-[120px]">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-xs text-on-surface-variant">Name</p>
                          <p className="text-sm text-on-surface font-medium">{reporterMap[selected.user_id].fullname}</p>
                        </div>
                        <div>
                          <p className="text-xs text-on-surface-variant">Phone</p>
                          <p className="text-sm text-on-surface font-medium">{reporterMap[selected.user_id].phone ? `+63 ${reporterMap[selected.user_id].phone}` : '—'}</p>
                        </div>
                        <div className="col-span-2">
                          <p className="text-xs text-on-surface-variant">Address</p>
                          <p className="text-sm text-on-surface font-medium">{reporterMap[selected.user_id].address || '—'}</p>
                        </div>
                      </div>
                      {reporterMap[selected.user_id].emergency_contact_name && (
                        <div className="pt-3 border-t border-border-subtle">
                          <p className="text-xs text-error-red font-semibold uppercase mb-2 flex items-center gap-1">
                            <span className="material-symbols-outlined text-[14px]">emergency</span>
                            Emergency Contact
                          </p>
                          <div className="grid grid-cols-3 gap-4">
                            <div>
                              <p className="text-xs text-on-surface-variant">Name</p>
                              <p className="text-sm text-on-surface font-medium">{reporterMap[selected.user_id].emergency_contact_name}</p>
                            </div>
                            <div>
                              <p className="text-xs text-on-surface-variant">Relationship</p>
                              <p className="text-sm text-on-surface font-medium capitalize">{reporterMap[selected.user_id].emergency_contact_relationship}</p>
                            </div>
                            <div>
                              <p className="text-xs text-on-surface-variant">Phone</p>
                              <p className="text-sm text-on-surface font-medium">{reporterMap[selected.user_id].emergency_contact_phone ? `+63 ${reporterMap[selected.user_id].emergency_contact_phone}` : '—'}</p>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                )}
                <div>
                  <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-2">Evidence ({selected.evidence?.length ?? 0})</h4>
                  {(selected.evidence ?? []).length > 0 ? (
                    <div className="grid grid-cols-4 gap-2">
                      {selected.evidence?.map((ev) =>
                        ev.type.startsWith('image/') ? (
                          <a key={ev.url} href={ev.url} target="_blank" rel="noreferrer" className="aspect-square bg-surface-container-highest rounded-md border border-border-subtle overflow-hidden group relative block">
                            <img className="w-full h-full object-cover" src={ev.url} alt={ev.name} />
                            <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 bg-black/50 transition-opacity">
                              <span className="material-symbols-outlined text-white">zoom_in</span>
                            </div>
                          </a>
                        ) : (
                          <a key={ev.url} href={ev.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2 py-1.5 rounded-md border border-border-subtle bg-surface-container-low hover:bg-surface-container-highest transition-colors text-on-surface-variant">
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
              </div>
              <div className="p-3 border-t border-border-subtle bg-surface space-y-2 shrink-0">
                {selected.status === 'Assigned' && (
                  <button
                    type="button"
                    onClick={acknowledgeReport}
                    disabled={busy}
                    className="w-full bg-secondary hover:bg-secondary/90 text-on-secondary font-label-md text-label-md py-2 px-4 rounded-md transition-colors flex justify-center items-center disabled:opacity-60"
                  >
                    <span className="material-symbols-outlined mr-2 text-[18px]">directions_run</span>
                    {busy ? 'Updating…' : 'Acknowledge & Start Processing'}
                  </button>
                )}
                <button
                  type="button"
                  onClick={resolveReport}
                  disabled={busy || selected.status !== 'Progress'}
                  className="w-full bg-success-green hover:bg-success-green/90 text-white font-label-md text-label-md py-2 px-4 rounded-md transition-colors flex justify-center items-center disabled:opacity-60"
                >
                  <span className="material-symbols-outlined mr-2 text-[18px]">check_circle</span>
                  {selected.status === 'Resolved' ? 'Resolved' : selected.status !== 'Progress' ? 'Awaiting Process' : busy ? 'Updating…' : 'Mark as Resolved'}
                </button>
                <div className="flex gap-2">
                  <button type="button" className="flex-1 bg-surface-container-low hover:bg-surface-container-highest border border-border-subtle text-on-surface font-label-md text-label-md py-2 px-4 rounded-md transition-colors text-sm">
                    Transfer to Vault
                  </button>
                  <button type="button" className="flex-1 bg-surface-container-low hover:bg-surface-container-highest border border-border-subtle text-on-surface font-label-md text-label-md py-2 px-4 rounded-md transition-colors text-sm">
                    Print Blotter
                  </button>
                </div>
              </div>
            </>
          ) : (
            <div className="p-12 text-center text-sm text-on-surface-variant">Select an incident to view details.</div>
          )}
        </div>
      </div>

      {/* Action Bar */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 flex-wrap">
          <div className="relative w-64">
            <span className="material-symbols-outlined absolute left-3 top-2.5 text-on-surface-variant text-[20px]">search</span>
            <input
              className="w-full bg-surface-container-low border border-border-subtle text-on-surface rounded-md pl-10 pr-3 py-2 font-body-sm text-body-sm focus:outline-none focus:border-secondary focus:ring-1 focus:ring-secondary"
              placeholder="Search Incident ID..."
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <select
            className="bg-surface-container-low border border-border-subtle text-on-surface rounded-md px-3 py-2 font-body-sm text-body-sm focus:outline-none focus:border-secondary"
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
          >
            <option>All</option>
            {STATUS_OPTIONS.map((s) => (
              <option key={s}>{s}</option>
            ))}
          </select>
          <span className="text-xs text-on-surface-variant font-medium">Showing {filtered.length} of {reports.length}</span>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => navigate('/admin/incident-archive')}
            className="bg-surface-container-low hover:bg-surface-container-high border border-border-subtle text-on-surface font-label-md text-label-md py-2 px-4 rounded-md flex items-center transition-colors"
          >
            <span className="material-symbols-outlined mr-2 text-[18px]">archive</span>
            Open Archive
          </button>
          <button type="button" className="bg-secondary hover:bg-secondary/90 text-on-secondary font-label-md text-label-md py-2 px-4 rounded-md flex items-center transition-colors">
            <span className="material-symbols-outlined mr-2 text-[18px]">add</span>
            Log New Incident
          </button>
        </div>
      </div>

      {/* Incidents Table */}
      <div className="overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
        <div className="overflow-x-auto max-h-[40vh]">
          {loading ? (
            <div className="p-12 text-center text-sm text-on-surface-variant">Loading incidents…</div>
          ) : error ? (
            <div className="p-12 text-center text-sm text-error-red">{error}</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-on-surface-variant">No incidents found for the current filters.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="sticky top-0 bg-surface z-10 shadow-sm border-b border-border-subtle">
                <tr>
                  <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Case ID</th>
                  <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Timestamp</th>
                  <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Category</th>
                  <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Location</th>
                  <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Severity</th>
                  <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Responder</th>
                  <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Incident</th>
                  <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Status</th>
                  <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle font-body-sm text-body-sm">
                {paginatedReports.map((r) => (
                  <tr
                    key={r.id}
                    id={`report-row-${r.id}`}
                    onClick={() => selectReport(r.id)}
                    className={`hover:bg-slate-50 transition-colors cursor-pointer ${selected?.id === r.id ? 'bg-blue-50/40 border-l-4 border-secondary' : ''}`}
                  >
                    <td className="py-3 px-4 font-medium text-secondary">{r.report_no ?? '—'}</td>
                    <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">{new Date(r.incident_time ?? r.created_at).toLocaleString('en-PH', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</td>
                    <td className="py-3 px-4 text-on-surface">{r.category}</td>
                    <td className="py-3 px-4 text-on-surface-variant max-w-[200px] truncate">{r.address ?? 'No address'}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${PRIORITY_STYLES[r.priority] ?? 'bg-slate-100 text-slate-600'}`}>{r.priority}</span></td>
                    <td className="py-3 px-4 text-on-surface">{r.dispatch_unit_name ?? '—'}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${INCIDENT_STATUS_STYLES[r.incident_status] ?? 'bg-slate-100 text-slate-600'}`}>{r.incident_status}</span></td>
                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{r.status}</span></td>
                     <td className="py-3 px-4 text-right whitespace-nowrap">
                       <div className="relative inline-flex">
                         <button type="button" className="text-on-surface-variant hover:text-secondary" onClick={(e) => { e.stopPropagation(); const next = openMenuId === r.id ? null : r.id; setOpenMenuId(next); if (next) { const rect = e.currentTarget.getBoundingClientRect(); const MENU_H = 44; const GAP = 6; if (rect.bottom + GAP + MENU_H <= window.innerHeight) { setMenuPos({ left: rect.right - 176, top: rect.bottom + GAP, bottom: 0 }); } else { setMenuPos({ left: rect.right - 176, bottom: window.innerHeight - rect.top + GAP, top: 0 }); } } }} aria-label="More options" aria-expanded={openMenuId === r.id}><span className="material-symbols-outlined text-[18px]">more_vert</span></button>
                         {openMenuId === r.id && menuPos && (
                           <>
                             <div className="fixed inset-0 z-40" onClick={() => setOpenMenuId(null)} />
                             <div className="fixed w-44 z-50 bg-surface-container-lowest rounded-lg border border-border-subtle shadow-lg py-1" style={{ left: menuPos.left, ...(menuPos.top ? { top: menuPos.top } : { bottom: menuPos.bottom }) }}>
                               <button type="button" onClick={(e) => { e.stopPropagation(); handleStatusChange(r.id, 'Rejected'); }} className="w-full flex items-center gap-2 px-3 py-2 text-left text-sm text-error-red hover:bg-error-red/5 transition-colors">
                                 <span className="material-symbols-outlined text-[16px]">block</span>Reject
                               </button>
                             </div>
                           </>
                         )}
                       </div>
                     </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          itemsPerPage={itemsPerPage}
          onPageChange={setCurrentPage}
          onItemsPerPageChange={(items) => {
            setItemsPerPage(items);
            setCurrentPage(1);
          }}
          totalItems={filtered.length}
          startIndex={startIndex}
          endIndex={endIndex}
        />
      </div>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      {modalLoading && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
          <div className="bg-white rounded-xl p-8 flex flex-col items-center gap-4">
            <div className="w-12 h-12 border-4 border-secondary border-t-transparent rounded-full animate-spin"></div>
            <p className="text-on-surface font-medium">Loading incident details...</p>
          </div>
        </div>
      )}
      <IncidentDetailModal reportId={modalReportId} onClose={() => setModalReportId(null)} isAdmin />
    </div>
  );
}
