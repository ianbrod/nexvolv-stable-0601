'use client';

import React from 'react';
import { GoalCard } from './GoalCard';
import { Button } from '@/components/ui/button';
import { CheckCircle2 } from 'lucide-react';

/**
 * Demo component for the completed goals view
 */
export function CompletedGoalsDemo() {
  // Mock goal data for demonstration
  const mockCompletedGoal = {
    id: 'demo-completed-goal',
    name: 'Complete Project Documentation',
    description: 'Finalize all documentation for the project including user guides and technical specs.',
    categoryId: 'cat-1',
    deadline: new Date('2023-12-31'),
    progress: 100, // Completed
    isArchived: false,
    userId: 'user-1',
    parentGoalId: null,
    createdAt: new Date('2023-01-15'),
    updatedAt: new Date('2023-12-20'),
    timeframe: 'Q4 2023',
    order: 1,
    category: { id: 'cat-1', name: 'Work', color: '#4c7894' },
    tasks: [
      { id: 'task-1', status: 'COMPLETED', dueDate: new Date('2023-12-15') },
      { id: 'task-2', status: 'COMPLETED', dueDate: new Date('2023-12-10') }
    ],
    _count: { subGoals: 0 },
    subGoalCount: 0,
    completedTaskCount: 2,
    overdueTaskCount: 0
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold">Completed Goals Demo</h2>
        <Button variant="outline" size="sm">
          <CheckCircle2 className="mr-2 h-4 w-4" />
          View All Completed Goals
        </Button>
      </div>

      <p className="text-muted-foreground">
        This demonstrates how completed goals appear in the dedicated Completed Goals view.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        <GoalCard
          goal={mockCompletedGoal}
          isCompletedView={true}
        />
      </div>

      <div className="mt-4 p-4 bg-muted rounded-lg">
        <h3 className="font-medium mb-2">About Completed Goals View</h3>
        <p className="text-sm text-muted-foreground">
          The Completed Goals view provides a dedicated space to review and celebrate your achievements.
          Goals are automatically moved here when they reach 100% progress, and they're sorted by completion date
          (most recent first).
        </p>
      </div>
    </div>
  );
}
