'use client';

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Task, Goal, Category } from '@/types/index'; // Corrected import path
import { YearlyStatsResponse, MonthlyGoalStats, YearlyGoalStats } from '@/types/yearly-stats';
import { format, addMonths, isWithinInterval, startOfMonth, endOfMonth, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';

import { ChevronLeft, ChevronRight, BarChart, PieChart } from 'lucide-react';
import { getCategories } from '@/actions/categories';
import { fetchYearlyStats } from '@/services/yearlyStatsService';

interface YearViewProps {
  tasks: Task[];
  goals?: Goal[];
  currentDate: Date;
}

export function YearView({ tasks: originalTasks, goals: originalGoals = [], currentDate }: YearViewProps) {
  const [yearlyStats, setYearlyStats] = useState<YearlyGoalStats | null>(null);
  const [monthlyStats, setMonthlyStats] = useState<MonthlyGoalStats[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [orderedCategories, setOrderedCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedYear, setSelectedYear] = useState<number>(currentDate.getFullYear());

  // Fetch yearly stats and categories when the component mounts or when the selected year changes
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);
      try {
        // Fetch both yearly stats and categories in parallel
        const [statsResponse, categoriesData] = await Promise.all([
          fetchYearlyStats(selectedYear),
          getCategories()
        ]);

        if (statsResponse.success && statsResponse.data) {
          setYearlyStats(statsResponse.data.yearlyStats);
          setMonthlyStats(statsResponse.data.monthlyStats);
        } else {
          setError(statsResponse.message || 'Failed to fetch yearly statistics');
        }

        // Set categories data
        setCategories(categoriesData);
        setOrderedCategories(categoriesData); // Categories are already ordered by the getCategories action
      } catch (err) {
        setError('An error occurred while fetching data');
        console.error('Error fetching data:', err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [selectedYear]);

  // Function to change the selected year
  const changeYear = useCallback((increment: number) => {
    setSelectedYear(prev => prev + increment);
  }, []);

  // Helper function to get category color
  const getCategoryColor = useCallback((categoryName: string): string => {
    const category = orderedCategories.find(cat => cat.name.toLowerCase() === categoryName.toLowerCase());
    return category?.color || '#808080'; // Default gray if category not found
  }, [orderedCategories]);

  // Generate 12 months for the year
  const months = useMemo(() => {
    const yearStart = new Date(selectedYear, 0, 1);
    return Array.from({ length: 12 }, (_, i) => addMonths(yearStart, i));
  }, [selectedYear]);

  // Count tasks for each month
  const getTaskCountForMonth = (month: Date) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);

    return originalTasks.filter(task => { // Use originalTasks prop
      if (!task.dueDate) return false;
      try {
        const dueDate = typeof task.dueDate === 'string' ? parseISO(task.dueDate) : task.dueDate;
        return isWithinInterval(dueDate, { start, end });
      } catch (e) {
        console.error("Error processing task due date:", e, task);
        return false;
      }
    }).length;
  };

  // Count high priority tasks for each month
  const getHighPriorityTaskCountForMonth = (month: Date) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);

    return originalTasks.filter(task => { // Use originalTasks prop
      if (!task.dueDate || task.priority !== 'HIGH') return false; // Corrected case for priority check
      try {
        const dueDate = typeof task.dueDate === 'string' ? parseISO(task.dueDate) : task.dueDate;
        return isWithinInterval(dueDate, { start, end });
      } catch (e) {
        console.error("Error processing task due date:", e, task);
        return false;
      }
    }).length;
  };

  // Get goals for each month
  const getGoalsForMonth = (month: Date) => {
    const start = startOfMonth(month);
    const end = endOfMonth(month);

    return originalGoals.filter(goal => { // Use originalGoals prop
      if (!goal.targetCompletionDate) return false;
      try {
        const deadline = new Date(goal.targetCompletionDate);
        return isWithinInterval(deadline, { start, end });
      } catch (e) {
        console.error("Error processing goal deadline:", e, goal);
        return false;
      }
    });
  };

  // Get top goal for a month
  const getTopGoalForMonth = (month: Date) => {
    const monthGoals = getGoalsForMonth(month);
    if (monthGoals.length === 0) return null;

    // For now, just return the first goal. In a real implementation,
    // you might want to sort by priority or progress
    return monthGoals[0];
  };

  // Get top category for a month
  const getTopCategoryForMonth = (month: Date) => {
    const monthGoals = getGoalsForMonth(month);
    if (monthGoals.length === 0) return null;

    // Count goals by category
    const categoryCounts: Record<string, number> = {};
    monthGoals.forEach(goal => {
      if (goal.category) {
        categoryCounts[goal.category] = (categoryCounts[goal.category] || 0) + 1;
      }
    });

    // Find the category with the most goals
    let topCategory = null;
    let maxCount = 0;

    Object.entries(categoryCounts).forEach(([category, count]) => {
      if (count > maxCount) {
        maxCount = count;
        topCategory = category;
      }
    });

    return topCategory;
  };

  // Render loading state
  if (isLoading) {
    return (
      <div className="h-full flex flex-col space-y-4" data-testid="year-view-loading">
        <div className="flex justify-between items-center">
          <Skeleton className="h-8 w-24" />
          <div className="flex space-x-2">
            <Skeleton className="h-8 w-8" />
            <Skeleton className="h-8 w-8" />
          </div>
        </div>
        <div className="grid grid-cols-3 gap-4 flex-grow">
          {Array.from({ length: 12 }).map((_, i) => (
            <Skeleton key={i} className="h-full w-full" />
          ))}
        </div>
      </div>
    );
  }

  // Render error state
  if (error) {
    return (
      <div className="h-full flex flex-col items-center justify-center" data-testid="year-view-error">
        <div className="text-red-500 mb-4">{error}</div>
        <Button onClick={() => fetchYearlyStats(selectedYear)}>Retry</Button>
      </div>
    );
  }

  // Render yearly overview
  return (
    <div className="absolute inset-0 flex flex-col overflow-hidden" data-testid="year-view">
      {/* Year selector and yearly stats - fixed at top */}
      <div className="flex-shrink-0">
        {/* Header row with year selector and stats */}
        <div className="flex justify-between items-center mb-4 px-4">
          <h2 className="text-lg font-bold">Year Overview: {selectedYear}</h2>
          <div className="flex items-center space-x-6">
            {/* Stats section - now beside the header */}
            {yearlyStats && (
              <div className="flex items-center">
                <div className="flex items-center mr-4">
                  <span className="text-xs text-muted-foreground">Total</span>
                  <span className="text-sm font-bold ml-1">{yearlyStats.totalGoals}</span>
                </div>
                <div className="flex items-center mr-4">
                  <span className="text-xs text-muted-foreground">Completed</span>
                  <span className="text-sm font-bold text-green-600 ml-1">{yearlyStats.completedGoals}</span>
                </div>
                <div className="flex items-center mr-4">
                  <span className="text-xs text-muted-foreground">In Progress</span>
                  <span className="text-sm font-bold text-blue-600 ml-1">{yearlyStats.inProgressGoals}</span>
                </div>
                <div className="flex items-center">
                  <span className="text-xs text-muted-foreground">Not Started</span>
                  <span className="text-sm font-bold text-amber-600 ml-1">{yearlyStats.notStartedGoals}</span>
                </div>
              </div>
            )}
            {/* Year navigation buttons */}
            <div className="flex space-x-2">
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeYear(-1)}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button variant="outline" size="icon" className="h-7 w-7" onClick={() => changeYear(1)}>
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>

        {yearlyStats && (
          <div className="px-4">
            {/* Progress bar - now at the top */}
            <div className="flex items-center mb-3">
              <Badge
                variant="outline"
                className="text-xs w-24 mr-2 rounded-md shrink-0 py-0.5 flex items-center justify-center border-transparent bg-transparent text-muted-foreground uppercase"
              >
                Progress
              </Badge>
              <div className="flex-grow">
                <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                  <div
                    className={`h-2 rounded-full transition-all duration-300 ${
                      yearlyStats.averageProgress < 25 ? 'goal-progress-low' :
                      yearlyStats.averageProgress < 75 ? 'goal-progress-medium' :
                      yearlyStats.averageProgress < 100 ? 'goal-progress-high' :
                      'goal-progress-complete'
                    }`}
                    style={{
                      width: `${yearlyStats.averageProgress}%`,
                      backgroundColor: 'var(--progress-color, hsl(var(--primary)))'
                    }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Invisible border beneath progress bar */}
        <div className="mb-3"></div>
      </div>

      {/* Main content area - sidebar and month cards */}
      <div className="flex-grow flex min-h-0">
        {/* Left sidebar for category progress bars */}
        {yearlyStats && (
          <div className="w-80 flex-shrink-0 px-4 py-2 overflow-y-auto">
            {/* Category progress bars - Single column stacked layout ordered by custom category order */}
            <div className="space-y-1">
              {orderedCategories
                .filter(category => yearlyStats.goalsByCategory[category.name]) // Only show categories that have goals
                .map((category) => {
                  const count = yearlyStats.goalsByCategory[category.name];
                  const percentage = (count / yearlyStats.totalGoals) * 100;

                  return (
                    <div key={category.id} className="flex items-center">
                      <Badge
                        variant="outline"
                        className="text-xs w-24 mr-2 rounded-md border-2 shrink-0 py-0.5"
                        style={{
                          backgroundColor: `${category.color}20`, // 20% opacity for semi-transparent fill
                          borderColor: category.color,
                          color: category.color
                        }}
                      >
                        {category.name}
                      </Badge>
                      <div className="flex-grow">
                        <div className="h-2 bg-primary/20 rounded-full overflow-hidden">
                          <div
                            className={`h-2 rounded-full transition-all duration-300 ${
                              percentage < 25 ? 'goal-progress-low' :
                              percentage < 75 ? 'goal-progress-medium' :
                              percentage < 100 ? 'goal-progress-high' :
                              'goal-progress-complete'
                            }`}
                            style={{
                              width: `${percentage}%`,
                              backgroundColor: 'var(--progress-color, hsl(var(--primary)))'
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  );
                })}
            </div>
          </div>
        )}

        {/* Right side - Monthly cards in 4 rows of 3 columns */}
        <div className="flex-grow overflow-y-auto min-h-0">
          <div className="grid grid-rows-4 grid-cols-3 gap-2 px-2 py-1 h-full">
        {months.map((month) => {
          const monthName = format(month, 'MMMM');
          const monthStat = monthlyStats.find(stat => stat.month === monthName);

          // Determine if this month is current, past, or future
          const now = new Date();
          const isCurrentMonth = month.getMonth() === now.getMonth() && month.getFullYear() === now.getFullYear();
          const isPastMonth = month < new Date(now.getFullYear(), now.getMonth(), 1);

          // Apply appropriate background color based on month status
          const cardBackground = isCurrentMonth
            ? 'bg-purple-100 border-purple-200 dark:bg-purple-900/30 dark:border-purple-800' // Current month: purple with dark mode variant
            : isPastMonth
              ? 'bg-gray-100 border-gray-200 dark:bg-gray-800/20 dark:border-gray-700 dark:opacity-70' // Past month: gray with dark mode variant and reduced opacity
              : 'dark:bg-gray-900/10 dark:border-gray-800'; // Future month: default white with subtle dark mode background

          return (
            <Card
              key={month.toString()}
              className={`shadow-sm hover:shadow transition-shadow ${cardBackground}`}
            >
              <CardHeader className="py-0.5 px-2 flex justify-center">
                <CardTitle className={`text-xs text-center ${
                  isCurrentMonth
                    ? 'text-purple-700 dark:text-purple-300 font-semibold'
                    : isPastMonth
                      ? 'text-gray-700 dark:text-gray-400'
                      : 'dark:text-gray-300'
                }`}>
                  {format(month, 'MMMM yyyy')}
                </CardTitle>
              </CardHeader>
              <CardContent className="p-2 pt-0">
                <div className="space-y-0.5">
                  {/* If we have API data, use it; otherwise, fall back to calculated data */}
                  {monthStat ? (
                    <div className="grid grid-cols-3 gap-0.5 text-xs">
                      <div className="flex flex-col items-center">
                        <span className="text-muted-foreground text-xs">Total</span>
                        <span className="font-medium text-sm">{monthStat.totalGoals}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-green-600 text-xs">Completed</span>
                        <span className="font-medium text-green-600 text-sm">{monthStat.completedGoals}</span>
                      </div>
                      <div className="flex flex-col items-center">
                        <span className="text-muted-foreground text-xs">Tasks</span>
                        <span className="font-medium text-sm">{monthStat.tasksCount}</span>
                      </div>
                    </div>
                  ) : (
                    <div className="grid grid-cols-3 gap-0.5 text-xs">
                      <div className="flex flex-col items-center">
                        <span className="text-muted-foreground text-xs">Tasks</span>
                        <span className="font-medium text-sm">{getTaskCountForMonth(month)}</span>
                      </div>
                      {getHighPriorityTaskCountForMonth(month) > 0 ? (
                        <div className="flex flex-col items-center">
                          <span className="text-amber-600 text-xs">High Priority</span>
                          <span className="font-medium text-amber-600 text-sm">{getHighPriorityTaskCountForMonth(month)}</span>
                        </div>
                      ) : (
                        <div></div>
                      )}
                      <div className="flex flex-col items-center">
                        <span className="text-purple-600 text-xs">Goals</span>
                        <span className="font-medium text-purple-600 text-sm">{getGoalsForMonth(month).length}</span>
                      </div>
                    </div>
                  )}

                  {/* Category distribution bar */}
                  {monthStat && Object.keys(monthStat.categoryDistribution).length > 0 && (
                    <div className="mt-0.5">
                      <div className="h-1.5 bg-primary/20 rounded-full overflow-hidden flex">
                        {Object.entries(monthStat.categoryDistribution).map(([category, count]) => {
                          const categoryColor = getCategoryColor(category);
                          const totalGoals = Object.values(monthStat.categoryDistribution).reduce((sum, c) => sum + c, 0);
                          const width = (count / totalGoals) * 100;
                          return (
                            <div
                              key={category}
                              className="h-1.5 transition-all duration-300"
                              style={{
                                width: `${width}%`,
                                backgroundColor: categoryColor
                              }}
                              title={`${category}: ${count} goals`}
                            />
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          );
        })}
          </div>
        </div>
      </div>
    </div>
  );
}

export default React.memo(YearView);
