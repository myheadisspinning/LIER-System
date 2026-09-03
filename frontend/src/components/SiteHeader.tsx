import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { Bell, Home, Info, Landmark, LayoutGrid, LogIn, Mail } from 'lucide-react';
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
  { path: '/', label: 'Home', Icon: Home },
  { path: '/about', label: 'About', Icon: Info },
  { path: '/officials', label: 'Officials', Icon: Landmark },
  { path: '/services', label: 'Services', Icon: LayoutGrid },
  { path: '/advisories', label: 'Advisories', Icon: Bell },
  { path: '/contact', label: 'Contact', Icon: Mail },
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

  useEffect(() => {
    if (!drawerOpen) return;
    const htmlPrev = document.documentElement.style.overflow;
    const bodyPrev = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = htmlPrev;
      document.body.style.overflow = bodyPrev;
    };
  }, [drawerOpen]);

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
    const name = user?.user_metadata?.fullname || user?.user_metadata?.full_name || user?.user_metadata?.name;
    if (typeof name === 'string' && name.trim()) return name.trim().charAt(0).toUpperCase();
    return (user?.email?.[0] ?? 'U').toUpperCase();
  };

  const getAvatarUrl = () => {
    return user?.user_metadata?.avatar_url || user?.user_metadata?.picture || null;
  };

  const getDisplayName = () => {
    return user?.user_metadata?.fullname || user?.user_metadata?.full_name || user?.user_metadata?.name || user?.email;
  };

  const titleWords = title.trim().split(/\s+/);
  const titleTail = titleWords.length > 1 ? titleWords[titleWords.length - 1] : '';
  const titleHead = titleWords.length > 1 ? titleWords.slice(0, -1).join(' ') : title;

  const loginButtonClass =
    'group hidden lg:inline-flex items-center gap-1.5 h-8 px-3.5 rounded-full border border-white/30 bg-transparent text-white font-medium text-[11px] tracking-widest uppercase cursor-pointer transition-all duration-200 ease-in-out hover:bg-white/10 hover:border-slate-200 active:scale-95 focus:outline-none focus:ring-2 focus:ring-white/50';

  return (
    <>
      <header className="fixed top-0 left-0 w-full z-[100] flex justify-between xl:justify-center xl:gap-12 items-center px-4 md:px-margin-desktop h-16 bg-primary-container/90 backdrop-blur-md shadow-md font-body-md">
        <Link to="/" className="flex flex-1 lg:flex-none items-center gap-2 md:gap-sm min-w-0">
          <div className="w-8 h-8 md:w-10 md:h-10 bg-white rounded-full flex items-center justify-center overflow-hidden border-2 border-tertiary-fixed-dim transition-transform hover:scale-110 shrink-0">
            <img alt={logoAlt} className={logoClass} src={logo} />
          </div>
          <h1 className="font-headline-md text-[10px] min-[400px]:text-[11px] sm:text-[13px] font-bold text-surface-bright leading-tight whitespace-nowrap overflow-hidden">
            <span className="flex flex-col items-start leading-none gap-[2px]">
              <span className="uppercase tracking-widest">{titleHead}</span>
              {titleTail && (
                <span className="uppercase tracking-widest text-[9px] min-[400px]:text-[10px] sm:text-[10px] font-semibold text-tertiary-fixed-dim opacity-90">{titleTail}</span>
              )}
            </span>
          </h1>
        </Link>

        <nav className="hidden lg:flex items-center gap-1 p-1.5 rounded-full bg-white/5 border border-white/10">
          {navItems.map((item) => (
            <Link
              key={item.path}
              className={`font-label-md text-[13px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-full transition-all duration-200 ${
                item.path === active
                  ? 'bg-tertiary-fixed-dim text-on-tertiary-fixed font-bold shadow'
                  : 'text-on-primary-container hover:text-surface-bright hover:bg-white/5'
              }`}
              to={item.path}
            >
              {item.label}
              {item.path === '/contact' && item.path !== active && <UnreadBadge count={userUnread} />}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1 md:gap-md lg:gap-2 shrink-0 lg:shrink lg:flex-1 lg:justify-end xl:flex-none" ref={actionsRef}>
          {user ? (
            <>
              <div className="relative hidden lg:block">
                <button
                  className="inline-flex items-center justify-center h-8 w-8 text-surface-bright hover:bg-white/10 rounded-full border border-white/30 transition-colors relative"
                  type="button"
                  aria-label="Notifications"
                  onClick={() => {
                    setNotifOpen((v) => !v);
                    setProfileOpen(false);
                  }}
                >
                  <span className="material-symbols-outlined text-lg leading-none">notifications</span>
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
                  className="flex items-center gap-1 p-0.5 pr-1 md:gap-2 md:p-1.5 md:pr-2 rounded-full hover:bg-white/10 transition-colors lg:gap-0.5 lg:h-8 lg:pl-0.5 lg:pr-1 lg:border lg:border-white/30"
                  type="button"
                  aria-label="Profile menu"
                  onClick={() => {
                    setProfileOpen((v) => !v);
                    setNotifOpen(false);
                  }}
                >
                  <span className="w-6 h-6 md:w-8 md:h-8 rounded-full bg-secondary flex items-center justify-center text-on-secondary font-bold text-xs md:text-sm overflow-hidden lg:w-7 lg:h-7 lg:text-xs">
                    {getAvatarUrl() ? (
                      <img src={getAvatarUrl()} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      getInitial()
                    )}
                  </span>
                  <span className="material-symbols-outlined text-base md:text-xl text-surface-bright lg:text-base">{profileOpen ? 'expand_less' : 'expand_more'}</span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-52 bg-background rounded-lg shadow-2xl border border-outline-variant/30 overflow-hidden">
                    <div className="px-4 py-3 border-b border-outline-variant/30">
                      <p className="font-label-md text-label-md font-bold text-on-surface truncate">
                        {getDisplayName()}
                      </p>
                      <p className="text-caption text-on-surface-variant truncate">{user.email}</p>
                    </div>
                    <button
                      type="button"
                      className="w-full flex items-center gap-3 px-4 py-3 text-on-surface hover:bg-surface-container-low transition-colors font-label-md text-label-md lg:hidden"
                      onClick={() => setNotifOpen((v) => !v)}
                    >
                      <span className="material-symbols-outlined text-lg">notifications</span> Notifications
                    </button>
                    {notifOpen && (
                      <div className="px-4 py-2.5 flex flex-col items-center gap-sm text-on-surface-variant border-b border-outline-variant/30 lg:hidden">
                        <span className="material-symbols-outlined text-xl">notifications_off</span>
                        <p className="text-caption text-center">No new notifications yet.</p>
                      </div>
                    )}
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
            <Link className={loginButtonClass} to="/signin" aria-label="Login">
              <LogIn className="w-4 h-4 text-white" />
              Login
            </Link>
          )}

          <button className="lg:hidden p-1 md:p-2 text-surface-bright hover:bg-white/10 rounded-full transition-colors" onClick={() => setDrawerOpen(true)}>
            <span className="material-symbols-outlined text-xl md:text-2xl">menu</span>
          </button>
        </div>
      </header>

      <div className={`fixed inset-0 z-[200] transition-all duration-300 ${drawerOpen ? '' : 'invisible pointer-events-none'}`}>
        <div className={`absolute inset-0 bg-primary-container/60 backdrop-blur-sm transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`} onClick={() => setDrawerOpen(false)}></div>
        <div className={`absolute right-0 top-0 h-full w-[78vw] max-w-[300px] bg-background shadow-2xl flex flex-col p-5 transition-transform duration-300 ease-in-out font-body-md ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex justify-between items-center mb-4">
            <span className="font-headline-md text-lg font-bold text-on-surface">Menu</span>
            <button className="text-on-surface-variant hover:text-primary p-1.5 transition-transform hover:rotate-90" onClick={() => setDrawerOpen(false)} aria-label="Close menu">
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
          {user && (
            <div className="flex items-center gap-3 p-3 mb-4 rounded-xl bg-surface-container-low border border-outline-variant/30 min-w-0">
              <span className="w-10 h-10 rounded-full bg-secondary flex items-center justify-center text-on-secondary font-bold text-sm overflow-hidden shrink-0">
                {getAvatarUrl() ? (
                  <img src={getAvatarUrl()} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  getInitial()
                )}
              </span>
              <div className="min-w-0">
                <p className="font-label-md text-label-md font-bold text-on-surface truncate">{getDisplayName()}</p>
                <p className="text-caption text-on-surface-variant truncate">{user.email}</p>
              </div>
            </div>
          )}
          <p className="px-4 mb-1 text-[11px] font-bold uppercase tracking-widest text-on-surface-variant">Navigate</p>
          <nav className="flex-1 min-h-0 overflow-y-auto scroll-hide flex flex-col gap-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                className={`font-label-md text-[15px] px-4 py-3 rounded-xl inline-flex items-center gap-3 transition-colors ${
                  item.path === active ? 'bg-secondary/10 text-secondary font-bold' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-secondary'
                }`}
                to={item.path}
                onClick={() => setDrawerOpen(false)}
              >
                <item.Icon className="w-[18px] h-[18px] shrink-0" />
                <span className="flex-1">{item.label}</span>
                {item.path === '/contact' && item.path !== active && <UnreadBadge count={userUnread} />}
              </Link>
            ))}
          </nav>
          <div className="mt-auto pt-4 border-t border-outline-variant">
            {user ? (
              <button
                className="w-full px-md py-3 bg-error text-on-error font-bold rounded-xl flex items-center justify-center gap-base shadow-lg transition-transform hover:scale-[1.02]"
                type="button"
                onClick={handleLogout}
              >
                <span className="material-symbols-outlined text-lg">logout</span> Logout
              </button>
            ) : (
              <Link
                className="group inline-flex items-center justify-center gap-1.5 w-full px-3 py-2.5 rounded-lg bg-secondary text-white font-semibold text-xs tracking-wide shadow-md hover:shadow-lg hover:-translate-y-0.5 active:translate-y-0 transition-all duration-250 cursor-pointer focus:outline-none focus:ring-2 focus:ring-secondary/50"
                to="/signin"
                onClick={() => setDrawerOpen(false)}
                aria-label="Login"
              >
                <span className="material-symbols-outlined text-sm leading-none" style={{ fontVariationSettings: "'FILL' 1" }}>login</span>
                <span className="uppercase">Login</span>
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
