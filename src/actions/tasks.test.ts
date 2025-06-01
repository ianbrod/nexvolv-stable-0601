import { describe, it, expect, vi, beforeEach } from 'vitest';
import { updateTaskStatus } from './tasks';
import { TaskStatus } from '@prisma/client';

// Mock the prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    task: {
      findUnique: vi.fn(),
      update: vi.fn(),
    },
  },
}));

// Mock the next/cache module
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Import the mocked prisma client
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

describe('Task Actions', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  describe('updateTaskStatus', () => {
    it('should update a task status successfully', async () => {
      // Mock the task to be found
      const mockTask = {
        id: 'task-123',
        name: 'Test Task',
        status: TaskStatus.TODO,
        startedAt: null,
        completedAt: null,
      };

      // Mock the FormData
      const formData = new FormData();
      formData.append('taskId', 'task-123');
      formData.append('status', TaskStatus.IN_PROGRESS);

      // Setup the mocks
      (prisma.task.findUnique as any).mockResolvedValue(mockTask);
      (prisma.task.update as any).mockResolvedValue({
        ...mockTask,
        status: TaskStatus.IN_PROGRESS,
        startedAt: new Date(),
      });

      // Call the function
      const result = await updateTaskStatus(formData);

      // Assertions
      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 'task-123' },
      });

      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: expect.objectContaining({
          status: TaskStatus.IN_PROGRESS,
          startedAt: expect.any(Date),
        }),
      });

      expect(revalidatePath).toHaveBeenCalledWith('/tasks');
      expect(revalidatePath).toHaveBeenCalledWith('/goals');

      expect(result).toEqual({
        success: true,
        message: 'Task status updated successfully.',
      });
    });

    it('should handle task not found', async () => {
      // Mock the FormData
      const formData = new FormData();
      formData.append('taskId', 'non-existent-task');
      formData.append('status', TaskStatus.IN_PROGRESS);

      // Setup the mocks
      (prisma.task.findUnique as any).mockResolvedValue(null);

      // Call the function
      const result = await updateTaskStatus(formData);

      // Assertions
      expect(prisma.task.findUnique).toHaveBeenCalledWith({
        where: { id: 'non-existent-task' },
      });

      expect(prisma.task.update).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();

      expect(result).toEqual({
        success: false,
        message: 'Task not found.',
      });
    });

    it('should handle invalid input', async () => {
      // Mock the FormData with missing status
      const formData = new FormData();
      formData.append('taskId', 'task-123');
      // No status provided

      // Call the function
      const result = await updateTaskStatus(formData);

      // Assertions
      expect(prisma.task.findUnique).not.toHaveBeenCalled();
      expect(prisma.task.update).not.toHaveBeenCalled();
      expect(revalidatePath).not.toHaveBeenCalled();

      expect(result).toEqual({
        success: false,
        message: 'Missing required fields.',
      });
    });

    it('should update completedAt when status is COMPLETED', async () => {
      // Mock the task to be found
      const mockTask = {
        id: 'task-123',
        name: 'Test Task',
        status: TaskStatus.IN_PROGRESS,
        startedAt: new Date(),
        completedAt: null,
      };

      // Mock the FormData
      const formData = new FormData();
      formData.append('taskId', 'task-123');
      formData.append('status', TaskStatus.COMPLETED);

      // Setup the mocks
      (prisma.task.findUnique as any).mockResolvedValue(mockTask);
      (prisma.task.update as any).mockResolvedValue({
        ...mockTask,
        status: TaskStatus.COMPLETED,
        completedAt: new Date(),
      });

      // Call the function
      const result = await updateTaskStatus(formData);

      // Assertions
      expect(prisma.task.update).toHaveBeenCalledWith({
        where: { id: 'task-123' },
        data: expect.objectContaining({
          status: TaskStatus.COMPLETED,
          completedAt: expect.any(Date),
        }),
      });

      expect(result.success).toBe(true);
    });
  });
});
