import { z } from 'zod';

// Enums for recurrence patterns
export const RecurrenceType = z.enum(['daily', 'weekly', 'monthly', 'yearly']);
export type RecurrenceType = z.infer<typeof RecurrenceType>;

export const MonthlyType = z.enum(['date', 'weekday']);
export type MonthlyType = z.infer<typeof MonthlyType>;

export const TerminationType = z.enum(['never', 'after', 'on']);
export type TerminationType = z.infer<typeof TerminationType>;

// Schema for reminder form
export const ReminderFormSchema = z.object({
  title: z.string().min(3, "Title must be at least 3 characters.").max(100),
  description: z.string().optional(),
  dueDate: z.date(),
  isRecurring: z.boolean().default(false),
  recurrence: z.string().optional(), // Kept for backward compatibility

  // Enhanced recurrence fields
  recurrenceEndDate: z.date().optional(),
  maxOccurrences: z.number().int().positive().optional(),
  recurrenceInterval: z.number().int().positive().default(1),
  weeklyDays: z.string().optional(), // "1,3,5" format
  monthlyType: MonthlyType.optional(),
  monthlyWeekday: z.number().int().min(0).max(6).optional(), // 0=Sunday, 6=Saturday
  monthlyWeekNumber: z.number().int().min(-1).max(5).optional(), // 1-5, -1 for last
  terminationType: TerminationType.default('never'),

  categoryId: z.string().optional(),
  goalId: z.string().optional(),
});

// Add validation for recurrence pattern
export const ReminderFormValidation = ReminderFormSchema.superRefine((data, ctx) => {
  if (!data.isRecurring) return;

  // Validate basic recurrence pattern
  if (!data.recurrence || !['daily', 'weekly', 'monthly', 'yearly'].includes(data.recurrence)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please select a valid recurrence pattern",
      path: ["recurrence"],
    });
    return;
  }

  // Validate termination settings
  if (data.terminationType === 'after' && (!data.maxOccurrences || data.maxOccurrences < 1)) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify the number of occurrences",
      path: ["maxOccurrences"],
    });
  }

  if (data.terminationType === 'on' && !data.recurrenceEndDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "Please specify an end date",
      path: ["recurrenceEndDate"],
    });
  }

  // Validate weekly patterns
  if (data.recurrence === 'weekly' && data.weeklyDays) {
    const days = data.weeklyDays.split(',').map(d => parseInt(d.trim()));
    if (days.some(d => isNaN(d) || d < 0 || d > 6)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Invalid weekly days selection",
        path: ["weeklyDays"],
      });
    }
  }

  // Validate monthly patterns
  if (data.recurrence === 'monthly') {
    if (data.monthlyType === 'weekday') {
      if (data.monthlyWeekday === undefined || data.monthlyWeekNumber === undefined) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Please specify weekday and week number for monthly weekday pattern",
          path: ["monthlyType"],
        });
      }
    }
  }

  // Validate end date is after start date
  if (data.recurrenceEndDate && data.recurrenceEndDate <= data.dueDate) {
    ctx.addIssue({
      code: z.ZodIssueCode.custom,
      message: "End date must be after the due date",
      path: ["recurrenceEndDate"],
    });
  }
});

export type ReminderFormValues = z.infer<typeof ReminderFormSchema>;

// Schema for creating a reminder
export const CreateReminderSchema = ReminderFormSchema.extend({
  userId: z.string(),
  createdAt: z.date(),
  updatedAt: z.date(),
});

export type CreateReminderValues = z.infer<typeof CreateReminderSchema>;

// Schema for updating a reminder
export const UpdateReminderSchema = ReminderFormSchema.partial().extend({
  id: z.string(),
  updatedAt: z.date(),
});

export type UpdateReminderValues = z.infer<typeof UpdateReminderSchema>;

export const ReminderStatus = z.enum(['PENDING', 'TRIGGERED', 'NOTIFIED', 'COMPLETED', 'DISMISSED', 'SNOOZED']);
export type ReminderStatus = z.infer<typeof ReminderStatus>;
