// src/tests/reminders/reminder-special-endpoints.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { addMinutes } from 'date-fns';

// Mock the next-auth module
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

// Mock the prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    reminder: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock the auth options
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Mock the reminders-prisma actions
vi.mock('@/actions/reminders-prisma', () => ({
  completeReminder: vi.fn(),
  dismissReminder: vi.fn(),
  snoozeReminder: vi.fn(),
  triggerReminder: vi.fn(),
  markReminderAsNotified: vi.fn(),
}));

// Import the API route handlers after mocking
const { POST: completeReminderEndpoint } = vi.importActual('@/app/api/reminders/[reminderId]/complete/route') as {
  POST: (request: NextRequest, { params }: { params: { reminderId: string } }) => Promise<NextResponse>;
};

const { POST: dismissReminderEndpoint } = vi.importActual('@/app/api/reminders/[reminderId]/dismiss/route') as {
  POST: (request: NextRequest, { params }: { params: { reminderId: string } }) => Promise<NextResponse>;
};

const { POST: snoozeReminderEndpoint } = vi.importActual('@/app/api/reminders/[reminderId]/snooze/route') as {
  POST: (request: NextRequest, { params }: { params: { reminderId: string } }) => Promise<NextResponse>;
};

const { GET: getUpcomingRemindersEndpoint } = vi.importActual('@/app/api/reminders/upcoming/route') as {
  GET: (request: NextRequest) => Promise<NextResponse>;
};

// Import the mocked actions
import { completeReminder, dismissReminder, snoozeReminder } from '@/actions/reminders-prisma';

// Helper to create a mock NextRequest
function createMockRequest(url = 'http://localhost:3000/api/reminders', method = 'GET', body?: any) {
  const request = new Request(url, {
    method,
    ...(body && { body: JSON.stringify(body) }),
    headers: {
      'Content-Type': 'application/json',
    },
  });

  return request as unknown as NextRequest;
}

// Helper to mock authenticated session
function mockAuthenticatedSession(userId = 'user123') {
  (getServerSession as any).mockResolvedValue({
    user: {
      id: userId,
      email: 'test@example.com',
      name: 'Test User',
    },
  });
}

// Helper to mock unauthenticated session
function mockUnauthenticatedSession() {
  (getServerSession as any).mockResolvedValue(null);
}

describe('Reminder Special Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('POST /api/reminders/[reminderId]/complete', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Setup
      mockUnauthenticatedSession();
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123/complete', 'POST');
      const params = { reminderId: 'reminder123' };

      // Execute
      const response = await completeReminderEndpoint(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should complete a regular reminder', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123/complete', 'POST');
      const params = { reminderId: 'reminder123' };

      const existingReminder = {
        id: 'reminder123',
        title: 'Test Reminder',
        description: 'Test Description',
        dueDate: new Date(),
        status: 'PENDING',
        isRecurring: false,
        userId: 'user123',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.reminder.findUnique as any).mockResolvedValue(existingReminder);
      (prisma.reminder.update as any).mockResolvedValue({
        ...existingReminder,
        status: 'COMPLETED',
        isCompleted: true,
        completedAt: expect.any(Date),
      });

      // Execute
      const response = await completeReminderEndpoint(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: 'reminder123' },
        data: {
          status: 'COMPLETED',
          isCompleted: true,
          completedAt: expect.any(Date),
        }
      });
    });

    it('should handle virtual instance completion', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const virtualReminderId = 'reminder123-1';
      const request = createMockRequest(`http://localhost:3000/api/reminders/${virtualReminderId}/complete`, 'POST');
      const params = { reminderId: virtualReminderId };

      (completeReminder as any).mockResolvedValue({ success: true });

      // Execute
      const response = await completeReminderEndpoint(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(completeReminder).toHaveBeenCalledWith(virtualReminderId);
    });

    it('should return 404 if reminder does not exist', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const request = createMockRequest('http://localhost:3000/api/reminders/nonexistent/complete', 'POST');
      const params = { reminderId: 'nonexistent' };

      (prisma.reminder.findUnique as any).mockResolvedValue(null);

      // Execute
      const response = await completeReminderEndpoint(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Reminder not found' });
    });

    it('should return 403 if reminder belongs to another user', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123/complete', 'POST');
      const params = { reminderId: 'reminder123' };

      (prisma.reminder.findUnique as any).mockResolvedValue({
        id: 'reminder123',
        userId: 'another_user',
      });

      // Execute
      const response = await completeReminderEndpoint(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Unauthorized' });
    });
  });

  describe('POST /api/reminders/[reminderId]/dismiss', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Setup
      mockUnauthenticatedSession();
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123/dismiss', 'POST');
      const params = { reminderId: 'reminder123' };

      // Execute
      const response = await dismissReminderEndpoint(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should dismiss a regular reminder', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123/dismiss', 'POST');
      const params = { reminderId: 'reminder123' };

      const existingReminder = {
        id: 'reminder123',
        title: 'Test Reminder',
        description: 'Test Description',
        dueDate: new Date(),
        status: 'PENDING',
        isRecurring: false,
        userId: 'user123',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.reminder.findUnique as any).mockResolvedValue(existingReminder);
      (prisma.reminder.update as any).mockResolvedValue({
        ...existingReminder,
        status: 'DISMISSED',
      });

      // Execute
      const response = await dismissReminderEndpoint(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: 'reminder123' },
        data: {
          status: 'DISMISSED',
        }
      });
    });

    it('should handle virtual instance dismissal', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const virtualReminderId = 'reminder123-1';
      const request = createMockRequest(`http://localhost:3000/api/reminders/${virtualReminderId}/dismiss`, 'POST');
      const params = { reminderId: virtualReminderId };

      (dismissReminder as any).mockResolvedValue({ success: true });

      // Execute
      const response = await dismissReminderEndpoint(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(dismissReminder).toHaveBeenCalledWith(virtualReminderId);
    });
  });

  describe('POST /api/reminders/[reminderId]/snooze', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Setup
      mockUnauthenticatedSession();
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123/snooze', 'POST', {
        minutes: 15
      });
      const params = { reminderId: 'reminder123' };

      // Execute
      const response = await snoozeReminderEndpoint(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should snooze a regular reminder', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const snoozeMinutes = 15;
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123/snooze', 'POST', {
        minutes: snoozeMinutes
      });
      const params = { reminderId: 'reminder123' };

      const existingReminder = {
        id: 'reminder123',
        title: 'Test Reminder',
        description: 'Test Description',
        dueDate: new Date(),
        status: 'PENDING',
        isRecurring: false,
        userId: 'user123',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const newDueDate = addMinutes(existingReminder.dueDate, snoozeMinutes);

      (prisma.reminder.findUnique as any).mockResolvedValue(existingReminder);
      (prisma.reminder.update as any).mockResolvedValue({
        ...existingReminder,
        status: 'SNOOZED',
        dueDate: newDueDate,
      });

      // Execute
      const response = await snoozeReminderEndpoint(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: 'reminder123' },
        data: {
          status: 'SNOOZED',
          dueDate: expect.any(Date),
        }
      });
    });

    it('should handle virtual instance snoozing', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const virtualReminderId = 'reminder123-1';
      const snoozeMinutes = 15;
      const request = createMockRequest(`http://localhost:3000/api/reminders/${virtualReminderId}/snooze`, 'POST', {
        minutes: snoozeMinutes
      });
      const params = { reminderId: virtualReminderId };

      (snoozeReminder as any).mockResolvedValue({ success: true });

      // Execute
      const response = await snoozeReminderEndpoint(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(snoozeReminder).toHaveBeenCalledWith(virtualReminderId, snoozeMinutes);
    });

    it('should use default snooze time if not provided', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123/snooze', 'POST', {});
      const params = { reminderId: 'reminder123' };

      const existingReminder = {
        id: 'reminder123',
        title: 'Test Reminder',
        description: 'Test Description',
        dueDate: new Date(),
        status: 'PENDING',
        isRecurring: false,
        userId: 'user123',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.reminder.findUnique as any).mockResolvedValue(existingReminder);
      (prisma.reminder.update as any).mockResolvedValue({
        ...existingReminder,
        status: 'SNOOZED',
        dueDate: expect.any(Date),
      });

      // Execute
      const response = await snoozeReminderEndpoint(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      // Default snooze time should be 15 minutes
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: 'reminder123' },
        data: {
          status: 'SNOOZED',
          dueDate: expect.any(Date),
        }
      });
    });
  });

  describe('GET /api/reminders/upcoming', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Setup
      mockUnauthenticatedSession();
      const request = createMockRequest('http://localhost:3000/api/reminders/upcoming');

      // Execute
      const response = await getUpcomingRemindersEndpoint(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return upcoming reminders for authenticated user', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const request = createMockRequest('http://localhost:3000/api/reminders/upcoming');

      const now = new Date();
      const mockReminders = [
        {
          id: 'reminder1',
          title: 'Test Reminder 1',
          dueDate: addMinutes(now, 2),
          status: 'PENDING',
          isRecurring: false,
          userId: 'user123',
          isCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
        {
          id: 'reminder2',
          title: 'Test Reminder 2',
          dueDate: addMinutes(now, 4),
          status: 'PENDING',
          isRecurring: true,
          recurrence: 'daily',
          userId: 'user123',
          isCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.reminder.findMany as any).mockResolvedValue(mockReminders);

      // Execute
      const response = await getUpcomingRemindersEndpoint(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual(mockReminders);
      expect(prisma.reminder.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user123',
          status: 'PENDING',
        }),
        orderBy: {
          dueDate: 'asc',
        },
      }));
    });

    it('should apply query parameters for filtering', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const url = new URL('http://localhost:3000/api/reminders/upcoming');
      url.searchParams.set('minutes', '10');
      url.searchParams.set('includeOverdue', 'false');
      url.searchParams.set('status', 'TRIGGERED');

      const request = createMockRequest(url.toString());

      const now = new Date();
      const mockReminders = [
        {
          id: 'reminder1',
          title: 'Test Reminder 1',
          dueDate: addMinutes(now, 5),
          status: 'TRIGGERED',
          isRecurring: false,
          userId: 'user123',
          isCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.reminder.findMany as any).mockResolvedValue(mockReminders);

      // Execute
      const response = await getUpcomingRemindersEndpoint(request);

      // Assert
      expect(response.status).toBe(200);
      expect(prisma.reminder.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user123',
          status: 'TRIGGERED',
          dueDate: expect.objectContaining({
            lte: expect.any(Date),
          }),
        }),
      }));
    });
  });
});
