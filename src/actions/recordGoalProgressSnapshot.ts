'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { PLACEHOLDER_USER_ID } from '@/lib/auth-placeholder';
import { CreateGoalProgressSnapshotSchema } from '@/lib/schemas/goal-progress';

/**
 * Record a snapshot of a goal's progress
 *
 * @param data Object containing goalId, progress, and optional notes
 * @returns Object indicating success or failure
 */
export async function recordGoalProgressSnapshot(data: {
  goalId: string;
  progress: number;
  notes?: string;
}) {
  try {
    // Validate input data
    const validatedData = CreateGoalProgressSnapshotSchema.parse(data);

    // Use placeholder user ID for development
    const userId = PLACEHOLDER_USER_ID;

    // Verify the goal exists and belongs to the user
    const goal = await prisma.goal.findUnique({
      where: {
        id: validatedData.goalId,
        userId,
      },
    });

    if (!goal) {
      return { success: false, message: 'Goal not found or access denied' };
    }

    // Get the most recent snapshot for this goal
    const latestSnapshot = await prisma.goalProgressSnapshot.findFirst({
      where: {
        goalId: validatedData.goalId,
      },
      orderBy: {
        timestamp: 'desc',
      },
    });

    // Check if this is a significant change (5% or more)
    // or if there's no previous snapshot
    const isSignificantChange = !latestSnapshot ||
      Math.abs(latestSnapshot.progress - validatedData.progress) >= 5;

    // Only create a new snapshot if it's a significant change
    if (isSignificantChange) {
      // Create the snapshot
      const snapshot = await prisma.goalProgressSnapshot.create({
        data: {
          progress: validatedData.progress,
          notes: validatedData.notes,
          goalId: validatedData.goalId,
          userId,
        },
      });

      // Revalidate relevant paths
      revalidatePath('/goals');
      revalidatePath(`/goals/${validatedData.goalId}`);

      return {
        success: true,
        message: 'Progress snapshot recorded',
        data: snapshot
      };
    }

    return {
      success: true,
      message: 'No significant change in progress, snapshot not recorded',
      data: latestSnapshot
    };

  } catch (error) {
    console.error('Error recording goal progress snapshot:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Failed to record progress snapshot'
    };
  }
}
