import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '../supabaseClient';
import Toast, { type ToastData } from '../components/Toast';
import LoadingScreen from '../components/LoadingScreen';
import styles from '../styles/modules/SignUp.module.css';

export default function SignUp() {
  const navigate = useNavigate();
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [showLoading, setShowLoading] = useState(false);

  const [fullname, setFullname] = useState('');
  const [dob, setDob] = useState('');
  const [gender, setGender] = useState('');
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [tos, setTos] = useState(false);
  const [signupSuccess, setSignupSuccess] = useState(false);
  const [resending, setResending] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (password !== confirmPassword) {
      setToast({ type: 'error', message: 'Passwords do not match.' });
      return;
    }

    if (phone.length !== 10) {
      setToast({ type: 'error', message: 'Please enter a valid 10-digit mobile number.' });
      return;
    }

    if (!tos) {
      setToast({ type: 'error', message: 'Please accept Terms of Service and Privacy Policy.' });
      return;
    }

    setLoading(true);

    const { data: emailExists, error: rpcError } = await supabase.rpc('is_email_registered', {
      p_email: email,
    });

    if (rpcError) {
      console.error('Email check RPC error:', rpcError);
      // Continue with signup even if RPC fails - Supabase will catch duplicate emails
    } else if (emailExists) {
      setLoading(false);
      setToast({
        type: 'error',
        message: 'This email is already used with an existing account. Please sign in instead.',
      });
      return;
    }

    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          fullname,
          dob,
          gender,
          address,
          phone,
        },
      },
    });

    setLoading(false);

    if (error) {
      console.error('Supabase signup error:', error);
      console.error('Error keys:', Object.keys(error));
      console.error('Error stringified:', JSON.stringify(error));
      
      const status = (error as { status?: number }).status;
      if (status === 500) {
        setToast({ 
          type: 'error', 
          message: 'Registration failed due to a server error. Please contact support or try again later.' 
        });
        return;
      }
      
      const errorObj = error as { message?: string; error_description?: string; msg?: string };
      const raw = errorObj.message || errorObj.error_description || errorObj.msg || '';
      const isUseless = !raw.trim() || raw.trim() === '{}' || raw.trim() === '""';
      
      if (isUseless) {
        const existingIdentities = (data?.user as { identities?: unknown[] } | null)?.identities;
        if (existingIdentities?.length === 0) {
          setToast({ type: 'error', message: 'This email is already used with an existing account. Please sign in instead.' });
        } else {
          setToast({ type: 'error', message: 'Registration failed. This email may already be registered or the service is temporarily unavailable.' });
        }
        return;
      }
      
      setToast({ type: 'error', message: raw });
      return;
    }

    if (data.user?.identities?.length === 0) {
      setToast({
        type: 'error',
        message: 'This email is already used with an existing account. Please sign in instead.',
      });
      return;
    }

    // Check if email confirmation is required
    if (!data.session) {
      // Email confirmation required - show verification screen
      setSignupSuccess(true);
      setToast({
        type: 'success',
        message: 'Account created! Please check your email to verify your account.',
      });
    } else {
      // Email confirmation not required - proceed to login
      setToast({
        type: 'success',
        message: 'Account successfully created. Please sign in.',
      });
      setTimeout(() => setShowLoading(true), 1200);
      setTimeout(() => navigate('/signin'), 3000);
    }
  };

  const handleResendConfirmation = async () => {
    if (!email) {
      setToast({ type: 'error', message: 'Please enter your email address first.' });
      return;
    }

    setResending(true);
    const { error } = await supabase.auth.resend({
      type: 'signup',
      email: email,
    });

    setResending(false);

    if (error) {
      console.error('Resend confirmation error:', error);
      const errorObj = error as { message?: string; error_description?: string };
      const raw = errorObj.message || errorObj.error_description || '';
      const isUseless = !raw.trim() || raw.trim() === '{}' || raw.trim() === '""';
      
      setToast({ 
        type: 'error', 
        message: isUseless 
          ? 'Failed to resend confirmation email. Please wait a moment and try again.' 
          : raw 
      });
    } else {
      setToast({ type: 'success', message: 'Confirmation email sent! Please check your inbox.' });
    }
  };

  return (
    <div className="bg-background text-on-background font-body-md min-h-screen flex items-center justify-center p-0 overflow-x-hidden">
      <div className="fixed inset-0 z-0">
        <div className="absolute inset-0 bg-primary-container/40 z-10 backdrop-brightness-50"></div>
        <div className={`w-full h-full bg-cover bg-center ${styles.bgImage}`}></div>
      </div>

      <main className="relative z-20 w-full max-w-6xl mx-auto flex overflow-hidden md:rounded-xl shadow-2xl bg-surface-container-lowest">
        <section className="hidden lg:flex w-1/2 flex-col justify-between p-xl relative overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className={`absolute inset-0 z-10 ${styles.overlayGradient}`}></div>
            <div className={`w-full h-full bg-cover bg-center scale-110 ${styles.bgImage}`}></div>
          </div>
          <div className="relative z-20">
            <div className="flex items-center gap-base mb-lg">
              <img
                alt="Barangay Culiat Seal"
                className="h-16 w-16 drop-shadow-lg"
                src="/image/culiat-logo.png"
              />
              <span className="font-headline-md text-headline-md text-white font-bold tracking-tight">Barangay Culiat</span>
            </div>
            <h1 className="font-display-lg text-display-lg text-white mb-md leading-tight">
              Join Your Community
              <br />
              Safety Network.
            </h1>
            <p className="font-body-lg text-body-lg text-white/80">
              Create an account to report incidents, receive real-time alerts, and access exclusive resident services.
            </p>
          </div>
          <div className="relative z-20 space-y-4">
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg">notifications_active</span>
              </div>
              <p className="text-white/80 font-body-md">Real-time Incident Alerts</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg">support_agent</span>
              </div>
              <p className="text-white/80 font-body-md">Direct Support Access</p>
            </div>
            <div className="flex items-center gap-4">
              <div className="w-10 h-10 rounded-full border-2 border-white/20 bg-white/10 backdrop-blur-md flex items-center justify-center">
                <span className="material-symbols-outlined text-white text-lg">verified_user</span>
              </div>
              <p className="text-white/80 font-body-md">Official Verified Status</p>
            </div>
          </div>
          <div className="relative z-20 mt-auto">
            <p className="text-white/60 font-caption text-caption opacity-60">© 2024 Barangay Culiat Public Safety Department.</p>
          </div>
        </section>

        <section className="w-full lg:w-1/2 bg-surface-container-lowest flex flex-col overflow-y-auto custom-scrollbar p-4">
          <div className="lg:hidden flex justify-center mb-2">
            <img
              alt="Seal"
              className="h-12 w-12"
              src="/image/culiat-logo.png"
            />
          </div>
          <div className="max-w-2xl w-full mx-auto my-auto py-2">
            <header className="text-center lg:text-left mb-4">
              <h2 className="font-headline-md text-headline-md text-on-background mb-0">Create Official Account</h2>
              <p className="text-caption text-on-surface-variant">Please provide accurate information for verification.</p>
            </header>
            <form className="space-y-1" id="registrationForm" onSubmit={handleSubmit}>
              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="fullname">
                  Full Name
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">person</span>
                  <input
                    className="w-full pl-12 pr-4 bg-surface-container-low border-transparent rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-on-surface py-1.5"
                    id="fullname"
                    name="fullname"
                    placeholder="Juan Dela Cruz"
                    required
                    type="text"
                    value={fullname}
                    onChange={(e) => setFullname(e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="dob">
                    Date of Birth
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">calendar_today</span>
                    <input
                      className="w-full pl-12 pr-4 bg-surface-container-low border-transparent rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-on-surface py-1.5"
                      id="dob"
                      name="dob"
                      required
                      type="date"
                      value={dob}
                      onChange={(e) => setDob(e.target.value)}
                    />
                  </div>
                </div>

                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="gender">
                    Gender
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">group</span>
                    <select
                      className="w-full pl-12 pr-4 bg-surface-container-low border-transparent rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-on-surface appearance-none py-1.5"
                      id="gender"
                      name="gender"
                      required
                      value={gender}
                      onChange={(e) => setGender(e.target.value)}
                    >
                      <option value="" disabled>
                        Select Gender
                      </option>
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                    <span className="material-symbols-outlined absolute right-4 top-1/2 -translate-y-1/2 text-outline pointer-events-none">
                      expand_more
                    </span>
                  </div>
                </div>
              </div>

              <div className="space-y-xs">
                <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="address">
                  Address in Barangay Culiat
                </label>
                <div className="relative">
                  <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">location_on</span>
                  <textarea
                    className="w-full pl-12 pr-4 bg-surface-container-low border-transparent rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-on-surface resize-none py-1.5"
                    id="address"
                    name="address"
                    placeholder="House No., Street, Purok/Area"
                    required
                    rows={1}
                    value={address}
                    onChange={(e) => setAddress(e.target.value)}
                  ></textarea>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="phone">
                    Mobile Number
                  </label>
                  <div className="relative flex">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline font-semibold border-r border-outline-variant/30 pr-2">+63</span>
                    <input
                      className="w-full pl-16 pr-4 bg-surface-container-low border-transparent rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-on-surface py-1.5"
                      id="phone"
                      name="phone"
                      placeholder="9XX XXX XXXX"
                      required
                      type="tel"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                    />
                  </div>
                </div>

                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="email">
                    Email Address
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">mail</span>
                    <input
                      className="w-full pl-12 pr-4 bg-surface-container-low border-transparent rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-on-surface py-1.5"
                      id="email"
                      name="email"
                      placeholder="name@example.com"
                      required
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                    />
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="password">
                    Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                    <input
                      className="w-full pl-12 pr-12 bg-surface-container-low border-transparent rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-on-surface py-1.5"
                      id="password"
                      name="password"
                      placeholder="••••••••"
                      required
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                    />
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                      type="button"
                      onClick={() => setShowPassword((prev) => !prev)}
                    >
                      <span className="material-symbols-outlined" id="eye-icon-password">
                        {showPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="space-y-xs">
                  <label className="font-label-md text-label-md text-on-surface-variant" htmlFor="confirm_password">
                    Confirm Password
                  </label>
                  <div className="relative">
                    <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-outline">lock</span>
                    <input
                      className="w-full pl-12 pr-12 bg-surface-container-low border-transparent rounded-lg focus:ring-2 focus:ring-secondary/20 focus:border-secondary transition-all outline-none text-on-surface py-1.5"
                      id="confirm_password"
                      name="confirm_password"
                      placeholder="••••••••"
                      required
                      type={showConfirmPassword ? 'text' : 'password'}
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                    />
                    <button
                      className="absolute right-4 top-1/2 -translate-y-1/2 text-outline hover:text-on-surface"
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                    >
                      <span className="material-symbols-outlined" id="eye-icon-confirm">
                        {showConfirmPassword ? 'visibility_off' : 'visibility'}
                      </span>
                    </button>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-xs py-2">
                <input
                  className="w-5 h-5 rounded border-outline-variant text-secondary focus:ring-secondary/20 py-1.5"
                  id="tos"
                  required
                  type="checkbox"
                  checked={tos}
                  onChange={(e) => setTos(e.target.checked)}
                />
                <label className="text-caption text-on-surface-variant cursor-pointer select-none" htmlFor="tos">
                  I agree to the <a className="text-secondary font-semibold hover:underline" href="#">Terms of Service</a> and{' '}
                  <a className="text-secondary font-semibold hover:underline" href="#">Privacy Policy</a>.
                </label>
              </div>

              <button
                className="w-full bg-secondary rounded-lg text-white font-semibold text-body-lg shadow-lg hover:bg-secondary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-base py-1.5"
                type="submit"
                disabled={loading}
              >
                {loading ? 'Processing...' : 'Register Now'}
                <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </form>

            {/* Email Verification Success Screen */}
            {signupSuccess && (
              <div className="mt-6 p-6 bg-secondary/5 border border-secondary/20 rounded-lg">
                <div className="flex items-center gap-3 mb-4">
                  <span className="material-symbols-outlined text-secondary text-3xl">mark_email_read</span>
                  <h3 className="font-headline-md text-headline-md font-bold text-on-surface">Verify Your Email</h3>
                </div>
                <p className="text-body-sm text-on-surface mb-4">
                  We've sent a confirmation link to <strong className="text-secondary">{email}</strong>. Please check your inbox and click the link to activate your account.
                </p>
                <div className="space-y-3">
                  <button
                    type="button"
                    onClick={handleResendConfirmation}
                    disabled={resending}
                    className="w-full bg-secondary text-on-secondary rounded-lg font-semibold text-body-sm shadow-sm hover:bg-secondary/90 transition-all active:scale-[0.98] flex items-center justify-center gap-2 py-2 disabled:opacity-50"
                  >
                    {resending ? (
                      <>
                        <span className="material-symbols-outlined animate-spin">hourglass_empty</span>
                        Sending...
                      </>
                    ) : (
                      <>
                        <span className="material-symbols-outlined">mark_email_unread</span>
                        Resend Confirmation Email
                      </>
                    )}
                  </button>
                  <Link
                    to="/signin"
                    className="w-full bg-surface-container-lowest border border-outline text-on-surface rounded-lg font-semibold text-body-sm shadow-sm hover:bg-surface-container-low transition-all active:scale-[0.98] flex items-center justify-center gap-2 py-2"
                  >
                    <span className="material-symbols-outlined">login</span>
                    Go to Login
                  </Link>
                </div>
                <p className="text-caption text-on-surface-variant mt-4 text-center">
                  Didn't receive the email? Check your spam folder or click resend above.
                </p>
              </div>
            )}

            {!signupSuccess && (
              <div className="text-center mt-1">
                <p className="text-body-md text-on-surface-variant">
                  Already have an account?{' '}
                  <Link className="text-secondary font-semibold hover:underline" to="/signin">
                    Login here
                  </Link>
                </p>
              </div>
            )}
          </div>

          <div className="mt-auto border-t border-outline-variant/10 flex items-center justify-center gap-base text-on-surface-variant/40 pt-2">
            <span className="material-symbols-outlined text-sm">verified_user</span>
            <span className="font-caption text-[10px] uppercase tracking-widest font-bold">OFFICIAL TANDANG SORA GOV PORTAL • ENCRYPTED</span>
          </div>
        </section>
      </main>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      {showLoading && <LoadingScreen message="Redirecting to login..." />}
    </div>
  );
}
