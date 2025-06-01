'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { addMinutes } from 'date-fns';

/**
 * Create a test reminder for development/testing purposes
 */
export async function createTestReminder() {
  try {
    const testReminder = await prisma.reminder.create({
      data: {
        title: 'Test Reminder',
        description: 'This is a test reminder created for development purposes',
        dueDate: addMinutes(new Date(), 1), // Due in 1 minute
        isRecurring: false,
        recurrence: null,
        userId: 'test_user',
        isCompleted: false,
        status: 'pending',
        priority: 'medium',
      },
    });

    // Revalidate relevant pages
    revalidatePath('/');
    revalidatePath('/reminders');

    return {
      success: true,
      reminder: testReminder,
    };
  } catch (error) {
    console.error('Error creating test reminder:', error);
    return {
      success: false,
      error: 'Failed to create test reminder',
    };
  }
}
