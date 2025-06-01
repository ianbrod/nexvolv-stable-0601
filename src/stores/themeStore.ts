import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export type Theme = 'light' | 'dark';

interface ThemeState {
  theme: Theme;
  setTheme: (theme: Theme) => void;
}

// Server-side default state (cached to prevent infinite loops)
const serverState = {
  theme: 'light' as const,
};

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      ...serverState,
      setTheme: (theme) => set({ theme }),
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);