'use client';

import { useState, useEffect } from 'react';

export function SkipLink() {
  const [isVisible, setIsVisible] = useState(false);

  // Handle keyboard focus
  const handleFocus = () => setIsVisible(true);
  const handleBlur = () => setIsVisible(false);

  // Handle keyboard activation
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const mainContent = document.getElementById('main-content');
      if (mainContent) {
        mainContent.focus();
        mainContent.scrollIntoView();
      }
    }
  };

  return (
    <a
      href="#main-content"
      className={`
        fixed top-4 left-4 z-50 bg-primary text-primary-foreground px-4 py-2 rounded-md
        transition-opacity duration-200 outline-none focus:ring-2 focus:ring-ring
        ${isVisible ? 'opacity-100' : 'opacity-0 pointer-events-none'}
      `}
      onFocus={handleFocus}
      onBlur={handleBlur}
      onKeyDown={handleKeyDown}
    >
      Skip to main content
    </a>
  );
}
