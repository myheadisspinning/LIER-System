import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';


export default function ElderGuide() {
  const navigate = useNavigate();
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

      <main className="flex-grow pt-20 pb-10 md:pb-12">
        <section className="relative overflow-hidden px-margin-mobile md:px-margin-desktop py-8 md:py-xl">
          <div className="relative z-10 max-w-7xl mx-auto text-center md:text-left flex flex-col md:flex-row items-center gap-6 md:gap-10 lg:gap-12">
            <div className="flex-1">
              <span className="text-secondary font-bold tracking-widest uppercase text-sm mb-3 md:mb-4 block">Official Elders' Portal</span>
              <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-4 md:mb-6 leading-tight">Senior Safety Guide: <br /><span className="text-secondary">Barangay Culiat</span></h1>
              <p className="text-body-md text-on-surface-variant mb-6 md:mb-8 max-w-2xl">A dedicated resource for our elders in Barangay Culiat. We are committed to providing a secure environment, continuing the legacy of community service through easy-to-use digital tools and local support.</p>
              <div className="flex flex-wrap gap-3 md:gap-4 justify-center md:justify-start">
                <button onClick={() => navigate('/signin')} className="bg-secondary text-white font-bold py-3 px-6 md:px-8 rounded-2xl shadow-lg hover:shadow-xl transition-all flex items-center gap-2 text-base md:text-lg">
                  <span className="material-symbols-outlined">shield_person</span> Get Started
                </button>
                <button className="bg-surface-container-high border-2 border-outline-variant text-on-surface font-bold py-3 px-6 md:px-8 rounded-2xl hover:bg-surface-container-highest transition-all text-base md:text-lg">
                  Watch Video Guide
                </button>
              </div>
            </div>
            <div className="w-full md:w-[450px] lg:w-[500px] h-[280px] md:h-[550px] rounded-3xl overflow-hidden shadow-2xl transition-transform duration-500 hover:scale-[1.02]">
              <img alt="Barangay Culiat Multi-Purpose Building" className="w-full h-full object-cover" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAOuaOVfGLdIoqizxl6nq6Wr9lPfKhdSePaTl-PbKXbzgU2ng0OHP8uyyROuyX0XMWwVsCm0Rg5mZHK-AMvByul05Fom4cYvY7LPqbOWyNdH-tJw-fw8RF3FPYexcgS-pck82g9-F_yL425GrQv-tSGB8ogWvJxhzW4rG0uUR8pSnCvl0AZZE9PsLbDvL8XGWLpoDb5649GXhpIrxc-Oyc6WIhzZOoqXD7_tpGtPl8WB7UPz0Hvi1o7llIBPTyqRxhJHw" />
            </div>
          </div>
        </section>

        <section className="px-margin-mobile md:px-margin-desktop py-8 md:py-xl bg-surface-container-low/50">
          <div className="max-w-7xl mx-auto">
            <div className="text-center mb-8 md:mb-12">
              <span className="text-secondary font-bold tracking-widest uppercase text-sm mb-2 block">Quick Action</span>
              <h2 className="font-headline-lg text-headline-lg text-on-surface">How to Report an Incident</h2>
              <p className="text-on-surface-variant max-w-2xl mx-auto">Simple steps to get help when you need it most. Our system is designed for clarity and speed for all Barangay Culiat residents.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-gutter">
              {[
                { icon: 'touch_app', color: 'text-error', bg: 'bg-error/10', title: '1. Press the Help Button', desc: 'Locate the large red button on your screen or the physical alarm in your area.' },
                { icon: 'record_voice_over', color: 'text-secondary', bg: 'bg-secondary/10', title: '2. Describe the Situation', desc: 'Speak clearly or type a simple message. Tell us what\'s happening and where you are.' },
                { icon: 'emergency_share', color: 'text-on-tertiary-container', bg: 'bg-on-tertiary-container/10', title: '3. Help is on the way', desc: 'Stay calm and remain where you are. Our nearest response unit is already moving to you.' },
              ].map((step, i) => (
                <div key={i} className="glass-card p-6 md:p-10 rounded-3xl flex flex-col items-center text-center shadow-sm hover:shadow-xl transition-all group bg-white/50 backdrop-blur-sm">
                  <div className={`w-16 h-16 md:w-20 md:h-20 rounded-full ${step.bg} ${step.color} flex items-center justify-center mb-4 md:mb-8 group-hover:scale-110 transition-transform`}>
                    <span className="material-symbols-outlined text-4xl md:text-5xl" style={{ fontVariationSettings: '"FILL" 1' }}>{step.icon}</span>
                  </div>
                  <h3 className="text-headline-md font-bold mb-2 md:mb-4">{step.title}</h3>
                  <p className="text-on-surface-variant text-body-lg">{step.desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-margin-mobile md:px-margin-desktop py-8 md:py-xl">
          <div className="max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row justify-between items-end mb-6 md:mb-12 gap-4 md:gap-6">
              <div>
                <h2 className="font-headline-lg text-headline-lg text-on-surface">Community Safety Tips</h2>
                <p className="text-on-surface-variant">Advice from your neighbors and the Culiat local council.</p>
              </div>
              <button className="text-secondary font-bold flex items-center gap-2 hover:translate-x-2 transition-transform">
                View All Tips <span className="material-symbols-outlined">arrow_forward</span>
              </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-8">
              {[
                { img: 'AB6AXuCNPoPcdpi8Ea3FuDPOI32GyMcBWuzcrNQyFfYacIU1D_4t0DPqA_0zj5-KxVRD7MS1JcyZjD05mi7L_f_-iHPv4T9Wf8hxNy-z_UVIoxLF2u1qc434pOSfvl2tz9b7-nQpTmFLRoRc8BpiLL4RI90kRBzWJh4Gw3gd5I7YqsiScfbT02RQ7bVRIiVtf7F_wVmC6VsmEHr8vPQN_3ZC6COlnITSV_aM7WxZjq87nNHQIVCbHhZquo5g', title: 'Keep Emergency Numbers Handy', desc: 'Post the local hotline near your phone or save it on speed dial for immediate assistance.' },
                { img: 'AB6AXuDPAY0OFwyno3pvW-WOXDWIT3fSA_GnDaLZC1qQNqXtfEAMMRcUA3zEPtGUIbWRheE8XMjqDLQmfoyO1ktob4EXPJXQVvXJk_EpQ57Lf00j-Voe37YWEUb4thtg-EWx6i7_uunxq_hFbZKFJcU1FBHZk6ON61L7aJifNIoPtNJjByK0vE7nLg0AcMYd1PzjY6-wzQMSkmpoZCjFyBysiC2wS1fEAzD0JWzLm3_6SEY1Qpsh1Nx3LOu8', title: 'Be Aware of Scams', desc: 'Never give out your personal information over the phone to strangers claiming to be from the government.' },
                { img: 'AB6AXuAX4sMImZZCZgf8WSncQ3zNMt2xuTDDg8fkZq4cCXKgGOdtSxBeMfHW5zVZQ4x5rvlAv2_97x4_NK0FuKT3-JcZ3-f0o0M-QlLLzWmrvzF39wfVE_ax17nkLhgsTcswXkCdIM42Llauhs02CwaeqMStXIm57dyUdNgJMpkRsUk789WTVOuWTzfosfdEZWkW2cdVGcuzin94luKIPt0RbcphEOtW0Vsiq7LpK3alKRYiMszyFpE4HtJw', title: 'Stay Connected', desc: 'Join our local \'Bantay Senior\' group to keep each other informed and looked after by the community.' },
              ].map((tip, i) => (
                <div key={i} className="group bg-surface-container-lowest border border-outline-variant/50 p-3 rounded-[2.5rem] hover:border-secondary transition-all hover:shadow-lg">
                  <div className="h-44 md:h-56 rounded-[2rem] overflow-hidden mb-4 md:mb-6">
                    <img alt={tip.title} className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" src={`https://lh3.googleusercontent.com/aida-public/${tip.img}`} />
                  </div>
                  <div className="p-4 md:p-6">
                    <h4 className="text-headline-md font-bold mb-2 md:mb-3">{tip.title}</h4>
                    <p className="text-on-surface-variant leading-relaxed">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-margin-mobile md:px-margin-desktop py-8 md:py-xl">
          <div className="max-w-6xl mx-auto bg-primary-container text-on-primary rounded-[3.5rem] overflow-hidden flex flex-col md:flex-row shadow-2xl">
            <div className="flex-1 p-6 md:p-20 relative z-10">
              <span className="bg-secondary/20 text-secondary px-6 py-2 rounded-full text-sm font-bold mb-4 md:mb-8 inline-block">Learning Support</span>
              <h2 className="text-display-lg-mobile md:text-[28px] font-bold mb-4 md:mb-8">Need help using this website?</h2>
              <p className="text-on-primary-container/80 text-body-md mb-6 md:mb-12 leading-relaxed">We want to ensure everyone in Barangay Culiat can use our safety portal. If you find the digital tools confusing, we have dedicated staff ready to assist you in person.</p>
              <div className="space-y-6 md:space-y-8">
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-secondary/20">
                    <span className="material-symbols-outlined text-white text-2xl md:text-3xl">location_on</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-2xl mb-1 text-white">Visit the Barangay Hall</h4>
                    <p className="text-on-primary-container/70 text-lg">Free tutorials every Wednesday from 9:00 AM to 12:00 PM.</p>
                  </div>
                </div>
                <div className="flex items-start gap-4 md:gap-6">
                  <div className="w-12 h-12 md:w-14 md:h-14 rounded-2xl bg-secondary flex items-center justify-center flex-shrink-0 shadow-lg shadow-secondary/20">
                    <span className="material-symbols-outlined text-white text-2xl md:text-3xl">support_agent</span>
                  </div>
                  <div>
                    <h4 className="font-bold text-2xl mb-1 text-white">Call our Digital Help Desk</h4>
                    <p className="text-on-primary-container/70 text-lg">Direct support line: 0962-582-1531 (Barangay Hotline) or 856-722-60.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="w-full md:w-[40%] relative min-h-[240px] md:min-h-[350px]">
              <img alt="Helpful staff at the Barangay Culiat Hall." className="w-full h-full object-cover" src="/image/culiat-brgy.jpg" />
              <div className="absolute inset-0 bg-gradient-to-t from-primary-container via-transparent to-transparent md:bg-gradient-to-l"></div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
