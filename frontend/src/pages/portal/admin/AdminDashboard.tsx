import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../../supabaseClient';
import { fmtDurationMs, fmtDate, timeAgo, PRIORITY_BADGE, deriveUnitStatus, fetchOpenUnitAssignments } from '../../../lib/admin';
import { BARANGAY_HALL_CENTER } from '../../../lib/geo';

const incidentPin = divIcon({
  className: '',
  html: '<div class="relative w-6 h-6"><span class="incident-radar-ring" style="--radar-color:#dc2626"></span><span class="incident-radar-ring incident-radar-ring--delayed" style="--radar-color:#dc2626"></span><span class="absolute inset-0 m-auto w-4 h-4 rounded-full bg-error border-2 border-white"></span></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

const unitPin = divIcon({
  className: '',
  html: '<div class="relative w-5 h-5"><span class="absolute inset-0 m-auto w-4 h-4 rounded-full bg-secondary border-2 border-white shadow"></span></div>',
  iconSize: [20, 20],
  iconAnchor: [10, 10],
});

type Incident = {
  id: string;
  report_no: string | null;
  title: string;
  category: string;
  priority: string;
  status: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  created_at: string;
  assigned_at: string | null;
  resolved_at: string | null;
};

type Unit = { id: string; name: string; type: string; status: string; lat: number | null; lng: number | null; last_location: string | null; duty_days?: number[] | null };
type LogRow = { id: string; actor: string; action: string; detail: string | null; created_at: string };

const ACTIVE_STATUSES = ['Pending', 'Verifying', 'Assigned', 'Progress'];

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function AdminDashboard() {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [units, setUnits] = useState<Unit[]>([]);
  const [openAssignments, setOpenAssignments] = useState<Record<string, string[]>>({});
  const [logs, setLogs] = useState<LogRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [trendEnd, setTrendEnd] = useState<number | null>(null);
  const [tile, setTile] = useState<'street' | 'satellite'>('street');

  useEffect(() => {
    void (async () => {
      const [repRes, unitRes, logRes, openMap] = await Promise.all([
        supabase
          .from('incident_reports')
          .select('id, report_no, title, category, priority, status, address, lat, lng, created_at, assigned_at, resolved_at')
          .order('created_at', { ascending: false })
          .limit(200),
        supabase.from('dispatch_units').select('id, name, type, status, manual_status, lat, lng, last_location, duty_days').order('name'),
        supabase.from('ai_audit_logs').select('id, actor, action, detail, created_at').order('created_at', { ascending: false }).limit(10),
        fetchOpenUnitAssignments(),
      ]);
      setIncidents((repRes.data ?? []) as Incident[]);
      setUnits((unitRes.data ?? []) as Unit[]);
      setLogs((logRes.data ?? []) as LogRow[]);
      setOpenAssignments(openMap);
      setTrendEnd(Date.now());
      setLoading(false);
    })();
  }, []);

  const stats = useMemo(() => {
    const active = incidents.filter((i) => ACTIVE_STATUSES.includes(i.status));
    const resolved = incidents.filter((i) => i.status === 'Resolved');
    const critical = incidents.filter((i) => i.priority === 'CRITICAL' && ACTIVE_STATUSES.includes(i.status));
    const unitField = units.filter((u) => deriveUnitStatus(u, openAssignments) !== 'Off-Duty');
    const unitBusy = units.filter((u) => ['En Route', 'On Scene', 'Busy'].includes(deriveUnitStatus(u, openAssignments)));

    const durations: number[] = [];
    for (const i of incidents) {
      if (i.resolved_at && i.created_at) durations.push(new Date(i.resolved_at).getTime() - new Date(i.created_at).getTime());
    }
    const avgResolve = durations.length
      ? durations.reduce((a, b) => a + b, 0) / durations.length
      : null;
    const clearance = incidents.length ? (resolved.length / incidents.length) * 100 : 0;
    return {
      active: active.length,
      critical: critical.length,
      unitField: unitField.length,
      unitBusy: unitBusy.length,
      avgResolve,
      clearance,
      resolved: resolved.length,
    };
  }, [incidents, units, openAssignments]);

  const byDay = useMemo(() => {
    if (trendEnd == null) return [] as { label: string; count: number }[];
    const map = new Map<string, number>();
    for (const i of incidents) {
      const key = dayKey(new Date(i.created_at));
      map.set(key, (map.get(key) ?? 0) + 1);
    }
    const days: { label: string; count: number }[] = [];
    for (let n = 13; n >= 0; n--) {
      const d = new Date(trendEnd - n * 86400000);
      days.push({ label: `${d.getMonth() + 1}/${d.getDate()}`, count: map.get(dayKey(d)) ?? 0 });
    }
    return days;
  }, [incidents, trendEnd]);

  const byCategory = useMemo(() => {
    const map = new Map<string, number>();
    for (const i of incidents) map.set(i.category, (map.get(i.category) ?? 0) + 1);
    return Array.from(map.entries())
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count);
  }, [incidents]);

  const maxDay = Math.max(1, ...byDay.map((d) => d.count));
  const maxCat = Math.max(1, ...byCategory.map((c) => c.count));

  const mapPins = useMemo(() => incidents.filter((i) => i.lat != null && i.lng != null && ACTIVE_STATUSES.includes(i.status)), [incidents]);

  return (
    <div className="flex flex-col gap-4">
      {loading && <div className="p-12 text-center text-sm text-on-surface-variant">Loading command dashboard…</div>}
      {!loading && (
        <>
          {/* KPI ROW */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 md:col-span-6 xl:col-span-3 bg-surface-container-lowest border border-border-subtle border-t-2 border-t-error rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="material-symbols-outlined text-error text-[22px]">emergency_home</span>
                <span className="px-2 py-1 rounded-full bg-error/10 text-error text-[11px] font-bold">{stats.critical} critical</span>
              </div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Active Incidents</p>
              <p className="font-headline-md text-headline-md font-bold text-on-surface">{stats.active}</p>
              <p className="text-xs text-on-surface-variant mt-1.5">across all statuses</p>
            </div>
            <div className="col-span-12 md:col-span-6 xl:col-span-3 bg-surface-container-lowest border border-border-subtle border-t-2 border-t-secondary rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="material-symbols-outlined text-secondary text-[22px]">local_police</span>
                <span className="px-2 py-1 rounded-full bg-secondary/10 text-sky-700 text-[11px] font-bold">{stats.unitBusy} busy</span>
              </div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Units On Field</p>
              <p className="font-headline-md text-headline-md font-bold text-on-surface">{stats.unitField}</p>
              <p className="text-xs text-on-surface-variant mt-1.5">responder units on duty</p>
            </div>
            <div className="col-span-12 md:col-span-6 xl:col-span-3 bg-surface-container-lowest border border-border-subtle border-t-2 border-t-tertiary rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="material-symbols-outlined text-tertiary text-[22px]">timer</span>
                <span className="px-2 py-1 rounded-full bg-tertiary/10 text-teal-700 text-[11px] font-bold">{stats.resolved} done</span>
              </div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Avg Resolution Time</p>
              <p className="font-headline-md text-headline-md font-bold text-on-surface">{fmtDurationMs(stats.avgResolve)}</p>
              <p className="text-xs text-on-surface-variant mt-1.5">from report to resolved</p>
            </div>
            <div className="col-span-12 md:col-span-6 xl:col-span-3 bg-surface-container-lowest border border-border-subtle border-t-2 border-t-secondary rounded-xl p-5 shadow-sm">
              <div className="flex items-center justify-between mb-3">
                <span className="material-symbols-outlined text-secondary text-[22px]">verified</span>
                <span className="px-2 py-1 rounded-full bg-secondary/10 text-secondary text-[11px] font-bold">{stats.resolved}</span>
              </div>
              <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-widest mb-1">Clearance Rate</p>
              <p className="font-headline-md text-headline-md font-bold text-on-surface">{stats.clearance.toFixed(1)}%</p>
              <div className="mt-2 h-1.5 w-full bg-surface-container-highest rounded-full overflow-hidden">
                <div className="h-full bg-secondary rounded-full" style={{ width: `${Math.min(100, stats.clearance)}%` }}></div>
              </div>
            </div>
          </div>

          {/* TREND + ACTIVITY */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-7 bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">bar_chart</span>
                  Incident Trend
                </h3>
                <span className="text-xs text-on-surface-variant">last 14 days</span>
              </div>
              <div className="flex items-end gap-1.5 h-40">
                {byDay.map((d) => (
                  <div key={d.label} className="flex-1 flex flex-col items-center gap-1 group" title={`${d.label}: ${d.count}`}>
                    <div className="w-full bg-secondary/20 rounded-t group-hover:bg-secondary/40 transition-colors relative" style={{ height: `${Math.max(3, (d.count / maxDay) * 100)}%` }}>
                      {d.count > 0 && <span className="absolute -top-5 left-1/2 -translate-x-1/2 text-[10px] font-bold text-on-surface">{d.count}</span>}
                    </div>
                    <span className="text-[9px] text-on-surface-variant">{d.label}</span>
                  </div>
                ))}
              </div>
            </div>
            <div className="col-span-12 lg:col-span-5 bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm flex flex-col">
              <div className="px-5 py-4 border-b border-border-subtle">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">assignment</span>
                  Recent Activity
                </h3>
              </div>
              <div className="flex-1 divide-y divide-border-subtle overflow-y-auto max-h-[300px]">
                {logs.map((l) => (
                  <div key={l.id} className="px-5 py-3 flex items-start gap-3">
                    <span className="w-2 h-2 rounded-full bg-secondary mt-2 shrink-0"></span>
                    <div className="min-w-0">
                      <p className="text-body-sm text-on-surface">
                        <span className="font-semibold">{l.actor}</span> · {l.action}
                      </p>
                      <p className="text-xs text-on-surface-variant truncate">{l.detail ?? '—'}</p>
                      <p className="text-[11px] text-on-surface-variant/70 mt-0.5">{timeAgo(l.created_at)}</p>
                    </div>
                  </div>
                ))}
                {logs.length === 0 && <div className="p-8 text-center text-sm text-on-surface-variant">No activity yet.</div>}
              </div>
            </div>
          </div>

          {/* MAP + CATEGORIES */}
          <div className="grid grid-cols-12 gap-4">
            <div className="col-span-12 lg:col-span-7 bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm overflow-hidden">
              <div className="px-5 py-4 border-b border-border-subtle flex flex-wrap items-center justify-between gap-2">
                <h3 className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2">
                  <span className="material-symbols-outlined text-secondary">map</span>
                  Live Incident Map
                </h3>
                <div className="flex items-center gap-3 text-[11px] font-semibold text-on-surface-variant">
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-error"></span>Incident</span>
                  <span className="flex items-center gap-1.5"><span className="w-2.5 h-2.5 rounded-full bg-secondary"></span>Unit</span>
                  <button type="button" onClick={() => setTile((t) => (t === 'street' ? 'satellite' : 'street'))} className="flex items-center gap-1 px-2 py-1 bg-surface-container-low border border-border-subtle rounded hover:bg-surface-container-high transition-colors">
                    <span className="material-symbols-outlined text-[14px]">layers</span>
                    {tile === 'street' ? 'Satellite' : 'Street'}
                  </button>
                </div>
              </div>
              <div className="relative h-[320px] bg-surface-container-low overflow-hidden isolate">
                {mapPins.length > 0 ? (
                  <MapContainer center={BARANGAY_HALL_CENTER} zoom={13} className="w-full h-full" scrollWheelZoom>
                    <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                    {tile === 'satellite' && (
                      <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" opacity={0.9} />
                    )}
                    {mapPins.map((i) => (
                      <Marker key={i.id} position={[i.lat as number, i.lng as number]} icon={incidentPin}>
                        <Popup>
                          <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{i.report_no}</p>
                          <p className="text-sm font-semibold text-on-surface">{i.title}</p>
                          <p className="text-[11px] text-on-surface-variant">{i.category} · {fmtDate(i.created_at, 'short')}</p>
                        </Popup>
                      </Marker>
                    ))}
                    {units.filter((u) => u.lat != null && u.lng != null && deriveUnitStatus(u, openAssignments) !== 'Off-Duty').map((u) => (
                      <Marker key={u.id} position={[u.lat as number, u.lng as number]} icon={unitPin}>
                        <Popup>
                          <p className="text-sm font-semibold text-on-surface">{u.name}</p>
                          <p className="text-[11px] text-on-surface-variant">{u.type} · {deriveUnitStatus(u, openAssignments)}</p>
                        </Popup>
                      </Marker>
                    ))}
                  </MapContainer>
                ) : (
                  <div className="absolute inset-0 flex items-center justify-center text-sm text-on-surface-variant">No active incidents with pinned locations.</div>
                )}
              </div>
            </div>
            <div className="col-span-12 lg:col-span-5 bg-surface-container-lowest border border-border-subtle rounded-xl shadow-sm p-5">
              <h3 className="font-headline-md text-headline-md font-bold text-on-surface flex items-center gap-2 mb-4">
                <span className="material-symbols-outlined text-secondary">category</span>
                Incidents by Category
              </h3>
              {byCategory.length === 0 ? (
                <p className="text-sm text-on-surface-variant">No incident data yet.</p>
              ) : (
                <div className="space-y-3">
                  {byCategory.map((c) => (
                    <div key={c.category}>
                      <div className="flex justify-between text-body-sm mb-1">
                        <span className="font-medium text-on-surface">{c.category}</span>
                        <span className="text-on-surface-variant">{c.count}</span>
                      </div>
                      <div className="h-2 bg-surface-container-highest rounded-full overflow-hidden">
                        <div className="h-full bg-secondary rounded-full" style={{ width: `${(c.count / maxCat) * 100}%` }}></div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              <div className="mt-5 border-t border-border-subtle pt-4">
                <h4 className="font-caps-xs text-caps-xs text-on-surface-variant uppercase tracking-wider mb-3">Priority Split</h4>
                <div className="flex flex-wrap gap-2">
                  {['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => {
                    const n = incidents.filter((i) => i.priority === p).length;
                    return (
                      <span key={p} className={`px-2 py-1 rounded-full text-xs font-semibold ${PRIORITY_BADGE[p]}`}>
                        {p}: {n}
                      </span>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}

