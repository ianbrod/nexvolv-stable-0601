import React from 'react';
import { prisma } from "@/lib/prisma";
import { notFound, redirect } from 'next/navigation';
import { Prisma, Goal } from '@prisma/client';
// Import the client wrapper component
import { GoalDetailClientWrapper } from '@/components/goals/GoalDetailClientWrapper';

// Define the expected params shape
interface GoalDetailPageProps {
  params: {
    goalId: string;
  };
}

// Define the payload type for the goal details
type GoalDetailPayload = Prisma.GoalGetPayload<{
  include: {
    category: true;
    tasks: true;
    subGoals: {
      include: { category: true, _count: { select: { tasks: true, subGoals: true } } }
    };
  }
}>;

// Define Category type needed for modal
type FullCategory = Prisma.CategoryGetPayload<{}>;

export default async function GoalDetailPage({ params }: GoalDetailPageProps) {
  const { goalId } = await params;
  const userId = "user_placeholder"; // TODO: Replace with actual user ID

  // First check if this is a sub-goal, and if so, redirect to parent goal
  const goalCheck = await prisma.goal.findUnique({
    where: { id: goalId, userId },
    select: { parentGoalId: true }
  });

  // If this is a sub-goal, redirect to the parent goal
  if (goalCheck?.parentGoalId) {
    // Use Next.js redirect function instead of returning an object
    const url = `/goals/${goalCheck.parentGoalId}`;
    return redirect(url);
  }

  // --- Fetch Data Concurrently ---
  const [goal, categories, allGoals] = await Promise.all([
    // Fetch detailed goal data
    prisma.goal.findUnique({
      where: { id: goalId, userId },
      include: {
        category: true,
        tasks: {
          orderBy: { createdAt: 'asc' },
          include: {
            goal: {
              include: {
                category: true
              }
            }
          }
        },
        subGoals: {
          orderBy: { createdAt: 'asc' },
          include: {
            category: true,
            tasks: true,
            _count: { select: { tasks: true, subGoals: true } }
          }
        },
      }
    }),
    // Fetch all categories for the Modals
    prisma.category.findMany({
      where: { userId },
      orderBy: { name: 'asc' },
    }),
    // Fetch all non-archived goals (full objects) for TaskModal select
    prisma.goal.findMany({
      where: { userId, isArchived: false },
      // No select needed, fetch full Goal object
      orderBy: { name: 'asc' },
    })
  ]);
  // -------------------------------

  // Handle goal not found
  if (!goal) {
    notFound();
  }

  // Render the client wrapper, passing fetched data
  return <GoalDetailClientWrapper goal={goal} categories={categories} allGoals={allGoals} />;
}