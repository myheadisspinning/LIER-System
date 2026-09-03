import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Toast, { type ToastData } from '../components/Toast';
import styles from '../styles/modules/SignIn.module.css';

export default function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const { data: emailExists, error: rpcError } = await supabase.rpc('is_email_registered', {
      p_email: email,
    });

    if (rpcError) {
      console.error('Email check RPC error:', rpcError);
    } else if (!emailExists) {
      setLoading(false);
      setToast({ type: 'error', message: 'No account found with this email address.' });
      return;
    }

    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: window.location.origin + '/reset-password',
    });

    setLoading(false);

    if (error) {
      console.error('Reset password error:', error);
      const errorObj = error as { message?: string; error_description?: string };
      const raw = errorObj.message || errorObj.error_description || '';
      const isUseless = !raw.trim() || raw.trim() === '{}' || raw.trim() === '""';

      setToast({
        type: 'error',
        message: isUseless
          ? 'Failed to send reset email. Please try again.'
          : raw,
      });
      return;
    }

    setSent(true);
    setToast({ type: 'success', message: 'Password reset link sent! Check your email.' });
  };

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
          <div className={`flex-1 flex flex-col p-4 md:p-lg overflow-y-auto ${styles.hideScrollbar} custom-scrollbar`}>
            {/* Back arrow */}
            <div className="mb-4">
              <Link to="/signin" className="inline-flex items-center justify-center w-9 h-9 rounded-full hover:bg-surface-container-low transition-colors text-on-surface-variant">
                <span className="material-symbols-outlined">arrow_back</span>
              </Link>
            </div>
            {/* Logo for mobile */}
            <div className="lg:hidden flex justify-center mb-4 md:mb-6">
              <img alt="Barangay Culiat Safety Logo" className="h-16 w-16"
                src="/image/culiat-logo.png" />
            </div>
            <div className="max-w-2xl w-full mx-auto py-4">
              <header className="text-center lg:text-left mb-6 md:mb-8">
                <h2 className="text-2xl font-bold text-on-background mb-1">Forgot your password?</h2>
                <p className="font-body-md text-on-surface-variant">
                  {sent
                    ? 'We\'ve sent a reset link to your email. Check your inbox.'
                    : 'Enter your email and we\'ll send you a reset link.'}
                </p>
              </header>

              {!sent ? (
                <form className="space-y-4" onSubmit={handleSubmit}>
                  {/* Email field */}
                  <div className="space-y-1">
                    <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="email">Email Address</label>
                    <div className="relative">
                      <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">mail</span>
                      <input className="w-full pl-12 pr-4 bg-surface-container-low border-transparent rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-on-surface py-2.5"
                        id="email" placeholder="name@example.com" required type="email"
                        value={email} onChange={(e) => setEmail(e.target.value)} />
                    </div>
                  </div>
                  {/* Submit button */}
                  <button className="w-full bg-secondary rounded-lg text-white font-semibold text-body-lg shadow-lg hover:bg-secondary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-base py-2.5"
                    type="submit" disabled={loading}>
                    {loading ? 'Sending...' : 'Send Reset Link'}
                    <span className="material-symbols-outlined">send</span>
                  </button>
                </form>
              ) : (
                <div className="space-y-4">
                  <div className="p-4 bg-success-green/10 border border-success-green/30 rounded-lg flex items-center gap-3">
                    <span className="material-symbols-outlined text-success-green">mark_email_read</span>
                    <p className="text-body-sm text-on-surface">
                      A password reset link has been sent to <strong>{email}</strong>. Please check your inbox and follow the instructions. Don't forget to check your spam or junk folder.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => { setSent(false); setEmail(''); }}
                    className="w-full bg-surface-container-low border border-outline-variant/50 rounded-lg text-on-surface font-semibold text-body-sm hover:bg-surface-container transition-all active:scale-[0.98] flex items-center justify-center gap-2 py-2.5"
                  >
                    <span className="material-symbols-outlined">refresh</span>
                    Send to a different email
                  </button>
                </div>
              )}
            </div>
            {/* Footer */}
            <div className="mt-auto border-t border-outline-variant/10 flex items-center justify-center gap-base text-on-surface-variant/40 pt-4 pb-2">
              <span className="material-symbols-outlined text-sm">verified_user</span>
              <span className="font-caption text-[10px] uppercase tracking-widest font-bold">
                OFFICIAL BARANGAY CULIAT GOV PORTAL • ENCRYPTED
              </span>
            </div>
          </div>
        </section>
      </main>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
