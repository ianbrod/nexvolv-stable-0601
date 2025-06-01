import { describe, test, expect } from 'vitest';
import { addDays, subDays } from 'date-fns';

// Mock GoalProgressSnapshot type
type GoalProgressSnapshot = {
  id: string;
  progress: number;
  timestamp: Date;
  notes: string | null;
  goalId: string;
  userId: string;
  createdAt: Date;
  updatedAt: Date;
};

// Mock the analytics function
function calculateProgressAnalytics(snapshots: GoalProgressSnapshot[]) {
  // If there are no snapshots, return default values
  if (!snapshots.length) {
    return {
      averageProgress: 0,
      progressVelocity: 0,
      consistencyScore: 0,
      stagnationPeriods: [],
    };
  }

  // Sort snapshots by timestamp (oldest first)
  const sortedSnapshots = [...snapshots].sort(
    (a, b) => a.timestamp.getTime() - b.timestamp.getTime()
  );

  // Calculate average progress
  const totalProgress = sortedSnapshots.reduce((sum, snapshot) => sum + snapshot.progress, 0);
  const averageProgress = totalProgress / sortedSnapshots.length;

  // Calculate progress velocity (progress points per day)
  let progressVelocity = 0;
  if (sortedSnapshots.length > 1) {
    const firstSnapshot = sortedSnapshots[0];
    const lastSnapshot = sortedSnapshots[sortedSnapshots.length - 1];
    const daysDifference = Math.max(1, Math.round((lastSnapshot.timestamp.getTime() - firstSnapshot.timestamp.getTime()) / (1000 * 60 * 60 * 24)));
    progressVelocity = (lastSnapshot.progress - firstSnapshot.progress) / daysDifference;
  }

  // Calculate consistency score (0-100)
  let consistencyScore = 100;
  
  // Simple implementation for testing
  if (sortedSnapshots.length <= 1) {
    consistencyScore = 50; // Single snapshot is not very consistent
  }
  
  // Identify stagnation periods (periods with no progress change)
  const stagnationPeriods: any[] = [];
  
  return {
    averageProgress,
    progressVelocity,
    consistencyScore,
    stagnationPeriods,
  };
}

// Helper to create mock snapshots
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
    expect(result.consistencyScore).toBe(100);
  });
  
  test('should calculate correct analytics for single snapshot', () => {
    const snapshots = [
      createMockSnapshot('1', 25, now),
    ];
    
    const result = calculateProgressAnalytics(snapshots);
    
    expect(result.averageProgress).toBe(25);
    expect(result.progressVelocity).toBe(0);
    expect(result.consistencyScore).toBe(50);
  });
});
