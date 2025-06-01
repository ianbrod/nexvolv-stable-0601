import { useEffect, useRef, useCallback, RefObject } from 'react';

/**
 * Custom hook to observe the size of sidebar elements and update CSS variables accordingly.
 *
 * @param sidebarRefs - An array of React refs pointing to the sidebar DOM elements.
 *                      Each sidebar element MUST have a `data-sidebar-id="left"` or
 *                      `data-sidebar-id="right"` attribute.
 */
function useSidebarObserver(sidebarRefs: RefObject<HTMLElement | null>[]) { // Allow null refs
  const observerRef = useRef<ResizeObserver | null>(null);

  // Memoize the callback to prevent recreating the observer unnecessarily
  const handleResize = useCallback((entries: ResizeObserverEntry[]) => {
    // Use requestAnimationFrame to batch updates and prevent layout thrashing
    window.requestAnimationFrame(() => {
      let leftWidth = 0;
      let rightWidth = 0;
      const observedIds = new Set<string>();

      entries.forEach(entry => {
        // Ensure the target is an HTMLElement before accessing specific properties
        if (!(entry.target instanceof HTMLElement)) {
          return; // Skip if not an HTMLElement
        }
        const element = entry.target; // Now typed as HTMLElement

        // Use borderBoxSize for more accurate width including padding and border
        // Fallback to contentRect.width for broader compatibility
        const width = entry.borderBoxSize?.length > 0
          ? entry.borderBoxSize[0].inlineSize
          : entry.contentRect.width;

        const sidebarId = element.dataset.sidebarId; // Use element.dataset
        observedIds.add(sidebarId ?? '');

        // Check if element is hidden (e.g., display: none or detached)
        // offsetParent will be null if the element or its ancestors are display: none
        const isHidden = element.offsetParent === null; // Use element.offsetParent
        const currentWidth = isHidden ? 0 : width;

        if (sidebarId === 'left') {
          leftWidth = currentWidth;
        } else if (sidebarId === 'right') {
          rightWidth = currentWidth;
        }
      });

      // Determine which sidebars *should* exist based on the refs passed to the hook
      const expectedSidebarIds = sidebarRefs
        .map(ref => ref.current?.dataset.sidebarId)
        .filter(Boolean);

      // Update CSS variable for left sidebar if it's expected or was observed
      if (expectedSidebarIds.includes('left')) {
        // Use the observed width if available, otherwise default to 0 (e.g., if initially hidden and not in entries)
        const finalLeftWidth = observedIds.has('left') ? leftWidth : 0;
        document.documentElement.style.setProperty('--sidebar-left-width', `${finalLeftWidth}px`);
        // console.log(`Setting --sidebar-left-width: ${finalLeftWidth}px`); // DEBUG
      } else {
         // Ensure reset if left sidebar is not expected (e.g., unmounted)
         document.documentElement.style.setProperty('--sidebar-left-width', '0px');
         // console.log('Resetting --sidebar-left-width: 0px'); // DEBUG
      }

      // Update CSS variable for right sidebar if it's expected or was observed
      if (expectedSidebarIds.includes('right')) {
         // Use the observed width if available, otherwise default to 0
        const finalRightWidth = observedIds.has('right') ? rightWidth : 0;
        document.documentElement.style.setProperty('--sidebar-right-width', `${finalRightWidth}px`);
        // console.log(`Setting --sidebar-right-width: ${finalRightWidth}px`); // DEBUG
      } else {
         // Ensure reset if right sidebar is not expected
         document.documentElement.style.setProperty('--sidebar-right-width', '0px');
         // console.log('Resetting --sidebar-right-width: 0px'); // DEBUG
      }
    });
  }, [sidebarRefs]); // Dependency array includes sidebarRefs to re-evaluate expected IDs

  useEffect(() => {
    const elements = sidebarRefs
      .map(ref => ref.current)
      .filter((el): el is HTMLElement => el instanceof HTMLElement); // Type guard

    if (typeof ResizeObserver === 'undefined') {
      console.warn('ResizeObserver not supported. Falling back to default widths.');
      document.documentElement.style.setProperty('--sidebar-left-width', '0px');
      document.documentElement.style.setProperty('--sidebar-right-width', '0px');
      return;
    }

    // Disconnect previous observer if it exists
    if (observerRef.current) {
      observerRef.current.disconnect();
    }

    // Create and assign the new observer
    observerRef.current = new ResizeObserver(handleResize);
    const currentObserver = observerRef.current; // Capture current observer for cleanup closure

    if (elements.length > 0) {
      elements.forEach(el => {
        // Check for required data attribute
        if (!el.dataset.sidebarId) {
            console.warn('Sidebar element is missing the required "data-sidebar-id" attribute:', el);
        }
        currentObserver.observe(el);
      });
      // Trigger initial calculation after observing
      handleResize([]); // Call handler with empty array to set initial values based on current state
    } else {
       // If no elements are initially present, ensure defaults are set
       handleResize([]); // Call handler with empty array to set defaults
    }

    // Cleanup function
    return () => {
      if (currentObserver) {
        currentObserver.disconnect();
        // console.log('ResizeObserver disconnected.'); // DEBUG
      }
    };
    // Rerun effect if the refs array identity changes or the callback changes
  }, [sidebarRefs, handleResize]);
}

export default useSidebarObserver;