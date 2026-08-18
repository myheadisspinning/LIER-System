import { useEffect, useState } from 'react';
import { useLocation } from 'react-router-dom';

export default function PageLoader() {
  const { pathname } = useLocation();
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setLoading(true);
    window.scrollTo(0, 0);
    const timer = setTimeout(() => setLoading(false), 500);
    return () => clearTimeout(timer);
  }, [pathname]);

  if (!loading) return null;

  return (
    <div className="fixed inset-0 z-[999] flex flex-col items-center justify-center bg-background/80 backdrop-blur-sm transition-opacity duration-200">
      <div className="w-12 h-12 rounded-full border-4 border-secondary border-t-transparent animate-spin" />
      <p className="mt-4 text-sm text-on-surface-variant">Loading...</p>
    </div>
  );
}
