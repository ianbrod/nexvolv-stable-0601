import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

// Schema for task creation
const CreateTaskSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(100),
  description: z.string().max(500).optional().nullable(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH']).default('MEDIUM'),
  dueDate: z.string().optional().nullable(),
  status: z.enum(['TODO', 'IN_PROGRESS', 'COMPLETED']).default('TODO'),
  goalId: z.string().cuid("Invalid goal ID format").optional().nullable(),
});

/**
 * POST /api/tasks
 * 
 * Creates a new task
 * 
 * Request body:
 * - name: Required. The name of the task
 * - description: Optional. The description of the task
 * - priority: Optional. The priority of the task (LOW, MEDIUM, HIGH)
 * - dueDate: Optional. The due date of the task
 * - status: Optional. The status of the task (TODO, IN_PROGRESS, COMPLETED)
 * - goalId: Optional. The ID of the goal to associate with the task
 * 
 * Returns:
 * - success: Boolean indicating if the request was successful
 * - task: The created task object
 */
export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();
    
    // Get the user ID
    const userId = await getUserId();
    
    // Validate the input
    const validatedFields = CreateTaskSchema.safeParse(body);
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
    
    // Create the task
    const newTask = await prisma.task.create({
      data: {
        ...validatedFields.data,
        dueDate: validatedFields.data.dueDate ? new Date(validatedFields.data.dueDate) : null,
        userId
      },
      include: {
        goal: {
          select: {
            id: true,
            name: true,
            category: true
          }
        }
      }
    });
    
    // Return the created task
    return NextResponse.json({
      success: true,
      task: newTask
    });
  } catch (error) {
    console.error("Error creating task:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to create task." },
      { status: 500 }
    );
  }
}
