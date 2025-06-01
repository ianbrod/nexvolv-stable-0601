'use server';

import { prisma } from '@/lib/prisma';
import { ReminderFormValues } from '@/lib/schemas/reminders';
import { revalidatePath } from 'next/cache';

/**
 * Create a new reminder
 */
export async function createReminder(data: ReminderFormValues) {
  try {
    // Create the reminder using Prisma
    const reminder = await prisma.reminder.create({
      data: {
        title: data.title,
        description: data.description || '',
        dueDate: data.dueDate,
        isRecurring: data.isRecurring,
        recurrence: data.isRecurring ? data.recurrence : null,
        taskId: data.taskId && data.taskId !== 'none' ? data.taskId : null,
        userId: 'user_placeholder', // Replace with actual user ID in production
        isCompleted: false,
      }
    });

    // Revalidate the dashboard page
    revalidatePath('/');

    return {
      success: true,
      reminder,
    };
  } catch (error) {
    console.error('Error creating reminder:', error);
    return {
      success: false,
      error: 'Failed to create reminder',
    };
  }
}

/**
 * Get all reminders for the current user
 */
export async function getReminders() {
  try {
    const reminders = await prisma.reminder.findMany({
      where: {
        userId: 'user_placeholder' // Replace with actual user ID in production
      },
      include: {
        category: true,
        goal: true
      },
      orderBy: {
        dueDate: 'asc'
      }
    });

    return {
      success: true,
      reminders,
    };
  } catch (error) {
    console.error('Error fetching reminders:', error);
    return {
      success: false,
      error: 'Failed to fetch reminders',
      reminders: [],
    };
  }
}

/**
 * Mark a reminder as completed
 */
export async function completeReminder(reminderId: string) {
  try {
    // Check if the reminder exists
    const reminder = await prisma.reminder.findUnique({
      where: { id: reminderId }
    });

    if (!reminder) {
      return {
        success: false,
        error: 'Reminder not found',
      };
    }

    // Update the reminder
    await prisma.reminder.update({
      where: { id: reminderId },
      data: {
        isCompleted: true,
        completedAt: new Date(),
      }
    });

    // Revalidate the dashboard page
    revalidatePath('/');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error completing reminder:', error);
    return {
      success: false,
      error: 'Failed to complete reminder',
    };
  }
}

/**
 * Delete a reminder
 */
export async function deleteReminder(reminderId: string) {
  try {
    // Delete the reminder
    await prisma.reminder.delete({
      where: { id: reminderId }
    });

    // Revalidate the dashboard page
    revalidatePath('/');

    return {
      success: true,
    };
  } catch (error) {
    console.error('Error deleting reminder:', error);
    return {
      success: false,
      error: 'Failed to delete reminder',
    };
  }
}
