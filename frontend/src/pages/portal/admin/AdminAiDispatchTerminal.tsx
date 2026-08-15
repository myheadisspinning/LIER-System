import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../../supabaseClient';
import Toast from '../../../components/Toast';
import type { EvidenceFile } from '../../../lib/ai';
import { logAudit, fetchOpenUnitAssignments, deriveUnitStatus } from '../../../lib/admin';
import { BARANGAY_HALL_CENTER } from '../../../lib/geo';

type ReportRow = {
  id: string;
  report_no: string | null;
  title: string;
  description: string | null;
  category: string;
  priority: string;
  threat: number;
  confidence: number;
  status: string;
  address: string | null;
  ai_dispatch: string | null;
  ai_actions: string[] | null;
  dispatch_unit_name: string | null;
  incident_time: string | null;
  evidence: EvidenceFile[] | null;
  created_at: string;
};

type UnitRow = {
  id: string;
  name: string;
  type: string;
  status: string;
  lat: number | null;
  lng: number | null;
  duty_days?: number[] | null;
};

const unitPin = divIcon({
  className: '',
  html: '<div class="relative w-5 h-5"><span class="absolute inset-0 rounded-full bg-blue-500 animate-ping opacity-40"></span><span class="absolute inset-0 m-auto w-4 h-4 rounded-full bg-blue-600 border-2 border-white shadow"></span></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-error-red/10 text-error-red border border-error-red/20',
  HIGH: 'bg-warning-amber/10 text-warning-amber border border-warning-amber/20',
  MEDIUM: 'bg-blue-100 text-blue-800 border border-blue-200',
  LOW: 'bg-slate-100 text-slate-600 border border-slate-200',
};

const PRIORITY_LABEL: Record<string, string> = {
  CRITICAL: 'PRIORITY 1: HIGH RISK',
  HIGH: 'PRIORITY 2: HIGH',
  MEDIUM: 'PRIORITY 2: MODERATE',
  LOW: 'PRIORITY 3: LOW',
};

const formatElapsed = (from: string, now: number) => {
  const mins = Math.max(0, Math.floor((now - new Date(from).getTime()) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ${mins % 60}m ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

export default function AdminAiDispatchTerminal() {
  const [reports, setReports] = useState<ReportRow[]>([]);
  const [units, setUnits] = useState<UnitRow[]>([]);
  const [openAssignments, setOpenAssignments] = useState<Record<string, string[]>>({});
  const [selectedId, setSelectedId] = useState('');
  const [targetUnitId, setTargetUnitId] = useState('');
  const [busy, setBusy] = useState(false);
  const [loading, setLoading] = useState(true);
  const [now, setNow] = useState<number>(() => Date.now());
  const [toast, setToast] = useState<{ type: 'success' | 'error'; message: string } | null>(null);

  const fetchAll = async () => {
    const [repRes, unitRes, openMap] = await Promise.all([
      supabase
        .from('incident_reports')
        .select('id, report_no, title, description, category, priority, threat, confidence, status, address, ai_dispatch, ai_actions, incident_time, evidence, dispatch_unit:dispatch_unit_id(name), created_at')
        .in('status', ['Pending', 'Verifying', 'Assigned'])
        .order('created_at', { ascending: false })
        .limit(30),
      supabase.from('dispatch_units').select('id, name, type, status, manual_status, lat, lng, duty_days'),
      fetchOpenUnitAssignments(),
    ]);
    const mapped = (repRes.data ?? []).map((r) => ({
      ...r,
      dispatch_unit_name: (r as unknown as { dispatch_unit: { name: string } | null }).dispatch_unit?.name ?? null,
    })) as ReportRow[];
    return {
      reports: mapped,
      units: (unitRes.data ?? []) as UnitRow[],
      openAssignments: openMap,
      repError: repRes.error?.message ?? null,
      unitError: unitRes.error?.message ?? null,
    };
  };

  const load = async () => {
    setLoading(true);
    const { reports, units, openAssignments } = await fetchAll();
    setReports(reports);
    setUnits(units);
    setOpenAssignments(openAssignments);
    setLoading(false);
  };

  useEffect(() => {
    void (async () => {
      const { reports, units, openAssignments } = await fetchAll();
      setReports(reports);
      setUnits(units);
      setOpenAssignments(openAssignments);
      setLoading(false);
    })();
  }, []);

  useEffect(() => {
    const t = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(t);
  }, []);

  const selected = useMemo(
    () => reports.find((r) => r.id === selectedId) ?? reports[0],
    [reports, selectedId],
  );

  const availableUnits = useMemo(
    () => units.filter((u) => deriveUnitStatus(u, openAssignments) === 'Available'),
    [units, openAssignments],
  );

  const recommendedUnit = useMemo(
    () => availableUnits.find((u) => u.type === 'Tanod') ?? availableUnits[0],
    [availableUnits],
  );

  const targetUnit = useMemo(
    () => units.find((u) => u.id === targetUnitId) ?? recommendedUnit,
    [units, targetUnitId, recommendedUnit],
  );

  const acceptDispatch = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      const unit = targetUnit;
      await supabase.from('incident_reports').update({ status: 'Assigned', dispatch_unit_id: unit?.id ?? null }).eq('id', selected.id);
      await logAudit('Accepted AI dispatch', `${selected.report_no ?? 'Report'} -> ${unit?.name ?? 'manual assignment'}.`);
      setToast({ type: 'success', message: `${selected.report_no ?? 'Report'} dispatched to ${unit?.name ?? 'desk queue'}.` });
      setTargetUnitId('');
      await load();
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Dispatch failed.' });
    } finally {
      setBusy(false);
    }
  };

  const manualOverride = async () => {
    if (!selected) return;
    setBusy(true);
    try {
      await supabase.from('incident_reports').update({ status: 'Pending', dispatch_unit_id: null }).eq('id', selected.id);
      await logAudit('Manual override', `${selected.report_no ?? 'Report'} unassigned for manual triage.`);
      setToast({ type: 'success', message: 'Overridden — unassigned for manual triage.' });
      setTargetUnitId('');
      await load();
    } catch (e) {
      setToast({ type: 'error', message: e instanceof Error ? e.message : 'Override failed.' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid grid-cols-12 gap-6">
      {/* Left Column: Pending Queue */}
      <section className="col-span-12 xl:col-span-4 flex flex-col bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle bg-surface-bg flex justify-between items-center shrink-0">
          <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider">Pending AI Dispatch Queue</h3>
          <span className="bg-surface-container-low text-secondary px-2 py-0.5 rounded text-xs font-bold">{reports.length} Waiting</span>
        </div>
        <div className="flex-1 p-4 space-y-3 bg-surface-bg overflow-y-auto">
          {loading && <div className="p-6 text-center text-sm text-slate-500">Loading queue…</div>}
          {!loading && reports.length === 0 && <div className="p-6 text-center text-sm text-slate-400">Queue is clear.</div>}
          {reports.map((r) => (
            <div
              key={r.id}
              onClick={() => setSelectedId(r.id)}
              className={`${selected?.id === r.id ? 'border-2 border-secondary shadow-md' : 'border border-border-subtle shadow-sm hover:border-secondary/50 hover:shadow'} bg-white rounded p-3 cursor-pointer transition-all relative overflow-hidden`}
            >
              {selected?.id === r.id && <div className="absolute left-0 top-0 bottom-0 w-1 bg-secondary"></div>}
              <div className="flex justify-between items-start mb-2 pl-2">
                <span className={`px-2 py-0.5 rounded font-caps-xs text-caps-xs ${PRIORITY_BADGE[r.priority] ?? PRIORITY_BADGE['LOW']}`}>{PRIORITY_LABEL[r.priority] ?? r.priority}</span>
                <span className="font-caps-xs text-caps-xs text-slate-500 flex items-center">
                  <span className="material-symbols-outlined text-[12px] mr-1">schedule</span>{formatElapsed(r.created_at, now)}
                </span>
              </div>
              <h4 className="font-label-md text-label-md font-bold pl-2 mb-1">{r.title}</h4>
              <p className="font-body-sm text-body-sm text-on-surface-variant pl-2 flex items-center mb-2">
                <span className="material-symbols-outlined text-[14px] mr-1 opacity-70">location_on</span>{r.address ?? 'Location on file'}
              </p>
              <div className="flex justify-between items-center pl-2 pt-2 border-t border-slate-50">
                <span className="text-xs text-slate-500">AI Score: <span className="text-secondary font-bold">{r.confidence}/100</span></span>
                <span className="text-xs font-medium text-secondary flex items-center">
                  <span className="material-symbols-outlined text-[14px] mr-1">smart_toy</span>{r.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Middle Column: AI Terminal */}
      <section className="col-span-12 xl:col-span-5 flex flex-col bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle bg-surface-bg flex justify-between items-center shrink-0">
          <div className="flex items-center gap-2">
            <span className="material-symbols-outlined text-secondary">memory</span>
            <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider">AI Recommendation Terminal</h3>
          </div>
          <span className="font-caps-xs text-caps-xs text-slate-400">INCIDENT ID: {selected?.report_no ?? '—'}</span>
        </div>
        <div className="flex-1 p-6 bg-white relative">
          {!selected ? (
            <div className="p-10 text-center text-sm text-slate-400">Select an incident from the queue.</div>
          ) : (
            <>
              {selected.priority === 'CRITICAL' && (
                <div className="mb-6 bg-error-red/5 border border-error-red/20 rounded-lg p-3 flex items-start gap-3">
                  <span className="material-symbols-outlined text-error-red mt-0.5" style={{ fontVariationSettings: "'FILL' 1" }}>local_police</span>
                  <div>
                    <h4 className="font-label-md text-label-md font-bold text-error-red uppercase">Critical Flag</h4>
                    <p className="text-sm text-slate-700 mt-1">
                      AI threat score of {selected.threat}/100. Protocols suggest immediate parallel notification to responders.
                    </p>
                  </div>
                </div>
              )}
              <div className="mb-6">
                <h4 className="font-caps-xs text-caps-xs text-slate-400 mb-2">INCIDENT CONTEXT</h4>
                <div className="bg-surface-bg border border-border-subtle rounded p-4">
                  <h2 className="font-headline-md text-headline-md font-bold mb-2">{selected.title}</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm">
                    <div><span className="text-slate-500 block text-xs uppercase">Location</span><span className="font-medium">{selected.address ?? 'Location on file'}</span></div>
                    <div><span className="text-slate-500 block text-xs uppercase">Category</span><span className="font-medium">{selected.category}</span></div>
                    <div><span className="text-slate-500 block text-xs uppercase">Reported Time</span><span className="font-medium">{new Date(selected.incident_time ?? selected.created_at).toLocaleString('en-PH', { dateStyle: 'short', timeStyle: 'short' })}</span></div>
                    <div><span className="text-slate-500 block text-xs uppercase">AI Confidence</span><span className="font-medium text-warning-amber">{selected.confidence}%</span></div>
                  </div>
                  {selected.description && (
                    <div className="mt-3 pt-3 border-t border-border-subtle">
                      <span className="text-slate-500 block text-xs uppercase mb-1">Description</span>
                      <p className="text-sm text-slate-700 leading-relaxed">{selected.description}</p>
                    </div>
                  )}
                  {(selected.evidence ?? []).length > 0 && (
                    <div className="mt-3 pt-3 border-t border-border-subtle">
                      <span className="text-slate-500 block text-xs uppercase mb-2">Evidence ({selected.evidence?.length})</span>
                      <div className="flex flex-wrap gap-2">
                        {selected.evidence?.map((ev) =>
                          ev.type.startsWith('image/') ? (
                            <a key={ev.url} href={ev.url} target="_blank" rel="noreferrer" className="w-16 h-16 rounded border border-border-subtle overflow-hidden group relative">
                              <img className="w-full h-full object-cover" src={ev.url} alt={ev.name} />
                              <span className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
                                <span className="material-symbols-outlined text-white text-sm">open_in_new</span>
                              </span>
                            </a>
                          ) : (
                            <a key={ev.url} href={ev.url} target="_blank" rel="noreferrer" className="flex items-center gap-1.5 px-2.5 py-1.5 rounded border border-border-subtle bg-white hover:bg-surface-bg transition-colors shadow-sm">
                              <span className="material-symbols-outlined text-slate-500 text-sm">{ev.type.startsWith('video') ? 'videocam' : 'mic'}</span>
                              <span className="text-[10px] font-bold text-slate-600 max-w-[110px] truncate">{ev.name}</span>
                            </a>
                          ),
                        )}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              <div className="mb-6">
                <h4 className="font-caps-xs text-caps-xs text-slate-400 mb-2">AI ASSESSMENT BREAKDOWN</h4>
                <div className="space-y-3">
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-secondary"></div>
                    <p className="text-sm text-slate-700"><strong className="text-slate-900">Proximity Match:</strong> {targetUnit?.name ?? 'Nearest unit'} is currently available for dispatch.</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-warning-amber"></div>
                    <p className="text-sm text-slate-700"><strong className="text-slate-900">Risk Profile:</strong> Threat score {selected.threat}/100 warrants {selected.priority === 'CRITICAL' ? 'immediate multi-unit response.' : 'priority response.'}</p>
                  </div>
                  <div className="flex items-start gap-3">
                    <div className="mt-1 w-2 h-2 rounded-full bg-error-red"></div>
                    <p className="text-sm text-slate-700"><strong className="text-slate-900">Recommended Actions:</strong> {selected.ai_dispatch ?? 'Manual triage required.'}</p>
                  </div>
                </div>
              </div>
              <div className="mt-8 border-2 border-secondary/20 rounded-lg bg-surface-container-low p-5 text-center relative overflow-hidden">
                <div className="absolute -right-4 -top-4 opacity-5"><span className="material-symbols-outlined text-[100px]">smart_toy</span></div>
                <h4 className="font-caps-xs text-caps-xs text-secondary mb-2 tracking-widest">PRIMARY RECOMMENDATION</h4>
                <p className="font-headline-md text-headline-md font-bold text-on-secondary-fixed mb-4">Dispatch {targetUnit?.name ?? 'nearest available unit'}</p>
                <div className="flex gap-4 justify-center">
                  <button type="button" onClick={acceptDispatch} disabled={busy} className="bg-success-green hover:bg-green-600 text-white font-label-md text-label-md px-6 py-3 rounded shadow-md transition flex items-center gap-2 disabled:opacity-60">
                    <span className="material-symbols-outlined text-sm">check_circle</span>
                    {busy ? 'Dispatching…' : 'Accept & Dispatch'}
                  </button>
                  <button type="button" onClick={manualOverride} disabled={busy} className="border border-error-red text-error-red hover:bg-error-red/5 font-label-md text-label-md px-6 py-3 rounded transition flex items-center gap-2 disabled:opacity-60">
                    <span className="material-symbols-outlined text-sm">block</span>
                    Manual Override
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </section>

      {/* Right Column: Radar */}
      <section className="col-span-12 xl:col-span-3 flex flex-col bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle bg-surface-bg flex justify-between items-center shrink-0">
          <h3 className="font-label-md text-label-md font-bold text-on-surface uppercase tracking-wider">Live Unit Radar</h3>
        </div>
        <div className="h-48 bg-slate-200 border-b border-border-subtle relative overflow-hidden">
          <MapContainer center={BARANGAY_HALL_CENTER} zoom={14} className="w-full h-full" zoomControl={false} attributionControl={false} scrollWheelZoom={false} dragging={false}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            {units.map((u) => u.lat != null && u.lng != null && <Marker key={u.id} position={[u.lat, u.lng]} icon={unitPin} />)}
          </MapContainer>
          {/* Radar overlay effects */}
          <div className="absolute inset-0 pointer-events-none">
            {/* Concentric circles */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-16 h-16 rounded-full border border-blue-400/30"></div>
              <div className="absolute w-28 h-28 rounded-full border border-blue-400/20"></div>
              <div className="absolute w-40 h-40 rounded-full border border-blue-400/10"></div>
            </div>
            {/* Radar sweep animation */}
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="w-full h-full relative">
                <div className="absolute inset-0 animate-spin" style={{ animationDuration: '4s' }}>
                  <div className="absolute top-1/2 left-1/2 w-1/2 h-0.5 bg-gradient-to-r from-blue-400/60 to-transparent origin-left -translate-y-1/2"></div>
                </div>
              </div>
            </div>
            {/* RADAR label */}
            <div className="absolute top-2 left-2 text-[9px] font-bold text-blue-600/70 tracking-widest">RADAR</div>
          </div>
          <div className="absolute inset-0 bg-gradient-to-t from-white/80 to-transparent pointer-events-none"></div>
          <div className="absolute bottom-2 left-2 right-2 flex justify-between px-2 text-[10px] font-bold text-slate-600 bg-white/80 rounded backdrop-blur py-1 border border-white/50">
            <span>{availableUnits.length} units available</span>
            <span>{units.length - availableUnits.length} engaged</span>
          </div>
        </div>
        <div className="flex-1 p-3 space-y-2 bg-surface-bg overflow-y-auto">
          <h4 className="font-caps-xs text-caps-xs text-slate-400 mb-2 pl-1">ON-DUTY TEAMS BY PROXIMITY</h4>
          {units.map((u) => {
            const isAvail = deriveUnitStatus(u, openAssignments) === 'Available';
            return (
              <div
                key={u.id}
                onClick={() => isAvail && setTargetUnitId(u.id)}
                className={`bg-white border rounded p-3 shadow-sm relative overflow-hidden transition ${isAvail ? (targetUnit?.id === u.id ? 'border-2 border-success-green ring-2 ring-success-green/30 cursor-pointer' : 'border-secondary group hover:bg-slate-50 cursor-pointer') : 'border-border-subtle opacity-70'}`}
              >
                <div className="flex justify-between items-center mb-1">
                  <h5 className="font-label-md text-label-md font-bold">{u.name}</h5>
                  <span className={`px-2 py-0.5 rounded text-[10px] font-bold border ${isAvail ? 'bg-success-green/10 text-success-green border-success-green/20' : 'bg-slate-100 text-slate-600 border-slate-200'}`}>{deriveUnitStatus(u, openAssignments).toUpperCase()}</span>
                </div>
                <div className="text-xs text-slate-500 flex justify-between items-center">
                  <span className="flex items-center"><span className="material-symbols-outlined text-[12px] mr-1">directions_run</span>{u.type}</span>
                  {isAvail ? (
                    <span className="flex items-center gap-0.5 text-[10px] font-bold">
                      {targetUnit?.id === u.id ? (
                        <>
                          <span className="material-symbols-outlined text-[12px] text-success-green">check_circle</span>
                          <span className="text-success-green">Target</span>
                        </>
                      ) : (
                        <>
                          <span className="material-symbols-outlined text-[12px]">my_location</span>
                          <span className="text-slate-400">Tap to target</span>
                        </>
                      )}
                    </span>
                  ) : (
                    <span className="text-slate-300">{deriveUnitStatus(u, openAssignments)}</span>
                  )}
                </div>
              </div>
            );
          })}
          {units.length === 0 && <div className="p-4 text-center text-xs text-slate-400">No units on record.</div>}
        </div>
      </section>
      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
