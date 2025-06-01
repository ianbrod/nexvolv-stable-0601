'use client';

import React from 'react';

// Custom Components
import { GoalDetailView } from './GoalDetailView';

// Custom Hook
import { useGoalDetail } from './hooks/useGoalDetail';

// Types
import { GoalDetailProps } from './goal-detail-types';

/**
 * Client component for displaying goal details
 * Refactored to use custom hook and separate view component
 */
export function GoalDetailClientWrapper({ goal: initialGoal, categories, allGoals }: GoalDetailProps) {
  // Use custom hook for all state management and business logic
  const goalDetailState = useGoalDetail({ initialGoal });

  // Render the view component with all the state and handlers
  return (
    <GoalDetailView
      // Data
      goal={goalDetailState.goal}
      categories={categories}
      allGoals={allGoals}
      subGoalsForDisplay={goalDetailState.subGoalsForDisplay}
      parentGoalTasks={goalDetailState.parentGoalTasks}
      subGoalTasks={goalDetailState.subGoalTasks}

      // State
      isEditModalOpen={goalDetailState.isEditModalOpen}
      isDeleteDialogOpen={goalDetailState.isDeleteDialogOpen}
      isSubGoalModalOpen={goalDetailState.isSubGoalModalOpen}
      isPending={goalDetailState.isPending}
      isTaskDeletePending={goalDetailState.isTaskDeletePending}
      isTaskCompletionPending={goalDetailState.isTaskCompletionPending}

      // Actions
      setIsEditModalOpen={goalDetailState.setIsEditModalOpen}
      setIsDeleteDialogOpen={goalDetailState.setIsDeleteDialogOpen}
      setIsSubGoalModalOpen={goalDetailState.setIsSubGoalModalOpen}
      handleEditGoal={goalDetailState.handleEditGoal}
      handleDeleteGoal={goalDetailState.handleDeleteGoal}
      handleDeleteTask={goalDetailState.handleDeleteTask}
      handleTaskCompletionChange={goalDetailState.handleTaskCompletionChange}
      handleEditTaskClick={goalDetailState.handleEditTaskClick}
    />
  );
}