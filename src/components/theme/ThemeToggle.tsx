'use client';

import { useThemeStore } from '@/stores/themeStore';
import { Button } from '@/components/ui/button';
import { Sun, Moon } from 'lucide-react';
import { useEffect, useRef } from 'react';

interface ThemeToggleProps {
  iconOnly?: boolean;
}

export function ThemeToggle({ iconOnly = false }: ThemeToggleProps) {
  const { theme, setTheme } = useThemeStore();
  const buttonRef = useRef<HTMLButtonElement>(null);

  const toggleTheme = () => {
    // Toggle between light and dark, removing the system option
    setTheme(theme === 'light' ? 'dark' : 'light');
  };

  // Handle keyboard events
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      toggleTheme();
    }
  };

  // If icon only mode is enabled, render a simplified version
  if (iconOnly) {
    return (
      <Button
        variant="ghost"
        size="icon"
        onClick={toggleTheme}
        onKeyDown={handleKeyDown}
        className="h-8 w-8 rounded-md flex items-center justify-center"
        aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
        aria-pressed={theme === 'dark'}
        role="switch"
        ref={buttonRef}
        title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      >
        {theme === 'light' ? (
          <Moon className="h-7 w-7 fill-gray-700" aria-hidden="true" />
        ) : (
          <Sun className="h-7 w-7 text-amber-300 fill-amber-300 opacity-50" aria-hidden="true" />
        )}
      </Button>
    );
  }

  // Regular mode with text
  return (
    <Button
      variant="outline"
      size="sm"
      onClick={toggleTheme}
      onKeyDown={handleKeyDown}
      className="w-full text-xs flex items-center justify-center focus:ring-2 focus:ring-ring"
      aria-label={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
      aria-pressed={theme === 'dark'}
      role="switch"
      ref={buttonRef}
    >
      {theme === 'light' ? (
        <>
          <Moon className="h-7 w-7 mr-1 fill-gray-700" aria-hidden="true" />
          <span>Dark Mode</span>
        </>
      ) : (
        <>
          <Sun className="h-7 w-7 mr-1 text-amber-300 fill-amber-300 opacity-50" aria-hidden="true" />
          <span>Light Mode</span>
        </>
      )}
    </Button>
  );
}