// src/lib/schemas/notes.ts
import * as z from 'zod';

/**
 * Base schema for note fields
 */
const NoteBaseSchema = z.object({
  title: z.string().max(100).optional().nullable(),
  content: z.string().min(1, "Note content is required").max(5000),
  goalId: z.string().cuid("Invalid goal ID format").optional().nullable(),
  taskId: z.string().cuid("Invalid task ID format").optional().nullable(),
});

/**
 * Schema for creating a new note
 * At least one of goalId or taskId must be provided
 */
export const CreateNoteSchema = NoteBaseSchema.refine(
  (data) => data.goalId || data.taskId,
  {
    message: "A note must be associated with either a goal or a task",
    path: ["association"],
  }
);
export type CreateNoteInput = z.infer<typeof CreateNoteSchema>;

/**
 * Schema for updating an existing note
 */
export const UpdateNoteSchema = NoteBaseSchema.extend({
  id: z.string().cuid("Invalid note ID format"),
}).refine(
  (data) => data.goalId || data.taskId,
  {
    message: "A note must be associated with either a goal or a task",
    path: ["association"],
  }
);
export type UpdateNoteInput = z.infer<typeof UpdateNoteSchema>;
