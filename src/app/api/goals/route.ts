import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { CreateGoalSchema } from '@/lib/schemas/goals';

// Helper function to get user ID (simplified for now)
const getUserId = async () => {
  return "user_placeholder";
};

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId') || await getUserId();
    const includeArchived = searchParams.get('includeArchived') === 'true';

    // Fetch all goals (both parent goals and subgoals)
    const goals = await prisma.goal.findMany({
      where: {
        userId,
        isArchived: includeArchived ? undefined : false // Only include non-archived goals unless specified
      },
      orderBy: { order: 'asc' },
      select: {
        id: true,
        name: true,
        categoryId: true,
        parentGoalId: true,
        order: true
      }
    });

    // Return the goals directly (not wrapped in success object)
    return NextResponse.json(goals);
  } catch (error) {
    console.error("Error fetching goals:", error);
    return NextResponse.json(
      { error: "Failed to fetch goals" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    // Get the request body
    const body = await request.json();

    // Get the user ID
    const userId = await getUserId();

    // Validate the input
    const validatedFields = CreateGoalSchema.safeParse(body);
    if (!validatedFields.success) {
      return NextResponse.json(
        { success: false, message: "Invalid input data." },
        { status: 400 }
      );
    }

    // Check if this is a sub-goal (has parentGoalId)
    const isSubGoal = !!validatedFields.data.parentGoalId;

    // For sub-goals, we need to ensure the parent goal exists
    if (isSubGoal) {
      const parentGoal = await prisma.goal.findUnique({
        where: { id: validatedFields.data.parentGoalId as string },
      });

      if (!parentGoal) {
        return NextResponse.json(
          { success: false, message: "Parent goal not found." },
          { status: 404 }
        );
      }

      // If the sub-goal doesn't have a category, inherit from parent
      if (!validatedFields.data.categoryId && parentGoal.categoryId) {
        validatedFields.data.categoryId = parentGoal.categoryId;
      }
    }

    // Create the goal
    const newGoal = await prisma.goal.create({
      data: {
        ...validatedFields.data,
        userId: userId,
      },
    });

    // Return the created goal
    return NextResponse.json({
      success: true,
      message: "Goal created successfully.",
      goal: newGoal
    });
  } catch (error) {
    console.error("Error creating goal:", error);
    return NextResponse.json(
      { success: false, message: "Server error: Failed to create goal." },
      { status: 500 }
    );
  }
}
