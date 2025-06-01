'use client';

import { useEffect, useState } from 'react';
import { useViewPreferencesStore } from '@/stores/viewPreferencesStore';
import { useThemeStore } from '@/stores/themeStore';
import { useAIConfigStore } from '@/stores/aiConfigStore';

interface StoreHydrationProps {
  children: React.ReactNode;
}

export function StoreHydration({ children }: StoreHydrationProps) {
  const [isHydrated, setIsHydrated] = useState(false);

  useEffect(() => {
    // Rehydrate both stores from localStorage
    const rehydrateStores = async () => {
      try {
        // Rehydrate view preferences store
        await useViewPreferencesStore.persist.rehydrate();

        // Rehydrate theme store
        await useThemeStore.persist.rehydrate();

        // Rehydrate AI config store
        await useAIConfigStore.persist.rehydrate();

        // Mark as hydrated
        setIsHydrated(true);
      } catch (error) {
        console.error('Error rehydrating stores:', error);
        // Still mark as hydrated to prevent infinite loading
        setIsHydrated(true);
      }
    };

    rehydrateStores();
  }, []);

  // Don't render children until stores are hydrated to prevent flash of default values
  if (!isHydrated) {
    return (
      <div className="flex h-screen items-center justify-center bg-background">
        <div className="text-muted-foreground">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
