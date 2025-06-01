// src/tests/yearly-stats-api.test.ts
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GET as getYearlyStats } from '@/app/api/goals/yearly-stats/route';

// Mock the prisma client
vi.mock('@/lib/prisma', () => ({
  prisma: {
    goal: {
      findMany: vi.fn(),
    },
  },
}));

describe('Yearly Stats API', () => {
  beforeEach(() => {
    vi.resetAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should return yearly statistics', async () => {
    // Mock the goals data
    const mockGoals = [
      {
        id: 'goal1',
        name: 'Test Goal 1',
        userId: 'user_placeholder',
        progress: 100,
        category: { id: 'cat1', name: 'Work' },
        tasks: [],
        progressSnapshots: [],
        _count: { subGoals: 0, tasks: 0 },
      },
      {
        id: 'goal2',
        name: 'Test Goal 2',
        userId: 'user_placeholder',
        progress: 50,
        category: { id: 'cat2', name: 'Learning' },
        tasks: [],
        progressSnapshots: [],
        _count: { subGoals: 0, tasks: 0 },
      },
      {
        id: 'goal3',
        name: 'Test Goal 3',
        userId: 'user_placeholder',
        progress: 0,
        category: { id: 'cat1', name: 'Work' },
        tasks: [],
        progressSnapshots: [],
        _count: { subGoals: 0, tasks: 0 },
      },
    ];

    // Mock the findMany response
    (prisma.goal.findMany as any).mockResolvedValueOnce(mockGoals);

    // Create a mock request with the current year
    const currentYear = new Date().getFullYear();
    const mockRequest = {
      url: `http://localhost:3000/api/goals/yearly-stats?year=${currentYear}`,
    } as NextRequest;

    // Call the function
    const response = await getYearlyStats(mockRequest);
    const responseData = await response.json();

    // Check the response
    expect(responseData.success).toBe(true);
    expect(responseData.data).toBeDefined();
    
    // Check yearly stats
    const { yearlyStats } = responseData.data;
    expect(yearlyStats.totalGoals).toBe(3);
    expect(yearlyStats.completedGoals).toBe(1);
    expect(yearlyStats.inProgressGoals).toBe(1);
    expect(yearlyStats.notStartedGoals).toBe(1);
    expect(yearlyStats.averageProgress).toBe(50);
    expect(yearlyStats.goalsByCategory).toEqual({ Work: 2, Learning: 1 });
    
    // Check that monthly stats array exists
    expect(responseData.data.monthlyStats).toBeInstanceOf(Array);
    expect(responseData.data.monthlyStats.length).toBe(12); // One for each month
  });

  it('should handle errors gracefully', async () => {
    // Mock an error
    (prisma.goal.findMany as any).mockRejectedValueOnce(new Error('Database error'));

    // Create a mock request
    const mockRequest = {
      url: 'http://localhost:3000/api/goals/yearly-stats',
    } as NextRequest;

    // Call the function
    const response = await getYearlyStats(mockRequest);
    const responseData = await response.json();

    // Check the response
    expect(responseData.success).toBe(false);
    expect(responseData.message).toContain('Failed to fetch yearly goal statistics');
  });
});
