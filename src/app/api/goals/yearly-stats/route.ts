import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { startOfYear, endOfYear, eachMonthOfInterval, format, startOfMonth, endOfMonth } from 'date-fns';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

/**
 * GET /api/goals/yearly-stats
 * 
 * Retrieves aggregated yearly statistics for goals
 * 
 * Query parameters:
 * - year: Optional. The year to get statistics for. Defaults to current year.
 * 
 * Returns:
 * - yearlyStats: Object containing aggregated statistics for the year
 * - monthlyStats: Array of objects containing statistics for each month
 */
export async function GET(request: NextRequest) {
  try {
    // Get the user ID
    const userId = await getUserId();
    
    // Get the year from query parameters, default to current year
    const url = new URL(request.url);
    const yearParam = url.searchParams.get('year');
    const year = yearParam ? parseInt(yearParam) : new Date().getFullYear();
    
    // Define the start and end of the year
    const yearStart = startOfYear(new Date(year, 0, 1));
    const yearEnd = endOfYear(new Date(year, 0, 1));
    
    // Get all months in the year
    const months = eachMonthOfInterval({ start: yearStart, end: yearEnd });
    
    // Fetch all goals for the user within the year
    const goals = await prisma.goal.findMany({
      where: {
        userId,
        OR: [
          // Goals created within the year
          { createdAt: { gte: yearStart, lte: yearEnd } },
          // Goals with deadline within the year
          { deadline: { gte: yearStart, lte: yearEnd } }
        ]
      },
      include: {
        category: true,
        tasks: {
          where: {
            OR: [
              // Tasks created within the year
              { createdAt: { gte: yearStart, lte: yearEnd } },
              // Tasks with due date within the year
              { dueDate: { gte: yearStart, lte: yearEnd } }
            ]
          }
        },
        progressSnapshots: {
          where: {
            createdAt: { gte: yearStart, lte: yearEnd }
          },
          orderBy: { createdAt: 'asc' }
        },
        _count: {
          select: {
            subGoals: true,
            tasks: true
          }
        }
      }
    });
    
    // Calculate yearly statistics
    const completedGoals = goals.filter(goal => goal.progress === 100);
    const inProgressGoals = goals.filter(goal => goal.progress > 0 && goal.progress < 100);
    const notStartedGoals = goals.filter(goal => goal.progress === 0);
    
    // Group goals by category
    const goalsByCategory: Record<string, number> = {};
    goals.forEach(goal => {
      if (goal.category) {
        const categoryName = goal.category.name;
        goalsByCategory[categoryName] = (goalsByCategory[categoryName] || 0) + 1;
      }
    });
    
    // Calculate average progress across all goals
    const averageProgress = goals.length > 0
      ? goals.reduce((sum, goal) => sum + goal.progress, 0) / goals.length
      : 0;
    
    // Calculate monthly statistics
    const monthlyStats = months.map(month => {
      const monthStart = startOfMonth(month);
      const monthEnd = endOfMonth(month);
      const monthName = format(month, 'MMMM');
      
      // Goals with deadline in this month
      const monthGoals = goals.filter(goal => 
        goal.deadline && goal.deadline >= monthStart && goal.deadline <= monthEnd
      );
      
      // Goals completed in this month (based on progress snapshots)
      const completedInMonth = goals.filter(goal => 
        goal.progressSnapshots.some(snapshot => 
          snapshot.progress === 100 && 
          snapshot.createdAt >= monthStart && 
          snapshot.createdAt <= monthEnd
        )
      );
      
      // Tasks due in this month
      const monthTasks = goals.flatMap(goal => 
        goal.tasks.filter(task => 
          task.dueDate && task.dueDate >= monthStart && task.dueDate <= monthEnd
        )
      );
      
      // Calculate category distribution for the month
      const categoryDistribution: Record<string, number> = {};
      monthGoals.forEach(goal => {
        if (goal.category) {
          const categoryName = goal.category.name;
          categoryDistribution[categoryName] = (categoryDistribution[categoryName] || 0) + 1;
        }
      });
      
      return {
        month: monthName,
        totalGoals: monthGoals.length,
        completedGoals: completedInMonth.length,
        tasksCount: monthTasks.length,
        categoryDistribution
      };
    });
    
    // Return the statistics
    return NextResponse.json({
      success: true,
      data: {
        yearlyStats: {
          totalGoals: goals.length,
          completedGoals: completedGoals.length,
          inProgressGoals: inProgressGoals.length,
          notStartedGoals: notStartedGoals.length,
          averageProgress,
          goalsByCategory
        },
        monthlyStats
      }
    });
  } catch (error) {
    console.error("Error fetching yearly goal statistics:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to fetch yearly goal statistics." },
      { status: 500 }
    );
  }
}
