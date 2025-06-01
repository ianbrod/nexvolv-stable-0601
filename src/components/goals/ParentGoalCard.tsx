'use client';

import React, { useState, useEffect } from 'react';
import { Goal } from '@prisma/client';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { format } from 'date-fns';
import { cn } from '@/lib/utils';
import { eventEmitter, EVENTS, ProgressUpdateEvent } from '@/lib/events';

interface ParentGoalCardProps {
  goal: Goal;
  categoryColor?: string;
  showProgressBar?: boolean;
  expandControl?: React.ReactNode;
  className?: string;
  size?: 'default' | 'large' | 'small';
}

/**
 * Component for displaying the parent goal card with description
 */
export function ParentGoalCard({ goal, categoryColor, showProgressBar = true, expandControl, className, size = 'default' }: ParentGoalCardProps) {
  // State to track progress
  const [progress, setProgress] = useState(goal.progress);

  // Format deadline date if it exists
  const formattedDeadline = goal.deadline
    ? format(new Date(goal.deadline), 'MMM d, yyyy')
    : null;

  // Listen for progress update events
  useEffect(() => {
    const handleProgressUpdate = (data: ProgressUpdateEvent) => {
      if (data.goalId === goal.id) {
        console.log(`ParentGoalCard progress update event received: ${data.progress}%`);

        // Update progress with animation
        setProgress(data.progress);

        // Also update the DOM directly for immediate feedback
        const progressBar = document.querySelector(`[data-parent-progress-bar="${goal.id}"]`) as HTMLElement;
        const progressText = document.querySelector(`[data-parent-progress-text="${goal.id}"]`);

        if (progressBar && progressText) {
          // Update text
          progressText.textContent = `${data.progress}%`;

          // Update progress bar width with transition
          progressBar.style.width = `${data.progress}%`;

          // Update color class
          progressBar.classList.remove('goal-progress-low', 'goal-progress-medium', 'goal-progress-high', 'goal-progress-complete');
          if (data.progress < 25) progressBar.classList.add('goal-progress-low');
          else if (data.progress < 75) progressBar.classList.add('goal-progress-medium');
          else if (data.progress < 100) progressBar.classList.add('goal-progress-high');
          else progressBar.classList.add('goal-progress-complete');
        }
      }
    };

    // Subscribe to progress update events
    const unsubscribe = eventEmitter.on(EVENTS.PROGRESS_UPDATED, handleProgressUpdate);

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [goal.id]);

  // Update progress when goal prop changes
  useEffect(() => {
    if (progress !== goal.progress) {
      setProgress(goal.progress);
    }
  }, [goal.progress, progress]);

  // Get size-based styling
  const getSizeClasses = () => {
    switch (size) {
      case 'large':
        return {
          card: "w-full border-l-4 shadow-md relative",
          content: "py-3 flex flex-col",
          title: "text-xl font-bold truncate",
          subtitle: "text-sm text-muted-foreground",
          progressContainer: "space-y-2 mt-3"
        };
      case 'small':
        return {
          card: "w-full border-l-2 shadow-sm relative",
          content: "py-1.5 flex flex-col",
          title: "text-base font-semibold truncate",
          subtitle: "text-xs text-muted-foreground",
          progressContainer: "space-y-1 mt-1.5"
        };
      default:
        return {
          card: "w-full border-l-4 shadow-sm relative",
          content: "py-2 flex flex-col",
          title: "text-lg font-semibold truncate",
          subtitle: "text-xs text-muted-foreground",
          progressContainer: "space-y-1 mt-2"
        };
    }
  };

  const sizeClasses = getSizeClasses();

  return (
    <Card
      className={cn(
        sizeClasses.card,
        categoryColor ? "" : "border-l-primary",
        className
      )}
      style={categoryColor ? { borderLeftColor: categoryColor } : {}}
    >
      {expandControl}
      <CardContent className={cn(sizeClasses.content, expandControl ? "pl-8" : "")}>
        <div className="flex flex-col justify-center overflow-hidden">
          <h3 className={sizeClasses.title}>{goal.name}</h3>

          <div className={cn("flex items-center", sizeClasses.subtitle)}>
            {formattedDeadline && (
              <span className="mr-2 whitespace-nowrap">Due: {formattedDeadline}</span>
            )}

            {goal.description && (
              <p className="truncate max-w-[200px]">{goal.description}</p>
            )}
          </div>
        </div>

        {/* Progress Bar - Only shown when showProgressBar is true */}
        {showProgressBar && (
          <div className={sizeClasses.progressContainer}>
            <div className="flex justify-between items-center text-xs">
              <span className="font-medium">Progress</span>
              <span
                className="font-medium"
                data-parent-progress-text={goal.id}
              >
                {progress}%
              </span>
            </div>
            <Progress
              value={progress}
              className={`h-2 rounded-full transition-all duration-300 ${
                progress < 25 ? 'goal-progress-low' :
                progress < 75 ? 'goal-progress-medium' :
                progress < 100 ? 'goal-progress-high' :
                'goal-progress-complete'
              }`}
              data-parent-progress-bar={goal.id}
              aria-valuenow={progress}
              aria-valuemin={0}
              aria-valuemax={100}
              style={{ transition: 'width 0.3s ease-out, background-color 0.3s ease' }}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
}
