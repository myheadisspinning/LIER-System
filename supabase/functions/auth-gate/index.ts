import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-max-age': '86400',
};

const WHITELISTED_EMAILS = ['superadminculiat@gmail.com'];

function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  const raw = forwarded
    ? forwarded.split(',')[0].trim()
    : 'unknown';
  return raw.replace(/^::ffff:/, '');
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { mode, email, userId, success, reason } = await req.json();
    const ip = getClientIp(req);

    if (!mode || (mode !== 'check' && mode !== 'record')) {
      return Response.json(
        { ok: false, error: 'mode must be "check" or "record"' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    if (mode === 'check') {
      const { data, error } = await supabase.rpc('is_ip_banned', { p_ip: ip });
      if (error) {
        console.error('is_ip_banned error:', error);
        return Response.json(
          { ok: false, error: 'Rate limit check failed' },
          { status: 500, headers: corsHeaders }
        );
      }

      const banned = data?.banned === true;

      if (banned) {
        const retryAfter = data?.retry_after_seconds ?? 0;
        return Response.json(
          {
            ok: false,
            banned: true,
            error: `Too many login attempts from this network. Try again in ${formatDuration(retryAfter)}.`,
            retry_after_seconds: retryAfter,
          },
          { status: 429, headers: { ...corsHeaders, 'Retry-After': String(retryAfter) } }
        );
      }

      return Response.json(
        { ok: true, banned: false, ip },
        { headers: corsHeaders }
      );
    }

    // mode === 'record'
    const normalizedEmail = email?.toLowerCase() ?? '';
    const isWhitelisted = WHITELISTED_EMAILS.includes(normalizedEmail);

    if (isWhitelisted) {
      return Response.json(
        { ok: true, banned: false, recorded: false, ip },
        { headers: corsHeaders }
      );
    }

    const { data: bannedNow, error } = await supabase.rpc('record_auth_attempt', {
      p_ip: ip,
      p_email: normalizedEmail || null,
      p_user_id: userId || null,
      p_success: !!success,
      p_reason: reason || null,
    });

    if (error) {
      console.error('record_auth_attempt error:', error);
      return Response.json(
        { ok: false, error: 'Failed to record attempt' },
        { status: 500, headers: corsHeaders }
      );
    }

    return Response.json(
      { ok: true, banned: bannedNow === true, recorded: true, ip },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('Auth gate error:', err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});

function formatDuration(seconds: number): string {
  const s = Math.max(0, Math.round(seconds));
  if (s < 60) return `${s} second${s === 1 ? '' : 's'}`;
  const mins = Math.floor(s / 60);
  if (mins < 60) return `${mins} minute${mins === 1 ? '' : 's'}`;
  const hrs = Math.floor(mins / 60);
  return `${hrs} hour${hrs === 1 ? '' : 's'}`;
}