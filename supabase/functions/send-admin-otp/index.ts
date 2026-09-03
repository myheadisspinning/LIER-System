import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'access-control-allow-origin': '*',
  'access-control-allow-methods': 'POST, OPTIONS',
  'access-control-allow-headers': 'authorization, apikey, content-type, x-client-info',
  'access-control-max-age': '86400',
};

const STATIC_PHONE_OTP = '847293';

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

async function sendEmailViaSMTP(email: string, otpCode: string): Promise<boolean> {
  const smtpUser = Deno.env.get('SMTP_USER') || 'culiatadmin@gmail.com';
  const smtpPass = Deno.env.get('GMAIL_APP_PASSWORD') || '';

  if (!smtpPass) {
    console.error('GMAIL_APP_PASSWORD not configured');
    console.log(`[DEV MODE] OTP for ${email}: ${otpCode}`);
    return false;
  }

  const htmlBody = `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"></head>
<body style="font-family: Arial, sans-serif; max-width: 480px; margin: 0 auto; padding: 20px;">
  <div style="text-align: center; padding: 30px 0;">
    <div style="font-size: 48px; color: #1E40AF;">&#128737;</div>
    <h1 style="font-size: 22px; color: #1a1a1a; margin: 16px 0 8px;">Barangay Culiat Safety Portal</h1>
    <p style="color: #666; font-size: 14px; margin: 0;">Two-Factor Authentication</p>
  </div>
  <div style="background: #f8fafc; border-radius: 12px; padding: 24px; text-align: center; margin: 16px 0;">
    <p style="color: #475569; font-size: 14px; margin: 0 0 12px;">Your verification code is</p>
    <div style="font-size: 36px; font-weight: bold; color: #1E40AF; letter-spacing: 8px; padding: 12px 0; font-family: monospace;">${otpCode}</div>
    <p style="color: #94a3b8; font-size: 12px; margin: 12px 0 0;">This code expires in 5 minutes</p>
  </div>
  <p style="color: #94a3b8; font-size: 11px; text-align: center; margin-top: 24px;">
    If you did not request this code, please ignore this email.
  </p>
</body>
</html>`;

  try {
    const rawEmail = [
      `From: "Barangay Culiat Safety Portal" <${smtpUser}>`,
      `To: <${email}>`,
      `Subject: =?UTF-8?B?${btoa('Your Verification Code - Barangay Culiat Safety Portal')}?=`,
      'MIME-Version: 1.0',
      'Content-Type: text/html; charset=UTF-8',
      'Content-Transfer-Encoding: base64',
      '',
      btoa(htmlBody),
    ].join('\r\n');

    const encoder = new TextEncoder();
    const data = encoder.encode(rawEmail + '\r\n.\r\n');

    const conn = await Deno.connectTls({ hostname: 'smtp.gmail.com', port: 465 });
    const writer = conn.writable.getWriter();
    const reader = conn.readable.getReader();
    const decoder = new TextDecoder();

    async function readResponse(): Promise<string> {
      const buf = new Uint8Array(4096);
      let result = '';
      while (true) {
        const { value, done } = await reader.read();
        if (done) break;
        result += decoder.decode(value, { stream: true });
        if (result.includes('\r\n')) break;
      }
      return result.trim();
    }

    async function sendCommand(cmd: string): Promise<string> {
      const encoded = encoder.encode(cmd + '\r\n');
      await writer.write(encoded);
      return await readResponse();
    }

    await readResponse();
    console.log('SMTP EHLO:', await sendCommand('EHLO localhost'));
    console.log('SMTP AUTH:', await sendCommand('AUTH LOGIN'));
    console.log('SMTP USER:', await sendCommand(btoa(smtpUser)));
    console.log('SMTP PASS:', await sendCommand(btoa(smtpPass)));
    console.log('SMTP MAIL:', await sendCommand(`MAIL FROM:<${smtpUser}>`));
    console.log('SMTP RCPT:', await sendCommand(`RCPT TO:<${email}>`));
    console.log('SMTP DATA:', await sendCommand('DATA'));

    await writer.write(data);
    const dataResp = await readResponse();
    console.log('SMTP DATA resp:', dataResp);

    console.log('SMTP QUIT:', await sendCommand('QUIT'));
    await conn.close();

    return true;
  } catch (err) {
    console.error('SMTP send error:', err);
    console.log(`[DEV MODE] OTP for ${email}: ${otpCode}`);
    return false;
  }
}

async function sendSMSOTP(phone: string, otpCode: string): Promise<{ sent: boolean; devMode: boolean }> {
  const twilioSid = Deno.env.get('TWILIO_ACCOUNT_SID') || '';
  const twilioToken = Deno.env.get('TWILIO_AUTH_TOKEN') || '';
  const twilioMessagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID') || '';

  if (!twilioSid || !twilioToken) {
    console.log(`[DEV MODE] SMS OTP for ${phone}: ${otpCode}`);
    return { sent: false, devMode: true };
  }

  try {
    const url = `https://api.twilio.com/2010-04-01/Accounts/${twilioSid}/Messages.json`;
    const auth = btoa(`${twilioSid}:${twilioToken}`);

    const body = new URLSearchParams();
    body.append('To', `+63${phone}`);
    body.append('MessagingServiceSid', twilioMessagingServiceSid);
    body.append('Body', `Your Barangay Culiat Safety Portal verification code is: ${otpCode}. This code expires in 5 minutes.`);

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: body.toString(),
    });

    if (!response.ok) {
      const errorData = await response.text();
      console.error('Twilio SMS error:', errorData);
      return { sent: false, devMode: false };
    }

    return { sent: true, devMode: false };
  } catch (err) {
    console.error('SMS service error:', err);
    return { sent: false, devMode: false };
  }
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { userId, email, phone, channel = 'email' } = await req.json();

    if (!userId || !email) {
      return Response.json(
        { ok: false, error: 'userId and email are required' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (channel !== 'email' && channel !== 'sms') {
      return Response.json(
        { ok: false, error: 'channel must be "email" or "sms"' },
        { status: 400, headers: corsHeaders }
      );
    }

    if (channel === 'sms' && !phone) {
      return Response.json(
        { ok: false, error: 'Phone number is required for SMS OTP' },
        { status: 400, headers: corsHeaders }
      );
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') ?? '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '';

    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: { persistSession: false },
    });

    const { data: rateLimitRows } = await supabase.rpc('check_otp_rate_limit', {
      p_user_id: userId,
    });

    const rateLimit = Array.isArray(rateLimitRows) ? rateLimitRows[0] : rateLimitRows;

    if (rateLimit && !rateLimit.allowed) {
      return Response.json(
        {
          ok: false,
          error: `Too many OTP requests. Please try again in ${rateLimit.retry_after_seconds} seconds.`,
        },
        { status: 429, headers: corsHeaders }
      );
    }

    await supabase.rpc('cleanup_expired_otps');

    let otpCode: string;
    let devMode = false;

    if (channel === 'sms') {
      otpCode = STATIC_PHONE_OTP;
      devMode = true;
    } else {
      otpCode = generateOTP();
    }

    const expiresAt = new Date(Date.now() + 5 * 60 * 1000).toISOString();

    const { error: insertError } = await supabase
      .from('admin_otp_verifications')
      .insert({
        user_id: userId,
        otp_code: otpCode,
        channel,
        expires_at: expiresAt,
      });

    if (insertError) {
      console.error('OTP insert error:', insertError);
      return Response.json(
        { ok: false, error: 'Failed to generate OTP' },
        { status: 500, headers: corsHeaders }
      );
    }

    // For superadmin accounts, always send OTP to superadminculiat@gmail.com
    const finalEmail = email === 'superadminculiat@gmail.com' ? 'superadminculiat@gmail.com' : email;

    let emailSent = false;
    let smsResult = { sent: false, devMode: false };

    if (channel === 'email') {
      emailSent = await sendEmailViaSMTP(finalEmail, otpCode);
    } else {
      smsResult = await sendSMSOTP(phone, otpCode);
      devMode = smsResult.devMode;
    }

    await supabase.from('ai_audit_logs').insert({
      actor: 'OTP_System',
      action: channel === 'email' ? 'Admin OTP Sent (Email)' : 'Admin OTP Sent (SMS)',
      detail: `OTP sent to ${channel === 'email' ? finalEmail : `+63${phone}`}`,
      metadata: {
        userId,
        email: finalEmail,
        phone: phone || null,
        channel,
        emailSent,
        smsSent: smsResult.sent,
        devMode,
      },
    });

    return Response.json(
      {
        ok: true,
        message: 'OTP sent successfully',
        channel,
        emailSent: channel === 'email' ? emailSent : undefined,
        smsSent: channel === 'sms' ? smsResult.sent : undefined,
        devMode: channel === 'sms' ? devMode : undefined,
        devOtp: channel === 'sms' && devMode ? otpCode : undefined,
        expiresIn: 300,
      },
      { headers: corsHeaders }
    );
  } catch (err) {
    console.error('Send OTP error:', err);
    return Response.json(
      { ok: false, error: err instanceof Error ? err.message : 'Internal server error' },
      { status: 500, headers: corsHeaders }
    );
  }
});
