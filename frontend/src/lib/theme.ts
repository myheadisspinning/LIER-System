import { useCallback, useState } from 'react';

export type Theme = 'dark' | 'light';

const THEME_KEY = 'culiat-theme';

export function getStoredTheme(): Theme {
  try {
    return localStorage.getItem(THEME_KEY) === 'light' ? 'light' : 'dark';
  } catch {
    return 'dark';
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
  try {
    localStorage.setItem(THEME_KEY, theme);
  } catch {
    // ignore storage failures
  }
}

export function useTheme(): [Theme, () => void] {
  const [theme, setTheme] = useState<Theme>(() =>
    document.documentElement.dataset.theme === 'light' ? 'light' : 'dark',
  );

  const toggleTheme = useCallback(() => {
    const root = document.documentElement;
    const next: Theme = root.dataset.theme === 'light' ? 'dark' : 'light';
    root.classList.add('theme-transition');
    void root.offsetHeight;
    applyTheme(next);
    setTheme(next);
    window.setTimeout(() => root.classList.remove('theme-transition'), 350);
  }, []);

  return [theme, toggleTheme];
}
