/**
 * Utility functions for calculating goal progression
 */

import { Goal, Task, TaskStatus } from '@prisma/client';

/**
 * Calculate the progression percentage of a task based on its status
 * @param task The task to calculate progression for
 * @returns A number between 0 and 100 representing the task's progression percentage
 */
export function calculateTaskProgression(task: Task): number {
  switch (task.status) {
    case TaskStatus.COMPLETED:
      return 100;
    case TaskStatus.IN_PROGRESS:
      // For now, we'll use a fixed value for IN_PROGRESS tasks
      // In the future, this could be user-adjustable
      return 50;
    case TaskStatus.TODO:
    default:
      return 0;
  }
}

/**
 * Calculate the progression percentage of a goal based on its sub-goals and tasks
 * @param goal The goal to calculate progression for
 * @param allGoals All goals in the system (to find sub-goals)
 * @param allTasks All tasks in the system (to find tasks associated with goals)
 * @returns A number between 0 and 100 representing the goal's progression percentage
 */
export function calculateGoalProgression(
  goal: Goal,
  allGoals: Goal[],
  allTasks: Task[]
): number {
  // Find all sub-goals of this goal
  const subGoals = allGoals.filter(g => g.parentGoalId === goal.id);
  
  // Find all tasks directly associated with this goal
  const directTasks = allTasks.filter(t => t.goalId === goal.id);
  
  // If there are no sub-goals and no tasks, return 0% progress
  if (subGoals.length === 0 && directTasks.length === 0) {
    return 0;
  }
  
  // Calculate the total number of tasks in each group
  const directTaskCount = directTasks.length;
  
  // Calculate the sub-goal task counts
  const subGoalTaskCounts = subGoals.map(subGoal => {
    const subGoalTasks = allTasks.filter(t => t.goalId === subGoal.id);
    return {
      subGoal,
      taskCount: subGoalTasks.length
    };
  });
  
  // Calculate the total number of tasks across all groups
  const totalTaskCount = directTaskCount + subGoalTaskCounts.reduce((sum, { taskCount }) => sum + taskCount, 0);
  
  // If there are no tasks at all, return 0% progress
  if (totalTaskCount === 0) {
    return 0;
  }
  
  // Calculate the weight of each group based on its task count
  const directTaskWeight = directTaskCount / totalTaskCount;
  const subGoalWeights = subGoalTaskCounts.map(({ subGoal, taskCount }) => ({
    subGoal,
    weight: taskCount / totalTaskCount
  }));
  
  // Calculate the progress of direct tasks
  const directTasksProgress = directTasks.reduce((sum, task) => sum + calculateTaskProgression(task), 0);
  const directTasksProgressPercentage = directTaskCount > 0 
    ? directTasksProgress / directTaskCount 
    : 0;
  
  // Calculate the weighted progress of direct tasks
  const weightedDirectTasksProgress = directTasksProgressPercentage * directTaskWeight;
  
  // Calculate the weighted progress of each sub-goal
  const weightedSubGoalsProgress = subGoalWeights.reduce((sum, { subGoal, weight }) => {
    // Recursively calculate the progress of the sub-goal
    const subGoalProgress = calculateGoalProgression(subGoal, allGoals, allTasks);
    return sum + (subGoalProgress * weight);
  }, 0);
  
  // Calculate the total weighted progress
  const totalProgress = weightedDirectTasksProgress + weightedSubGoalsProgress;
  
  // Return the progress as a percentage (0-100)
  return Math.round(totalProgress);
}
