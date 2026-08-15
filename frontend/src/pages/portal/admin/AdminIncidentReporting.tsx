import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { divIcon, latLngBounds, type Marker as LeafletMarker } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../../supabaseClient';
import Toast from '../../../components/Toast';
import { BARANGAY_HALL_CENTER } from '../../../lib/geo';

type EvidenceItem = { name: string; type: string; size: number; url: string };

type ReportRow = {
  id: string;
  report_no: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  status: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  incident_time: string | null;
  created_at: string;
  ai_dispatch: string | null;
  ai_actions: string[];
  confidence: number | null;
  evidence: EvidenceItem[] | null;
  dispatch_unit_name: string | null;
};

const STATUS_OPTIONS = ['Pending', 'Verifying', 'Assigned', 'Progress', 'Resolved', 'Rejected'];

const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#f59e0b',
  MEDIUM: '#0d9488',
  LOW: '#0d9488',
};

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

const pinIconFor = (priority: string) => {
  const c = PRIORITY_COLORS[priority] ?? '#0d9488';
  return divIcon({
    className: '',
    html: `<div style="position:relative;width:32px;height:32px"><span style="position:absolute;inset:0;margin:auto;width:18px;height:18px;border-radius:9999px;background:${c};opacity:.25;border:2px solid #0b1220"></span><span style="position:absolute;inset:0;margin:auto;width:10px;height:10px;border-radius:9999px;background:${c}"></span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

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
      map.flyTo(marker.getLatLng(), Math.max(map.getZoom(), 15), { duration: 0.8 });
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
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('All');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  const [tile, setTile] = useState<'street' | 'satellite'>('street');
  const [recenterTrigger, setRecenterTrigger] = useState(0);

  const fetchAll = async () => {
    const res = await supabase
      .from('incident_reports')
      .select('id, report_no, title, description, category, priority, status, address, lat, lng, incident_time, created_at, ai_dispatch, ai_actions, confidence, evidence, dispatch_unit:dispatch_unit_id(name)')
      .order('created_at', { ascending: false })
      .limit(200);
    const mapped = (res.data ?? []).map((r) => ({
      ...r,
      dispatch_unit_name: (r as unknown as { dispatch_unit: { name: string }[] | null }).dispatch_unit?.[0]?.name ?? null,
    })) as ReportRow[];
    return { reports: mapped, error: res.error?.message ?? null };
  };

  useEffect(() => {
    void (async () => {
      const { reports, error } = await fetchAll();
      if (error) setError(error);
      setReports(reports);
      setSelectedId((prev) => prev ?? reports[0]?.id ?? null);
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return reports.filter((r) => {
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

  const mapPins = useMemo(() => filtered.filter((r) => r.lat != null && r.lng != null && r.status !== 'Rejected'), [filtered]);

  const selected = useMemo(
    () => filtered.find((r) => r.id === selectedId) ?? filtered[0] ?? null,
    [filtered, selectedId],
  );

  useEffect(() => {
    if (selectedId) {
      document.getElementById(`report-row-${selectedId}`)?.scrollIntoView({ block: 'nearest', behavior: 'smooth' });
    }
  }, [selectedId]);

  const selectReport = (id: string) => setSelectedId(id);

  const resolveReport = async () => {
    if (!selected) return;
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

  return (
    <div className="flex flex-col gap-4">
      {/* Incident Locations Map */}
      <section className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
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
        <div className="relative h-[420px] bg-slate-100">
          <MapContainer center={BARANGAY_HALL_CENTER} zoom={14} className="w-full h-full" scrollWheelZoom>
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

      {/* Action Bar — connected to the incidents table below */}
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
        <button type="button" className="bg-secondary hover:bg-secondary/90 text-on-secondary font-label-md text-label-md py-2 px-4 rounded-md flex items-center transition-colors shrink-0">
          <span className="material-symbols-outlined mr-2 text-[18px]">add</span>
          Log New Incident
        </button>
      </div>

      {/* Split View Content */}
      <div className="flex flex-col xl:flex-row overflow-hidden rounded-xl border border-border-subtle bg-white shadow-sm">
        {/* Left: Data Table (70%) */}
        <div className="xl:w-[70%] flex flex-col border-b xl:border-b-0 xl:border-r border-border-subtle overflow-hidden">
          <div className="flex-1 overflow-x-auto max-h-[560px]">
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
                    <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider">Status</th>
                    <th className="py-3 px-4 font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border-subtle font-body-sm text-body-sm">
                  {filtered.map((r) => (
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
                      <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_STYLES[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{r.status}</span></td>
                      <td className="py-3 px-4 text-right whitespace-nowrap">
                        <button type="button" className="text-on-surface-variant hover:text-secondary mr-2" onClick={() => selectReport(r.id)} aria-label="View incident"><span className="material-symbols-outlined text-[18px]">visibility</span></button>
                        <button type="button" className="text-on-surface-variant hover:text-secondary" aria-label="More options"><span className="material-symbols-outlined text-[18px]">more_vert</span></button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          <div className="p-3 bg-surface border-t border-border-subtle flex justify-between items-center text-xs text-on-surface-variant">
            <span>Showing {filtered.length} of {reports.length} Incidents</span>
          </div>
        </div>

        {/* Right: Detail Side Panel (30%) */}
        <div className="xl:w-[30%] bg-surface flex flex-col overflow-hidden">
          {selected ? (
            <>
              <div className="p-4 border-b border-border-subtle flex justify-between items-center sticky top-0 bg-surface z-10">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface">{selected.report_no ?? 'Report'}</h3>
                <div className="flex gap-2">
                  <button type="button" className="text-on-surface-variant hover:text-secondary" aria-label="Print"><span className="material-symbols-outlined">print</span></button>
                  <button type="button" className="text-on-surface-variant hover:text-secondary" aria-label="Close"><span className="material-symbols-outlined">close</span></button>
                </div>
              </div>
              <div className="flex-1 p-6 space-y-6 overflow-y-auto max-h-[720px]">
                <div className="bg-warning-amber/10 border border-warning-amber/30 p-4 rounded-lg flex items-start">
                  <span className="material-symbols-outlined text-warning-amber mr-3 mt-0.5">local_shipping</span>
                  <div>
                    <p className="font-label-sm text-label-sm text-warning-amber uppercase tracking-wider mb-1">Dispatch Status</p>
                    <p className="font-body-md text-body-md text-on-surface font-medium">{selected.ai_dispatch ?? 'Awaiting manual assignment.'}</p>
                    {selected.dispatch_unit_name && <p className="font-body-sm text-body-sm text-on-surface-variant mt-1">Assigned Unit: {selected.dispatch_unit_name}</p>}
                  </div>
                </div>
                <div>
                  <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-3">Incident Details</h4>
                  <div className="bg-surface-container-low rounded-lg p-4 border border-border-subtle space-y-3">
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
                    </div>
                    {selected.description && (
                      <div className="pt-2">
                        <p className="text-xs text-on-surface-variant mb-1">Description</p>
                        <p className="text-sm text-on-surface leading-relaxed">{selected.description}</p>
                      </div>
                    )}
                    {(selected.ai_actions ?? []).length > 0 && (
                      <div className="pt-2">
                        <p className="text-xs text-on-surface-variant mb-1">AI Recommended Actions</p>
                        <ul className="space-y-1">
                          {selected.ai_actions.map((a) => (
                            <li key={a} className="flex items-start gap-1.5 text-sm text-on-surface">
                              <span className="material-symbols-outlined text-[14px] text-success-green">check_circle</span>
                              {a}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                  </div>
                </div>
                <div>
                  <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-3">Evidence ({selected.evidence?.length ?? 0})</h4>
                  {(selected.evidence ?? []).length > 0 ? (
                    <div className="grid grid-cols-3 gap-2">
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
              <div className="p-4 border-t border-border-subtle bg-surface space-y-2 sticky bottom-0">
                <button
                  type="button"
                  onClick={resolveReport}
                  disabled={busy || selected.status === 'Resolved'}
                  className="w-full bg-success-green hover:bg-success-green/90 text-white font-label-md text-label-md py-2 px-4 rounded-md transition-colors flex justify-center items-center disabled:opacity-60"
                >
                  <span className="material-symbols-outlined mr-2 text-[18px]">check_circle</span>
                  {selected.status === 'Resolved' ? 'Resolved' : busy ? 'Updating…' : 'Mark as Resolved'}
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
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
