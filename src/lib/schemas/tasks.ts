import { z } from 'zod';
import { TaskPriority, RecurrencePattern, TaskStatus } from '@prisma/client';

// Schema for createTask action validation (used by client form and server action)
export const CreateTaskSchema = z.object({
    name: z.string().min(3, { message: "Task name must be at least 3 characters." }),
    description: z.string().optional(),
    priority: z.nativeEnum(TaskPriority).default(TaskPriority.MEDIUM),
    dueDate: z.date().optional().nullable(),
    // Goal ID is required for creation according to original schema
    goalId: z.string().min(1, { message: "Please select a goal or sub-goal for this task." }),
    status: z.nativeEnum(TaskStatus).default(TaskStatus.TODO),
    recurrencePattern: z.nativeEnum(RecurrencePattern).default(RecurrencePattern.NONE),
    recurrenceEndDate: z.date().optional().nullable(),
});
export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

// Schema for updateTask action validation
// Start with base, make fields optional using .partial()
// Then explicitly add required 'id' and refine 'goalId' for updates
export const UpdateTaskSchema = CreateTaskSchema.partial().extend({
    id: z.string().min(1), // ID is always required for updating
    // Explicitly define goalId for update, allowing null or undefined
    // Use .nullable() to allow null, .optional() to allow undefined/omission
    goalId: z.string().min(1).optional().nullable(), // Allow empty string -> null conversion later
});
export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;


// Schema for updating task status
export const UpdateTaskStatusSchema = z.object({
    taskId: z.string().min(1),
    status: z.nativeEnum(TaskStatus),
});
export type UpdateTaskStatusInput = z.infer<typeof UpdateTaskStatusSchema>;

// Keep the old schema for backward compatibility
export const UpdateTaskCompletionSchema = z.object({
    taskId: z.string().min(1),
    completed: z.boolean(),
});
export type UpdateTaskCompletionInput = z.infer<typeof UpdateTaskCompletionSchema>;