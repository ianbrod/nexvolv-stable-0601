'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { calculateGoalProgression } from '@/lib/utils/goal-progression';
import { recordGoalProgressSnapshot } from './recordGoalProgressSnapshot';

/**
 * Update the progress of a goal based on its sub-goals and tasks
 * @param goalId The ID of the goal to update
 * @returns An object indicating success or failure
 */
export async function updateGoalProgress(goalId: string) {
  try {
    // Fetch the goal
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
    });

    if (!goal) {
      return { success: false, message: 'Goal not found' };
    }

    // Fetch all goals to find sub-goals
    const allGoals = await prisma.goal.findMany({
      where: { userId: goal.userId },
    });

    // Fetch all tasks to calculate progress
    const allTasks = await prisma.task.findMany({
      where: { userId: goal.userId },
    });

    // Calculate the progress
    const progress = calculateGoalProgression(goal, allGoals, allTasks);

    // Check if progress has changed
    const hasProgressChanged = goal.progress !== progress;

    // Prepare update data
    const updateData: any = { progress };

    // If progress is 100% and the goal wasn't completed before, set completedAt
    if (progress === 100 && !goal.completedAt) {
      updateData.completedAt = new Date();
    }
    // If progress is less than 100% and the goal was marked as completed, clear completedAt
    else if (progress < 100 && goal.completedAt) {
      updateData.completedAt = null;
    }

    // Update the goal with the calculated progress and possibly completedAt
    const updatedGoal = await prisma.goal.update({
      where: { id: goalId },
      data: updateData,
      include: {
        category: true,
        tasks: true
      }
    });

    // If progress has changed, record a snapshot
    if (hasProgressChanged) {
      await recordGoalProgressSnapshot({
        goalId,
        progress,
        notes: `Progress automatically updated to ${progress}%`,
      });
    }

    // If this goal has a parent, update the parent's progress as well
    if (goal.parentGoalId) {
      await updateGoalProgress(goal.parentGoalId);
    }

    // Revalidate the paths
    revalidatePath('/goals');
    revalidatePath('/');

    return updatedGoal;
  } catch (error) {
    console.error('Error updating goal progress:', error);
    return { success: false, message: 'Failed to update goal progress' };
  }
}

/**
 * Update the progress of all goals for a user
 * @param userId The ID of the user
 * @returns An object indicating success or failure
 */
export async function updateAllGoalsProgress(userId: string) {
  try {
    // Fetch all top-level goals (goals without a parent)
    const topLevelGoals = await prisma.goal.findMany({
      where: {
        userId,
        parentGoalId: null
      },
    });

    // Update the progress of each top-level goal
    // This will recursively update all sub-goals as well
    for (const goal of topLevelGoals) {
      await updateGoalProgress(goal.id);
    }

    // Revalidate the paths
    revalidatePath('/goals');
    revalidatePath('/');

    return { success: true, message: 'All goals progress updated' };
  } catch (error) {
    console.error('Error updating all goals progress:', error);
    return { success: false, message: 'Failed to update all goals progress' };
  }
}
