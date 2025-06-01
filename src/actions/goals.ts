'use server';

import { revalidatePath } from 'next/cache';
import { Prisma } from '@prisma/client';
import { prisma } from "@/lib/prisma";
import {
  CreateGoalSchema,
  CreateGoalInput,
  UpdateGoalSchema,
  UpdateGoalInput,
} from "@/lib/schemas/goals";
import {
  ApiResponse,
  createSuccessResponse,
  createErrorResponse,
  ErrorCode
} from '@/lib/error-handling';
import { withValidation, withErrorHandling } from '@/lib/action-wrapper';
import { getUserId } from '@/lib/auth-placeholder';

/**
 * Type definition for action response (legacy)
 * @deprecated Use ApiResponse from error-handling.ts instead
 */
type ActionResponse<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
};

/**
 * Recursively get all descendant goal IDs for a given goal
 * @param goalId - The parent goal ID
 * @param userId - The user ID to ensure security
 * @returns Array of descendant goal IDs
 */
async function getDescendantGoalIds(goalId: string, userId: string): Promise<string[]> {
  const descendantIds: string[] = [];

  // Get direct children
  const directChildren = await prisma.goal.findMany({
    where: {
      parentGoalId: goalId,
      userId: userId
    },
    select: { id: true }
  });

  // Add direct children to the list
  for (const child of directChildren) {
    descendantIds.push(child.id);

    // Recursively get descendants of this child
    const childDescendants = await getDescendantGoalIds(child.id, userId);
    descendantIds.push(...childDescendants);
  }

  return descendantIds;
}

/**
 * Create a new goal - Implementation function
 *
 * This is the actual implementation that will be wrapped with validation
 *
 * @param data - The validated goal data to create
 * @returns The created goal
 */
async function createGoalImpl(data: CreateGoalInput): Promise<Prisma.GoalGetPayload<{}>> {
  console.log('createGoalImpl called with data:', JSON.stringify(data, null, 2));
  const userId = await getUserId();
  console.log('User ID:', userId);

  // Check if this is a sub-goal (has parentGoalId)
  const isSubGoal = !!data.parentGoalId;
  console.log('Is sub-goal:', isSubGoal);

  // For sub-goals, we need to ensure the parent goal exists
  if (isSubGoal) {
    const parentGoal = await prisma.goal.findUnique({
      where: { id: data.parentGoalId as string },
    });

    if (!parentGoal) {
      throw new Error("Parent goal not found.");
    }

    // If the sub-goal doesn't have a category, inherit from parent
    if (!data.categoryId && parentGoal.categoryId) {
      data.categoryId = parentGoal.categoryId;
    }
  }

  // Handle tags as a comma-separated string
  console.log('Processing tags:', data.tags, 'Type:', typeof data.tags);
  if (data.tags) {
    if (Array.isArray(data.tags)) {
      // Convert array to comma-separated string
      data.tags = data.tags.join(',');
      console.log('Converted tags array to string:', data.tags);
    } else if (typeof data.tags === 'string') {
      // Tags is already a string, keep as is
      console.log('Tags is already a string:', data.tags);
    } else {
      console.log('Invalid tags format, removing tags field');
      delete data.tags; // Remove tags if it's not a valid format
    }
  } else {
    // Set empty string for tags if not provided
    data.tags = '';
    console.log('No tags provided, setting empty string');
  }

  console.log('Final data before create:', JSON.stringify(data, null, 2));

  // Create the goal
  const newGoal = await prisma.goal.create({
    data: {
      ...data,
      userId: userId,
    },
  });

  console.log('Goal created successfully:', JSON.stringify(newGoal, null, 2));
  return newGoal;
}

/**
 * Create a new goal - Public API
 *
 * @param values - The goal data to create
 * @returns ApiResponse with the created goal
 */
export async function createGoal(values: unknown) {
  console.log('createGoal called with values:', JSON.stringify(values, null, 2));

  // Use the validation wrapper
  const validationWrapper = withValidation(
    CreateGoalSchema,
    createGoalImpl,
    {
      revalidatePaths: ['/goals'],
      successMessage: "Goal created successfully.",
      context: "createGoal"
    }
  );

  const result = await validationWrapper(values);
  console.log('createGoal result:', JSON.stringify(result, null, 2));
  return result;
}

/**
 * Legacy createGoal function for backward compatibility
 * @deprecated Use the new createGoal function instead
 */
export async function createGoalLegacy(values: CreateGoalInput): Promise<ActionResponse<Prisma.GoalGetPayload<{}>>> {
  const result = await createGoal(values);

  if (result.success) {
    return {
      success: true,
      message: result.message || "Goal created successfully.",
      data: result.data
    };
  } else {
    return {
      success: false,
      message: result.error?.message || "Failed to create goal."
    };
  }
}

/**
 * Update an existing goal - Implementation
 *
 * @param values - The goal data to update
 * @returns The updated goal
 */
async function updateGoalImpl(values: UpdateGoalInput): Promise<Prisma.GoalGetPayload<{}>> {
  const userId = await getUserId();

  const { id, ...dataToUpdate } = values;

  // We've already validated the entire object with the schema

  try {
    console.log('updateGoal called with values:', JSON.stringify(values, null, 2));

    // Get the goal ID
    const goalId = values.id;
    if (!goalId) {
      console.error('No goal ID provided for update');
      throw new Error("Goal ID is required for updates.");
    }

    // Prepare update data
    const updateData = { ...values };
    delete updateData.id; // Remove ID from update data

    console.log('Update data before processing tags:', JSON.stringify(updateData, null, 2));

    // Handle tags as a comma-separated string
    if (updateData.tags) {
      console.log('Tags before processing:', updateData.tags, 'Type:', typeof updateData.tags);

      if (Array.isArray(updateData.tags)) {
        // Convert array to comma-separated string
        updateData.tags = updateData.tags.join(',');
        console.log('Converted tags array to string:', updateData.tags);
      } else if (typeof updateData.tags !== 'string') {
        console.log('Invalid tags format, removing tags field');
        delete updateData.tags; // Remove tags if it's not a valid format
      }
    } else {
      console.log('No tags provided in update data');
      // Explicitly set tags to an empty string if not provided
      updateData.tags = '';
    }

    // Check if this is a sub-goal (has parentGoalId)
    const goalToUpdate = await prisma.goal.findUnique({
      where: { id: goalId },
      include: { category: true }
    });

    if (!goalToUpdate) {
      throw new Error("Goal not found.");
    }

    // If this is a sub-goal, ensure it has a categoryId from its parent
    if (values.parentGoalId || goalToUpdate.parentGoalId) {
      console.log('Updating a sub-goal, checking parent for category');

      // Find the parent goal to get its category
      const parentGoalId = values.parentGoalId || goalToUpdate.parentGoalId;
      if (parentGoalId) {
        const parentGoal = await prisma.goal.findUnique({
          where: { id: parentGoalId },
        });

        if (parentGoal?.categoryId) {
          // Inherit the category from the parent goal
          updateData.categoryId = parentGoal.categoryId;
          console.log('Setting categoryId from parent for update:', updateData.categoryId);
        }
      }
    }

    // Log the final update data
    console.log('Final update data:', JSON.stringify(updateData, null, 2));

    // Update the goal using update instead of updateMany
    const updatedGoal = await prisma.goal.update({
      where: {
        id: goalId,
        userId: userId, // Ensure the goal belongs to the user
      },
      data: updateData,
    });

    console.log('Goal updated successfully:', JSON.stringify(updatedGoal, null, 2));

    // If this is a parent goal and the category has changed, update all subgoals to inherit the new category
    if (!values.parentGoalId && values.categoryId) {
      // Get all subgoals (direct and nested) for this parent goal
      const allSubgoalIds = await getDescendantGoalIds(goalId, userId);

      if (allSubgoalIds.length > 0) {
        // Update all subgoals to inherit the new category
        await prisma.goal.updateMany({
          where: {
            id: { in: allSubgoalIds },
            userId: userId
          },
          data: { categoryId: values.categoryId }
        });

        console.log(`Updated category for ${allSubgoalIds.length} subgoals to match parent goal`);
      }
    }

    return updatedGoal;
  } catch (error) {
    console.error("Error updating goal:", error);
    throw new Error(`Database error: Failed to update goal. ${error.message}`);
  }
}

/**
 * Update an existing goal - Public API
 *
 * @param values - The goal data to update
 * @returns ApiResponse with the updated goal
 */
export async function updateGoal(values: unknown) {
  // Use the validation wrapper
  const validationWrapper = withValidation(
    UpdateGoalSchema,
    updateGoalImpl,
    {
      revalidatePaths: ['/goals'],
      successMessage: "Goal updated successfully.",
      context: "updateGoal"
    }
  );

  return validationWrapper(values);
}

/**
 * Delete a goal
 *
 * @param id - The ID of the goal to delete
 * @returns ActionResponse indicating success or failure
 */
export async function deleteGoal(id: string): Promise<ActionResponse> {
  const userId = await getUserId();

  // Validate the ID format (optional but good practice)
  if (!id || typeof id !== 'string' || id.length < 5) { // Basic check, or use .cuid() validation if needed
      return { success: false, message: "Invalid Goal ID provided." };
  }

  try {
    // First, check if the goal exists and belongs to the user
    const existingGoal = await prisma.goal.findFirst({
      where: { id: id, userId: userId },
    });

    if (!existingGoal) {
      return { success: false, message: "Goal not found or you don't have permission to delete it." };
    }

    // Get all descendant goal IDs (sub-goals, sub-sub-goals, etc.)
    const descendantIds = await getDescendantGoalIds(id, userId);

    // If there are descendants, delete them first
    if (descendantIds.length > 0) {
      console.log(`Deleting ${descendantIds.length} sub-goals of goal ${id}`);
      await prisma.goal.deleteMany({
        where: {
          id: { in: descendantIds },
          userId: userId,
        },
      });
    }

    // Now delete the main goal
    const deleteResult = await prisma.goal.deleteMany({
      where: {
        id: id,
        userId: userId, // Ensure user owns the goal
      },
    });

    // Check if any record was actually deleted (should always be true at this point)
    if (deleteResult.count === 0) {
        return { success: false, message: "Goal not found or you don't have permission to delete it." };
    }

    revalidatePath('/goals'); // Revalidate cache
    // Optionally revalidate tasks if deleting a goal should affect task views
    revalidatePath('/tasks');
    return { success: true, message: descendantIds.length > 0
      ? `Goal and ${descendantIds.length} sub-goal${descendantIds.length === 1 ? '' : 's'} deleted successfully.`
      : "Goal deleted successfully." };

  } catch (error) {
    console.error("Error deleting goal:", error);
    // Handle potential errors (e.g., database connection issues)
    return { success: false, message: "Database error: Failed to delete goal." };
  }
}







/**
 * Get all completed goals for the current user
 *
 * @returns Array of completed goals with additional data for display
 */
export async function getCompletedGoals() {
  const userId = await getUserId();

  try {
    // Fetch all completed goals (progress = 100%)
    const completedGoals = await prisma.goal.findMany({
      where: {
        userId,
        progress: 100
        // Remove isArchived requirement - completed goals should show regardless of archive status
      },
      include: {
        category: {
          select: {
            id: true,
            name: true,
            color: true
          }
        },
        tasks: {
          select: {
            id: true,
            status: true,
            dueDate: true
          }
        },
        _count: {
          select: {
            subGoals: true
          }
        }
      },
      orderBy: [
        { completedAt: 'desc' }, // Sort by completion date if available
        { updatedAt: 'desc' }    // Fall back to last updated date
      ]
    });

    // Transform the data to match the GoalCardData type
    const transformedGoals = completedGoals.map(goal => {
      // Count completed and overdue tasks
      const completedTaskCount = goal.tasks.filter(task =>
        task.status === 'COMPLETED' || task.status === 'DONE'
      ).length;

      const overdueTaskCount = goal.tasks.filter(task =>
        (task.status !== 'COMPLETED' && task.status !== 'DONE') &&
        task.dueDate && new Date(task.dueDate) < new Date()
      ).length;

      // Return the transformed goal
      return {
        ...goal,
        subGoalCount: goal._count.subGoals,
        completedTaskCount,
        overdueTaskCount
      };
    });

    return transformedGoals;
  } catch (error) {
    console.error("Error fetching completed goals:", error);
    // Return empty array on error
    return [];
  }
}


