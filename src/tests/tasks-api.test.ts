// src/tests/tasks-api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GET as getTask } from '@/app/api/tasks/[taskId]/route';
import { GET as getAllTasks } from '@/app/api/tasks/all/route';
import { POST as createTask } from '@/app/api/tasks/route';
import { PATCH as updateTask, DELETE as deleteTask } from '@/app/api/tasks/[taskId]/route';

// Mock the prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
    goal: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock NextRequest
const createMockRequest = (body?: any) => {
  const request = {
    json: vi.fn().mockResolvedValue(body || {}),
    url: 'http://localhost:3000/api/tasks',
  } as unknown as NextRequest;
  return request;
};

// Mock URL for query parameters
const createMockRequestWithUrl = (url: string) => {
  const request = {
    json: vi.fn(),
    url,
  } as unknown as NextRequest;
  return request;
};

describe('Tasks API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/tasks/[taskId]', () => {
    it('should return a task when it exists', async () => {
      const mockTask = {
        id: 'task1',
        name: 'Test Task',
        description: 'Test Description',
        userId: 'user_placeholder',
      };

      (prisma.task.findUnique as any).mockResolvedValue(mockTask);

      const request = createMockRequest();
      const response = await getTask(request, { params: { taskId: 'task1' } });
      const data = await response.json();

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'task1',
          userId: 'user_placeholder',
        },
        include: expect.any(Object),
      });
      expect(data.success).toBe(true);
      expect(data.task).toEqual(mockTask);
    });

    it('should return 404 when task does not exist', async () => {
      (prisma.task.findUnique as any).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await getTask(request, { params: { taskId: 'nonexistent' } });
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toBe('Task not found');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/tasks/all', () => {
    it('should return all tasks for the user', async () => {
      const mockTasks = [
        { id: 'task1', name: 'Task 1', userId: 'user_placeholder' },
        { id: 'task2', name: 'Task 2', userId: 'user_placeholder' },
      ];

      (prisma.task.findMany as any).mockResolvedValue(mockTasks);

      const request = createMockRequestWithUrl('http://localhost:3000/api/tasks/all');
      const response = await getAllTasks(request);
      const data = await response.json();

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_placeholder' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(data.success).toBe(true);
      expect(data.tasks).toEqual(mockTasks);
    });

    it('should filter tasks by goalId when provided', async () => {
      const mockTasks = [
        { id: 'task1', name: 'Task 1', userId: 'user_placeholder', goalId: 'goal1' },
      ];

      (prisma.task.findMany as any).mockResolvedValue(mockTasks);

      const request = createMockRequestWithUrl('http://localhost:3000/api/tasks/all?goalId=goal1');
      const response = await getAllTasks(request);
      const data = await response.json();

      expect(prisma.task.findMany).toHaveBeenCalledWith({
        where: { userId: 'user_placeholder', goalId: 'goal1' },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(data.success).toBe(true);
      expect(data.tasks).toEqual(mockTasks);
    });
  });

  describe('POST /api/tasks', () => {
    it('should create a new task', async () => {
      const taskData = {
        name: 'New Task',
        description: 'Task Description',
        priority: 'HIGH',
        goalId: 'goal1',
      };

      const mockTask = {
        id: 'task1',
        ...taskData,
        userId: 'user_placeholder',
      };

      (prisma.goal.findUnique as any).mockResolvedValue({ id: 'goal1', name: 'Goal 1' });
      (prisma.task.create as any).mockResolvedValue(mockTask);

      const request = createMockRequest(taskData);
      const response = await createTask(request);
      const data = await response.json();

      expect(prisma.goal.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'goal1',
          userId: 'user_placeholder',
        },
      });
      expect(prisma.task.create).toHaveBeenCalledWith({
        data: {
          ...taskData,
          dueDate: null,
          userId: 'user_placeholder',
        },
        include: expect.any(Object),
      });
      expect(data.success).toBe(true);
      expect(data.task).toEqual(mockTask);
    });

    it('should return 404 when goal does not exist', async () => {
      const taskData = {
        name: 'New Task',
        description: 'Task Description',
        priority: 'HIGH',
        goalId: 'nonexistent',
      };

      (prisma.goal.findUnique as any).mockResolvedValue(null);

      const request = createMockRequest(taskData);
      const response = await createTask(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toBe('Goal not found');
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/tasks/[taskId]', () => {
    it('should update a task', async () => {
      const taskData = {
        name: 'Updated Task',
        description: 'Updated Description',
      };

      const mockTask = {
        id: 'task1',
        name: 'Original Task',
        description: 'Original Description',
        userId: 'user_placeholder',
        status: 'TODO',
      };

      const updatedTask = {
        ...mockTask,
        ...taskData,
      };

      (prisma.task.findUnique as any).mockResolvedValue(mockTask);
      (prisma.task.update as any).mockResolvedValue(updatedTask);

      const request = createMockRequest(taskData);
      const response = await updateTask(request, { params: { taskId: 'task1' } });
      const data = await response.json();

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'task1',
          userId: 'user_placeholder',
        },
      });
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: {
          id: 'task1',
        },
        data: taskData,
        include: expect.any(Object),
      });
      expect(data.success).toBe(true);
      expect(data.task).toEqual(updatedTask);
    });

    it('should return 404 when task does not exist', async () => {
      (prisma.task.findUnique as any).mockResolvedValue(null);

      const request = createMockRequest({ name: 'Updated Task' });
      const response = await updateTask(request, { params: { taskId: 'nonexistent' } });
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toBe('Task not found');
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/tasks/[taskId]', () => {
    it('should delete a task', async () => {
      const mockTask = {
        id: 'task1',
        name: 'Task to Delete',
        userId: 'user_placeholder',
      };

      (prisma.task.findUnique as any).mockResolvedValue(mockTask);
      (prisma.task.delete as any).mockResolvedValue(mockTask);

      const request = createMockRequest();
      const response = await deleteTask(request, { params: { taskId: 'task1' } });
      const data = await response.json();

      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'task1',
          userId: 'user_placeholder',
        },
      });
      expect(prisma.task.delete).toHaveBeenCalledWith({
        where: {
          id: 'task1',
        },
      });
      expect(data.success).toBe(true);
      expect(data.message).toBe('Task deleted successfully');
    });

    it('should return 404 when task does not exist', async () => {
      (prisma.task.findUnique as any).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await deleteTask(request, { params: { taskId: 'nonexistent' } });
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toBe('Task not found');
      expect(response.status).toBe(404);
    });
  });
});
