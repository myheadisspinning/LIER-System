import { useEffect, useRef, useCallback } from 'react';

declare global {
  interface Window {
    turnstile?: {
      render: (
        container: HTMLElement,
        options: {
          sitekey: string;
          theme?: string;
          size?: string;
          callback?: (token: string) => void;
          'expired-callback'?: () => void;
          'error-callback'?: () => void;
        },
      ) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
  }
}

const SCRIPT_SRC = 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

interface TurnstileCaptchaProps {
  siteKey: string;
  onToken: (token: string | null) => void;
  theme?: 'auto' | 'light' | 'dark';
  className?: string;
}

export default function TurnstileCaptcha({
  siteKey,
  onToken,
  theme = 'auto',
  className = '',
}: TurnstileCaptchaProps) {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const widgetIdRef = useRef<string | null>(null);

  const handleExpire = useCallback(() => {
    onToken(null);
  }, [onToken]);

  const handleError = useCallback(() => {
    onToken(null);
  }, [onToken]);

  useEffect(() => {
    if (!containerRef.current) return;
    if (!siteKey) return;

    let cancelled = false;

    const loadScript = (): Promise<void> => {
      return new Promise((resolve) => {
        if (window.turnstile) {
          resolve();
          return;
        }
        const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
        if (existing) {
          existing.addEventListener('load', () => resolve(), { once: true });
          if (existing.readyState === 'complete') resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = SCRIPT_SRC;
        script.async = true;
        script.onload = () => resolve();
        document.head.appendChild(script);
      });
    };

    void loadScript().then(() => {
      if (cancelled || !containerRef.current || !window.turnstile) return;

      // Remove any existing widget in this container
      if (widgetIdRef.current != null) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* noop */ }
      }

      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: siteKey,
        theme,
        size: 'normal',
        callback: (token) => {
          if (!cancelled) onToken(token);
        },
        'expired-callback': () => {
          if (!cancelled) handleExpire();
        },
        'error-callback': () => {
          if (!cancelled) handleError();
        },
      });
    });

    return () => {
      cancelled = true;
      if (widgetIdRef.current != null && window.turnstile) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* noop */ }
        widgetIdRef.current = null;
      }
    };
  }, [siteKey, theme, onToken, handleExpire, handleError]);

  return <div ref={containerRef} className={className} />;
}