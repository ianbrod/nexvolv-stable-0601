import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

export async function GET(request: NextRequest) {
  try {
    // Get the user ID
    const userId = await getUserId();
    
    // Fetch all goals for the user
    const goals = await prisma.goal.findMany({
      where: { userId },
      include: {
        category: true,
        _count: {
          select: {
            subGoals: true,
            tasks: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Return the goals
    return NextResponse.json({
      success: true,
      goals
    });
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to fetch goals." },
      { status: 500 }
    );
  }
}
