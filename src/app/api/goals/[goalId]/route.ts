import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

export async function GET(
  request: NextRequest,
  { params }: { params: { goalId: string } }
) {
  try {
    // Get the user ID
    const userId = await getUserId();

    // Get the goal ID from the params
    const { goalId } = params;

    // Fetch the goal
    const goal = await prisma.goal.findUnique({
      where: {
        id: goalId,
        userId
      },
      include: {
        category: true,
        tasks: {
          orderBy: { createdAt: 'asc' },
          include: {
            notes: {
              orderBy: { updatedAt: 'desc' }
            }
          }
        },
        subGoals: {
          orderBy: { createdAt: 'asc' },
          include: {
            category: true,
            notes: {
              orderBy: { updatedAt: 'desc' }
            }
          }
        },
        notes: {
          orderBy: { updatedAt: 'desc' }
        }
      }
    });

    if (!goal) {
      return NextResponse.json(
        { success: false, message: "Goal not found" },
        { status: 404 }
      );
    }

    // Return the goal
    return NextResponse.json({
      success: true,
      goal
    });
  } catch (error) {
    console.error("Error fetching goal:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to fetch goal." },
      { status: 500 }
    );
  }
}
