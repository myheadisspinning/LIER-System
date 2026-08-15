import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { useUnreadCounts } from '../lib/admin';
import Toast, { type ToastData } from './Toast';
import ConfirmDialog from './ConfirmDialog';
import LogoutScreen from './LogoutScreen';
import UnreadBadge from './UnreadBadge';

interface SiteHeaderProps {
  active: string;
  logo?: string;
  logoAlt?: string;
  logoClass?: string;
  title?: string;
}

const navItems = [
  { path: '/', label: 'Home' },
  { path: '/about', label: 'About' },
  { path: '/officials', label: 'Officials' },
  { path: '/services', label: 'Services' },
  { path: '/contact', label: 'Contact' },
];

export default function SiteHeader({
  active,
  logo = '/image/culiat-logo.png',
  logoAlt = 'Barangay Logo',
  logoClass = 'w-full h-full object-cover',
  title = 'Barangay Culiat Safety',
}: SiteHeaderProps) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const actionsRef = useRef<HTMLDivElement>(null);
  const { userUnread } = useUnreadCounts(!!user);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionsRef.current && !actionsRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
        setNotifOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    setProfileOpen(false);
    setNotifOpen(false);
    setDrawerOpen(false);
    setConfirmOpen(true);
  };

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
    const name = user?.user_metadata?.fullname;
    if (typeof name === 'string' && name.trim()) return name.trim().charAt(0).toUpperCase();
    return (user?.email?.[0] ?? 'U').toUpperCase();
  };

  const loginButtonClass =
    'bg-secondary text-on-secondary px-4 md:px-md py-2 rounded-lg font-bold hover:bg-secondary-container hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all text-xs md:text-sm flex items-center justify-center whitespace-nowrap';

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-[100] flex justify-between items-center px-4 md:px-margin-desktop h-20 bg-primary-container/90 backdrop-blur-md shadow-md font-body-md">
        <div className="flex items-center gap-sm">
          <div className="w-10 h-10 md:w-12 md:h-12 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-tertiary-fixed-dim transition-transform hover:scale-110">
            <img alt={logoAlt} className={logoClass} src={logo} />
          </div>
          <h1 className="font-headline-md text-base md:text-headline-md font-bold text-surface-bright leading-tight">{title}</h1>
        </div>

        <nav className="hidden md:flex items-center gap-lg">
          {navItems.map((item) => (
            <Link
              key={item.path}
              className={`font-label-md text-label-md inline-flex items-center gap-1.5 transition-all duration-200 ${
                item.path === active
                  ? 'text-tertiary-fixed-dim border-b-2 border-tertiary-fixed-dim pb-1'
                  : 'text-on-primary-container hover:text-surface-bright'
              }`}
              to={item.path}
            >
              {item.label}
              {item.path === '/contact' && item.path !== active && <UnreadBadge count={userUnread} />}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-sm md:gap-md" ref={actionsRef}>
          {user ? (
            <>
              <div className="relative">
                <button
                  className="p-2 text-surface-bright hover:bg-white/10 rounded-full transition-colors relative"
                  type="button"
                  aria-label="Notifications"
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setProfileOpen(false);
                  }}
                >
                  <span className="material-symbols-outlined text-2xl">notifications</span>
                  <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full"></span>
                </button>
                {notifOpen && (
                  <div className="absolute right-0 mt-2 w-72 bg-background rounded-lg shadow-2xl border border-outline-variant/30 overflow-hidden">
                    <p className="font-label-md text-label-md font-bold px-4 py-3 text-on-surface border-b border-outline-variant/30">Notifications</p>
                    <div className="px-4 py-8 flex flex-col items-center gap-sm text-on-surface-variant">
                      <span className="material-symbols-outlined text-3xl">notifications_off</span>
                      <p className="text-caption text-center">No new notifications yet.</p>
                    </div>
                  </div>
                )}
              </div>

              <div className="relative">
                <button
                  className="flex items-center gap-2 p-1.5 pr-2 rounded-full hover:bg-white/10 transition-colors"
                  type="button"
                  aria-label="Profile menu"
                  onClick={() => {
                    setProfileOpen((v) => !v);
                    setNotifOpen(false);
                  }}
                >
                  <span className="w-8 h-8 rounded-full bg-secondary flex items-center justify-center text-on-secondary font-bold text-sm">
                    {getInitial()}
                  </span>
                  <span className="material-symbols-outlined text-xl text-surface-bright">{profileOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-background rounded-lg shadow-2xl border border-outline-variant/30 overflow-hidden">
                    <div className="px-4 py-3 border-b border-outline-variant/30">
                      <p className="font-label-md text-label-md font-bold text-on-surface truncate">
                        {typeof user.user_metadata?.fullname === 'string' ? user.user_metadata.fullname : user.email}
                      </p>
                      <p className="text-caption text-on-surface-variant truncate">{user.email}</p>
                    </div>
                    <Link
                      to="/profile"
                      className="flex items-center gap-3 px-4 py-3 text-on-surface hover:bg-surface-container-low transition-colors font-label-md text-label-md"
                      onClick={() => setProfileOpen(false)}
                    >
                      <span className="material-symbols-outlined text-lg">person</span> Profile
                    </Link>
                    <button
                      className="w-full flex items-center gap-3 px-4 py-3 text-error hover:bg-error-container/40 transition-colors font-label-md text-label-md"
                      type="button"
                      onClick={handleLogout}
                    >
                      <span className="material-symbols-outlined text-lg">logout</span> Logout
                    </button>
                  </div>
                )}
              </div>
            </>
          ) : (
            <Link className={loginButtonClass} to="/signin">
              Login/Register
            </Link>
          )}

          <button className="md:hidden p-2 text-surface-bright hover:bg-white/10 rounded-full transition-colors" onClick={() => setDrawerOpen(true)}>
            <span className="material-symbols-outlined text-2xl">menu</span>
          </button>
        </div>
      </header>

      <div className={`fixed inset-0 z-[200] transition-all duration-300 ${drawerOpen ? '' : 'invisible pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-primary-container/60 backdrop-blur-sm transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setDrawerOpen(false)}></div>
        <div className={`absolute right-0 top-0 h-full w-[280px] bg-background shadow-2xl flex flex-col p-lg transition-transform duration-300 ease-in-out font-body-md ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center mb-xl">
            <span className="font-headline-md text-on-surface">Menu</span>
            <button className="text-on-surface-variant hover:text-primary p-2 transition-transform hover:rotate-90" onClick={() => setDrawerOpen(false)}>
              <span className="material-symbols-outlined text-3xl">close</span>
            </button>
          </div>
          <nav className="flex flex-col gap-lg">
            {navItems.map((item) => (
              <Link
                key={item.path}
                className={`font-label-md text-lg pl-4 inline-flex items-center gap-2 transition-colors ${
                  item.path === active ? 'text-secondary border-l-4 border-secondary font-bold' : 'text-on-surface-variant hover:text-secondary'
                }`}
                to={item.path}
                onClick={() => setDrawerOpen(false)}
              >
                {item.label}
                {item.path === '/contact' && item.path !== active && <UnreadBadge count={userUnread} />}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-lg border-t border-outline-variant">
            {user ? (
              <div className="flex flex-col gap-sm">
                <Link
                  to="/profile"
                  className="w-full px-md py-4 bg-surface-container-low text-on-surface font-bold rounded-xl flex items-center justify-center gap-base shadow-sm transition-transform hover:scale-[1.02]"
                  onClick={() => setDrawerOpen(false)}
                >
                  <span className="material-symbols-outlined text-lg">person</span> Profile
                </Link>
                <button
                  className="w-full px-md py-4 bg-error text-on-error font-bold rounded-xl flex items-center justify-center gap-base shadow-lg transition-transform hover:scale-[1.02]"
                  type="button"
                  onClick={handleLogout}
                >
                  <span className="material-symbols-outlined text-lg">logout</span> Logout
                </button>
              </div>
            ) : (
              <Link
                className="w-full px-md py-4 bg-secondary text-on-secondary font-bold rounded-xl flex items-center justify-center text-center shadow-lg transition-transform hover:scale-[1.02]"
                to="/signin"
                onClick={() => setDrawerOpen(false)}
              >
                Login/Register
              </Link>
            )}
          </div>
        </div>
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
      <ConfirmDialog
        open={confirmOpen}
        title="Log out of your account?"
        message="You will need to sign in again to access your account and continue where you left off."
        confirmLabel="Log out"
        onConfirm={confirmLogout}
        onCancel={() => setConfirmOpen(false)}
      />
      {signingOut && <LogoutScreen />}
    </>
  );
}
