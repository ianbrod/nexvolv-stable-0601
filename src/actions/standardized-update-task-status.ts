'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';
import { TaskStatus } from '@prisma/client';
import { 
  ApiResponse, 
  ErrorCode, 
  createSuccessResponse, 
  createErrorResponse 
} from '@/lib/error-handling';
import { withValidation } from '@/lib/action-wrapper';
import { TaskStatusUpdateSchema, TaskStatusUpdateInput } from '@/lib/schemas/task-status';
import { updateGoalProgress } from './updateGoalProgress';

/**
 * Implementation function to update a task's status
 * 
 * @param data Validated task status update data
 * @returns The updated task
 */
async function updateTaskStatusImpl(data: TaskStatusUpdateInput) {
  const { taskId, status } = data;
  
  // Find the task to update
  const task = await prisma.task.findUnique({
    where: { id: taskId },
  });

  if (!task) {
    throw {
      code: ErrorCode.RECORD_NOT_FOUND,
      message: 'Task not found',
      status: 404,
    };
  }

  // If the status is already the same, just return the task
  if (task.status === status) {
    return task;
  }

  // Update timestamps based on status
  const now = new Date();
  const updateData: any = { 
    status,
    updatedAt: now
  };

  if (status === TaskStatus.IN_PROGRESS && !task.startedAt) {
    updateData.startedAt = now;
  } else if (status === TaskStatus.COMPLETED && !task.completedAt) {
    updateData.completedAt = now;
  } else if (status === TaskStatus.TODO) {
    // If moving back to TODO, keep startedAt but remove completedAt
    updateData.completedAt = null;
  }

  // Update the task status
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

  // Update the progress of the associated goal if there is one
  if (updatedTask.goalId) {
    await updateGoalProgress(updatedTask.goalId);
  }

  return updatedTask;
}

/**
 * Server action to update a task's status using form data
 * 
 * @param formData Form data containing taskId and status
 * @returns API response with the updated task
 */
export async function updateTaskStatusFromForm(formData: FormData): Promise<ApiResponse> {
  const taskId = formData.get('taskId')?.toString();
  const status = formData.get('status')?.toString();
  
  if (!taskId || !status) {
    return createErrorResponse({
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Missing required fields',
      details: {
        taskId: !taskId ? ['Task ID is required'] : [],
        status: !status ? ['Status is required'] : []
      },
      status: 400
    });
  }
  
  return updateTaskStatus({ taskId, status: status as TaskStatus });
}

/**
 * Server action to update a task's status
 * 
 * @param data Object containing taskId and status
 * @returns API response with the updated task
 */
export async function updateTaskStatus(data: { 
  taskId: string; 
  status: TaskStatus | string;
}): Promise<ApiResponse> {
  try {
    // Validate the input data
    const validationResult = TaskStatusUpdateSchema.safeParse({
      taskId: data.taskId,
      status: data.status
    });
    
    if (!validationResult.success) {
      return createErrorResponse({
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Invalid input data',
        details: validationResult.error.format(),
        status: 400
      });
    }
    
    // Update the task status
    const updatedTask = await updateTaskStatusImpl(validationResult.data);
    
    // Revalidate paths
    revalidatePath('/tasks');
    revalidatePath('/goals');
    revalidatePath('/');
    
    return createSuccessResponse(
      updatedTask, 
      `Task status updated to ${updatedTask.status}`
    );
  } catch (error) {
    return createErrorResponse(error);
  }
}
