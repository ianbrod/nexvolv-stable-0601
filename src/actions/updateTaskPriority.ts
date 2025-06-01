'use server'

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { TaskPriority } from '@prisma/client';

/**
 * Server action to update a task's priority
 * This is a simplified version that focuses solely on updating priority
 * Accepts either FormData or direct parameters
 */
export async function updateTaskPriority(
  formDataOrTaskId: FormData | string,
  priorityParam?: string
): Promise<{
  success: boolean;
  message: string;
  data?: {
    id: string;
    name: string;
    priority: TaskPriority;
    [key: string]: unknown;
  }
}> {
  // Extract taskId and priority from either FormData or direct parameters
  let taskId: string;
  let priority: string;

  if (formDataOrTaskId instanceof FormData) {
    taskId = formDataOrTaskId.get('taskId') as string;
    priority = formDataOrTaskId.get('priority') as string;
  } else {
    taskId = formDataOrTaskId;
    priority = priorityParam as string;
  }

  // Ensure taskId and priority are not undefined or empty
  if (!taskId || taskId.trim() === '') {
    console.error('[Server Action] Task ID is missing or empty');
    return {
      success: false,
      message: 'Task ID is required'
    };
  }

  if (!priority || priority.trim() === '') {
    console.error('[Server Action] Priority is missing or empty');
    return {
      success: false,
      message: 'Priority is required'
    };
  }

  console.log(`[Server Action] Updating task ${taskId} priority to: ${priority}`);

  try {
    // Validate priority value
    const validPriorities = ['LOW', 'MEDIUM', 'HIGH'];
    if (!validPriorities.includes(priority)) {
      console.error(`[Server Action] Invalid priority value: ${priority}`);
      return {
        success: false,
        message: `Invalid priority value: ${priority}. Must be one of: ${validPriorities.join(', ')}`
      };
    }

    // Check if the task exists
    const taskBefore = await prisma.task.findUnique({
      where: { id: taskId },
    });
    console.log(`[Server Action] Task before update:`, taskBefore);

    if (!taskBefore) {
      return { success: false, message: `Task with ID ${taskId} not found` };
    }

    // Convert priority to TaskPriority enum value
    let priorityEnum: TaskPriority;
    switch (priority) {
      case 'LOW':
        priorityEnum = TaskPriority.LOW;
        break;
      case 'MEDIUM':
        priorityEnum = TaskPriority.MEDIUM;
        break;
      case 'HIGH':
        priorityEnum = TaskPriority.HIGH;
        break;
      default:
        // This should never happen due to the validation above
        return {
          success: false,
          message: `Invalid priority value: ${priority}`
        };
    }

    // Perform the update
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: {
        priority: priorityEnum
      },
    });

    console.log(`[Server Action] Task priority updated successfully:`, updatedTask);

    // Force revalidation of both tasks and goals pages
    revalidatePath('/tasks');
    revalidatePath('/goals');

    return {
      success: true,
      data: updatedTask,
      message: `Task priority updated to ${priority}`
    };
  } catch (error) {
    console.error('[Server Action] Error updating task priority:', error);
    return {
      success: false,
      message: `Failed to update task priority: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
