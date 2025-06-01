// src/tests/goals-api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GET as getGoal } from '@/app/api/goals/[goalId]/route';
import { GET as getAllGoals } from '@/app/api/goals/all/route';
import { POST as createGoal } from '@/app/api/goals/route';
import { POST as createSubGoal } from '@/app/api/goals/sub-goal/route';
import { createGoal as createGoalAction, updateGoal, deleteGoal } from '@/actions/goals';

// Mock the prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    goal: {
      findUnique: vi.fn(),
      findMany: vi.fn(),
      create: vi.fn(),
      update: vi.fn(),
      delete: vi.fn(),
    },
  },
}));

// Mock the NextRequest and NextResponse
vi.mock('next/server', () => {
  const originalModule = vi.importActual('next/server');
  return {
    ...originalModule,
    NextResponse: {
      json: vi.fn().mockImplementation((data, options) => {
        return { data, options };
      }),
    },
  };
});

// Mock getUserId function
vi.mock('@/lib/auth-placeholder', () => ({
  PLACEHOLDER_USER_ID: 'user_placeholder',
}));

// Helper function to create a mock request
const createMockRequest = (body: any) => {
  return {
    json: vi.fn().mockResolvedValue(body),
  } as unknown as NextRequest;
};

describe('Goals API Endpoints', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  describe('GET /api/goals/[goalId]', () => {
    it('should return a goal when it exists', async () => {
      // Mock the goal data
      const mockGoal = {
        id: 'goal1',
        name: 'Test Goal',
        description: 'Test Description',
        userId: 'user_placeholder',
        category: { id: 'cat1', name: 'Test Category' },
        tasks: [],
        subGoals: [],
      };

      // Mock the findUnique response
      (prisma.goal.findUnique as any).mockResolvedValueOnce(mockGoal);

      // Call the function
      const response = await getGoal({} as NextRequest, { params: { goalId: 'goal1' } });

      // Check the response
      expect(response.data.success).toBe(true);
      expect(response.data.goal).toEqual(mockGoal);
    });

    it('should return 404 when goal does not exist', async () => {
      // Mock the findUnique response
      (prisma.goal.findUnique as any).mockResolvedValueOnce(null);

      // Call the function
      const response = await getGoal({} as NextRequest, { params: { goalId: 'nonexistent' } });

      // Check the response
      expect(response.data.success).toBe(false);
      expect(response.data.message).toBe('Goal not found');
      expect(response.options.status).toBe(404);
    });
  });

  describe('GET /api/goals/all', () => {
    it('should return all goals for the user', async () => {
      // Mock the goals data
      const mockGoals = [
        {
          id: 'goal1',
          name: 'Test Goal 1',
          userId: 'user_placeholder',
          category: { id: 'cat1', name: 'Test Category' },
          _count: { subGoals: 0, tasks: 0 },
        },
        {
          id: 'goal2',
          name: 'Test Goal 2',
          userId: 'user_placeholder',
          category: null,
          _count: { subGoals: 2, tasks: 3 },
        },
      ];

      // Mock the findMany response
      (prisma.goal.findMany as any).mockResolvedValueOnce(mockGoals);

      // Call the function
      const response = await getAllGoals({} as NextRequest);

      // Check the response
      expect(response.data.success).toBe(true);
      expect(response.data.goals).toEqual(mockGoals);
    });

    it('should handle errors when fetching goals', async () => {
      // Mock the findMany response to throw an error
      (prisma.goal.findMany as any).mockRejectedValueOnce(new Error('Database error'));

      // Call the function
      const response = await getAllGoals({} as NextRequest);

      // Check the response
      expect(response.data.success).toBe(false);
      expect(response.data.message).toContain('Server error');
      expect(response.options.status).toBe(500);
    });
  });

  describe('POST /api/goals', () => {
    it('should create a new goal with valid data', async () => {
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

      // Create a mock request
      const mockRequest = createMockRequest(mockGoalData);

      // Call the function
      const response = await createGoal(mockRequest);

      // Check the response
      expect(response.data.success).toBe(true);
      expect(response.data.goal).toEqual(mockCreatedGoal);
    });

    it('should return 400 with invalid data', async () => {
      // Mock invalid goal data (missing required name)
      const mockInvalidData = {
        description: 'New Description',
        categoryId: 'cat1',
      };

      // Create a mock request
      const mockRequest = createMockRequest(mockInvalidData);

      // Call the function
      const response = await createGoal(mockRequest);

      // Check the response
      expect(response.data.success).toBe(false);
      expect(response.options.status).toBe(400);
    });
  });

  describe('POST /api/goals/sub-goal', () => {
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
      };

      // Mock the created sub-goal
      const mockCreatedSubGoal = {
        id: 'new-sub-goal',
        ...mockSubGoalData,
        userId: 'user_placeholder',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      // Mock the findUnique response for parent goal
      (prisma.goal.findUnique as any).mockResolvedValueOnce(mockParentGoal);

      // Mock the create response
      (prisma.goal.create as any).mockResolvedValueOnce(mockCreatedSubGoal);

      // Create a mock request
      const mockRequest = createMockRequest(mockSubGoalData);

      // Call the function
      const response = await createSubGoal(mockRequest);

      // Check the response
      expect(response.data.success).toBe(true);
      expect(response.data.goal).toEqual(mockCreatedSubGoal);
    });

    it('should return 404 when parent goal does not exist', async () => {
      // Mock the sub-goal data
      const mockSubGoalData = {
        name: 'New Sub-Goal',
        description: 'New Sub-Goal Description',
        parentGoalId: 'nonexistent-parent',
      };

      // Mock the findUnique response for parent goal
      (prisma.goal.findUnique as any).mockResolvedValueOnce(null);

      // Create a mock request
      const mockRequest = createMockRequest(mockSubGoalData);

      // Call the function
      const response = await createSubGoal(mockRequest);

      // Check the response
      expect(response.data.success).toBe(false);
      expect(response.data.message).toContain('Parent goal not found');
      expect(response.options.status).toBe(404);
    });
  });
});
