'use server'

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { Task } from '@prisma/client'; // Import Task type if needed for return

/**
 * Server action to update a task's due date.
 */
export async function updateTaskDueDate(
  taskId: string,
  newDueDate: Date | null // Allow null if tasks can have due date removed
): Promise<{ success: boolean; message: string; data?: Task }> { // Return updated task data
  console.log(`[Server Action] Updating task ${taskId} dueDate to: ${newDueDate}`);

  try {
    // Validate task ID
    if (!taskId) {
      console.error(`[Server Action] Missing task ID`);
      return {
        success: false,
        message: `Missing task ID`
      };
    }

    // Validate newDueDate (ensure it's a Date object or null)
    if (newDueDate !== null && !(newDueDate instanceof Date)) {
       console.error(`[Server Action] Invalid newDueDate value: ${newDueDate}`);
       return {
           success: false,
           message: `Invalid due date value provided.`
       };
    }


    // Check if the task exists (optional but good practice)
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
      select: { id: true } // Only select ID for existence check
    });

    if (!existingTask) {
      console.error(`[Server Action] Task not found: ${taskId}`);
      return {
        success: false,
        message: `Task not found: ${taskId}`
      };
    }

    // Perform the update
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        dueDate: newDueDate,
        // Ensure updatedAt is automatically handled by Prisma schema (e.g., @updatedAt)
        // or add manually: updatedAt: new Date()
      },
    });

    console.log(`[Server Action] Task dueDate updated successfully:`, updatedTask);

    // Revalidate relevant paths to ensure UI updates
    revalidatePath('/tasks'); // Assuming '/tasks' is the main task list page
    revalidatePath('/'); // Revalidate dashboard page (where calendar likely is)
    // Add any other paths that might display this task's due date

    return {
      success: true,
      data: updatedTask,
      message: `Task due date updated successfully.`
    };
  } catch (error) {
    console.error('[Server Action] Full error updating task dueDate:', error);
    return {
      success: false,
      message: `Failed to update task due date: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}