'use client';

import React, { useState, useEffect } from 'react';
import { Goal, Task, TaskStatus } from '@prisma/client';
import { ParentGoalCard } from '@/components/goals/ParentGoalCard';
import { SimpleTaskItem } from '@/components/tasks/SimpleTaskItem';
import { ChevronDown, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { eventEmitter, EVENTS, ProgressUpdateEvent } from '@/lib/events';

interface SubGoalWithTasksProps {
  subGoal: Goal & {
    category?: { id: string; name: string; color?: string } | null;
    _count?: { tasks: number; subGoals: number };
  };
  tasks: Task[];
  onEditTask: (task: Task) => void;
  onDeleteTask: (taskId: string) => void;
  onTaskStatusChange: (taskId: string, status: TaskStatus, updatedTask: Task) => void;
  isPending: boolean;
  onSubGoalClick?: (subGoal: any) => void;
  isSelected?: boolean;
  onTaskClick?: (task: Task, goalName?: string, category?: any) => void;
  selectedTaskId?: string | null;
}

/**
 * Component for displaying a sub-goal with its associated tasks
 */
export function SubGoalWithTasks({
  subGoal,
  tasks,
  onEditTask,
  onDeleteTask,
  onTaskStatusChange,
  isPending,
  onSubGoalClick,
  isSelected = false,
  onTaskClick,
  selectedTaskId
}: SubGoalWithTasksProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [goalProgress, setGoalProgress] = useState(subGoal.progress);

  // Toggle expansion state
  const toggleExpand = () => {
    setIsExpanded(!isExpanded);
  };

  // Handle subgoal click
  const handleSubGoalClick = () => {
    if (onSubGoalClick) {
      onSubGoalClick(subGoal);
    }
  };

  // Handle task click
  const handleTaskClick = (task: Task) => {
    if (onTaskClick) {
      onTaskClick(task, subGoal.name, subGoal.category);
    }
  };

  // Get category color for visual consistency
  const getCategoryColor = (): string | undefined => {
    return subGoal.category?.color;
  };

  // Listen for progress update events
  useEffect(() => {
    const handleProgressUpdate = (data: ProgressUpdateEvent) => {
      if (data.goalId === subGoal.id) {
        console.log(`SubGoal progress update event received: ${data.progress}%`);

        // Update local state for React rendering
        setGoalProgress(data.progress);

        // Force immediate DOM update for the progress bar in the ParentGoalCard
        // This is a backup approach in case the React state update doesn't trigger a re-render
        setTimeout(() => {
          const progressBar = document.querySelector(`[data-parent-progress-bar="${subGoal.id}"]`) as HTMLElement;
          const progressText = document.querySelector(`[data-parent-progress-text="${subGoal.id}"]`);

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
        }, 0);
      }
    };

    // Subscribe to progress update events
    const unsubscribe = eventEmitter.on(EVENTS.PROGRESS_UPDATED, handleProgressUpdate);

    // Cleanup subscription on unmount
    return () => {
      unsubscribe();
    };
  }, [subGoal.id]);

  return (
    <div className="space-y-2">
      {/* Sub-goal card with toggle inside */}
      <div
        className={cn(
          "relative ml-0 cursor-pointer transition-all duration-200",
          // Add purple selection highlighting
          isSelected && "ring-1 ring-purple-500/40 rounded-md shadow-lg shadow-purple-500/20"
        )}
        onClick={handleSubGoalClick}
      >
        <ParentGoalCard
          goal={{
            ...subGoal,
            progress: goalProgress
          }}
          categoryColor={getCategoryColor()}
          size="small" // Make subgoal cards smaller
          className={cn(
            isSelected && "bg-purple-500/5 border-purple-500/30"
          )}
          expandControl={
            <Button
              variant="ghost"
              size="sm"
              className="p-0 h-6 w-6 absolute top-2 left-2 z-10"
              onClick={(e) => {
                e.stopPropagation(); // Prevent triggering the card click
                toggleExpand();
              }}
              aria-label={isExpanded ? "Collapse sub-goal" : "Expand sub-goal"}
            >
              {isExpanded ? (
                <ChevronDown className="h-4 w-4" />
              ) : (
                <ChevronRight className="h-4 w-4" />
              )}
            </Button>
          }
        />
      </div>

      {/* Tasks for this sub-goal */}
      {isExpanded && tasks.length > 0 && (
        <div
          className={cn(
            "pl-6 ml-3 space-y-2 border-l-2 border-dashed",
            getCategoryColor() ? "" : "border-primary/30"
          )}
          style={getCategoryColor() ? { borderLeftColor: `${getCategoryColor()}50` } : {}}
        >
          {tasks.map(task => {
            // Enhance the task object with category information from the subgoal
            // This ensures the task has the correct category color
            const enhancedTask = {
              ...task,
              // Add goal with category if it doesn't exist
              goal: task.goal || {
                ...subGoal,
                category: subGoal.category
              }
            };

            return (
              <div
                key={task.id}
                className={cn(
                  "transition-all duration-200",
                  selectedTaskId === task.id && "ring-1 ring-purple-500/40 rounded-md shadow-lg shadow-purple-500/20"
                )}
              >
                <SimpleTaskItem
                  task={enhancedTask}
                  goalName={subGoal.name}
                  onEdit={onEditTask}
                  onDelete={onDeleteTask}
                  onClick={() => handleTaskClick(task)}
                  onStatusChange={onTaskStatusChange}
                />
              </div>
            );
          })}
        </div>
      )}

      {/* Empty state for no tasks */}
      {isExpanded && tasks.length === 0 && (
        <div className="pl-6 ml-3 py-2 text-sm text-muted-foreground">
          No tasks for this sub-goal.
        </div>
      )}
    </div>
  );
}
