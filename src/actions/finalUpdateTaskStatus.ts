'use server'

import { revalidatePath } from 'next/cache'; // Remove revalidateTag import
import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@prisma/client';
import { updateGoalProgress } from './updateGoalProgress';

/**
 * Final version of the server action to update a task's status
 * With comprehensive logging and error handling
 */
export async function finalUpdateTaskStatus(
  taskId: string,
  status: TaskStatus // Use TaskStatus enum type
): Promise<{ success: boolean; message: string; data?: any }> {
  console.log(`[Server Action] Updating task ${taskId} to status: ${status}`);

  try {
    // Validate task ID
    if (!taskId) {
      console.error(`[Server Action] Missing task ID`);
      return {
        success: false,
        message: `Missing task ID`
      };
    }

    // Validate status value
    // Validation using enum values (TypeScript handles this implicitly now)
    // Check if the provided status is a valid member of the TaskStatus enum
    if (!Object.values(TaskStatus).includes(status)) {
        console.error(`[Server Action] Invalid status value: ${status}`);
        return {
            success: false,
            message: `Invalid status value: ${status}`
        };
    }

    // First, check if the task exists
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!existingTask) {
      console.error(`[Server Action] Task not found: ${taskId}`);
      return {
        success: false,
        message: `Task not found: ${taskId}`
      };
    }

    console.log(`[Server Action] Current task status: ${existingTask.status}`);

    // If the status is already the same, just return success
    if (existingTask.status === status) {
      console.log(`[Server Action] Task already has status ${status}, no update needed`);
      return {
        success: true,
        data: existingTask,
        message: `Task already has status ${status}`
      };
    }

    // Update timestamps based on status
    const now = new Date();
    const updateData: any = {
      status: status, // No need for 'as TaskStatus' anymore
    };

    // Restore timestamp logic
    if (status === 'IN_PROGRESS') {
      updateData.startedAt = now;
    } else if (status === 'COMPLETED') {
      updateData.completedAt = now;
    }

    console.log(`[Server Action] Updating task with data:`, updateData);

    // Perform the update in a single query
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
      include: {
        goal: {
          include: {
            category: true
          }
        }
      }
    });

    console.log(`[Server Action] Task updated successfully:`, updatedTask);

    // Update the progress of the associated goal if there is one
    let updatedGoal = null;
    if (updatedTask.goalId) {
      console.log(`[Server Action] Updating progress for goal: ${updatedTask.goalId}`);
      updatedGoal = await updateGoalProgress(updatedTask.goalId);

      // Include the updated goal with its progress in the response
      if (updatedGoal) {
        console.log(`[Server Action] Goal progress updated to: ${updatedGoal.progress}%`);
        updatedTask.goal = updatedGoal;
      }
    }

    // Restore revalidation
    // Revert to revalidatePath
    revalidatePath('/tasks');
    revalidatePath('/goals');
    revalidatePath('/'); // Revalidate dashboard page too
    // revalidatePath('/layout'); // Optionally revalidate root layout if needed

    return {
      success: true,
      data: updatedTask,
      message: `Task status updated to ${status}`
    };
  } catch (error) {
    // Log the full error object for more details
    console.error('[Server Action] Full error updating task status:', error);
    return {
      success: false,
      message: `Failed to update task status: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
