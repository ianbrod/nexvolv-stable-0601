'use server';

import { prisma } from '@/lib/prisma';
import { Task, Goal } from '@prisma/client';

/**
 * Server action to fetch tasks for a specific goal and its sub-goals
 * @param goalId The ID of the goal to fetch tasks for
 * @returns An object containing the tasks and any sub-goals
 */
export async function getTasksForGoal(goalId: string): Promise<{
  tasks: Task[];
  subGoals: Goal[];
}> {
  try {
    // Fetch the goal to ensure it exists
    const goal = await prisma.goal.findUnique({
      where: { id: goalId },
      include: {
        tasks: true,
        category: true,
      },
    });

    if (!goal) {
      console.error(`Goal with ID ${goalId} not found`);
      return { tasks: [], subGoals: [] };
    }

    // Fetch sub-goals
    const subGoals = await prisma.goal.findMany({
      where: { parentGoalId: goalId },
      include: {
        tasks: true,
        category: true,
      },
    });

    // Collect all sub-goal IDs
    const subGoalIds = subGoals.map(sg => sg.id);

    // Fetch all tasks for the goal and its sub-goals
    const tasks = await prisma.task.findMany({
      where: {
        OR: [
          { goalId },
          { goalId: { in: subGoalIds } },
        ],
      },
      include: {
        goal: {
          include: {
            category: true,
          },
        },
      },
    });

    console.log(`[getTasksForGoal] Found ${tasks.length} tasks for goal ${goalId} and its ${subGoals.length} sub-goals`);

    return {
      tasks,
      subGoals,
    };
  } catch (error) {
    console.error('Error fetching tasks for goal:', error);
    return { tasks: [], subGoals: [] };
  }
}
