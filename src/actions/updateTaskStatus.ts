'use server'

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@prisma/client';

/**
 * Server action to update a task's status
 * This is a simplified version that focuses solely on updating status
 * Accepts either FormData or direct parameters
 */
export async function updateTaskStatus(
  formDataOrTaskId: FormData | string,
  statusParam?: string
): Promise<{
  success: boolean;
  message: string;
  data?: {
    id: string;
    name: string;
    status: TaskStatus;
    startedAt?: Date | null;
    completedAt?: Date | null;
    [key: string]: unknown;
  }
}> {
  // Determine if we're using FormData or direct parameters
  let taskId: string;
  let status: string;

  if (formDataOrTaskId instanceof FormData) {
    taskId = formDataOrTaskId.get('taskId') as string;
    status = formDataOrTaskId.get('status') as string;
    console.log(`[Server Action] Updating task ${taskId} to status: ${status} (from FormData)`);
  } else {
    taskId = formDataOrTaskId;
    status = statusParam as string;
    console.log(`[Server Action] Updating task ${taskId} to status: ${status} (from params)`);
  }

  // Validate required fields
  if (!taskId || !status) {
    console.error(`[Action Error - Update Task Status] Missing required fields: { taskId: '${taskId}', statusValue: ${status} }`);
    return { success: false, message: 'Missing required taskId or status' };
  }

  try {
    // Validate status value
    const validStatuses = ['TODO', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'];
    if (!validStatuses.includes(status)) {
      console.error(`[Server Action] Invalid status value: ${status}`);
      return {
        success: false,
        message: `Invalid status value: ${status}. Must be one of: ${validStatuses.join(', ')}`
      };
    }

    // Log the task before update
    const taskBefore = await prisma.task.findUnique({
      where: { id: taskId },
    });
    console.log(`[Server Action] Task before update:`, taskBefore);

    if (!taskBefore) {
      return { success: false, message: `Task with ID ${taskId} not found` };
    }

    // Update timestamps based on status
    const updateData: {
      status: TaskStatus;
      startedAt?: Date | null;
      completedAt?: Date | null;
    } = {
      status: status as TaskStatus
    };

    if (status === 'IN_PROGRESS' && taskBefore.status !== 'IN_PROGRESS') {
      updateData.startedAt = new Date();
    }

    if (status === 'COMPLETED' && taskBefore.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
    } else if (status !== 'COMPLETED') {
      // Clear completedAt if moving back from COMPLETED
      updateData.completedAt = null;
    }

    // Perform the update
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    console.log(`[Server Action] Task after update:`, updatedTask);

    // Force revalidation of both tasks and goals pages
    revalidatePath('/tasks');
    revalidatePath('/goals');

    return {
      success: true,
      data: updatedTask,
      message: `Task status updated to ${status}`
    };
  } catch (error) {
    console.error(`[Server Action] Error updating task status:`, error);
    return {
      success: false,
      message: `Error updating task status: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
