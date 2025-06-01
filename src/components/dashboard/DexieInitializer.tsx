// src/components/dashboard/DexieInitializer.tsx
'use client';

import React, { useEffect, useState, useCallback } from 'react';
import { db } from '@/lib/db';

interface DexieInitializerProps {
  children: React.ReactNode;
}

export function DexieInitializer({ children }: DexieInitializerProps) {
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    let isMounted = true; // Prevent state update on unmounted component

    const initialize = async () => {
      try {
        // Check if clearing is needed (e.g., based on a flag or timestamp)
        // For simplicity now, we clear every time. Consider optimization later.
        console.log('[DexieInitializer] Clearing local Dexie tables (tasks, goals)...');
        await db.tasks.clear();
        await db.goals.clear();
        console.log('[DexieInitializer] Local Dexie tables cleared.');
        if (isMounted) {
          setIsInitialized(true);
        }
      } catch (error) {
        console.error('[DexieInitializer] Error clearing Dexie tables:', error);
        // Allow UI to render even if clearing fails
        if (isMounted) {
          setIsInitialized(true);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false; // Cleanup function
    };
  }, []); // Run only once on mount

  // Show a loading state until Dexie is cleared/initialized
  if (!isInitialized) {
    return <div className="p-4">Initializing dashboard...</div>;
  }

  // Render children once initialization is complete
  return <>{children}</>;
}

export default React.memo(DexieInitializer);