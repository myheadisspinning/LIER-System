import { useState } from 'react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';


interface CaseData {
  id: string;
  title: string;
  date: string;
  zone: string;
  status: 'Ongoing' | 'Pending' | 'Resolved';
  statusColor: string;
  statusBg: string;
  icon: string;
  iconColor: string;
  summary: string;
  timeline: { label: string; time: string; active: boolean; icon: string }[];
}

const casesData: Record<string, CaseData> = {
  'BC-2024-0892': {
    id: 'BC-2024-0892',
    title: 'Unscheduled Waste Disposal',
    date: 'Aug 14, 2024',
    zone: 'Zone 4',
    status: 'Ongoing',
    statusColor: 'text-on-secondary-container',
    statusBg: 'bg-secondary-container',
    icon: 'search',
    iconColor: 'text-secondary',
    summary: 'Large volume of plastic waste and construction debris illegally dumped near the Zone 4 boundary. Obstructing pedestrian pathway and posing health risks.',
    timeline: [
      { label: 'Reported', time: 'Aug 14, 09:30 AM \u2022 Citizen Portal', active: true, icon: 'campaign' },
      { label: 'Verified', time: 'Aug 14, 01:15 PM \u2022 P. Santos', active: true, icon: 'verified' },
      { label: 'Investigating', time: 'Dispatch assigned to Unit 4-B. Physical inspection scheduled.', active: true, icon: 'manage_search' },
      { label: 'Resolved', time: 'Pending completion', active: false, icon: 'task_alt' },
    ],
  },
  'BC-2024-0845': {
    id: 'BC-2024-0845',
    title: 'Street Light Outage',
    date: 'Aug 12, 2024',
    zone: 'Barangay Culiat',
    status: 'Pending',
    statusColor: 'text-on-error-container',
    statusBg: 'bg-error-container',
    icon: 'schedule',
    iconColor: 'text-on-surface-variant',
    summary: 'Multiple street lights out along the main road in Barangay Culiat area. Creating hazardous conditions for pedestrians and motorists at night.',
    timeline: [
      { label: 'Reported', time: 'Aug 12, 08:15 PM \u2022 Citizen Portal', active: true, icon: 'campaign' },
      { label: 'Verified', time: 'Pending verification', active: false, icon: 'verified' },
      { label: 'Investigating', time: 'Awaiting assignment', active: false, icon: 'manage_search' },
      { label: 'Resolved', time: 'Pending completion', active: false, icon: 'task_alt' },
    ],
  },
  'BC-2024-0711': {
    id: 'BC-2024-0711',
    title: 'Noise Complaint',
    date: 'Resolved on Aug 08, 2024',
    zone: 'Litex Road',
    status: 'Resolved',
    statusColor: 'text-on-surface',
    statusBg: 'bg-surface-container-highest',
    icon: 'check_circle',
    iconColor: 'text-on-surface-variant',
    summary: 'Recurring noise disturbance from a local establishment during late hours. Issue has been resolved after barangay mediation.',
    timeline: [
      { label: 'Reported', time: 'Aug 05, 11:30 PM \u2022 Citizen Portal', active: true, icon: 'campaign' },
      { label: 'Verified', time: 'Aug 06, 09:00 AM \u2022 Barangay Hall', active: true, icon: 'verified' },
      { label: 'Investigating', time: 'Warning issued to establishment', active: true, icon: 'manage_search' },
      { label: 'Resolved', time: 'Case closed on Aug 08, 2024', active: true, icon: 'task_alt' },
    ],
  },
};

const caseIds = ['BC-2024-0892', 'BC-2024-0845', 'BC-2024-0711'];

export default function TrackCases() {
  const [selectedCase, setSelectedCase] = useState<string>('BC-2024-0892');
  const [detailOpacity, setDetailOpacity] = useState(1);

  const current = casesData[selectedCase];

  const selectCase = (id: string) => {
    setDetailOpacity(0.5);
    setTimeout(() => {
      setSelectedCase(id);
      setDetailOpacity(1);
    }, 150);
  };

  return (
    <div className="bg-background text-on-surface font-body-md min-h-screen flex flex-col">
      <SiteHeader active="/services" title="Barangay Culiat Safety" />

      <main className="flex-grow w-full max-w-[1440px] mx-auto px-margin-mobile md:px-margin-desktop py-md pt-24">
        <section className="mb-lg">
          <h2 className="font-headline-lg-mobile text-headline-lg-mobile font-bold text-primary mb-2">Track My Cases</h2>
          <p className="text-on-surface-variant text-body-md">Real-time updates on your submitted reports and ongoing community safety investigations.</p>
        </section>

        <div className="grid grid-cols-1 lg:grid-cols-12 gap-gutter">
          <div className="lg:col-span-5 space-y-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="font-label-md text-label-md text-on-surface-variant uppercase tracking-wider">Active Reports</h3>
              <span className="bg-surface-container text-secondary text-caption px-3 py-1 rounded-full font-bold">3 Active</span>
            </div>
            {caseIds.map((id) => {
              const c = casesData[id];
              const isSelected = selectedCase === id;
              return (
                <button
                  key={id}
                  onClick={() => selectCase(id)}
                  className={`w-full text-left ${isSelected ? 'glass-card border-2 border-secondary p-md rounded-2xl shadow-xl' : 'bg-white border border-outline-variant/30 p-md rounded-2xl shadow-sm hover:bg-surface-container/30'} transition-all hover:translate-y-[-2px] focus:outline-none ${c.status === 'Resolved' ? 'opacity-80' : ''}`}
                >
                  <div className="flex justify-between items-start mb-2">
                    <span className={`font-label-md ${isSelected ? 'text-secondary' : 'text-on-surface-variant'}`}>#{c.id}</span>
                    <span className={`${c.statusBg} ${c.statusColor} text-caption px-2 py-1 rounded-md font-bold uppercase`}>{c.status}</span>
                  </div>
                  <h4 className="font-headline-md text-[18px] text-on-surface font-bold mb-1">{c.title}</h4>
                  <p className="text-on-surface-variant text-caption line-clamp-1 mb-3">{c.date} &bull; {c.zone}</p>
                  <div className={`flex items-center ${isSelected ? 'text-secondary' : 'text-on-surface-variant'}`}>
                    <span className="material-symbols-outlined text-base mr-1">{c.icon}</span>
                    <span className="text-caption font-bold">{c.status === 'Ongoing' ? 'Currently Investigating' : c.status === 'Pending' ? 'Awaiting Verification' : 'Case Closed'}</span>
                  </div>
                </button>
              );
            })}
            <div className="flex justify-center pt-4">
              <button className="flex items-center gap-2 px-6 py-2 border-2 border-secondary text-secondary rounded-xl font-bold text-label-md hover:bg-secondary-container/10 transition-colors active:scale-95 focus:outline-none">
                <span className="material-symbols-outlined">expand_more</span>
                Load More Reports
              </button>
            </div>
          </div>

          <div id="case-details-panel" className="lg:col-span-7" style={{ opacity: detailOpacity, transition: 'opacity 0.15s' }}>
            <div className="bg-white rounded-2xl shadow-xl overflow-hidden border border-outline-variant/20 sticky top-[80px]">
              <div className="p-md bg-primary-container text-on-primary">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                  <div>
                    <h3 id="detail-id" className="text-secondary-fixed-dim font-label-md">CASE {current.id}</h3>
                    <h2 id="detail-title" className="font-headline-md text-headline-md font-bold">{current.title}</h2>
                  </div>
                  <button className="bg-secondary px-6 py-2 rounded-xl text-white font-bold text-label-md flex items-center gap-2 hover:bg-secondary-fixed-dim hover:text-on-secondary-fixed transition-colors">
                    <span className="material-symbols-outlined">phone_in_talk</span>
                    Contact Officer
                  </button>
                </div>
              </div>
              <div className="p-md md:p-lg grid md:grid-cols-2 gap-lg">
                <div>
                  <h4 className="font-label-md text-secondary uppercase mb-6 tracking-widest">Case Progress</h4>
                  <div className="relative space-y-8 pl-8">
                    <div className="absolute left-3.5 top-2 bottom-2 w-0.5 bg-secondary/20"></div>
                    {current.timeline.map((step, i) => (
                      <div key={i} className="relative">
                        <div className={`absolute -left-8 w-8 h-8 ${step.active ? 'bg-secondary' : 'bg-outline-variant'} rounded-full flex items-center justify-center text-white z-10`}>
                          <span className="material-symbols-outlined text-[18px]">{step.icon}</span>
                        </div>
                        <div className="flex flex-col">
                          <span className={`font-bold text-body-md ${step.active ? 'text-on-surface' : 'text-on-surface-variant'}`}>{step.label}</span>
                          <span className={`text-caption ${step.active ? 'text-on-surface-variant' : 'text-on-surface-variant'}`}>{step.time}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <div className="space-y-6">
                  <div>
                    <h4 className="font-label-md text-secondary uppercase mb-3 tracking-widest">Case Summary</h4>
                    <p className="text-body-md text-on-surface leading-relaxed">{current.summary}</p>
                  </div>
                  <div>
                    <h4 className="font-label-md text-secondary uppercase mb-3 tracking-widest">Submitted Evidence</h4>
                    <div className="grid grid-cols-2 gap-2">
                      <div className="aspect-square rounded-xl bg-cover bg-center border border-outline-variant" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuCiuqhhAKgqNUo0pg-fWuq6pcNMu_sxTlkESV7rIJ2cVyEjrwbeuEImDxOwaEtyhHnSE2q2M6o-dpxRX0xXG8E76Iha9Amzc_fZ7csmE6suOEsqc9GYQYH1S-ZimNcwLZu7c8HmMfwzTQaEDkgquOySYQ_RkVpnIaarT0GcNOtqrBi8c7UmsL5CjCTn4MW4e0Ekd9xwx6uWDHjP6IIsBNByWI012VM-yQfV3BAlDzXNI-OMkDP2GFy5")' }}></div>
                      <div className="aspect-square rounded-xl bg-cover bg-center border border-outline-variant" style={{ backgroundImage: 'url("https://lh3.googleusercontent.com/aida-public/AB6AXuDGpUwZBeqkrLFVk9DP0z4Wf7MFGBxFnSMlylz44nYJQADVTFrInRBvfLkI_NElQ8o9zT4r4K2PT4X0ck0FdrSFspekCK9_WQRFkwB3QWFxS9Ej5sEIP8a4Oc191zv_IN8_ymxsNm8K_JgJ2tN_7ZBFpyM7RXyUM6sRdA5bMtv1rbM_ZwR6szOhBfJL3KRWutymaLuYfU4BXUouqa_56Vfex0Rj99C4gY0QCFa88jsA1yeqrLm3uNEl")' }}></div>
                    </div>
                  </div>
                  <div className="bg-surface-container-low p-4 rounded-xl border border-outline-variant/10">
                    <div className="flex items-start gap-3">
                      <span className="material-symbols-outlined text-secondary">info</span>
                      <div>
                        <p className="text-caption text-on-surface font-bold">Estimated Resolution</p>
                        <p className="text-caption text-on-surface-variant">Expected within 48 hours based on current priority level.</p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      <div className="h-24 md:hidden"></div>

      <SiteFooter />
    </div>
  );
}
