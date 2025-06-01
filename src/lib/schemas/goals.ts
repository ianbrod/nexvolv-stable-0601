// src/lib/schemas/goals.ts
import * as z from 'zod';

// --- Base Goal Fields (used by Create/Update/Form) ---
const GoalBaseSchema = z.object({
    name: z.string().min(3, "Name must be at least 3 characters.").max(100),
    description: z.string().max(500).optional().nullable(),
    categoryId: z.string().optional().nullable(), // Optional for sub-goals, removed cuid validation
    deadline: z.date().optional().nullable(),
    timeframe: z.string().optional().nullable(),
    progress: z.number().int().min(0).max(100).optional(),
    parentGoalId: z.string().cuid("Invalid parent goal ID format").optional().nullable(),
    tags: z.union([
        z.array(z.string()),
        z.string()
    ]).optional().nullable(),
});

// Add custom validation for categoryId requirement
const validateCategoryRequired = (data: any) => {
    // If it's a sub-goal (has parentGoalId), categoryId is not required
    if (data.parentGoalId) {
        return { success: true };
    }

    // For top-level goals, categoryId is required
    if (!data.categoryId) {
        return {
            success: false,
            error: {
                message: "Please select a category for this goal",
                path: ["categoryId"],
            }
        };
    }

    return { success: true };
};

// Helper function to get parent goal's category if available
export const getParentGoalCategory = async (parentGoalId: string | null | undefined) => {
    if (!parentGoalId) return null;

    try {
        // This would be replaced with actual database query in a real implementation
        // For now, we'll just return a success response
        return { success: true, categoryId: 'inherited' };
    } catch (error) {
        console.error('Error fetching parent goal category:', error);
        return { success: false, error: 'Failed to fetch parent goal category' };
    }
};

// --- Create Goal Schema (Input for createGoal action) ---
export const CreateGoalSchema = GoalBaseSchema
    .superRefine((data, ctx) => {
        const result = validateCategoryRequired(data);
        if (!result.success) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                message: result.error.message,
                path: result.error.path,
            });
        }
    });
export type CreateGoalInput = z.infer<typeof CreateGoalSchema>;

// --- Update Goal Schema (Input for updateGoal action) ---
export const UpdateGoalSchema = GoalBaseSchema.extend({
    id: z.string().cuid("Invalid ID format"),
}).superRefine((data, ctx) => {
    const result = validateCategoryRequired(data);
    if (!result.success) {
        ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: result.error.message,
            path: result.error.path,
        });
    }
});
export type UpdateGoalInput = z.infer<typeof UpdateGoalSchema>;

// --- Goal Form Validation Schema (Used by react-hook-form) ---
export const GoalFormSchema = GoalBaseSchema.extend({
    id: z.string().cuid("Invalid ID format").optional(),
});
export type GoalFormInput = z.infer<typeof GoalFormSchema>;

// --- Original Update Schema (Less useful for form validation) ---
// export const UpdateGoalSchema = CreateGoalSchema.extend({
//     id: z.string().uuid(), // Require ID for update
// }).partial(); // Make all fields optional for partial updates, except ID

// If we want a stricter update where all fields MUST be present for update (less common)
// export const StrictUpdateGoalSchema = CreateGoalSchema.extend({ id: z.string().uuid() });
// export type StrictUpdateGoalInput = z.infer<typeof StrictUpdateGoalSchema>;