import { z } from 'zod';
import { TaskStatus } from '@prisma/client';

/**
 * Schema for validating task status updates
 */
export const TaskStatusUpdateSchema = z.object({
  taskId: z.string().min(1, "Task ID is required"),
  status: z.nativeEnum(TaskStatus, {
    errorMap: () => ({ message: `Status must be one of: ${Object.values(TaskStatus).join(', ')}` })
  })
});

export type TaskStatusUpdateInput = z.infer<typeof TaskStatusUpdateSchema>;
