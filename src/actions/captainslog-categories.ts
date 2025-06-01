'use server';

import { prisma } from '@/lib/prisma';
import { Category, Goal } from '@/types';
import { getUserId } from '@/lib/auth-placeholder';

/**
 * Fetch categories from the database for use in Captain's Log
 * @returns Object containing success status and categories data
 */
export async function getCategoriesForCaptainsLog(): Promise<{
  success: boolean;
  data?: Category[];
  error?: string
}> {
  try {
    // Get the user ID
    const userId = await getUserId();

    // Fetch all categories for the user
    const categories = await prisma.category.findMany({
      where: { userId },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    });

    // Map Prisma categories to our Category type
    const mappedCategories: Category[] = categories.map(category => ({
      id: category.id,
      name: category.name,
      color: category.color,
      createdAt: category.createdAt
    }));

    return {
      success: true,
      data: mappedCategories
    };
  } catch (error) {
    console.error("Error fetching categories for Captain's Log:", error);
    return {
      success: false,
      error: "Failed to fetch categories"
    };
  }
}

/**
 * Fetch goals for a specific category
 * @param categoryId The ID of the category to fetch goals for
 * @returns Object containing success status and goals data
 */
export async function getGoalsForCategory(categoryId: string): Promise<{
  success: boolean;
  data?: Goal[];
  error?: string
}> {
  try {
    // Get the user ID
    const userId = await getUserId();

    // Fetch goals for the specified category
    const goals = await prisma.goal.findMany({
      where: {
        userId,
        categoryId,
        isArchived: false // Only include active goals
      },
      orderBy: [
        { order: 'asc' },
        { name: 'asc' }
      ]
    });

    // Map Prisma goals to our Goal type
    const mappedGoals: Goal[] = goals.map(goal => ({
      id: goal.id,
      name: goal.name,
      description: goal.description,
      category: goal.categoryId || undefined,
      parentGoalId: goal.parentGoalId || undefined,
      createdAt: goal.createdAt
    }));

    return {
      success: true,
      data: mappedGoals
    };
  } catch (error) {
    console.error("Error fetching goals for category:", error);
    return {
      success: false,
      error: "Failed to fetch goals for category"
    };
  }
}
