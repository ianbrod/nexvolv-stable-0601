'use client';

import { TaskStatus } from '@prisma/client';
import { emitProgressUpdate } from '@/lib/events';
import { updateProgressBarsForGoal } from '@/lib/progress-updater';

// Actions
import { finalUpdateTaskStatus } from '@/actions/finalUpdateTaskStatus';

// Types
import { GoalDetailData } from './goal-detail-types';

interface ProgressUpdateParams {
  goalId: string;
  progress: number;
}

/**
 * Utility class for handling goal detail actions
 */
export class GoalDetailActions {
  /**
   * Updates progress bars and emits progress events
   */
  static updateProgress({ goalId, progress }: ProgressUpdateParams): void {
    console.log(`Updating progress for goal ${goalId}: ${progress}%`);
    
    // Emit progress update event for real-time updates
    emitProgressUpdate(goalId, progress);

    // Also directly update DOM elements for immediate visual feedback
    updateProgressBarsForGoal(goalId, progress);

    // Use the global window function as a fallback
    if (typeof window !== 'undefined' && window.updateProgressBars) {
      window.updateProgressBars(goalId, progress);
    }
  }

  /**
   * Calculates new progress based on task status change
   */
  static calculateProgress(
    currentProgress: number,
    totalTasks: number,
    status: TaskStatus,
    previousStatus?: TaskStatus
  ): number {
    if (totalTasks === 0) return currentProgress;

    const progressIncrement = Math.ceil(100 / totalTasks);

    if (status === TaskStatus.COMPLETED) {
      return Math.min(100, currentProgress + progressIncrement);
    } else if (status === TaskStatus.TODO && previousStatus === TaskStatus.COMPLETED) {
      return Math.max(0, currentProgress - progressIncrement);
    }

    return currentProgress;
  }

  /**
   * Creates optimistic task update
   */
  static createOptimisticTaskUpdate(
    task: any,
    status: TaskStatus
  ): any {
    return {
      ...task,
      status: status,
      // Update timestamps based on status
      completedAt: status === TaskStatus.COMPLETED ? new Date() :
                   status === TaskStatus.TODO ? null : task.completedAt,
      startedAt: status === TaskStatus.IN_PROGRESS && !task.startedAt ?
                 new Date() : task.startedAt
    };
  }

  /**
   * Handles server task status update
   */
  static async updateTaskStatusOnServer(
    taskId: string,
    status: TaskStatus
  ): Promise<{ success: boolean; message: string; data?: any }> {
    try {
      console.log(`[GoalDetailActions] Updating task ${taskId} to status: ${status}`);
      const result = await finalUpdateTaskStatus(taskId, status);
      
      if (result.success) {
        console.log(`[GoalDetailActions] Task updated successfully:`, result.data);
      } else {
        console.error(`[GoalDetailActions] Error updating task: ${result.message}`);
      }
      
      return result;
    } catch (error) {
      console.error(`[GoalDetailActions] Error updating task status:`, error);
      return {
        success: false,
        message: `Failed to update task status: ${error instanceof Error ? error.message : String(error)}`
      };
    }
  }
}

/**
 * Hook for task completion logic
 */
export function useTaskCompletion(
  goal: GoalDetailData,
  setGoal: (updater: (prev: GoalDetailData) => GoalDetailData) => void,
  onError: () => void
) {
  const handleTaskCompletion = async (taskId: string, status: TaskStatus) => {
    console.log(`Processing task completion: ${taskId} -> ${status}`);

    // Find the task in the local state
    const taskIndex = goal.tasks.findIndex(task => task.id === taskId);

    if (taskIndex === -1) {
      console.warn(`Task ${taskId} not found in local state`);
      return;
    }

    const currentTask = goal.tasks[taskIndex];
    const optimisticTasks = [...goal.tasks];

    // Apply optimistic update
    optimisticTasks[taskIndex] = GoalDetailActions.createOptimisticTaskUpdate(
      currentTask,
      status
    );

    // Calculate new progress
    const newProgress = GoalDetailActions.calculateProgress(
      goal.progress,
      goal.tasks.length,
      status,
      currentTask.status
    );

    console.log(`Updating progress optimistically from ${goal.progress} to ${newProgress}`);

    // Update local state optimistically
    setGoal(prevGoal => ({
      ...prevGoal,
      tasks: optimisticTasks,
      progress: newProgress
    }));

    // Update progress indicators
    GoalDetailActions.updateProgress({
      goalId: goal.id,
      progress: newProgress
    });

    // Update server state
    const result = await GoalDetailActions.updateTaskStatusOnServer(taskId, status);

    if (result.success && result.data) {
      // Update with server response
      const serverTaskIndex = goal.tasks.findIndex(task => task.id === taskId);
      
      if (serverTaskIndex !== -1) {
        const serverUpdatedTasks = [...goal.tasks];
        serverUpdatedTasks[serverTaskIndex] = {
          ...serverUpdatedTasks[serverTaskIndex],
          ...result.data,
          status: status
        };

        // Recalculate progress from server data
        const serverProgress = GoalDetailActions.calculateProgress(
          goal.progress,
          goal.tasks.length,
          status,
          currentTask.status
        );

        console.log(`Updating progress from server: ${serverProgress}%`);

        // Update state with server data
        setGoal(prevGoal => ({
          ...prevGoal,
          tasks: serverUpdatedTasks,
          progress: serverProgress
        }));

        // Update progress indicators again
        GoalDetailActions.updateProgress({
          goalId: goal.id,
          progress: serverProgress
        });
      }
    } else {
      console.error(`Error updating task status: ${result.message}`);
      onError();
    }
  };

  return { handleTaskCompletion };
}
