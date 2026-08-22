import React, { useState, useEffect, useRef, useCallback } from 'react';
import { supabase } from '../supabaseClient';
import { useScrollLock } from '../lib/useScrollLock';

type Channel = 'email' | 'sms';

interface OTPVerificationModalProps {
  userId: string;
  email: string;
  phone?: string;
  onVerified: () => void;
  onCancel: () => void;
  onError: (message: string) => void;
}

export default function OTPVerificationModal({
  userId,
  email,
  phone,
  onVerified,
  onCancel,
  onError,
}: OTPVerificationModalProps) {
  useScrollLock(true);
  const [channel, setChannel] = useState<Channel>('email');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [countdown, setCountdown] = useState(0);
  const [expiryCountdown, setExpiryCountdown] = useState(300);
  const [devOtp, setDevOtp] = useState('');
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const [sentChannels, setSentChannels] = useState<Set<Channel>>(new Set());
  const canResend = countdown <= 0;
  const isChannelSent = sentChannels.has(channel);

  const maskedPhone = phone
    ? `+63 ***${phone.slice(-4)}`
    : '';

  const handleSendOTP = useCallback(async (ch: Channel) => {
    setSending(true);
    setError('');
    setSuccess('');
    setDevOtp('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('send-admin-otp', {
        body: { userId, email, phone, channel: ch },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to send OTP');
      }

      if (!data.ok) {
        throw new Error(data.error || 'Failed to sent OTP');
      }

      setSentChannels((prev) => new Set(prev).add(ch));

      if (data.devMode && data.devOtp) {
        setDevOtp(data.devOtp);
        setSuccess(`Phone OTP sent (dev mode). Use the code shown below.`);
      } else {
        setSuccess(ch === 'email'
          ? 'OTP sent to your email. Check your inbox.'
          : `OTP sent to ${maskedPhone}.`);
      }
      setCountdown(60);
      setExpiryCountdown(300);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to send OTP';
      setError(message);
      onError(message);
    } finally {
      setSending(false);
    }
  }, [userId, email, phone, maskedPhone, onError]);

  useEffect(() => {
    if (countdown <= 0) return undefined;
    const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [countdown]);

  useEffect(() => {
    if (expiryCountdown <= 0) return undefined;
    const timer = setTimeout(() => setExpiryCountdown(expiryCountdown - 1), 1000);
    return () => clearTimeout(timer);
  }, [expiryCountdown]);

  const handleChannelSwitch = (newChannel: Channel) => {
    if (newChannel === channel) return;
    setChannel(newChannel);
    setOtp(['', '', '', '', '', '']);
    setError('');
    setSuccess('');
    setDevOtp('');
    setCountdown(sentChannels.has(newChannel) ? 60 : 0);
    inputRefs.current[0]?.focus();
  };

  const handleResendOTP = async () => {
    if (!canResend) return;
    await handleSendOTP(channel);
  };

  const handleOtpChange = (index: number, value: string) => {
    if (!/^\d*$/.test(value)) return;

    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    if (value && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pastedData.length === 6) {
      setOtp(pastedData.split(''));
      inputRefs.current[5]?.focus();
    }
  };

  const handleVerify = async () => {
    const otpCode = otp.join('');
    if (otpCode.length !== 6) {
      setError('Please enter the complete 6-digit OTP');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const { data, error: fnError } = await supabase.functions.invoke('verify-admin-otp', {
        body: { userId, otpCode, channel },
      });

      if (fnError) {
        throw new Error(fnError.message || 'Failed to verify OTP');
      }

      if (!data.ok) {
        throw new Error(data.error || 'Invalid OTP');
      }

      setSuccess('OTP verified! Redirecting...');
      setTimeout(() => onVerified(), 1000);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Invalid OTP code';
      setError(message);
      setOtp(['', '', '', '', '', '']);
      inputRefs.current[0]?.focus();
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    supabase.auth.signOut();
    onCancel();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm">
      <div className="bg-surface-container-lowest rounded-xl shadow-2xl w-full max-w-2xl mx-4 p-6">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-secondary/10 rounded-full flex items-center justify-center mx-auto mb-4">
            <span className="material-symbols-outlined text-secondary text-3xl">shield</span>
          </div>
          <h2 className="text-xl font-bold text-on-background mb-1">Two-Factor Authentication</h2>
          <p className="text-body-sm text-on-surface-variant">
            Choose a verification method to continue
          </p>
        </div>

        <div className="flex rounded-lg bg-surface-container-low border border-outline-variant/30 p-1 mb-5">
          <button
            type="button"
            onClick={() => handleChannelSwitch('email')}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-label-md font-medium transition-all ${
              channel === 'email'
                ? 'bg-white shadow-sm text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            <span className="material-symbols-outlined text-[18px]">mail</span>
            Email OTP
          </button>
          <button
            type="button"
            onClick={() => handleChannelSwitch('sms')}
            disabled={!phone}
            className={`flex-1 flex items-center justify-center gap-2 py-2.5 rounded-md text-label-md font-medium transition-all ${
              channel === 'sms'
                ? 'bg-white shadow-sm text-on-surface'
                : 'text-on-surface-variant hover:text-on-surface'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            <span className="material-symbols-outlined text-[18px]">sms</span>
            Phone OTP
          </button>
        </div>

        <div className="text-center mb-4">
          {channel === 'email' ? (
            <p className="text-caption text-on-surface-variant">
              {isChannelSent ? 'Code sent to ' : "Click Send Code and we'll send a 6-digit code to "}
              <span className="font-medium text-on-surface">{email}</span>
            </p>
          ) : (
            <p className="text-caption text-on-surface-variant">
              {isChannelSent ? 'Code sent to ' : "Click Send Code and we'll send a 6-digit code to "}
              <span className="font-medium text-on-surface">{maskedPhone || 'No phone number on file'}</span>
            </p>
          )}
        </div>

        {devOtp && (
          <div className="mb-4 p-3 bg-warning-amber/10 border border-warning-amber/30 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <span className="material-symbols-outlined text-warning-amber text-[16px]">construction</span>
              <p className="text-body-sm font-semibold text-warning-amber">Dev Mode</p>
            </div>
            <p className="text-body-sm text-on-surface-variant">
              SMS service not configured. Use this code:
            </p>
            <p className="text-xl font-mono font-bold text-on-surface tracking-[0.3em] mt-1">{devOtp}</p>
          </div>
        )}

        <div className="flex justify-center gap-2 mb-4">
          {otp.map((digit, index) => (
            <input
              key={index}
              ref={(el) => { inputRefs.current[index] = el; }}
              type="text"
              inputMode="numeric"
              maxLength={1}
              value={digit}
              onChange={(e) => handleOtpChange(index, e.target.value)}
              onKeyDown={(e) => handleKeyDown(index, e)}
              onPaste={handlePaste}
              className="w-12 h-14 text-center text-xl font-bold bg-surface-container-low border-2 border-outline-variant rounded-lg focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all outline-none text-on-surface"
              disabled={loading}
            />
          ))}
        </div>

        {error && (
          <div className="mb-4 p-3 bg-error/10 border border-error/30 rounded-lg">
            <p className="text-body-sm text-error text-center">{error}</p>
          </div>
        )}
        {success && !devOtp && (
          <div className="mb-4 p-3 bg-success/10 border border-success/30 rounded-lg">
            <p className="text-body-sm text-success text-center">{success}</p>
          </div>
        )}

        <div className="space-y-3">
          <button
            onClick={handleVerify}
            disabled={loading || !isChannelSent || otp.join('').length !== 6}
            className="w-full bg-secondary rounded-lg text-white font-semibold text-body-lg shadow-lg hover:bg-secondary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 py-2.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Verifying...
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">check_circle</span>
                Verify OTP
              </>
            )}
          </button>

          <button
            onClick={isChannelSent ? handleResendOTP : () => handleSendOTP(channel)}
            disabled={sending || (isChannelSent && !canResend)}
            className="w-full bg-surface-container-low border border-outline-variant rounded-lg text-on-surface font-semibold text-body-sm hover:bg-surface-container-low transition-all active:scale-[0.98] flex items-center justify-center gap-2 py-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {sending ? (
              <>
                <span className="material-symbols-outlined animate-spin">progress_activity</span>
                Sending...
              </>
            ) : !isChannelSent ? (
              <>
                <span className="material-symbols-outlined">send</span>
                Send Code
              </>
            ) : canResend ? (
              <>
                <span className="material-symbols-outlined">refresh</span>
                Resend OTP
              </>
            ) : (
              <>
                <span className="material-symbols-outlined">timer</span>
                Resend in {countdown}s
              </>
            )}
          </button>

          <button
            onClick={handleCancel}
            disabled={loading}
            className="w-full text-on-surface-variant font-medium text-body-sm hover:text-on-surface transition-colors py-2"
          >
            Cancel
          </button>
        </div>

        {isChannelSent && (
          <div className="mt-6 pt-4 border-t border-outline-variant/30 text-center">
            {expiryCountdown > 0 ? (
              <p className={`text-caption font-medium ${expiryCountdown <= 60 ? 'text-error' : 'text-on-surface-variant/60'}`}>
                Code expires in {Math.floor(expiryCountdown / 60)}:{String(expiryCountdown % 60).padStart(2, '0')}
              </p>
            ) : (
              <p className="text-caption text-error font-medium">
                Code expired — resend to get a new one
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
