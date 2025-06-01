import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// Define the structure for storing scroll positions
interface ScrollPositions {
  taskList: number;
  // Add more components as needed
  [key: string]: number;
}

interface ScrollPositionState {
  // Store scroll positions for different components
  positions: ScrollPositions;

  // Function to save a scroll position
  saveScrollPosition: (componentId: string, position: number) => void;

  // Function to get a scroll position
  getScrollPosition: (componentId: string) => number;

  // Function to clear all scroll positions
  clearScrollPositions: () => void;
}

// Server-side default state (cached to prevent infinite loops)
const serverState = {
  positions: {
    taskList: 0,
  },
};

export const useScrollPositionStore = create<ScrollPositionState>()(
  persist(
    (set, get) => ({
      ...serverState,

      saveScrollPosition: (componentId: string, position: number) =>
        set((state) => ({
          positions: {
            ...state.positions,
            [componentId]: position,
          },
        })),

      getScrollPosition: (componentId: string) => {
        const { positions } = get();
        return positions[componentId] || 0;
      },

      clearScrollPositions: () =>
        set({ positions: { taskList: 0 } }),
    }),
    {
      name: 'scroll-position-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: true,
    }
  )
);
