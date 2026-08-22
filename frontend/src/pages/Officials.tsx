import { useEffect, useMemo, useRef, useState } from 'react';
import { supabase } from '../supabaseClient';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';

type Official = {
  id: string;
  fullname: string;
  title: string;
  committee: string | null;
  icon: string | null;
  term: string | null;
  phone: string | null;
  email: string | null;
  photo_url: string | null;
  facebook: string | null;
  office_hours: string | null;
  visible: boolean;
  sort_order: number;
};

const FALLBACK_IMG = 'https://lh3.googleusercontent.com/aida-public/AB6AXuDAHfFWStquQ5M42WESL-5jmWQMNUOO6QPQrm1G3dl7Hd0g7U3w6hSulRHube-X0lFcDctC-6wfxZm0oCYWrAWQ1rG2grZwbsnT8TIA92xpObXOXX1pxqP1VLdOBljlqbCPWJX_wnXOhxvCsAE1Rzart-DC9UYuPovmBGHODYxIolnoe9d4EAOxw2NKPNFiMVRg5fv-0tkT3XoP_zIUQbV9YKmmB__xXpfbeibq_JN3TRoPKnPHYuxw';

export default function Officials() {
  const [officials, setOfficials] = useState<Official[]>([]);
  const [loading, setLoading] = useState(true);
  const sectionRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    void (async () => {
      const res = await supabase
        .from('officials')
        .select('*')
        .eq('visible', true)
        .order('sort_order')
        .order('fullname');
      setOfficials((res.data ?? []) as Official[]);
      setLoading(false);
    })();
  }, []);

  const captain = useMemo(
    () => officials.find((o) => /captain|punong/i.test(o.title)) ?? null,
    [officials],
  );

  const councilMembers = useMemo(
    () => officials.filter((o) => o.id !== captain?.id),
    [officials, captain],
  );

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
      { threshold: 0.1 },
    );
    sectionRefs.current.forEach((el) => {
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, [loading]);

  return (
    <div className="bg-surface text-on-surface font-body-md selection:bg-secondary/30">
      <SiteHeader active="/officials" />

      <main className="pb-xl px-margin-mobile md:px-margin-desktop max-w-7xl mx-auto pt-24">
        <header ref={(el) => { sectionRefs.current[0] = el; }} className="mb-xl text-center md:text-left opacity-0 translate-y-10 transition-all duration-700">
          <div className="inline-flex items-center gap-sm px-md py-xs bg-secondary/10 text-secondary rounded-full mb-md">
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
            <span className="font-label-md text-label-md uppercase tracking-wider">Public Administration 2023-2026</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-background mb-base">Leadership &amp; Governance</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">Meet the dedicated officials serving Barangay Culiat. Our administration is committed to safety, transparency, and efficient public service.</p>
        </header>

        {loading ? (
          <div className="mb-xl bg-surface-container-lowest rounded-2xl p-12 text-center text-sm text-on-surface-variant">Loading officials…</div>
        ) : officials.length === 0 ? (
          <div className="mb-xl bg-surface-container-lowest rounded-2xl p-12 text-center text-sm text-on-surface-variant">No officials listed yet.</div>
        ) : (
          <>
            {captain && (
              <section ref={(el) => { sectionRefs.current[1] = el; }} className="mb-xl opacity-0 translate-y-10 transition-all duration-700">
                <div className="glass-card rounded-2xl p-md md:p-lg flex flex-col md:flex-row items-center bg-gradient-to-br from-white to-surface-container-low border-l-8 border-secondary gap-md transition-all hover:shadow-xl hover:-translate-y-1">
                  <div className="relative w-64 h-64 md:w-80 md:h-80 shrink-0">
                    <img className="w-full h-full object-cover rounded-xl shadow-xl" src={captain.photo_url || FALLBACK_IMG} alt={captain.fullname} />
                    <div className="absolute -bottom-4 -right-4 bg-tertiary-fixed text-on-tertiary-fixed px-md py-sm rounded-lg font-bold shadow-lg">
                      <span className="font-label-md text-label-md">PUNONG BARANGAY</span>
                    </div>
                  </div>
                  <div className="flex-1 text-center md:text-left">
                    <h2 className="font-headline-lg text-headline-lg text-on-background mb-xs">{captain.fullname}</h2>
                    <p className="font-body-lg text-body-lg text-secondary font-semibold mb-md">{captain.title}</p>
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-md mt-lg">
                      {captain.committee && (
                        <div className="flex items-center gap-md p-md bg-white rounded-lg border border-outline-variant/30 transition-all hover:shadow-md hover:-translate-y-0.5">
                          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                            <span className="material-symbols-outlined">verified_user</span>
                          </div>
                          <div>
                            <p className="font-label-md text-label-md text-on-surface-variant">Committee</p>
                            <p className="font-body-md text-body-md font-bold text-on-surface">{captain.committee}</p>
                          </div>
                        </div>
                      )}
                      {captain.email && (
                        <div className="flex items-center gap-md p-md bg-white rounded-lg border border-outline-variant/30 transition-all hover:shadow-md hover:-translate-y-0.5">
                          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                            <span className="material-symbols-outlined">mail</span>
                          </div>
                          <div>
                            <p className="font-label-md text-label-md text-on-surface-variant">Contact</p>
                            <p className="font-body-md text-body-md font-bold text-on-surface">{captain.email}</p>
                          </div>
                        </div>
                      )}
                      {captain.phone && (
                        <div className="flex items-center gap-md p-md bg-white rounded-lg border border-outline-variant/30 transition-all hover:shadow-md hover:-translate-y-0.5">
                          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                            <span className="material-symbols-outlined">phone</span>
                          </div>
                          <div>
                            <p className="font-label-md text-label-md text-on-surface-variant">Phone</p>
                            <p className="font-body-md text-body-md font-bold text-on-surface">{captain.phone}</p>
                          </div>
                        </div>
                      )}
                      {captain.office_hours && (
                        <div className="flex items-center gap-md p-md bg-white rounded-lg border border-outline-variant/30 transition-all hover:shadow-md hover:-translate-y-0.5">
                          <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                            <span className="material-symbols-outlined">schedule</span>
                          </div>
                          <div>
                            <p className="font-label-md text-label-md text-on-surface-variant">Office Hours</p>
                            <p className="font-body-md text-body-md font-bold text-on-surface">{captain.office_hours}</p>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </section>
            )}

            {councilMembers.length > 0 && (
              <section ref={(el) => { sectionRefs.current[2] = el; }} className="mb-xl bg-surface-container-lowest md:p-lg rounded-2xl p-4 opacity-0 translate-y-10 transition-all duration-700">
                <div className="flex justify-between items-end mb-lg">
                  <div>
                    <h3 className="font-headline-md text-headline-md text-on-surface">Sangguniang Barangay</h3>
                    <p className="font-body-md text-body-md text-on-surface-variant">Barangay Culiat Kagawads &amp; Council Members</p>
                  </div>
                  <div className="hidden md:block h-[2px] bg-outline-variant/30 flex-1 mx-lg mb-4"></div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
                  {councilMembers.map((o) => (
                    <div key={o.id} className="glass-card bg-white rounded-xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300 border border-outline-variant/20">
                      <div className="overflow-hidden h-48">
                        <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={o.photo_url || FALLBACK_IMG} alt={o.fullname} />
                      </div>
                      <div className="p-md">
                        <p className="font-label-md text-label-md text-secondary mb-xs">{o.title}</p>
                        <h4 className="font-headline-md text-[20px] text-on-surface mb-base">{o.fullname}</h4>
                        {o.committee && (
                          <div className="flex items-center gap-xs text-on-surface-variant">
                            <span className="material-symbols-outlined text-[16px]">{o.icon || 'person'}</span>
                            <span className="font-caption text-caption">{o.committee}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}

        <section ref={(el) => { sectionRefs.current[3] = el; }} className="mb-xl py-xl bg-primary-container rounded-2xl overflow-hidden relative opacity-0 translate-y-10 transition-all duration-700">
          <div className="absolute inset-0 opacity-20 pointer-events-none">
            <div className="absolute top-0 right-0 w-96 h-96 bg-secondary rounded-full blur-[120px]"></div>
            <div className="absolute bottom-0 left-0 w-96 h-96 bg-tertiary-fixed rounded-full blur-[120px]"></div>
          </div>
          <div className="relative z-10 px-md md:px-xl">
            <div className="text-center mb-xl">
              <h3 className="font-headline-lg text-headline-lg text-surface-bright mb-base">Organizational Structure</h3>
              <p className="font-body-md text-body-md max-w-ml mx-auto text-surface-bright">The unified framework of our community safety and public health ecosystem.</p>
            </div>
            <div className="flex flex-col items-center gap-lg">
              <div className="p-lg bg-surface-container-lowest rounded-xl border-l-4 border-secondary text-center shadow-lg group hover:bg-surface-bright hover:shadow-xl hover:-translate-y-1 transition-all duration-300">
                <span className="material-symbols-outlined text-secondary text-[48px] mb-sm group-hover:scale-110 transition-transform duration-300">account_balance</span>
                <h4 className="font-headline-md text-headline-md text-on-background">Sangguniang Barangay</h4>
                <p className="font-caption text-caption uppercase tracking-widest mt-xs text-secondary">Policy &amp; Legislative Core</p>
              </div>
              <div className="h-12 w-px relative bg-secondary/50">
                <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-2 h-2 rounded-full bg-secondary"></div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-xl w-full max-w-4xl">
                <div className="bg-surface-container-lowest p-lg rounded-xl border-t-4 border-error text-center group hover:bg-surface-bright hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-md">
                  <span className="material-symbols-outlined text-error text-[40px] mb-sm group-hover:scale-110 transition-transform duration-300">shield</span>
                  <h5 className="font-headline-md text-[20px] text-on-background">BPSO (Tanods)</h5>
                  <p className="font-body-md text-body-md mb-md text-on-surface-variant">Peace, Order &amp; Security</p>
                  <div className="flex flex-wrap justify-center gap-xs">
                    <span className="px-md py-xs bg-error/10 text-error rounded-full font-label-md text-[12px]">Patrol Teams</span>
                    <span className="px-md py-xs bg-error/10 text-error rounded-full font-label-md text-[12px]">CCTV Command</span>
                    <span className="px-md py-xs bg-error/10 text-error rounded-full font-label-md text-[12px]">Traffic Management</span>
                  </div>
                </div>
                <div className="bg-surface-container-lowest p-lg rounded-xl border-t-4 border-secondary text-center group hover:bg-surface-bright hover:shadow-xl hover:-translate-y-1 transition-all duration-300 shadow-md">
                  <span className="material-symbols-outlined text-secondary text-[40px] mb-sm group-hover:scale-110 transition-transform duration-300">local_hospital</span>
                  <h5 className="font-headline-md text-[20px] text-on-background">Health Workers</h5>
                  <p className="font-body-md text-body-md mb-md text-on-surface-variant">Public Health &amp; Sanitation</p>
                  <div className="flex flex-wrap justify-center gap-xs">
                    <span className="px-md py-xs bg-secondary/10 text-secondary rounded-full font-label-md text-[12px]">BHW Units</span>
                    <span className="px-md py-xs bg-secondary/10 text-secondary rounded-full font-label-md text-[12px]">Sanitation Team</span>
                    <span className="px-md py-xs bg-secondary/10 text-secondary rounded-full font-label-md text-[12px]">Emergency Medics</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section ref={(el) => { sectionRefs.current[4] = el; }} className="glass-card rounded-2xl p-xl flex flex-col md:flex-row items-center justify-between gap-xl opacity-0 translate-y-10 transition-all duration-700 hover:shadow-xl hover:-translate-y-1">
          <div>
            <h3 className="font-headline-md text-headline-md text-on-background mb-xs">Want to coordinate with an Official?</h3>
            <p className="font-body-md text-body-md text-on-surface-variant">Request a scheduled meeting or submit a digital inquiry directly to the office.</p>
          </div>
          <div className="flex gap-md w-full md:w-auto flex-wrap">
            <button className="md:flex-none px-6 md:px-xl py-md bg-secondary text-on-secondary rounded-xl font-bold hover:shadow-xl hover:-translate-y-0.5 transition-all duration-300 active:scale-95 w-full text-center">Set Appointment</button>
            <button className="md:flex-none px-6 md:px-xl py-md border-2 border-secondary text-secondary rounded-xl font-bold hover:bg-secondary/5 hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300 active:scale-95 w-full text-center">View Calendars</button>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
