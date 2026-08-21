import { useEffect, useRef, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../../supabaseClient';
import { useTheme } from '../../../lib/theme';
import { usePresenceHeartbeat, useUnreadCounts, type UnreadCounts } from '../../../lib/admin';
import { userNav, type NavItem } from './nav';
import ConfirmDialog from '../../../components/ConfirmDialog';
import LogoutScreen from '../../../components/LogoutScreen';
import UnreadBadge from '../../../components/UnreadBadge';

function useActiveItem(pathname: string) {
  const direct = userNav.items.find((i) => i.to === pathname);
  if (direct) return direct;
  return userNav.items.find((i) => i.children?.some((c) => c.to === pathname));
}

export default function UserLayout() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = useActiveItem(pathname);
  const isReportIncident = pathname === '/user/report-incident';
  const pageTitle = active?.label ?? userNav.fallbackTitle;
  const [theme, toggleTheme] = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const profileRef = useRef<HTMLDivElement>(null);

  const [user, setUser] = useState<User | null>(null);

  usePresenceHeartbeat();
  const unreadCounts = useUnreadCounts(true);

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
    if (!drawerOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [drawerOpen]);

  const getFullName = () => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    return (typeof meta?.fullname === 'string' && meta.fullname.trim()) ||
      (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
      (typeof meta?.name === 'string' && meta.name.trim()) || null;
  };

  const displayName = () => {
    return getFullName() || user?.email || 'Resident';
  };

  const initials = () => {
    const fullname = getFullName() || '';
    if (fullname) {
      const parts = fullname.split(/\s+/);
      const first = parts[0]?.[0] ?? '';
      const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
      return (first + last).toUpperCase();
    }
    return (user?.email?.[0] ?? 'U').toUpperCase();
  };

  const handleSignOut = () => {
    setProfileOpen(false);
    setConfirmOpen(true);
  };

  const confirmSignOut = () => {
    setConfirmOpen(false);
    setSigningOut(true);
    void supabase.auth.signOut().catch(() => null);
    setTimeout(() => {
      setSigningOut(false);
      navigate('/');
    }, 1500);
  };

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (profileRef.current && !profileRef.current.contains(e.target as Node)) {
        setProfileOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const renderGroups = (onNavigate?: () => void) => {
    let section: string | undefined;
    const nodes: React.ReactNode[] = [];
    for (const item of userNav.items) {
      if (item.section && item.section !== section) {
        section = item.section;
        nodes.push(
          <div key={`section-${section}`} className="mt-5 mb-1.5 px-3">
            <p className="text-[10px] text-cc-muted uppercase font-bold tracking-widest">{section}</p>
          </div>,
        );
      }
      nodes.push(<SidebarLink key={item.label} item={item} pathname={pathname} unreadCounts={unreadCounts} onNavigate={onNavigate} />);
    }
    return nodes;
  };

  return (
    <div className="min-h-screen bg-background text-on-surface font-body-md portal-dark">
      {/* Side Navigation */}
      <aside className="h-screen w-72 fixed left-0 top-0 bg-cc-sidebar text-cc-body flex flex-col border-r border-cc-border z-50 hidden lg:flex">
        <div className="p-6 pb-5 border-b border-cc-border">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white border-2 border-tertiary-fixed-dim overflow-hidden shrink-0 shadow-cc-card flex items-center justify-center">
              <img src="/image/culiat-logo.png" alt="Barangay Culiat Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-cc-heading leading-tight tracking-tight">{userNav.brand}</h1>
              <p className="text-[10px] text-cc-muted uppercase tracking-widest font-bold mt-0.5">{userNav.brandSub}</p>
            </div>
          </div>
        </div>

        <nav className="flex-1 flex flex-col overflow-y-auto scroll-hide px-3 pt-3 pb-8">{renderGroups()}</nav>

        <div className="mt-auto p-4 border-t border-cc-border">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-cc-hover border border-cc-border">
            <div className="w-9 h-9 rounded-full bg-cc-accent flex items-center justify-center text-cc-on-accent text-xs font-bold shrink-0">{initials()}</div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-cc-heading leading-tight truncate">{displayName()}</p>
              <p className="text-[10px] text-cc-muted uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-cc-emerald animate-pulse"></span>System Online
              </p>
            </div>
            <button type="button" onClick={handleSignOut} className="text-cc-muted hover:text-cc-heading transition-colors" aria-label="Sign out">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-0 lg:ml-72 flex-1 w-auto min-w-auto">
        <header className="h-16 bg-cc-header/90 backdrop-blur border-b border-cc-border sticky top-0 z-40 px-4 lg:px-8 flex justify-between items-center w-full">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setDrawerOpen(true)}
              className="lg:hidden p-2 text-cc-muted hover:text-cc-heading hover:bg-cc-hover rounded-full transition-colors"
              aria-label="Open menu"
            >
              <span className="material-symbols-outlined">menu</span>
            </button>
            <div className="min-w-0">
              <h2 className="text-xl font-bold text-cc-heading leading-tight truncate">{pageTitle}</h2>
              <p className="text-[10px] text-cc-muted uppercase tracking-widest font-bold">{userNav.brandSub}</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative hidden md:block">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-cc-muted"
                style={{ fontSize: 18 }}
              >
                search
              </span>
              <input
                className="pl-9 pr-4 py-2 bg-cc-input border border-cc-border rounded-lg focus:ring-1 focus:ring-cc-accent w-72 text-sm text-cc-heading placeholder:text-cc-muted focus:outline-none"
                placeholder={userNav.searchPlaceholder}
                type="text"
              />
            </div>
            <div className="flex items-center gap-3 border-l border-cc-border pl-5">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 text-cc-muted hover:text-cc-heading hover:bg-cc-hover rounded-full transition-colors"
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                aria-label="Toggle color theme"
              >
                <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
              </button>
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-cc-emerald/10 text-cc-emerald border border-cc-emerald/20 text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-cc-emerald animate-pulse"></span> LIVE
              </span>
              <button type="button" className="hidden sm:inline-flex p-2 text-cc-muted hover:text-cc-heading hover:bg-cc-hover rounded-full relative transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-cc-red rounded-full border-2 border-cc-header"></span>
              </button>
              <button type="button" className="hidden sm:inline-flex p-2 text-cc-muted hover:text-cc-heading hover:bg-cc-hover rounded-full transition-colors">
                <span className="material-symbols-outlined">help_outline</span>
              </button>
              <div className="relative" ref={profileRef}>
                <button
                  type="button"
                  onClick={() => setProfileOpen((v) => !v)}
                  className="w-9 h-9 rounded-full bg-cc-accent/15 ring-1 ring-cc-border-strong flex items-center justify-center hover:ring-cc-accent transition-colors"
                  aria-label="Profile menu"
                >
                  <span className="text-xs font-bold text-cc-accent">{initials()}</span>
                </button>
                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-60 bg-cc-card border border-cc-border rounded-lg shadow-cc-card overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-cc-border">
                      <p className="text-sm font-bold text-cc-heading truncate">{displayName()}</p>
                      <p className="text-[10px] text-cc-muted uppercase tracking-wider truncate">{user?.email}</p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/profile');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-cc-body hover:bg-cc-hover transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-lg text-cc-accent">person</span> Profile
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setProfileOpen(false);
                        navigate('/');
                      }}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-cc-body hover:bg-cc-hover transition-colors text-left"
                    >
                      <span className="material-symbols-outlined text-lg text-cc-accent">home</span> Home
                    </button>
                    <button
                      type="button"
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-3 px-4 py-3 text-sm text-cc-red hover:bg-cc-hover transition-colors text-left border-t border-cc-border"
                    >
                      <span className="material-symbols-outlined text-lg">logout</span> Sign Out
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </header>

        <main className="relative flex-1 p-4 lg:p-8 min-h-[calc(100vh-4rem)] bg-surface-bg">
          <div
            className="pointer-events-none absolute inset-0"
            style={{
              background:
                'radial-gradient(1100px 480px at 85% -10%, rgba(59,130,246,0.10), transparent 60%), radial-gradient(900px 420px at -10% 0%, rgba(49,107,243,0.07), transparent 55%)',
            }}
          ></div>
          <div className="relative mx-auto w-full max-w-[1440px]">
            <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
              <div className="flex items-center gap-4">
              </div>
              {active?.badge && (
                <span className="w-fit px-3 py-1 rounded-full bg-cc-accent/10 text-cc-accent font-label-md text-label-md border border-cc-accent/20">
                  {active.badge}
                </span>
              )}
            </div>

            {isReportIncident ? (
              <div className="mt-6">
                <Outlet />
              </div>
            ) : (
              <div className="mt-6 bg-surface-container-lowest/80 backdrop-blur border border-border-subtle rounded-2xl shadow-[0_1px_2px_rgba(2,6,23,0.05),0_12px_32px_-16px_rgba(2,6,23,0.18)] p-5 lg:p-8">
                <Outlet />
              </div>
            )}
          </div>
        </main>
      </div>

      {/* Mobile Drawer */}
      <div className={`fixed inset-0 z-[200] transition-all duration-300 lg:hidden ${drawerOpen ? '' : 'invisible pointer-events-none'}`}>
        <div
          className={`absolute inset-0 bg-cc-sidebar/80 backdrop-blur-sm transition-opacity duration-300 ${drawerOpen ? 'opacity-100' : 'opacity-0'}`}
          onClick={() => setDrawerOpen(false)}
        ></div>
        <div
          className={`absolute left-0 top-0 h-full w-[280px] bg-cc-sidebar text-cc-body flex flex-col transition-transform duration-300 ease-in-out ${
            drawerOpen ? 'translate-x-0' : '-translate-x-full'
          }`}
        >
          <div className="p-6 pb-4 border-b border-cc-border">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-11 h-11 rounded-full bg-white border-2 border-tertiary-fixed-dim overflow-hidden shrink-0 shadow-cc-card flex items-center justify-center">
                  <img src="/image/culiat-logo.png" alt="Barangay Culiat Logo" className="w-full h-full object-contain" />
                </div>
                <div>
                  <h1 className="text-lg font-bold text-cc-heading leading-tight tracking-tight">{userNav.brand}</h1>
                  <p className="text-[10px] text-cc-muted uppercase tracking-widest font-bold mt-0.5">{userNav.brandSub}</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setDrawerOpen(false)}
                className="p-2 text-cc-muted hover:text-cc-heading rounded-full transition-transform hover:rotate-90"
                aria-label="Close menu"
              >
                <span className="material-symbols-outlined">close</span>
              </button>
            </div>
          </div>
          <nav className="flex-1 flex flex-col overflow-y-auto scroll-hide px-3 pt-3 pb-6">{renderGroups(() => setDrawerOpen(false))}</nav>
          <div className="mt-auto p-4 border-t border-cc-border">
            <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-cc-hover border border-cc-border">
              <div className="w-9 h-9 rounded-full bg-cc-accent flex items-center justify-center text-cc-on-accent text-xs font-bold shrink-0">{initials()}</div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-semibold text-cc-heading leading-tight truncate">{displayName()}</p>
                <p className="text-[10px] text-cc-muted uppercase tracking-wider flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cc-emerald animate-pulse"></span>System Online
                </p>
              </div>
              <button type="button" onClick={handleSignOut} className="text-cc-muted hover:text-cc-heading transition-colors" aria-label="Sign out">
                <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={confirmOpen}
        title="Sign out of your account?"
        message="You will need to sign in again to access the portal and continue where you left off."
        confirmLabel="Sign out"
        onConfirm={confirmSignOut}
        onCancel={() => setConfirmOpen(false)}
      />
      {signingOut && <LogoutScreen />}
    </div>
  );
}

function SidebarLink({ item, pathname, unreadCounts, onNavigate }: { item: NavItem; pathname: string; unreadCounts: UnreadCounts; onNavigate?: () => void }) {
  const isActive = pathname === item.to || item.children?.some((c) => c.to === pathname);
  const unread = item.unreadKey === 'admin' ? unreadCounts.adminUnread : item.unreadKey === 'user' ? unreadCounts.userUnread : 0;
  return (
    <NavLink
      to={item.to ?? '#!'}
      onClick={onNavigate}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg relative transition-all ${
        isActive
          ? 'bg-cc-accent-soft text-cc-heading border border-cc-border-strong'
          : 'text-cc-body hover:bg-cc-hover hover:text-cc-heading'
      }`}
    >
      {isActive && <span className="w-1 h-7 rounded-full bg-cc-accent absolute -left-0.5"></span>}
      <span className={`material-symbols-outlined text-[20px] shrink-0 ${isActive ? 'text-cc-accent' : 'text-cc-muted'}`}>
        {item.icon ?? 'radio_button_unchecked'}
      </span>
      <span className="flex flex-col min-w-0">
        <span className={`text-sm truncate ${isActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
        {item.subLabel && <span className="text-[10px] text-cc-muted truncate">{item.subLabel}</span>}
      </span>
      {unread > 0 && !isActive && <UnreadBadge count={unread} className="bg-cc-red" />}
    </NavLink>
  );
}
