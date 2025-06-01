import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

/**
 * GET /api/tasks/all
 * 
 * Retrieves all tasks for the current user
 * 
 * Query parameters:
 * - goalId: Optional. Filter tasks by goal ID
 * - status: Optional. Filter tasks by status (TODO, IN_PROGRESS, COMPLETED)
 * - priority: Optional. Filter tasks by priority (LOW, MEDIUM, HIGH)
 * 
 * Returns:
 * - success: Boolean indicating if the request was successful
 * - tasks: Array of task objects
 */
export async function GET(request: NextRequest) {
  try {
    // Get the user ID
    const userId = await getUserId();
    
    // Get query parameters
    const url = new URL(request.url);
    const goalId = url.searchParams.get('goalId');
    const status = url.searchParams.get('status');
    const priority = url.searchParams.get('priority');
    
    // Build the where clause
    const where: any = { userId };
    
    if (goalId) {
      where.goalId = goalId;
    }
    
    if (status) {
      where.status = status;
    }
    
    if (priority) {
      where.priority = priority;
    }
    
    // Fetch tasks
    const tasks = await prisma.task.findMany({
      where,
      include: {
        goal: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        notes: {
          select: {
            id: true,
            title: true,
            updatedAt: true
          }
        }
      },
      orderBy: { createdAt: 'desc' }
    });
    
    // Return the tasks
    return NextResponse.json({
      success: true,
      tasks
    });
  } catch (error) {
    console.error("Error fetching tasks:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to fetch tasks." },
      { status: 500 }
    );
  }
}
