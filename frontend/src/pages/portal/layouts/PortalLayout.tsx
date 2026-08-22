import { useEffect, useState } from 'react';
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../../../supabaseClient';
import { useTheme } from '../../../lib/theme';
import { usePresenceHeartbeat, useUnreadCounts, type UnreadCounts } from '../../../lib/admin';
import type { NavItem, RoleNav } from './nav';
import ConfirmDialog from '../../../components/ConfirmDialog';
import LogoutScreen from '../../../components/LogoutScreen';
import UnreadBadge from '../../../components/UnreadBadge';

interface PortalLayoutProps {
  nav: RoleNav;
  fab?: boolean;
  fabLabel?: string;
}

function useActiveItem(nav: RoleNav, pathname: string) {
  const flat: NavItem[] = [];
  for (const item of nav.items) {
    flat.push(item);
    if (item.children) flat.push(...item.children.map((c) => ({ ...c, to: c.to })));
  }
  const direct = flat.find((i) => i.to === pathname);
  if (direct) return direct;
  for (const item of nav.items) {
    if (item.children?.some((c) => c.to === pathname)) return item;
  }
  return undefined;
}

export default function PortalLayout({ nav, fab, fabLabel = 'QUICK DISPATCH' }: PortalLayoutProps) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const active = useActiveItem(nav, pathname);
  const pageTitle = active?.label ?? nav.fallbackTitle;
  const [theme, toggleTheme] = useTheme();

  const [user, setUser] = useState<User | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);

  usePresenceHeartbeat();
  const hasUnread = nav.items.some((i) => i.unreadKey === 'admin' || i.unreadKey === 'user');
  const unreadCounts = useUnreadCounts(hasUnread);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const getFullName = () => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    return (typeof meta?.fullname === 'string' && meta.fullname.trim()) ||
      (typeof meta?.full_name === 'string' && meta.full_name.trim()) ||
      (typeof meta?.name === 'string' && meta.name.trim()) || null;
  };

  const displayName = () => {
    return getFullName() || user?.email || nav.brandSub;
  };

  const initials = () => {
    const fullname = getFullName() || '';
    if (fullname) {
      const parts = fullname.split(/\s+/);
      const first = parts[0]?.[0] ?? '';
      const last = parts.length > 1 ? parts[parts.length - 1][0] ?? '' : '';
      return (first + last).toUpperCase();
    }
    return (user?.email?.[0] ?? 'A').toUpperCase();
  };

  const avatarUrl = () => {
    const meta = user?.user_metadata as Record<string, unknown> | undefined;
    return (typeof meta?.avatar_url === 'string' && meta.avatar_url) ||
      (typeof meta?.picture === 'string' && meta.picture) || null;
  };

  const handleSignOut = () => setConfirmOpen(true);

  const confirmSignOut = () => {
    setConfirmOpen(false);
    setSigningOut(true);
    void supabase.auth.signOut().catch(() => null);
    setTimeout(() => {
      setSigningOut(false);
      navigate('/');
    }, 1500);
  };

  const renderGroup = (items: NavItem[]) => {
    let section: string | undefined;
    const nodes: React.ReactNode[] = [];
    for (const item of items) {
      if (item.section && item.section !== section) {
        section = item.section;
        nodes.push(
          <div key={`section-${section}`} className="mt-5 mb-1.5 px-3">
            <p className="text-[10px] text-on-surface-variant uppercase font-bold tracking-widest">{section}</p>
          </div>,
        );
      }
      nodes.push(<SubmenuItem key={item.label + (item.to ?? '')} item={item} pathname={pathname} unreadCounts={unreadCounts} />);
    }
    return nodes;
  };

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen antialiased portal-dark">
      {/* Side Navigation */}
      <aside className="h-screen w-72 fixed left-0 top-0 bg-white text-on-surface-variant flex flex-col border-r border-outline-variant/30 z-50">
        <div className="p-6 pb-5 border-b border-outline-variant/30">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-full bg-white border-2 border-tertiary-fixed-dim overflow-hidden shrink-0 shadow-sm flex items-center justify-center">
              <img src="/image/culiat-logo.png" alt="Barangay Culiat Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-on-surface leading-tight tracking-tight">{nav.brand}</h1>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold mt-0.5">{nav.brandSub}</p>
            </div>
          </div>
        </div>
        <nav className="flex-1 flex flex-col overflow-y-auto scroll-hide px-3 pt-3 pb-8">
          {renderGroup(nav.items)}
        </nav>
        <div className="mt-auto p-4 border-t border-outline-variant/30">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg bg-surface-container-low border border-outline-variant/30">
            <div className="w-9 h-9 rounded-full bg-secondary flex items-center justify-center text-on-secondary text-xs font-bold shrink-0 overflow-hidden">
              {avatarUrl() ? <img src={avatarUrl()!} alt="" className="w-full h-full object-cover" /> : initials()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-on-surface leading-tight truncate">{displayName()}</p>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse"></span>System Online
              </p>
            </div>
            <button type="button" onClick={handleSignOut} className="text-on-surface-variant hover:text-on-surface transition-colors" aria-label="Sign out">
              <span className="material-symbols-outlined" style={{ fontSize: 20 }}>logout</span>
            </button>
          </div>
        </div>
      </aside>

      {/* Main Content */}
      <div className="ml-72 flex-1 w-auto">
        <header className="h-16 bg-white/90 backdrop-blur border-b border-outline-variant/30 sticky top-0 z-40 px-8 flex justify-between items-center w-full">
          <div className="flex items-center gap-3 min-w-0">
            <div>
              <h2 className="text-xl font-bold text-on-surface leading-tight truncate">{pageTitle}</h2>
              <p className="text-[10px] text-on-surface-variant uppercase tracking-widest font-bold">{nav.brandSub}</p>
            </div>
          </div>
          <div className="flex items-center gap-5">
            <div className="relative hidden md:block">
              <span
                className="material-symbols-outlined absolute left-3 top-1/2 -translate-y-1/2 text-on-surface-variant"
                style={{ fontSize: 18 }}
              >
                search
              </span>
              <input
                className="pl-9 pr-4 py-2 bg-white border border-outline-variant/30 rounded-lg focus:ring-1 focus:ring-cc-accent w-72 text-sm text-on-surface placeholder:text-on-surface-variant focus:outline-none"
                placeholder={nav.searchPlaceholder}
                type="text"
              />
            </div>
            <div className="flex items-center gap-3 border-l border-outline-variant/30 pl-5">
              <button
                type="button"
                onClick={toggleTheme}
                className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-full transition-colors"
                title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
                aria-label="Toggle color theme"
              >
                <span className="material-symbols-outlined">{theme === 'dark' ? 'light_mode' : 'dark_mode'}</span>
              </button>
              <span className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-success-green/10 text-success-green border border-cc-emerald/20 text-xs font-bold">
                <span className="w-1.5 h-1.5 rounded-full bg-success-green animate-pulse"></span> LIVE
              </span>
              <button type="button" className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-full relative transition-colors">
                <span className="material-symbols-outlined">notifications</span>
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-error rounded-full border-2 border-cc-header"></span>
              </button>
              <button type="button" className="p-2 text-on-surface-variant hover:text-on-surface hover:bg-surface-container-low rounded-full transition-colors">
                <span className="material-symbols-outlined">help_outline</span>
              </button>
              <div className="w-9 h-9 rounded-full bg-secondary/15 ring-1 ring-cc-border-strong flex items-center justify-center overflow-hidden">
                {avatarUrl() ? <img src={avatarUrl()!} alt="" className="w-full h-full object-cover" /> : <span className="text-xs font-bold text-secondary">{initials()}</span>}
              </div>
            </div>
          </div>
        </header>

        <main className="p-8">
          <Outlet />
        </main>
      </div>

      {fab && (
        <button
          type="button"
          className="fixed bottom-8 right-8 w-14 h-14 bg-secondary text-on-secondary rounded-full shadow-sm-hover flex items-center justify-center hover:scale-110 active:scale-95 transition-all z-50 group border-4 border-cc-header"
        >
          <span className="material-symbols-outlined text-2xl group-hover:rotate-12 transition-transform">bolt</span>
          <span className="absolute right-16 bg-cc-heading text-cc-bg text-[10px] font-bold px-3 py-1 rounded whitespace-nowrap opacity-0 group-hover:opacity-100 transition-opacity">
            {fabLabel}
          </span>
        </button>
      )}

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

function SubmenuItem({ item, pathname, unreadCounts }: { item: NavItem; pathname: string; unreadCounts: UnreadCounts }) {
  const childActive = item.children?.some((c) => c.to === pathname) ?? false;
  const [expanded, setExpanded] = useState(childActive);
  const unread = item.unreadKey === 'admin' ? unreadCounts.adminUnread : item.unreadKey === 'user' ? unreadCounts.userUnread : 0;

  if (item.children && item.children.length > 0) {
    return (
      <div className="flex flex-col gap-1">
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className={`flex items-center justify-between gap-3 px-3 py-2.5 rounded-lg relative transition-colors w-full text-left ${
            childActive ? 'bg-secondary/10 text-on-surface border border-outline-variant' : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
          }`}
        >
          {childActive && <span className="w-1 h-7 rounded-full bg-secondary absolute -left-0.5"></span>}
          <span className="flex items-center gap-3 min-w-0">
            <span className={`material-symbols-outlined text-[20px] shrink-0 ${childActive ? 'text-secondary' : 'text-on-surface-variant'}`}>
              {item.icon ?? 'radio_button_unchecked'}
            </span>
            <span className="flex flex-col min-w-0">
              <span className={`text-sm truncate ${childActive ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
              {item.subLabel && <span className="text-[10px] text-on-surface-variant truncate">{item.subLabel}</span>}
            </span>
          </span>
          <span className={`material-symbols-outlined text-sm text-on-surface-variant transition-transform ${expanded ? 'rotate-180' : ''}`}>
            expand_more
          </span>
        </button>
        {expanded && (
          <div className="flex flex-col gap-1 pl-9">
            {item.children.map((child) => (
              <NavLink
                key={child.to}
                to={child.to}
                className={`py-1.5 transition-colors w-full text-left text-xs font-medium ${
                  pathname === child.to ? 'text-on-surface' : 'text-on-surface-variant hover:text-on-surface'
                }`}
              >
                {child.label}
              </NavLink>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <NavLink
      to={item.to!}
      className={`flex items-center gap-3 px-3 py-2.5 rounded-lg relative transition-all ${
        pathname === item.to
          ? 'bg-secondary/10 text-on-surface border border-outline-variant'
          : 'text-on-surface-variant hover:bg-surface-container-low hover:text-on-surface'
      }`}
    >
      {pathname === item.to && <span className="w-1 h-7 rounded-full bg-secondary absolute -left-0.5"></span>}
      <span className={`material-symbols-outlined text-[20px] shrink-0 ${pathname === item.to ? 'text-secondary' : 'text-on-surface-variant'}`}>
        {item.icon ?? 'radio_button_unchecked'}
      </span>
      <span className="flex flex-col min-w-0">
        <span className={`text-sm truncate ${pathname === item.to ? 'font-semibold' : 'font-medium'}`}>{item.label}</span>
        {item.subLabel && <span className="text-[10px] text-on-surface-variant truncate">{item.subLabel}</span>}
      </span>
      {item.badge ? (
        <span className="ml-auto bg-error text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">{item.badge}</span>
      ) : unread > 0 && pathname !== item.to ? (
        <UnreadBadge count={unread} className="bg-error" />
      ) : null}
    </NavLink>
  );
}

