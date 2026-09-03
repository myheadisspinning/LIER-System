import { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import { getRole, dashboardPathFor, type Role } from '../lib/role';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import Toast, { type ToastData } from '../components/Toast';
import ReportIncident from './portal/user/ReportIncident';
import { useScrollLock } from '../lib/useScrollLock';


export default function Services() {
  const location = useLocation();
  const navigate = useNavigate();
  const [modalOpen, setModalOpen] = useState(() => (location.state as { openIncident?: boolean } | null)?.openIncident === true);
  const [user, setUser] = useState<User | null>(null);
  const [opening, setOpening] = useState(false);
  const [toast, setToast] = useState<ToastData | null>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  useScrollLock(modalOpen);

  const handleDashboardClick = async () => {
    if (!user) {
      setToast({ type: 'error', message: 'Access Restricted: Please login or register to access your dashboard.' });
      return;
    }
    if (opening) return;
    setOpening(true);
    const role = await getRole(user.id);
    const path = dashboardPathFor(role);
    const loader = document.getElementById('page-loader');
    loader?.classList.remove('pointer-events-none', 'opacity-0');
    setTimeout(() => {
      window.open(path, '_blank', 'noopener,noreferrer');
      loader?.classList.add('pointer-events-none', 'opacity-0');
      setOpening(false);
    }, 2000);
  };

  const openGated = async (pathFor: Record<Role, string>) => {
    if (!user) {
      setToast({ type: 'error', message: 'Access Restricted: Please login or register to access this service.' });
      return;
    }
    if (opening) return;
    setOpening(true);
    const role = await getRole(user.id);
    window.open(pathFor[role], '_blank', 'noopener,noreferrer');
    setOpening(false);
  };

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.remove('opacity-0', 'translate-y-10');
            entry.target.classList.add('opacity-100', 'translate-y-0');
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.1 }
    );
    document.querySelectorAll('.glass-card').forEach((card) => {
      card.classList.add('opacity-0', 'translate-y-10', 'transition-all', 'duration-700');
      observer.observe(card);
    });
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const sectionObserver = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add('opacity-100', 'translate-y-0');
            entry.target.classList.remove('opacity-0', 'translate-y-10');
          }
        });
      },
      { threshold: 0.1 }
    );
    sectionRefs.current.forEach((el) => {
      if (el) sectionObserver.observe(el);
    });
    return () => sectionObserver.disconnect();
  }, []);

  return (
    <div className="bg-background font-body-md text-on-background antialiased min-h-screen overflow-x-hidden">
      <div className={`fixed inset-0 z-[1000] bg-primary-container/95 backdrop-blur-md flex flex-col items-center justify-center transition-opacity duration-500 pointer-events-none opacity-0`} id="page-loader">
        <div className="relative mb-8">
          <div className="w-24 h-24 rounded-full border-4 border-white/20 border-t-tertiary-fixed-dim animate-spin"></div>
          <img alt="Barangay Culiat Logo" className="absolute inset-0 m-auto w-12 h-12 rounded-full animate-pulse" src="/image/culiat-logo.png" />
        </div>
        <p className="text-white font-mono text-xs tracking-[0.3em] uppercase opacity-60">Initializing Secure Portal...</p>
      </div>

      <SiteHeader active="/services" />

      <main className="pt-20 w-full flex flex-col">
        <section className="relative py-8 md:py-xl px-4 md:px-margin-desktop flex flex-col items-center text-center w-full">
          <div className="absolute -top-24 -left-24 w-64 h-64 md:w-96 md:h-96 bg-secondary/10 blur-[80px] md:blur-[100px] rounded-full"></div>
          <div className="absolute -bottom-24 -right-24 w-64 h-64 md:w-96 md:h-96 bg-primary-fixed/30 blur-[80px] md:blur-[100px] rounded-full"></div>
          <div className="relative z-10 max-w-4xl mx-auto w-full flex flex-col items-center">
            <span className="inline-block px-md py-xs bg-secondary/10 text-secondary rounded-full font-label-md text-xs md:text-label-md mb-3 md:mb-md">Resident Support System</span>
            <h1 className="font-display-lg text-3xl md:text-display-lg text-primary mb-3 md:mb-md">Law Enforcement &amp; Public Safety System</h1>
            <p className="font-body-lg text-base text-on-surface-variant mb-6 md:mb-lg max-w-2xl mx-auto">An integrated platform for real-time incident reporting, tactical coordination, and community enforcement services.</p>
            <div className="flex flex-col sm:flex-row gap-3 md:gap-md justify-center items-center w-full max-w-md md:max-w-none">
              <button
                 className="px-lg py-3 bg-secondary text-on-secondary rounded-xl font-label-md text-label-md shadow-lg flex items-center justify-center gap-sm whitespace-nowrap transition-transform hover:scale-105 active:scale-95"
                onClick={() => {
                  if (!user) {
                    setToast({ type: 'error', message: 'Access Restricted: Please login or register to file a formal incident report.' });
                    return;
                  }
                  setModalOpen(true);
                }}
              >
                <span className="material-symbols-outlined">report</span>File an Incident Report
              </button>
              <button className="px-lg py-3 border-2 border-secondary text-secondary rounded-xl font-label-md text-label-md bg-white/50 backdrop-blur-sm whitespace-nowrap transition-all hover:bg-secondary/5">View System Guide</button>
            </div>
          </div>
        </section>

        <section className="py-8 md:py-xl px-4 md:px-margin-desktop bg-surface w-full flex flex-col">
          <div className="max-w-7xl mx-auto w-full flex flex-col">
          <div className="flex flex-col md:flex-row justify-between items-center md:items-end mb-6 md:mb-lg gap-3 md:gap-md w-full">
            <div className="max-w-ml text-center md:text-left">
              <h2 className="font-headline-lg text-2xl md:text-[28px] text-primary mb-xs">Frontline Assistance</h2>
              <p className="font-body-md text-body-md text-on-surface-variant">Quick access to essential barangay programs and regulatory requests.</p>
            </div>
            <div className="hidden md:flex gap-sm">
              <button className="w-12 h-12 rounded-full flex items-center justify-center border border-outline-variant text-secondary hover:bg-secondary hover:text-white transition-all">
                <span className="material-symbols-outlined">chevron_left</span>
              </button>
              <button className="w-12 h-12 rounded-full flex items-center justify-center border border-outline-variant text-secondary hover:bg-secondary hover:text-white transition-all">
                <span className="material-symbols-outlined">chevron_right</span>
              </button>
            </div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-gutter w-full">
            {[
              { icon: 'location_on', title: 'Locate Barangay Hall', desc: 'Find the nearest barangay office and get directions for in-person assistance and document processing.', btn: 'Get Directions', action: () => window.open('https://www.google.com/maps/search/?api=1&query=467+Tandang+Sora+Ave+Quezon+City', '_blank', 'noopener,noreferrer') },
              { icon: 'dashboard', title: 'View My Dashboard', desc: 'Access your personalized portal to manage reports, view notifications, and update your resident profile.', btn: 'Open Dashboard', action: () => void handleDashboardClick() },
              { icon: 'track_changes', title: 'Track My Case', desc: 'Monitor the status of filed reports from investigation through to final resolution.', btn: 'Track Status', action: () => navigate('/track-cases') },
              { icon: 'cloud_upload', title: 'Digital Evidence Vault', desc: 'Securely upload and manage digital evidence including photos and witness statements.', btn: 'Access Vault', action: () => void openGated({ user: '/user/evidence-vault', officer: '/officer/dashboard', admin: '/admin/evidence-vault', superadmin: '/superadmin/dashboard' }) },
              { icon: 'analytics', title: 'Command Center Analytics', desc: 'Access data-driven insights on neighborhood safety trends and enforcement performance.', btn: 'View Data', action: () => void openGated({ user: '/user/dashboard', officer: '/officer/dashboard', admin: '/admin/reports', superadmin: '/superadmin/dashboard' }) },
              { icon: 'help', title: 'FAQ', desc: 'Find quick answers to common questions about barangay services, safety protocols, and community guidelines.', btn: 'Browse FAQs', action: () => navigate('/faq') },
            ].map((svc, i) => (
              <div key={i} className="glass-card p-4 md:p-md rounded-2xl flex flex-col justify-between w-full border border-outline-variant/30 bg-surface-bright/50 backdrop-blur-sm shadow-sm hover:shadow-lg transition-all duration-700">
                <div>
                  <div className="w-12 h-12 md:w-14 md:h-14 bg-secondary/10 rounded-xl flex items-center justify-center mb-3 md:mb-md">
                    <span className="material-symbols-outlined service-icon text-[28px] md:text-[32px] text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>{svc.icon}</span>
                  </div>
                  <h3 className="font-headline-md text-lg md:text-xl text-primary mb-sm">{svc.title}</h3>
                  <p className="font-body-md text-body-md text-on-surface-variant mb-4 md:mb-lg">{svc.desc}</p>
                </div>
                <button className="w-full py-sm border border-secondary text-secondary rounded-lg font-label-md text-label-md flex items-center justify-center gap-sm hover:bg-secondary/5 transition-all" type="button" onClick={() => svc.action()}>{svc.btn}</button>
              </div>
            ))}
          </div>
          </div>
        </section>

        <section ref={(el) => { sectionRefs.current[0] = el; }} className="px-4 md:px-margin-desktop py-8 md:py-xl w-full opacity-0 translate-y-10 transition-all duration-700">
          <div className="qc-services-banner rounded-[2.5rem] overflow-hidden shadow-2xl flex flex-col lg:flex-row items-stretch w-full max-w-7xl mx-auto bg-on-background relative">
            <div className="absolute -right-20 -top-20 w-64 h-64 bg-secondary rounded-full blur-[100px] opacity-20"></div>
            <div className="flex-1 p-6 md:p-lg flex flex-col justify-center items-center text-center w-full relative z-10">
              <div className="flex items-center gap-sm mb-3 md:mb-md">
                <div className="w-10 h-10 bg-white/10 rounded-lg flex items-center justify-center backdrop-blur-md">
                  <span className="material-symbols-outlined text-secondary-fixed-dim text-[20px]">devices</span>
                </div>
                <span className="text-on-primary-container font-label-md text-xs uppercase tracking-widest">Innovation Hub</span>
              </div>
              <h2 className="font-headline-lg text-2xl md:text-[28px] text-surface-bright mb-3 md:mb-md">Tactical Command Integration</h2>
              <p className="font-body-lg text-base text-on-primary-container leading-relaxed mb-6 md:mb-lg">Our system bridges the gap between citizens and the Barangay Public Safety Officers (BPSO), providing a unified dashboard for localized enforcement and incident management.</p>
              <div className="flex flex-col sm:flex-row gap-3 md:gap-md justify-center w-full md:w-auto">
                <Link className="inline-flex items-center justify-center gap-sm bg-white text-primary px-lg py-3 rounded-xl font-bold hover:scale-105 transition-transform" to="#">Access Officer Portal <span className="material-symbols-outlined">admin_panel_settings</span></Link>
                <Link className="inline-flex items-center justify-center gap-sm text-surface-bright border border-white/20 px-lg py-3 rounded-xl font-label-md text-label-md hover:bg-white/5 transition-colors" to="#">System Documentation</Link>
              </div>
            </div>
            <div className="flex-1 min-h-[200px] md:min-h-[300px] relative w-full overflow-hidden">
              <img alt="Strategic Center" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDkcLNbdIOG1fgeA-oIU1EIimyYi7WCwgPv49mAXiValBiQsiSXda6sCzLTVBVlOxPzQpq0-eU8UlvxLGFd_YfokLyOZ6PMoTD7jOWi6_taX0EMIzD4z3qRmAigTSiA3AVccVVU_O08Q_u4s7uYWj3GBazw2ZNTgiU_7Pxkv7yMh0pQENPa3AdvErwXRAu15OSaDUqc5mVekrmA4sm149Vucts48v7bAhX_iiSHe3NBwSC0EZJSFZt7" />
              <div className="absolute inset-0 bg-gradient-to-t lg:bg-gradient-to-r from-on-background via-transparent to-transparent"></div>
            </div>
          </div>
        </section>

        <section ref={(el) => { sectionRefs.current[1] = el; }} className="py-8 md:py-xl px-4 md:px-margin-desktop bg-surface-container-low/30 w-full flex flex-col opacity-0 translate-y-10 transition-all duration-700">
          <div className="max-w-3xl mx-auto text-center mb-6 md:mb-lg w-full">
            <h2 className="font-headline-lg text-2xl md:text-[28px] text-primary mb-sm">Frequently Asked Questions</h2>
            <div className="w-24 h-1.5 bg-secondary mx-auto rounded-full mb-3 md:mb-md"></div>
            <p className="font-body-md text-body-md text-on-surface-variant">Quick answers to common service inquiries from the Culiat community.</p>
          </div>
          <div className="max-w-4xl mx-auto grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-md w-full">
            <div className="p-5 md:p-lg bg-surface-bright rounded-2xl border border-outline-variant/30 hover:shadow-lg transition-shadow">
              <h4 className="font-label-md text-label-md text-secondary mb-xs uppercase tracking-wider">Processing Time</h4>
              <p className="font-body-md text-body-md text-on-surface font-semibold mb-sm">How long does a Barangay Clearance take?</p>
              <p className="font-body-md text-body-md text-on-surface-variant">Usually processed within 24-48 hours via our digital portal.</p>
            </div>
            <div className="p-5 md:p-lg bg-surface-bright rounded-2xl border border-outline-variant/30 hover:shadow-lg transition-shadow">
              <h4 className="font-label-md text-label-md text-secondary mb-xs uppercase tracking-wider">Service Availability</h4>
              <p className="font-body-md text-body-md text-on-surface font-semibold mb-sm">Is the health center open on weekends?</p>
              <p className="font-body-md text-body-md text-on-surface-variant">The health center is open Mon-Fri, but emergency triage is 24/7.</p>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />

            <div className={`fixed inset-0 z-[300] ${modalOpen ? '' : 'hidden'} flex items-center justify-center p-4 md:p-lg`}>
        <div className="absolute inset-0 bg-primary-container/60 backdrop-blur-sm" onClick={() => setModalOpen(false)}></div>
        <div className="relative bg-surface w-full max-w-5xl max-h-[90vh] overflow-hidden rounded-2xl shadow-2xl border border-outline-variant/30 flex flex-col">
          <div className="bg-surface-container-low px-4 py-3 md:px-6 md:py-4 flex justify-between items-center shrink-0 border-b border-outline-variant/30 z-20">
            <div className="flex items-center gap-3">
              <span className="material-symbols-outlined text-secondary">verified_user</span>
              <div>
                <h2 className="font-headline-md text-on-surface text-lg md:text-xl">File an Incident Report</h2>
                <p className="text-on-surface-variant text-xs opacity-80">Barangay Culiat Safety Portal</p>
              </div>
            </div>
            <button className="text-on-surface-variant hover:text-on-surface p-2 bg-surface-container-high hover:bg-surface-container-highest rounded-full transition-colors" onClick={() => setModalOpen(false)}>
              <span className="material-symbols-outlined text-2xl">close</span>
            </button>
          </div>
          <div className="flex-1 min-h-0 flex flex-col">
            <ReportIncident className="rounded-none border-0" />
          </div>
        </div>
      </div>

      {toast && <Toast type={toast.type} message={toast.message} onClose={() => setToast(null)} />}
    </div>
  );
}
