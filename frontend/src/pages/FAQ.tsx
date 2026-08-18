import { useState } from 'react';
import { Link } from 'react-router-dom';
import SiteHeader from '../components/SiteHeader';

interface FaqItem {
  q: string;
  a: string;
}

interface FaqSection {
  icon: string;
  category: string;
  items: FaqItem[];
}

const faqSections: FaqSection[] = [
  {
    icon: 'report',
    category: 'Incident Reporting',
    items: [
      {
        q: 'How do I file an incident report?',
        a: 'Go to the Services page and click "File an Incident Report", or open your resident dashboard and use the Report Incident form. Fill in the title, description, and location, then submit. Our AI dispatcher classifies the report and assigns a priority level automatically.',
      },
      {
        q: 'Do I need an account to report an incident?',
        a: 'Yes. Creating a free resident account lets you track your report, upload evidence, and receive status updates. Anonymous reporting is also supported inside the portal.',
      },
      {
        q: 'How long does it take for a report to be processed?',
        a: 'Most reports are classified within seconds by the AI dispatcher. Verification by barangay responders typically happens within a few hours during office hours, and critical incidents are prioritized immediately.',
      },
    ],
  },
  {
    icon: 'badge',
    category: 'Barangay Services',
    items: [
      {
        q: 'How long does a Barangay Clearance take?',
        a: 'Barangay clearances are usually processed within 24-48 hours via our digital portal. You can request in-person at the Barangay Hall for same-day processing, subject to availability.',
      },
      {
        q: 'Is the health center open on weekends?',
        a: 'The health center is open Monday through Friday. Emergency triage is available 24/7 — call the emergency hotline or use the Emergency SOS feature for urgent medical needs.',
      },
      {
        q: 'What are the office hours of the Barangay Hall?',
        a: 'The Barangay Hall is open Monday to Friday, 8:00 AM to 5:00 PM, at 467 Tandang Sora Ave, Quezon City. Use the "Locate Barangay Hall" service for directions.',
      },
    ],
  },
  {
    icon: 'shield',
    category: 'Safety & Emergency',
    items: [
      {
        q: 'What should I do in an emergency?',
        a: 'Call 911 for life-threatening emergencies, then use the Emergency SOS button in your portal to alert barangay responders. Provide your exact location and describe what is happening clearly and calmly.',
      },
      {
        q: 'How does the AI dispatcher decide priority?',
        a: 'The AI analyzes the report text for severity, risk to life and property, and proximity. Threat level 85 and above is flagged CRITICAL, 70+ is HIGH, 45+ is MEDIUM, and everything else is LOW.',
      },
      {
        q: 'How do I keep my evidence safe?',
        a: 'Use the Digital Evidence Vault to upload photos, videos, and documents. Files are stored securely and attached to your case for investigators. Keep originals until the case is resolved.',
      },
    ],
  },
  {
    icon: 'track_changes',
    category: 'Case Tracking',
    items: [
      {
        q: 'How can I check the status of my report?',
        a: 'Use the "Track My Case" service or open your resident dashboard and go to My Incident Reports. You can see the case progress from Reported, Verified, and Investigating, to Resolved.',
      },
      {
        q: 'Can I communicate with the officer handling my case?',
        a: 'Yes. Once your report is assigned, you can use Case Chat & Messages inside your portal to communicate directly with the assigned responder.',
      },
      {
        q: 'How long until my case is resolved?',
        a: 'Most cases are resolved within 48 hours based on priority level. Critical and high-priority incidents are escalated and monitored continuously by the command center.',
      },
    ],
  },
  {
    icon: 'account_circle',
    category: 'Accounts & Privacy',
    items: [
      {
        q: 'How do I create a resident account?',
        a: 'Click "Sign Up" on the home page, provide your details, and confirm your email. Once confirmed, you can sign in and access your personalized dashboard.',
      },
      {
        q: 'Is my personal information kept private?',
        a: 'Yes. Your information is protected under the Data Privacy Act. You can file reports anonymously, and only authorized barangay personnel can view case details.',
      },
      {
        q: 'I forgot my password. What do I do?',
        a: 'On the sign-in page, click "Forgot password" and follow the instructions sent to your email to reset it securely.',
      },
    ],
  },
];

export default function FAQ() {
  const [open, setOpen] = useState<number | null>(0);

  const toggle = (index: number) => setOpen((prev) => (prev === index ? null : index));

  return (
    <div className="bg-background text-on-surface font-body-md flex flex-col min-h-screen">
      <SiteHeader active="/services" />

      <main className="flex-grow w-full pt-24 pb-24 md:pb-12">
        <section className="relative overflow-hidden px-margin-mobile md:px-margin-desktop py-lg md:py-xl">
          <div className="relative z-10 max-w-4xl mx-auto text-center">
            <span className="text-secondary font-bold tracking-widest uppercase text-sm mb-4 block">Resident Support</span>
            <h1 className="font-display-lg-mobile md:font-display-lg text-display-lg-mobile md:text-display-lg text-on-surface mb-6 leading-tight">Frequently Asked Questions</h1>
            <p className="text-body-lg text-on-surface-variant mb-8 max-w-2xl mx-auto">Quick answers to common questions about barangay services, safety protocols, incident reporting, and community guidelines.</p>
            <div className="w-24 h-1.5 bg-secondary mx-auto rounded-full"></div>
          </div>
        </section>

        <section className="px-margin-mobile md:px-margin-desktop py-lg md:py-xl">
          <div className="max-w-4xl mx-auto space-y-16">
            {faqSections.map((section, sIndex) => (
              <div key={section.category}>
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-11 h-11 rounded-xl bg-secondary/10 text-secondary flex items-center justify-center">
                    <span className="material-symbols-outlined">{section.icon}</span>
                  </div>
                  <div>
                    <h2 className="font-headline-md text-headline-md text-on-surface font-bold">{section.category}</h2>
                    <p className="text-caption text-on-surface-variant uppercase tracking-widest">{section.items.length} question{section.items.length === 1 ? '' : 's'}</p>
                  </div>
                </div>
                <div className="space-y-4">
                  {section.items.map((item, i) => {
                    const idx = sIndex * 100 + i;
                    const isOpen = open === idx;
                    return (
                      <div key={i} className={`glass-card rounded-2xl border border-outline-variant/30 bg-surface-bright/60 backdrop-blur-sm overflow-hidden transition-shadow ${isOpen ? 'shadow-lg' : 'shadow-sm hover:shadow-md'}`}>
                        <button
                          type="button"
                          onClick={() => toggle(idx)}
                          className="w-full flex items-center justify-between gap-4 p-5 text-left focus:outline-none"
                        >
                          <span className="font-label-md text-label-md text-on-surface font-bold">{item.q}</span>
                          <span className={`material-symbols-outlined text-secondary shrink-0 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`}>expand_more</span>
                        </button>
                        <div className={`grid transition-[grid-template-rows] duration-300 ease-out ${isOpen ? 'grid-rows-[1fr]' : 'grid-rows-[0fr]'}`}>
                          <div className="overflow-hidden min-h-0">
                            <p className="px-5 pb-5 text-body-md text-on-surface-variant leading-relaxed">{item.a}</p>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}

            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
              <Link className="inline-flex items-center justify-center gap-2 px-6 py-3 bg-secondary text-white font-bold rounded-xl shadow-md hover:shadow-lg transition-all" to="/services">
                <span className="material-symbols-outlined">arrow_back</span> Back to Services
              </Link>
              <Link className="inline-flex items-center justify-center gap-2 px-6 py-3 border-2 border-secondary text-secondary font-bold rounded-xl hover:bg-secondary/5 transition-all" to="/contact">
                Contact Us <span className="material-symbols-outlined">support_agent</span>
              </Link>
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
