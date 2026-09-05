import { useEffect, useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import type { Session, User } from '@supabase/supabase-js';
import { getRole, dashboardPathFor, checkUserAccess } from '../lib/role';
import LoadingScreen from '../components/LoadingScreen';
import OTPVerificationModal from '../components/OTPVerificationModal';

/** Set right before redirecting to Google so AuthCallback knows the visit is an OAuth return. */
export const GOOGLE_OAUTH_FLAG = 'bc_oauth_pending_google';

export default function AuthCallback() {
  const navigate = useNavigate();

  const [showOtpModal, setShowOtpModal] = useState(false);
  const [otpUserId, setOtpUserId] = useState('');
  const [otpEmail, setOtpEmail] = useState('');
  const [otpPhone, setOtpPhone] = useState('');
  const [otpDestination, setOtpDestination] = useState('');
  const [pendingUser, setPendingUser] = useState<User | null>(null);
  const [confirming, setConfirming] = useState(false);

  const handleOtpVerified = useCallback(() => {
    setShowOtpModal(false);
    setTimeout(() => navigate(otpDestination, { replace: true }), 1500);
  }, [navigate, otpDestination]);

  const handleOtpCancel = useCallback(() => {
    setShowOtpModal(false);
    setOtpUserId('');
    setOtpEmail('');
    setOtpPhone('');
    setOtpDestination('');
    navigate('/signin', { replace: true });
  }, [navigate]);

  const handleOtpError = useCallback(() => {}, []);

  const finalizeSignIn = useCallback(async (user: User) => {
    const email = user.email;

    if (email) {
      const { data: isDuplicate } = await supabase.rpc('check_email_duplicate', {
        p_email: email,
      });

      if (isDuplicate) {
        await supabase.rpc('cleanup_duplicate_public_user', { p_user_id: user.id });
        await supabase.auth.signOut();
        navigate('/signin', {
          replace: true,
          state: {
            error: 'This email is already registered with a password. Please sign in with your email and password instead.',
          },
        });
        return;
      }
    }

    const access = await checkUserAccess(user.id);

    if (!access.allowed) {
      await supabase.auth.signOut();
      const error = access.reason === 'deleted'
        ? 'Your account has been removed.'
        : 'Your account has been suspended.';
      navigate('/signin', { replace: true, state: { error } });
      return;
    }

    const role = await getRole(user.id);
    const destination = role === 'user' ? '/' : dashboardPathFor(role);

    if (role === 'admin' || role === 'superadmin') {
      const metaPhone = user.user_metadata?.phone || '';
      let phone = metaPhone;
      if (!phone) {
        const { data: profile } = await supabase
          .from('public_users')
          .select('phone')
          .eq('id', user.id)
          .maybeSingle();
        phone = profile?.phone || '';
      }
      setOtpUserId(user.id);
      setOtpEmail(email || '');
      setOtpPhone(phone);
      setOtpDestination(destination);
      setShowOtpModal(true);
      return;
    }

    navigate(destination, { replace: true });
  }, [navigate]);

  const handleConfirm = useCallback(async () => {
    if (!pendingUser) return;
    setConfirming(true);
    sessionStorage.removeItem(GOOGLE_OAUTH_FLAG);
    await finalizeSignIn(pendingUser);
  }, [pendingUser, finalizeSignIn]);

  const handleCancel = useCallback(async () => {
    sessionStorage.removeItem(GOOGLE_OAUTH_FLAG);
    await supabase.auth.signOut();
    setPendingUser(null);
    navigate('/signin', { replace: true });
  }, [navigate]);

  useEffect(() => {
    let mounted = true;

    const handleCallback = async () => {
      const params = new URLSearchParams(window.location.search);
      const oauthReturn =
        sessionStorage.getItem(GOOGLE_OAUTH_FLAG) === 'pending' ||
        params.has('code') ||
        window.location.href.includes('access_token=') ||
        window.location.href.includes('error=');

      if (!oauthReturn) {
        // Direct visit (no OAuth flow in progress): keep the legacy behavior.
        const { data: { session } } = await supabase.auth.getSession();

        if (!mounted) return;

        if (!session?.user) {
          navigate('/signin');
          return;
        }

        await finalizeSignIn(session.user);
        return;
      }

      // The user denied consent on Google's side — bounce back immediately.
      if (params.get('error') || window.location.hash.includes('error=')) {
        sessionStorage.removeItem(GOOGLE_OAUTH_FLAG);
        navigate('/signin', {
          replace: true,
          state: { error: 'Google sign-in was cancelled. Please try again.' },
        });
        return;
      }

      // OAuth return: supabase-js exchanges the tokens from the URL
      // automatically, so wait for the session to land before confirming.
      let session: Session | null = null;
      for (let attempt = 0; attempt < 24; attempt++) {
        if (!mounted) return;
        const { data } = await supabase.auth.getSession();
        if (data.session?.user) {
          session = data.session;
          break;
        }
        await new Promise((resolve) => setTimeout(resolve, 250));
      }

      if (!mounted) return;

      if (!session?.user) {
        sessionStorage.removeItem(GOOGLE_OAUTH_FLAG);
        navigate('/signin', {
          replace: true,
          state: { error: 'Google sign-in failed or was cancelled. Please try again.' },
        });
        return;
      }

      // Ask the user to confirm before completing the sign-in.
      setPendingUser(session.user);
    };

    handleCallback();

    return () => {
      mounted = false;
    };
  }, [finalizeSignIn, navigate]);

  if (showOtpModal) {
    return (
      <OTPVerificationModal
        userId={otpUserId}
        email={otpEmail}
        phone={otpPhone}
        onVerified={handleOtpVerified}
        onCancel={handleOtpCancel}
        onError={handleOtpError}
      />
    );
  }

  if (pendingUser) {
    if (confirming) {
      return <LoadingScreen message="Signing you in..." />;
    }

    const meta = pendingUser.user_metadata ?? {};
    const displayName: string = meta.full_name || meta.name || pendingUser.email || 'Google account';
    const email: string = pendingUser.email || meta.email || '';
    const avatarUrl: string | undefined = meta.avatar_url || undefined;

    return (
      <div className="fixed inset-0 z-[400] flex items-center justify-center bg-background/90 backdrop-blur-md animate-fade-in p-4">
        <div className="w-full max-w-sm bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 p-6 text-center">
          <div className="flex justify-center">
            <svg className="w-9 h-9" viewBox="0 0 24 24">
              <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"></path>
              <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"></path>
              <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05"></path>
              <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 12-4.53z" fill="#EA4335"></path>
            </svg>
          </div>
          <h2 className="font-headline-md text-lg md:text-xl font-bold text-on-background mt-3">Confirm sign-in</h2>
          <p className="font-body-md text-sm text-on-surface-variant mt-1">
            You are about to sign in to <span className="font-semibold text-on-surface">Barangay Culiat Safety</span> with the Google account below.
          </p>
          <div className="mt-4 flex items-center gap-3 p-3 bg-surface-container-low rounded-xl border border-outline-variant/30 text-left">
            {avatarUrl ? (
              <img
                className="w-10 h-10 rounded-full object-cover shrink-0"
                src={avatarUrl}
                alt={displayName}
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary shrink-0">
                <span className="material-symbols-outlined">account_circle</span>
              </div>
            )}
            <div className="min-w-0">
              <p className="font-label-md text-sm font-semibold text-on-surface truncate">{displayName}</p>
              {email && <p className="font-caption text-caption text-on-surface-variant truncate">{email}</p>}
            </div>
          </div>
          <button
            type="button"
            onClick={handleConfirm}
            className="mt-5 w-full bg-secondary rounded-lg text-white font-semibold text-body-md shadow-lg hover:bg-secondary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-base py-2.5"
          >
            Confirm sign-in
            <span className="material-symbols-outlined">arrow_forward</span>
          </button>
          <button
            type="button"
            onClick={handleCancel}
            className="mt-2 w-full bg-surface-container-lowest border border-outline text-on-surface rounded-lg font-semibold text-body-md shadow-sm hover:bg-surface-container-low transition-all active:scale-[0.98] flex items-center justify-center gap-base py-2.5"
          >
            Cancel
          </button>
        </div>
      </div>
    );
  }

  return <LoadingScreen message="Signing you in..." />;
}
