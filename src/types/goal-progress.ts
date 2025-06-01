/**
 * Types related to goal progress history tracking
 */

import { Prisma } from '@prisma/client';

/**
 * Type for goal progress snapshot data
 */
export type GoalProgressSnapshotData = Prisma.GoalProgressSnapshotGetPayload<{
  select: {
    id: true,
    timestamp: true,
    progress: true,
    notes: true,
    goalId: true,
    userId: true,
    createdAt: true,
    updatedAt: true,
    goal: {
      select: {
        id: true,
        name: true,
      }
    }
  }
}>;

/**
 * Type for creating a new goal progress snapshot
 */
export type CreateGoalProgressSnapshotInput = {
  goalId: string;
  progress: number;
  notes?: string;
};

/**
 * Type for retrieving goal progress history with filtering options
 */
export type GoalProgressHistoryOptions = {
  goalId: string;
  startDate?: Date;
  endDate?: Date;
  limit?: number;
};

/**
 * Type for progress history analytics
 */
export type GoalProgressAnalytics = {
  averageProgress: number;
  progressVelocity: number; // Progress points per day
  estimatedCompletionDate?: Date;
  consistencyScore: number; // 0-100 score based on regular progress updates
  stagnationPeriods: Array<{
    startDate: Date;
    endDate: Date;
    duration: number; // In days
  }>;
};
