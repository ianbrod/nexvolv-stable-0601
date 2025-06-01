'use client';

import React from 'react';
import { GoalCard } from './GoalCard';
import { GoalCardData, CategoryData } from './types';
import { Trophy } from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';

interface CompletedGoalsListProps {
  goals: GoalCardData[];
  categories: CategoryData[];
  expandedGoals: Set<string>;
  onExpandToggle: (goalId: string, e: React.MouseEvent) => void;
}

/**
 * List component for displaying completed goals
 *
 * Groups goals by category and displays them in a grid layout
 */
export function CompletedGoalsList({
  goals,
  categories,
  expandedGoals,
  onExpandToggle
}: CompletedGoalsListProps) {
  // Group goals by category
  const goalsByCategory: Record<string, GoalCardData[]> = {};

  // Add "Uncategorized" group
  goalsByCategory['uncategorized'] = [];

  // All goals in this view should already be completed goals
  const completedGoals = goals;

  // Only show parent goals (goals without a parentGoalId) at the top level
  // This ensures subgoals are only shown when their parent is expanded
  const topLevelGoals = completedGoals.filter(goal => {
    // Only include goals without a parent (parentGoalId is null)
    return !goal.parentGoalId;
  });

  // Group these top-level goals by their category
  topLevelGoals.forEach(goal => {
    if (goal.categoryId) {
      if (!goalsByCategory[goal.categoryId]) {
        goalsByCategory[goal.categoryId] = [];
      }
      goalsByCategory[goal.categoryId].push(goal);
    } else {
      goalsByCategory['uncategorized'].push(goal);
    }
  });

  // Sort goals within each category by subGoalCount (highest first)
  Object.keys(goalsByCategory).forEach(categoryId => {
    goalsByCategory[categoryId].sort((a, b) => b.subGoalCount - a.subGoalCount);
  });

  // Handle goal card click for expanding/collapsing
  const handleGoalClick = (goalId: string) => {
    // This is now handled by the parent component
  };

  if (completedGoals.length === 0) {
    return (
      <div className="text-center p-8 border rounded-md bg-muted/20">
        <Trophy className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
        <h3 className="text-lg font-medium mb-2">No Completed Goals Yet</h3>
        <p className="text-muted-foreground">
          When you complete goals, they'll appear here for you to celebrate and reflect on.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {/* Render each category section */}
      {Object.entries(goalsByCategory).map(([categoryId, categoryGoals]) => {
        // Skip empty categories
        if (categoryGoals.length === 0) return null;

        // Find category name
        let categoryName = "Uncategorized";
        let categoryColor = "#6b7280"; // Default gray

        if (categoryId !== 'uncategorized') {
          const category = categories.find(c => c.id === categoryId);
          if (category) {
            categoryName = category.name;
            categoryColor = category.color || categoryColor;
          }
        }

        return (
          <div key={categoryId} className="space-y-1">
            {/* Category header */}
            <div className="flex items-center">
              <div
                className="w-4 h-4 rounded-full mr-2"
                style={{ backgroundColor: categoryColor }}
              />
              <h2 className="text-xl font-bold">{categoryName}</h2>
              <span className="ml-2 text-muted-foreground">
                ({categoryGoals.length})
              </span>
            </div>

            {/* Goals in responsive three-column grid layout */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2 p-3">
              {categoryGoals.map((goal, index) => (
                <div key={goal.id} className="flex flex-col">
                  <GoalCard
                    key={goal.id}
                    goal={goal}
                    categories={categories}
                    isCompletedView={true}
                    onClick={handleGoalClick}
                    onExpandToggle={onExpandToggle}
                    isExpanded={expandedGoals.has(goal.id)}
                    hasSubGoals={goal.subGoalCount > 0 || completedGoals.some(g => g.parentGoalId === goal.id)}
                    compactView={true}
                    useGlowingEffect={true}
                  />

                  {/* Render sub-goals if this goal has any and is expanded */}
                  {(goal.subGoalCount > 0 || completedGoals.some(g => g.parentGoalId === goal.id)) && expandedGoals.has(goal.id) && (
                    <div className="mt-1 space-y-1 border-l-2 border-primary/20 pl-2">
                      {completedGoals
                        .filter(subGoal => subGoal.parentGoalId === goal.id)
                        .map(subGoal => (
                          <div key={subGoal.id} className="scale-90 origin-left">
                            <GoalCard
                              key={subGoal.id}
                              goal={subGoal}
                              categories={categories}
                              isCompletedView={true}
                              onClick={handleGoalClick}
                              onExpandToggle={onExpandToggle}
                              isExpanded={expandedGoals.has(subGoal.id)}
                              hasSubGoals={subGoal.subGoalCount > 0 || completedGoals.some(g => g.parentGoalId === subGoal.id)}
                              compactView={true}
                              useGlowingEffect={true}
                            />
                          </div>
                        ))
                      }
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}
