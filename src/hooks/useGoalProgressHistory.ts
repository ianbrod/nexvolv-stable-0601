'use client';

import { useState, useEffect } from 'react';
import { subDays, subMonths, subYears } from 'date-fns';
import { getGoalProgressHistory } from '@/actions/getGoalProgressHistory';
import { GoalProgressSnapshotData } from '@/types/goal-progress';
import { TimeRange, formatChartTooltipDate, dateToTimestamp } from '@/lib/utils/date-formatting';
import { normalizeProgressData } from '@/lib/utils/chart-validation';

/**
 * Custom hook for managing goal progress history data
 * @param goalId The ID of the goal to fetch progress history for
 * @returns An object containing progress history data and functions to manage it
 */
export function useGoalProgressHistory(goalId: string) {
  // State for progress history data
  const [progressData, setProgressData] = useState<GoalProgressSnapshotData[]>([]);
  // State for selected time range
  const [timeRange, setTimeRange] = useState<TimeRange>('month');
  // Loading state
  const [isLoading, setIsLoading] = useState(true);
  // Error state
  const [error, setError] = useState<string | null>(null);
  // State for current progress
  const [currentProgress, setCurrentProgress] = useState(0);

  // Fetch progress history data
  useEffect(() => {
    async function fetchProgressHistory() {
      setIsLoading(true);
      setError(null);

      try {
        // Calculate date range based on selected time range
        let startDate: Date | undefined;
        const now = new Date();

        switch (timeRange) {
          case 'week':
            startDate = subDays(now, 7);
            break;
          case 'month':
            startDate = subMonths(now, 1);
            break;
          case 'year':
            startDate = subYears(now, 1);
            break;
          case 'all':
            startDate = undefined;
            break;
        }

        // Fetch progress history data
        const result = await getGoalProgressHistory({
          goalId,
          startDate,
          limit: 100, // Reasonable limit for visualization
        });

        if (result.success && result.data) {
          const data = result.data as GoalProgressSnapshotData[];
          setProgressData(data);

          // Set current progress from the most recent snapshot or default to 0
          if (data.length > 0) {
            // Sort by timestamp to find the most recent
            const sortedData = [...data].sort((a, b) =>
              new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
            );
            setCurrentProgress(sortedData[0].progress);
          } else {
            setCurrentProgress(0);
          }
        } else {
          setError(result.message || 'Failed to fetch progress history');
        }
      } catch (err) {
        setError('An error occurred while fetching progress history');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    }

    fetchProgressHistory();
  }, [goalId, timeRange]);

  // Preprocess data to ensure consistent date handling and validation
  const rawData = progressData.map(snapshot => ({
    date: snapshot.timestamp,
    progress: snapshot.progress,
    notes: snapshot.notes || '',
  }));

  // Use our validation utility to normalize the data
  const formattedData = normalizeProgressData(rawData).map(point => ({
    ...point,
    // Add formatted date for tooltip display
    formattedDate: formatChartTooltipDate(point.date)
  }));

  return {
    progressData: formattedData,
    currentProgress,
    timeRange,
    setTimeRange,
    isLoading,
    error,
  };
}
