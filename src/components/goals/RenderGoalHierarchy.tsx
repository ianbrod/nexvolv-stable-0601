'use client';

import React from 'react';
import { GoalCard } from './GoalCard';
import { RenderGoalHierarchyProps } from './goal-list-types';

/**
 * Recursive component to render goal hierarchy
 */
export function RenderGoalHierarchy({
  goals,
  parentId,
  categories,
  onEdit,
  onDelete,
  onClick,
  onExpandToggle,
  expandedGoals,
  level
}: RenderGoalHierarchyProps) {
  // Filter goals for the current level
  const currentLevelGoals = goals.filter(goal => {
    return goal.parentGoalId === parentId;
  });

  if (currentLevelGoals.length === 0) {
    return null;
  }

  return (
    <div className={`space-y-2 ${level > 0 ? 'mt-2' : ''}`}>
      {currentLevelGoals.map((goal, index) => {
        // Check if this goal has subgoals
        const hasSubGoals = goal.subGoalCount > 0 || goals.some(g => g.parentGoalId === goal.id);
        const isExpanded = expandedGoals.has(goal.id);
        const isFirstGoal = index === 0;

        return (
          <div key={goal.id} className={`space-y-2 ${isFirstGoal ? 'first-goal-container' : ''}`}>
            {/* Goal Card */}
            <GoalCard
              goal={goal}
              categories={categories}
              onEdit={onEdit}
              onDelete={onDelete}
              onClick={onClick}
              onExpandToggle={onExpandToggle}
              hasSubGoals={hasSubGoals}
              isExpanded={isExpanded}
            />

            {/* Subgoals (if any and if expanded) */}
            {hasSubGoals && (
              <div
                id={`subgoals-${goal.id}`}
                className={`overflow-hidden transition-all duration-300 ease-in-out ${isExpanded ? 'max-h-[2000px] opacity-100' : 'max-h-0 opacity-0'}`}
                style={{ marginTop: isExpanded ? '8px' : '0' }}
                aria-hidden={!isExpanded}
              >
                <div className={`pl-6 space-y-2 border-l-2 border-primary/20 ml-2`}>
                  {/* Recursively render subgoals */}
                  <RenderGoalHierarchy
                    goals={goals}
                    parentId={goal.id}
                    categories={categories}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onClick={onClick}
                    onExpandToggle={onExpandToggle}
                    expandedGoals={expandedGoals}
                    level={level + 1}
                  />
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
