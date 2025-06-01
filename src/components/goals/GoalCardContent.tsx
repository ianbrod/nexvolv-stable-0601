'use client';

import React from 'react';
import { format } from 'date-fns';
import { CalendarIcon, CheckCircle } from 'lucide-react';
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { GoalCardData } from './types';
import { cn } from '@/lib/utils';

interface GoalCardContentProps {
  goal: GoalCardData;
  compactView?: boolean;
}

/**
 * Content component for the GoalCard showing metadata, progress, and badges
 */
export function GoalCardContent({ goal, compactView = false }: GoalCardContentProps) {
  const deadlineFormatted = goal.deadline ? format(new Date(goal.deadline), 'MMM d') : null;
  const timeframe = goal.timeframe ?? 'N/A';
  const totalTaskCount = goal.tasks.length;
  const completedTaskCount = goal.completedTaskCount;
  const overdueTaskCount = goal.overdueTaskCount;
  const subGoalCount = goal.subGoalCount;

  return (
    <div className={`flex-grow ${compactView ? 'space-y-2' : 'space-y-4'} goal-card-mobile-spacing`}>
      {/* Metadata Row */}
      <div className="flex items-center space-x-3 text-xs text-muted-foreground">
        <span className="font-normal">{timeframe}</span>
        {deadlineFormatted && (
          <>
            <span>•</span>
            <div className="flex items-center">
              <CalendarIcon className="h-3.5 w-3.5 mr-1" />
              <span>Due {deadlineFormatted}</span>
            </div>
          </>
        )}
      </div>

      {/* Progress Bar */}
      <div className="space-y-1">
        <div className="flex justify-between items-center text-xs">
          <span id={`progress-label-${goal.id}`} className="font-medium">Progress</span>
          <span aria-hidden="true" className="font-medium">{goal.progress}%</span>
        </div>
        <Progress
          value={goal.progress}
          className={`h-2 rounded-full ${
            goal.progress < 25 ? 'goal-progress-low' :
            goal.progress < 75 ? 'goal-progress-medium' :
            goal.progress < 100 ? 'goal-progress-high' :
            'goal-progress-complete'
          }`}
          aria-labelledby={`progress-label-${goal.id}`}
          aria-valuenow={goal.progress}
          aria-valuemin={0}
          aria-valuemax={100}
        />
      </div>

      {/* Badges Row */}
      <div className="flex items-center flex-wrap gap-1.5 pt-0.5">
        <Badge variant="outline" className="uppercase font-medium">Tasks ({completedTaskCount}/{totalTaskCount})</Badge>
        {goal.progress === 100 ? (
          <Badge
            variant="default"
            className={cn(
              "font-medium bg-[var(--chart-3)] text-white",
              "flex items-center gap-1"
            )}
          >
            <CheckCircle className="h-3.5 w-3.5" />
            Completed
          </Badge>
        ) : (
          <>
            {overdueTaskCount > 0 && (
              <Badge variant="destructive" className="font-medium">{overdueTaskCount} Overdue</Badge>
            )}
          </>
        )}
        {subGoalCount > 0 && (
          <Badge variant="secondary" className="font-medium">
            {subGoalCount} Sub-goal{subGoalCount !== 1 ? 's' : ''}
          </Badge>
        )}
      </div>
    </div>
  );
}
