'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { SidebarNavClient } from './SidebarNavClient';
import { AIAssistant } from '@/components/ai/AIAssistant';
import { usePanelState, useSetCollapseLeftPanel, useSetCollapseRightPanel, useSetRightPanelWidth } from '@/stores/viewPreferencesStore';
import { useAIConfigStore, AI_PROVIDERS } from '@/stores/aiConfigStore';
import { ChevronLeft, ChevronRight, Lightbulb } from 'lucide-react';
import { SkipLink } from '@/components/accessibility/SkipLink';
import { KeyboardShortcutsHelp } from '@/components/accessibility/KeyboardShortcutsHelp';
import useSidebarObserver from '@/hooks/useSidebarObserver';
import { ResizeHandle } from './ResizeHandle';
import { Logo } from './Logo';
import { triggerUpload } from '@/lib/events/recording-events';

interface MainLayoutProps {
  children: React.ReactNode;
}

export function MainLayout({ children }: MainLayoutProps) {
  const { collapseLeftPanel, collapseRightPanel, rightPanelWidth } = usePanelState();
  const setCollapseLeftPanel = useSetCollapseLeftPanel();
  const setCollapseRightPanel = useSetCollapseRightPanel();
  const setRightPanelWidth = useSetRightPanelWidth();

  // Get current AI provider and model for dynamic title
  const { selectedProvider, model, openRouterModel } = useAIConfigStore();
  const currentProvider = AI_PROVIDERS.find(p => p.value === selectedProvider);

  // Get the current model name based on the selected provider
  const getCurrentModelName = () => {
    if (selectedProvider === 'openrouter') {
      return openRouterModel || 'anthropic/claude-3-haiku';
    } else {
      return model || (currentProvider ? currentProvider.label : 'AI Assistant');
    }
  };

  const aiAssistantTitle = getCurrentModelName();

  const [leftCollapsed, setLeftCollapsed] = useState(false);
  const [rightCollapsed, setRightCollapsed] = useState(false);

  // Refs for sidebar elements
  const leftSidebarRef = useRef<HTMLElement>(null);
  const rightSidebarRef = useRef<HTMLElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Call the observer hook, passing the refs
  useSidebarObserver([leftSidebarRef, rightSidebarRef]);

  // Custom setter for left panel that also updates the store
  const setLeftCollapsedWithStore = (collapsed: boolean) => {
    setLeftCollapsed(collapsed);
    // Only update store if we're not on mobile - this prevents mobile view from affecting desktop preferences
    if (typeof window !== 'undefined' && window.innerWidth >= 768) {
      setCollapseLeftPanel(collapsed);
    }
  };

  // Custom setter for right panel that also updates the store
  const setRightCollapsedWithStore = (collapsed: boolean) => {
    setRightCollapsed(collapsed);
    // Only update store if we're not on mobile or tablet
    if (typeof window !== 'undefined' && window.innerWidth >= 1024) {
      setCollapseRightPanel(collapsed);
    }
  };

  // Calculate max width for right panel (50% of viewport)
  const calculateMaxWidth = useCallback(() => {
    // Check if window is defined (client-side only)
    if (typeof window !== 'undefined') {
      return window.innerWidth * 0.5;
    }
    return 640; // Default fallback for server-side rendering
  }, []);

  // Calculate min width for right panel
  const calculateMinWidth = useCallback(() => {
    return 240; // Minimum width in pixels (15rem)
  }, []);

  // Handle right panel resize
  const handleRightPanelResize = useCallback((newWidth: number) => {
    setRightPanelWidth(newWidth);
  }, [setRightPanelWidth]);

  // Handle double-click to toggle between min and max width
  const handleRightPanelDoubleClick = useCallback(() => {
    const minWidth = calculateMinWidth();
    const maxWidth = calculateMaxWidth();

    // If current width is close to min width, expand to max
    // If current width is close to max width, shrink to min
    // Otherwise, expand to max (default behavior)
    const tolerance = 20; // pixels

    if (Math.abs(rightPanelWidth - minWidth) <= tolerance) {
      // Currently at min width, expand to max
      setRightPanelWidth(maxWidth);
    } else if (Math.abs(rightPanelWidth - maxWidth) <= tolerance) {
      // Currently at max width, shrink to min
      setRightPanelWidth(minWidth);
    } else {
      // Currently at some middle width, expand to max
      setRightPanelWidth(maxWidth);
    }
  }, [rightPanelWidth, calculateMinWidth, calculateMaxWidth, setRightPanelWidth]);

  // Handle keyboard shortcuts for panel collapse/expand
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    const handleKeyDown = (e: KeyboardEvent) => {
      // Alt + Left Arrow to toggle left panel
      if (e.altKey && e.key === 'ArrowLeft') {
        setLeftCollapsedWithStore(!leftCollapsed);
      }
      // Alt + Right Arrow to toggle right panel
      if (e.altKey && e.key === 'ArrowRight') {
        setRightCollapsedWithStore(!rightCollapsed);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [leftCollapsed, rightCollapsed]);

  // Check window width and apply collapse settings
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    const checkWidth = () => {
      if (window.innerWidth < 768) {
        // On mobile, always start with collapsed panels
        setLeftCollapsed(true);
        setRightCollapsed(true);
      } else if (window.innerWidth < 1024) {
        // On tablets, collapse right panel but show left panel if user preference allows
        setLeftCollapsed(collapseLeftPanel);
        setRightCollapsed(true);
      } else {
        // On desktop, respect user preferences
        setLeftCollapsed(collapseLeftPanel);
        setRightCollapsed(collapseRightPanel);
      }
    };

    // Initial check
    checkWidth();

    // Add event listener for window resize
    window.addEventListener('resize', checkWidth);

    // Cleanup
    return () => window.removeEventListener('resize', checkWidth);
  }, [collapseLeftPanel, collapseRightPanel]);

  // Update panel width constraints when window is resized
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    const handleResize = () => {
      const maxWidth = calculateMaxWidth();
      // If current panel width exceeds the new max width, adjust it
      if (!rightCollapsed && rightPanelWidth > maxWidth) {
        setRightPanelWidth(maxWidth);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [calculateMaxWidth, rightCollapsed, rightPanelWidth, setRightPanelWidth]);

  // Global drag-and-drop functionality for automatic upload modal activation
  useEffect(() => {
    // Only run on client-side
    if (typeof window === 'undefined') return;

    let modalTriggered = false;
    let dragTimeout: NodeJS.Timeout | null = null;

    const handleGlobalDragOver = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Only trigger modal once per drag session and only if files are being dragged
      if (!modalTriggered && e.dataTransfer?.types.includes('Files')) {
        modalTriggered = true;
        triggerUpload();

        // Clear any existing timeout
        if (dragTimeout) {
          clearTimeout(dragTimeout);
        }
      }
    };

    const handleGlobalDragLeave = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Use a timeout to reset the modal trigger when drag truly leaves the window
      // This prevents flickering when dragging between elements
      if (dragTimeout) {
        clearTimeout(dragTimeout);
      }

      dragTimeout = setTimeout(() => {
        modalTriggered = false;
      }, 100);
    };

    const handleGlobalDrop = (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();

      // Clear timeout and reset for next drag session
      if (dragTimeout) {
        clearTimeout(dragTimeout);
        dragTimeout = null;
      }
      modalTriggered = false;
    };

    // Add global event listeners
    document.addEventListener('dragover', handleGlobalDragOver);
    document.addEventListener('dragleave', handleGlobalDragLeave);
    document.addEventListener('drop', handleGlobalDrop);

    return () => {
      document.removeEventListener('dragover', handleGlobalDragOver);
      document.removeEventListener('dragleave', handleGlobalDragLeave);
      document.removeEventListener('drop', handleGlobalDrop);

      // Clean up timeout
      if (dragTimeout) {
        clearTimeout(dragTimeout);
      }
    };
  }, []);

  return (
    <div ref={containerRef} className="flex h-screen bg-background" role="application">
      {/* Skip link for keyboard users */}
      <SkipLink />
      {/* Keyboard shortcuts help dialog */}
      <KeyboardShortcutsHelp />
      {/* Left Navigation Panel */}
      <aside
        ref={leftSidebarRef}
        data-sidebar-id="left"
        className={`${leftCollapsed ? 'w-12' : 'w-64'} flex-shrink-0 bg-card shadow-md transition-all duration-300 ease-in-out relative`}
        role="navigation"
        aria-label="Main navigation"
      >
        {leftCollapsed ? (
          <div className="p-2 flex flex-col items-center h-full relative">
            {/* Expand button - positioned at the top right with consistent styling */}
            <button
              onClick={() => setLeftCollapsedWithStore(false)}
              className="w-8 h-8 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
              aria-label="Expand navigation panel (Alt+Left Arrow)"
              title="Expand navigation panel (Alt+Left Arrow)"
            >
              <ChevronRight className="h-5 w-5 text-primary" aria-hidden="true" />
            </button>

            {/* Removed logo as it's now part of the navigation */}
            <div className="pt-2"></div>

            {/* Collapsed Navigation Icons with margin top */}
            <div className="mt-4 flex flex-col items-center w-full h-full">
              <SidebarNavClient isCollapsed={true} />
            </div>
          </div>
        ) : (
          <>
            {/* Expanded Navigation */}
            <div className="relative h-full">
              <SidebarNavClient isCollapsed={false} />

              {/* Collapse button - visible on all screen sizes with consistent styling */}
              <button
                onClick={() => setLeftCollapsedWithStore(true)}
                className="absolute top-4 right-2 w-8 h-8 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                aria-label="Collapse navigation panel (Alt+Left Arrow)"
                title="Collapse navigation panel (Alt+Left Arrow)"
              >
                <ChevronLeft className="h-5 w-5 text-primary" aria-hidden="true" />
              </button>
            </div>
          </>
        )}
      </aside>

      {/* Center Content Panel */}
      {/* Changed to overflow-hidden to prevent scrolling at this level */}
      {/* Individual page components will handle their own scrolling */}
      <main id="main-content" className="flex-1 p-6 overflow-hidden" tabIndex={-1}>
        {children}
      </main>

      {/* Right AI Assistant Panel */}
      <aside
        ref={rightSidebarRef}
        data-sidebar-id="right"
        style={{
          width: rightCollapsed ? '3rem' : `${rightPanelWidth}px`,
        }}
        className={`flex-shrink-0 bg-card shadow-lg flex flex-col transition-all duration-300 ease-in-out relative`}
        role="complementary"
        aria-label="AI Assistant"
      >
        {/* Resize handle - only visible when panel is expanded */}
        <ResizeHandle
          onResize={handleRightPanelResize}
          onDoubleClick={handleRightPanelDoubleClick}
          minWidth={calculateMinWidth()}
          maxWidth={calculateMaxWidth()}
          currentWidth={rightPanelWidth}
          isCollapsed={rightCollapsed}
        />

        {rightCollapsed ? (
          <div className="p-2 pt-8 relative h-full flex flex-col items-center">
            {/* AI icon only, no text - now at the top where chevron was */}
            <div className="flex flex-col items-center">
              {/* Lightbulb icon with improved visibility */}
              <button
                onClick={() => setRightCollapsedWithStore(false)}
                className="w-9 h-9 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                aria-label="Expand AI assistant panel (Alt+Right Arrow)"
                title="Expand AI assistant panel (Alt+Right Arrow)"
              >
                <Lightbulb className="h-8 w-8 text-amber-400 fill-amber-400/30" />
              </button>
            </div>
          </div>
        ) : (
          <>
            <div className="flex justify-between items-center p-4 border-b">
              <h2 className="text-base font-semibold">{aiAssistantTitle}</h2>
              <button
                onClick={() => setRightCollapsedWithStore(true)}
                className="w-8 h-8 rounded-full flex items-center justify-center focus:outline-none focus:ring-2 focus:ring-ring transition-colors"
                aria-label="Collapse AI assistant panel (Alt+Right Arrow)"
                title="Collapse AI assistant panel (Alt+Right Arrow)"
              >
                <ChevronRight className="h-5 w-5 text-primary" aria-hidden="true" />
              </button>
            </div>
            <div className="flex-1 overflow-hidden">
              <AIAssistant />
            </div>
          </>
        )}
      </aside>
    </div>
  );
}