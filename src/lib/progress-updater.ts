/**
 * Direct DOM manipulation utility for updating progress bars
 * This is a fallback approach when the React state updates don't trigger re-renders
 */

/**
 * Updates all progress bars for a specific goal
 * @param goalId The ID of the goal
 * @param progress The new progress value (0-100)
 */
export function updateProgressBarsForGoal(goalId: string, progress: number): void {
  // Use setTimeout to ensure this runs after the current execution context
  setTimeout(() => {
    console.log(`Direct DOM update for goal ${goalId}: ${progress}%`);
    
    // Update progress bars with data-parent-progress-bar attribute
    const parentBars = document.querySelectorAll(`[data-parent-progress-bar="${goalId}"]`);
    parentBars.forEach(bar => {
      if (bar instanceof HTMLElement) {
        // Update width with transition
        bar.style.width = `${progress}%`;
        bar.style.transition = 'width 0.3s ease-out, background-color 0.3s ease';
        
        // Update color classes
        updateProgressBarClasses(bar, progress);
      }
    });
    
    // Update progress text elements
    const parentTexts = document.querySelectorAll(`[data-parent-progress-text="${goalId}"]`);
    parentTexts.forEach(text => {
      if (text instanceof HTMLElement) {
        text.textContent = `${progress}%`;
      }
    });
    
    // Also update the main progress bar if it's for this goal
    const mainBar = document.querySelector('[data-progress-bar="true"]');
    const mainText = document.querySelector('[data-progress-text="true"]');
    
    // Check if we're on the correct goal page by comparing data attributes
    const progressValue = document.querySelector('[data-progress-value]');
    if (progressValue && progressValue.getAttribute('data-goal-id') === goalId) {
      if (mainBar instanceof HTMLElement) {
        mainBar.style.width = `${progress}%`;
        mainBar.style.transition = 'width 0.3s ease-out, background-color 0.3s ease';
        updateProgressBarClasses(mainBar, progress);
      }
      
      if (mainText instanceof HTMLElement) {
        mainText.textContent = `${progress}%`;
      }
    }
  }, 0);
}

/**
 * Updates the classes on a progress bar element based on progress value
 */
function updateProgressBarClasses(element: HTMLElement, progress: number): void {
  // Remove all progress-related classes
  element.classList.remove(
    'goal-progress-low', 
    'goal-progress-medium', 
    'goal-progress-high', 
    'goal-progress-complete',
    'bg-[#808080]', 
    'bg-[#9333ea]', 
    'bg-[#3b82f6]', 
    'bg-[#22c55e]'
  );
  
  // Add appropriate class based on progress
  if (progress < 25) {
    element.classList.add('goal-progress-low');
    element.classList.add('bg-[#808080]');
  } else if (progress < 75) {
    element.classList.add('goal-progress-medium');
    element.classList.add('bg-[#9333ea]');
  } else if (progress < 100) {
    element.classList.add('goal-progress-high');
    element.classList.add('bg-[#3b82f6]');
  } else {
    element.classList.add('goal-progress-complete');
    element.classList.add('bg-[#22c55e]');
  }
}
