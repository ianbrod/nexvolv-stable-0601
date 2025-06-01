'use client';

import { db } from '@/lib/db';
import { Task } from '@/types';
import { TaskPriority, RecurrencePattern, TaskStatus } from '@prisma/client';

/**
 * Synchronizes tasks between the client-side database (Dexie) and the server-side database.
 * This function ensures that tasks are consistent across platforms.
 *
 * @param serverTasks - Tasks from the server-side database (Prisma)
 */
export async function syncTasks(serverTasks: any[]) {
  try {
    // Get all tasks from the client-side database
    const clientTasks = await db.tasks.toArray();

    // Only log in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Client tasks count:', clientTasks.length);
      console.log('Server tasks count:', serverTasks.length);
    }

    // Create a map of client tasks by ID for quick lookup
    const clientTasksMap = new Map(
      clientTasks.map(task => [task.id, task])
    );

    // Create a map of server tasks by ID for quick lookup
    const serverTasksMap = new Map(
      serverTasks.map(task => [task.id, task])
    );

    // Find tasks that need to be added to the client database
    // (exist on server but not in client)
    const tasksToAdd = serverTasks.filter(
      serverTask => !clientTasksMap.has(serverTask.id)
    );

    // Find tasks that need to be updated in the client database
    // (exist in both but have different properties)
    const tasksToUpdate = serverTasks.filter(serverTask => {
      const clientTask = clientTasksMap.get(serverTask.id);
      if (!clientTask) return false;

      // Compare relevant properties to determine if an update is needed
      return (
        clientTask.name !== serverTask.name ||
        clientTask.description !== serverTask.description ||
        clientTask.priority !== serverTask.priority ||
        clientTask.status !== serverTask.status ||
        clientTask.goalId !== serverTask.goalId ||
        // Compare dates as strings to avoid timezone issues
        (clientTask.dueDate && serverTask.dueDate &&
          new Date(clientTask.dueDate).toISOString() !== new Date(serverTask.dueDate).toISOString()) ||
        (clientTask.completedAt && serverTask.completedAt &&
          new Date(clientTask.completedAt).toISOString() !== new Date(serverTask.completedAt).toISOString()) ||
        (clientTask.startedAt && serverTask.startedAt &&
          new Date(clientTask.startedAt).toISOString() !== new Date(serverTask.startedAt).toISOString())
      );
    });

    // Find tasks that need to be removed from the client database
    // (exist in client but not on server)
    const tasksToRemove = clientTasks.filter(
      clientTask => !serverTasksMap.has(clientTask.id)
    );

    // Only log details in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log('Tasks to add count:', tasksToAdd.length);
      console.log('Tasks to update count:', tasksToUpdate.length);
      console.log('Tasks to remove count:', tasksToRemove.length);
    }

    // Perform the synchronization operations

    // Add new tasks - use bulkPut to handle potential duplicates
    if (tasksToAdd.length > 0) {
      try {
        await db.tasks.bulkAdd(
          tasksToAdd.map(task => ({
            id: task.id,
            name: task.name,
            description: task.description || null,
            priority: task.priority || 'MEDIUM',
            dueDate: task.dueDate ? new Date(task.dueDate) : null,
            status: task.status || 'TODO',
            goalId: task.goalId || null,
            completedAt: task.completedAt ? new Date(task.completedAt) : null,
            startedAt: task.startedAt ? new Date(task.startedAt) : null,
            recurrencePattern: task.recurrencePattern || 'NONE',
            recurrenceEndDate: task.recurrenceEndDate ? new Date(task.recurrenceEndDate) : null,
            parentTaskId: task.parentTaskId || null,
            lastGeneratedDate: task.lastGeneratedDate ? new Date(task.lastGeneratedDate) : null,
            createdAt: new Date(task.createdAt || Date.now()),
            updatedAt: new Date(task.updatedAt || Date.now()),
          }))
        );
      } catch (error: any) {
        // If we get a constraint error (key already exists), use bulkPut instead
        if (error.name === 'BulkError' && error.message.includes('ConstraintError')) {
          if (process.env.NODE_ENV === 'development') {
            console.log('Some tasks already exist, using bulkPut to update them');
          }
          await db.tasks.bulkPut(
            tasksToAdd.map(task => ({
              id: task.id,
              name: task.name,
              description: task.description || null,
              priority: task.priority || 'MEDIUM',
              dueDate: task.dueDate ? new Date(task.dueDate) : null,
              status: task.status || 'TODO',
              goalId: task.goalId || null,
              completedAt: task.completedAt ? new Date(task.completedAt) : null,
              startedAt: task.startedAt ? new Date(task.startedAt) : null,
              recurrencePattern: task.recurrencePattern || 'NONE',
              recurrenceEndDate: task.recurrenceEndDate ? new Date(task.recurrenceEndDate) : null,
              parentTaskId: task.parentTaskId || null,
              lastGeneratedDate: task.lastGeneratedDate ? new Date(task.lastGeneratedDate) : null,
              createdAt: new Date(task.createdAt || Date.now()),
              updatedAt: new Date(task.updatedAt || Date.now()),
            }))
          );
        } else {
          throw error;
        }
      }
    }

    // Update existing tasks
    for (const task of tasksToUpdate) {
      await db.tasks.update(task.id, {
        name: task.name,
        description: task.description || null,
        priority: task.priority || 'MEDIUM',
        dueDate: task.dueDate ? new Date(task.dueDate) : null,
        status: task.status || 'TODO',
        goalId: task.goalId || null,
        completedAt: task.completedAt ? new Date(task.completedAt) : null,
        startedAt: task.startedAt ? new Date(task.startedAt) : null,
        recurrencePattern: task.recurrencePattern || 'NONE',
        recurrenceEndDate: task.recurrenceEndDate ? new Date(task.recurrenceEndDate) : null,
        parentTaskId: task.parentTaskId || null,
        lastGeneratedDate: task.lastGeneratedDate ? new Date(task.lastGeneratedDate) : null,
        updatedAt: new Date(task.updatedAt || Date.now()),
      });
    }

    // Remove tasks that don't exist on the server
    if (tasksToRemove.length > 0) {
      await db.tasks.bulkDelete(tasksToRemove.map(task => task.id));
    }

    // Only log summary in development mode
    if (process.env.NODE_ENV === 'development') {
      console.log(`Tasks synchronized: ${tasksToAdd.length} added, ${tasksToUpdate.length} updated, ${tasksToRemove.length} removed`);
    }

    return {
      added: tasksToAdd.length,
      updated: tasksToUpdate.length,
      removed: tasksToRemove.length,
    };
  } catch (error) {
    console.error('Error synchronizing tasks:', error);
    throw error;
  }
}
