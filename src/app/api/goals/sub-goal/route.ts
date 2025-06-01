import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { z } from 'zod';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

// Schema for sub-goal creation
const SubGoalSchema = z.object({
  name: z.string().min(3, "Name must be at least 3 characters.").max(100),
  description: z.string().max(500).optional().nullable(),
  deadline: z.string().optional().nullable(),
  parentGoalId: z.string().cuid("Invalid parent goal ID format"),
  timeframe: z.string().optional().nullable(),
});

export async function POST(request: NextRequest) {
  try {
    // Get the user ID
    const userId = await getUserId();

    // Get the request body
    const body = await request.json();
    console.log('Sub-goal API received data:', body);

    // Validate the input
    const validatedFields = SubGoalSchema.safeParse(body);
    if (!validatedFields.success) {
      console.error('Validation error:', validatedFields.error.flatten());
      return NextResponse.json(
        { success: false, message: "Invalid input data." },
        { status: 400 }
      );
    }

    // Ensure the parent goal exists
    const parentGoal = await prisma.goal.findUnique({
      where: {
        id: validatedFields.data.parentGoalId,
        userId
      },
    });

    if (!parentGoal) {
      return NextResponse.json(
        { success: false, message: "Parent goal not found." },
        { status: 404 }
      );
    }

    console.log('Parent goal found:', parentGoal);

    // Prepare the data for the sub-goal
    const subGoalData = {
      name: validatedFields.data.name,
      description: validatedFields.data.description,
      deadline: validatedFields.data.deadline ? new Date(validatedFields.data.deadline) : null,
      parentGoalId: validatedFields.data.parentGoalId,
      categoryId: parentGoal.categoryId, // Inherit category from parent
      timeframe: validatedFields.data.timeframe || parentGoal.timeframe, // Inherit timeframe from parent if not specified
      userId: userId,
    };

    console.log('Inheriting properties from parent goal:', {
      categoryId: parentGoal.categoryId,
      timeframe: parentGoal.timeframe
    });

    console.log('Creating sub-goal with data:', subGoalData);

    // Create the sub-goal
    const newSubGoal = await prisma.goal.create({
      data: subGoalData,
    });

    console.log('New sub-goal created:', newSubGoal);

    // Return the created sub-goal
    return NextResponse.json({
      success: true,
      message: "Sub-goal created successfully.",
      subGoal: newSubGoal
    });
  } catch (error) {
    console.error("Error creating sub-goal:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to create sub-goal." },
      { status: 500 }
    );
  }
}
