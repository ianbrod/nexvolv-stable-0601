'use client';

import { useEffect } from 'react';
import { useThemeStore } from '@/stores/themeStore';

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const { theme } = useThemeStore();

  useEffect(() => {
    const root = window.document.documentElement;

    // Remove both theme classes first
    root.classList.remove('light', 'dark');

    // Apply the selected theme
    root.classList.add(theme);
  }, [theme]);

  return <>{children}</>;
}