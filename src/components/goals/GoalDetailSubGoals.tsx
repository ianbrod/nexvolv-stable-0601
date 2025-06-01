'use client';

import React from 'react';
import { SubGoalWithTasks } from './SubGoalWithTasks';
import { GoalDetailSubGoalsProps } from './goal-detail-types';
import { TaskStatus } from '@prisma/client';
import { SubGoalForDisplay } from './goal-detail-types';

/**
 * Component for displaying sub-goals with their associated tasks
 */
interface ExtendedGoalDetailSubGoalsProps extends GoalDetailSubGoalsProps {
  onSubGoalClick?: (subGoal: SubGoalForDisplay) => void;
  selectedSubGoalId?: string | null;
  onTaskClick?: (task: any, goalName?: string, category?: any) => void;
  selectedTaskId?: string | null;
}

export function GoalDetailSubGoals({
  subGoals,
  subGoalTasks,
  onEditTask,
  onDeleteTask,
  onTaskStatusChange,
  isTaskDeletePending,
  isTaskCompletionPending,
  onSubGoalClick,
  selectedSubGoalId,
  onTaskClick,
  selectedTaskId,
}: ExtendedGoalDetailSubGoalsProps) {
  if (subGoals.length === 0) {
    return null;
  }

  // Combined pending state for task operations
  const isPending = isTaskDeletePending || isTaskCompletionPending;

  if (subGoals.length === 0) {
    return null;
  }

  return (
    <section className="mt-6">
      <div className="border-b flex items-center justify-between h-8 px-2 mb-3">
        <div className="font-medium text-sm">Sub-Goals</div>
      </div>
      <div className="space-y-4">
        {subGoals.map((subGoal) => {
          // Get tasks for this specific sub-goal from the Record
          const tasksForSubGoal = subGoalTasks[subGoal.id] || [];

          return (
            <SubGoalWithTasks
              key={subGoal.id}
              subGoal={subGoal}
              tasks={tasksForSubGoal}
              onEditTask={onEditTask}
              onDeleteTask={onDeleteTask}
              onTaskStatusChange={onTaskStatusChange}
              isPending={isPending}
              onSubGoalClick={onSubGoalClick}
              isSelected={selectedSubGoalId === subGoal.id}
              onTaskClick={onTaskClick}
              selectedTaskId={selectedTaskId}
            />
          );
        })}
      </div>
    </section>
  );
}
