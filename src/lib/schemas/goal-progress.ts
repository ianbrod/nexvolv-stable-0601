// src/lib/schemas/goal-progress.ts
import * as z from 'zod';

/**
 * Schema for creating a goal progress snapshot
 */
export const CreateGoalProgressSnapshotSchema = z.object({
  goalId: z.string().cuid("Invalid goal ID format"),
  progress: z.number().int().min(0).max(100, "Progress must be between 0 and 100"),
  notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
});
export type CreateGoalProgressSnapshotInput = z.infer<typeof CreateGoalProgressSnapshotSchema>;

/**
 * Schema for retrieving goal progress history
 */
export const GoalProgressHistorySchema = z.object({
  goalId: z.string().cuid("Invalid goal ID format"),
  startDate: z.date().optional(),
  endDate: z.date().optional(),
  limit: z.number().int().min(1).max(100).optional().default(50),
});
export type GoalProgressHistoryInput = z.infer<typeof GoalProgressHistorySchema>;
