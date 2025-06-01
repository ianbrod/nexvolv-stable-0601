/**
 * Interface for monthly goal statistics
 */
export interface MonthlyGoalStats {
  month: string;
  totalGoals: number;
  completedGoals: number;
  tasksCount: number;
  categoryDistribution: Record<string, number>;
}

/**
 * Interface for yearly goal statistics
 */
export interface YearlyGoalStats {
  totalGoals: number;
  completedGoals: number;
  inProgressGoals: number;
  notStartedGoals: number;
  averageProgress: number;
  goalsByCategory: Record<string, number>;
}

/**
 * Interface for the complete yearly statistics response
 */
export interface YearlyStatsResponse {
  success: boolean;
  data?: {
    yearlyStats: YearlyGoalStats;
    monthlyStats: MonthlyGoalStats[];
  };
  message?: string;
}
