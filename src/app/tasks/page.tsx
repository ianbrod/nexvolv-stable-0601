// Remove 'use client'; - This is now an RSC

import React from 'react';
import { prisma } from "@/lib/prisma"; // Import shared instance
// NewTaskButton removed as it's now part of UnifiedTaskAdd
// Import the TaskView component that handles both list and board views
import { TaskView } from '@/components/tasks/TaskView';

// This component now runs on the server
export default async function TasksPage() {
  // Remove client-side state
  // const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  // Fetch data directly on the server using Prisma
  // TODO: Add proper userId filtering later
  // Fetch tasks with a revalidation tag
  const tasks = await prisma.task.findMany({
    where: {
      userId: "user_placeholder",
      status: { not: 'ARCHIVED' } // Don't show archived tasks by default
    },
    orderBy: { createdAt: 'desc' },
    include: {
      goal: {
        include: {
          category: true, // Include the category information
        }
      },
    }
    // Remove invalid 'next' option
  });
  // Fetch goals with a revalidation tag
  const allGoals = await prisma.goal.findMany({
    where: { userId: "user_placeholder" }, // Temporary placeholder
    include: {
      category: true, // Include the category information
    }
    // No need to select parentGoalId if it doesn't exist in schema
    // Remove invalid 'next' option
  });

  // Fetch categories
  const categories = await prisma.category.findMany({
    where: { userId: "user_placeholder" }, // Temporary placeholder
    orderBy: { order: 'asc' },
  });

  const activeTasks = tasks;
  // Remove filtering by parentGoalId as it's not in the Goal schema
  const availableGoals = allGoals; // Pass all fetched goals

  // Check if Goals or Tasks could potentially be null/undefined if DB is empty
  if (!tasks || !allGoals) {
      // Handle cases where fetching might fail or return null
      // Depending on Prisma setup, findMany usually returns [], not null
      console.error("Failed to fetch tasks or goals");
      // Render an error state or return null/empty component
      return <div>Error loading data.</div>;
  }

  return (
    <div className="w-full h-[calc(100vh-4rem)] px-6 pt-4 pb-2">
      {/* Task View Area - Handles both list and board views */}
      <TaskView tasks={tasks} goals={availableGoals} categories={categories} />

      {/* Modal is now rendered inside NewTaskButton, no need to render here */}
    </div>
  );
}