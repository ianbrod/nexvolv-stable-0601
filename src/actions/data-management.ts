'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

// --- Temporary User Auth ---
const getUserId = async (): Promise<string> => {
  // In a real app, fetch user session here
  return "user_placeholder";
};

/**
 * Export all user data as JSON
 */
export async function exportAllData() {
  try {
    const userId = await getUserId();

    // Fetch all user data from Prisma
    const [categories, goals, tasks, reminders, notes, savedFilters] = await Promise.all([
      prisma.category.findMany({ where: { userId } }),
      prisma.goal.findMany({ 
        where: { userId },
        include: {
          category: true,
          tasks: true,
          subGoals: true,
          parentGoal: true,
        }
      }),
      prisma.task.findMany({ 
        where: { userId },
        include: {
          goal: true,
        }
      }),
      prisma.reminder.findMany({ 
        where: { userId },
        include: {
          category: true,
          goal: true,
        }
      }),
      prisma.note.findMany({ where: { userId } }),
      prisma.savedFilter.findMany({ where: { userId } }),
    ]);

    const data = {
      categories,
      goals,
      tasks,
      reminders,
      notes,
      savedFilters,
      exportDate: new Date().toISOString(),
      version: '2.0',
      source: 'prisma',
    };

    const jsonData = JSON.stringify(data, null, 2);
    const filename = `goal-management-export-${new Date().toISOString().split('T')[0]}.json`;

    return {
      success: true,
      data: jsonData,
      filename: filename,
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    return {
      success: false,
      error: 'Failed to export data',
    };
  }
}

/**
 * Import data from JSON
 */
export async function importData(fileContent: string) {
  try {
    const userId = await getUserId();
    
    // Parse JSON data
    let data;
    try {
      data = JSON.parse(fileContent);
    } catch (parseError) {
      return {
        success: false,
        error: 'Invalid JSON format',
      };
    }

    // Validate data structure
    if (!data || typeof data !== 'object') {
      return {
        success: false,
        error: 'Invalid data structure',
      };
    }

    // Clear existing data first
    await prisma.$transaction(async (tx) => {
      await tx.reminder.deleteMany({ where: { userId } });
      await tx.task.deleteMany({ where: { userId } });
      await tx.goal.deleteMany({ where: { userId } });
      await tx.category.deleteMany({ where: { userId } });
      await tx.note.deleteMany({ where: { userId } });
      await tx.savedFilter.deleteMany({ where: { userId } });
    });

    let importCounts = {
      categories: 0,
      goals: 0,
      tasks: 0,
      reminders: 0,
      notes: 0,
      savedFilters: 0,
    };

    // Import data in the correct order (categories first, then goals, then tasks, etc.)
    await prisma.$transaction(async (tx) => {
      // Import categories
      if (data.categories && Array.isArray(data.categories)) {
        for (const category of data.categories) {
          await tx.category.create({
            data: {
              id: category.id,
              name: category.name,
              description: category.description,
              color: category.color,
              order: category.order,
              userId,
            },
          });
          importCounts.categories++;
        }
      }

      // Import goals
      if (data.goals && Array.isArray(data.goals)) {
        for (const goal of data.goals) {
          await tx.goal.create({
            data: {
              id: goal.id,
              name: goal.name,
              description: goal.description,
              timeframe: goal.timeframe,
              deadline: goal.deadline ? new Date(goal.deadline) : null,
              progress: goal.progress || 0,
              order: goal.order,
              isArchived: goal.isArchived || false,
              categoryId: goal.categoryId,
              parentGoalId: goal.parentGoalId,
              userId,
            },
          });
          importCounts.goals++;
        }
      }

      // Import tasks
      if (data.tasks && Array.isArray(data.tasks)) {
        for (const task of data.tasks) {
          await tx.task.create({
            data: {
              id: task.id,
              name: task.name,
              description: task.description,
              priority: task.priority || 'MEDIUM',
              dueDate: task.dueDate ? new Date(task.dueDate) : null,
              status: task.status || 'TODO',
              completedAt: task.completedAt ? new Date(task.completedAt) : null,
              startedAt: task.startedAt ? new Date(task.startedAt) : null,
              goalId: task.goalId,
              userId,
            },
          });
          importCounts.tasks++;
        }
      }

      // Import reminders
      if (data.reminders && Array.isArray(data.reminders)) {
        for (const reminder of data.reminders) {
          await tx.reminder.create({
            data: {
              id: reminder.id,
              title: reminder.title,
              description: reminder.description,
              dueDate: new Date(reminder.dueDate),
              isCompleted: reminder.isCompleted || false,
              completedAt: reminder.completedAt ? new Date(reminder.completedAt) : null,
              isRecurring: reminder.isRecurring || false,
              recurrence: reminder.recurrence,
              categoryId: reminder.categoryId,
              goalId: reminder.goalId,
              userId,
            },
          });
          importCounts.reminders++;
        }
      }

      // Import notes
      if (data.notes && Array.isArray(data.notes)) {
        for (const note of data.notes) {
          await tx.note.create({
            data: {
              id: note.id,
              title: note.title,
              content: note.content,
              goalId: note.goalId,
              userId,
            },
          });
          importCounts.notes++;
        }
      }

      // Import saved filters
      if (data.savedFilters && Array.isArray(data.savedFilters)) {
        for (const filter of data.savedFilters) {
          await tx.savedFilter.create({
            data: {
              id: filter.id,
              name: filter.name,
              filters: filter.filters,
              userId,
            },
          });
          importCounts.savedFilters++;
        }
      }
    });

    // Revalidate relevant pages
    revalidatePath('/goals');
    revalidatePath('/tasks');
    revalidatePath('/categories');
    revalidatePath('/reminders');

    return {
      success: true,
      message: 'Data imported successfully',
      itemCounts: importCounts,
    };
  } catch (error) {
    console.error('Error importing data:', error);
    return {
      success: false,
      error: 'Failed to import data',
    };
  }
}

/**
 * Delete all user data
 */
export async function deleteAllData() {
  try {
    const userId = await getUserId();

    // Delete all user data in the correct order
    await prisma.$transaction(async (tx) => {
      await tx.goalProgressSnapshot.deleteMany({ where: { userId } });
      await tx.note.deleteMany({ where: { userId } });
      await tx.reminder.deleteMany({ where: { userId } });
      await tx.savedFilter.deleteMany({ where: { userId } });
      await tx.task.deleteMany({ where: { userId } });
      await tx.goal.deleteMany({ where: { userId } });
      await tx.category.deleteMany({ where: { userId } });
    });

    // Revalidate relevant pages
    revalidatePath('/goals');
    revalidatePath('/tasks');
    revalidatePath('/categories');
    revalidatePath('/reminders');

    return {
      success: true,
      message: 'All data deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting data:', error);
    return {
      success: false,
      error: 'Failed to delete data',
    };
  }
}
