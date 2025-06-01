import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

// Schema for task update
const UpdateTaskSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).optional(),
  dueDate: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']).optional(),
  goalId: z.string().cuid("Invalid goal ID format").optional().nullable(),
});

/**
 * GET /api/tasks/[taskId]
 * 
 * Retrieves a specific task by ID
 * 
 * Path parameters:
 * - taskId: The ID of the task to retrieve
 * 
 * Returns:
 * - success: Boolean indicating if the request was successful
 * - task: The task object if found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    // Get the user ID
    const userId = await getUserId();
    
    // Get the task ID from the params
    const { taskId } = params;
    
    // Fetch the task
    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
        userId
      },
      include: {
        goal: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        notes: {
          orderBy: { updatedAt: 'desc' }
        }
      }
    });
    
    if (!task) {
      return NextResponse.json(
        { success: false, message: "Task not found" },
        { status: 404 }
      );
    }
    
    // Return the task
    return NextResponse.json({
      success: true,
      task
    });
  } catch (error) {
    console.error("Error fetching task:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to fetch task." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/tasks/[taskId]
 * 
 * Updates a specific task by ID
 * 
 * Path parameters:
 * - taskId: The ID of the task to update
 * 
 * Request body:
 * - name: Optional. The new name for the task
 * - description: Optional. The new description for the task
 * - priority: Optional. The new priority for the task
 * - dueDate: Optional. The new due date for the task
 * - status: Optional. The new status for the task
 * - goalId: Optional. The new goal ID for the task
 * 
 * Returns:
 * - success: Boolean indicating if the request was successful
 * - task: The updated task object
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    // Get the user ID
    const userId = await getUserId();
    
    // Get the task ID from the params
    const { taskId } = params;
    
    // Get the request body
    const body = await request.json();
    
    // Validate the input
    const validatedFields = UpdateTaskSchema.safeParse(body);
    if (!validatedFields.success) {
      return NextResponse.json(
        { success: false, message: "Invalid input data.", errors: validatedFields.error.flatten() },
        { status: 400 }
      );
    }
    
    // Check if the task exists and belongs to the user
    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
        userId
      }
    });
    
    if (!task) {
      return NextResponse.json(
        { success: false, message: "Task not found" },
        { status: 404 }
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
    
    // Prepare the update data
    const updateData: any = { ...validatedFields.data };
    
    // Convert dueDate string to Date object if provided
    if (updateData.dueDate) {
      updateData.dueDate = new Date(updateData.dueDate);
    }
    
    // Add completedAt date if status is changed to COMPLETED
    if (updateData.status === 'COMPLETED' && task.status !== 'COMPLETED') {
      updateData.completedAt = new Date();
    }
    
    // Remove completedAt date if status is changed from COMPLETED
    if (updateData.status && updateData.status !== 'COMPLETED' && task.status === 'COMPLETED') {
      updateData.completedAt = null;
    }
    
    // Update the task
    const updatedTask = await prisma.task.update({
      where: {
        id: taskId
      },
      data: updateData,
      include: {
        goal: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        notes: {
          orderBy: { updatedAt: 'desc' }
        }
      }
    });
    
    // Return the updated task
    return NextResponse.json({
      success: true,
      task: updatedTask
    });
  } catch (error) {
    console.error("Error updating task:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to update task." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/tasks/[taskId]
 * 
 * Deletes a specific task by ID
 * 
 * Path parameters:
 * - taskId: The ID of the task to delete
 * 
 * Returns:
 * - success: Boolean indicating if the request was successful
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { taskId: string } }
) {
  try {
    // Get the user ID
    const userId = await getUserId();
    
    // Get the task ID from the params
    const { taskId } = params;
    
    // Check if the task exists and belongs to the user
    const task = await prisma.task.findUnique({
      where: {
        id: taskId,
        userId
      }
    });
    
    if (!task) {
      return NextResponse.json(
        { success: false, message: "Task not found" },
        { status: 404 }
      );
    }
    
    // Delete the task
    await prisma.task.delete({
      where: {
        id: taskId
      }
    });
    
    // Return success
    return NextResponse.json({
      success: true,
      message: "Task deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting task:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to delete task." },
      { status: 500 }
    );
  }
}
