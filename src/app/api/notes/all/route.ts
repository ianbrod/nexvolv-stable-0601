import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

/**
 * GET /api/notes/all
 * 
 * Retrieves all notes for the current user
 * 
 * Query parameters:
 * - goalId: Optional. Filter notes by goal ID
 * - taskId: Optional. Filter notes by task ID
 * 
 * Returns:
 * - success: Boolean indicating if the request was successful
 * - notes: Array of note objects
 */
export async function GET(request: NextRequest) {
  try {
    // Get the user ID
    const userId = await getUserId();
    
    // Get query parameters
    const url = new URL(request.url);
    const goalId = url.searchParams.get('goalId');
    const taskId = url.searchParams.get('taskId');
    
    // Build the where clause
    const where: any = { userId };
    
    if (goalId) {
      where.goalId = goalId;
    }
    
    if (taskId) {
      where.taskId = taskId;
    }
    
    // Fetch notes
    const notes = await prisma.note.findMany({
      where,
      include: {
        goal: {
          select: {
            id: true,
            name: true,
          }
        },
        task: {
          select: {
            id: true,
            name: true,
          }
        }
      },
      orderBy: { updatedAt: 'desc' }
    });
    
    // Return the notes
    return NextResponse.json({
      success: true,
      notes
    });
  } catch (error) {
    console.error("Error fetching notes:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to fetch notes." },
      { status: 500 }
    );
  }
}
