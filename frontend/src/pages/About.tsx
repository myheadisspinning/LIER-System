import { useEffect, useRef } from 'react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';


export default function About() {
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

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
      if (el && !el.classList.contains('active')) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-background text-on-surface font-body-md selection:bg-secondary-fixed-dim selection:text-on-secondary-fixed -mt-6">
      <SiteHeader active="/about" logoAlt="Barangay Culiat Logo" />

      <div className="w-full h-2 relative z-[90] bg-cover bg-center" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCLxqqtZLoB8H8kAKno2uvkDiBWWGz49WTKAVMRQiU3iJn9z_9aXs8td9JMSokNoEd5PaoEiEmknOI7ZgfskWtnaOK4Gvq2Trr6Nf1wh-JD3_Don9GXbwwdvpfzD0i4u4ezPpi5Dz1ZNJIDOCuq1mjUgOH4nyu_h-4IwxL4eax68k9rkebNunNd-r1I9hFzZ9qcxpE-8OsAyXDtJTIVZanLrKx2ZHP4F-VAceCBwuleMpvAsRjSVYLbJnScLK54pJNEkh6U2sBLouM")' }}></div>

      <main className="pt-16 md:pt-20">
        <section className="relative min-h-[20vh] py-10 md:py-24 lg:py-32 flex items-center justify-center overflow-hidden">
          <div className="absolute inset-0 z-0">
            <div className="w-full h-full bg-cover bg-center brightness-50" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuBO9a7tgmBd3TIpjJycGCeGSUqYaTms92D67dfZ8VrKupV2w8AEhzx7g26qv_LVKaxyw90_38k6a69jjBG2Yte-RZCX-UPhYw6VgwIOwI46PSsIkIFZtZNaa7kZZTfTGjdh0-EiodRgWk_urSzUtu7xU70XuNIyVWmmmNz9FMTu6lHEIk36r8RX00mwp8ko6WHLR3K_b3LP8xk2st8xGm2JQ7PzV35lOPqY_A2gJwF-D54lBmn_-M-Rd21ImffbPhxGVg")', backgroundSize: 'cover', backgroundPosition: 'center center' }}></div>
            <div className="absolute inset-0 bg-gradient-to-t from-background via-transparent to-primary-container/40"></div>
          </div>
          <div className="relative z-10 text-center px-margin-mobile md:px-0">
            <h2 className="font-display-lg text-3xl md:text-display-lg text-surface-bright mb-3 md:mb-md drop-shadow-lg">Engineering Safety for the Heart of QC</h2>
            <p className="font-body-md text-base text-surface-bright md:text-surface-variant max-w-2xl mx-auto leading-relaxed">
              Barangay Culiat is charting a new course in public governance, building a future-ready community through modern smart city technology and inclusive service.
            </p>
          </div>
        </section>

        <section className="px-margin-mobile md:px-margin-desktop py-10 md:py-xl max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-6 md:gap-gutter">
            <div ref={(el) => { sectionRefs.current[0] = el; }} className="md:col-span-7 glass-card p-5 md:p-lg rounded-2xl flex flex-col justify-center border border-outline-variant/20 bg-surface-container-lowest opacity-0 translate-y-10 transition-all duration-700">
              <span className="text-secondary font-label-md text-label-md uppercase tracking-widest mb-sm">The Mission</span>
              <h3 className="font-headline-lg text-2xl md:text-[28px] mb-3 md:mb-md text-on-background">A Safe Culiat for All</h3>
              <p className="font-body-md text-body-md text-on-surface-variant leading-loose mb-4 md:mb-md">
                Our mission is to provide an inclusive, transparent, and technology-driven public safety environment. We leverage digital monitoring and real-time community reporting to ensure that every resident of Barangay Culiat feels secure, valued, and heard.
              </p>
              <div className="flex flex-wrap gap-4 md:gap-md">
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>verified_user</span>
                  <span className="font-label-md text-label-md">24/7 Monitoring</span>
                </div>
                <div className="flex items-center gap-sm">
                  <span className="material-symbols-outlined text-secondary" style={{ fontVariationSettings: '"FILL" 1' }}>groups</span>
                  <span className="font-label-md text-label-md">Citizen-First Design</span>
                </div>
              </div>
            </div>
            <div ref={(el) => { sectionRefs.current[1] = el; }} className="md:col-span-5 bg-primary-container text-surface-bright p-5 md:p-lg rounded-2xl relative overflow-hidden group opacity-0 translate-y-10 transition-all duration-700">
              <div className="absolute -right-20 -top-20 w-64 h-64 bg-secondary rounded-full blur-[100px] opacity-20 transition-all group-hover:opacity-40"></div>
              <span className="text-tertiary-fixed-dim font-label-md text-label-md uppercase tracking-widest mb-sm">The Vision</span>
              <h3 className="font-headline-lg text-headline-lg mb-md">Culiat Smart Governance 2030</h3>
              <p className="font-body-md text-body-md text-on-primary-container leading-loose">
                To become the gold standard of digital-first community management in Quezon City—where data drives decisions, transparency breeds trust, and the spirit of collective action inspires immediate, intelligent response.
              </p>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-low py-10 md:py-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
          <div className="max-w-4xl mx-auto">
            <div className="flex flex-col md:flex-row items-center gap-8 md:gap-12" ref={(el) => { sectionRefs.current[2] = el; }}>
              <div className="flex-1">
                <h3 className="font-headline-lg text-2xl md:text-[28px] mb-3 md:mb-md text-on-background">The Legacy of Barangay Culiat</h3>
                <p className="font-body-md text-body-md text-on-surface-variant mb-base leading-relaxed">
                  Barangay Culiat is one of the largest and most vibrant districts in Quezon City. Historically part of a vast agricultural landscape, it has transformed into a critical urban hub that bridges diverse communities and key commercial corridors.
                </p>
                <p className="font-body-md text-body-md text-on-surface-variant leading-relaxed">
                  Today, we meet the modern challenges of urban safety with resilience and a commitment to progressive governance. Our goal is to balance the district's rapid growth with sustainable safety initiatives that protect our multi-cultural resident base and thriving local economy.
                </p>
              </div>
              <div className="w-full md:w-80 h-64 md:h-80 rounded-2xl overflow-hidden shadow-xl border-4 border-surface-bright relative group">
                <img alt="Aerial view of Barangay Culiat" className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-110" src="https://lh3.googleusercontent.com/aida-public/AB6AXuBYHB4c_QahS_au8z7YU1Jg_01ILZSPuVHn-4_wF3nEdPdudx5WqamHbI0tKGT4iA3-ynEXiJhmkM4T67k87PYcSLdLzooZHx1Oz-xUPCdEHti3hIy5yt42dXOMB1WkcSmZuJ1LyE1Dfq_gcMop702825p2NbH_W2CdmQdvHBPThYNFUELijQfGHG53v-2_8dH4lLtiwxlVrDPj35_aJTVVuvPyIS_5GVzPkHi8sB1SqqDppRFz2Y9f" />
                <div className="absolute inset-0 bg-gradient-to-t from-on-background/60 to-transparent"></div>
                <div className="absolute bottom-md left-md">
                  <p className="text-surface-bright font-bold font-headline-md text-headline-md">70k+</p>
                  <p className="text-surface-variant text-caption font-caption uppercase">Resident Population</p>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="py-10 md:py-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
          <div className="text-center mb-8 md:mb-12">
            <h3 className="font-headline-lg text-2xl md:text-[28px] mb-sm">Our Core Values</h3>
            <div className="w-24 h-1.5 bg-secondary mx-auto rounded-full"></div>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-gutter">
            {[
              { icon: 'balance', color: 'text-secondary', bg: 'bg-secondary/10', title: 'Integrity', desc: 'Unwavering honesty and transparency in every report, every action, and every digital record we maintain for the residents of Culiat.' },
              { icon: 'visibility', color: 'text-error', bg: 'bg-error/10', title: 'Vigilance', desc: 'Proactive monitoring and rapid response systems designed to protect our community and prevent incidents before they escalate.' },
              { icon: 'volunteer_activism', color: 'text-on-tertiary-fixed-variant', bg: 'bg-tertiary-fixed-dim/20', title: 'Dedicated Service', desc: 'Putting the needs of the residents first, ensuring that digital tools serve the people and enhance the quality of life in Culiat.' },
            ].map((v, i) => (
              <div key={i} ref={(el) => { sectionRefs.current[3 + i] = el; }} className="p-5 md:p-lg rounded-2xl bg-surface-bright border border-outline-variant/30 hover:shadow-lg transition-shadow duration-300">
                <div className={`w-14 h-14 md:w-16 md:h-16 rounded-xl ${v.bg} flex items-center justify-center mb-3 md:mb-md`}>
                  <span className={`material-symbols-outlined ${v.color} text-3xl md:text-4xl`} style={{ fontVariationSettings: '"FILL" 1' }}>{v.icon}</span>
                </div>
                <h4 className="font-headline-md text-lg md:text-xl mb-sm">{v.title}</h4>
                <p className="font-body-md text-body-md text-on-surface-variant">{v.desc}</p>
              </div>
            ))}
          </div>
        </section>

        <section className="mb-10 md:mb-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto">
          <div className="bg-on-background rounded-[2.5rem] p-6 md:p-xl relative overflow-hidden">
            <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-6 md:gap-8">
              <div className="max-w-ml">
                <h3 className="font-headline-lg text-2xl md:text-[28px] text-surface-bright mb-3 md:mb-md">The Smart Governance Shift</h3>
                <p className="font-body-md text-base text-on-primary-container leading-relaxed">
                  We are transitioning from reactive law enforcement to <strong>Predictive Public Safety</strong>. By integrating IoT sensors, data analysis, and unified communication channels, we are building a safer, more efficient Barangay Culiat.
                </p>
              </div>
              <div className="flex flex-col gap-3 md:gap-md w-full md:w-auto">
                <div className="bg-surface-bright/10 backdrop-blur-md p-3 md:p-md rounded-xl border border-white/10 flex items-center gap-3 md:gap-md">
                  <span className="material-symbols-outlined text-secondary-fixed-dim">analytics</span>
                  <span className="text-surface-bright font-label-md text-label-md">Real-time Data Integration</span>
                </div>
                <div className="bg-surface-bright/10 backdrop-blur-md p-3 md:p-md rounded-xl border border-white/10 flex items-center gap-3 md:gap-md">
                  <span className="material-symbols-outlined text-secondary-fixed-dim">smart_toy</span>
                  <span className="text-surface-bright font-label-md text-label-md">AI-Driven Dispatch Logic</span>
                </div>
                <div className="bg-surface-bright/10 backdrop-blur-md p-3 md:p-md rounded-xl border border-white/10 flex items-center gap-3 md:gap-md">
                  <span className="material-symbols-outlined text-secondary-fixed-dim">shield_person</span>
                  <span className="text-surface-bright font-label-md text-label-md">Community Accountability Portal</span>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
