/**
 * Top Goals Cycling Algorithm Service
 *
 * This service implements the algorithm for selecting and cycling the top goals
 * to be displayed on the dashboard, as defined in goal-hierarchy-logic.md.
 */

import { Goal, Task, TaskStatus } from '@prisma/client';
import { prisma } from '@/lib/prisma';

// Cache for storing calculated scores
interface TopGoalsCache {
  goals: [GoalWithSubgoalCount, Task[]][];
  timestamp: number;
  expiresAt: number;
}

// In-memory cache with 15-minute expiration
let topGoalsCache: TopGoalsCache | null = null;

// Cache expiration time in milliseconds (15 minutes)
const CACHE_EXPIRATION_TIME = 15 * 60 * 1000;

// Type for a goal with subgoal count
export type GoalWithSubgoalCount = Goal & {
  _count?: { subGoals: number };
  category?: { id: string; name: string; color?: string } | null;
  lastDisplayedAt?: Date | null; // Track when a goal was last displayed
  completedAt?: Date | null; // Track when a goal was completed
};

// Type for a scored goal with its tasks
export interface ScoredGoal {
  goal: GoalWithSubgoalCount;
  tasks: Task[];
  score: number;
  baseScore: number;
  modifiedScore: number;
  adjustedScore: number; // Score after cycling adjustment
  factors: {
    subgoalCount: number;
    totalTaskCount: number;
    activeTaskCount: number;
    deadlineProximity: number;
    userPriority: number;
  };
  modifiers: {
    recentActivity: number;
    overdueTasks: number;
    stagnation: number;
    completion: number;
  };
}

/**
 * Calculate the importance score for a goal based on the primary scoring factors
 * as defined in goal-hierarchy-logic.md.
 *
 * @param goal The goal to score
 * @param tasks Tasks associated with the goal
 * @param allGoals All goals in the system (for normalization)
 * @param allTasks All tasks in the system (for normalization)
 * @param preComputedValues Optional pre-computed values for better performance
 * @returns A ScoredGoal object containing the goal, its tasks, and its score
 */
export function calculateGoalScore(
  goal: GoalWithSubgoalCount,
  tasks: Task[],
  allGoals: GoalWithSubgoalCount[],
  allTasks: Task[],
  preComputedValues?: {
    maxSubgoalCount: number;
    maxTaskCount: number;
    maxActiveTasks: number;
  }
): ScoredGoal {
  // 1. Calculate Sub-goal Count factor (15%)
  const maxSubgoalCount = preComputedValues?.maxSubgoalCount || Math.max(
    ...allGoals.map(g => g._count?.subGoals || 0),
    1 // Avoid division by zero
  );
  const subgoalCount = Math.min((goal._count?.subGoals || 0) / maxSubgoalCount, 1);

  // 2. Calculate Total Task Count factor (20%)
  const maxTaskCount = preComputedValues?.maxTaskCount || Math.max(
    ...allGoals.map(g => {
      return allTasks.filter(t => t.goalId === g.id).length;
    }),
    1 // Avoid division by zero
  );
  const totalTaskCount = Math.min(tasks.length / maxTaskCount, 1);

  // 3. Calculate Active Task Count factor (25%)
  const activeTasks = tasks.filter(
    t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.ARCHIVED
  );
  const maxActiveTasks = preComputedValues?.maxActiveTasks || Math.max(
    ...allGoals.map(g => {
      const goalTasks = allTasks.filter(t => t.goalId === g.id);
      return goalTasks.filter(
        t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.ARCHIVED
      ).length;
    }),
    1 // Avoid division by zero
  );
  const activeTaskCount = Math.min(activeTasks.length / maxActiveTasks, 1);

  // 4. Calculate Deadline Proximity factor (20%)
  let deadlineProximity = 0.5; // Default value if no deadline
  if (goal.deadline) {
    const now = new Date();
    const deadline = new Date(goal.deadline);
    const daysUntilDeadline = Math.max(
      0,
      Math.ceil((deadline.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    );
    deadlineProximity = daysUntilDeadline <= 30 ? 1 - daysUntilDeadline / 30 : 0;
  }

  // 5. Calculate User Priority factor (20%)
  // Since we don't have a direct priority field on Goal, we'll use progress as a proxy
  // In a real implementation, this would use the actual user-defined priority
  const userPriority = goal.progress ? (goal.progress >= 75 ? 1 : goal.progress >= 50 ? 0.6 : 0.3) : 0.3;

  // Calculate the base score using the formula from goal-hierarchy-logic.md
  const baseScore = (
    subgoalCount * 0.15 +
    totalTaskCount * 0.20 +
    activeTaskCount * 0.25 +
    deadlineProximity * 0.20 +
    userPriority * 0.20
  );

  // Calculate secondary modifiers (Phase 2)

  // 1. Recent Activity Modifier (+10-20%)
  let recentActivityModifier = 0;
  const daysSinceLastActivity = goal.updatedAt
    ? Math.ceil((new Date().getTime() - new Date(goal.updatedAt).getTime()) / (1000 * 60 * 60 * 24))
    : 999;

  if (daysSinceLastActivity < 2) {
    recentActivityModifier = 0.2;
  } else if (daysSinceLastActivity < 5) {
    recentActivityModifier = 0.1;
  }

  // 2. Overdue Tasks Modifier (scaled based on number of overdue tasks)
  // Count the number of overdue tasks
  const overdueTasks = tasks.filter(task =>
    task.status !== TaskStatus.COMPLETED &&
    task.dueDate &&
    new Date(task.dueDate) < new Date()
  );
  const overdueTasksCount = overdueTasks.length;

  // Scale the modifier based on the number of overdue tasks
  // 1 overdue task: +15%, 2 overdue tasks: +25%, 3+ overdue tasks: +35%
  let overdueTasksModifier = 0;
  if (overdueTasksCount === 1) {
    overdueTasksModifier = 0.15;
  } else if (overdueTasksCount === 2) {
    overdueTasksModifier = 0.25;
  } else if (overdueTasksCount >= 3) {
    overdueTasksModifier = 0.35;
  }

  // 3. Stagnation Modifier (+10%)
  // For simplicity, we'll use the same logic as recent activity but with a longer timeframe
  const stagnationModifier = daysSinceLastActivity > 14 ? 0.1 : 0;

  // 4. Completion Modifier (-0-50%)
  // Use the goal's progress value (0-100) divided by 200 to get a 0-0.5 range
  const completionModifier = goal.progress ? goal.progress / 200 : 0;

  // Calculate the modified score using the formula from goal-hierarchy-logic.md
  const modifiedScore = baseScore * (
    1 +
    recentActivityModifier +
    overdueTasksModifier +
    stagnationModifier -
    completionModifier
  );

  // Log detailed scoring information for debugging
  console.log(`[topGoalsService] Goal "${goal.name}" score details:
    - Base score: ${baseScore.toFixed(2)}
    - Modified score: ${modifiedScore.toFixed(2)}
    - Overdue tasks: ${overdueTasksCount} (modifier: +${(overdueTasksModifier * 100).toFixed(0)}%)
    - Active tasks: ${activeTasks.length}
    - Total tasks: ${tasks.length}
    - Subgoals: ${goal._count?.subGoals || 0}
  `);

  // For Phase 2, we'll return both the base score and the modified score
  return {
    goal,
    tasks,
    score: modifiedScore, // Use the modified score as the main score
    baseScore,
    modifiedScore,
    adjustedScore: modifiedScore, // Will be adjusted for cycling in getTopGoals
    factors: {
      subgoalCount,
      totalTaskCount,
      activeTaskCount,
      deadlineProximity,
      userPriority
    },
    modifiers: {
      recentActivity: recentActivityModifier,
      overdueTasks: overdueTasksModifier,
      stagnation: stagnationModifier,
      completion: completionModifier
    }
  };
}

/**
 * Select the top parent goals based on their importance scores
 *
 * This function filters out sub-goals (goals with a parentGoalId) and only considers
 * parent goals for the "Top Three Goals" section on the dashboard.
 *
 * @param goals All goals in the system
 * @param tasks All tasks in the system
 * @param limit Maximum number of goals to return (default: 3)
 * @param useCache Whether to use the cache (default: true)
 * @returns An array of [goal, tasks] tuples for the top parent goals
 */
export function getTopGoals(
  goals: GoalWithSubgoalCount[] = [],
  tasks: Task[] = [],
  limit = 3,
  useCache = true
): [GoalWithSubgoalCount, Task[]][] {
  // Check if we can use the cache
  const now = Date.now();
  if (useCache && topGoalsCache && now < topGoalsCache.expiresAt) {
    console.log('[topGoalsService] Using cached top goals');
    return topGoalsCache.goals;
  }

  console.log('[topGoalsService] Calculating top goals');

  // Log the total number of goals and how many are sub-goals
  const subGoalCount = goals.filter(goal => goal.parentGoalId !== null).length;
  console.log(`[topGoalsService] Total goals: ${goals.length}, Sub-goals: ${subGoalCount}, Parent goals: ${goals.length - subGoalCount}`);

  // Filter out archived goals, completed goals, and sub-goals
  // Include only parent goals (parentGoalId is null) that are:
  // 1. Non-archived, and
  // 2. Not completed (progress < 100)
  const activeGoals = goals.filter(goal => {
    // Filter out sub-goals - only include parent goals
    if (goal.parentGoalId !== null) {
      return false;
    }

    // Filter out archived goals
    if (goal.isArchived) {
      return false;
    }

    // Filter out completed goals (they should only appear on wins page)
    if (goal.progress === 100) {
      return false;
    }

    return true;
  });

  // Log how many goals remain after filtering
  console.log(`[topGoalsService] After filtering: ${activeGoals.length} parent goals remain`);

  // Edge Case 4.3: No Goals
  if (activeGoals.length === 0) {
    console.log('[topGoalsService] No active goals found');
    return [];
  }

  // Edge Case 4.1: Fewer Than Three Goals
  if (activeGoals.length < limit) {
    console.log(`[topGoalsService] Only ${activeGoals.length} active goals found (less than requested ${limit})`);
    // We'll continue with the available goals
  }

  // Note: Removed "All Goals Completed" edge case since completed goals
  // should never appear on the dashboard - they belong on the wins page only

  // Performance optimization: Pre-compute and memoize task grouping
  const tasksByGoal = tasks.reduce((acc, task) => {
    if (task.goalId) {
      if (!acc[task.goalId]) acc[task.goalId] = [];
      acc[task.goalId].push(task);
    }
    return acc;
  }, {} as Record<string, Task[]>);

  // Performance optimization: Pre-compute max values for normalization
  const maxSubgoalCount = Math.max(...activeGoals.map(g => g._count?.subGoals || 0), 1);
  const maxTaskCount = Math.max(...activeGoals.map(g => tasksByGoal[g.id]?.length || 0), 1);
  const maxActiveTasks = Math.max(
    ...activeGoals.map(g => {
      const goalTasks = tasksByGoal[g.id] || [];
      return goalTasks.filter(
        t => t.status !== TaskStatus.COMPLETED && t.status !== TaskStatus.ARCHIVED
      ).length;
    }),
    1
  );

  // Calculate scores for all goals (with memoized values for better performance)
  const scoredGoals = activeGoals.map(goal => {
    const goalTasks = tasksByGoal[goal.id] || [];

    // Edge Case 4.4: Goals Without Tasks
    if (goalTasks.length === 0) {
      console.log(`[topGoalsService] Goal ${goal.id} has no tasks`);
      // We'll apply a small penalty to goals without tasks
      const scoredGoal = calculateGoalScore(
        goal,
        goalTasks,
        activeGoals,
        tasks,
        { maxSubgoalCount, maxTaskCount, maxActiveTasks } // Pass pre-computed values
      );

      // Apply a 10% penalty to the score
      scoredGoal.score *= 0.9;
      scoredGoal.modifiedScore *= 0.9;

      return scoredGoal;
    }

    return calculateGoalScore(
      goal,
      goalTasks,
      activeGoals,
      tasks,
      { maxSubgoalCount, maxTaskCount, maxActiveTasks } // Pass pre-computed values
    );
  });

  // Apply cycling logic (Phase 2)
  // Adjust scores based on when goals were last displayed
  const adjustedScoredGoals = scoredGoals.map(scoredGoal => {
    const { goal } = scoredGoal;

    // If the goal has never been displayed, no adjustment needed
    if (!goal.lastDisplayedAt) {
      return { ...scoredGoal, adjustedScore: scoredGoal.score };
    }

    // Calculate days since last displayed
    const daysSinceLastDisplayed = Math.ceil(
      (now - new Date(goal.lastDisplayedAt).getTime()) / (1000 * 60 * 60 * 24)
    );

    // Apply time-based decay to recently displayed goals
    // AdjustedScore = Score * (1 - min(daysSinceLastDisplayed / 7, 0.3))
    const decayFactor = 1 - Math.min(daysSinceLastDisplayed / 7, 0.3);
    const adjustedScore = scoredGoal.score * decayFactor;

    return { ...scoredGoal, adjustedScore };
  });

  // Sort goals by adjusted score in descending order and take the top 'limit'
  const topGoals = adjustedScoredGoals
    .sort((a, b) => b.adjustedScore - a.adjustedScore)
    .slice(0, limit);

  // Log the final top goals for debugging
  console.log('[topGoalsService] Final top goals:');
  topGoals.forEach((scoredGoal, index) => {
    const { goal, tasks, adjustedScore } = scoredGoal;
    const overdueTasksCount = tasks.filter(t =>
      t.status !== TaskStatus.COMPLETED &&
      t.dueDate &&
      new Date(t.dueDate) < new Date()
    ).length;

    console.log(`  ${index + 1}. "${goal.name}" (score: ${adjustedScore.toFixed(2)}, overdue tasks: ${overdueTasksCount}, total tasks: ${tasks.length})`);
  });

  // Update lastDisplayedAt for the selected goals
  const selectedGoals = topGoals.map(({ goal, tasks }) => {
    // Update the goal in memory
    const updatedGoal = { ...goal, lastDisplayedAt: new Date(now) };

    // Also update the database (async, don't wait for it)
    updateGoalLastDisplayed(goal.id).catch(err =>
      console.error(`[topGoalsService] Error updating lastDisplayedAt for goal ${goal.id}:`, err)
    );

    return [updatedGoal, tasks] as [GoalWithSubgoalCount, Task[]];
  });

  // Update the cache
  if (useCache) {
    topGoalsCache = {
      goals: selectedGoals,
      timestamp: now,
      expiresAt: now + CACHE_EXPIRATION_TIME
    };
  }

  return selectedGoals;
}

/**
 * Update the lastDisplayedAt timestamp for a goal
 *
 * @param goalId The ID of the goal to update
 * @returns A promise that resolves when the update is complete
 */
export async function updateGoalLastDisplayed(goalId: string): Promise<void> {
  try {
    await prisma.goal.update({
      where: { id: goalId },
      data: { lastDisplayedAt: new Date() }
    });
  } catch (error) {
    console.error(`Error updating lastDisplayedAt for goal ${goalId}:`, error);
  }
}

/**
 * Invalidate the top goals cache
 * This should be called whenever a goal, task, or sub-goal is created, updated, or deleted
 */
export function invalidateTopGoalsCache(): void {
  console.log('[topGoalsService] Invalidating top goals cache');
  topGoalsCache = null;
}
