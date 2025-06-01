'use server';

import { prisma } from '@/lib/prisma';
import { PLACEHOLDER_USER_ID } from '@/lib/auth-placeholder';
import { calculateProgressAnalytics } from '@/lib/utils/goal-progress-analytics';

/**
 * Get analytics for a goal's progress history
 *
 * @param goalId The ID of the goal to analyze
 * @returns Object containing analytics data or an error message
 */
export async function getGoalProgressAnalytics(goalId: string) {
  try {
    // Use placeholder user ID for development
    const userId = PLACEHOLDER_USER_ID;

    // Verify the goal exists and belongs to the user
    const goal = await prisma.goal.findUnique({
      where: {
        id: goalId,
        userId,
      },
    });

    if (!goal) {
      return { success: false, message: 'Goal not found or access denied' };
    }

    // Retrieve all progress snapshots for this goal
    const progressSnapshots = await prisma.goalProgressSnapshot.findMany({
      where: {
        goalId,
        userId,
      },
      orderBy: {
        timestamp: 'asc', // Oldest to newest
      },
    });

    // Calculate analytics
    const analytics = calculateProgressAnalytics(progressSnapshots);

    return {
      success: true,
      data: {
        goal,
        analytics,
        snapshotCount: progressSnapshots.length,
      }
    };

  } catch (error) {
    console.error('Error retrieving goal progress analytics:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve progress analytics'
    };
  }
}
