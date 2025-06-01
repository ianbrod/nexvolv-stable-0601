// src/tests/reminders/reminder-model.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ReminderFormSchema, ReminderFormValidation, CreateReminderSchema, UpdateReminderSchema } from '@/lib/schemas/reminders';
import { addDays } from 'date-fns';

describe('Reminder Model Validation', () => {
  describe('ReminderFormSchema', () => {
    it('should validate a valid reminder form input', () => {
      const validInput = {
        title: 'Test Reminder',
        description: 'This is a test reminder',
        dueDate: new Date(),
        isRecurring: false,
        status: 'PENDING' as const,
      };

      const result = ReminderFormSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject a reminder with a title that is too short', () => {
      const invalidInput = {
        title: 'Te', // Less than 3 characters
        dueDate: new Date(),
        isRecurring: false,
      };

      const result = ReminderFormSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('title');
      }
    });

    it('should reject a reminder with a title that is too long', () => {
      const invalidInput = {
        title: 'A'.repeat(101), // More than 100 characters
        dueDate: new Date(),
        isRecurring: false,
      };

      const result = ReminderFormSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('title');
      }
    });

    it('should require a dueDate', () => {
      const invalidInput = {
        title: 'Test Reminder',
        isRecurring: false,
      };

      const result = ReminderFormSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('dueDate');
      }
    });

    it('should set default values for optional fields', () => {
      const minimalInput = {
        title: 'Test Reminder',
        dueDate: new Date(),
      };

      const result = ReminderFormSchema.safeParse(minimalInput);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.isRecurring).toBe(false);
        expect(result.data.status).toBe('PENDING');
      }
    });
  });

  describe('ReminderFormValidation', () => {
    it('should validate a non-recurring reminder', () => {
      const validInput = {
        title: 'Test Reminder',
        dueDate: new Date(),
        isRecurring: false,
      };

      const result = ReminderFormValidation.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should validate a recurring reminder with a valid recurrence pattern', () => {
      const validInput = {
        title: 'Test Reminder',
        dueDate: new Date(),
        isRecurring: true,
        recurrence: 'daily',
      };

      const result = ReminderFormValidation.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should reject a recurring reminder without a recurrence pattern', () => {
      const invalidInput = {
        title: 'Test Reminder',
        dueDate: new Date(),
        isRecurring: true,
        // Missing recurrence
      };

      const result = ReminderFormValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('recurrence');
      }
    });

    it('should reject a recurring reminder with an invalid recurrence pattern', () => {
      const invalidInput = {
        title: 'Test Reminder',
        dueDate: new Date(),
        isRecurring: true,
        recurrence: 'invalid-pattern',
      };

      const result = ReminderFormValidation.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues[0].path).toContain('recurrence');
      }
    });
  });

  describe('CreateReminderSchema', () => {
    it('should validate a valid create reminder input', () => {
      const validInput = {
        title: 'Test Reminder',
        description: 'This is a test reminder',
        dueDate: new Date(),
        isRecurring: false,
        userId: 'user123',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = CreateReminderSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should require userId, createdAt, and updatedAt', () => {
      const invalidInput = {
        title: 'Test Reminder',
        dueDate: new Date(),
        isRecurring: false,
        // Missing userId, createdAt, updatedAt
      };

      const result = CreateReminderSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map(issue => issue.path[0]);
        expect(paths).toContain('userId');
        expect(paths).toContain('createdAt');
        expect(paths).toContain('updatedAt');
      }
    });
  });

  describe('UpdateReminderSchema', () => {
    it('should validate a valid update reminder input', () => {
      const validInput = {
        id: 'reminder123',
        title: 'Updated Reminder',
        updatedAt: new Date(),
      };

      const result = UpdateReminderSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });

    it('should require id and updatedAt', () => {
      const invalidInput = {
        title: 'Updated Reminder',
        // Missing id and updatedAt
      };

      const result = UpdateReminderSchema.safeParse(invalidInput);
      expect(result.success).toBe(false);
      if (!result.success) {
        const paths = result.error.issues.map(issue => issue.path[0]);
        expect(paths).toContain('id');
        expect(paths).toContain('updatedAt');
      }
    });

    it('should allow partial updates', () => {
      const validInput = {
        id: 'reminder123',
        updatedAt: new Date(),
        // Only updating status
        status: 'COMPLETED' as const,
      };

      const result = UpdateReminderSchema.safeParse(validInput);
      expect(result.success).toBe(true);
    });
  });
});
