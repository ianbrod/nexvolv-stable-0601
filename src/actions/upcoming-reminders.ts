'use server';

import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';
import { addMinutes } from 'date-fns';

/**
 * Get upcoming reminders that are due within a specified time window
 * 
 * @param minutesThreshold - Get reminders due within this many minutes (default: 30)
 * @param includeOverdue - Whether to include overdue reminders (default: true)
 * @param status - Filter by reminder status (default: 'PENDING')
 * @param userId - User ID to filter reminders by (default: 'user_placeholder')
 * @returns Object with success flag and array of reminders
 */
export async function getUpcomingReminders(
  minutesThreshold: number = 30,
  includeOverdue: boolean = true,
  status: string = 'PENDING',
  userId: string = 'user_placeholder'
) {
  try {
    const now = new Date();
    const thresholdDate = addMinutes(now, minutesThreshold);

    // Build the where clause
    const whereClause: any = {
      userId,
      status,
    };

    // Add due date condition
    if (includeOverdue) {
      // Include both overdue and upcoming reminders
      whereClause.dueDate = {
        lte: thresholdDate,
      };
    } else {
      // Only include upcoming reminders within the threshold
      whereClause.dueDate = {
        gte: now,
        lte: thresholdDate,
      };
    }

    // Query the database
    const reminders = await prisma.reminder.findMany({
      where: whereClause,
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
    console.error('Error fetching upcoming reminders:', error);
    return {
      success: false,
      error: 'Failed to fetch upcoming reminders',
      reminders: [],
    };
  }
}
