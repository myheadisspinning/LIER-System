import { useEffect, useRef } from 'react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';

const kagawads = [
  { name: 'Dante Arga', committee: 'Peace and Order', icon: 'security', img: 'AB6AXuBXukd8qzbX81JCXuMfIH0xhReNVT4cIoVSKQ7yq0VFRQhbmKtUmA1Tw2h0Em7dHfqTZrl-3hQRrrcmNFc9a0JsKZkWf23eM88IwhjI502kFLdPFl87Hw-egK6Hl_Vvo_E8Z8SDdggYNo0Mz5vQeMgnELL-_czrXz_IhW9R4m3yApqGAF2wesGzQ5UBO0QkNQ13IveiNDIrF8_HF47wzkZcjwVlJ15rFMkxOE_kVxw9F0KynDeP_kTU' },
  { name: 'Jayson Co', committee: 'Infrastructure', icon: 'construction', img: 'AB6AXuAc3vomtq32UwKYHrOK9r_Q95lzlqJy7owFFiU29n4P-cVDXvqCAMxh-m3m_13sF491A2awRV2_wLZv-mxbBQ-OYQLss1med6TwXfgSSPVsU-iin6sKJmuKgq7RiX5j7HjaUjkOnx4agfp0aZ4oKNBgI91wtGFfLO1qDgJtKEPcJd2vKvrHAuP71xYABPYKILZLF54gIBK9q4pV0aeh-3TH3VnfAULxugvk1tacob_2NcvsQnapiA6Q' },
  { name: 'Luzviminda Gatchalian', committee: 'Health & Nutrition', icon: 'medical_services', img: 'AB6AXuBQDwjWvZPE4XPPL70QoZ8h7_gQgENNkOExqr8b2FybISrJH9Koul650Gtx-keRSOqFR5G0PvKkIDnR10BiuiOXDJhiOdY7twmZQa9fICXfuit1jylw2OCkdCSUOj4sD4j1Xzg9ea-Mb2E_MwQ6kM9j8s2p-VsVrjoB6KqS_pNa25OChJMh3lCIux7qrti0BXZLnsb_8HVNIqWkhny4sQJwvl4Uoni7UQBIzinHSXZ9273fENhzT5PH' },
  { name: 'Eduardo Gumboc', committee: 'Appropriations', icon: 'payments', img: 'AB6AXuCJ4cbq6TfLBvj1sn9pIdgaPhRufnTCF0Fy52JesoDDF2KzafqiX_2WEQixPa-G9r-i16OxK7WKsoPd2TtY__O8qez5OH0AQzIjm6pro11xHlaa-G0Lk0lXgUiprrjmHtAyEo-Gb9XgsM0IW07cAC-4AOJWmp7f3_nDShWH4Bfh9Qy9Y93_uKVtGOjvaULFk_MIDjHpBdac-6RDnfPR0GoyflYaXk2l4aiFVWxiuGUQEKSPfkVNZ7PR' },
  { name: 'Rogelio Layson', committee: 'Education', icon: 'school', img: 'AB6AXuBugJUs4Q19Fr8nPhubwDJZY_w4xuuniiZiJKDv__jpjK7q2pSIJeoPfdaSKfFz6-VTgi7mjbsrindlwWt17DScVVjujUkH5zpQMDakDpWF0pN0zBZ-stfdsGBJv-RW23bD67YwDU4W8808GZz9EXT14vqPVuDs5dpV6bMen1sEJFYDb-3dhGSm1hygqnIhoPZf1gz5_vN31g-cNq3RLZclDid94URQEgnzQAm1gEQuw7bXhWHgv4kV' },
  { name: 'Arnel San Jose', committee: 'Environment', icon: 'recycling', img: 'AB6AXuBXmPws4Mbz1V_ISPbiue9R2qKZ7TnwZAY-__NYctV_iWwC140czLg04APz9RO-vmsIAxFAnwLNap4dnJfWnjk8O10G8NrIuH_EHi2m9dVscQ0iRNKN_oBL30M6pm-uYzGPXHUyIQr_deIxIZm2ARkMubVN4mee_zolRJ6K9b5-p7BxFwSctTASlpKuw24p5OkxpdmH3WBahnOU8nFmnKkFjAVdYfGAnVQBlqz9ScYklRY6CgCJFoFA' },
  { name: 'Sonia Tan', committee: 'Social Services', icon: 'groups', img: 'AB6AXuDl8V3s7w4x0J5AQnEtnO4DixW00oheSw5skeFJ-UjRomTrl2qw2R61RzOOQvoO77-2t86OoKGXA--ozDSvcFJQ8XXLxUqfJ1-UmzB9jdBNUPN5JxQDx9Bt0L58kuoS0fHVFBDYplgXgdbpKUEQrXiDV_AdsK_gx8q1DT1Q3Phnyv0bnWCgt9uvSuiNQ8L5PkIvGZQGziQm3PD2_zM1r_3FrWH3S7qZg1vaE5cPxX9vQMFW-7rIVCxG' },
];

export default function Officials() {
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
      if (el) observer.observe(el);
    });
    return () => observer.disconnect();
  }, []);

  return (
    <div className="bg-surface text-on-surface font-body-md selection:bg-secondary/30">
      <SiteHeader active="/officials" />

      <main className="pb-xl px-margin-mobile md:px-margin-desktop max-w-[1440px] mx-auto pt-24">
        <header ref={(el) => { sectionRefs.current[0] = el; }} className="mb-xl text-center md:text-left opacity-0 translate-y-10 transition-all duration-700">
          <div className="inline-flex items-center gap-sm px-md py-xs bg-secondary/10 text-secondary rounded-full mb-md">
            <span className="material-symbols-outlined text-[18px]">account_balance</span>
            <span className="font-label-md text-label-md uppercase tracking-wider">Public Administration 2023-2026</span>
          </div>
          <h1 className="font-display-lg text-display-lg text-on-background mb-base">Leadership &amp; Governance</h1>
          <p className="font-body-lg text-body-lg text-on-surface-variant max-w-2xl">Meet the dedicated officials serving Barangay Culiat. Our administration is committed to safety, transparency, and efficient public service.</p>
        </header>

        <section ref={(el) => { sectionRefs.current[1] = el; }} className="mb-xl opacity-0 translate-y-10 transition-all duration-700">
          <div className="glass-card rounded-2xl p-md md:p-lg flex flex-col md:flex-row items-center bg-gradient-to-br from-white to-surface-container-low border-l-8 border-secondary gap-md transition-all hover:shadow-xl hover:-translate-y-1">
            <div className="relative w-64 h-64 md:w-80 md:h-80 shrink-0">
              <img className="w-full h-full object-cover rounded-xl shadow-xl" src="https://lh3.googleusercontent.com/aida-public/AB6AXuDAHfFWStquQ5M42WESL-5jmWQMNUOO6QPQrm1G3dl7Hd0g7U3w6hSulRHube-X0lFcDctC-6wfxZm0oCYWrAWQ1rG2grZwbsnT8TIA92xpObXOXX1pxqP1VLdOBljlqbCPWJX_wnXOhxvCsAE1Rzart-DC9UYuPovmBGHODYxIolnoe9d4EAOxw2NKPNFiMVRg5fv-0tkT3XoP_zIUQbV9YKmmB__xXpfbeibq_JN3TRoPKnPHYuxw" alt="Punong Barangay Manuel Noel Co" />
              <div className="absolute -bottom-4 -right-4 bg-tertiary-fixed text-on-tertiary-fixed px-md py-sm rounded-lg font-bold shadow-lg">
                <span className="font-label-md text-label-md">PUNONG BARANGAY</span>
              </div>
            </div>
            <div className="flex-1 text-center md:text-left">
              <h2 className="font-headline-lg text-headline-lg text-on-background mb-xs">Manuel 'Noel' Co</h2>
              <p className="font-body-lg text-body-lg text-secondary font-semibold mb-md">Barangay Captain</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-md mt-lg">
                <div className="flex items-center gap-md p-md bg-white rounded-lg border border-outline-variant/30 transition-all hover:shadow-md hover:-translate-y-0.5">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined">verified_user</span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface-variant">Committee</p>
                    <p className="font-body-md text-body-md font-bold text-on-surface">Executive &amp; Finance</p>
                  </div>
                </div>
                <div className="flex items-center gap-md p-md bg-white rounded-lg border border-outline-variant/30 transition-all hover:shadow-md hover:-translate-y-0.5">
                  <div className="w-10 h-10 rounded-full bg-secondary/10 flex items-center justify-center text-secondary">
                    <span className="material-symbols-outlined">mail</span>
                  </div>
                  <div>
                    <p className="font-label-md text-label-md text-on-surface-variant">Contact</p>
                    <p className="font-body-md text-body-md font-bold text-on-surface">captain@culiat.gov</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section ref={(el) => { sectionRefs.current[2] = el; }} className="mb-xl bg-surface-container-lowest md:p-lg rounded-2xl p-4 opacity-0 translate-y-10 transition-all duration-700">
          <div className="flex justify-between items-end mb-lg">
            <div>
              <h3 className="font-headline-md text-headline-md text-on-surface">Sangguniang Barangay</h3>
              <p className="font-body-md text-body-md text-on-surface-variant">Barangay Culiat Kagawads &amp; Council Members</p>
            </div>
            <div className="hidden md:block h-[2px] bg-outline-variant/30 flex-1 mx-lg mb-4"></div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-gutter">
            {kagawads.map((k, i) => (
              <div key={i} className="glass-card bg-white rounded-xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300 border border-outline-variant/20">
                <div className="overflow-hidden h-48">
                  <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src={`https://lh3.googleusercontent.com/aida-public/${k.img}`} alt={k.name} />
                </div>
                <div className="p-md">
                  <p className="font-label-md text-label-md text-secondary mb-xs">Kagawad</p>
                  <h4 className="font-headline-md text-[20px] text-on-surface mb-base">{k.name}</h4>
                  <div className="flex items-center gap-xs text-on-surface-variant">
                    <span className="material-symbols-outlined text-[16px]">{k.icon}</span>
                    <span className="font-caption text-caption">{k.committee}</span>
                  </div>
                </div>
              </div>
            ))}
            <div className="glass-card bg-white rounded-xl overflow-hidden group hover:-translate-y-1 transition-transform duration-300 border-2 border-tertiary-fixed-dim/30">
              <div className="overflow-hidden bg-surface-container h-48">
                <img className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500" src="https://lh3.googleusercontent.com/aida-public/AB6AXuAu4U5lN3ETzwfDkKuehAf1Z_1Y2bqWH8D60ZSJDnxJGtoc7Ej7L2vNAzfC6CcupZh9Y2ph0AUlAX-oJ8XX5sm33-9Cvqx1mGeA01UiTlkg9C5E8ao64Onj_yAk6xf0hyqsqCnL3_jjHXqgk3gZX1GPXUUkTH1BMO64radFQEqCVYbNHChK6Mh0JL945-1EBvIU6ex9FHyHAWYzOzuyfFnB9PkAzdZd7Z3vucN7N4UvNT3_nBMKLf2S" alt="SK Chairperson Joshua Manalo" />
              </div>
              <div className="p-md">
                <p className="font-label-md text-label-md text-tertiary-fixed-dim bg-on-tertiary-fixed px-2 py-0.5 rounded inline-block mb-xs">SK Chairperson</p>
                <h4 className="font-headline-md text-[20px] text-on-surface mb-base">Joshua Manalo</h4>
                <div className="flex items-center gap-xs text-on-surface-variant">
                  <span className="material-symbols-outlined text-[16px]">volunteer_activism</span>
                  <span className="font-caption text-caption">Youth &amp; Sports</span>
                </div>
              </div>
            </div>
          </div>
        </section>

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
