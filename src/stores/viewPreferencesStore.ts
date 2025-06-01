import React from 'react';
import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { useShallow } from 'zustand/react/shallow';

interface ViewPreferencesState {
  taskView: 'list' | 'kanban' | 'focus';
  calendarView: 'week' | 'month' | 'year';
  collapseLeftPanel: boolean;
  collapseRightPanel: boolean;
  showCompletedTasks: boolean;
  rightPanelWidth: number;
  timeSlotStartHour: number;
  timeSlotEndHour: number;
  setTaskView: (view: 'list' | 'kanban' | 'focus') => void;
  setCalendarView: (view: 'week' | 'month' | 'year') => void;
  setCollapseLeftPanel: (collapse: boolean) => void;
  setCollapseRightPanel: (collapse: boolean) => void;
  setShowCompletedTasks: (show: boolean) => void;
  setRightPanelWidth: (width: number) => void;
  setTimeSlotStartHour: (hour: number) => void;
  setTimeSlotEndHour: (hour: number) => void;
}

// Default width for the right panel in pixels
const DEFAULT_RIGHT_PANEL_WIDTH = 320; // 'w-80' in Tailwind is 20rem = 320px

// Server-side default state (cached to prevent infinite loops)
const serverState = {
  taskView: 'list' as const,
  calendarView: 'week' as const,
  collapseLeftPanel: false,
  collapseRightPanel: false,
  showCompletedTasks: false,
  rightPanelWidth: DEFAULT_RIGHT_PANEL_WIDTH,
  timeSlotStartHour: 5, // Default 5 AM
  timeSlotEndHour: 23, // Default 11 PM (maintains 19-hour block)
};

export const useViewPreferencesStore = create<ViewPreferencesState>()(
  persist(
    (set) => ({
      ...serverState,
      setTaskView: (view) => set({ taskView: view }),
      setCalendarView: (view) => set({ calendarView: view }),
      setCollapseLeftPanel: (collapse) => set({ collapseLeftPanel: collapse }),
      setCollapseRightPanel: (collapse) => set({ collapseRightPanel: collapse }),
      setShowCompletedTasks: (show) => set({ showCompletedTasks: show }),
      setRightPanelWidth: (width) => set({ rightPanelWidth: width }),
      setTimeSlotStartHour: (hour) => set({ timeSlotStartHour: hour }),
      setTimeSlotEndHour: (hour) => set({ timeSlotEndHour: hour }),
    }),
    {
      name: 'view-preferences-storage',
      storage: createJSONStorage(() => localStorage),
      skipHydration: false, // Enable hydration to fix time picker issue
    }
  )
);

// Optimized selectors to prevent unnecessary re-renders
export const useTaskView = () => useViewPreferencesStore((state) => state.taskView);
export const useCalendarView = () => useViewPreferencesStore((state) => state.calendarView);
export const useLeftPanelCollapsed = () => useViewPreferencesStore((state) => state.collapseLeftPanel);
export const useCollapseLeftPanel = () => useViewPreferencesStore((state) => state.collapseLeftPanel);
export const useRightPanelCollapsed = () => useViewPreferencesStore((state) => state.collapseRightPanel);
export const useCollapseRightPanel = () => useViewPreferencesStore((state) => state.collapseRightPanel);
export const useShowCompletedTasks = () => useViewPreferencesStore((state) => state.showCompletedTasks);
export const useRightPanelWidth = () => useViewPreferencesStore((state) => state.rightPanelWidth);

// Optimized action selectors - individual functions to avoid object recreation
export const useSetTaskView = () => useViewPreferencesStore((state) => state.setTaskView);
export const useSetCalendarView = () => useViewPreferencesStore((state) => state.setCalendarView);
export const useSetCollapseLeftPanel = () => useViewPreferencesStore((state) => state.setCollapseLeftPanel);
export const useSetCollapseRightPanel = () => useViewPreferencesStore((state) => state.setCollapseRightPanel);
export const useSetRightPanelWidth = () => useViewPreferencesStore((state) => state.setRightPanelWidth);
export const useSetShowCompletedTasks = () => useViewPreferencesStore((state) => state.setShowCompletedTasks);

// Combined selectors using useShallow for multiple values
export const useTaskViewState = () => useViewPreferencesStore(
  useShallow((state) => ({
    taskView: state.taskView,
    showCompletedTasks: state.showCompletedTasks,
  }))
);

export const usePanelState = () => useViewPreferencesStore(
  useShallow((state) => ({
    collapseLeftPanel: state.collapseLeftPanel,
    collapseRightPanel: state.collapseRightPanel,
    rightPanelWidth: state.rightPanelWidth,
  }))
);

export const useTimeSlotSettings = () => useViewPreferencesStore(
  useShallow((state) => ({
    timeSlotStartHour: state.timeSlotStartHour,
    timeSlotEndHour: state.timeSlotEndHour,
  }))
);

// Individual selectors for time slot settings
export const useTimeSlotStartHour = () => useViewPreferencesStore((state) => state.timeSlotStartHour);
export const useTimeSlotEndHour = () => useViewPreferencesStore((state) => state.timeSlotEndHour);
export const useSetTimeSlotStartHour = () => useViewPreferencesStore((state) => state.setTimeSlotStartHour);
export const useSetTimeSlotEndHour = () => useViewPreferencesStore((state) => state.setTimeSlotEndHour);

// Hydration hook to ensure store is properly initialized
export const useHydrateViewPreferences = () => {
  React.useEffect(() => {
    useViewPreferencesStore.persist.rehydrate();
  }, []);
};