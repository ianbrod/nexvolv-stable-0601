'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Prisma, Task, Category } from '@prisma/client';
import { TasksForGoal } from './TasksForGoal';
import { CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { X, PlusCircle, LineChart } from 'lucide-react';

// Define the type for the goal data
type GoalWithDetails = Prisma.GoalGetPayload<{
  select: {
    id: true;
    name: true;
    description: true;
    deadline: true;
    progress: true;
    timeframe: true;
    category: { select: { id: true; name: true } };
    tasks: true;
    _count: { select: { subGoals: true } };
  }
}> & {
  subGoalCount: number;
  completedTaskCount: number;
  overdueTaskCount: number;
};

interface GoalDetailPanelProps {
  goal: GoalWithDetails | null;
  categories: Category[];
  onClose: () => void;
  onAddTask: (goalId: string) => void;
  subGoals?: GoalWithDetails[];
}

export function GoalDetailPanel({ goal, categories, onClose, onAddTask, subGoals = [] }: GoalDetailPanelProps) {
  if (!goal) {
    return null;
  }

  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const handleAddTask = () => {
    setIsCreateModalOpen(true);
  };

  return (
    <>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 border-b">
        <div className="flex items-center gap-1">
          <Link href={`/goals/${goal.id}`}>
            <Button
              variant="outline"
              size="sm"
              className="flex items-center gap-1 h-7 px-2 text-xs bg-purple-500/20 hover:bg-purple-500/30 dark:bg-purple-400/20 dark:hover:bg-purple-400/30 border-2 border-purple-500 dark:border-purple-400 text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200 transition-all duration-200"
            >
              <LineChart className="h-3 w-3" />
              <span>Progress</span>
            </Button>
          </Link>
          <Button
            variant="outline"
            size="sm"
            className="flex items-center gap-1 h-7 px-2 text-xs"
            onClick={handleAddTask}
          >
            <PlusCircle className="h-3 w-3" />
            <span>Task</span>
          </Button>
        </div>
        <div className="flex items-center">
          <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="flex-grow overflow-auto p-4">
        {/* Use the TasksForGoal component with proper task data */}
        <TasksForGoal
          goal={goal}
          tasks={goal.tasks || []}
          subGoals={subGoals}
          categories={categories} // Pass categories for hierarchical dropdown
          isCreateModalOpen={isCreateModalOpen}
          setIsCreateModalOpen={setIsCreateModalOpen}
        />
      </CardContent>

      {/* Footer removed to avoid duplicate Add Task button */}
    </>
  );
}
