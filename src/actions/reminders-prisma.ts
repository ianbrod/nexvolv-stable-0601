'use server';

import { prisma } from '@/lib/prisma';
import { ReminderFormValues } from '@/lib/schemas/reminders';
import { revalidatePath } from 'next/cache';
import { addDays, addWeeks, addMonths, addYears, isBefore, startOfDay, endOfDay, addHours } from 'date-fns';
import {
  generateEnhancedRecurringInstances,
  EnhancedRecurrenceConfig
} from '@/lib/utils/enhanced-recurrence';

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

        // Enhanced recurrence fields
        recurrenceEndDate: data.terminationType === 'on' ? data.recurrenceEndDate : null,
        maxOccurrences: data.terminationType === 'after' ? data.maxOccurrences : null,
        recurrenceInterval: data.isRecurring ? data.recurrenceInterval : null,
        weeklyDays: data.recurrence === 'weekly' ? data.weeklyDays : null,
        monthlyType: data.recurrence === 'monthly' ? data.monthlyType : null,
        monthlyWeekday: data.recurrence === 'monthly' && data.monthlyType === 'weekday' ? data.monthlyWeekday : null,
        monthlyWeekNumber: data.recurrence === 'monthly' && data.monthlyType === 'weekday' ? data.monthlyWeekNumber : null,

        categoryId: data.categoryId && data.categoryId !== 'none' ? data.categoryId : null,
        goalId: data.goalId && data.goalId !== 'none' ? data.goalId : null,
        userId: 'user_placeholder', // Replace with actual user ID in production
        isCompleted: false,
      }
    });

    // Revalidate all relevant paths
    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/calendar');

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
 * Generate recurring instances of a reminder using enhanced recurrence logic
 */
function generateRecurringInstances(reminder, maxInstances = 50) {
  if (!reminder.isRecurring || !reminder.recurrence) {
    return [reminder];
  }

  // Create enhanced recurrence config from reminder data
  const config: EnhancedRecurrenceConfig = {
    recurrence: reminder.recurrence,
    recurrenceInterval: reminder.recurrenceInterval || 1,
    weeklyDays: reminder.weeklyDays,
    monthlyType: reminder.monthlyType,
    monthlyWeekday: reminder.monthlyWeekday,
    monthlyWeekNumber: reminder.monthlyWeekNumber,
    recurrenceEndDate: reminder.recurrenceEndDate ? new Date(reminder.recurrenceEndDate) : undefined,
    maxOccurrences: reminder.maxOccurrences,
  };

  // Use enhanced recurrence logic
  const enhancedInstances = generateEnhancedRecurringInstances(reminder, config, maxInstances);

  // Convert enhanced instances back to the expected format
  return enhancedInstances.map(instance => {
    if (instance.isVirtual) {
      // Parse excluded and completed instances
      const excludedInstanceIds = reminder.excludedInstances
        ? reminder.excludedInstances.split(',').map((id: string) => id.trim())
        : [];
      const completedInstanceIds = reminder.completedInstances
        ? reminder.completedInstances.split(',').map((id: string) => id.trim())
        : [];

      // Create virtual instance
      const virtualInstance = {
        ...reminder,
        id: instance.id,
        dueDate: instance.dueDate,
        isVirtualInstance: true,
        originalReminderId: reminder.id,
        isCompleted: completedInstanceIds.includes(instance.id),
        completedAt: completedInstanceIds.includes(instance.id) ? new Date() : null,
      };

      return virtualInstance;
    } else {
      // Return original reminder as-is
      return reminder;
    }
  });
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

    // Generate recurring instances for display
    const expandedReminders = reminders.flatMap(reminder => generateRecurringInstances(reminder));

    return {
      success: true,
      reminders: expandedReminders,
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
 * Get a specific reminder by ID
 */
export async function getReminderById(reminderId: string) {
  try {
    // Check if this is a virtual instance
    if (reminderId.includes('-')) {
      const [originalId, instanceNumber] = reminderId.split('-');

      // Get the original reminder
      const reminder = await prisma.reminder.findUnique({
        where: { id: originalId },
        include: {
          category: true,
          goal: true
        }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Reminder not found',
        };
      }

      // Check if this instance is excluded
      const excludedInstances = reminder.excludedInstances
        ? reminder.excludedInstances.split(',').map(id => id.trim())
        : [];

      if (excludedInstances.includes(reminderId)) {
        return {
          success: false,
          error: 'Reminder instance has been deleted',
        };
      }

      // Generate all instances to find the requested one
      const instances = generateRecurringInstances(reminder);
      const virtualInstance = instances.find(instance => instance.id === reminderId);

      if (!virtualInstance) {
        return {
          success: false,
          error: 'Reminder instance not found',
        };
      }

      return {
        success: true,
        reminder: virtualInstance,
      };
    } else {
      // This is a regular reminder, not a virtual instance
      const reminder = await prisma.reminder.findUnique({
        where: { id: reminderId },
        include: {
          category: true,
          goal: true
        }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Reminder not found',
        };
      }

      return {
        success: true,
        reminder,
      };
    }
  } catch (error) {
    console.error('Error fetching reminder:', error);
    return {
      success: false,
      error: 'Failed to fetch reminder',
    };
  }
}

/**
 * Mark a reminder as completed
 */
export async function completeReminder(reminderId: string) {
  try {
    // Check if this is a virtual instance
    if (reminderId.includes('-')) {
      const [originalId] = reminderId.split('-');

      // Get the original reminder
      const reminder = await prisma.reminder.findUnique({
        where: { id: originalId }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Original reminder not found',
        };
      }

      // For recurring reminders, we don't mark the original as completed
      // Instead, we could track completed instances separately if needed

      // Revalidate all relevant paths
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/calendar');

      return {
        success: true,
      };
    } else {
      // This is a regular reminder, not a virtual instance
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

      // Revalidate all relevant paths
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/calendar');

      return {
        success: true,
      };
    }
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
  console.log("reminders-prisma.ts: deleteReminder called for ID:", reminderId);

  try {
    // Check if this is a virtual instance
    if (reminderId.includes('-')) {
      console.log("reminders-prisma.ts: Handling virtual instance deletion");
      const [originalId, instanceNumber] = reminderId.split('-');
      console.log("reminders-prisma.ts: Original ID:", originalId, "Instance Number:", instanceNumber);

      // Get the original reminder
      const reminder = await prisma.reminder.findUnique({
        where: { id: originalId }
      });

      console.log("reminders-prisma.ts: Original reminder found:", !!reminder);

      if (!reminder) {
        console.error("reminders-prisma.ts: Original reminder not found for ID:", originalId);
        return {
          success: false,
          error: 'Original reminder not found',
        };
      }

      // Check if excludedInstances field exists in the reminder object
      // If not, we'll handle it gracefully
      let excludedInstances: string[] = [];

      if ('excludedInstances' in reminder && reminder.excludedInstances) {
        excludedInstances = reminder.excludedInstances.split(',').map(id => id.trim());
        console.log("reminders-prisma.ts: Current excluded instances:", excludedInstances);
      } else {
        console.log("reminders-prisma.ts: No excludedInstances field found, creating a new one");
      }

      // Add this instance to the excluded list if not already there
      if (!excludedInstances.includes(reminderId)) {
        console.log("reminders-prisma.ts: Adding instance to excluded list:", reminderId);
        excludedInstances.push(reminderId);
      } else {
        console.log("reminders-prisma.ts: Instance already in excluded list:", reminderId);
      }

      // Update the original reminder with the new excluded instances
      console.log("reminders-prisma.ts: Updating original reminder with new excluded instances");
      try {
        await prisma.reminder.update({
          where: { id: originalId },
          data: {
            excludedInstances: excludedInstances.join(',')
          }
        });
      } catch (updateError) {
        console.error("reminders-prisma.ts: Error updating excludedInstances, field might not exist:", updateError);
        // If the field doesn't exist, we'll just mark the reminder as completed instead
        await prisma.reminder.update({
          where: { id: originalId },
          data: {
            isCompleted: true,
            completedAt: new Date()
          }
        });
      }
      console.log("reminders-prisma.ts: Original reminder updated successfully");
    } else {
      // Delete the regular reminder
      console.log("reminders-prisma.ts: Deleting regular reminder with ID:", reminderId);
      try {
        await prisma.reminder.delete({
          where: { id: reminderId }
        });
        console.log("reminders-prisma.ts: Regular reminder deleted successfully");
      } catch (deleteError) {
        console.error("reminders-prisma.ts: Error during prisma.reminder.delete:", deleteError);
        throw deleteError; // Re-throw to be caught by the outer try-catch
      }
    }

    // Revalidate all relevant paths
    console.log("reminders-prisma.ts: Revalidating paths");
    revalidatePath('/');
    revalidatePath('/dashboard');
    revalidatePath('/calendar');
    console.log("reminders-prisma.ts: Paths revalidated");

    return {
      success: true,
    };
  } catch (error) {
    console.error('reminders-prisma.ts: Error deleting reminder:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to delete reminder',
    };
  }
}

/**
 * Mark a reminder as dismissed (by marking it as completed)
 */
export async function dismissReminder(reminderId: string, dismissAll: boolean = false) {
  try {
    console.log("dismissReminder: Using isCompleted instead of status for reminder ID:", reminderId);
    console.log("dismissReminder: dismissAll =", dismissAll);

    // Check if this is a virtual instance
    if (reminderId.includes('-') && !dismissAll) {
      console.log("dismissReminder: Handling virtual instance dismissal for single occurrence");
      const [originalId, instanceNumber] = reminderId.split('-');

      // Get the original reminder
      const reminder = await prisma.reminder.findUnique({
        where: { id: originalId }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Original reminder not found',
        };
      }

      // Check if completedInstances field exists in the reminder object
      // If not, we'll handle it gracefully
      let completedInstances: string[] = [];

      if ('completedInstances' in reminder && reminder.completedInstances) {
        completedInstances = reminder.completedInstances.split(',').map(id => id.trim());
        console.log("dismissReminder: Current completed instances:", completedInstances);
      } else {
        console.log("dismissReminder: No completedInstances field found, creating a new one");
      }

      // Add this instance to the completed list if not already there
      if (!completedInstances.includes(reminderId)) {
        console.log("dismissReminder: Adding instance to completed list:", reminderId);
        completedInstances.push(reminderId);
      } else {
        console.log("dismissReminder: Instance already in completed list:", reminderId);
      }

      // Update the original reminder with the new completed instances
      console.log("dismissReminder: Updating original reminder with new completed instances");
      try {
        await prisma.reminder.update({
          where: { id: originalId },
          data: {
            completedInstances: completedInstances.join(',')
          }
        });
      } catch (updateError) {
        console.error("dismissReminder: Error updating completedInstances, field might not exist:", updateError);
        // If the field doesn't exist, we'll just mark the reminder as completed instead
        await prisma.reminder.update({
          where: { id: originalId },
          data: {
            isCompleted: true,
            completedAt: new Date()
          }
        });
      }

      // Revalidate all relevant paths
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/calendar');

      return {
        success: true,
      };
    } else {
      // This is either a regular reminder or we want to dismiss all occurrences
      const actualId = reminderId.includes('-') ? reminderId.split('-')[0] : reminderId;

      console.log("dismissReminder: Dismissing all occurrences or regular reminder with ID:", actualId);

      const reminder = await prisma.reminder.findUnique({
        where: { id: actualId }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Reminder not found',
        };
      }

      // Update the reminder - mark as completed instead of using status
      await prisma.reminder.update({
        where: { id: actualId },
        data: {
          isCompleted: true,
          completedAt: new Date(),
        }
      });

      // Revalidate all relevant paths
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/calendar');

      return {
        success: true,
      };
    }
  } catch (error) {
    console.error('Error dismissing reminder:', error);
    return {
      success: false,
      error: 'Failed to dismiss reminder',
    };
  }
}

/**
 * Snooze a reminder for a specified number of minutes
 */
export async function snoozeReminder(reminderId: string, minutes: number) {
  try {
    console.log("snoozeReminder: Using only dueDate update for reminder ID:", reminderId);

    // Check if this is a virtual instance
    if (reminderId.includes('-')) {
      const [originalId] = reminderId.split('-');

      // Get the original reminder
      const reminder = await prisma.reminder.findUnique({
        where: { id: originalId }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Original reminder not found',
        };
      }

      // Calculate new due date
      const newDueDate = new Date(reminder.dueDate.getTime() + minutes * 60000);

      // Update the reminder - only update dueDate, not status
      await prisma.reminder.update({
        where: { id: originalId },
        data: {
          dueDate: newDueDate,
        }
      });

      // Revalidate all relevant paths
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/calendar');

      return {
        success: true,
      };
    } else {
      // This is a regular reminder, not a virtual instance
      const reminder = await prisma.reminder.findUnique({
        where: { id: reminderId }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Reminder not found',
        };
      }

      // Calculate new due date
      const newDueDate = new Date(reminder.dueDate.getTime() + minutes * 60000);

      // Update the reminder - only update dueDate, not status
      await prisma.reminder.update({
        where: { id: reminderId },
        data: {
          dueDate: newDueDate,
        }
      });

      // Revalidate all relevant paths
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/calendar');

      return {
        success: true,
      };
    }
  } catch (error) {
    console.error('Error snoozing reminder:', error);
    return {
      success: false,
      error: 'Failed to snooze reminder',
    };
  }
}

/**
 * Mark a reminder as triggered (no status field in model, so we don't update anything)
 */
export async function triggerReminder(reminderId: string) {
  try {
    console.log("triggerReminder: No status field in model, not updating for reminder ID:", reminderId);

    // Check if this is a virtual instance
    if (reminderId.includes('-')) {
      const [originalId] = reminderId.split('-');

      // Get the original reminder
      const reminder = await prisma.reminder.findUnique({
        where: { id: originalId }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Original reminder not found',
        };
      }

      // No update needed since there's no status field
      // Just revalidate paths
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/calendar');

      return {
        success: true,
      };
    } else {
      // This is a regular reminder, not a virtual instance
      const reminder = await prisma.reminder.findUnique({
        where: { id: reminderId }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Reminder not found',
        };
      }

      // No update needed since there's no status field
      // Just revalidate paths
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/calendar');

      return {
        success: true,
      };
    }
  } catch (error) {
    console.error('Error triggering reminder:', error);
    return {
      success: false,
      error: 'Failed to trigger reminder',
    };
  }
}

/**
 * Mark a reminder as notified (no status field in model, so we don't update anything)
 */
export async function markReminderAsNotified(reminderId: string) {
  try {
    console.log("markReminderAsNotified: No status field in model, not updating for reminder ID:", reminderId);

    // Check if this is a virtual instance
    if (reminderId.includes('-')) {
      const [originalId] = reminderId.split('-');

      // Get the original reminder
      const reminder = await prisma.reminder.findUnique({
        where: { id: originalId }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Original reminder not found',
        };
      }

      // No update needed since there's no status field
      // Just revalidate paths
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/calendar');

      return {
        success: true,
      };
    } else {
      // This is a regular reminder, not a virtual instance
      const reminder = await prisma.reminder.findUnique({
        where: { id: reminderId }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Reminder not found',
        };
      }

      // No update needed since there's no status field
      // Just revalidate paths
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/calendar');

      return {
        success: true,
      };
    }
  } catch (error) {
    console.error('Error marking reminder as notified:', error);
    return {
      success: false,
      error: 'Failed to mark reminder as notified',
    };
  }
}

/**
 * Update a reminder
 */
export async function updateReminder(reminderId: string, data: any) {
  try {
    // Process the data before updating
    const updateData = {
      ...data,
      // Convert "none" to null for categoryId and goalId
      categoryId: data.categoryId === 'none' ? null : data.categoryId,
      goalId: data.goalId === 'none' ? null : data.goalId,
    };

    // Check if this is a virtual instance
    if (reminderId.includes('-')) {
      const [originalId] = reminderId.split('-');

      // Get the original reminder
      const reminder = await prisma.reminder.findUnique({
        where: { id: originalId }
      });

      if (!reminder) {
        return {
          success: false,
          error: 'Original reminder not found',
        };
      }

      // Update the reminder
      const updatedReminder = await prisma.reminder.update({
        where: { id: originalId },
        data: updateData
      });

      // Revalidate all relevant paths
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/calendar');

      return {
        success: true,
        reminder: updatedReminder
      };
    } else {
      // This is a regular reminder, not a virtual instance
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
      const updatedReminder = await prisma.reminder.update({
        where: { id: reminderId },
        data: updateData
      });

      // Revalidate all relevant paths
      revalidatePath('/');
      revalidatePath('/dashboard');
      revalidatePath('/calendar');

      return {
        success: true,
        reminder: updatedReminder
      };
    }
  } catch (error) {
    console.error('Error updating reminder:', error);
    return {
      success: false,
      error: 'Failed to update reminder',
    };
  }
}
