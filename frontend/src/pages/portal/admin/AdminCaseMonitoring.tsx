import { useEffect, useMemo, useState } from 'react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import { divIcon } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { supabase } from '../../../supabaseClient';
import { fmtDate, fmtDurationMs, PRIORITY_BADGE, STATUS_BADGE } from '../../../lib/admin';
import { BARANGAY_HALL_CENTER } from '../../../lib/geo';

const pin = divIcon({
  className: '',
  html: '<div class="relative w-6 h-6"><span class="absolute inset-0 rounded-full bg-red-500 animate-ping opacity-70"></span><span class="absolute inset-0 m-auto w-4 h-4 rounded-full bg-red-600 border-2 border-white"></span></div>',
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

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
};

const ACTIVE = ['Pending', 'Verifying', 'Assigned', 'Progress'];

export default function AdminCaseMonitoring() {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('All');
  const [tile, setTile] = useState<'street' | 'satellite'>('street');

  const fetchAll = async () => {
    const res = await supabase
      .from('incident_reports')
      .select('id, report_no, title, category, priority, status, address, lat, lng, created_at, assigned_at, resolved_at, dispatch_unit:dispatch_unit_id(name)')
      .order('created_at', { ascending: false })
      .limit(200);
    return (res.data ?? []).map((r) => ({
      ...r,
      dispatch_unit_name: (r as unknown as { dispatch_unit: { name: string } | null }).dispatch_unit?.name ?? null,
    })) as Row[];
  };

  useEffect(() => {
    void (async () => {
      setRows(await fetchAll());
      setLoading(false);
    })();
  }, []);

  const filtered = useMemo(() => (statusFilter === 'All' ? rows : rows.filter((r) => r.status === statusFilter)), [rows, statusFilter]);

  const stats = useMemo(() => {
    const active = rows.filter((r) => ACTIVE.includes(r.status));
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const month = rows.filter((r) => new Date(r.created_at) >= monthStart);
    const resolved = rows.filter((r) => r.status === 'Resolved');
    const highRisk = active.filter((r) => r.priority === 'CRITICAL');
    const durations = resolved
      .map((r) => (r.resolved_at ? new Date(r.resolved_at).getTime() - new Date(r.created_at).getTime() : null))
      .filter((d): d is number => d != null);
    const avg = durations.length ? durations.reduce((a, b) => a + b, 0) / durations.length : null;
    return {
      active: active.length,
      month: month.length,
      resolved: resolved.length,
      clearance: rows.length ? (resolved.length / rows.length) * 100 : 0,
      avgResolve: avg,
      highRisk: highRisk.length,
    };
  }, [rows]);

  const statusBreakdown = useMemo(() => {
    const statuses = ['Pending', 'Verifying', 'Assigned', 'Progress', 'Resolved', 'Rejected'];
    return statuses.map((s) => ({ status: s, count: rows.filter((r) => r.status === s).length }));
  }, [rows]);

  const maxBreakdown = Math.max(1, ...statusBreakdown.map((s) => s.count));

  const mapPins = filtered.filter((r) => r.lat != null && r.lng != null && r.status !== 'Rejected');

  return (
    <div className="space-y-6">
      <div className="flex justify-end gap-3">
        <select
          className="bg-white border border-border-subtle rounded-lg px-4 py-2 font-label-md text-label-md text-on-surface focus:ring-2 focus:ring-secondary focus:border-secondary outline-none"
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
        >
          <option>All</option>
          {['Pending', 'Verifying', 'Assigned', 'Progress', 'Resolved', 'Rejected'].map((s) => (
            <option key={s}>{s}</option>
          ))}
        </select>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-border-subtle p-6">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-2">AVG CASE RESOLUTION TIME</div>
          <div className="font-display-lg text-display-lg text-secondary">{fmtDurationMs(stats.avgResolve)}</div>
          <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">From report to Resolved</div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-6">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-2">TOTAL CASES (THIS MONTH)</div>
          <div className="font-display-lg text-display-lg text-on-surface">{stats.month} Cases</div>
          <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">{stats.active} still active</div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-6">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-2">CLEARANCE RATE</div>
          <div className="font-display-lg text-display-lg text-success-green">{stats.clearance.toFixed(1)}%</div>
          <div className="mt-2 font-body-sm text-body-sm text-on-surface-variant">{stats.resolved} resolved cases</div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-6 bg-error-red/5 border-error-red/20">
          <div className="font-caps-xs text-caps-xs text-error-red mb-2">ACTIVE HIGH-RISK INCIDENTS</div>
          <div className="font-display-lg text-display-lg text-error-red">{stats.highRisk} Ongoing</div>
          <div className="mt-2 font-body-sm text-body-sm text-error-red/80 flex items-center gap-1">
            <span className="material-symbols-outlined text-[16px]">gavel</span>
            Requires immediate review
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 h-[400px]">
        <div className="bg-white rounded-xl border border-border-subtle p-6 flex flex-col">
          <div className="flex justify-between items-center mb-4">
            <div className="font-caps-xs text-caps-xs text-on-surface-variant">INCIDENT HOTSPOT MAP</div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-on-surface-variant">{mapPins.length} pins</span>
              <button type="button" onClick={() => setTile((t) => (t === 'street' ? 'satellite' : 'street'))} className="flex items-center gap-1 px-2 py-1 bg-surface-container-low border border-border-subtle rounded hover:bg-surface-container-high transition-colors text-[11px]">
                <span className="material-symbols-outlined text-[14px]">layers</span>
                {tile === 'street' ? 'Satellite' : 'Street'}
              </button>
            </div>
          </div>
          <div className="flex-1 relative rounded-lg overflow-hidden border border-border-subtle/50 bg-slate-100">
            {mapPins.length > 0 ? (
              <MapContainer center={BARANGAY_HALL_CENTER} zoom={14} className="w-full h-full" scrollWheelZoom>
                <TileLayer attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                {tile === 'satellite' && (
                  <TileLayer attribution="Tiles &copy; Esri" url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" opacity={0.9} />
                )}
                {mapPins.map((r) => (
                  <Marker key={r.id} position={[r.lat as number, r.lng as number]} icon={pin}>
                    <Popup>
                      <p className="text-[10px] font-bold text-blue-600 uppercase">{r.report_no}</p>
                      <p className="text-sm font-semibold text-slate-900">{r.title}</p>
                      <p className="text-[11px] text-slate-500">{r.category} · {r.status}</p>
                    </Popup>
                  </Marker>
                ))}
              </MapContainer>
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-sm text-on-surface-variant">No incident locations for the current filter.</div>
            )}
          </div>
        </div>
        <div className="bg-white rounded-xl border border-border-subtle p-6 flex flex-col">
          <div className="font-caps-xs text-caps-xs text-on-surface-variant mb-4">CASE STATUS BREAKDOWN</div>
          <div className="flex-1 space-y-4">
            {statusBreakdown.map((s) => (
              <div key={s.status}>
                <div className="flex justify-between text-sm mb-1">
                  <span className="font-medium text-on-surface">{s.status}</span>
                  <span className="text-on-surface-variant">{s.count}</span>
                </div>
                <div className="h-2.5 bg-slate-100 rounded-full overflow-hidden">
                  <div className="h-full bg-secondary rounded-full" style={{ width: `${(s.count / maxBreakdown) * 100}%` }}></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-border-subtle overflow-hidden shadow-sm">
        <div className="px-5 py-4 border-b border-border-subtle flex justify-between items-center">
          <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Case Tracker</h3>
          <span className="text-xs text-on-surface-variant">Showing {filtered.length} of {rows.length}</span>
        </div>
        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-12 text-center text-sm text-on-surface-variant">Loading cases…</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-sm text-on-surface-variant">No cases found.</div>
          ) : (
            <table className="w-full text-left border-collapse">
              <thead className="bg-slate-50 border-b border-border-subtle">
                <tr>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Case ID</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Incident</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Location</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Responder</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Priority</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Status</th>
                  <th className="font-caps-xs text-caps-xs text-on-surface-variant py-3 px-4">Reported</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border-subtle">
                {filtered.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50 transition-colors">
                    <td className="py-3 px-4 font-medium text-secondary">{r.report_no ?? '—'}</td>
                    <td className="py-3 px-4">
                      <p className="text-on-surface font-medium">{r.title}</p>
                      <p className="text-xs text-on-surface-variant">{r.category}</p>
                    </td>
                    <td className="py-3 px-4 text-on-surface-variant max-w-[180px] truncate">{r.address ?? '—'}</td>
                    <td className="py-3 px-4 text-on-surface">{r.dispatch_unit_name ?? '—'}</td>
                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${PRIORITY_BADGE[r.priority]}`}>{r.priority}</span></td>
                    <td className="py-3 px-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${STATUS_BADGE[r.status] ?? 'bg-slate-100 text-slate-600'}`}>{r.status}</span></td>
                    <td className="py-3 px-4 text-on-surface-variant whitespace-nowrap">{fmtDate(r.created_at, 'short')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );
}
