import { divIcon } from 'leaflet';

export const PRIORITY_COLORS: Record<string, string> = {
  CRITICAL: '#dc2626',
  HIGH: '#f59e0b',
  MEDIUM: '#0d9488',
  LOW: '#0d9488',
};

export const pinIconFor = (priority: string) => {
  const c = PRIORITY_COLORS[priority] ?? '#0d9488';
  return divIcon({
    className: '',
    html: `<div style="position:relative;width:32px;height:32px"><span class="incident-radar-ring" style="--radar-color:${c}"></span><span class="incident-radar-ring incident-radar-ring--delayed" style="--radar-color:${c}"></span><span style="position:absolute;inset:0;margin:auto;width:18px;height:18px;border-radius:9999px;background:${c};opacity:.25;border:2px solid #0b1220"></span><span style="position:absolute;inset:0;margin:auto;width:10px;height:10px;border-radius:9999px;background:${c}"></span></div>`,
    iconSize: [32, 32],
    iconAnchor: [16, 16],
  });
};

export const closedPinIcon = () =>
  divIcon({
    className: '',
    html: '<div style="position:relative;width:24px;height:24px"><span style="position:absolute;inset:0;margin:auto;width:10px;height:10px;border-radius:9999px;background:#94a3b8;border:2px solid #ffffff;box-shadow:0 1px 3px rgba(0,0,0,.35)"></span></div>',
    iconSize: [24, 24],
    iconAnchor: [12, 12],
  });
