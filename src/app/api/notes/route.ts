import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateNoteSchema } from '@/lib/schemas/notes';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

/**
 * POST /api/notes
 * 
 * Creates a new note
 * 
 * Request body:
 * - title: Optional. The title of the note
 * - content: Required. The content of the note
 * - goalId: Optional. The ID of the goal to associate with the note
 * - taskId: Optional. The ID of the task to associate with the note
 * 
 * Returns:
 * - success: Boolean indicating if the request was successful
 * - note: The created note object
 */
export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    
    // Get the user ID
    const userId = await getUserId();
    
    // Validate the input
    const validatedFields = CreateNoteSchema.safeParse(body);
    if (!validatedFields.success) {
      return NextResponse.json(
        { success: false, message: "Invalid input data.", errors: validatedFields.error.flatten() },
        { status: 400 }
      );
    }
    
    // If goalId is provided, check if it exists and belongs to the user
    if (validatedFields.data.goalId) {
      const goal = await prisma.goal.findUnique({
        where: {
          id: validatedFields.data.goalId,
          userId
        }
      });
      
      if (!goal) {
        return NextResponse.json(
          { success: false, message: "Goal not found" },
          { status: 404 }
        );
      }
    }
    
    // If taskId is provided, check if it exists and belongs to the user
    if (validatedFields.data.taskId) {
      const task = await prisma.task.findUnique({
        where: {
          id: validatedFields.data.taskId,
          userId
        }
      });
      
      if (!task) {
        return NextResponse.json(
          { success: false, message: "Task not found" },
          { status: 404 }
        );
      }
    }
    
    // Create the note
    const newNote = await prisma.note.create({
      data: {
        ...validatedFields.data,
        userId
      },
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
      }
    });
    
    // Return the created note
    return NextResponse.json({
      success: true,
      note: newNote
    });
  } catch (error) {
    console.error("Error creating note:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to create note." },
      { status: 500 }
    );
  }
}
