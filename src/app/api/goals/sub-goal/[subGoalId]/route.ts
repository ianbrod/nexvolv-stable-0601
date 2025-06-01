import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

// Schema for sub-goal update
const UpdateSubGoalSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(100).optional(),
  description: z.string().max(500).optional().nullable(),
  deadline: z.string().optional().nullable(),
  parentGoalId: z.string().cuid("Invalid parent goal ID format").optional(),
  timeframe: z.string().optional().nullable(),
  progress: z.number().min(0).max(100).optional(),
  categoryId: z.string().cuid("Invalid category ID format").optional().nullable(),
});

/**
 * GET /api/goals/sub-goal/[subGoalId]
 * 
 * Retrieves a specific sub-goal by ID
 * 
 * Path parameters:
 * - subGoalId: The ID of the sub-goal to retrieve
 * 
 * Returns:
 * - success: Boolean indicating if the request was successful
 * - subGoal: The sub-goal object if found
 */
export async function GET(
  request: NextRequest,
  { params }: { params: { subGoalId: string } }
) {
  try {
    // Get the user ID
    const userId = await getUserId();
    
    // Get the sub-goal ID from the params
    const { subGoalId } = params;
    
    // Fetch the sub-goal
    const subGoal = await prisma.goal.findUnique({
      where: {
        id: subGoalId,
        userId,
        parentGoalId: { not: null } // Ensure it's a sub-goal
      },
      include: {
        category: true,
        parentGoal: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        tasks: {
          orderBy: { createdAt: 'asc' },
          include: {
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
    
    if (!subGoal) {
      return NextResponse.json(
        { success: false, message: "Sub-goal not found" },
        { status: 404 }
      );
    }
    
    // Return the sub-goal
    return NextResponse.json({
      success: true,
      subGoal
    });
  } catch (error) {
    console.error("Error fetching sub-goal:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to fetch sub-goal." },
      { status: 500 }
    );
  }
}

/**
 * PATCH /api/goals/sub-goal/[subGoalId]
 * 
 * Updates a specific sub-goal by ID
 * 
 * Path parameters:
 * - subGoalId: The ID of the sub-goal to update
 * 
 * Request body:
 * - name: Optional. The new name for the sub-goal
 * - description: Optional. The new description for the sub-goal
 * - deadline: Optional. The new deadline for the sub-goal
 * - parentGoalId: Optional. The new parent goal ID for the sub-goal
 * - timeframe: Optional. The new timeframe for the sub-goal
 * - progress: Optional. The new progress for the sub-goal
 * - categoryId: Optional. The new category ID for the sub-goal
 * 
 * Returns:
 * - success: Boolean indicating if the request was successful
 * - subGoal: The updated sub-goal object
 */
export async function PATCH(
  request: NextRequest,
  { params }: { params: { subGoalId: string } }
) {
  try {
    // Get the user ID
    const userId = await getUserId();
    
    // Get the sub-goal ID from the params
    const { subGoalId } = params;
    
    // Get the request body
    const body = await request.json();
    
    // Validate the input
    const validatedFields = UpdateSubGoalSchema.safeParse(body);
    if (!validatedFields.success) {
      return NextResponse.json(
        { success: false, message: "Invalid input data.", errors: validatedFields.error.flatten() },
        { status: 400 }
      );
    }
    
    // Check if the sub-goal exists and belongs to the user
    const subGoal = await prisma.goal.findUnique({
      where: {
        id: subGoalId,
        userId,
        parentGoalId: { not: null } // Ensure it's a sub-goal
      }
    });
    
    if (!subGoal) {
      return NextResponse.json(
        { success: false, message: "Sub-goal not found" },
        { status: 404 }
      );
    }
    
    // If parentGoalId is provided, check if it exists and belongs to the user
    if (validatedFields.data.parentGoalId) {
      const parentGoal = await prisma.goal.findUnique({
        where: {
          id: validatedFields.data.parentGoalId,
          userId
        }
      });
      
      if (!parentGoal) {
        return NextResponse.json(
          { success: false, message: "Parent goal not found" },
          { status: 404 }
        );
      }
    }
    
    // If categoryId is provided, check if it exists and belongs to the user
    if (validatedFields.data.categoryId) {
      const category = await prisma.category.findUnique({
        where: {
          id: validatedFields.data.categoryId,
          userId
        }
      });
      
      if (!category) {
        return NextResponse.json(
          { success: false, message: "Category not found" },
          { status: 404 }
        );
      }
    }
    
    // Prepare the update data
    const updateData: any = { ...validatedFields.data };
    
    // Convert deadline string to Date object if provided
    if (updateData.deadline) {
      updateData.deadline = new Date(updateData.deadline);
    }
    
    // Update the sub-goal
    const updatedSubGoal = await prisma.goal.update({
      where: {
        id: subGoalId
      },
      data: updateData,
      include: {
        category: true,
        parentGoal: {
          select: {
            id: true,
            name: true,
            category: true
          }
        },
        tasks: {
          orderBy: { createdAt: 'asc' }
        },
        notes: {
          orderBy: { updatedAt: 'desc' }
        }
      }
    });
    
    // Return the updated sub-goal
    return NextResponse.json({
      success: true,
      subGoal: updatedSubGoal
    });
  } catch (error) {
    console.error("Error updating sub-goal:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to update sub-goal." },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/goals/sub-goal/[subGoalId]
 * 
 * Deletes a specific sub-goal by ID
 * 
 * Path parameters:
 * - subGoalId: The ID of the sub-goal to delete
 * 
 * Returns:
 * - success: Boolean indicating if the request was successful
 */
export async function DELETE(
  request: NextRequest,
  { params }: { params: { subGoalId: string } }
) {
  try {
    // Get the user ID
    const userId = await getUserId();
    
    // Get the sub-goal ID from the params
    const { subGoalId } = params;
    
    // Check if the sub-goal exists and belongs to the user
    const subGoal = await prisma.goal.findUnique({
      where: {
        id: subGoalId,
        userId,
        parentGoalId: { not: null } // Ensure it's a sub-goal
      }
    });
    
    if (!subGoal) {
      return NextResponse.json(
        { success: false, message: "Sub-goal not found" },
        { status: 404 }
      );
    }
    
    // Delete the sub-goal (this will cascade delete associated tasks and notes)
    await prisma.goal.delete({
      where: {
        id: subGoalId
      }
    });
    
    // Return success
    return NextResponse.json({
      success: true,
      message: "Sub-goal deleted successfully"
    });
  } catch (error) {
    console.error("Error deleting sub-goal:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to delete sub-goal." },
      { status: 500 }
    );
  }
}
