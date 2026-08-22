import { useEffect } from 'react';

export function useScrollLock(active: boolean) {
  useEffect(() => {
    if (!active) return;
    const htmlPrev = document.documentElement.style.overflow;
    const bodyPrev = document.body.style.overflow;
    document.documentElement.style.overflow = 'hidden';
    document.body.style.overflow = 'hidden';
    return () => {
      document.documentElement.style.overflow = htmlPrev;
      document.body.style.overflow = bodyPrev;
    };
  }, [active]);
}
