import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

/**
 * GET /api/goals/sub-goal/all
 * 
 * Retrieves all sub-goals for the current user
 * 
 * Query parameters:
 * - parentGoalId: Optional. Filter sub-goals by parent goal ID
 * 
 * Returns:
 * - success: Boolean indicating if the request was successful
 * - subGoals: Array of sub-goal objects
 */
export async function GET(request: NextRequest) {
  try {
    // Get the user ID
    const userId = await getUserId();
    
    // Get query parameters
    const url = new URL(request.url);
    const parentGoalId = url.searchParams.get('parentGoalId');
    
    // Build the where clause
    const where: any = { 
      userId,
      parentGoalId: { not: null } // Ensure we only get sub-goals
    };
    
    if (parentGoalId) {
      where.parentGoalId = parentGoalId;
    }
    
    // Fetch sub-goals
    const subGoals = await prisma.goal.findMany({
      where,
      include: {
        category: true,
        tasks: {
          select: {
            id: true,
            name: true,
            status: true
          }
        },
        notes: {
          select: {
            id: true,
            title: true,
            updatedAt: true
          }
        },
        _count: {
          select: {
            tasks: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Return the sub-goals
    return NextResponse.json({
      success: true,
      subGoals
    });
  } catch (error) {
    console.error("Error fetching sub-goals:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to fetch sub-goals." },
      { status: 500 }
    );
  }
}
