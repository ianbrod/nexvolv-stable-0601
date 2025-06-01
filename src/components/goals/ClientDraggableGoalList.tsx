'use client';

import React, { useState, useEffect } from 'react';
import { DraggableGoalList } from './DraggableGoalList';
import { GoalCardData, CategoryData } from './types';

// Props for the client draggable goal list wrapper
interface ClientDraggableGoalListProps {
  goals: GoalCardData[];
  categories: CategoryData[];
  onEdit: (goal: GoalCardData) => void;
  onDelete: (id: string) => void;
  isCompletedView?: boolean;
  onClick: (goalId: string) => void;
  onExpandToggle: (goalId: string, e: React.MouseEvent) => void;
  expandedGoals: Set<string>;
  onGoalsReordered?: (newOrder: GoalCardData[]) => void;
  selectedGoalId?: string | null;
}

/**
 * Client-only wrapper for DraggableGoalList to avoid hydration mismatches
 */
export function ClientDraggableGoalList(props: ClientDraggableGoalListProps) {
  // Track if we're on the client side
  const [isClient, setIsClient] = useState(false);

  // Set isClient to true once the component mounts
  useEffect(() => {
    setIsClient(true);
  }, []);

  // If not on client yet, render a simplified version without drag functionality
  if (!isClient) {
    return (
      <div className="space-y-4">
        <div className="space-y-2">
          {props.goals
            .filter(goal => !goal.parentGoalId) // Only top-level goals
            .map((goal, index) => (
              <div key={goal.id} className={`space-y-2 ${index === 0 ? 'first-goal-container' : ''}`}>
                {/* Static placeholder for goal card */}
                <div className="border rounded-lg p-4 bg-card">
                  <div className="font-medium">{goal.name}</div>
                </div>
              </div>
            ))}
        </div>
      </div>
    );
  }

  // On client, render the full DraggableGoalList component
  return <DraggableGoalList {...props} />;
}
