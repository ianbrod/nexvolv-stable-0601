'use server';

import { prisma } from '@/lib/prisma';
import { Category, Goal } from '@/types';
import { PLACEHOLDER_USER_ID } from '@/lib/auth-placeholder';

/**
 * Fetch categories and goals for the reminder form
 * @returns Object containing categories and goals
 */
export async function getGoalsAndTasks(): Promise<{
  success: boolean;
  categories: Category[];
  goals: Goal[];
  error?: string;
}> {
  try {
    // Use placeholder user ID for development
    const userId = PLACEHOLDER_USER_ID;

    console.log('Fetching categories and goals for user:', userId);

    // Fetch categories and goals concurrently
    const [categories, goals] = await Promise.all([
      // Fetch all categories
      prisma.category.findMany({
        where: {
          userId
        },
        orderBy: { order: 'asc' },
        select: {
          id: true,
          name: true,
          color: true,
          order: true
        }
      }),

      // Fetch all non-archived, non-completed goals with category relationship
      prisma.goal.findMany({
        where: {
          userId,
          isArchived: false,
          progress: { lt: 100 } // Exclude completed goals (they go to wins page)
        },
        orderBy: { order: 'asc' }, // Order by the order field to match Goals page
        select: {
          id: true,
          name: true,
          categoryId: true,
          parentGoalId: true,
          order: true, // Include order field for sorting in the UI
          category: {
            select: {
              id: true,
              name: true,
              color: true
            }
          }
        }
      })
    ]);

    console.log('Retrieved categories:', categories.length);
    console.log('Retrieved goals:', goals.length);

    return {
      success: true,
      categories,
      goals,
    };
  } catch (error) {
    console.error('Error fetching categories and goals:', error);
    return {
      success: false,
      error: 'Failed to fetch categories and goals',
      categories: [],
      goals: [],
    };
  }
}
