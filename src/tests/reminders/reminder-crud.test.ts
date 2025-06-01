// src/tests/reminders/reminder-crud.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import {
  createReminder,
  updateReminder,
  deleteReminder,
  completeReminder,
  dismissReminder,
  snoozeReminder,
  triggerReminder,
  markReminderAsNotified,
  generateRecurringInstances
} from '@/actions/reminders-prisma';
import { prisma } from '@/lib/prisma';
import { addDays, addMinutes } from 'date-fns';

// Mock the prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    reminder: {
      create: vi.fn(),
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock the revalidatePath function
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

describe('Reminder CRUD Operations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('createReminder', () => {
    it('should create a reminder successfully', async () => {
      // Mock data
      const reminderData = {
        title: 'Test Reminder',
        description: 'Test Description',
        dueDate: new Date(),
        isRecurring: false,
      };

      const createdReminder = {
        id: 'reminder123',
        ...reminderData,
        userId: 'user_placeholder',
        status: 'PENDING',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Setup mock
      (prisma.reminder.create as any).mockResolvedValue(createdReminder);

      // Execute
      const result = await createReminder(reminderData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.reminder).toEqual(createdReminder);
      expect(prisma.reminder.create).toHaveBeenCalledWith({
        data: {
          title: reminderData.title,
          description: reminderData.description || '',
          dueDate: reminderData.dueDate,
          isRecurring: reminderData.isRecurring,
          recurrence: null,
          taskId: null,
          goalId: null,
          userId: 'user_placeholder',
          status: 'PENDING',
          isCompleted: false,
        }
      });
    });

    it('should handle errors when creating a reminder', async () => {
      // Mock data
      const reminderData = {
        title: 'Test Reminder',
        description: 'Test Description',
        dueDate: new Date(),
        isRecurring: false,
      };

      // Setup mock to throw an error
      (prisma.reminder.create as any).mockRejectedValue(new Error('Database error'));

      // Execute
      const result = await createReminder(reminderData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to create reminder');
    });
  });

  describe('updateReminder', () => {
    it('should update a regular reminder successfully', async () => {
      // Mock data
      const reminderId = 'reminder123';
      const updateData = {
        id: reminderId,
        title: 'Updated Reminder',
        description: 'Updated Description',
        dueDate: new Date(),
        isRecurring: true,
        recurrence: 'daily',
        status: 'PENDING' as const,
        updatedAt: new Date(),
      };

      const updatedReminder = {
        id: reminderId,
        ...updateData,
        userId: 'user_placeholder',
        isCompleted: false,
        createdAt: new Date(),
      };

      // Setup mock
      (prisma.reminder.update as any).mockResolvedValue(updatedReminder);

      // Execute
      const result = await updateReminder(reminderId, updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.reminder).toEqual(updatedReminder);
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: reminderId },
        data: {
          title: updateData.title,
          description: updateData.description,
          dueDate: updateData.dueDate,
          isRecurring: updateData.isRecurring,
          recurrence: updateData.recurrence,
          status: updateData.status,
        }
      });
    });

    it('should update a virtual instance by updating the original reminder', async () => {
      // Mock data for a virtual instance
      const virtualReminderId = 'reminder123-1';
      const originalReminderId = 'reminder123';
      const updateData = {
        id: virtualReminderId,
        title: 'Updated Reminder',
        description: 'Updated Description',
        dueDate: new Date(),
        isRecurring: true,
        recurrence: 'daily',
        status: 'PENDING' as const,
        updatedAt: new Date(),
      };

      const updatedReminder = {
        id: originalReminderId,
        ...updateData,
        userId: 'user_placeholder',
        isCompleted: false,
        createdAt: new Date(),
      };

      // Setup mock
      (prisma.reminder.update as any).mockResolvedValue(updatedReminder);

      // Execute
      const result = await updateReminder(virtualReminderId, updateData);

      // Assert
      expect(result.success).toBe(true);
      expect(result.reminder).toEqual(updatedReminder);
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: originalReminderId },
        data: {
          title: updateData.title,
          description: updateData.description,
          dueDate: updateData.dueDate,
          isRecurring: updateData.isRecurring,
          recurrence: updateData.recurrence,
          status: updateData.status,
        }
      });
    });

    it('should handle errors when updating a reminder', async () => {
      // Mock data
      const reminderId = 'reminder123';
      const updateData = {
        id: reminderId,
        title: 'Updated Reminder',
        updatedAt: new Date(),
      };

      // Setup mock to throw an error
      (prisma.reminder.update as any).mockRejectedValue(new Error('Database error'));

      // Execute
      const result = await updateReminder(reminderId, updateData);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to update reminder');
    });
  });

  describe('deleteReminder', () => {
    it('should delete a reminder successfully', async () => {
      // Mock data
      const reminderId = 'reminder123';
      const deletedReminder = {
        id: reminderId,
        title: 'Test Reminder',
        description: 'Test Description',
        dueDate: new Date(),
        isRecurring: false,
        userId: 'user_placeholder',
        status: 'PENDING',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Setup mock
      (prisma.reminder.delete as any).mockResolvedValue(deletedReminder);
      (prisma.reminder.findUnique as any).mockResolvedValue(deletedReminder);

      // Execute
      const result = await deleteReminder(reminderId);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.reminder.delete).toHaveBeenCalledWith({
        where: { id: reminderId }
      });
    });

    it('should handle errors when deleting a reminder', async () => {
      // Mock data
      const reminderId = 'reminder123';

      // Setup mock to throw an error
      (prisma.reminder.delete as any).mockRejectedValue(new Error('Database error'));
      (prisma.reminder.findUnique as any).mockResolvedValue({
        id: reminderId,
        userId: 'user_placeholder'
      });

      // Execute
      const result = await deleteReminder(reminderId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Failed to delete reminder');
    });

    it('should return an error if the reminder does not exist', async () => {
      // Mock data
      const reminderId = 'nonexistent';

      // Setup mock
      (prisma.reminder.findUnique as any).mockResolvedValue(null);

      // Execute
      const result = await deleteReminder(reminderId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Reminder not found');
    });
  });

  describe('completeReminder', () => {
    it('should mark a regular reminder as completed', async () => {
      // Mock data
      const reminderId = 'reminder123';
      const reminder = {
        id: reminderId,
        title: 'Test Reminder',
        description: 'Test Description',
        dueDate: new Date(),
        isRecurring: false,
        userId: 'user_placeholder',
        status: 'PENDING',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedReminder = {
        ...reminder,
        status: 'COMPLETED',
        isCompleted: true,
        completedAt: expect.any(Date),
      };

      // Setup mock
      (prisma.reminder.findUnique as any).mockResolvedValue(reminder);
      (prisma.reminder.update as any).mockResolvedValue(updatedReminder);

      // Execute
      const result = await completeReminder(reminderId);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: reminderId },
        data: {
          status: 'COMPLETED',
          isCompleted: true,
          completedAt: expect.any(Date),
        }
      });
    });

    it('should handle virtual instance completion', async () => {
      // Mock data for a virtual instance
      const virtualReminderId = 'reminder123-1';
      const originalReminderId = 'reminder123';
      const reminder = {
        id: originalReminderId,
        title: 'Test Reminder',
        description: 'Test Description',
        dueDate: new Date(),
        isRecurring: true,
        recurrence: 'daily',
        userId: 'user_placeholder',
        status: 'PENDING',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedReminder = {
        ...reminder,
        status: 'COMPLETED',
        isCompleted: true,
        completedAt: expect.any(Date),
      };

      // Setup mock
      (prisma.reminder.findUnique as any).mockResolvedValue(reminder);
      (prisma.reminder.update as any).mockResolvedValue(updatedReminder);

      // Execute
      const result = await completeReminder(virtualReminderId);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: originalReminderId },
        data: {
          status: 'COMPLETED',
          isCompleted: true,
          completedAt: expect.any(Date),
        }
      });
    });

    it('should return an error if the reminder does not exist', async () => {
      // Mock data
      const reminderId = 'nonexistent';

      // Setup mock
      (prisma.reminder.findUnique as any).mockResolvedValue(null);

      // Execute
      const result = await completeReminder(reminderId);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Reminder not found');
    });
  });

  describe('dismissReminder', () => {
    it('should mark a reminder as dismissed', async () => {
      // Mock data
      const reminderId = 'reminder123';
      const updatedReminder = {
        id: reminderId,
        status: 'DISMISSED',
      };

      // Setup mock
      (prisma.reminder.update as any).mockResolvedValue(updatedReminder);

      // Execute
      const result = await dismissReminder(reminderId);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: reminderId },
        data: {
          status: 'DISMISSED',
        }
      });
    });

    it('should handle virtual instance dismissal', async () => {
      // Mock data for a virtual instance
      const virtualReminderId = 'reminder123-1';
      const originalReminderId = 'reminder123';
      const updatedReminder = {
        id: originalReminderId,
        status: 'DISMISSED',
      };

      // Setup mock
      (prisma.reminder.update as any).mockResolvedValue(updatedReminder);

      // Execute
      const result = await dismissReminder(virtualReminderId);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: originalReminderId },
        data: {
          status: 'DISMISSED',
        }
      });
    });
  });

  describe('snoozeReminder', () => {
    it('should snooze a regular reminder', async () => {
      // Mock data
      const reminderId = 'reminder123';
      const snoozeMinutes = 15;
      const reminder = {
        id: reminderId,
        title: 'Test Reminder',
        description: 'Test Description',
        dueDate: new Date(),
        isRecurring: false,
        userId: 'user_placeholder',
        status: 'PENDING',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedReminder = {
        ...reminder,
        status: 'SNOOZED',
        dueDate: expect.any(Date),
      };

      // Setup mock
      (prisma.reminder.findUnique as any).mockResolvedValue(reminder);
      (prisma.reminder.update as any).mockResolvedValue(updatedReminder);

      // Execute
      const result = await snoozeReminder(reminderId, snoozeMinutes);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: reminderId },
        data: {
          dueDate: expect.any(Date),
          status: 'SNOOZED',
        }
      });
    });

    it('should handle virtual instance snoozing', async () => {
      // Mock data for a virtual instance
      const virtualReminderId = 'reminder123-1';
      const originalReminderId = 'reminder123';
      const snoozeMinutes = 15;
      const reminder = {
        id: originalReminderId,
        title: 'Test Reminder',
        description: 'Test Description',
        dueDate: new Date(),
        isRecurring: true,
        recurrence: 'daily',
        userId: 'user_placeholder',
        status: 'PENDING',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const updatedReminder = {
        ...reminder,
        status: 'SNOOZED',
        dueDate: expect.any(Date),
      };

      // Setup mock
      (prisma.reminder.findUnique as any).mockResolvedValue(reminder);
      (prisma.reminder.update as any).mockResolvedValue(updatedReminder);

      // Execute
      const result = await snoozeReminder(virtualReminderId, snoozeMinutes);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: originalReminderId },
        data: {
          dueDate: expect.any(Date),
          status: 'SNOOZED',
        }
      });
    });

    it('should return an error if the reminder does not exist', async () => {
      // Mock data
      const reminderId = 'nonexistent';
      const snoozeMinutes = 15;

      // Setup mock
      (prisma.reminder.findUnique as any).mockResolvedValue(null);

      // Execute
      const result = await snoozeReminder(reminderId, snoozeMinutes);

      // Assert
      expect(result.success).toBe(false);
      expect(result.error).toBe('Reminder not found');
    });
  });

  describe('triggerReminder', () => {
    it('should mark a reminder as triggered', async () => {
      // Mock data
      const reminderId = 'reminder123';
      const updatedReminder = {
        id: reminderId,
        status: 'TRIGGERED',
      };

      // Setup mock
      (prisma.reminder.update as any).mockResolvedValue(updatedReminder);

      // Execute
      const result = await triggerReminder(reminderId);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: reminderId },
        data: {
          status: 'TRIGGERED',
        }
      });
    });

    it('should handle virtual instance triggering', async () => {
      // Mock data for a virtual instance
      const virtualReminderId = 'reminder123-1';
      const originalReminderId = 'reminder123';
      const updatedReminder = {
        id: originalReminderId,
        status: 'TRIGGERED',
      };

      // Setup mock
      (prisma.reminder.update as any).mockResolvedValue(updatedReminder);

      // Execute
      const result = await triggerReminder(virtualReminderId);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: originalReminderId },
        data: {
          status: 'TRIGGERED',
        }
      });
    });
  });

  describe('markReminderAsNotified', () => {
    it('should mark a reminder as notified', async () => {
      // Mock data
      const reminderId = 'reminder123';
      const updatedReminder = {
        id: reminderId,
        status: 'NOTIFIED',
      };

      // Setup mock
      (prisma.reminder.update as any).mockResolvedValue(updatedReminder);

      // Execute
      const result = await markReminderAsNotified(reminderId);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: reminderId },
        data: {
          status: 'NOTIFIED',
        }
      });
    });

    it('should handle virtual instance notification', async () => {
      // Mock data for a virtual instance
      const virtualReminderId = 'reminder123-1';
      const originalReminderId = 'reminder123';
      const updatedReminder = {
        id: originalReminderId,
        status: 'NOTIFIED',
      };

      // Setup mock
      (prisma.reminder.update as any).mockResolvedValue(updatedReminder);

      // Execute
      const result = await markReminderAsNotified(virtualReminderId);

      // Assert
      expect(result.success).toBe(true);
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: originalReminderId },
        data: {
          status: 'NOTIFIED',
        }
      });
    });
  });

  describe('generateRecurringInstances', () => {
    it('should generate recurring instances for a daily reminder', async () => {
      // Mock data
      const reminder = {
        id: 'reminder123',
        title: 'Daily Reminder',
        description: 'Test Description',
        dueDate: new Date('2023-01-01T10:00:00'),
        isRecurring: true,
        recurrence: 'daily',
        userId: 'user_placeholder',
        status: 'PENDING',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Execute
      const instances = await generateRecurringInstances(reminder);

      // Assert
      expect(instances.length).toBeGreaterThan(1);
      expect(instances[0]).toEqual(reminder);

      // Check that subsequent instances have the correct properties
      for (let i = 1; i < instances.length; i++) {
        expect(instances[i].id).toMatch(/reminder123-\d+/);
        expect(instances[i].title).toBe(reminder.title);
        expect(instances[i].isVirtualInstance).toBe(true);
        expect(instances[i].dueDate).toBeInstanceOf(Date);
        expect(instances[i].dueDate.getTime()).toBeGreaterThan(reminder.dueDate.getTime());
      }
    });

    it('should return only the original reminder for non-recurring reminders', async () => {
      // Mock data
      const reminder = {
        id: 'reminder123',
        title: 'Non-recurring Reminder',
        description: 'Test Description',
        dueDate: new Date('2023-01-01T10:00:00'),
        isRecurring: false,
        userId: 'user_placeholder',
        status: 'PENDING',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Execute
      const instances = await generateRecurringInstances(reminder);

      // Assert
      expect(instances.length).toBe(1);
      expect(instances[0]).toEqual(reminder);
    });
  });
});
