'use client';

import React, { useState, useEffect, useRef } from 'react';
import { eventEmitter, EVENTS, ProgressUpdateEvent } from '@/lib/events';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { useGoalProgressHistory } from '@/hooks/useGoalProgressHistory';
import { ProgressChart } from '@/components/ui/charts/ProgressChart';
import { TimeRange } from '@/lib/utils/date-formatting';

// Props for the component
interface GoalProgressHistoryProps {
  goalId: string;
  currentProgress?: number; // Optional prop to override the progress from history
}

/**
 * Component for visualizing goal progress history over time
 */
export function GoalProgressHistory({ goalId, currentProgress: propProgress }: GoalProgressHistoryProps) {
  // Create a reference to track if this is the first render
  const isFirstRender = React.useRef(true);

  // Use a state variable to track the progress value
  const [displayProgress, setDisplayProgress] = React.useState(propProgress !== undefined ? propProgress : 0);

  // Force update function
  const [, forceUpdate] = React.useState({});

  // Update the state when the prop changes
  React.useEffect(() => {
    if (propProgress !== undefined) {
      // Always update on first render
      if (isFirstRender.current) {
        isFirstRender.current = false;
        setDisplayProgress(propProgress);
      }
      // Update when progress changes
      else if (displayProgress !== propProgress) {
        console.log(`Progress changed from ${displayProgress} to ${propProgress}`);
        setDisplayProgress(propProgress);
        // Force a re-render
        forceUpdate({});
      }
    }
  }, [propProgress, displayProgress]);

  // Listen for progress update events
  React.useEffect(() => {
    const handleProgressUpdate = (data: ProgressUpdateEvent) => {
      if (data.goalId === goalId) {
        console.log(`Progress update event received: ${data.progress}%`);

        // Update React state
        setDisplayProgress(data.progress);

        // Force a re-render
        forceUpdate({});

        // Force immediate DOM update for the progress bar
        // This is a more reliable approach than waiting for React to re-render
        setTimeout(() => {
          const progressBar = document.querySelector('[data-progress-bar="true"]') as HTMLElement;
          const progressText = document.querySelector('[data-progress-text="true"]');

          if (progressBar && progressText) {
            // Update text
            progressText.textContent = `${data.progress}%`;

            // Update progress bar width with transition
            progressBar.style.width = `${data.progress}%`;

            // Ensure transition is applied
            if (!progressBar.style.transition) {
              progressBar.style.transition = 'width 0.3s ease-out, background-color 0.3s ease';
            }

            // Update color class
            progressBar.classList.remove('bg-[#808080]', 'bg-[#9333ea]', 'bg-[#3b82f6]', 'bg-[#22c55e]');
            if (data.progress < 25) progressBar.classList.add('bg-[#808080]');
            else if (data.progress < 75) progressBar.classList.add('bg-[#9333ea]');
            else if (data.progress < 100) progressBar.classList.add('bg-[#3b82f6]');
            else progressBar.classList.add('bg-[#22c55e]');
          }
        }, 0);
      }
    };

    // Subscribe to progress update events
    const unsubscribe = eventEmitter.on(EVENTS.PROGRESS_UPDATED, handleProgressUpdate);

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [goalId]);

  // Log the progress value for debugging
  console.log(`GoalProgressHistory: propProgress = ${propProgress}, displayProgress = ${displayProgress}`);
  // Use our custom hook to manage progress history data
  const {
    progressData: formattedData,
    currentProgress,
    timeRange,
    setTimeRange,
    isLoading,
    error,
  } = useGoalProgressHistory(goalId);

  // Loading state component
  const LoadingState = () => (
    <div className="p-0">
      <Skeleton className="h-[150px] w-full" />
    </div>
  );

  // Function to handle printing
  const handlePrint = () => {
    window.print();
  };

  return (
    <>
      <Card className="w-full p-0 overflow-hidden border">
        {/* Custom header without using CardHeader component */}
        <div className="border-b flex items-center justify-between h-8 px-2">
          <div className="font-medium text-sm">Progress History</div>
          <div className="flex gap-0.5">
            <Button
              variant={timeRange === 'week' ? 'default' : 'outline'}
              onClick={() => setTimeRange('week')}
              className="h-5 px-1.5 text-xs rounded-sm"
            >
              Week
            </Button>
            <Button
              variant={timeRange === 'month' ? 'default' : 'outline'}
              onClick={() => setTimeRange('month')}
              className="h-5 px-1.5 text-xs rounded-sm"
            >
              Month
            </Button>
            <Button
              variant={timeRange === 'year' ? 'default' : 'outline'}
              onClick={() => setTimeRange('year')}
              className="h-5 px-1.5 text-xs rounded-sm"
            >
              Year
            </Button>
            <Button
              variant={timeRange === 'all' ? 'default' : 'outline'}
              onClick={() => setTimeRange('all')}
              className="h-5 px-1.5 text-xs rounded-sm"
            >
              All
            </Button>
            <Button
              variant="outline"
              onClick={handlePrint}
              className="h-5 w-5 p-0 flex items-center justify-center rounded-sm"
              aria-label="Print progress history"
            >
              <span className="sr-only">Print</span>
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="6 9 6 2 18 2 18 9"></polyline>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"></path>
                <rect width="12" height="8" x="6" y="14"></rect>
              </svg>
            </Button>
          </div>
        </div>
        <CardContent className="p-0">
          <div>
            {isLoading ? (
              <LoadingState />
            ) : error ? (
              <div className="py-1 text-center text-destructive">{error}</div>
            ) : (
              <ProgressChart
                data={formattedData}
                timeRange={timeRange}
                height={200}
                showTooltip={true}
                showGrid={true}
                lineColor="var(--primary)"
                emptyMessage="No progress history available"
                animationDuration={800}
              />
            )}
          </div>

          {/* Progress Bar - GUARANTEED VISIBLE - ALWAYS SHOWN */}
          <div className="px-3 pb-3 pt-2 border-t">
            <div className="space-y-1">
              <div className="flex justify-between items-center text-xs">
                <span className="font-medium">Progress</span>
                <span
                  className="font-medium"
                  data-progress-text="true"
                  data-progress-value={displayProgress}
                  data-goal-id={goalId}
                >
                  {displayProgress}%
                </span>
              </div>
              <div className="relative w-full h-2 bg-gray-200 rounded-full overflow-hidden">
                <div
                  data-progress-bar="true"
                  data-progress-value={displayProgress}
                  data-goal-id={goalId}
                  className={`absolute top-0 left-0 h-full rounded-full transition-all duration-300 ${
                    displayProgress < 25 ? 'bg-[#808080]' :
                    displayProgress < 75 ? 'bg-[#9333ea]' :
                    displayProgress < 100 ? 'bg-[#3b82f6]' :
                    'bg-[#22c55e]'
                  }`}
                  style={{
                    width: `${displayProgress}%`,
                    transition: 'width 0.3s ease-out, background-color 0.3s ease'
                  }}
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </>
  );
}
