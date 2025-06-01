'use client';

import { useEffect } from 'react';

/**
 * Component that adds a direct DOM manipulation script to the page
 * This is a last-resort approach when other methods fail
 */
export function DirectProgressFix() {
  useEffect(() => {
    // Create a function to update progress bars
    const updateProgressBars = (goalId: string, progress: number) => {
      console.log(`Direct DOM update for goal ${goalId}: ${progress}%`);
      
      // Update all progress bars with matching goal ID
      document.querySelectorAll(`[data-parent-progress-bar="${goalId}"]`).forEach(bar => {
        if (bar instanceof HTMLElement) {
          bar.style.width = `${progress}%`;
          bar.style.transition = 'width 0.3s ease-out, background-color 0.3s ease';
          
          // Update classes
          bar.classList.remove('goal-progress-low', 'goal-progress-medium', 'goal-progress-high', 'goal-progress-complete');
          if (progress < 25) bar.classList.add('goal-progress-low');
          else if (progress < 75) bar.classList.add('goal-progress-medium');
          else if (progress < 100) bar.classList.add('goal-progress-high');
          else bar.classList.add('goal-progress-complete');
        }
      });
      
      // Update text elements
      document.querySelectorAll(`[data-parent-progress-text="${goalId}"]`).forEach(text => {
        if (text instanceof HTMLElement) {
          text.textContent = `${progress}%`;
        }
      });
      
      // Update main progress bar if on the right page
      const mainBar = document.querySelector('[data-progress-bar="true"]');
      const mainText = document.querySelector('[data-progress-text="true"]');
      
      if (mainBar && mainText) {
        const goalIdAttr = mainBar.getAttribute('data-goal-id');
        if (goalIdAttr === goalId) {
          if (mainBar instanceof HTMLElement) {
            mainBar.style.width = `${progress}%`;
            mainBar.style.transition = 'width 0.3s ease-out, background-color 0.3s ease';
          }
          
          if (mainText instanceof HTMLElement) {
            mainText.textContent = `${progress}%`;
          }
        }
      }
    };

    // Add the function to the window object
    (window as any).updateProgressBars = updateProgressBars;
    
    // Add a MutationObserver to ensure all progress bars have transitions
    const observer = new MutationObserver(mutations => {
      mutations.forEach(mutation => {
        if (mutation.type === 'childList') {
          mutation.addedNodes.forEach(node => {
            if (node.nodeType === 1) { // Element node
              const element = node as HTMLElement;
              
              // Check if it's a progress bar
              if (element.hasAttribute('data-progress-bar') || 
                  element.hasAttribute('data-parent-progress-bar') ||
                  element.getAttribute('data-progress-bar') === 'true' ||
                  (element.hasAttribute('role') && element.getAttribute('role') === 'progressbar')) {
                
                // Add transition
                element.style.transition = 'width 0.3s ease-out, background-color 0.3s ease';
              }
            }
          });
        }
      });
    });
    
    // Start observing
    observer.observe(document.body, { childList: true, subtree: true });
    
    // Cleanup
    return () => {
      observer.disconnect();
    };
  }, []);
  
  return null;
}
