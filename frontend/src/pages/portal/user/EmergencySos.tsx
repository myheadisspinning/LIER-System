import { useEffect, useRef, useState } from 'react';

interface Hotline {
  label: string;
  name: string;
  status: string;
  statusClass: string;
  dot?: string;
  icon: string;
  number: string;
  primary: boolean;
}

const hotlines: Hotline[] = [
  {
    label: 'Command Center',
    name: 'Barangay Culiat Main',
    status: '24/7 Active',
    statusClass: 'bg-green-100 text-green-800 border-green-200',
    dot: 'bg-green-500 animate-pulse',
    icon: 'call',
    number: '0962-582-1531 / 856-722-60',
    primary: true,
  },
  {
    label: 'Law Enforcement',
    name: 'PNP Helpline',
    status: 'Police Assistance',
    statusClass: 'bg-blue-100 text-blue-800 border-blue-200',
    icon: 'local_police',
    number: '911',
    primary: false,
  },
  {
    label: 'Medical Responder',
    name: 'QC Emergency / DRRMO',
    status: 'Medical & Rescue',
    statusClass: 'bg-red-100 text-red-800 border-red-200',
    icon: 'ambulance',
    number: '122',
    primary: false,
  },
  {
    label: 'Fire Department',
    name: 'New Era Sub Fire Station',
    status: 'Fire Emergency',
    statusClass: 'bg-orange-100 text-orange-800 border-orange-200',
    icon: 'local_fire_department',
    number: '0976-098-1342',
    primary: false,
  },
];

export default function EmergencySos() {
  const [pressing, setPressing] = useState(false);
  const [dispatched, setDispatched] = useState(false);
  const timerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (timerRef.current) window.clearTimeout(timerRef.current);
    };
  }, []);

  const startPress = () => {
    setPressing(true);
    setDispatched(false);
    timerRef.current = window.setTimeout(() => {
      setDispatched(true);
      setPressing(false);
    }, 3000);
  };

  const cancelPress = () => {
    if (timerRef.current) window.clearTimeout(timerRef.current);
    setPressing(false);
  };

  return (
    <div className="space-y-8">
      <div className="bg-[#FEF2F2] border border-error-red/30 rounded-2xl p-8 shadow-sm relative overflow-hidden">
        <div className="absolute inset-0 bg-error-red opacity-5"></div>
        <div className="relative z-10 flex flex-col md:flex-row items-center justify-between gap-8">
          <div className="flex-1 text-center md:text-left">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-error-red/10 text-error-red font-caps-xs text-caps-xs font-bold mb-4">
              <span className="material-symbols-outlined text-[14px] mr-1">cell_tower</span>
              PRIORITY CONNECTION ACTIVE
            </div>
            <h3 className="font-headline-lg text-headline-lg text-on-surface mb-3">Emergency? Don't Wait.</h3>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6 max-w-2xl">
              Transmits your GPS location, contact info, and registered household address directly to Barangay Desk Officers and PNP Station 14.
            </p>
            <div className="flex flex-col gap-3">
              <label className="flex items-center space-x-3 bg-white/50 p-3 rounded-lg border border-error-red/20 max-w-2xl cursor-pointer">
                <input type="checkbox" className="h-5 w-5 text-error-red rounded border-error-red/30 focus:ring-error-red" defaultChecked />
                <span className="font-label-md text-label-md text-on-surface">Share Live GPS Location</span>
              </label>
              <label className="flex items-center space-x-3 bg-white/50 p-3 rounded-lg border border-error-red/20 max-w-2xl cursor-pointer">
                <input type="checkbox" className="h-5 w-5 text-error-red rounded border-error-red/30 focus:ring-error-red" defaultChecked />
                <span className="font-label-md text-label-md text-on-surface">Open Audio Channel</span>
              </label>
            </div>
          </div>
          <div
            className="flex-shrink-0 cursor-pointer select-none"
            onMouseDown={startPress}
            onMouseUp={cancelPress}
            onMouseLeave={cancelPress}
            onTouchStart={startPress}
            onTouchEnd={cancelPress}
          >
            <div className="relative w-48 h-48 flex items-center justify-center">
              <svg className="absolute inset-0 w-full h-full transform -rotate-90 pointer-events-none" viewBox="0 0 100 100">
                <circle cx="50" cy="50" fill="none" r="45" stroke="#fca5a5" strokeWidth="4"></circle>
                <circle
                  cx="50"
                  cy="50"
                  fill="none"
                  r="45"
                  stroke="#ef4444"
                  strokeLinecap="round"
                  strokeWidth="8"
                  strokeDasharray="283"
                  strokeDashoffset={pressing ? 0 : 283}
                  style={{ transition: pressing ? 'stroke-dashoffset 3s linear' : 'stroke-dashoffset 0.1s' }}
                ></circle>
              </svg>
              <div
                className={`w-40 h-40 rounded-full flex flex-col items-center justify-center shadow-2xl shadow-error-red/50 border-4 border-white z-10 ${
                  pressing ? 'bg-error active:scale-95' : 'bg-error-red hover:bg-error'
                }`}
              >
                <span className="material-symbols-outlined text-white text-5xl mb-1" style={{ fontVariationSettings: "'FILL' 1" }}>
                  sos
                </span>
                <span className="text-white font-caps-xs text-caps-xs text-center px-4 mt-2 font-bold leading-tight uppercase">
                  {pressing ? 'DISPATCHING...' : 'HOLD 3 SECONDS FOR IMMEDIATE DISPATCH'}
                </span>
              </div>
              <div className="absolute inset-0 rounded-full border-4 border-error-red animate-ping opacity-20 pointer-events-none z-0"></div>
            </div>
          </div>
        </div>
        {dispatched && (
          <div className="relative z-10 mt-4 bg-white/80 border border-error-red/30 rounded-lg p-4 text-center">
            <p className="font-label-md text-label-md font-bold text-error-red flex items-center justify-center gap-2">
              <span className="material-symbols-outlined">check_circle</span>
              DISPATCH TRIGGERED: Location and details sent to Command Center.
            </p>
          </div>
        )}
      </div>

      <div>
        <h3 className="font-headline-md text-headline-md text-on-surface mb-6 flex items-center">
          <span className="material-symbols-outlined mr-2 text-secondary">contact_phone</span>
          Direct Action Hotlines
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {hotlines.map((h) => (
            <div
              key={h.name}
              className="bg-surface-container-lowest border border-border-subtle rounded-2xl p-6 shadow-[0_1px_2px_rgba(2,6,23,0.05)] hover:shadow-[0_1px_2px_rgba(2,6,23,0.05),0_16px_40px_-20px_rgba(2,6,23,0.25)] hover:-translate-y-0.5 transition-all duration-200"
            >
              <div className="flex justify-between items-start mb-4">
                <div>
                  <span className="font-caps-xs text-caps-xs text-secondary font-bold uppercase tracking-wider mb-1 block">{h.label}</span>
                  <h4 className="font-headline-md text-headline-md text-on-surface">{h.name}</h4>
                </div>
                <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${h.statusClass}`}>
                  {h.dot && <span className={`w-2 h-2 mr-1.5 rounded-full ${h.dot}`}></span>}
                  {h.status}
                </span>
              </div>
              <div className="flex items-center mb-6 text-on-surface-variant">
                <span className="material-symbols-outlined mr-2 text-outline">{h.icon}</span>
                <span className="font-body-md text-body-md">{h.number}</span>
              </div>
              <button
                type="button"
                className={`w-full font-label-md py-3 rounded-xl flex justify-center items-center transition-all active:scale-[0.98] ${
                  h.primary
                    ? 'bg-gradient-to-r from-secondary to-[#316bf3] hover:shadow-md text-white'
                    : 'bg-surface-container-high hover:bg-surface-dim text-on-surface border border-outline-variant'
                }`}
              >
                <span className="material-symbols-outlined mr-2 text-sm">{h.primary ? 'phone_forwarded' : 'call'}</span>
                {h.primary ? 'Call Desk Now' : `Call ${h.label.split(' ')[0]}`}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
