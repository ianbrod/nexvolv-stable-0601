// src/tests/sub-goals-api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GET as getSubGoal } from '@/app/api/goals/sub-goal/[subGoalId]/route';
import { GET as getAllSubGoals } from '@/app/api/goals/sub-goal/all/route';
import { POST as createSubGoal } from '@/app/api/goals/sub-goal/route';
import { PATCH as updateSubGoal, DELETE as deleteSubGoal } from '@/app/api/goals/sub-goal/[subGoalId]/route';

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
    category: {
      findUnique: vi.fn(),
    },
  },
}));

// Mock NextRequest
const createMockRequest = (body?: any) => {
  const request = {
    json: vi.fn().mockResolvedValue(body || {}),
    url: 'http://localhost:3000/api/goals/sub-goal',
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

describe('SubGoals API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('GET /api/goals/sub-goal/[subGoalId]', () => {
    it('should return a sub-goal when it exists', async () => {
      const mockSubGoal = {
        id: 'subgoal1',
        name: 'Test SubGoal',
        description: 'Test Description',
        userId: 'user_placeholder',
        parentGoalId: 'goal1',
      };

      (prisma.goal.findUnique as any).mockResolvedValue(mockSubGoal);

      const request = createMockRequest();
      const response = await getSubGoal(request, { params: { subGoalId: 'subgoal1' } });
      const data = await response.json();

      expect(prisma.goal.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'subgoal1',
          userId: 'user_placeholder',
          parentGoalId: { not: null },
        },
        include: expect.any(Object),
      });
      expect(data.success).toBe(true);
      expect(data.subGoal).toEqual(mockSubGoal);
    });

    it('should return 404 when sub-goal does not exist', async () => {
      (prisma.goal.findUnique as any).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await getSubGoal(request, { params: { subGoalId: 'nonexistent' } });
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toBe('Sub-goal not found');
      expect(response.status).toBe(404);
    });
  });

  describe('GET /api/goals/sub-goal/all', () => {
    it('should return all sub-goals for the user', async () => {
      const mockSubGoals = [
        { id: 'subgoal1', name: 'SubGoal 1', userId: 'user_placeholder', parentGoalId: 'goal1' },
        { id: 'subgoal2', name: 'SubGoal 2', userId: 'user_placeholder', parentGoalId: 'goal2' },
      ];

      (prisma.goal.findMany as any).mockResolvedValue(mockSubGoals);

      const request = createMockRequestWithUrl('http://localhost:3000/api/goals/sub-goal/all');
      const response = await getAllSubGoals(request);
      const data = await response.json();

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: { 
          userId: 'user_placeholder',
          parentGoalId: { not: null }
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(data.success).toBe(true);
      expect(data.subGoals).toEqual(mockSubGoals);
    });

    it('should filter sub-goals by parentGoalId when provided', async () => {
      const mockSubGoals = [
        { id: 'subgoal1', name: 'SubGoal 1', userId: 'user_placeholder', parentGoalId: 'goal1' },
      ];

      (prisma.goal.findMany as any).mockResolvedValue(mockSubGoals);

      const request = createMockRequestWithUrl('http://localhost:3000/api/goals/sub-goal/all?parentGoalId=goal1');
      const response = await getAllSubGoals(request);
      const data = await response.json();

      expect(prisma.goal.findMany).toHaveBeenCalledWith({
        where: { 
          userId: 'user_placeholder',
          parentGoalId: { not: null },
          parentGoalId: 'goal1'
        },
        include: expect.any(Object),
        orderBy: { createdAt: 'desc' },
      });
      expect(data.success).toBe(true);
      expect(data.subGoals).toEqual(mockSubGoals);
    });
  });

  describe('POST /api/goals/sub-goal', () => {
    it('should create a new sub-goal', async () => {
      const subGoalData = {
        name: 'New SubGoal',
        description: 'SubGoal Description',
        parentGoalId: 'goal1',
      };

      const mockParentGoal = {
        id: 'goal1',
        name: 'Parent Goal',
        categoryId: 'category1',
        timeframe: 'This Quarter',
      };

      const mockSubGoal = {
        id: 'subgoal1',
        ...subGoalData,
        categoryId: 'category1',
        timeframe: 'This Quarter',
        userId: 'user_placeholder',
      };

      (prisma.goal.findUnique as any).mockResolvedValue(mockParentGoal);
      (prisma.goal.create as any).mockResolvedValue(mockSubGoal);

      const request = createMockRequest(subGoalData);
      const response = await createSubGoal(request);
      const data = await response.json();

      expect(prisma.goal.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'goal1',
          userId: 'user_placeholder',
        },
      });
      expect(prisma.goal.create).toHaveBeenCalledWith({
        data: expect.objectContaining({
          name: 'New SubGoal',
          description: 'SubGoal Description',
          parentGoalId: 'goal1',
          categoryId: 'category1',
          timeframe: 'This Quarter',
          userId: 'user_placeholder',
        }),
      });
      expect(data.success).toBe(true);
      expect(data.subGoal).toEqual(mockSubGoal);
    });

    it('should return 404 when parent goal does not exist', async () => {
      const subGoalData = {
        name: 'New SubGoal',
        description: 'SubGoal Description',
        parentGoalId: 'nonexistent',
      };

      (prisma.goal.findUnique as any).mockResolvedValue(null);

      const request = createMockRequest(subGoalData);
      const response = await createSubGoal(request);
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toBe('Parent goal not found.');
      expect(response.status).toBe(404);
    });
  });

  describe('PATCH /api/goals/sub-goal/[subGoalId]', () => {
    it('should update a sub-goal', async () => {
      const subGoalData = {
        name: 'Updated SubGoal',
        description: 'Updated Description',
      };

      const mockSubGoal = {
        id: 'subgoal1',
        name: 'Original SubGoal',
        description: 'Original Description',
        userId: 'user_placeholder',
        parentGoalId: 'goal1',
      };

      const updatedSubGoal = {
        ...mockSubGoal,
        ...subGoalData,
      };

      (prisma.goal.findUnique as any).mockResolvedValue(mockSubGoal);
      (prisma.goal.update as any).mockResolvedValue(updatedSubGoal);

      const request = createMockRequest(subGoalData);
      const response = await updateSubGoal(request, { params: { subGoalId: 'subgoal1' } });
      const data = await response.json();

      expect(prisma.goal.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'subgoal1',
          userId: 'user_placeholder',
          parentGoalId: { not: null },
        },
      });
      expect(prisma.goal.update).toHaveBeenCalledWith({
        where: {
          id: 'subgoal1',
        },
        data: subGoalData,
        include: expect.any(Object),
      });
      expect(data.success).toBe(true);
      expect(data.subGoal).toEqual(updatedSubGoal);
    });

    it('should return 404 when sub-goal does not exist', async () => {
      (prisma.goal.findUnique as any).mockResolvedValue(null);

      const request = createMockRequest({ name: 'Updated SubGoal' });
      const response = await updateSubGoal(request, { params: { subGoalId: 'nonexistent' } });
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toBe('Sub-goal not found');
      expect(response.status).toBe(404);
    });
  });

  describe('DELETE /api/goals/sub-goal/[subGoalId]', () => {
    it('should delete a sub-goal', async () => {
      const mockSubGoal = {
        id: 'subgoal1',
        name: 'SubGoal to Delete',
        userId: 'user_placeholder',
        parentGoalId: 'goal1',
      };

      (prisma.goal.findUnique as any).mockResolvedValue(mockSubGoal);
      (prisma.goal.delete as any).mockResolvedValue(mockSubGoal);

      const request = createMockRequest();
      const response = await deleteSubGoal(request, { params: { subGoalId: 'subgoal1' } });
      const data = await response.json();

      expect(prisma.goal.findUnique).toHaveBeenCalledWith({
        where: {
          id: 'subgoal1',
          userId: 'user_placeholder',
          parentGoalId: { not: null },
        },
      });
      expect(prisma.goal.delete).toHaveBeenCalledWith({
        where: {
          id: 'subgoal1',
        },
      });
      expect(data.success).toBe(true);
      expect(data.message).toBe('Sub-goal deleted successfully');
    });

    it('should return 404 when sub-goal does not exist', async () => {
      (prisma.goal.findUnique as any).mockResolvedValue(null);

      const request = createMockRequest();
      const response = await deleteSubGoal(request, { params: { subGoalId: 'nonexistent' } });
      const data = await response.json();

      expect(data.success).toBe(false);
      expect(data.message).toBe('Sub-goal not found');
      expect(response.status).toBe(404);
    });
  });
});
