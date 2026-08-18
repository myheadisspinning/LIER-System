import { Link } from 'react-router-dom';

export default function SiteFooter() {
  return (
    <footer className="w-full py-xl md:px-margin-desktop grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-lg bg-surface-container-lowest border-t border-outline-variant px-margin-desktop">
      <div className="flex flex-col gap-sm text-center md:text-left">
        <div className="flex items-center justify-center md:justify-start gap-xs">
          <div className="w-10 h-10 rounded-full overflow-hidden border border-outline-variant flex items-center justify-center">
            <img alt="Barangay Culiat Logo" className="w-full h-full object-cover" src="/image/culiat-logo.png" />
          </div>
          <span className="font-headline-md text-headline-md text-primary">Barangay Culiat</span>
        </div>
        <p className="font-caption text-caption text-on-surface-variant">&copy; 2025 Barangay Culiat Law Enforcement. Public Safety &amp; Transparency Portal.</p>
      </div>
      <div className="flex flex-col gap-xs text-center md:text-left">
        <p className="font-label-md text-label-md text-on-surface font-bold">Address</p>
        <p className="font-body-sm text-on-surface-variant">467 Tandang Sora Ave,<br />Quezon City, 1128 Metro Manila</p>
        <p className="font-body-sm text-on-surface-variant mt-xs">0962-582-1531 / 856-722-60</p>
        <p className="font-body-sm text-on-surface-variant">brgy.culiat@yahoo.com.ph</p>
      </div>
      <div className="grid grid-cols-2 gap-x-6 gap-y-sm text-center md:text-left">
        <p className="font-label-md text-label-md text-on-surface font-bold col-span-2 md:col-span-1">Quick Links</p>
        <Link className="font-body-sm text-on-surface-variant hover:underline hover:text-primary transition-all" to="/contact">Contact Us</Link>
        <Link className="font-body-sm text-on-surface-variant hover:underline hover:text-primary transition-all" to="/officials">Officials</Link>
        <Link className="font-body-sm text-on-surface-variant hover:underline hover:text-primary transition-all" to="/services">Services</Link>
        <Link className="font-body-sm text-on-surface-variant hover:underline hover:text-primary transition-all" to="/elder-guide">Elder Guide</Link>
        <Link className="font-body-sm text-on-surface-variant hover:underline hover:text-primary transition-all" to="/faq">FAQ</Link>
        <Link className="font-body-sm text-on-surface-variant hover:underline hover:text-primary transition-all" to="/about">About</Link>
      </div>
    </footer>
  );
}
