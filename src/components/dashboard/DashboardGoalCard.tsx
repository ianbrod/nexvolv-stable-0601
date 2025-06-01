'use client';

import React, { useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { Task } from '@/types';
import { Goal as PrismaGoal, Category as PrismaCategory } from '@prisma/client';
import { TaskStatus } from '@prisma/client'; // Import TaskStatus from prisma/client
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { CheckCircle2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';

interface DashboardGoalCardProps {
  goal: PrismaGoal & {
    category?: PrismaCategory | null;
    _count?: { subGoals: number };
    completedAt?: Date | null; // Add completedAt field
  };
  linkedTasks: Task[];
  subgoalCount?: number; // Add optional prop for subgoal count
}

const DashboardGoalCardComponent = ({ goal, linkedTasks, subgoalCount = 0 }: DashboardGoalCardProps) => { // Destructure subgoalCount
  const router = useRouter();

  // Calculate progress based on completed tasks
  const progressPercentage = useMemo(() => {
    const totalTasks = linkedTasks.length;
    const completedTasks = linkedTasks.filter(task => task.status === TaskStatus.COMPLETED).length; // Use Enum
    return totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
  }, [linkedTasks]);

  const totalTasks = linkedTasks.length;
  const completedTasks = linkedTasks.filter(task => task.status === TaskStatus.COMPLETED).length;

  // Check if the goal is completed (100% progress or has completedAt timestamp)
  const isCompleted = progressPercentage === 100 || !!goal.completedAt;

  // Check if this is a recently completed goal (completed and still showing on dashboard)
  const isRecentlyCompleted = !!goal.completedAt;

  // Calculate days remaining for display if recently completed
  const daysRemaining = isRecentlyCompleted ?
    3 - Math.floor((new Date().getTime() - new Date(goal.completedAt!).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  // Handle card click for navigation
  const handleCardClick = () => {
    router.push(`/goals/${goal.id}`);
  };

  return (
    <Card
      className={cn(
        "flex flex-col rounded-lg border-l-4 h-40",
        "goal-card-hover-effect hover:bg-muted/50 cursor-pointer",
        "focus:outline-none focus:ring-2 focus:ring-primary/20",
        isCompleted && "goal-completed"
      )}
      style={{
        // Always preserve the category color for the left border
        borderLeftColor: goal.category && goal.category.color ? goal.category.color : '#808080',
        // Only apply completion border to top, right, bottom - not left
        borderTopColor: isCompleted ? 'var(--chart-3)' : undefined,
        borderRightColor: isCompleted ? 'var(--chart-3)' : undefined,
        borderBottomColor: isCompleted ? 'var(--chart-3)' : undefined
      }}
      data-completed={isCompleted ? 'true' : 'false'}
      onClick={handleCardClick}
      role="button"
      tabIndex={0}
      aria-label={`Goal: ${goal.name}${isCompleted ? ', Completed' : ''}`}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleCardClick();
        }
      }}
    >
      <CardHeader className="p-0 px-2 pt-0.5">
        <div className="flex justify-between items-start gap-2">
          {/* Goal Title */}
          <div className="flex-grow overflow-hidden">
            <CardTitle className={cn(
              "text-base font-semibold truncate leading-tight",
              isCompleted && "goal-completed-text"
            )}>
              <span className="flex items-center">
                {goal.name}
                {isCompleted && (
                  <span className="goal-completed-badge ml-1" aria-label="Completed">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                  </span>
                )}
              </span>
            </CardTitle>
          </div>
        </div>
      </CardHeader>

      <CardContent className="flex-grow flex flex-col justify-between p-2 pt-0.5">
        {/* Progress Section */}
        <div className="space-y-1">
          <div className="flex justify-between items-center text-xs">
            <span className="font-medium">Progress</span>
            <span className="font-medium">{progressPercentage}%</span>
          </div>
          <Progress
            value={progressPercentage}
            className={`h-2 rounded-full ${
              progressPercentage < 25 ? 'goal-progress-low' :
              progressPercentage < 75 ? 'goal-progress-medium' :
              progressPercentage < 100 ? 'goal-progress-high' :
              'goal-progress-complete'
            }`}
          />
        </div>

        {/* Task and Subgoal Summary */}
        <div className="mt-2 flex flex-wrap gap-1.5">
          <Badge variant="outline" className="text-xs font-medium py-0.5 px-1.5">
            Tasks: {completedTasks}/{totalTasks}
          </Badge>
          {/* Add Completed Badge or Overdue Badge */}
          {isCompleted ? (
            <Badge
              variant="default"
              className={cn(
                "text-xs font-medium py-0.5 px-1.5 bg-[var(--chart-3)] text-white",
                "flex items-center gap-1"
              )}
            >
              <CheckCircle2 className="h-3 w-3" />
              {isRecentlyCompleted ? `Completed (${daysRemaining}d)` : 'Completed'}
            </Badge>
          ) : (
            linkedTasks.some(task => task.status !== TaskStatus.COMPLETED && task.dueDate && new Date(task.dueDate) < new Date()) && (
              <Badge variant="destructive" className="text-xs font-medium py-0.5 px-1.5">
                Overdue Tasks
              </Badge>
            )
          )}
          {/* Add Subgoal Badge */}
          {subgoalCount > 0 && (
            <Badge variant="secondary" className="text-xs font-medium py-0.5 px-1.5">
              {subgoalCount} Subgoal{subgoalCount !== 1 ? 's' : ''}
            </Badge>
          )}
        </div>
      </CardContent>
    </Card>
  );
}

export const DashboardGoalCard = React.memo(DashboardGoalCardComponent);
export default React.memo(DashboardGoalCardComponent);
