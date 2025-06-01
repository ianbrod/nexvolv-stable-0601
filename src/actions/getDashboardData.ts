// src/actions/getDashboardData.ts
'use server';

import { TaskStatus, Task as PrismaTask, Goal as PrismaGoal, Category as PrismaCategory } from '@prisma/client'; // Import Task and Category too
// import { auth } from '@/lib/auth'; // Assuming you have auth setup - TEMPORARILY REMOVED

// Import the shared Prisma instance instead of creating a new one
import { prisma } from '@/lib/prisma';

// Define return type explicitly
// Define Goal type with _count and category
type GoalWithSubgoalCount = PrismaGoal & {
  _count?: {
    subGoals: number;
  };
  category?: PrismaCategory | null;
};

// Define Task type with optional nested Goal and Category
type TaskWithGoalAndCategory = PrismaTask & {
  goal?: (PrismaGoal & {
    category?: PrismaCategory | null;
  }) | null;
};

interface DashboardData {
  tasks: TaskWithGoalAndCategory[]; // Use the extended Task type
  goals: GoalWithSubgoalCount[]; // Use the extended Goal type
}

export async function getDashboardData(): Promise<DashboardData> {
  // const session = await auth();
  // const userId = session?.user?.id;
  const userId = 'user_placeholder'; // TEMPORARY: Use placeholder ID for seeding/testing

  // if (!userId) {
  //   console.error('getDashboardData: User not authenticated');
  //   return { tasks: [], goals: [] }; // Return empty arrays if not authenticated
  // }

  try {
    console.log(`getDashboardData: Fetching data for user ${userId}`);

    // Test database connection
    try {
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
      });
      console.log(`User exists check: ${!!userExists}`, userExists);
    } catch (dbError) {
      console.error('Database connection test failed:', dbError);
    }

    const tasks = await prisma.task.findMany({
      where: {
        userId: userId,
        status: {
          not: TaskStatus.ARCHIVED, // Exclude archived tasks
        },
      }, // End of where clause for tasks
      orderBy: {
        dueDate: 'asc', // Or desired sorting
      },
      include: { // Include related goal and its category
        goal: {
          include: {
            category: true,
          },
        },
      },
    });
    console.log('Tasks query result:', JSON.stringify(tasks, null, 2).substring(0, 200) + '...');

    const goals = await prisma.goal.findMany({
      where: {
        userId: userId,
        progress: { lt: 100 }, // Exclude completed goals (they go to wins page)
        isArchived: false, // Exclude archived goals
      },
       orderBy: {
        deadline: 'asc', // Or desired sorting
      },
      include: { // Add include to goals query
        _count: {
          select: { subGoals: true },
        },
        category: true, // Include the category information
      },
    });
    console.log('Goals query result:', JSON.stringify(goals, null, 2).substring(0, 200) + '...');

    console.log(`getDashboardData: Found ${tasks.length} tasks and ${goals.length} goals (with subgoal counts) for user ${userId}`);

    // Ensure we're returning a properly structured object
    const result = {
      tasks: tasks as TaskWithGoalAndCategory[],
      goals
    };
    console.log('Returning result structure:', Object.keys(result));
    return result;
  } catch (error) {
    console.error('Error fetching dashboard data:', error);
    // Create a properly structured empty result
    const emptyResult = { tasks: [], goals: [] };
    console.log('Returning empty result due to error:', Object.keys(emptyResult));
    return emptyResult; // Return empty on error
  }
}