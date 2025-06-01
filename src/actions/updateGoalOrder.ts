'use server';

import { revalidatePath } from 'next/cache';
import { prisma } from '@/lib/prisma';

/**
 * Get the current user ID (temporary implementation)
 */
const getUserId = async (): Promise<string> => {
  // In a real app, fetch user session here
  return "user_placeholder";
};

/**
 * Update the order of goals
 * @param goals Array of goal IDs in the desired order
 * @returns An object indicating success or failure
 */
export async function updateGoalOrder(goals: string[]) {
  try {
    const userId = await getUserId();

    // Update each goal's order in a transaction
    await prisma.$transaction(
      goals.map((goalId, index) =>
        prisma.goal.update({
          where: {
            id: goalId,
            userId: userId, // Ensure the user owns the goal
          },
          data: {
            order: index, // Set the order based on the array index
          },
        })
      )
    );

    // Revalidate the paths
    revalidatePath('/goals');
    revalidatePath('/');

    return { success: true, message: 'Goal order updated successfully' };
  } catch (error) {
    console.error('Error updating goal order:', error);
    return { success: false, message: 'Failed to update goal order' };
  }
}
