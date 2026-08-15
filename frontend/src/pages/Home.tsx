import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import SiteHeader from '../components/SiteHeader';
import ConfirmDialog from '../components/ConfirmDialog';
import LoadingScreen from '../components/LoadingScreen';
import styles from '../styles/modules/Home.module.css';

function CountUp({ target, suffix = '', duration = 2000 }: { target: number; suffix?: string; duration?: number }) {
  const [count, setCount] = useState(0);
  const ref = useRef<HTMLSpanElement>(null);
  const counted = useRef(false);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !counted.current) {
          counted.current = true;
          const stepTime = Math.max(10, Math.floor(duration / (target / 50)));
          let current = 0;
          const timer = setInterval(() => {
            current += Math.ceil(target / 50);
            if (current >= target) {
              setCount(target);
              clearInterval(timer);
            } else {
              setCount(current);
            }
          }, stepTime);
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [target, duration]);

  return (
    <span ref={ref} className="font-display-lg text-2xl md:text-display-lg text-on-surface">
      {count.toLocaleString()}{suffix}
    </span>
  );
}

export default function Home() {
  const navigate = useNavigate();
  const observerRef = useRef<IntersectionObserver | null>(null);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);
  const [user, setUser] = useState<User | null>(null);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [opening, setOpening] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });
    return () => sub.subscription.unsubscribe();
  }, []);

  const handleReportIncident = () => {
    if (!user) {
      setConfirmOpen(true);
      return;
    }
    setOpening(true);
    setTimeout(() => navigate('/services', { state: { openIncident: true } }), 1500);
  };

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            if (entry.target.classList.contains('count-up')) {
              // handled by CountUp component
            }
            const bars = entry.target.querySelectorAll<HTMLElement>('[data-height]');
            bars.forEach((bar) => {
              bar.style.height = bar.getAttribute('data-height') || '0%';
            });
          }
        });
      },
      { threshold: 0.1, rootMargin: '0px 0px -50px 0px' }
    );

    document.querySelectorAll('[data-section]').forEach((el) => observerRef.current?.observe(el));
    return () => observerRef.current?.disconnect();
  }, []);

  useEffect(() => {
    document.querySelectorAll('.grid').forEach((grid) => {
      Array.from(grid.children).forEach((item, index) => {
        if (item.classList.contains('reveal')) {
          (item as HTMLElement).style.transitionDelay = `${index * 100}ms`;
        }
      });
    });
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
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
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-background text-on-surface font-body-md overflow-x-hidden">
      <SiteHeader active="/" />

      <header className="relative min-h-[90vh] md:min-h-screen pt-16 flex items-center overflow-hidden">
        <div className="absolute inset-0 z-0">
          <img alt="Barangay Culiat Hall" className="w-full h-full object-cover object-center" src="/image/culiat-brgy.jpg" />
          <div className={styles.heroOverlay}></div>
          <div className="absolute inset-0 hero-overlay"></div>
        </div>
        <div className="container mx-auto px-4 md:px-margin-desktop grid grid-cols-1 lg:grid-cols-2 gap-xl relative z-10 py-xl">
          <div ref={(el) => { sectionRefs.current[0] = el; }} className="flex flex-col justify-center items-center lg:items-start text-center lg:text-center space-y-md opacity-0 translate-y-10 transition-all duration-700" data-section="hero">
            <div className="inline-flex items-center gap-sm bg-secondary-container/30 backdrop-blur-md px-md py-xs rounded-full border border-secondary-fixed/30 mb-sm">
              <span className="w-2 h-2 rounded-full bg-secondary-fixed-dim animate-pulse"></span>
              <span className="text-white font-label-md text-xs md:text-label-md tracking-wider uppercase font-bold">Tactical Command Center</span>
            </div>
            <h1 className="font-display-lg text-3xl md:text-5xl lg:text-display-lg text-white text-center md:text-left leading-tight drop-shadow-lg">
              <span className="text-tertiary-fixed-dim">Law Enforcement</span> and Incident Reporting System
            </h1>
            <p className="font-body-md md:font-body-lg text-body-md md:text-body-lg text-surface-container-low/90 text-center md:text-left max-w-ml">
              AI-Assisted Dispatch, Case Tracking, and Evidence Management for Barangay Culiat, Quezon City. Ensuring a safer community through transparent and efficient technology.
            </p>
            <div className="flex flex-col sm:flex-row items-center gap-md pt-base w-full">
              <button
                className="relative overflow-hidden w-full sm:w-auto px-lg md:px-xl py-4 gold-gradient text-on-tertiary-fixed font-headline-md text-lg rounded-2xl shadow-xl hover:scale-105 hover:shadow-2xl transition-all flex items-center justify-center gap-sm active:scale-95 touch-manipulation group"
                onClick={handleReportIncident}
              >
                <div className="absolute inset-0 shimmer-effect opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <span className="material-symbols-outlined relative z-10">campaign</span>
                <span className="relative z-10">Report an Incident</span>
              </button>
              <div className="w-full sm:w-auto glass-card rounded-2xl p-sm flex items-center gap-sm border border-white/10 hover:bg-white/10 transition-colors">
                <div className="w-12 h-12 rounded-xl bg-white/5 flex items-center justify-center overflow-hidden">
                  <span className="material-symbols-outlined text-secondary-fixed-dim text-2xl">monitoring</span>
                </div>
                <div className="text-left">
                  <p className="text-xs font-bold text-secondary-fixed-dim">System Uptime: 99.9%</p>
                  <p className="text-[10px] text-surface-container-low/60 italic">Encrypted Secure Line 0x24A</p>
                </div>
              </div>
            </div>
          </div>
          <div className="hidden lg:flex items-center justify-center relative" data-section="hero">
            <div className="relative w-64 md:w-72 aspect-square rounded-full p-5 md:p-6 glass-card border-2 border-secondary-fixed-dim/40 shadow-2xl flex items-center justify-center backdrop-blur-md transition-all duration-500 group hover:scale-105 hover:border-secondary-fixed-dim/70 hover:shadow-[0_0_40px_rgba(180,197,255,0.35)]">
              <div className="absolute -inset-3 rounded-full bg-secondary-fixed-dim/10 blur-2xl pointer-events-none"></div>
              <img src="/image/culiat-logo.png" alt="Barangay Culiat Logo" className="w-full h-full object-contain drop-shadow-lg" />
            </div>
          </div>
        </div>
      </header>

      <section ref={(el) => { sectionRefs.current[1] = el; }} className="py-md md:py-xl -mt-8 md:-mt-xl relative z-20 opacity-0 translate-y-10 transition-all duration-700">
        <div className="container mx-auto px-4 md:px-margin-desktop grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-gutter">
          <div className="bg-white/95 backdrop-blur-md p-md md:p-lg rounded-2xl shadow-xl flex flex-col items-center text-center space-y-xs md:space-y-sm border border-outline-variant/20 transition-all hover:-translate-y-2 hover:shadow-2xl" data-section="stats">
            <span className="material-symbols-outlined text-secondary text-2xl md:text-4xl" style={{ fontVariationSettings: '"FILL" 1' }}>assignment</span>
            <CountUp target={2450} suffix="+" />
            <span className="font-label-md text-[10px] md:text-label-md text-on-surface-variant uppercase tracking-wider">Total Incidents</span>
          </div>
          <div className="bg-white/95 backdrop-blur-md p-md md:p-lg rounded-2xl shadow-xl flex flex-col items-center text-center space-y-xs md:space-y-sm border-l-4 border-l-error border-y border-r border-outline-variant/20 transition-all hover:-translate-y-2 hover:shadow-2xl" data-section="stats">
            <span className="material-symbols-outlined text-error text-2xl md:text-4xl" style={{ fontVariationSettings: '"FILL" 1' }}>warning</span>
            <CountUp target={124} />
            <span className="font-label-md text-[10px] md:text-label-md text-on-surface-variant uppercase tracking-wider">Active Cases</span>
          </div>
          <div className="bg-white/95 backdrop-blur-md p-md md:p-lg rounded-2xl shadow-xl flex flex-col items-center text-center space-y-xs md:space-y-sm border-l-4 border-l-secondary border-y border-r border-outline-variant/20 transition-all hover:-translate-y-2 hover:shadow-2xl" data-section="stats">
            <span className="material-symbols-outlined text-secondary text-2xl md:text-4xl" style={{ fontVariationSettings: '"FILL" 1' }}>check_circle</span>
            <CountUp target={2210} />
            <span className="font-label-md text-[10px] md:text-label-md text-on-surface-variant uppercase tracking-wider">Resolved Cases</span>
          </div>
          <div className="bg-white/95 backdrop-blur-md p-md md:p-lg rounded-2xl shadow-xl flex flex-col items-center text-center space-y-xs md:space-y-sm border border-outline-variant/20 transition-all hover:-translate-y-2 hover:shadow-2xl" data-section="stats">
            <span className="material-symbols-outlined text-secondary text-2xl md:text-4xl" style={{ fontVariationSettings: '"FILL" 1' }}>groups</span>
            <CountUp target={15000} suffix="+" />
            <span className="font-label-md text-[10px] md:text-label-md text-on-surface-variant uppercase tracking-wider">Registered Users</span>
          </div>
        </div>
      </section>

      <section ref={(el) => { sectionRefs.current[2] = el; }} className="py-xl bg-surface-container-low opacity-0 translate-y-10 transition-all duration-700">
        <div className="container mx-auto px-4 md:px-margin-desktop">
          <div className="text-center mb-xl" data-section="services-title">
            <h2 className="font-headline-lg text-2xl md:text-headline-lg text-on-surface mb-base">LGU Public Safety Services</h2>
            <p className="font-body-md md:font-body-lg text-on-surface-variant max-w-2xl mx-auto px-4">Access critical services and report concerns directly to our integrated law enforcement team.</p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-gutter">
            {[
              { icon: 'report_problem', title: 'Report an Incident', desc: 'Submit detailed reports for security concerns in your area.', hoverBorder: 'hover:border-secondary' },
              { icon: 'call', title: 'Emergency Hotline', desc: 'Quick access to local police, fire department, and medical EMS.', hoverBorder: 'hover:border-error' },
              { icon: 'local_police', title: 'Police Assistance', desc: 'Request non-emergency patrol or police presence in your zone.', hoverBorder: 'hover:border-secondary' },
              { icon: 'forum', title: 'Contact Barangay', desc: 'Direct messaging line to Barangay officials and safety officers.', hoverBorder: 'hover:border-secondary' },
            ].map((svc, i) => (
              <div key={i} className={`group bg-surface p-lg rounded-2xl border border-outline-variant ${svc.hoverBorder} hover:shadow-xl transition-all cursor-pointer touch-manipulation hover:-translate-y-2`} data-section="services">
                <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary mb-md group-hover:bg-secondary group-hover:text-white transition-colors duration-300">
                  <span className="material-symbols-outlined text-3xl">{svc.icon}</span>
                </div>
                <h3 className="font-headline-md text-xl md:text-headline-md mb-xs text-on-surface">{svc.title}</h3>
                <p className="font-body-md text-on-surface-variant">{svc.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={(el) => { sectionRefs.current[3] = el; }} className="py-xl opacity-0 translate-y-10 transition-all duration-700">
        <div className="container mx-auto px-4 md:px-margin-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl items-center">
            <div data-section="highlights">
              <div className="bg-white p-6 md:p-lg rounded-3xl shadow-xl border border-outline-variant transition-transform hover:scale-[1.01]">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-lg gap-sm">
                  <h3 className="font-headline-lg text-xl md:text-headline-lg text-on-surface">Recent Incident Summary</h3>
                  <span className="text-on-surface-variant font-label-md text-xs bg-surface-container-high px-md py-xs rounded-full self-start">Last 30 Days</span>
                </div>
                <div className="w-full h-64 md:h-80 bg-surface-container-lowest rounded-xl flex items-center justify-center overflow-hidden border border-outline-variant/30 relative">
                  <div className={`absolute inset-0 ${styles.chartGradient}`}></div>
                  <div className="flex flex-col items-center gap-md p-4">
                    <div className="flex gap-2 md:gap-md items-end h-40">
                      <div className="w-6 md:w-10 bg-secondary/80 rounded-t-lg transition-all duration-1000 origin-bottom" data-height="60%" style={{ height: '0%' }}></div>
                      <div className="w-6 md:w-10 bg-secondary/80 rounded-t-lg transition-all duration-1000 delay-100 origin-bottom" data-height="40%" style={{ height: '0%' }}></div>
                      <div className="w-6 md:w-10 bg-secondary/80 rounded-t-lg transition-all duration-1000 delay-200 origin-bottom" data-height="85%" style={{ height: '0%' }}></div>
                      <div className="w-6 md:w-10 bg-secondary/80 rounded-t-lg transition-all duration-1000 delay-300 origin-bottom" data-height="55%" style={{ height: '0%' }}></div>
                      <div className="w-6 md:w-10 bg-secondary/80 rounded-t-lg transition-all duration-1000 delay-400 origin-bottom" data-height="30%" style={{ height: '0%' }}></div>
                    </div>
                    <p className="text-on-surface-variant font-caption text-caption text-center">Interactive data visualization loading...</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="space-y-6 md:space-y-lg" data-section="highlights-right">
              <div className="bg-white p-6 md:p-lg rounded-3xl border-l-8 border-l-secondary shadow-lg border border-outline-variant/20 hover:shadow-xl transition-all">
                <div className="flex flex-col sm:flex-row items-start gap-md">
                  <div className="p-sm bg-secondary/10 rounded-xl text-secondary">
                    <span className="material-symbols-outlined text-3xl">psychology</span>
                  </div>
                  <div>
                    <h3 className="font-headline-md text-lg md:text-headline-md text-on-surface mb-xs">AI Dispatch Statistics</h3>
                    <p className="font-body-md text-on-surface-variant mb-md">Our AI-driven routing has reduced average response times by 35% across all sectors.</p>
                    <div className="flex items-center gap-8 md:gap-xl">
                      <div>
                        <p className="font-display-lg text-secondary text-2xl md:text-headline-lg">4.2m</p>
                        <p className="font-caption text-caption text-on-surface-variant">Avg Response</p>
                      </div>
                      <div className="h-10 w-[1px] bg-outline-variant"></div>
                      <div>
                        <p className="font-display-lg text-secondary text-2xl md:text-headline-lg">98%</p>
                        <p className="font-caption text-caption text-on-surface-variant">Accuracy</p>
                      </div>
                    </div>
                  </div>
                </div>  
              </div>
              <div className="bg-primary-container p-6 md:p-lg rounded-3xl text-white shadow-lg relative overflow-hidden group hover:shadow-2xl transition-all">
                <div className="absolute inset-0 bg-secondary opacity-0 group-hover:opacity-10 transition-opacity duration-300"></div>
                <div className="relative z-10">
                  <h4 className="font-headline-md text-lg md:text-headline-md mb-base">Command Center Visibility</h4>
                  <p className="font-body-md text-on-primary-container mb-md">Monitor live incidents and resource allocation through a unified interface.</p>
                  <button className="flex items-center gap-xs font-label-md text-tertiary-fixed-dim uppercase tracking-wider group-hover:translate-x-2 transition-transform">
                    VIEW MY DASHBOARD <span className="material-symbols-outlined">arrow_right_alt</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={(el) => { sectionRefs.current[4] = el; }} className="py-xl bg-surface-container-highest/30 opacity-0 translate-y-10 transition-all duration-700">
        <div className="container mx-auto px-4 md:px-margin-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl items-center">
            <div className="order-2 lg:order-1 text-center lg:text-left" data-section="impact">
              <div className="inline-flex items-center gap-sm bg-secondary/10 px-md py-xs rounded-full mb-md mx-auto lg:mx-0">
                <span className="material-symbols-outlined text-secondary text-sm">auto_awesome</span>
                <span className="text-secondary font-label-md text-xs tracking-wider uppercase">COMMUNITY IMPACT</span>
              </div>
              <h2 className="font-headline-lg text-2xl md:text-headline-lg text-on-surface mb-md leading-tight">Digital Dispatch: A 4-Minute Success Story</h2>
              <p className="font-body-md md:font-body-lg text-on-surface-variant mb-lg">
                Last Tuesday, our AI-assisted dispatch routed an emergency call in record time, resulting in a 4-minute response. This is how smart governance saves lives.
              </p>
              <button className="w-full sm:w-auto px-lg py-sm bg-secondary text-on-secondary font-label-md rounded-lg hover:bg-secondary-container hover:shadow-lg transition-all flex items-center justify-center gap-xs group">
                Read Full Story <span className="material-symbols-outlined group-hover:translate-x-1 transition-transform">arrow_forward</span>
              </button>
            </div>
            <div className="order-1 lg:order-2" data-section="impact">
              <div className="relative rounded-3xl overflow-hidden shadow-2xl aspect-video group">
                <img alt="Community Safety" className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700" src="frontend/public/image/image-section-culiat.jfif" />
                <div className={`absolute inset-0 bg-gradient-to-t from-on-background/80 to-transparent flex items-end p-6 ${styles.communityGradient}`}>
                  <p className="text-white font-caption text-caption italic">"The response was faster than I ever expected. Technology really made the difference." - Local Resident</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section ref={(el) => { sectionRefs.current[5] = el; }} className="py-xl bg-surface opacity-0 translate-y-10 transition-all duration-700">
        <div className="container mx-auto px-4 md:px-margin-desktop">
          <div className="text-center mb-xl" data-section="guides">
            <h2 className="font-headline-lg text-2xl md:text-headline-lg text-on-surface mb-base">Community Safety Guides</h2>
            <p className="font-body-md md:font-body-lg text-on-surface-variant max-w-2xl mx-auto px-4">Essential resources and step-by-step instructions for a safer Barangay Culiat.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-gutter">
            {[
              { title: "Elders' Guide: Navigating the Portal", desc: 'A step-by-step guide for our seniors on how to use digital tools to report incidents and access services safely.', btn: 'View Guide' },
              { title: 'Public Safety & Protocols', desc: 'Learn the official procedures for reporting emergencies and how to coordinate with our public safety officers during critical incidents.', btn: 'Learn More' },
              { title: 'Building a Resilient Community', desc: 'Discover community initiatives, neighborhood watch programs, and best practices for maintaining a safe environment.', btn: 'Get Involved' },
            ].map((guide, i) => (
              <div key={i} className="bg-surface-container-low p-6 md:p-lg rounded-2xl border border-outline-variant/30 flex flex-col h-full hover:shadow-2xl hover:-translate-y-2 transition-all" data-section="guides">
                <h3 className="font-headline-md text-lg md:text-headline-md text-on-surface mb-sm">{guide.title}</h3>
                <p className="font-body-md text-on-surface-variant mb-lg flex-grow">{guide.desc}</p>
                <button className="w-full py-3 border border-secondary text-secondary font-label-md rounded-lg hover:bg-secondary hover:text-white transition-all">{guide.btn}</button>
              </div>
            ))}
          </div>
        </div>
      </section>

      <footer className="w-full py-xl md:px-margin-desktop flex flex-col md:flex-row justify-between items-center gap-md bg-surface-container-lowest border-t border-outline-variant px-margin-desktop">
        <div className="flex flex-col gap-sm text-center md:text-left">
          <div className="flex items-center justify-center md:justify-start gap-xs">
            <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant flex items-center justify-center">
              <img alt="Barangay Culiat Logo" className="w-full h-full object-cover" src="/image/culiat-logo.png" />
            </div>
            <span className="font-headline-md text-headline-md text-primary">Barangay Culiat</span>
          </div>
          <p className="font-caption text-caption text-on-surface-variant">&copy; 2024 Barangay Culiat Law Enforcement. Public Safety &amp; Transparency Portal.</p>
        </div>
        <div className="flex flex-wrap justify-center gap-lg">
          <Link className="font-body-md text-body-md text-on-surface-variant hover:underline hover:text-primary transition-all" to="#">Privacy Policy</Link>
          <Link className="font-body-md text-body-md text-on-surface-variant hover:underline hover:text-primary transition-all" to="#">Terms of Service</Link>
          <Link className="font-body-md text-body-md text-on-surface-variant hover:underline hover:text-primary transition-all" to="#">FOI Manual</Link>
          <Link className="font-body-md text-body-md text-on-surface-variant hover:underline hover:text-primary transition-all" to="#">Accessibility</Link>
        </div>
        <div className="flex gap-md">
          <div className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-secondary hover:text-white transition-all cursor-pointer">
            <span className="material-symbols-outlined">public</span>
          </div>
          <div className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-secondary hover:text-white transition-all cursor-pointer">
            <span className="material-symbols-outlined">share</span>
          </div>
        </div>
      </footer>

      <ConfirmDialog
        open={confirmOpen}
        title="Access Restricted"
        message="You need to log in or register to file an incident report. Proceed to the login page?"
        confirmLabel="Go to Login"
        cancelLabel="Cancel"
        icon="login"
        onConfirm={() => {
          setConfirmOpen(false);
          navigate('/signin');
        }}
        onCancel={() => setConfirmOpen(false)}
      />
      {opening && <LoadingScreen message="Opening incident report..." />}
    </div>
  );
}
