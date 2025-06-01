import { YearlyStatsResponse } from '@/types/yearly-stats';

/**
 * Fetches yearly goal statistics from the API
 * @param year Optional year to fetch statistics for (defaults to current year)
 * @returns Promise with the yearly statistics data
 */
export async function fetchYearlyStats(year?: number): Promise<YearlyStatsResponse> {
  try {
    const queryParams = year ? `?year=${year}` : '';
    const response = await fetch(`/api/goals/yearly-stats${queryParams}`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (!response.ok) {
      throw new Error(`Error fetching yearly stats: ${response.statusText}`);
    }

    return await response.json();
  } catch (error) {
    console.error('Error in fetchYearlyStats:', error);
    return {
      success: false,
      message: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
}
