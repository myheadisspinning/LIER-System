import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../supabaseClient';
import SiteHeader from '../../components/SiteHeader';
import Toast, { type ToastData } from '../../components/Toast';
import LoadingScreen from '../../components/LoadingScreen';
import ConfirmDialog from '../../components/ConfirmDialog';
import LogoutScreen from '../../components/LogoutScreen';

interface ProfileRow {
  fullname: string;
  dob: string | null;
  gender: string | null;
  address: string | null;
  phone: string | null;
}

export default function Profile() {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<ProfileRow | null>(null);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  useEffect(() => {
    let mounted = true;

    const loadProfile = async () => {
      const { data: sessionData } = await supabase.auth.getSession();
      const currentUser = sessionData.session?.user ?? null;
      if (!mounted) return;
      setUser(currentUser);

      if (!currentUser) {
        setLoading(false);
        return;
      }

      const meta = currentUser.user_metadata ?? {};
      setProfile({
        fullname: typeof meta.fullname === 'string' ? meta.fullname : '',
        dob: typeof meta.dob === 'string' ? meta.dob : null,
        gender: typeof meta.gender === 'string' ? meta.gender : null,
        address: typeof meta.address === 'string' ? meta.address : null,
        phone: typeof meta.phone === 'string' ? meta.phone : null,
      });
      setLoading(false);
    };

    void loadProfile();

    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      if (mounted) setUser(session?.user ?? null);
    });
    return () => {
      mounted = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  const handleLogout = () => setConfirmOpen(true);

  const confirmLogout = () => {
    setConfirmOpen(false);
    setSigningOut(true);
    void supabase.auth
      .signOut()
      .then(({ error }) => {
        if (error) setToast({ type: 'error', message: error.message });
      })
      .catch(() => {
        setToast({ type: 'error', message: 'Unable to sign out. Please try again.' });
      });
    setTimeout(() => {
      setSigningOut(false);
      navigate('/');
    }, 1500);
  };

  const getInitial = () => {
    const name = profile?.fullname;
    if (typeof name === 'string' && name.trim()) return name.trim().charAt(0).toUpperCase();
    return (user?.email?.[0] ?? 'U').toUpperCase();
  };

  const rows: { label: string; value: string; icon: string }[] = [
    { label: 'Date of Birth', value: profile?.dob ?? '—', icon: 'calendar_today' },
    { label: 'Gender', value: profile?.gender ?? '—', icon: 'group' },
    { label: 'Address', value: profile?.address ?? '—', icon: 'location_on' },
    { label: 'Mobile Number', value: profile?.phone ?? '—', icon: 'phone' },
  ];

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen">
      <SiteHeader active="/profile" />
      {signingOut && <LogoutScreen />}
      {loading ? (
        <LoadingScreen message="Loading profile..." />
      ) : !user ? (
        <main className="min-h-screen flex items-center justify-center px-4 pt-20">
          <div className="text-center max-w-md">
            <span className="material-symbols-outlined text-5xl text-on-surface-variant">person_off</span>
            <h2 className="font-headline-md text-headline-md mt-4">You are not signed in</h2>
            <p className="text-on-surface-variant mt-2">Sign in to view your profile.</p>
            <Link
              className="inline-flex items-center gap-base mt-6 bg-secondary text-on-secondary px-6 py-3 rounded-lg font-bold shadow-lg hover:bg-secondary-container transition-all"
              to="/signin"
            >
              Go to Login
            </Link>
          </div>
        </main>
      ) : (
        <main className="min-h-screen flex items-center justify-center px-4 pt-24 pb-10">
          <div className="w-full max-w-2xl bg-surface-container-lowest rounded-2xl shadow-2xl border border-outline-variant/30 overflow-hidden">
            <div className="bg-primary-container p-md md:p-lg text-center">
              <div className="mx-auto w-20 h-20 rounded-full bg-secondary flex items-center justify-center text-on-secondary text-3xl font-bold border-4 border-surface-bright shadow-lg">
                {getInitial()}
              </div>
              <h2 className="font-headline-md text-headline-md text-surface-bright mt-4 truncate">
                {profile?.fullname || 'Your Profile'}
              </h2>
              <p className="text-on-primary-container text-caption mt-1 break-words">{user.email}</p>
            </div>

            <div className="p-md md:p-lg">
              <div className="space-y-3">
                {rows.map((row) => (
                  <div key={row.label} className="flex items-center gap-4 bg-surface-container-low rounded-lg px-4 py-3">
                    <span className="material-symbols-outlined text-on-surface-variant">{row.icon}</span>
                    <div className="min-w-0">
                      <p className="text-caption text-on-surface-variant">{row.label}</p>
                      <p className="font-label-md text-label-md text-on-surface break-words">{row.value}</p>
                    </div>
                  </div>
                ))}
              </div>

              <button
                className="w-full mt-6 bg-error text-on-error font-bold rounded-lg py-3 flex items-center justify-center gap-base shadow-lg hover:bg-error/90 transition-all"
                type="button"
                onClick={handleLogout}
              >
                <span className="material-symbols-outlined">logout</span> Logout
              </button>
            </div>
          </div>
        </main>
      )}

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <ConfirmDialog
        open={confirmOpen}
        title="Log out of your account?"
        message="You will need to sign in again to access your account and continue where you left off."
        confirmLabel="Log out"
        onConfirm={confirmLogout}
        onCancel={() => setConfirmOpen(false)}
      />
    </div>
  );
}
