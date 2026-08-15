import { useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';


export default function ElderGuide() {
  const observerRef = useRef<IntersectionObserver | null>(null);

  useEffect(() => {
    observerRef.current = new IntersectionObserver(
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
    document.querySelectorAll('section > div').forEach((el) => {
      el.classList.add('transition-all', 'duration-1000', 'opacity-0', 'translate-y-10');
      observerRef.current?.observe(el);
    });
    return () => observerRef.current?.disconnect();
  }, []);

  return (
    <div className="bg-background text-on-surface font-body-md flex flex-col min-h-screen">
      <SiteHeader active="/services" />

      <main className="flex-grow pt-24 pb-24 md:pb-12">
        <section className="relative overflow-hidden px-margin-mobile md:px-margin-desktop py-lg md:py-xl">
          <div className="relative z-10 max-w-6xl mx-auto text-center md:text-left flex flex-col md:flex-row items-center gap-10 lg:gap-20">
            <div className="flex-1">
              <span className="text-secondary font-bold tracking-widest uppercase text-sm mb-4 block">Official Elders' Portal</span>
              <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-6 leading-tight">Senior Safety Guide: <br /><span className="text-secondary">Barangay Culiat</span></h1>
              <p className="text-body-lg text-on-surface-variant mb-8 max-w-2xl">A dedicated resource for our elders in Barangay Culiat. We are committed to providing a secure environment, continuing the legacy of community service through easy-to-use digital tools and local support.</p>
              <div className="flex flex-wrap gap-4 justify-center md:justify-start">
                <button className="bg-secondary text-white font-bold py-4 px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-lg">
                  <span className="material-symbols-outlined">shield_person</span> Get Started
                </button>
                <button className="bg-surface-container-high border-2 border-outline-variant text-on-surface font-bold py-4 px-8 rounded-2xl hover:bg-surface-container-highest transition-all text-lg">
                  Watch Video Guide
                </button>
              </div>
            </div>
            <div className="w-full md:w-[450px] lg:w-[500px] h-[400px] md:h-[550px] rounded-3xl overflow-hidden shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
              <img alt="Barangay Culiat Multi-Purpose Building" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOuaOVfGLdIoqizxl6nq6Wr9lPfKhdSePaTl-PbKXbzgU2ng0OHP8uyyROuyX0XMWwVsCm0Rg5mZHK-AMvByul05Fom4cYvY7LPqbOWyNdH-tJw-fw8RF3FPYexcgS-pck82g9-F_yL425GrQv-tSGB8ogWvJxhzW4rG0uUR8pSnCvl0AZZE9PsLbDvL8XGWLpoDb5649GXhpIrxc-Oyc6WIhzZOoqXD7_tpGtPl8WB7UPz0Hvi1o7llIBPTyqRxhJHw" />
            </div>
          </div>
        </section>

        <section className="px-margin-mobile md:px-margin-desktop py-lg md:py-xl bg-surface-container-low/50">
          <div className="max-w-6xl mx-auto">
            <div className="text-center mb-16">
              <span className="text-secondary font-bold tracking-widest uppercase text-sm mb-2 block">Quick Action</span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">How to Report an Incident</h2>
              <p className="text-on-surface-variant max-w-xl mx-auto">Simple steps to get help when you need it most. Our system is designed for clarity and speed for all Barangay Culiat residents.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-gutter">
              {[
                { icon: 'touch_app', color: 'text-error', bg: 'bg-error/10', title: '1. Press the Help Button', desc: 'Locate the large red button on your screen or the physical alarm in your area.' },
                { icon: 'record_voice_over', color: 'text-secondary', bg: 'bg-secondary/10', title: '2. Describe the Situation', desc: 'Speak clearly or type a simple message. Tell us what\'s happening and where you are.' },
                { icon: 'emergency_share', color: 'text-on-tertiary-container', bg: 'bg-on-tertiary-container/10', title: '3. Help is on the way', desc: 'Stay calm and remain where you are. Our nearest response unit is already moving to you.' },
              ].map((step, i) => (
                <div key={i} className="glass-card p-10 rounded-3xl flex flex-col items-center text-center shadow-sm hover:shadow-xl transition-all group bg-white/50 backdrop-blur-sm">
                  <div className={`w-24 h-24 rounded-full ${step.bg} ${step.color} flex items-center justify-center mb-8 group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined text-6xl" style={{ fontVariationSettings: '"FILL" 1' }}>{step.icon}</span>
                  </div>
                  <h3 className="text-headline-md font-bold mb-4">{step.title}</h3>
                  <p className="text-on-surface-variant text-body-lg">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-margin-mobile md:px-margin-desktop py-lg md:py-xl">
          <div className="max-w-6xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-12 gap-6">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Community Safety Tips</h2>
                <p className="text-on-surface-variant">Advice from your neighbors and the Culiat local council.</p>
              </div>
              <button className="text-secondary font-bold flex items-center gap-2 hover:translate-x-2 transition-transform">
                View All Tips <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                { img: 'AB6AXuCNPoPcdpi8Ea3FuDPOI32GyMcBWuzcrNQyFfYacIU1D_4t0DPqA_0zj5-KxVRD7MS1JcyZjD05mi7L_f_-iHPv4T9Wf8hxNy-z_UVIoxLF2u1qc434pOSfvl2tz9b7-nQpTmFLRoRc8BpiLL4RI90kRBzWJh4Gw3gd5I7YqsiScfbT02RQ7bVRIiVtf7F_wVmC6VsmEHr8vPQN_3ZC6COlnITSV_aM7WxZjq87nNHQIVCbHhZquo5g', title: 'Keep Emergency Numbers Handy', desc: 'Post the local hotline near your phone or save it on speed dial for immediate assistance.' },
                { img: 'AB6AXuDPAY0OFwyno3pvW-WOXDWIT3fSA_GnDaLZC1qQNqXtfEAMMRcUA3zEPtGUIbWRheE8XMjqDLQmfoyO1ktob4EXPJXQVvXJk_EpQ57Lf00j-Voe37YWEUb4thtg-EWx6i7_uunxq_hFbZKFJcU1FBHZk6ON61L7aJifNIoPtNJjByK0vE7nLg0AcMYd1PzjY6-wzQMSkmpoZCjFyBysiC2wS1fEAzD0JWzLm3_6SEY1Qpsh1Nx3LOu8', title: 'Be Aware of Scams', desc: 'Never give out your personal information over the phone to strangers claiming to be from the government.' },
                { img: 'AB6AXuAX4sMImZZCZgf8WSncQ3zNMt2xuTDDg8fkZq4cCXKgGOdtSxBeMfHW5zVZQ4x5rvlAv2_97x4_NK0FuKT3-JcZ3-f0o0M-QlLLzWmrvzF39wfVE_ax17nkLhgsTcswXkCdIM42Llauhs02CwaeqMStXIm57dyUdNgJMpkRsUk789WTVOuWTzfosfdEZWkW2cdVGcuzin94luKIPt0RbcphEOtW0Vsiq7LpK3alKRYiMszyFpE4HtJw', title: 'Stay Connected', desc: 'Join our local \'Bantay Senior\' group to keep each other informed and looked after by the community.' },
              ].map((tip, i) => (
                <div key={i} className="group bg-surface-container-lowest border border-outline-variant/50 p-3 rounded-[2.5rem] hover:border-secondary transition-all hover:shadow-lg">
                  <div className="h-56 rounded-[2rem] overflow-hidden mb-6">
                    <img alt={tip.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={`https://lh3.googleusercontent.com/aida-public/${tip.img}`} />
                  </div>
                  <div className="p-6">
                    <h4 className="text-headline-md font-bold mb-3">{tip.title}</h4>
                    <p className="text-on-surface-variant leading-relaxed">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-margin-mobile md:px-margin-desktop py-lg md:py-xl">
          <div className="max-w-6xl mx-auto bg-primary-container text-on-primary rounded-[3.5rem] overflow-hidden flex flex-col md:flex-row shadow-2xl">
            <div className="flex-1 p-12 md:p-20 relative z-10">
              <span className="bg-secondary/20 text-secondary px-6 py-2 rounded-full text-sm font-bold mb-8 inline-block">Learning Support</span>
              <h2 className="text-display-lg-mobile md:text-headline-lg font-bold mb-8">Need help using this website?</h2>
              <p className="text-on-primary-container/80 text-body-lg mb-12 leading-relaxed">We want to ensure everyone in Barangay Culiat can use our safety portal. If you find the digital tools confusing, we have dedicated staff ready to assist you in person.</p>
              <div className="space-y-8">
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-secondary/20">
                    <span className="material-symbols-outlined text-white text-3xl">location_on</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-2xl mb-1 text-white">Visit the Barangay Hall</h4>
                    <p className="text-on-primary-container/70 text-lg">Free tutorials every Wednesday from 9:00 AM to 12:00 PM.</p>
                  </div>
                </div>
                <div className="flex items-start gap-6">
                  <div className="w-14 h-14 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-secondary/20">
                    <span className="material-symbols-outlined text-white text-3xl">support_agent</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-2xl mb-1 text-white">Call our Digital Help Desk</h4>
                    <p className="text-on-primary-container/70 text-lg">Direct support line: (02) 8922-8224 (Public Safety Office).</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-[40%] relative min-h-[350px]">
              <img alt="Helpful staff at the Barangay Culiat Hall." className="w-full h-full object-cover" src="/image/culiat-brgy.jpg" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-container via-transparent to-transparent md:bg-gradient-to-l"></div>
            </div>
          </div>
        </section>
      </main>

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
          <div className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-secondary hover:text-white transition-all cursor-pointer"><span className="material-symbols-outlined">public</span></div>
          <div className="w-10 h-10 rounded-full border border-outline-variant flex items-center justify-center text-on-surface-variant hover:bg-secondary hover:text-white transition-all cursor-pointer"><span className="material-symbols-outlined">share</span></div>
        </div>
      </footer>
    </div>
  );
}
