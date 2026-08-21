import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import { latLngBounds } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../../supabaseClient';
import IncidentDetailModal from '../../../components/IncidentDetailModal';
import { fmtDate, fmtDurationMs, PRIORITY_BADGE, STATUS_BADGE } from '../../../lib/admin';
import { BARANGAY_HALL_CENTER } from '../../../lib/geo';
import { PRIORITY_COLORS, pinIconFor, closedPinIcon } from '../../../lib/mapPins';

type Row = {
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
  dispatch_unit_name: string | null;
  user_id: string | null;
  anonymous: boolean;
};

type ReporterProfile = {
  id: string;
  fullname: string;
};

const ACTIVE = ['Pending', 'Verifying', 'Assigned', 'Progress'];
const STATUSES = ['Pending', 'Verifying', 'Assigned', 'Progress', 'Resolved', 'Rejected'];
const DAY_MS = 86_400_000;

const dayKey = (d: Date) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

const fmtAge = (ms: number) => {
  const h = Math.floor(ms / 3_600_000);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d ${h % 24}h`;
};

const ageBadgeClass = (ms: number) => {
  const h = ms / 3_600_000;
  if (h < 24) return 'bg-slate-100 text-slate-600';
  if (h < 72) return 'bg-warning-amber/10 text-warning-amber';
  return 'bg-error-red/10 text-error-red';
};

function FitBounds({ pins }: { pins: Row[] }) {
  const map = useMap();
  useEffect(() => {
    if (pins.length === 0) {
      map.setView(BARANGAY_HALL_CENTER, 13);
      return;
    }
    map.fitBounds(latLngBounds(pins.map((r) => [r.lat as number, r.lng as number])), { padding: [30, 30] });
  }, [pins, map]);
  return null;
}

export default function AdminCaseMonitoring() {
  const [rows, setRows] = useState<Row[]>([]);
  const [reporterMap, setReporterMap] = useState<Record<string, ReporterProfile>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [statusFilter, setStatusFilter] = useState('All');
  const [scope, setScope] = useState<'active' | 'all'>('all');
  const [tile, setTile] = useState<'street' | 'satellite'>('street');
  const [loadedAt, setLoadedAt] = useState(0);
  const [selectedId, setSelectedId] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      const res = await supabase
        .from('incident_reports')
        .select('id, report_no, title, category, priority, status, address, lat, lng, created_at, assigned_at, resolved_at, anonymous, dispatch_unit:dispatch_unit_id(name), user_id')
        .order('created_at', { ascending: false })
        .limit(2000);
      if (res.error) setError(res.error.message);
      const mapped = (res.data ?? []).map((r) => {
        const embed = (r as unknown as { dispatch_unit: { name: string } | { name: string }[] | null }).dispatch_unit;
        return {
          ...r,
          dispatch_unit_name: (Array.isArray(embed) ? embed[0]?.name : embed?.name) ?? null,
        };
      }) as Row[];

      const userIds = [...new Set(mapped.map((r) => r.user_id).filter(Boolean))] as string[];
      const rMap: Record<string, ReporterProfile> = {};
      if (userIds.length > 0) {
        const { data: reporterRows } = await supabase
          .from('public_users')
          .select('id, fullname')
          .in('id', userIds);
        for (const row of (reporterRows ?? []) as ReporterProfile[]) {
          rMap[row.id] = row;
        }
      }

      setRows(mapped);
      setReporterMap(rMap);
      setLoadedAt(Date.now());
      setLoading(false);
    })();
  }, []);

  const scoped = useMemo(() => (statusFilter === 'All' ? rows : rows.filter((r) => r.status === statusFilter)), [rows, statusFilter]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => ACTIVE.includes(r.status));
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const month = rows.filter((r) => new Date(r.created_at) >= monthStart);
    const resolved = rows.filter((r) => r.status === 'Resolved');
    const criticalActive = active.filter((r) => r.priority === 'CRITICAL');
    const durations = resolved
      .map((r) => (r.resolved_at ? new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime() : null))
      .filter((d): d is number => d != null);
    const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    return {
      activeCount: active.length,
      monthCount: month.length,
      resolvedCount: resolved.length,
      clearance: rows.length ? (resolved.length / rows.length) * 100 : 0,
      avgResolve: avg,
      criticalActive: criticalActive.length,
    };
  }, [rows]);

  const trend = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const days: { key: string; dow: string; full: string; count: number }[] = [];
    for (let i = 13; i >= 0; i--) {
      const d = new Date(today.getTime() - i * DAY_MS);
      days.push({
        key: dayKey(d),
        dow: d.toLocaleDateString('en-PH', { weekday: 'short' }),
        full: d.toLocaleDateString('en-PH', { month: 'short', day: 'numeric' }),
        count: 0,
      });
    }
    const byKey = new Map(days.map((d) => [d.key, d]));
    for (const r of rows) {
      const hit = byKey.get(dayKey(new Date(r.created_at)));
      if (hit) hit.count += 1;
    }
    return days;
  }, [rows]);

  const trendMeta = useMemo(() => {
    const max = Math.max(1, ...trend.map((d) => d.count));
    const peak = trend.reduce((a, b) => (b.count > a.count ? b : a), trend[0]);
    const sum = (arr: typeof trend) => arr.reduce((a, b) => a + b.count, 0);
    const last7 = sum(trend.slice(7));
    const prev7 = sum(trend.slice(0, 7));
    const deltaPct = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 100) : null;
    return { max, peak, deltaPct };
  }, [trend]);

  const statusBreakdown = useMemo(() => STATUSES.map((s) => ({ status: s, count: rows.filter((r) => r.status === s).length })), [rows]);
  const maxStatus = Math.max(1, ...statusBreakdown.map((s) => s.count));

  const categoryBreakdown = useMemo(() => {
    const counts = new Map<string, number>();
    for (const r of rows) counts.set(r.category, (counts.get(r.category) ?? 0) + 1);
    return [...counts.entries()]
      .map(([category, count]) => ({ category, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 6);
  }, [rows]);
  const maxCategory = Math.max(1, ...categoryBreakdown.map((c) => c.count));

  const prioritySplit = useMemo(
    () => ['CRITICAL', 'HIGH', 'MEDIUM', 'LOW'].map((p) => ({ priority: p, count: rows.filter((r) => r.priority === p).length })),
    [rows],
  );

  const aging = useMemo(() => {
    const now = loadedAt;
    const active = rows.filter((r) => ACTIVE.includes(r.status));
    const ageOf = (r: Row) => now - new Date(r.created_at).getTime();
    const buckets = { fresh: 0, mid: 0, old: 0 };
    for (const r of active) {
      const h = ageOf(r) / 3_600_000;
      if (h < 24) buckets.fresh += 1;
      else if (h < 72) buckets.mid += 1;
      else buckets.old += 1;
    }
    const oldest = [...active].sort((a, b) => ageOf(b) - ageOf(a)).slice(0, 5).map((r) => ({ row: r, ageMs: ageOf(r) }));
    return { buckets, oldest };
  }, [rows, loadedAt]);

  const mapPins = useMemo(
    () => scoped.filter((r) => r.lat != null && r.lng != null && (scope === 'all' || ACTIVE.includes(r.status))),
    [scoped, scope],
  );

  const openCase = (id: string) => setSelectedId(id);

  if (loading) {
    return <div className="p-12 text-center text-sm text-on-surface-variant">Loading case analytics…</div>;
  }
  if (error) {
    return <div className="p-12 text-center text-sm text-error-red">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
        <div className="bg-white rounded-xl border border-border-subtle p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-2">ACTIVE CASES</div>
          <div className="font-display-lg text-display-lg text-on-surface">{stats.activeCount}</div>
          <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">{stats.criticalActive} critical priority</div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-2">TOTAL CASES (THIS MONTH)</div>
          <div className="font-display-lg text-display-lg text-secondary">{stats.monthCount}</div>
          <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">{rows.length} all time</div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-2">CLEARANCE RATE</div>
          <div className="font-display-lg text-display-lg text-success-green">{stats.clearance.toFixed(1)}%</div>
          <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">{stats.resolvedCount} resolved cases</div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-5">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-2">AVG RESOLUTION TIME</div>
          <div className="font-display-lg text-display-lg text-on-surface">{fmtDurationMs(stats.avgResolve)}</div>
          <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">From report to Resolved</div>
        </div>
        <div className="bg-white rounded-xl border border-error-red/20 bg-error-red/5 p-5">
          <div className="font-caps-xs text-caps-xs text-error-red mb-2">ACTIVE HIGH-RISK INCIDENTS</div>
          <div className="font-display-lg text-display-lg text-error-red">{stats.criticalActive}</div>
          <div className="mt-2 font-body-sm text-body-sm text-error-red/80 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            Requires immediate review
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border-subtle p-6">
        <div className="flex justify-between items-center flex-wrap gap-3 mb-4">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant">CASE VOLUME · LAST 14 DAYS</div>
          <div className="flex items-center gap-3 text-xs">
            {trendMeta.deltaPct != null && (
              <span className={`flex items-center gap-1 font-semibold ${trendMeta.deltaPct > 0 ? 'text-error-red' : 'text-success-green'}`}>
                <span className="material-symbols-outlined text-[14px]">{trendMeta.deltaPct > 0 ? 'trending_up' : 'trending_down'}</span>
                {trendMeta.deltaPct > 0 ? '+' : ''}
                {trendMeta.deltaPct}% vs prior week
              </span>
            )}
            <span className="text-on-surface-variant">Peak: {trendMeta.peak.full} ({trendMeta.peak.count})</span>
          </div>
        </div>
        <div className="flex items-end gap-1.5 h-40">
          {trend.map((d) => (
            <div key={d.key} className="flex-1 flex flex-col items-center gap-1 h-full group">
              <div className="w-full flex-1 flex items-end justify-center">
                <div
                  className={`w-full max-w-[28px] rounded-t transition-all group-hover:opacity-80 ${d.key === trendMeta.peak.key && d.count > 0 ? 'bg-error-red' : 'bg-secondary'}`}
                  style={{ height: `${d.count === 0 ? 0 : Math.max((d.count / trendMeta.max) * 100, 4)}%` }}
                  title={`${d.count} case${d.count === 1 ? '' : 's'} · ${d.full}`}
                />
              </div>
              <span className="text-[10px] text-on-surface-variant">{d.dow}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-border-subtle p-6">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-4">CASE STATUS BREAKDOWN</div>
          <div className="space-y-4">
            {statusBreakdown.map((s) => (
              <div key={s.status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-on-surface">{s.status}</span>
                  <span className="text-on-surface-variant">{s.count}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: `${(s.count / maxStatus) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-6">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-4">CASES BY CATEGORY</div>
          {categoryBreakdown.length === 0 ? (
            <div className="text-sm text-on-surface-variant">No cases yet.</div>
          ) : (
            <div className="space-y-4">
              {categoryBreakdown.map((c) => (
                <div key={c.category}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="font-medium text-on-surface capitalize">{c.category}</span>
                    <span className="text-on-surface-variant">{c.count}</span>
                  </div>
                  <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                    <div className="h-full bg-secondary rounded-full" style={{ width: `${(c.count / maxCategory) * 100}%` }}></div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-6">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-4">PRIORITY SPLIT</div>
          <div className="space-y-4">
            {prioritySplit.map((p) => (
              <div key={p.priority} className="flex items-center justify-between">
                <span className="flex items-center gap-2 text-sm font-medium text-on-surface">
                  <span className="w-2.5 h-2.5 rounded-full" style={{ background: PRIORITY_COLORS[p.priority] }}></span>
                  {p.priority}
                </span>
                <span className={`px-2 py-0.5 rounded-full text-xs font-semibold ${PRIORITY_BADGE[p.priority]}`}>{p.count}</span>
              </div>
            ))}
          </div>
          <div className="mt-6 pt-4 border-t border-border-subtle space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Open &lt; 24h</span>
              <span className="font-semibold text-on-surface">{aging.buckets.fresh}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Open 1–3 days</span>
              <span className="font-semibold text-on-surface">{aging.buckets.mid}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-on-surface-variant">Open &gt; 3 days</span>
              <span className="font-semibold text-error-red">{aging.buckets.old}</span>
            </div>
          </div>
        </div>
      </div>

      <section className="bg-white rounded-xl border border-border-subtle shadow-sm overflow-hidden">
        <div className="p-4 border-b border-border-subtle flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-secondary">map</span>
            <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Incident Hotspot Map</h3>
            <span className="bg-secondary/10 text-secondary px-2 py-0.5 rounded-full text-[11px] font-bold">{mapPins.length} PIN{mapPins.length === 1 ? '' : 'S'}</span>
          </div>
          <div className="flex items-center gap-3 flex-wrap">
            <span className="flex items-center gap-1.5 text-[11px] font-semibold text-on-surface-variant">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#94a3b8' }}></span>
              Closed
            </span>
            {(['CRITICAL', 'HIGH', 'MEDIUM'] as const).map((p) => (
              <span key={p} className="flex items-center gap-1.5 text-[11px] font-semibold text-on-surface-variant">
                <span className="w-2.5 h-2.5 rounded-full" style={{ background: PRIORITY_COLORS[p] }}></span>
                {p}
              </span>
            ))}
            <div className="flex rounded-lg border border-border-subtle overflow-hidden text-[11px] font-semibold">
              <button
                type="button"
                onClick={() => setScope('active')}
                className={`px-2.5 py-1.5 transition-colors ${scope === 'active' ? 'bg-secondary text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                Active only
              </button>
              <button
                type="button"
                onClick={() => setScope('all')}
                className={`px-2.5 py-1.5 transition-colors ${scope === 'all' ? 'bg-secondary text-white' : 'bg-surface-container-low text-on-surface-variant hover:bg-surface-container-high'}`}
              >
                Full history
              </button>
            </div>
            <button type="button" onClick={() => setTile((t) => (t === 'street' ? 'satellite' : 'street'))} className="flex items-center gap-1 px-2 py-1 bg-surface-container-low border border-border-subtle rounded hover:bg-surface-container-high transition-colors text-[11px]">
              <span className="material-symbols-outlined text-[14px]">layers</span>
              {tile === 'street' ? 'Satellite' : 'Street'}
            </button>
          </div>
        </div>
        <div className="relative h-[420px] bg-slate-100 overflow-hidden isolate">
          {mapPins.length > 0 ? (
            <MapContainer center={BARANGAY_HALL_CENTER} zoom={13} className="w-full h-full" scrollWheelZoom>
              <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
              {tile === 'satellite' && (
                <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" opacity={0.9} />
              )}
              <FitBounds pins={mapPins} />
              {mapPins.map((r) => (
                <Marker
                  key={r.id}
                  position={[r.lat as number, r.lng as number]}
                  icon={ACTIVE.includes(r.status) ? pinIconFor(r.priority) : closedPinIcon()}
                >
                  <Popup>
                    <div className="min-w-[180px]">
                      <p className="text-[10px] font-bold text-blue-600 uppercase tracking-wider">{r.report_no ?? 'Report'}</p>
                      <p className="text-sm font-semibold text-slate-900 leading-snug mt-0.5">{r.title}</p>
                      <div className="flex items-center gap-2 mt-1">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${PRIORITY_BADGE[r.priority] ?? 'bg-slate-100 text-slate-600'}`}>{r.priority}</span>
                        <span className="text-[11px] text-slate-500">{r.category} · {r.status}</span>
                      </div>
                    </div>
                  </Popup>
                </Marker>
              ))}
            </MapContainer>
          ) : (
            <div className="absolute inset-0 flex items-center justify-center">
              <div className="bg-white/90 border border-border-subtle rounded-lg px-5 py-3 text-sm text-on-surface-variant shadow-sm">No incident locations for the current filter.</div>
            </div>
          )}
        </div>
      </section>

      <div className="bg-white rounded-xl border border-border-subtle shadow-sm">
        <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center flex-wrap gap-2">
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Needs Attention — Oldest Active Cases</h3>
          <span className="text-xs text-on-surface-variant">Click a case to open it in Incident Reporting</span>
        </div>
        {aging.oldest.length === 0 ? (
          <div className="p-8 text-center text-sm text-on-surface-variant">No active cases — everything is resolved.</div>
        ) : (
          <div className="divide-y divide-border-subtle">
            {aging.oldest.map(({ row: r, ageMs }) => (
              <button
                key={r.id}
                type="button"
                onClick={() => openCase(r.id)}
                className="w-full flex items-center justify-between gap-4 px-5 py-3 hover:bg-slate-50 transition-colors text-left"
              >
                <div className="min-w-0">
                  <p className="text-sm font-medium text-secondary">{r.report_no ?? '—'}</p>
                  <p className="text-sm text-on-surface truncate">{r.title}<span className="text-on-surface-variant"> · {r.category}</span></p>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold ${PRIORITY_BADGE[r.priority] ?? 'bg-slate-100 text-slate-600'}`}>{r.priority}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${ageBadgeClass(ageMs)}`}>{fmtAge(ageMs)} open</span>
                  <span className="material-symbols-outlined text-[18px] text-on-surface-variant">chevron_right</span>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center flex-wrap gap-3">
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Case Tracker</h3>
          <div className="flex items-center gap-3">
            <select
              className="bg-white border border-border-subtle rounded-lg px-3 py-1.5 font-label-md text-label-md text-on-surface focus:ring-2 focus:ring-secondary focus:border-secondary outline-none"
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
            >
              <option>All</option>
              {STATUSES.map((s) => (
                <option key={s}>{s}</option>
              ))}
            </select>
            <span className="text-xs text-on-surface-variant">Showing {scoped.length} of {rows.length}</span>
          </div>
        </div>
        <div className="overflow-x-auto">
          {scoped.length === 0 ? (
            <div className="p-12 text-center text-sm text-on-surface-variant">No cases found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-border-subtle">
                <tr>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Case ID</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Incident</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Reporter</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Location</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Responder</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Priority</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Status</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Reported</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {scoped.map((r) => (
                  <tr key={r.id} onClick={() => openCase(r.id)} className="hover:bg-slate-50 transition-colors cursor-pointer">
                    <td className="py-3 px-4 font-medium text-secondary">{r.report_no ?? '—'}</td>
                    <td className="py-3 px-4">
                      <p className="text-on-surface font-medium">{r.title}</p>
                      <p className="text-xs text-on-surface-variant">{r.category}</p>
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant text-sm">{r.anonymous ? 'Anonymous' : r.user_id && reporterMap[r.user_id] ? reporterMap[r.user_id].fullname : '—'}</td>
                    <td className="py-3 px-4 text-on-surface-variant max-w-[180px] truncate">{r.address ?? '—'}</td>
                    <td className="py-3 px-4 text-on-surface">{r.dispatch_unit_name ?? '—'}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${PRIORITY_BADGE[r.priority]}`}>{r.priority}</span></td>
                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{r.status}</span></td>
                    <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">{fmtDate(r.created_at, 'short')}</td>
                    <td className="py-3 px-4 text-right"><span className="material-symbols-outlined text-[18px] text-on-surface-variant">open_in_new</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
      <IncidentDetailModal reportId={selectedId} onClose={() => setSelectedId(null)} />
    </div>
  );
}
