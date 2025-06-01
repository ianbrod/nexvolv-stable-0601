'use client';

import Script from 'next/script';

export function HeadScript() {
  return (
    <Script id="progress-bar-updater" strategy="afterInteractive">
      {`
        // Global function to update progress bars
        window.updateProgressBars = function(goalId, progress) {
          console.log("Direct script update for goal " + goalId + ": " + progress + "%");

          // Update all progress bars with matching goal ID
          document.querySelectorAll('[data-parent-progress-bar="' + goalId + '"]').forEach(function(bar) {
            if (bar instanceof HTMLElement) {
              bar.style.width = progress + '%';
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
          document.querySelectorAll('[data-parent-progress-text="' + goalId + '"]').forEach(function(text) {
            if (text instanceof HTMLElement) {
              text.textContent = progress + '%';
            }
          });

          // Update main progress bar if on the right page
          var mainBar = document.querySelector('[data-progress-bar="true"]');
          var mainText = document.querySelector('[data-progress-text="true"]');

          if (mainBar && mainText) {
            var goalIdAttr = mainBar.getAttribute('data-goal-id');
            if (goalIdAttr === goalId) {
              if (mainBar instanceof HTMLElement) {
                mainBar.style.width = progress + '%';
                mainBar.style.transition = 'width 0.3s ease-out, background-color 0.3s ease';
              }

              if (mainText instanceof HTMLElement) {
                mainText.textContent = progress + '%';
              }
            }
          }
        };

        // Add a MutationObserver to ensure progress bars have transitions
        document.addEventListener('DOMContentLoaded', function() {
          var observer = new MutationObserver(function(mutations) {
            mutations.forEach(function(mutation) {
              if (mutation.type === 'childList') {
                mutation.addedNodes.forEach(function(node) {
                  if (node.nodeType === 1) { // Element node
                    var element = node;

                    // Check if it's a progress bar
                    if (element.hasAttribute('data-progress-bar') ||
                        element.hasAttribute('data-parent-progress-bar') ||
                        element.getAttribute('data-progress-bar') === 'true' ||
                        element.hasAttribute('role') && element.getAttribute('role') === 'progressbar') {

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
        });
      `}
    </Script>
  );
}
