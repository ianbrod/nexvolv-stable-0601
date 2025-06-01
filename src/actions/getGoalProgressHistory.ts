'use server';

import { prisma } from '@/lib/prisma';
import { PLACEHOLDER_USER_ID } from '@/lib/auth-placeholder';
import { GoalProgressHistorySchema } from '@/lib/schemas/goal-progress';

/**
 * Retrieve the progress history for a specific goal
 *
 * @param options Object containing goalId and optional filtering parameters
 * @returns Object containing the progress history or an error message
 */
export async function getGoalProgressHistory(options: {
  goalId: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
}) {
  try {
    // Validate input data
    const validatedOptions = GoalProgressHistorySchema.parse(options);

    // Use placeholder user ID for development
    const userId = PLACEHOLDER_USER_ID;

    // Verify the goal exists and belongs to the user
    const goal = await prisma.goal.findUnique({
      where: {
        id: validatedOptions.goalId,
        userId,
      },
    });

    if (!goal) {
      return { success: false, message: 'Goal not found or access denied' };
    }

    // Build the query conditions
    const whereConditions: any = {
      goalId: validatedOptions.goalId,
      userId,
    };

    // Add date range conditions if provided
    if (validatedOptions.startDate || validatedOptions.endDate) {
      whereConditions.timestamp = {};

      if (validatedOptions.startDate) {
        whereConditions.timestamp.gte = validatedOptions.startDate;
      }

      if (validatedOptions.endDate) {
        whereConditions.timestamp.lte = validatedOptions.endDate;
      }
    }

    // Retrieve the progress history
    const progressHistory = await prisma.goalProgressSnapshot.findMany({
      where: whereConditions,
      orderBy: {
        timestamp: 'asc', // Oldest to newest for charting
      },
      take: validatedOptions.limit,
    });

    return {
      success: true,
      data: progressHistory
    };

  } catch (error) {
    console.error('Error retrieving goal progress history:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to retrieve progress history'
    };
  }
}
