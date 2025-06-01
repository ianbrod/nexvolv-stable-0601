'use client';

import { useState, useEffect, useCallback } from 'react';

interface GoalAccordionResizeState {
  width: number;
  isResizing: boolean;
}

interface UseGoalAccordionResizeOptions {
  goalId: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
  containerRef?: React.RefObject<HTMLElement>;
}

interface UseGoalAccordionResizeReturn {
  width: number;
  isResizing: boolean;
  setWidth: (width: number) => void;
  startResize: () => void;
  stopResize: () => void;
  resetToDefault: () => void;
  getConstrainedWidth: (newWidth: number) => number;
}

// Panel resize state interface
interface PanelResizeState {
  width: number;
  isResizing: boolean;
}

interface UsePanelResizeOptions {
  panelId: string;
  defaultWidth?: number;
  minWidth?: number;
  maxWidth?: number;
}

interface UsePanelResizeReturn {
  width: number;
  isResizing: boolean;
  setWidth: (width: number) => void;
  startResize: () => void;
  stopResize: () => void;
  resetToDefault: () => void;
  getConstrainedWidth: (newWidth: number) => number;
}

const DEFAULT_WIDTH = 400;
const MIN_WIDTH = 200;
const MAX_WIDTH_RATIO = 0.8; // 80% of container width

/**
 * Custom hook for managing goal accordion resize functionality
 */
export function useGoalAccordionResize({
  goalId,
  defaultWidth = DEFAULT_WIDTH,
  minWidth = MIN_WIDTH,
  maxWidth,
  containerRef
}: UseGoalAccordionResizeOptions): UseGoalAccordionResizeReturn {
  const [state, setState] = useState<GoalAccordionResizeState>({
    width: defaultWidth,
    isResizing: false
  });

  // Storage key for localStorage
  const storageKey = `goalAccordionWidth_${goalId}`;

  // Calculate maximum width based on container or window
  const calculateMaxWidth = useCallback((): number => {
    if (maxWidth) return maxWidth;

    if (containerRef?.current) {
      return Math.floor(containerRef.current.clientWidth * MAX_WIDTH_RATIO);
    }

    // Fallback to window width if no container ref
    if (typeof window !== 'undefined') {
      return Math.floor(window.innerWidth * MAX_WIDTH_RATIO);
    }

    return 800; // Fallback value
  }, [maxWidth, containerRef]);

  // Get constrained width within min/max bounds
  const getConstrainedWidth = useCallback((newWidth: number): number => {
    const maxWidthValue = calculateMaxWidth();
    return Math.max(minWidth, Math.min(maxWidthValue, newWidth));
  }, [minWidth, calculateMaxWidth]);

  // Load saved width from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedWidth = localStorage.getItem(storageKey);
      if (savedWidth) {
        const parsedWidth = parseInt(savedWidth, 10);
        if (!isNaN(parsedWidth)) {
          const constrainedWidth = getConstrainedWidth(parsedWidth);
          setState(prev => ({ ...prev, width: constrainedWidth }));
        }
      }
    } catch (error) {
      console.warn('Failed to load accordion width from localStorage:', error);
    }
  }, [goalId, storageKey, getConstrainedWidth]);

  // Save width to localStorage when it changes
  const saveWidth = useCallback((width: number) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(storageKey, width.toString());
    } catch (error) {
      console.warn('Failed to save accordion width to localStorage:', error);
    }
  }, [storageKey]);

  // Set width with constraints and persistence
  const setWidth = useCallback((newWidth: number) => {
    const constrainedWidth = getConstrainedWidth(newWidth);
    setState(prev => ({ ...prev, width: constrainedWidth }));
    saveWidth(constrainedWidth);
  }, [getConstrainedWidth, saveWidth]);

  // Start resize operation
  const startResize = useCallback(() => {
    setState(prev => ({ ...prev, isResizing: true }));

    // Add body class for global cursor styling
    if (typeof document !== 'undefined') {
      document.body.classList.add('goal-accordion-resizing');
    }
  }, []);

  // Stop resize operation
  const stopResize = useCallback(() => {
    setState(prev => ({ ...prev, isResizing: false }));

    // Remove body class
    if (typeof document !== 'undefined') {
      document.body.classList.remove('goal-accordion-resizing');
    }
  }, []);

  // Reset to default width
  const resetToDefault = useCallback(() => {
    const constrainedDefault = getConstrainedWidth(defaultWidth);
    setState(prev => ({ ...prev, width: constrainedDefault }));
    saveWidth(constrainedDefault);
  }, [defaultWidth, getConstrainedWidth, saveWidth]);

  // Handle window resize to adjust max width constraints
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleWindowResize = () => {
      const currentMaxWidth = calculateMaxWidth();
      if (state.width > currentMaxWidth) {
        setWidth(currentMaxWidth);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [state.width, calculateMaxWidth, setWidth]);

  return {
    width: state.width,
    isResizing: state.isResizing,
    setWidth,
    startResize,
    stopResize,
    resetToDefault,
    getConstrainedWidth
  };
}

/**
 * Custom hook for managing panel resize functionality (for goals page layout)
 */
export function usePanelResize({
  panelId,
  defaultWidth = DEFAULT_WIDTH,
  minWidth = MIN_WIDTH,
  maxWidth
}: UsePanelResizeOptions): UsePanelResizeReturn {
  const [state, setState] = useState<PanelResizeState>({
    width: defaultWidth,
    isResizing: false
  });

  // Storage key for localStorage
  const storageKey = `panelWidth_${panelId}`;

  // Calculate maximum width based on window
  const calculateMaxWidth = useCallback((): number => {
    if (maxWidth) return maxWidth;

    // Use window width for panel calculations
    if (typeof window !== 'undefined') {
      // Allow the panel to extend to approximately the middle of the page
      // Account for responsive layout: categories panel is hidden on mobile (< 768px)
      const isMobile = window.innerWidth < 768;
      const categoriesPanelWidth = isMobile ? 0 : 256; // Categories panel width (w-64 in Tailwind, hidden on mobile)
      const mainLayoutPadding = 48; // Main layout padding (p-6 = 24px on each side)
      const goalsPanelMinSpace = 300; // Minimum space to leave for goals panel

      const availableWidth = window.innerWidth - categoriesPanelWidth - mainLayoutPadding;
      const maxTaskPanelWidth = availableWidth - goalsPanelMinSpace;

      // Allow up to 50% of the available width, but respect the minimum goals panel space
      return Math.floor(Math.min(availableWidth * 0.5, maxTaskPanelWidth));
    }

    return 800; // Fallback value
  }, [maxWidth]);

  // Get constrained width within min/max bounds
  const getConstrainedWidth = useCallback((newWidth: number): number => {
    const maxWidthValue = calculateMaxWidth();
    return Math.max(minWidth, Math.min(maxWidthValue, newWidth));
  }, [minWidth, calculateMaxWidth]);

  // Load saved width from localStorage on mount
  useEffect(() => {
    if (typeof window === 'undefined') return;

    try {
      const savedWidth = localStorage.getItem(storageKey);
      if (savedWidth) {
        const parsedWidth = parseInt(savedWidth, 10);
        if (!isNaN(parsedWidth)) {
          const constrainedWidth = getConstrainedWidth(parsedWidth);
          setState(prev => ({ ...prev, width: constrainedWidth }));
        }
      }
    } catch (error) {
      console.warn('Failed to load panel width from localStorage:', error);
    }
  }, [panelId, storageKey, getConstrainedWidth]);

  // Save width to localStorage when it changes
  const saveWidth = useCallback((width: number) => {
    if (typeof window === 'undefined') return;

    try {
      localStorage.setItem(storageKey, width.toString());
    } catch (error) {
      console.warn('Failed to save panel width to localStorage:', error);
    }
  }, [storageKey]);

  // Set width with constraints and persistence
  const setWidth = useCallback((newWidth: number) => {
    const constrainedWidth = getConstrainedWidth(newWidth);
    setState(prev => ({ ...prev, width: constrainedWidth }));
    saveWidth(constrainedWidth);
  }, [getConstrainedWidth, saveWidth]);

  // Start resize operation
  const startResize = useCallback(() => {
    setState(prev => ({ ...prev, isResizing: true }));

    // Add body class for global cursor styling
    if (typeof document !== 'undefined') {
      document.body.classList.add('panel-resizing');
    }
  }, []);

  // Stop resize operation
  const stopResize = useCallback(() => {
    setState(prev => ({ ...prev, isResizing: false }));

    // Remove body class
    if (typeof document !== 'undefined') {
      document.body.classList.remove('panel-resizing');
    }
  }, []);

  // Reset to default width
  const resetToDefault = useCallback(() => {
    const constrainedDefault = getConstrainedWidth(defaultWidth);
    setState(prev => ({ ...prev, width: constrainedDefault }));
    saveWidth(constrainedDefault);
  }, [defaultWidth, getConstrainedWidth, saveWidth]);

  // Handle window resize to adjust max width constraints
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleWindowResize = () => {
      const currentMaxWidth = calculateMaxWidth();
      if (state.width > currentMaxWidth) {
        setWidth(currentMaxWidth);
      }
    };

    window.addEventListener('resize', handleWindowResize);
    return () => window.removeEventListener('resize', handleWindowResize);
  }, [state.width, calculateMaxWidth, setWidth]);

  return {
    width: state.width,
    isResizing: state.isResizing,
    setWidth,
    startResize,
    stopResize,
    resetToDefault,
    getConstrainedWidth
  };
}
