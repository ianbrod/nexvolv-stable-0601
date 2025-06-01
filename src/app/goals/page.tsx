// Removed 'use client';

import React from 'react';
import { Prisma, Goal } from "@prisma/client"; // Import Prisma helper and base Goal type
import { prisma as db } from "@/lib/prisma"; // Use existing import, alias if needed to avoid conflict
// Remove Dexie imports and client-side types
// import { useLiveQuery } from "dexie-react-hooks";
// import { db, getGoals, getCategories, deleteGoal, archiveGoal } from "@/lib/db";
// import { Goal } from "@/types";
// Remove direct GoalCard import from RSC
// import { GoalCard } from "@/components/goals/GoalCard";
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
// import { Skeleton } from "@/components/ui/skeleton"; // Skeletons can be handled differently or in Client Component
// Import the wrapper component
import { GoalListWrapper } from '@/components/goals/GoalListWrapper';

// --- Define the specific type returned by our query ---
// This exactly matches the select structure below
type GoalsPageGoalPayload = Prisma.GoalGetPayload<{
  select: {
    id: true,
    name: true,
    description: true,
    categoryId: true,
    deadline: true,
    progress: true,
    isArchived: true,
    userId: true,
    parentGoalId: true,
    createdAt: true,
    updatedAt: true,
    timeframe: true,
    tags: true,
    order: true, // Include the order field
    category: {
      select: {
        id: true,
        name: true,
        color: true, // Include color for consistency
      }
    },
    tasks: {
      select: {
        id: true,
        status: true,
        dueDate: true
      }
    },
    _count: {
      select: {
        // Keep total task count for potential future use or comparison
        // tasks: true, // Note: Can remove this if only using calculated counts
        subGoals: true
      }
    },
  }
}>;
// ------------------------------------------------------

export default async function GoalsPage() {
  // Remove client-side state management for modals

  // Fetch Goals and Categories on the server
  // TODO: Add user filtering
  const userId = "user_placeholder";

  // Fetch goals with explicit typing for the result
  const goalsData: GoalsPageGoalPayload[] = await db.goal.findMany({
    where: {
      userId,
      isArchived: false,
      progress: { lt: 100 }, // Exclude completed goals (they go to wins page)
      // Fetch only top-level goals for the main list? Or filter in GoalListWrapper?
      // parentGoalId: null, // Optional: Only fetch goals without a parent
    },
    // Select specific fields including the new timeframe and nested selections
    select: {
      id: true,
      name: true,
      description: true,
      categoryId: true,
      deadline: true,
      progress: true,
      isArchived: true,
      userId: true,
      parentGoalId: true,
      createdAt: true,
      updatedAt: true,
      timeframe: true, // Select the timeframe field
      tags: true, // Select the tags field
      order: true, // Select the order field for sorting
      // Select fields from related category
      category: {
        select: {
          id: true,
          name: true,
          color: true, // Include color for the goal card border
          // Add other category fields if needed by GoalCard/Modal
        }
      },
      // Include complete task data
      tasks: {
        select: {
          id: true,
          name: true,
          description: true,
          status: true,
          priority: true,
          dueDate: true,
          completedAt: true,
          startedAt: true,
          recurrencePattern: true,
          recurrenceEndDate: true,
          goalId: true,
          userId: true,
          createdAt: true,
          updatedAt: true
        }
      },
      _count: {
        select: {
          // Keep total task count for potential future use or comparison
          // tasks: true, // Note: Can remove this if only using calculated counts
          subGoals: true
        }
      },
    },
    orderBy: [
      // First sort by parent/child relationship
      { parentGoalId: 'asc' },
      // Then sort by order field
      { order: 'asc' },
      // Finally fall back to creation date
      { createdAt: 'desc' },
    ],
  });

  // Fetch categories (we need this for the New Goal modal)
  const categories = await db.category.findMany({
    where: { userId }, // Ensure categories are user-specific if needed
    orderBy: [
      {
        order: 'asc',
      },
      {
        name: 'asc',
      }
    ]
  });

  // TODO: Server-side hierarchy processing might be complex.
  // Consider fetching flat list and handling hierarchy in a client component or
  // using recursive queries if DB/Prisma supports it well.
  // For now, just pass the flat list.

  // Log all goals from the database
  console.log('Goals from database:', goalsData);
  console.log('Sub-goals from database:', goalsData.filter(g => g.parentGoalId));

  // Map data to include calculated counts
  const goals = goalsData.map(goal => {
    const now = new Date();
    let completedCount = 0;
    let overdueCount = 0;

    // Calculate task counts
    goal.tasks.forEach(task => {
      if (task.status === 'COMPLETED') {
        completedCount++;
      } else if (task.dueDate && new Date(task.dueDate) < now) {
        overdueCount++;
      }
    });

    return {
      ...goal,
      subGoalCount: goal._count.subGoals,
      timeframe: goal.timeframe,
      // Use calculated counts
      completedTaskCount: completedCount,
      overdueTaskCount: overdueCount,
    };
  });

  return (
    <div className="w-full h-[calc(100vh-4rem)] px-4 py-4" data-goals-page>
      {/* Render the Client Component Wrapper for the list */}
      <div className="h-full w-full">
        <GoalListWrapper goals={goals} categories={categories} />

        {/* Emergency Direct Links removed */}
      </div>
    </div>
  );
}

// Remove skeleton from RSC, can be added within loading states of Client Components
// function CardSkeleton() { ... }