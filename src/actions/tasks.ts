'use server';

import { revalidatePath } from 'next/cache'; // Remove revalidateTag import
// import { db } from '@/lib/db'; // Remove incorrect Dexie import
import { TaskPriority, RecurrencePattern, TaskStatus } from '@prisma/client'; // Import Prisma enums
import { prisma } from '@/lib/prisma'; // Import shared Prisma instance
import { shouldGenerateNextInstance, createNextTaskInstance } from '@/lib/utils/recurrence';
import { addDays } from 'date-fns'; // Import addDays
// import { auth } from '@/auth'; // Keep commented out for now
import { z } from 'zod';
// Import the schema and type from the new location
import { CreateTaskSchema, CreateTaskInput, UpdateTaskSchema, UpdateTaskInput, UpdateTaskStatusSchema, UpdateTaskStatusInput } from '@/lib/schemas/tasks';
import { updateGoalProgress } from './updateGoalProgress';

// --- Task Schemas ---
// Moved CreateTaskSchema to src/lib/schemas/tasks.ts

// Schema for updateTask action (similar to create, but includes taskId)
// Optional fields mean they won't be updated if not provided in the form submission values.
// Make fields required if they *must* be provided during an edit.
// export const UpdateTaskSchema = CreateTaskSchema.extend({ ... });
// export type UpdateTaskInput = z.infer<typeof UpdateTaskSchema>;

// --- Task Creation ---

// // Schema and Type moved to src/lib/schemas/tasks.ts
// export const CreateTaskSchema = z.object({ ... });
// export type CreateTaskInput = z.infer<typeof CreateTaskSchema>;

export async function createTask(values: CreateTaskInput | FormData) {
    // --- TEMPORARY: Authentication / userId ---
    const tempUserId = "user_placeholder";
    const tempUserEmail = "placeholder@nexvolv.app"; // Need a unique email for upsert
    const tempHashedPassword = "temp_password_hash"; // Need a placeholder hash
    // --- END TEMPORARY ---

    // Process FormData if that's what was passed
    let dataToValidate: any;

    if (values instanceof FormData) {
        const name = values.get('name')?.toString() || '';
        const description = values.get('description')?.toString() || '';
        const priority = values.get('priority')?.toString() || TaskPriority.MEDIUM;
        const dueDateStr = values.get('dueDate')?.toString();
        const goalId = values.get('goalId')?.toString() || '';

        dataToValidate = {
            name,
            description: description || undefined,
            priority,
            dueDate: dueDateStr ? new Date(dueDateStr) : null,
            goalId,
        };
    } else {
        dataToValidate = values;
    }

    // Validate input using the imported schema
    const validatedFields = CreateTaskSchema.safeParse(dataToValidate);

    if (!validatedFields.success) {
        const errors = validatedFields.error.flatten().fieldErrors;
        // Remove the console.error that's causing the error in the browser console

        // Provide more specific error messages
        if (errors.name?.includes("Task name must be at least 3 characters.")) {
            return { success: false, message: 'Task name must be at least 3 characters.' };
        }

        return { success: false, message: 'Invalid input.' };
    }

    const { name, description, priority, dueDate, goalId } = validatedFields.data;

    try {
        // --- TEMPORARY: Ensure placeholder user exists ---
        await prisma.user.upsert({
            where: { id: tempUserId },
            update: {}, // No fields to update if user exists
            create: {
                id: tempUserId,
                email: tempUserEmail,
                hashedPassword: tempHashedPassword,
            },
        });
        // --- END TEMPORARY ---

        console.log('[Action Log] Creating task:', { name, priority, dueDate });

        // --- Default Deadline Logic ---
        let finalDueDate = dueDate;
        if (!finalDueDate) {
          finalDueDate = addDays(new Date(), 3); // Default to 3 days from now
          console.log(`[Action Log] No due date provided, defaulting to: ${finalDueDate.toISOString()}`);
        }
        // --- End Default Deadline Logic ---

        // First, get the goal to include its category information
        const goal = goalId ? await prisma.goal.findUnique({
            where: { id: goalId },
            include: { category: true }
        }) : null;

        const newTask = await prisma.task.create({
            data: {
                userId: tempUserId, // Use the placeholder userId
                name,
                description,
                priority,
                dueDate: finalDueDate, // Use the potentially defaulted due date
                // Ensure goalId is provided and valid
                goalId,
            },
            include: {
                goal: {
                    include: {
                        category: true
                    }
                }
            }
        });
        console.log('[Action Log] Task created successfully');

        // Update the progress of the associated goal if there is one
        if (goalId) {
            console.log(`[Action Log] Updating progress for goal: ${goalId}`);
            await updateGoalProgress(goalId);
        }

        // Revalidate both tasks and goals pages to ensure UI updates
        // Revert to revalidatePath
        revalidatePath('/tasks');
        revalidatePath('/goals');
        revalidatePath('/');
        return { success: true, message: 'Task created successfully.', data: newTask };

    } catch (error) {
        console.error('[Action Error - Create Task] Failed:', error);
        return { success: false, message: 'Database Error: Failed to create task.' };
    }
}

// --- Task Update (Full Edit) ---

export async function updateTask(values: UpdateTaskInput) {
    const tempUserId = "user_placeholder";

    // Validate input using the imported schema
    const validatedFields = UpdateTaskSchema.safeParse(values);

    if (!validatedFields.success) {
        console.error('[Action Error - Update Task] Invalid input:', validatedFields.error.flatten().fieldErrors);
        return { success: false, message: 'Invalid input.' };
    }

    const { id: taskId, ...dataToUpdate } = validatedFields.data;

    try {
        console.log(`[Action Log] Updating task: ${taskId}`);

        const task = await prisma.task.findUnique({
            where: { id: taskId, userId: tempUserId },
        });

        if (!task) {
            console.error(`[Action Error - Update Task] Task not found or user mismatch: ${taskId}`);
            return { success: false, message: 'Task not found or unauthorized.' };
        }

        await prisma.task.update({
            where: { id: taskId, userId: tempUserId },
            data: {
                ...dataToUpdate,
                // Ensure goalId is provided and valid
                goalId: dataToUpdate.goalId,
            },
        });
        console.log(`[Action Log] Task updated successfully: ${taskId}`);

        // Update the progress of the associated goal if there is one
        if (dataToUpdate.goalId) {
            console.log(`[Action Log] Updating progress for goal: ${dataToUpdate.goalId}`);
            await updateGoalProgress(dataToUpdate.goalId);
        }

        // Revert to revalidatePath
        revalidatePath('/tasks');
        revalidatePath('/goals');
        revalidatePath('/');
        return { success: true, message: 'Task updated successfully.' };

    } catch (error) {
        console.error('[Action Error - Update Task] Failed:', error);
        return { success: false, message: 'Database Error: Failed to update task.' };
    }
}

// --- Task Status Update ---

// Server action to update task status
export async function updateTaskStatus(formData: FormData) {
  // --- TEMPORARY: Authentication Check Removed ---
  try {
    const taskId = formData.get('taskId')?.toString();
    const statusValue = formData.get('status')?.toString();

    if (!taskId || !statusValue) {
      console.error('[Action Error - Update Task Status] Missing required fields:', { taskId, statusValue });
      return { success: false, message: 'Missing required fields.' };
    }

    // Ensure the status is a valid TaskStatus enum value
    if (!['TODO', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'].includes(statusValue)) {
      console.error('[Action Error - Update Task Status] Invalid status value:', statusValue);
      return { success: false, message: `Invalid status value: ${statusValue}` };
    }

    // Convert to TaskStatus enum
    const status = statusValue as TaskStatus;

    // Validate input
    const validatedFields = UpdateTaskStatusSchema.safeParse({ taskId, status });
    if (!validatedFields.success) {
      console.error('[Action Error - Update Task Status] Invalid input:', validatedFields.error.flatten().fieldErrors);
      return { success: false, message: 'Invalid input.' };
    }

    // Find the task to update
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    if (!task) {
      return { success: false, message: 'Task not found.' };
    }

    console.log(`[Action Log] Found task ${taskId}, updating status to ${status}...`);

    // Update timestamps based on status
    const now = new Date();
    const data: any = { status };

    if (status === TaskStatus.IN_PROGRESS && !task.startedAt) {
      data.startedAt = now;
    } else if (status === TaskStatus.COMPLETED && !task.completedAt) {
      data.completedAt = now;
    } else if (status === TaskStatus.TODO) {
      // If moving back to TODO, keep startedAt but remove completedAt
      data.completedAt = null;
    }

    // Log the data we're about to update
    console.log(`[Action Log] Updating task ${taskId} with data:`, data);

    // Update the task status
    const updatedTask = await prisma.task.update({
      where: { id: taskId },
      data,
      include: {
        goal: {
          include: {
            category: true
          }
        }
      }
    });

    console.log(`[Action Log] Successfully updated task ${taskId} status to ${status}`);
    console.log(`[Action Log] Updated task:`, updatedTask);

    // Handle recurring tasks if the task is completed
    if (status === TaskStatus.COMPLETED && updatedTask.recurrencePattern !== RecurrencePattern.NONE) {
      console.log(`[Action Log] Task ${taskId} is recurring with pattern ${updatedTask.recurrencePattern}`);

      // Check if we should generate the next instance
      if (shouldGenerateNextInstance(updatedTask)) {
        console.log(`[Action Log] Generating next instance for recurring task ${taskId}`);

        // Create the next instance
        const nextInstance = createNextTaskInstance(updatedTask);

        // Save the next instance to the database
        if (nextInstance.dueDate) {
          const newTask = await prisma.task.create({
            data: nextInstance as any, // Type assertion needed due to partial type
          });

          console.log(`[Action Log] Created next instance ${newTask.id} for recurring task ${taskId}`);

          // Update the original task to track when we last generated an instance
          await prisma.task.update({
            where: { id: taskId },
            data: {
              lastGeneratedDate: new Date(),
            },
          });
        }
      }
    }

    // Update the progress of the associated goal if there is one
    if (updatedTask.goalId) {
        console.log(`[Action Log] Updating progress for goal: ${updatedTask.goalId}`);
        await updateGoalProgress(updatedTask.goalId);
    }

    // Revalidate both tasks and goals pages to ensure UI updates
    // Revert to revalidatePath
    revalidatePath('/tasks');
    revalidatePath('/goals');
    revalidatePath('/');

    return { success: true, message: 'Task status updated successfully.', data: updatedTask };
  } catch (error) {
    console.error('[Action Error - Update Task Status] Failed:', error);
    return { success: false, message: 'Database error: Failed to update task status.' };
  }
}

// --- Task Completion Update (Legacy) ---

// Schema for this action can stay here as it's not imported by the client
const UpdateTaskCompletionSchema = z.object({
  taskId: z.string(),
  completed: z.boolean(),
});

// Server action to update task completion status (for backward compatibility)
export async function updateTaskCompletion(formData: FormData) {
  // --- TEMPORARY: Authentication Check Removed ---
  // const session = await auth();
  // if (!session?.user?.id) {
  //   return { success: false, message: 'Authentication required.' };
  // }
  // const userId = session.user.id;
  // --- END TEMPORARY REMOVAL ---

  // Use placeholder user ID
  const userId = "user_placeholder";

  const validatedFields = UpdateTaskCompletionSchema.safeParse({
    taskId: formData.get('taskId'),
    completed: formData.get('completed') === 'true', // FormData values are strings
  });

  if (!validatedFields.success) {
    console.error('[Action Error] Invalid input:', validatedFields.error.flatten().fieldErrors);
    return { success: false, message: 'Invalid input.' };
  }

  const { taskId, completed } = validatedFields.data;
  console.log(`[Action Log] Attempting to update task ${taskId} to completed=${completed}`); // Log input

  try {
    // Query with userId check
    const task = await prisma.task.findUnique({
      where: { id: taskId },
    });

    // Verify the task belongs to the user
    if (task && task.userId !== userId) {
      console.error(`[Action Error] Task ${taskId} does not belong to user ${userId}`);
      return { success: false, message: 'Unauthorized access to task.' };
    }

    if (!task) {
      console.error(`[Action Error] Task not found: ${taskId}`);
      return { success: false, message: 'Task not found.' };
    }

    console.log(`[Action Log] Found task ${taskId}, attempting update...`);
    // Convert the boolean completed value to a TaskStatus
    const status = completed ? TaskStatus.COMPLETED : TaskStatus.TODO;

    // Update the task status
    const updatedTask = await prisma.task.update({
      where: { id: taskId }, // Removed userId check since we already verified ownership
      data: {
        status,
        // Set completedAt to current date when completed, or null when uncompleted
        completedAt: completed ? new Date() : null,
      },
    });
    console.log(`[Action Log] Successfully updated task ${taskId} to ${status}`);

    // Handle recurring tasks
    if (completed && updatedTask.recurrencePattern !== RecurrencePattern.NONE) {
      console.log(`[Action Log] Task ${taskId} is recurring with pattern ${updatedTask.recurrencePattern}`);

      // Check if we should generate the next instance
      if (shouldGenerateNextInstance(updatedTask)) {
        console.log(`[Action Log] Generating next instance for recurring task ${taskId}`);

        // Create the next instance
        const nextInstance = createNextTaskInstance(updatedTask);

        // Save the next instance to the database
        if (nextInstance.dueDate) {
          const newTask = await prisma.task.create({
            data: nextInstance as any, // Type assertion needed due to partial type
          });

          console.log(`[Action Log] Created next instance ${newTask.id} for recurring task ${taskId}`);

          // Update the original task to track when we last generated an instance
          await prisma.task.update({
            where: { id: taskId },
            data: {
              lastGeneratedDate: new Date(),
            },
          });
        }
      }
    }
    // --- END TEMPORARY REMOVAL ---

    // Update the progress of the associated goal if there is one
    if (task.goalId) {
        console.log(`[Action Log] Updating progress for goal: ${task.goalId}`);
        await updateGoalProgress(task.goalId);
    }

    // Revalidate both tasks and goals pages to ensure UI updates
    revalidatePath('/tasks');
    revalidatePath('/goals');
    return { success: true, message: 'Task updated successfully.' };

  } catch (error) {
    // Log the actual error object for more details
    console.error('[Action Error] Failed to update task completion:', error);
    return { success: false, message: 'Database error: Failed to update task.' }; // Keep generic message for client
  }
  // Note: Consider adding prisma.$disconnect() in a finally block
  // if this action runs frequently or in serverless environments,
  // though often Next.js handles connection management well.
}

// --- Task Deletion ---

const DeleteTaskSchema = z.object({
    taskId: z.string(),
});

export async function deleteTask(taskId: string) {
    // --- TEMPORARY: Authentication / userId ---
    const tempUserId = "user_placeholder"; // !! MUST replace this later
    // --- END TEMPORARY ---

    if (!taskId) {
        console.error('[Action Error - Delete Task] Invalid input: No taskId provided');
        return { success: false, message: 'Invalid Task ID.' };
    }

    try {
        console.log(`[Action Log] Deleting task: ${taskId}`);

        // Optional: Verify task ownership before deleting
        const task = await prisma.task.findUnique({
            where: { id: taskId, userId: tempUserId }, // Use placeholder
        });

        if (!task) {
             console.error(`[Action Error - Delete Task] Task not found or user mismatch: ${taskId}`);
            return { success: false, message: 'Task not found or unauthorized.' };
        }

        await prisma.task.delete({
            where: { id: taskId, userId: tempUserId }, // Re-verify ownership
        });
        console.log(`[Action Log] Task deleted successfully: ${taskId}`);

        // Update the progress of the associated goal if there is one
        if (task.goalId) {
            console.log(`[Action Log] Updating progress for goal: ${task.goalId}`);
            await updateGoalProgress(task.goalId);
        }

        // Revert to revalidatePath
        revalidatePath('/tasks');
        revalidatePath('/goals');
        revalidatePath('/');
        // No need to return specific data on successful delete usually
        return { success: true, message: 'Task deleted.' };

    } catch (error) {
        console.error('[Action Error - Delete Task] Failed:', error);
        return { success: false, message: 'Database Error: Failed to delete task.' };
    }
}