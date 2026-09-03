import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-max-age': '86400',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { userId, otpCode, channel = 'email' } = await req.json();

    if (!userId || !otpCode) {
      return Response.json(
        { ok: false, error: 'userId and otpCode are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (channel !== 'email' && channel !== 'sms') {
      return Response.json(
        { ok: false, error: 'channel must be "email" or "sms"' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (!/^\d{6}$/.test(otpCode)) {
      return Response.json(
        { ok: false, error: 'OTP must be a 6-digit code' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    await supabase.rpc('cleanup_expired_otps');

    const { data: otpRecord, error: fetchError } = await supabase
      .from('admin_otp_verifications')
      .select('id, otp_code, expires_at, verified')
      .eq('user_id', userId)
      .eq('channel', channel)
      .eq('verified', false)
      .gt('expires_at', new Date().toISOString())
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (fetchError || !otpRecord) {
      return Response.json(
        { ok: false, error: 'This code has expired or is no longer valid. Please request a new one.' },
        { status: 400, headers: corsHeaders }
      );
    }

    const { count } = await supabase
      .from('admin_otp_verifications')
      .select('*', { count: 'exact', head: true })
      .eq('user_id', userId)
      .eq('channel', channel)
      .eq('verified', false)
      .gt('created_at', new Date(Date.now() - 5 * 60 * 1000).toISOString());

    if (count && count > 10) {
      return Response.json(
        { ok: false, error: 'Too many failed attempts. Please request a new OTP.' },
        { status: 429, headers: corsHeaders }
      );
    }

    if (otpRecord.otp_code === otpCode) {
      const { error: updateError } = await supabase
        .from('admin_otp_verifications')
        .update({ verified: true })
        .eq('id', otpRecord.id);

      if (updateError) {
        console.error('OTP update error:', updateError);
        return Response.json(
          { ok: false, error: 'Failed to verify OTP' },
          { status: 500, headers: corsHeaders }
        );
      }

      await supabase.from('ai_audit_logs').insert({
        actor: 'OTP_System',
        action: channel === 'email' ? 'Admin OTP Verified (Email)' : 'Admin OTP Verified (SMS)',
        detail: `OTP verified for user ${userId} via ${channel}`,
        metadata: { userId, channel, verified: true },
      });

      return Response.json(
        {
          ok: true,
          message: 'OTP verified successfully',
          channel,
          verified: true,
        },
        { headers: corsHeaders }
      );
    } else {
      await supabase.from('ai_audit_logs').insert({
        actor: 'OTP_System',
        action: channel === 'email' ? 'Admin OTP Failed (Email)' : 'Admin OTP Failed (SMS)',
        detail: `Invalid OTP attempt for user ${userId} via ${channel}`,
        metadata: { userId, channel, verified: false },
      });

      return Response.json(
        { ok: false, error: 'Wrong code. Please check and try again.' },
        { status: 400, headers: corsHeaders }
      );
    }
  } catch (err) {
    console.error('Verify OTP error:', err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});
