'use client';

import React, { useState, useEffect, useCallback, useTransition } from 'react';
import { GoalDetailPanel } from './GoalDetailPanel';
import { GoalDetailPanelWrapperProps } from './goal-list-types';
import { Card } from '@/components/ui/card';
import { getTasksForGoal } from '@/actions/getTasksForGoal';
import { Task, Goal } from '@prisma/client';
import { PanelResizeHandle } from './PanelResizeHandle';

/**
 * Wrapper component for the goal detail panel
 */
export function GoalDetailPanelWrapper({
  goal,
  categories,
  onClose,
  onAddTask,
  subGoals: initialSubGoals,
  width = 400,
  onResize,
  onResizeStart,
  onResizeEnd,
  onResetWidth,
  getConstrainedWidth
}: GoalDetailPanelWrapperProps) {
  // Reference to the wrapper component for external access
  const wrapperRef = React.useRef<HTMLDivElement>(null);
  // State to track if the panel is visible - default to false
  const [isVisible, setIsVisible] = useState(false);
  // State for tasks and sub-goals fetched from the server
  const [tasks, setTasks] = useState<Task[]>(goal?.tasks || []);
  const [subGoals, setSubGoals] = useState<Goal[]>(initialSubGoals || []);
  const [isPending, startTransition] = useTransition();
  const [isLoading, setIsLoading] = useState(false);

  // Debug log to verify initial state
  console.log('GoalDetailPanelWrapper initial state:', { isVisible, goalId: goal?.id });

  // Toggle panel visibility - wrapped in useCallback to avoid dependency issues
  const toggleVisibility = useCallback(() => {
    setIsVisible(prev => !prev);
  }, []);

  // Handle close button click
  const handleClose = () => {
    setIsVisible(false);
    // Call the parent's onClose after a short delay to allow animation
    setTimeout(() => {
      onClose();
    }, 100);
  };

  // Expose the toggle method to the parent component
  // This effect runs for all renders, avoiding conditional hooks
  useEffect(() => {
    if (wrapperRef.current) {
      // Add a custom property to the DOM element
      (wrapperRef.current as any).toggleVisibility = toggleVisibility;
    }
  }, [toggleVisibility]);

  // Fetch tasks for the goal when it changes
  useEffect(() => {
    if (goal) {
      setIsLoading(true);
      startTransition(async () => {
        try {
          const result = await getTasksForGoal(goal.id);
          setTasks(result.tasks);
          setSubGoals(result.subGoals);
          console.log(`Fetched ${result.tasks.length} tasks for goal ${goal.id}`);
        } catch (error) {
          console.error('Error fetching tasks for goal:', error);
        } finally {
          setIsLoading(false);
        }
      });
    }
  }, [goal]);

  // Use useEffect to ensure the panel is visible when a goal is selected
  // This effect must be declared before any conditional returns
  useEffect(() => {
    if (goal) {
      setIsVisible(true);
      console.log('Setting panel visible for goal:', goal.id);
    }
  }, [goal]);

  // If no goal is selected, don't render anything
  if (!goal) {
    return null;
  }

  // Show the panel with the goal details
  return (
    <div
      ref={wrapperRef}
      className="flex-shrink-0 border-l goal-detail-panel-wrapper transition-all duration-300 ease-in-out animate-in slide-in-from-right relative"
      style={{
        width: `${width}px`,
        minWidth: '300px'
        // maxWidth removed to allow dynamic calculation from usePanelResize hook
      }}
    >
      {/* Resize handle */}
      {onResize && onResizeStart && onResizeEnd && onResetWidth && getConstrainedWidth && (
        <PanelResizeHandle
          onResize={onResize}
          onResizeStart={onResizeStart}
          onResizeEnd={onResizeEnd}
          onDoubleClick={onResetWidth}
          currentWidth={width}
          getConstrainedWidth={getConstrainedWidth}
          isVisible={true}
        />
      )}

      <Card className="h-full flex flex-col border-none shadow-none rounded-none">
        {isLoading ? (
          <div className="flex items-center justify-center h-full">
            <p className="text-muted-foreground">Loading tasks...</p>
          </div>
        ) : (
          <GoalDetailPanel
            goal={{...goal, tasks}}
            categories={categories}
            onClose={handleClose}
            onAddTask={onAddTask}
            subGoals={subGoals}
          />
        )}
      </Card>
    </div>
  );
}
