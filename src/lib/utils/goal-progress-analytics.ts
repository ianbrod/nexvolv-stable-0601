/**
 * Utility functions for analyzing goal progress history
 */
import { GoalProgressSnapshot } from '@prisma/client';
import { differenceInDays, addDays } from 'date-fns';
import { GoalProgressAnalytics } from '@/types/goal-progress';

/**
 * Calculate analytics based on goal progress history
 * 
 * @param snapshots Array of goal progress snapshots
 * @returns Object containing analytics data
 */
export function calculateProgressAnalytics(
  snapshots: GoalProgressSnapshot[]
): GoalProgressAnalytics {
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
    const daysDifference = differenceInDays(lastSnapshot.timestamp, firstSnapshot.timestamp) || 1; // Avoid division by zero
    progressVelocity = (lastSnapshot.progress - firstSnapshot.progress) / daysDifference;
  }

  // Estimate completion date (if not already completed)
  let estimatedCompletionDate: Date | undefined;
  const latestSnapshot = sortedSnapshots[sortedSnapshots.length - 1];
  if (latestSnapshot.progress < 100 && progressVelocity > 0) {
    const remainingProgress = 100 - latestSnapshot.progress;
    const daysToCompletion = Math.ceil(remainingProgress / progressVelocity);
    estimatedCompletionDate = addDays(latestSnapshot.timestamp, daysToCompletion);
  }

  // Identify stagnation periods (periods with no progress change)
  const stagnationPeriods = [];
  let stagnationStart: Date | null = null;

  for (let i = 1; i < sortedSnapshots.length; i++) {
    const prevSnapshot = sortedSnapshots[i - 1];
    const currSnapshot = sortedSnapshots[i];
    const daysBetween = differenceInDays(currSnapshot.timestamp, prevSnapshot.timestamp);
    
    // If progress hasn't changed and it's been more than 7 days
    if (currSnapshot.progress === prevSnapshot.progress && daysBetween > 7) {
      if (!stagnationStart) {
        stagnationStart = prevSnapshot.timestamp;
      }
    } else if (stagnationStart) {
      // End of stagnation period
      stagnationPeriods.push({
        startDate: stagnationStart,
        endDate: prevSnapshot.timestamp,
        duration: differenceInDays(prevSnapshot.timestamp, stagnationStart),
      });
      stagnationStart = null;
    }
  }

  // Add the last stagnation period if it's still ongoing
  if (stagnationStart) {
    stagnationPeriods.push({
      startDate: stagnationStart,
      endDate: latestSnapshot.timestamp,
      duration: differenceInDays(latestSnapshot.timestamp, stagnationStart),
    });
  }

  // Calculate consistency score (0-100)
  // Based on regular updates and steady progress
  let consistencyScore = 100;
  
  // Penalize for stagnation periods
  consistencyScore -= stagnationPeriods.length * 10;
  
  // Penalize for irregular update intervals
  if (sortedSnapshots.length > 2) {
    const intervals = [];
    for (let i = 1; i < sortedSnapshots.length; i++) {
      intervals.push(
        differenceInDays(sortedSnapshots[i].timestamp, sortedSnapshots[i - 1].timestamp)
      );
    }
    
    // Calculate standard deviation of intervals
    const avgInterval = intervals.reduce((sum, interval) => sum + interval, 0) / intervals.length;
    const variance = intervals.reduce((sum, interval) => sum + Math.pow(interval - avgInterval, 2), 0) / intervals.length;
    const stdDev = Math.sqrt(variance);
    
    // Penalize based on standard deviation (higher std dev = less consistent)
    consistencyScore -= Math.min(50, stdDev * 2);
  }
  
  // Ensure score is between 0 and 100
  consistencyScore = Math.max(0, Math.min(100, consistencyScore));

  return {
    averageProgress,
    progressVelocity,
    estimatedCompletionDate,
    consistencyScore,
    stagnationPeriods,
  };
}
