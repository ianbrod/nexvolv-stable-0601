'use server'

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@prisma/client';

/**
 * Direct server action to update a task's status
 * Simplified version with better performance
 */
export async function directUpdateTaskStatus(
  taskId: string,
  status: string
): Promise<{
  success: boolean;
  message?: string;
  data?: {
    id: string;
    name: string;
    status: TaskStatus;
    startedAt?: Date | null;
    completedAt?: Date | null;
    updatedAt: Date;
    [key: string]: unknown;
  }
}> {
  console.log(`[Server Action] Updating task ${taskId} to status: ${status}`);

  try {
    // Validate status value
    const validStatuses = new Set(['TODO', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED']);
    if (!validStatuses.has(status)) {
      console.error(`[Server Action] Invalid status value: ${status}`);
      return {
        success: false,
        message: `Invalid status value: ${status}`
      };
    }

    // Update timestamps based on status
    const now = new Date();
    const updateData: {
      status: TaskStatus;
      updatedAt: Date;
      startedAt?: Date;
      completedAt?: Date;
    } = {
      status: status as TaskStatus,
      updatedAt: now
    };

    // Only set these if they're changing to the respective status
    if (status === 'IN_PROGRESS') {
      updateData.startedAt = now;
    } else if (status === 'COMPLETED') {
      updateData.completedAt = now;
    }

    // Perform the update
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data: updateData,
    });

    console.log(`[Server Action] Task updated successfully:`, updatedTask);

    // Revalidate paths
    revalidatePath('/tasks');
    revalidatePath('/goals');

    return {
      success: true,
      data: updatedTask
    };
  } catch (error) {
    console.error('[Server Action] Error updating task status:', error);
    return {
      success: false,
      message: `Failed to update task status: ${error instanceof Error ? error.message : String(error)}`
    };
  }
}
