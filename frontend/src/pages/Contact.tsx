import { useState } from 'react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import { supabase } from '../supabaseClient';


export default function Contact() {
  const [form, setForm] = useState({ name: '', email: '', phone: '', message: '' });
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) return;
    setSending(true);
    setError(null);
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const { error: insertError } = await supabase.from('inquiries').insert({
        sender_name: form.name.trim(),
        sender_email: form.email.trim() || null,
        sender_phone: form.phone.trim() || null,
        subject: 'Contact Form Inquiry',
        message: form.message.trim(),
        status: 'Open',
        created_by: session?.user?.id ?? null,
      });
      if (insertError) throw new Error(insertError.message);
      setSent(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send your inquiry. Please try again.');
    } finally {
      setSending(false);
    }
  };
  return (
    <div className="bg-surface text-on-background font-body-md selection:bg-secondary/30 bg-gradient-to-br from-surface-container-low -mt-4">
      <SiteHeader active="/contact" />

      <main className="pt-20 w-full flex flex-col">
        <header className="relative w-full min-h-[200px] md:min-h-[250px] md:h-[350px] flex items-center overflow-hidden bg-primary-container">
          <div className="absolute inset-0 opacity-10 map-texture"></div>
          <div className="relative z-10 px-margin-mobile md:px-margin-desktop py-8 md:py-lg max-w-4xl">
            <h1 className="font-display-lg text-display-lg-mobile md:text-display-lg text-white mb-sm">Get in Touch</h1>
            <p className="font-body-md text-body-md text-surface-variant max-w-2xl">
              We are here to serve and protect our community. Reach out to our 24/7 response unit or visit us during office hours.
            </p>
            <div className="mt-6 md:mt-lg flex flex-wrap gap-2 md:gap-md">
              <div className="flex items-center gap-xs text-secondary-fixed-dim font-medium px-md py-xs bg-white/10 rounded-full shadow-sm border border-outline-variant/30 backdrop-blur-md">
                <span className="material-symbols-outlined text-[18px] md:text-[20px]">verified_user</span>
                <span className="font-label-md text-[12px] md:text-label-md text-white">Accredited LGU Service</span>
              </div>
              <div className="flex items-center gap-xs text-secondary-fixed-dim font-medium px-md py-xs bg-white/10 rounded-full shadow-sm border border-outline-variant/30 backdrop-blur-md">
                <span className="material-symbols-outlined text-[18px] md:text-[20px]">support_agent</span>
                <span className="font-label-md text-[12px] md:text-label-md text-white">24/7 Response Unit</span>
              </div>
            </div>
          </div>
        </header>

        <section className="px-margin-mobile md:px-margin-desktop py-8 md:py-xl bg-background">
          <div className="flex flex-col gap-5 sm:gap-8 md:gap-lg max-w-5xl mx-auto">
            <div className="w-full order-1">
              <div className="glass-card rounded-2xl p-4 md:p-lg shadow-sm border border-outline-variant/50 !bg-white !border-t-2 transition-all hover:-translate-y-1 hover:shadow-lg">
                <div className="mb-4 md:mb-lg">
                  <h2 className="font-headline-lg text-headline-lg-mobile md:text-[28px] text-on-surface mb-xs">Send a Secure Message</h2>
                  <p className="font-body-md text-body-md text-on-surface-variant">Your inquiries are handled with strict confidentiality by our administrative staff.</p>
                </div>
                {sent ? (
              <div className="space-y-4 md:space-y-md">
                    <div className="flex flex-col items-center text-center gap-2 md:gap-sm py-6 md:py-md">
                      <span className="w-12 h-12 md:w-14 md:h-14 rounded-full bg-success-green/10 text-success-green flex items-center justify-center">
                        <span className="material-symbols-outlined text-3xl">check_circle</span>
                      </span>
                      <h3 className="font-headline-md text-headline-md text-on-surface">Inquiry Sent</h3>
                      <p className="font-body-md text-body-md text-on-surface-variant max-w-md">
                        Thank you, {form.name.trim()}! Your inquiry has been delivered to the Barangay desk.
                        You can track the conversation in your portal under <span className="font-semibold text-on-surface">Case Chat &amp; Messages</span>.
                      </p>
                      <button
                        type="button"
                        onClick={() => {
                          setSent(false);
                          setForm({ name: '', email: '', phone: '', message: '' });
                        }}
                        className="px-lg py-3 md:py-md border border-outline-variant text-on-surface-variant font-label-md rounded-xl hover:bg-white transition-all"
                      >
                        Send Another Inquiry
                      </button>
                    </div>
                  </div>
                ) : (
                <form className="space-y-4 md:space-y-md" onSubmit={submit}>
                  <div className="flex flex-col md:grid md:grid-cols-2 gap-4 md:gap-md">
                    <div className="space-y-xs">
                      <label className="font-label-md text-label-md text-on-surface">Full Name</label>
                      <input className="w-full h-12 rounded-lg bg-white border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all px-md" placeholder="Juan Dela Cruz" type="text" required value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
                    </div>
                    <div className="space-y-xs">
                      <label className="font-label-md text-label-md text-on-surface">Email Address</label>
                      <input className="w-full h-12 rounded-lg bg-white border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all px-md" placeholder="juan@example.com" type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />
                    </div>
                  </div>
                  <div className="space-y-xs">
                    <label className="font-label-md text-label-md text-on-surface">Phone Number</label>
                      <input className="w-full h-12 rounded-lg bg-white border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all px-md" placeholder="+63 900 000 0000" type="tel" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />
                  </div>
                  <div className="space-y-xs">
                    <label className="font-label-md text-label-md text-on-surface">Message</label>
                    <textarea className="w-full rounded-lg bg-white border border-outline-variant focus:border-secondary focus:ring-2 focus:ring-secondary/20 transition-all px-4 py-3 md:px-md md:py-md" placeholder="How can we assist you today?" rows={4} required value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })}></textarea>
                  </div>
                  {error && <p className="font-body-sm text-body-sm text-error-red">{error}</p>}
                  <button className="w-full md:w-auto px-lg py-3 bg-secondary text-white font-label-md text-label-md rounded-xl shadow-md hover:shadow-lg active:scale-95 transition-all flex items-center justify-center gap-base disabled:opacity-50" type="submit" disabled={sending}>
                    <span className="material-symbols-outlined">{sending ? 'hourglass_top' : 'send'}</span>
                    {sending ? 'Sending…' : 'Submit Inquiry'}
                  </button>
                </form>
                )}
              </div>
            </div>
            <div className="w-full space-y-5 sm:space-y-8 md:space-y-lg order-2">
              <div className="space-y-4 md:space-y-md">
                <h3 className="font-label-md text-label-md text-secondary uppercase tracking-widest flex items-center gap-xs">
                  <span className="w-1 h-4 bg-secondary rounded-full"></span>
                  Contact Directory
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 md:gap-md">
                  <div className="flex items-center gap-3 md:gap-md p-3.5 sm:p-4 md:p-md bg-white rounded-xl border border-outline-variant/30 shadow-sm border-t-2 border-secondary">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-error-container rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-error font-bold">call</span>
                    </div>
                    <div>
                      <p className="font-caption text-caption text-on-surface-variant uppercase tracking-widest">Emergency Hotline</p>
                      <p className="font-headline-md text-headline-md text-on-surface font-bold">911</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 md:gap-md p-3.5 sm:p-4 md:p-md bg-white rounded-xl border border-outline-variant/30 shadow-sm border-t-2 border-secondary">
                    <div className="w-10 h-10 sm:w-12 sm:h-12 bg-surface-container-high rounded-lg flex items-center justify-center flex-shrink-0">
                      <span className="material-symbols-outlined text-secondary">mail</span>
                    </div>
                    <div className="overflow-hidden">
                      <p className="font-caption text-caption text-on-surface-variant uppercase tracking-widest">Official Email</p>
                      <p className="font-body-md text-body-md text-on-surface font-bold truncate">brgy.culiat@yahoo.com.ph</p>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-md">
                <h3 className="font-label-md text-label-md text-secondary uppercase tracking-widest flex items-center gap-xs">
                  <span className="w-1 h-4 bg-secondary rounded-full"></span>
                  Official Headquarters
                </h3>
                <div className="p-3.5 sm:p-4 md:p-md bg-white rounded-xl border border-outline-variant/30 shadow-sm space-y-sm">
                  <p className="font-body-md text-body-md text-on-surface">Culiat Barangay Hall,<br />467 Tandang Sora Ave,<br />Quezon City, 1128 Metro Manila</p>
                  <div className="inline-flex items-center gap-xs bg-surface-container-low px-md py-xs rounded-full border border-outline-variant/20">
                    <span className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></span>
                    <span className="font-label-md text-label-md text-on-surface-variant uppercase tracking-widest text-[10px]">Office Hours: Mon - Fri (8AM - 5PM)</span>
                  </div>
                </div>
              </div>
              <div className="relative w-full h-40 sm:h-48 md:h-64 rounded-2xl overflow-hidden shadow-sm border border-outline-variant/30 map-texture group flex flex-col">
                <div className="absolute inset-0 bg-secondary/5"></div>
                <div className="relative flex-1 flex items-center justify-center">
                  <div className="text-center">
                    <span className="material-symbols-outlined text-secondary text-4xl mb-xs drop-shadow-md animate-bounce">location_on</span>
                    <p className="font-label-md text-label-md text-on-surface">View on Google Maps</p>
                  </div>
                </div>
                <div className="relative mx-3 mb-3 bg-white/95 backdrop-blur-sm p-sm rounded-lg flex items-center justify-between border border-outline-variant/50">
                  <span className="font-caption text-caption text-on-surface-variant">&copy; OpenStreetMap</span>
                  <button className="bg-secondary text-white px-md py-xs rounded text-caption font-label-md hover:shadow-md transition-all">Open</button>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="bg-surface-container-low py-8 md:py-xl border-y border-outline-variant/30">
          <div className="px-margin-mobile md:px-margin-desktop text-center max-w-3xl mx-auto">
            <span className="material-symbols-outlined text-secondary text-4xl mb-3 md:mb-md">verified</span>
            <h2 className="font-headline-lg text-headline-lg-mobile md:text-[28px] text-on-surface mb-3 md:mb-md">Integrity and Transparency</h2>
            <p className="font-body-md text-body-md text-on-surface-variant mb-6 md:mb-lg">
              We are committed to providing every citizen with the support they deserve. Reach out via our official portal for feedback or FOI requests.
            </p>
            <div className="flex flex-col md:flex-row justify-center gap-3 md:gap-md">
              <button className="w-full md:w-auto px-lg py-3 border-2 border-secondary text-secondary font-label-md rounded-xl hover:bg-secondary/5 transition-all">View FAQ</button>
              <button className="w-full md:w-auto px-lg py-3 border-2 border-outline text-on-surface-variant font-label-md rounded-xl hover:bg-white transition-all">FOI Portal</button>
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
