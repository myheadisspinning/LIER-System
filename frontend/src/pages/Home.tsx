import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import type { User } from '@supabase/supabase-js';
import { supabase } from '../supabaseClient';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
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

const feedItems = [
  { icon: 'notifications_active', iconBg: 'bg-amber-100', iconColor: 'text-amber-600', title: 'Noise complaint resolved', location: 'Tandang Sora Ave', time: '2 min ago', status: 'Resolved', statusBg: 'bg-emerald-100 text-emerald-700' },
  { icon: 'local_police', iconBg: 'bg-blue-100', iconColor: 'text-blue-600', title: 'Suspicious activity reported', location: 'Blk 3, Lot 12', time: '5 min ago', status: 'Dispatched', statusBg: 'bg-blue-100 text-blue-700' },
  { icon: 'lightbulb', iconBg: 'bg-orange-100', iconColor: 'text-orange-600', title: 'Street light outage', location: 'Corner Main St', time: '8 min ago', status: 'Investigating', statusBg: 'bg-orange-100 text-orange-700' },
  { icon: 'directions_car', iconBg: 'bg-red-100', iconColor: 'text-red-600', title: 'Minor vehicle accident', location: 'QC Highway', time: '12 min ago', status: 'Resolved', statusBg: 'bg-emerald-100 text-emerald-700' },
  { icon: 'pets', iconBg: 'bg-purple-100', iconColor: 'text-purple-600', title: 'Lost pet reported', location: 'Phase 2, Block 7', time: '15 min ago', status: 'Open', statusBg: 'bg-gray-100 text-gray-600' },
  { icon: 'water_drop', iconBg: 'bg-cyan-100', iconColor: 'text-cyan-600', title: 'Water leak reported', location: 'Blk 5, Lot 8', time: '18 min ago', status: 'Dispatched', statusBg: 'bg-blue-100 text-blue-700' },
  { icon: 'groups', iconBg: 'bg-green-100', iconColor: 'text-green-600', title: 'Community patrol completed', location: 'Zone 3 perimeter', time: '22 min ago', status: 'Resolved', statusBg: 'bg-emerald-100 text-emerald-700' },
];

function LiveActivityFeed() {
  const [visibleCount, setVisibleCount] = useState(0);
  const [items, setItems] = useState(feedItems.slice(0, 5));

  useEffect(() => {
    const initialTimer = setTimeout(() => setVisibleCount(5), 300);
    return () => clearTimeout(initialTimer);
  }, []);

  useEffect(() => {
    if (visibleCount < 5) return;
    const interval = setInterval(() => {
      setItems((prev) => {
        const nextIdx = (feedItems.indexOf(prev[0]) + 1) % feedItems.length;
        const newFirst = { ...feedItems[nextIdx], time: 'just now' };
        return [newFirst, ...prev.slice(0, 4)];
      });
      setVisibleCount(0);
      setTimeout(() => setVisibleCount(5), 100);
    }, 4000);
    return () => clearInterval(interval);
  }, [visibleCount]);

  return (
    <div className="bg-white p-6 md:p-lg rounded-3xl shadow-xl border border-outline-variant transition-transform hover:scale-[1.01]">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-lg gap-sm">
        <h3 className="font-headline-lg text-xl md:text-headline-lg text-on-surface">Live Activity Feed</h3>
        <span className="inline-flex items-center gap-1.5 text-xs font-bold bg-emerald-100 text-emerald-700 px-3 py-1 rounded-full self-start">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          LIVE
        </span>
      </div>
      <div className="space-y-3 overflow-hidden h-[340px] md:h-[380px]">
        {items.map((item, i) => (
          <div
            key={`${item.title}-${i}-${items.indexOf(item)}`}
            className="flex items-center gap-3 p-3 rounded-xl bg-surface-container-lowest border border-outline-variant/30 transition-all duration-500"
            style={{ opacity: i < visibleCount ? 1 : 0, transform: i < visibleCount ? 'translateY(0)' : 'translateY(12px)' }}
          >
            <div className={`w-10 h-10 rounded-lg ${item.iconBg} ${item.iconColor} flex items-center justify-center shrink-0`}>
              <span className="material-symbols-outlined text-xl">{item.icon}</span>
            </div>
            <div className="flex-1 min-w-0">
              <p className="font-label-md text-sm font-semibold text-on-surface truncate">{item.title}</p>
              <p className="text-xs text-on-surface-variant truncate">{item.location}</p>
            </div>
            <div className="text-right shrink-0">
              <span className={`inline-block text-[10px] font-bold px-2 py-0.5 rounded-full ${item.statusBg}`}>{item.status}</span>
              <p className="text-[10px] text-on-surface-variant mt-0.5">{item.time}</p>
            </div>
          </div>
        ))}
      </div>
    </div>
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
              { icon: 'report_problem', title: 'Report an Incident', desc: 'Submit detailed reports for security concerns in your area.', hoverBorder: 'hover:border-secondary', img: '/image/culiat-brgy.jpg' },
              { icon: 'call', title: 'Emergency Hotline', desc: 'Quick access to local police, fire department, and medical EMS.', hoverBorder: 'hover:border-error', img: '/image/tandangsora.jfif' },
              { icon: 'local_police', title: 'Police Assistance', desc: 'Request non-emergency patrol or police presence in your zone.', hoverBorder: 'hover:border-secondary', img: '/image/barangayhalltandangsora.jfif' },
              { icon: 'forum', title: 'Contact Barangay', desc: 'Direct messaging line to Barangay officials and safety officers.', hoverBorder: 'hover:border-secondary', img: '/image/tandangsorashrine.jpg' },
            ].map((svc, i) => (
              <div key={i} className={`group bg-surface rounded-2xl border border-outline-variant overflow-hidden ${svc.hoverBorder} hover:shadow-xl transition-all cursor-pointer touch-manipulation hover:-translate-y-2`} data-section="services">
                <div className="h-32 overflow-hidden">
                  <img alt={svc.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-500" src={svc.img} />
                </div>
                <div className="p-lg">
                  <div className="w-12 h-12 rounded-xl bg-secondary/10 flex items-center justify-center text-secondary mb-sm group-hover:bg-secondary group-hover:text-white transition-colors duration-300">
                    <span className="material-symbols-outlined text-2xl">{svc.icon}</span>
                  </div>
                  <h3 className="font-headline-md text-lg md:text-headline-md mb-xs text-on-surface">{svc.title}</h3>
                  <p className="font-body-md text-on-surface-variant text-sm">{svc.desc}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={(el) => { sectionRefs.current[3] = el; }} className="py-xl opacity-0 translate-y-10 transition-all duration-700">
        <div className="container mx-auto px-4 md:px-margin-desktop">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-xl items-center">
            <div data-section="highlights">
              <LiveActivityFeed />
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
              { title: "Elders' Guide: Navigating the Portal", desc: 'A step-by-step guide for our seniors on how to use digital tools to report incidents and access services safely.', btn: 'View Guide', link: '/elder-guide', img: '/image/culiat-brgy.jpg' },
              { title: 'Public Safety & Protocols', desc: 'Learn the official procedures for reporting emergencies and how to coordinate with our public safety officers during critical incidents.', btn: 'Learn More', link: '/services', img: '/image/tandangsora.jfif' },
              { title: 'Building a Resilient Community', desc: 'Discover community initiatives, neighborhood watch programs, and best practices for maintaining a safe environment.', btn: 'Get Involved', link: '/contact', img: '/image/tandangsorashrine.jpg' },
            ].map((guide, i) => (
              <div key={i} className="bg-surface-container-low rounded-2xl border border-outline-variant/30 flex flex-col overflow-hidden hover:shadow-2xl hover:-translate-y-2 transition-all" data-section="guides">
                <div className="h-44 overflow-hidden">
                  <img alt={guide.title} className="w-full h-full object-cover hover:scale-110 transition-transform duration-500" src={guide.img} />
                </div>
                <div className="p-6 md:p-lg flex flex-col flex-grow">
                  <h3 className="font-headline-md text-lg md:text-headline-md text-on-surface mb-sm">{guide.title}</h3>
                  <p className="font-body-md text-on-surface-variant mb-lg flex-grow">{guide.desc}</p>
                  <Link to={guide.link} className="w-full py-3 border border-secondary text-secondary font-label-md rounded-lg hover:bg-secondary hover:text-white transition-all text-center inline-block">{guide.btn}</Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section ref={(el) => { sectionRefs.current[6] = el; }} className="py-xl bg-surface-container-lowest opacity-0 translate-y-10 transition-all duration-700">
        <div className="container mx-auto px-4 md:px-margin-desktop">
          <div className="text-center mb-xl" data-section="hotlines">
            <h2 className="font-headline-lg text-2xl md:text-headline-lg text-on-surface mb-base">Emergency Hotlines</h2>
            <p className="font-body-md md:font-body-lg text-on-surface-variant max-w-2xl mx-auto px-4">Save these numbers for quick access during emergencies. Our responders are ready to assist 24/7.</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-gutter">
            <div className="bg-white p-lg rounded-2xl border-l-4 border-l-secondary shadow-md hover:shadow-xl hover:-translate-y-1 transition-all" data-section="hotlines">
              <div className="flex items-center gap-md mb-md">
                <div className="w-14 h-14 rounded-xl bg-secondary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-secondary text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>local_police</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-lg text-on-surface">Barangay Hotline</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-green-100 text-green-700 text-xs font-bold">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse mr-1"></span> 24/7 Active
                  </span>
                </div>
              </div>
              <p className="font-body-md text-on-surface font-bold text-lg mb-xs">0962-582-1531</p>
              <p className="font-body-sm text-on-surface-variant">Landline: 856-722-60</p>
            </div>
            <div className="bg-white p-lg rounded-2xl border-l-4 border-l-error shadow-md hover:shadow-xl hover:-translate-y-1 transition-all" data-section="hotlines">
              <div className="flex items-center gap-md mb-md">
                <div className="w-14 h-14 rounded-xl bg-error/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-error text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>emergency</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-lg text-on-surface">PNP Helpline</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-100 text-red-700 text-xs font-bold">Nationwide</span>
                </div>
              </div>
              <p className="font-body-md text-on-surface font-bold text-lg mb-xs">911</p>
              <p className="font-body-sm text-on-surface-variant">Philippine National Police</p>
            </div>
            <div className="bg-white p-lg rounded-2xl border-l-4 border-l-tertiary shadow-md hover:shadow-xl hover:-translate-y-1 transition-all" data-section="hotlines">
              <div className="flex items-center gap-md mb-md">
                <div className="w-14 h-14 rounded-xl bg-tertiary/10 flex items-center justify-center">
                  <span className="material-symbols-outlined text-tertiary text-3xl" style={{ fontVariationSettings: '"FILL" 1' }}>apartment</span>
                </div>
                <div>
                  <h3 className="font-headline-md text-lg text-on-surface">QC Emergency</h3>
                  <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 text-xs font-bold">Quezon City</span>
                </div>
              </div>
              <p className="font-body-md text-on-surface font-bold text-lg mb-xs">122</p>
              <p className="font-body-sm text-on-surface-variant">Quezon City Emergency Hotline</p>
            </div>
          </div>
        </div>
      </section>

      <SiteFooter />

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
