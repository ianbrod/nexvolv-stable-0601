'use client';

import React from 'react';
import { ChevronRight, CheckCircle2 } from 'lucide-react';
import { GoalCardData } from './types';

interface GoalCardHeaderProps {
  goal: GoalCardData;
  isSubGoal: boolean;
  hasSubGoals: boolean;
  isExpanded?: boolean;
  onExpandToggle?: (goalId: string, e: React.MouseEvent) => void;
  compactView?: boolean;
}

/**
 * Header component for the GoalCard showing the goal name and expand/collapse button
 */
export function GoalCardHeader({
  goal,
  isSubGoal,
  hasSubGoals,
  isExpanded,
  onExpandToggle,
  compactView = false
}: GoalCardHeaderProps) {
  return (
    <h3 className={`${isSubGoal ? 'text-sm' : 'text-lg'} font-semibold flex items-center leading-tight`}>
      {isSubGoal && <span className="mr-1 text-muted-foreground">↳</span>}
      {/* Show expand/collapse button for any goal with subgoals */}
      {hasSubGoals && (
        <button
          className="mr-2 text-primary hover:bg-muted rounded-full p-0.5 focus:outline-none focus:ring-2 focus:ring-primary/20 z-10 transition-colors duration-150"
          onClick={(e) => {
            e.stopPropagation(); // Prevent card click
            if (onExpandToggle) {
              onExpandToggle(goal.id, e);
            } else {
              console.warn('onExpandToggle is not defined');
            }
          }}
          aria-label={isExpanded ? 'Collapse sub-goals' : 'Expand sub-goals'}
          aria-expanded={isExpanded}
          aria-controls={`subgoals-${goal.id}`}
          data-testid={`expand-toggle-${goal.id}`}
        >
          <div className={`transform transition-transform duration-200 ease-in-out ${isExpanded ? 'rotate-90' : ''}`}>
            <ChevronRight className="h-4 w-4" aria-hidden="true" />
          </div>
        </button>
      )}
      {/* Add indentation for subgoals without expand button */}
      {isSubGoal && !hasSubGoals && <div className="w-7"></div>}
      <span className={`truncate ${goal.progress === 100 ? 'goal-completed-text' : ''}`}>
        {goal.name}
      </span>
      {/* Display checkmark icon for completed goals */}
      {goal.progress === 100 && (
        <span className="goal-completed-badge ml-2" aria-label="Completed">
          <CheckCircle2 className="h-4 w-4" />
        </span>
      )}
      {/* Sub-goal count indicator is now shown in the GoalCardContent component */}
    </h3>
  );
}
