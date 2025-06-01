import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

/**
 * GET /api/notes/[noteId]
 * 
 * Retrieves a specific note by ID
 * 
 * Path parameters:
 * - noteId: The ID of the note to retrieve
 * 
 * Returns:
 * - success: Boolean indicating if the request was successful
 * - note: The note object if found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { noteId: string } }
) {
  try {
    // Get the user ID
    const userId = await getUserId();
    
    // Get the note ID from the params
    const { noteId } = params;
    
    // Fetch the note
    const note = await prisma.note.findUnique({
      where: {
        id: noteId,
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
    
    if (!note) {
      return NextResponse.json(
        { success: false, message: "Note not found" },
        { status: 404 }
      );
    }
    
    // Return the note
    return NextResponse.json({
      success: true,
      note
    });
  } catch (error) {
    console.error("Error fetching note:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to fetch note." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/notes/[noteId]
 * 
 * Deletes a specific note by ID
 * 
 * Path parameters:
 * - noteId: The ID of the note to delete
 * 
 * Returns:
 * - success: Boolean indicating if the request was successful
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { noteId: string } }
) {
  try {
    // Get the user ID
    const userId = await getUserId();
    
    // Get the note ID from the params
    const { noteId } = params;
    
    // Check if the note exists and belongs to the user
    const note = await prisma.note.findUnique({
      where: {
        id: noteId,
        userId
      }
    });
    
    if (!note) {
      return NextResponse.json(
        { success: false, message: "Note not found" },
        { status: 404 }
      );
    }
    
    // Delete the note
    await prisma.note.delete({
      where: {
        id: noteId
      }
    });
    
    // Return success
    return NextResponse.json({
      success: true,
      message: "Note deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting note:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to delete note." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/notes/[noteId]
 * 
 * Updates a specific note by ID
 * 
 * Path parameters:
 * - noteId: The ID of the note to update
 * 
 * Request body:
 * - title: Optional. The new title for the note
 * - content: Optional. The new content for the note
 * - goalId: Optional. The new goal ID for the note
 * - taskId: Optional. The new task ID for the note
 * 
 * Returns:
 * - success: Boolean indicating if the request was successful
 * - note: The updated note object
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { noteId: string } }
) {
  try {
    // Get the user ID
    const userId = await getUserId();
    
    // Get the note ID from the params
    const { noteId } = params;
    
    // Get the request body
    const body = await request.json();
    
    // Check if the note exists and belongs to the user
    const note = await prisma.note.findUnique({
      where: {
        id: noteId,
        userId
      }
    });
    
    if (!note) {
      return NextResponse.json(
        { success: false, message: "Note not found" },
        { status: 404 }
      );
    }
    
    // Ensure at least one of goalId or taskId is provided
    if (!body.goalId && !body.taskId) {
      return NextResponse.json(
        { success: false, message: "A note must be associated with either a goal or a task" },
        { status: 400 }
      );
    }
    
    // Update the note
    const updatedNote = await prisma.note.update({
      where: {
        id: noteId
      },
      data: {
        title: body.title,
        content: body.content,
        goalId: body.goalId,
        taskId: body.taskId
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
    
    // Return the updated note
    return NextResponse.json({
      success: true,
      note: updatedNote
    });
  } catch (error) {
    console.error("Error updating note:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to update note." },
      { status: 500 }
    );
  }
}
