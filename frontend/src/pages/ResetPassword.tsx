import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Toast, { type ToastData } from '../components/Toast';
import styles from '../styles/modules/SignIn.module.css';

export default function ResetPassword() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [validToken, setValidToken] = useState<boolean | null>(null);

  useEffect(() => {
    const exchangeCode = async () => {
      const code = searchParams.get('code');
      if (!code) {
        setValidToken(false);
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        console.error('Code exchange error:', error);
        setValidToken(false);
        return;
      }

      setValidToken(true);
    };

    exchangeCode();
  }, [searchParams]);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setToast({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    if (password.length < 8 || password.length > 20) {
      setToast({ type: 'error', message: 'Password must be 8-20 characters long.' });
      return;
    }

    if (/\s/.test(password)) {
      setToast({ type: 'error', message: 'Password must not contain spaces.' });
      return;
    }

    if (!/[A-Z]/.test(password)) {
      setToast({ type: 'error', message: 'Password must contain at least one capital letter.' });
      return;
    }

    if (!/[0-9]/.test(password)) {
      setToast({ type: 'error', message: 'Password must contain at least one number.' });
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password });

    setLoading(false);

    if (error) {
      console.error('Update password error:', error);
      const errorObj = error as { message?: string; error_description?: string };
      const raw = errorObj.message || errorObj.error_description || '';
      const isUseless = !raw.trim() || raw.trim() === '{}' || raw.trim() === '""';

      setToast({
        type: 'error',
        message: isUseless
          ? 'Failed to update password. The reset link may have expired. Please request a new one.'
          : raw,
      });
      return;
    }

    setToast({ type: 'success', message: 'Password updated successfully!' });
    setTimeout(() => navigate('/signin'), 2000);
  };

  if (validToken === null) {
    return (
      <div className="bg-background text-on-background font-body-md min-h-screen flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <span className="material-symbols-outlined text-4xl text-secondary animate-spin">progress_activity</span>
          <p className="text-on-surface-variant">Verifying your reset link...</p>
        </div>
      </div>
    );
  }

  if (!validToken) {
    return (
      <div className="bg-background text-on-background font-body-md min-h-screen flex items-center justify-center p-0 md:p-margin-mobile overflow-x-hidden">
        <div className="fixed inset-0 z-0">
          <div className="absolute inset-0 bg-primary-container/40 z-10 backdrop-brightness-50"></div>
          <div className={`w-full h-full ${styles.bgImage}`}></div>
        </div>

        <main className="relative z-20 w-full max-w-2xl mx-auto bg-surface-container-lowest rounded-xl shadow-2xl p-lg text-center">
          <div className="mb-4 text-left">
            <Link to="/signin" className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant">
              <span className="material-symbols-outlined">arrow_back</span>
            </Link>
          </div>
          <span className="material-symbols-outlined text-5xl text-error-red mb-4">error</span>
          <h2 className="text-xl font-bold text-on-background mb-2">Invalid or Expired Link</h2>
          <p className="text-on-surface-variant mb-6">
            The password reset link is invalid or has expired. Please request a new one.
          </p>
          <Link
            to="/forgot-password"
            className="inline-flex items-center gap-2 bg-secondary rounded-lg text-white font-semibold text-body-sm px-6 py-2.5 shadow-lg hover:bg-secondary/90 transition-all active:scale-[0.98]"
          >
            <span className="material-symbols-outlined">mail</span>
            Request New Link
          </Link>
        </main>
      </div>
    );
  }

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex items-center justify-center p-0 md:p-margin-mobile overflow-x-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-primary-container/40 z-10 backdrop-brightness-50"></div>
        <div className={`w-full h-full ${styles.bgImage}`}></div>
      </div>

      <main className="relative z-20 w-full max-w-6xl mx-auto flex flex-col md:flex-row overflow-hidden md:rounded-xl shadow-2xl bg-surface-container-lowest h-full md:max-h-screen">
        {/* Left hero panel (hidden on mobile) */}
        <section className="hidden lg:flex w-1/2 flex-col justify-between p-xl relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className={`absolute inset-0 z-10 ${styles.overlayGradient}`}></div>
            <div className={`w-full h-full scale-110 ${styles.bgImage}`}></div>
          </div>
          <div className="relative z-20">
            <div className="flex items-center gap-base mb-lg">
              <img alt="Barangay Culiat Safety Logo" className="h-20 w-20 drop-shadow-xl"
                src="/image/culiat-logo.png" />
              <span className="font-headline-md text-headline-md text-white font-bold tracking-tight">
                Barangay Culiat
              </span>
            </div>
            <h1 className="font-display-md text-display-lg text-white mb-md leading-tight">Secure Access to Safety Services.</h1>
            <p className="font-body-lg text-body-lg text-white/90">
              The unified portal for incident reporting, emergency dispatch coordination, and community safety monitoring.
            </p>
          </div>
          <div className="relative z-20 flex gap-md items-center mt-xl">
            <div className="flex -space-x-2">
              <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg">security</span>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg">verified_user</span>
              </div>
              <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg">local_police</span>
              </div>
            </div>
            <p className="text-white/80 font-caption text-caption">Join over 15,000 verified residents and administrators.</p>
          </div>
        </section>

        {/* Right form panel */}
        <section className="w-full lg:w-1/2 bg-surface-container-lowest flex flex-col overflow-hidden">
          <div className={`flex-1 flex flex-col p-md md:p-lg overflow-y-auto ${styles.hideScrollbar} custom-scrollbar`}>
            {/* Back arrow */}
            <div className="mb-4">
              <Link to="/signin" className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
            </div>
            {/* Logo */}
            <div className="flex justify-center mb-6">
              <img alt="Barangay Culiat Safety Logo" className="h-20 w-20"
                src="/image/culiat-logo.png" />
            </div>
            <div className="max-w-2xl w-full mx-auto my-auto py-4">
              <header className="text-center lg:text-left mb-8">
                <h2 className="text-2xl font-bold text-on-background mb-1">Set New Password</h2>
                <p className="font-body-md text-on-surface-variant">Enter your new password below</p>
              </header>

              <form className="space-y-4" onSubmit={handleSubmit}>
                {/* New password field */}
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="password">New Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                    <input className="w-full pl-12 pr-12 bg-surface-container-low border-transparent rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-on-surface py-2.5"
                      id="password" placeholder="••••••••" required
                      type={showPassword ? 'text' : 'password'}
                      value={password} onChange={(e) => setPassword(e.target.value)} />
                    <button className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}>
                      <span className="material-symbols-outlined">{showPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                </div>

                {/* Confirm password field */}
                <div className="space-y-1">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="confirm-password">Confirm Password</label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                    <input className="w-full pl-12 pr-12 bg-surface-container-low border-transparent rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-on-surface py-2.5"
                      id="confirm-password" placeholder="••••••••" required
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} />
                    <button className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}>
                      <span className="material-symbols-outlined">{showConfirmPassword ? 'visibility_off' : 'visibility'}</span>
                    </button>
                  </div>
                  {confirmPassword && password !== confirmPassword && (
                    <p className="text-caption text-error-red">Passwords do not match</p>
                  )}
                </div>

                {/* Submit button */}
                <button className="w-full bg-secondary rounded-lg text-white font-semibold text-body-lg shadow-lg hover:bg-secondary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-base py-2.5"
                  type="submit" disabled={loading}>
                  {loading ? 'Updating...' : 'Update Password'}
                  <span className="material-symbols-outlined">save</span>
                </button>
              </form>

              {/* Footer */}
              <div className="mt-auto border-t border-outline-variant/10 flex items-center justify-center gap-base text-on-surface-variant/40 pt-4 pb-2">
                <span className="material-symbols-outlined text-sm">verified_user</span>
                <span className="font-caption text-[10px] uppercase tracking-widest font-bold">
                  OFFICIAL BARANGAY CULIAT GOV PORTAL • ENCRYPTED
                </span>
              </div>
            </div>
          </div>
        </section>
      </main>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
