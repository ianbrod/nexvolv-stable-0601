// src/tests/goals-actions.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { prisma } from '@/lib/prisma';
import { createGoal, updateGoal, deleteGoal, archiveGoal, unarchiveGoal } from '@/actions/goals';

// Mock the prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    goal: {
      findUnique: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      updateMany: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock the revalidatePath function
vi.mock('next/cache', () => ({
  revalidatePath: vi.fn(),
}));

// Mock getUserId function
vi.mock('@/lib/auth-placeholder', () => ({
  PLACEHOLDER_USER_ID: 'user_placeholder',
}));

describe('Goals Server Actions', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('createGoal', () => {
    it('should create a goal with valid data', async () => {
      // Mock the goal data
      const mockGoalData = {
        name: 'New Goal',
        description: 'New Description',
        categoryId: 'cat1',
      };

      // Mock the created goal
      const mockCreatedGoal = {
        id: 'new-goal',
        ...mockGoalData,
        userId: 'user_placeholder',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the create response
      (prisma.goal.create as any).mockResolvedValueOnce(mockCreatedGoal);

      // Call the function
      const result = await createGoal(mockGoalData);

      // Check the result
      expect(result.success).toBe(true);
      expect(result.goal).toEqual(mockCreatedGoal);
    });

    it('should create a sub-goal with valid data and parent goal', async () => {
      // Mock the sub-goal data
      const mockSubGoalData = {
        name: 'New Sub-Goal',
        description: 'New Sub-Goal Description',
        parentGoalId: 'parent-goal',
      };

      // Mock the parent goal
      const mockParentGoal = {
        id: 'parent-goal',
        name: 'Parent Goal',
        userId: 'user_placeholder',
        categoryId: 'cat1',
      };

      // Mock the created sub-goal
      const mockCreatedSubGoal = {
        id: 'new-sub-goal',
        ...mockSubGoalData,
        categoryId: 'cat1', // Inherited from parent
        userId: 'user_placeholder',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the findUnique response for parent goal
      (prisma.goal.findUnique as any).mockResolvedValueOnce(mockParentGoal);

      // Mock the create response
      (prisma.goal.create as any).mockResolvedValueOnce(mockCreatedSubGoal);

      // Call the function
      const result = await createGoal(mockSubGoalData);

      // Check the result
      expect(result.success).toBe(true);
      expect(result.goal).toEqual(mockCreatedSubGoal);
    });

    it('should handle validation errors', async () => {
      // Mock invalid goal data (missing required name)
      const mockInvalidData = {
        description: 'New Description',
        categoryId: 'cat1',
      } as any;

      // Call the function
      const result = await createGoal(mockInvalidData);

      // Check the result
      expect(result.success).toBe(false);
      expect(result.message).toContain('Validation error');
    });

    it('should handle database errors', async () => {
      // Mock the goal data
      const mockGoalData = {
        name: 'New Goal',
        description: 'New Description',
        categoryId: 'cat1',
      };

      // Mock the create response to throw an error
      (prisma.goal.create as any).mockRejectedValueOnce(new Error('Database error'));

      // Call the function
      const result = await createGoal(mockGoalData);

      // Check the result
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to create goal');
    });
  });

  describe('updateGoal', () => {
    it('should update a goal with valid data', async () => {
      // Mock the goal data
      const mockGoalData = {
        id: 'goal1',
        name: 'Updated Goal',
        description: 'Updated Description',
        categoryId: 'cat2',
      };

      // Mock the existing goal
      const mockExistingGoal = {
        id: 'goal1',
        name: 'Original Goal',
        description: 'Original Description',
        categoryId: 'cat1',
        userId: 'user_placeholder',
      };

      // Mock the updated goal
      const mockUpdatedGoal = {
        ...mockExistingGoal,
        ...mockGoalData,
        updatedAt: new Date(),
      };

      // Mock the findUnique response
      (prisma.goal.findUnique as any).mockResolvedValueOnce(mockExistingGoal);

      // Mock the update response
      (prisma.goal.update as any).mockResolvedValueOnce(mockUpdatedGoal);

      // Call the function
      const result = await updateGoal(mockGoalData);

      // Check the result
      expect(result.success).toBe(true);
      expect(result.goal).toEqual(mockUpdatedGoal);
    });

    it('should return error when goal does not exist', async () => {
      // Mock the goal data
      const mockGoalData = {
        id: 'nonexistent',
        name: 'Updated Goal',
      };

      // Mock the findUnique response
      (prisma.goal.findUnique as any).mockResolvedValueOnce(null);

      // Call the function
      const result = await updateGoal(mockGoalData);

      // Check the result
      expect(result.success).toBe(false);
      expect(result.message).toContain('Goal not found');
    });

    it('should handle validation errors', async () => {
      // Mock invalid goal data (missing required id)
      const mockInvalidData = {
        name: 'Updated Goal',
      } as any;

      // Call the function
      const result = await updateGoal(mockInvalidData);

      // Check the result
      expect(result.success).toBe(false);
      expect(result.message).toContain('Validation error');
    });
  });

  describe('deleteGoal', () => {
    it('should delete a goal when it exists', async () => {
      // Mock the existing goal
      const mockExistingGoal = {
        id: 'goal1',
        name: 'Goal to Delete',
        userId: 'user_placeholder',
      };

      // Mock the findUnique response
      (prisma.goal.findUnique as any).mockResolvedValueOnce(mockExistingGoal);

      // Mock the delete response
      (prisma.goal.delete as any).mockResolvedValueOnce(mockExistingGoal);

      // Call the function
      const result = await deleteGoal('goal1');

      // Check the result
      expect(result.success).toBe(true);
      expect(result.message).toContain('Goal deleted successfully');
    });

    it('should return error when goal does not exist', async () => {
      // Mock the findUnique response
      (prisma.goal.findUnique as any).mockResolvedValueOnce(null);

      // Call the function
      const result = await deleteGoal('nonexistent');

      // Check the result
      expect(result.success).toBe(false);
      expect(result.message).toContain('Goal not found');
    });

    it('should handle database errors', async () => {
      // Mock the existing goal
      const mockExistingGoal = {
        id: 'goal1',
        name: 'Goal to Delete',
        userId: 'user_placeholder',
      };

      // Mock the findUnique response
      (prisma.goal.findUnique as any).mockResolvedValueOnce(mockExistingGoal);

      // Mock the delete response to throw an error
      (prisma.goal.delete as any).mockRejectedValueOnce(new Error('Database error'));

      // Call the function
      const result = await deleteGoal('goal1');

      // Check the result
      expect(result.success).toBe(false);
      expect(result.message).toContain('Failed to delete goal');
    });
  });
});
