import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { revalidatePath } from 'next/cache';

/**
 * API route to handle goal reordering
 * This provides a client-side way to update goal order without a full page refresh
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { goalIds } = body;

    // Validate the input
    if (!goalIds || !Array.isArray(goalIds) || goalIds.length === 0) {
      return NextResponse.json(
        { success: false, message: 'Invalid input: goalIds must be a non-empty array' },
        { status: 400 }
      );
    }

    // Update each goal's order in a transaction
    await prisma.$transaction(
      goalIds.map((goalId, index) =>
        prisma.goal.update({
          where: {
            id: goalId,
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

    return NextResponse.json({ success: true, message: 'Goal order updated successfully' });
  } catch (error) {
    console.error('Error updating goal order:', error);
    return NextResponse.json(
      { success: false, message: 'Failed to update goal order' },
      { status: 500 }
    );
  }
}
