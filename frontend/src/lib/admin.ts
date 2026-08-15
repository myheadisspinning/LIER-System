import { useEffect, useState } from 'react';
import { supabase } from '../supabaseClient';

export interface AdminProfile {
  id: string;
  fullname: string;
  email: string | undefined;
  role: string | null;
}

export async function getAdminProfile(): Promise<AdminProfile> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const user = session?.user;
  const profile = await supabase.from('public_users').select('fullname, role').eq('id', user?.id ?? '').maybeSingle();
  return {
    id: user?.id ?? '',
    fullname: (profile.data?.fullname as string) ?? (user?.user_metadata?.fullname as string) ?? user?.email ?? 'Staff',
    email: user?.email,
    role: (profile.data?.role as string) ?? null,
  };
}

export async function logAudit(action: string, detail: string, actor?: string, metadata?: Record<string, unknown>) {
  const profile = await getAdminProfile();
  await supabase.from('ai_audit_logs').insert({
    actor: actor ?? profile.fullname,
    action,
    detail,
    metadata: metadata ?? {},
  });
}

export function downloadCsv(filename: string, rows: Record<string, unknown>[]) {
  if (rows.length === 0) return;
  const cols = Object.keys(rows[0]);
  const esc = (v: unknown) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const csv = [cols.join(','), ...rows.map((r) => cols.map((c) => esc(r[c])).join(','))].join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

export function timeAgo(iso: string | null | undefined): string {
  if (!iso) return '—';
  const secs = Math.max(0, (Date.now() - new Date(iso).getTime()) / 1000);
  if (secs < 60) return `${Math.floor(secs)}s ago`;
  const mins = secs / 60;
  if (mins < 60) return `${Math.floor(mins)}m ago`;
  const hrs = mins / 60;
  if (hrs < 24) return `${Math.floor(hrs)}h ago`;
  const days = hrs / 24;
  return `${Math.floor(days)}d ago`;
}

export function fmtDurationMs(ms: number | null | undefined): string {
  if (ms == null || !isFinite(ms) || ms < 0) return '—';
  const secs = Math.round(ms / 1000);
  if (secs < 60) return `${secs}s`;
  const mins = Math.floor(secs / 60);
  if (mins < 60) return `${mins}m ${secs % 60}s`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}

export const fmtDate = (iso: string | null | undefined, style: 'short' | 'medium' = 'medium') =>
  iso ? new Date(iso).toLocaleString('en-PH', style === 'short' ? { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' } : { dateStyle: 'medium', timeStyle: 'short' }) : '—';

export const STATUS_BADGE: Record<string, string> = {
  Pending: 'bg-warning-amber/10 text-warning-amber',
  Verifying: 'bg-sky-100 text-sky-700',
  Assigned: 'bg-blue-100 text-blue-700',
  Progress: 'bg-warning-amber/10 text-warning-amber',
  Resolved: 'bg-success-green/10 text-success-green',
  Rejected: 'bg-error-red/10 text-error-red',
};

export const PRIORITY_BADGE: Record<string, string> = {
  CRITICAL: 'bg-error-red/10 text-error-red',
  HIGH: 'bg-warning-amber/10 text-warning-amber',
  MEDIUM: 'bg-sky-100 text-sky-700',
  LOW: 'bg-slate-100 text-slate-600',
};

export function fmtBytes(bytes: number | null | undefined): string {
  if (bytes == null) return '—';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  if (bytes < 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  return `${(bytes / (1024 * 1024 * 1024)).toFixed(2)} GB`;
}

export const DUTY_DAYS: { value: number; short: string; label: string }[] = [
  { value: 0, short: 'Sun', label: 'Sunday' },
  { value: 1, short: 'Mon', label: 'Monday' },
  { value: 2, short: 'Tue', label: 'Tuesday' },
  { value: 3, short: 'Wed', label: 'Wednesday' },
  { value: 4, short: 'Thu', label: 'Thursday' },
  { value: 5, short: 'Fri', label: 'Friday' },
  { value: 6, short: 'Sat', label: 'Saturday' },
];

export interface UnitDutyInput {
  id: string;
  status?: string | null;
  duty_days?: number[] | null;
  manual_status?: string | null;
}

export const UNIT_STATUS_CHOICES: { value: string; label: string }[] = [
  { value: 'Available', label: 'Available' },
  { value: 'En Route', label: 'En Route' },
  { value: 'On Scene', label: 'On Scene' },
  { value: 'Busy', label: 'Busy' },
  { value: 'Off-Duty', label: 'Off-Duty' },
];

export function isOnDutyToday(dutyDays?: number[] | null): boolean {
  const today = new Date().getDay();
  return Array.isArray(dutyDays) && dutyDays.length > 0 && dutyDays.includes(today);
}

export function dutyDaysLabel(dutyDays?: number[] | null): string {
  if (!Array.isArray(dutyDays) || dutyDays.length === 0) return 'No duty days';
  if (dutyDays.length === 7) return 'Every day';
  return DUTY_DAYS.filter((d) => dutyDays.includes(d.value))
    .map((d) => d.short)
    .join(' · ');
}

export function deriveUnitStatus(u: UnitDutyInput, openByUnit: Record<string, string[]>): 'En Route' | 'On Scene' | 'Available' | 'Busy' | 'Off-Duty' {
  if (u.manual_status) return u.manual_status as 'En Route' | 'On Scene' | 'Available' | 'Busy' | 'Off-Duty';
  const open = openByUnit[u.id];
  if (open && open.includes('Progress')) return 'On Scene';
  if (open && open.some((s) => s === 'Assigned' || s === 'Verifying')) return 'En Route';
  if (isOnDutyToday(u.duty_days)) return 'Available';
  return 'Off-Duty';
}

export async function fetchOpenUnitAssignments(): Promise<Record<string, string[]>> {
  const { data } = await supabase
    .from('incident_reports')
    .select('dispatch_unit_id, status')
    .in('status', ['Assigned', 'Verifying', 'Progress']);
  const map: Record<string, string[]> = {};
  for (const r of data ?? []) {
    if (!r.dispatch_unit_id) continue;
    (map[r.dispatch_unit_id] ??= []).push(r.status as string);
  }
  return map;
}

export const UNIT_STATUS_BADGE: Record<string, string> = {
  Available: 'bg-success-green/10 text-success-green',
  'En Route': 'bg-sky-100 text-sky-700',
  'On Scene': 'bg-warning-amber/10 text-warning-amber',
  Busy: 'bg-error-red/10 text-error-red',
  'Off-Duty': 'bg-slate-100 text-slate-500',
};

export const UNIT_STATUS_DOT: Record<string, string> = {
  Available: 'bg-success-green',
  'En Route': 'bg-warning-amber',
  'On Scene': 'bg-sky-500',
  Busy: 'bg-error-red',
  'Off-Duty': 'bg-slate-400',
};

export interface PresenceRow {
  user_id: string;
  user_name: string;
  role: string;
  last_seen_at: string;
}

export const ONLINE_THRESHOLD_MS = 60_000;

export function isOnlineSince(lastSeen: string | null | undefined): boolean {
  if (!lastSeen) return false;
  return Date.now() - new Date(lastSeen).getTime() <= ONLINE_THRESHOLD_MS;
}

async function upsertPresence(profile: { id: string; fullname: string; role: string | null }) {
  await supabase.from('presence').upsert(
    {
      user_id: profile.id,
      user_name: profile.fullname,
      role: profile.role ?? 'user',
      last_seen_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  );
}

export function usePresenceHeartbeat(intervalMs = 30_000) {
  useEffect(() => {
    let stopped = false;
    let timer: number | undefined;
    const beat = async () => {
      const profile = await getAdminProfile();
      if (!profile.id || stopped) return;
      await upsertPresence(profile);
      timer = window.setTimeout(beat, intervalMs);
    };
    void beat();
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      void (async () => {
        const profile = await getAdminProfile();
        if (!profile.id) return;
        await supabase.from('presence').upsert(
          { user_id: profile.id, last_seen_at: '1970-01-01T00:00:00Z' },
          { onConflict: 'user_id' },
        );
      })();
    };
  }, [intervalMs]);
}

export async function fetchStaffPresence(): Promise<PresenceRow[]> {
  const { data } = await supabase
    .from('presence')
    .select('user_id, user_name, role, last_seen_at')
    .in('role', ['admin', 'superadmin'])
    .order('last_seen_at', { ascending: false })
    .limit(10);
  return (data ?? []) as PresenceRow[];
}

export interface UnreadCounts {
  userUnread: number;
  adminUnread: number;
}

export async function fetchUnreadCounts(): Promise<UnreadCounts> {
  const { data, error } = await supabase.rpc('get_unread_counts');
  if (error || !data) {
    if (error) console.error('get_unread_counts failed:', error);
    return { userUnread: 0, adminUnread: 0 };
  }
  return {
    userUnread: Number(data.user_unread ?? 0),
    adminUnread: Number(data.admin_unread ?? 0),
  };
}

export async function markInquiriesRead() {
  const { error } = await supabase.rpc('mark_inquiries_read');
  if (error) console.error('mark_inquiries_read failed:', error);
}

export function useUnreadCounts(enabled = true, intervalMs = 5_000): UnreadCounts {
  const [counts, setCounts] = useState<UnreadCounts>({ userUnread: 0, adminUnread: 0 });
  useEffect(() => {
    if (!enabled) return;
    let stopped = false;
    const refresh = async () => {
      if (stopped) return;
      setCounts(await fetchUnreadCounts());
    };
    void refresh();
    const timer = window.setInterval(refresh, intervalMs);
    return () => {
      stopped = true;
      window.clearInterval(timer);
    };
  }, [enabled, intervalMs]);
  return counts;
}
