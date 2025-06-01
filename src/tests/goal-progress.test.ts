import { calculateProgressAnalytics } from '@/lib/utils/goal-progress-analytics';
import { GoalProgressSnapshot } from '@prisma/client';
import { addDays, subDays } from 'date-fns';

// Mock data for testing
const createMockSnapshot = (
  id: string,
  progress: number,
  timestamp: Date
): GoalProgressSnapshot => ({
  id,
  progress,
  timestamp,
  notes: null,
  goalId: 'goal1',
  userId: 'user1',
  createdAt: new Date(),
  updatedAt: new Date(),
});

describe('Goal Progress Analytics', () => {
  const now = new Date();

  test('should calculate correct analytics for empty snapshots', () => {
    const result = calculateProgressAnalytics([]);

    expect(result.averageProgress).toBe(0);
    expect(result.progressVelocity).toBe(0);
    expect(result.consistencyScore).toBe(0);
    expect(result.stagnationPeriods).toHaveLength(0);
    expect(result.estimatedCompletionDate).toBeUndefined();
  });

  test('should calculate correct analytics for steady progress', () => {
    const snapshots = [
      createMockSnapshot('1', 0, subDays(now, 30)),
      createMockSnapshot('2', 25, subDays(now, 20)),
      createMockSnapshot('3', 50, subDays(now, 10)),
      createMockSnapshot('4', 75, now),
    ];

    const result = calculateProgressAnalytics(snapshots);

    expect(result.averageProgress).toBe(37.5); // (0+25+50+75)/4
    expect(result.progressVelocity).toBe(2.5); // 75 points over 30 days

    // Should have estimated completion date in 10 days (25 points left at 2.5 points/day)
    if (result.estimatedCompletionDate) {
      const expectedDate = addDays(now, 10);
      expect(result.estimatedCompletionDate.getDate()).toBe(expectedDate.getDate());
    }

    // Should have high consistency score (steady progress)
    expect(result.consistencyScore).toBeGreaterThan(70);

    // Should have no stagnation periods
    expect(result.stagnationPeriods).toHaveLength(0);
  });

  test('should identify stagnation periods', () => {
    const snapshots = [
      createMockSnapshot('1', 25, subDays(now, 40)),
      createMockSnapshot('2', 25, subDays(now, 30)), // No change for 10 days
      createMockSnapshot('3', 25, subDays(now, 20)), // Still no change
      createMockSnapshot('4', 50, subDays(now, 10)),
      createMockSnapshot('5', 75, now),
    ];

    const result = calculateProgressAnalytics(snapshots);

    // Should identify one stagnation period
    expect(result.stagnationPeriods).toHaveLength(1);
    expect(result.stagnationPeriods[0].duration).toBe(20); // 20 days of stagnation

    // Should have lower consistency score due to stagnation
    expect(result.consistencyScore).toBeLessThan(100);
  });
});
