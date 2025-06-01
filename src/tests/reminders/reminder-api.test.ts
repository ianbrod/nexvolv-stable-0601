// src/tests/reminders/reminder-api.test.ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { prisma } from '@/lib/prisma';
import { addDays } from 'date-fns';

// Mock the next-auth module
vi.mock('next-auth', () => ({
  getServerSession: vi.fn(),
}));

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

// Mock the auth options
vi.mock('@/lib/auth', () => ({
  authOptions: {},
}));

// Import the API route handlers after mocking
const { GET: getRemindersList, POST: createReminder } = vi.importActual('@/app/api/reminders/route') as {
  GET: (request: NextRequest) => Promise<NextResponse>;
  POST: (request: NextRequest) => Promise<NextResponse>;
};

const { GET: getReminder, PUT: updateReminder, DELETE: deleteReminder } = vi.importActual('@/app/api/reminders/[reminderId]/route') as {
  GET: (request: NextRequest, { params }: { params: { reminderId: string } }) => Promise<NextResponse>;
  PUT: (request: NextRequest, { params }: { params: { reminderId: string } }) => Promise<NextResponse>;
  DELETE: (request: NextRequest, { params }: { params: { reminderId: string } }) => Promise<NextResponse>;
};

const { POST: completeReminder } = vi.importActual('@/app/api/reminders/[reminderId]/complete/route') as {
  POST: (request: NextRequest, { params }: { params: { reminderId: string } }) => Promise<NextResponse>;
};

const { POST: dismissReminder } = vi.importActual('@/app/api/reminders/[reminderId]/dismiss/route') as {
  POST: (request: NextRequest, { params }: { params: { reminderId: string } }) => Promise<NextResponse>;
};

const { POST: snoozeReminder } = vi.importActual('@/app/api/reminders/[reminderId]/snooze/route') as {
  POST: (request: NextRequest, { params }: { params: { reminderId: string } }) => Promise<NextResponse>;
};

const { GET: getUpcomingReminders } = vi.importActual('@/app/api/reminders/upcoming/route') as {
  GET: (request: NextRequest) => Promise<NextResponse>;
};

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

describe('Reminder API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/reminders', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Setup
      mockUnauthenticatedSession();
      const request = createMockRequest();

      // Execute
      const response = await getRemindersList(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return reminders for authenticated user', async () => {
      // Setup
      mockAuthenticatedSession();
      const request = createMockRequest();

      const mockReminders = [
        {
          id: 'reminder1',
          title: 'Test Reminder 1',
          dueDate: new Date(),
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
          dueDate: new Date(),
          status: 'COMPLETED',
          isRecurring: true,
          recurrence: 'daily',
          userId: 'user123',
          isCompleted: true,
          completedAt: new Date(),
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.reminder.findMany as any).mockResolvedValue(mockReminders);

      // Execute
      const response = await getRemindersList(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual(mockReminders);
      expect(prisma.reminder.findMany).toHaveBeenCalledWith({
        where: {
          userId: 'user123',
        },
        orderBy: {
          dueDate: 'asc',
        },
      });
    });

    it('should apply filters from query parameters', async () => {
      // Setup
      mockAuthenticatedSession();
      const url = new URL('http://localhost:3000/api/reminders');
      url.searchParams.set('status', 'PENDING');
      url.searchParams.set('startDate', '2023-01-01');
      url.searchParams.set('endDate', '2023-01-31');

      const request = createMockRequest(url.toString());

      const mockReminders = [
        {
          id: 'reminder1',
          title: 'Test Reminder 1',
          dueDate: new Date('2023-01-15'),
          status: 'PENDING',
          isRecurring: false,
          userId: 'user123',
          isCompleted: false,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      ];

      (prisma.reminder.findMany as any).mockResolvedValue(mockReminders);

      // Execute
      const response = await getRemindersList(request);

      // Assert
      expect(response.status).toBe(200);
      expect(prisma.reminder.findMany).toHaveBeenCalledWith(expect.objectContaining({
        where: expect.objectContaining({
          userId: 'user123',
          status: 'PENDING',
          dueDate: expect.objectContaining({
            gte: expect.any(Date),
            lte: expect.any(Date),
          }),
        }),
      }));
    });
  });

  describe('POST /api/reminders', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Setup
      mockUnauthenticatedSession();
      const request = createMockRequest('http://localhost:3000/api/reminders', 'POST', {
        title: 'New Reminder',
        dueDate: new Date(),
        isRecurring: false,
      });

      // Execute
      const response = await createReminder(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should create a reminder for authenticated user', async () => {
      // Setup
      mockAuthenticatedSession();
      const reminderData = {
        title: 'New Reminder',
        description: 'Test Description',
        dueDate: new Date().toISOString(),
        isRecurring: false,
      };

      const request = createMockRequest('http://localhost:3000/api/reminders', 'POST', reminderData);

      const createdReminder = {
        id: 'reminder123',
        ...reminderData,
        dueDate: new Date(reminderData.dueDate),
        userId: 'user123',
        status: 'PENDING',
        isCompleted: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      (prisma.reminder.create as any).mockResolvedValue(createdReminder);

      // Execute
      const response = await createReminder(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(201);
      expect(data).toEqual(createdReminder);
      expect(prisma.reminder.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          title: reminderData.title,
          description: reminderData.description,
          userId: 'user123',
          status: 'PENDING',
          isCompleted: false,
        }),
      });
    });

    it('should return 400 for invalid reminder data', async () => {
      // Setup
      mockAuthenticatedSession();
      const invalidData = {
        // Missing title
        dueDate: new Date().toISOString(),
        isRecurring: false,
      };

      const request = createMockRequest('http://localhost:3000/api/reminders', 'POST', invalidData);

      // Execute
      const response = await createReminder(request);
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(prisma.reminder.create).not.toHaveBeenCalled();
    });
  });

  describe('GET /api/reminders/[reminderId]', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Setup
      mockUnauthenticatedSession();
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123');
      const params = { reminderId: 'reminder123' };

      // Execute
      const response = await getReminder(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return 404 if reminder does not exist', async () => {
      // Setup
      mockAuthenticatedSession();
      const request = createMockRequest('http://localhost:3000/api/reminders/nonexistent');
      const params = { reminderId: 'nonexistent' };

      (prisma.reminder.findUnique as any).mockResolvedValue(null);

      // Execute
      const response = await getReminder(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Reminder not found' });
    });

    it('should return 403 if reminder belongs to another user', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123');
      const params = { reminderId: 'reminder123' };

      (prisma.reminder.findUnique as any).mockResolvedValue({
        id: 'reminder123',
        userId: 'another_user',
      });

      // Execute
      const response = await getReminder(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return the reminder if it belongs to the authenticated user', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123');
      const params = { reminderId: 'reminder123' };

      const reminder = {
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

      (prisma.reminder.findUnique as any).mockResolvedValue(reminder);

      // Execute
      const response = await getReminder(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual(reminder);
    });
  });

  describe('PUT /api/reminders/[reminderId]', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Setup
      mockUnauthenticatedSession();
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123', 'PUT', {
        title: 'Updated Reminder',
      });
      const params = { reminderId: 'reminder123' };

      // Execute
      const response = await updateReminder(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return 404 if reminder does not exist', async () => {
      // Setup
      mockAuthenticatedSession();
      const request = createMockRequest('http://localhost:3000/api/reminders/nonexistent', 'PUT', {
        title: 'Updated Reminder',
      });
      const params = { reminderId: 'nonexistent' };

      (prisma.reminder.findUnique as any).mockResolvedValue(null);

      // Execute
      const response = await updateReminder(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Reminder not found' });
    });

    it('should return 403 if reminder belongs to another user', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123', 'PUT', {
        title: 'Updated Reminder',
      });
      const params = { reminderId: 'reminder123' };

      (prisma.reminder.findUnique as any).mockResolvedValue({
        id: 'reminder123',
        userId: 'another_user',
      });

      // Execute
      const response = await updateReminder(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should update the reminder if it belongs to the authenticated user', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const updateData = {
        title: 'Updated Reminder',
        description: 'Updated Description',
        dueDate: new Date().toISOString(),
        isRecurring: true,
        recurrence: 'weekly',
      };

      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123', 'PUT', updateData);
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

      const updatedReminder = {
        ...existingReminder,
        ...updateData,
        dueDate: new Date(updateData.dueDate),
        updatedAt: new Date(),
      };

      (prisma.reminder.findUnique as any).mockResolvedValue(existingReminder);
      (prisma.reminder.update as any).mockResolvedValue(updatedReminder);

      // Execute
      const response = await updateReminder(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual(updatedReminder);
      expect(prisma.reminder.update).toHaveBeenCalledWith({
        where: { id: 'reminder123' },
        data: expect.objectContaining({
          title: updateData.title,
          description: updateData.description,
          isRecurring: updateData.isRecurring,
          recurrence: updateData.recurrence,
        }),
      });
    });

    it('should return 400 for invalid update data', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const invalidData = {
        title: '', // Empty title is invalid
      };

      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123', 'PUT', invalidData);
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

      // Execute
      const response = await updateReminder(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(400);
      expect(data.error).toBeDefined();
      expect(prisma.reminder.update).not.toHaveBeenCalled();
    });
  });

  describe('DELETE /api/reminders/[reminderId]', () => {
    it('should return 401 if user is not authenticated', async () => {
      // Setup
      mockUnauthenticatedSession();
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123', 'DELETE');
      const params = { reminderId: 'reminder123' };

      // Execute
      const response = await deleteReminder(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(401);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should return 404 if reminder does not exist', async () => {
      // Setup
      mockAuthenticatedSession();
      const request = createMockRequest('http://localhost:3000/api/reminders/nonexistent', 'DELETE');
      const params = { reminderId: 'nonexistent' };

      (prisma.reminder.findUnique as any).mockResolvedValue(null);

      // Execute
      const response = await deleteReminder(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(404);
      expect(data).toEqual({ error: 'Reminder not found' });
    });

    it('should return 403 if reminder belongs to another user', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123', 'DELETE');
      const params = { reminderId: 'reminder123' };

      (prisma.reminder.findUnique as any).mockResolvedValue({
        id: 'reminder123',
        userId: 'another_user',
      });

      // Execute
      const response = await deleteReminder(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(403);
      expect(data).toEqual({ error: 'Unauthorized' });
    });

    it('should delete the reminder if it belongs to the authenticated user', async () => {
      // Setup
      mockAuthenticatedSession('user123');
      const request = createMockRequest('http://localhost:3000/api/reminders/reminder123', 'DELETE');
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
      (prisma.reminder.delete as any).mockResolvedValue(existingReminder);

      // Execute
      const response = await deleteReminder(request, { params });
      const data = await response.json();

      // Assert
      expect(response.status).toBe(200);
      expect(data).toEqual({ success: true });
      expect(prisma.reminder.delete).toHaveBeenCalledWith({
        where: { id: 'reminder123' },
      });
    });
  });
});
