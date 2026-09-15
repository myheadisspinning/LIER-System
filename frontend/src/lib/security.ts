import { supabase } from '../supabaseClient';

export interface GateResult {
  ok: boolean;
  banned: boolean;
  error?: string;
  retryAfterSeconds?: number;
  ip?: string;
}

// Run the auth-gate edge function. In 'check' mode it refuses the call when
// the caller's IP is banned; in 'record' mode it logs one auth attempt and
// applies/enforces the escalating IP ban policy.
export async function authGate(
  mode: 'check' | 'record',
  opts: { email?: string; userId?: string; success?: boolean; reason?: string } = {},
): Promise<GateResult> {
  try {
    const { data, error } = await supabase.functions.invoke('auth-gate', {
      body: { mode, ...opts },
    });

    if (error) {
      return { ok: false, banned: false, error: error.message || 'Rate limit check failed' };
    }

    return {
      ok: data?.ok !== false,
      banned: data?.banned === true,
      error: data?.error,
      retryAfterSeconds: data?.retry_after_seconds,
      ip: data?.ip,
    };
  } catch (err) {
    return { ok: false, banned: false, error: err instanceof Error ? err.message : 'Rate limit check failed' };
  }
}

export async function isIpBanned(): Promise<GateResult> {
  return authGate('check');
}

export async function recordAuthAttempt(opts: {
  email?: string;
  userId?: string;
  success?: boolean;
  reason?: string;
} = {}): Promise<GateResult> {
  return authGate('record', opts);
}

export function formatRetryAfter(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s}s`;
  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins} min`;
  const hrs = Math.floor(mins / 60);
  return `${hrs}h ${mins % 60}m`;
}