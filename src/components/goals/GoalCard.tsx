'use client';

import React, { useState } from 'react';

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

// Import our extracted components
import { GoalCardHeader } from './GoalCardHeader';
import { GoalCardActions } from './GoalCardActions';
import { GoalCardContent } from './GoalCardContent';
import { GoalDetailsModal } from './GoalDetailsModal';
import { GlowingEffect } from '@/components/ui/glowing-effect';

// Import shared types
import { GoalCardProps, GoalCardData } from './types';

/**
 * GoalCard component displays a goal with its details, progress, and actions
 */
export function GoalCard({
  goal,
  categories = [],
  onEdit,
  onDelete,
  isCompletedView,
  onClick,
  isExpanded,
  hasSubGoals,
  onExpandToggle,
  compactView = false,
  isSelected = false,
  useGlowingEffect = false
}: GoalCardProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDetailsModalOpen, setIsDetailsModalOpen] = useState(false);

  // Check if this is a sub-goal
  const isSubGoal = !!goal.parentGoalId;

  // Check if the goal is completed (100% progress)
  const isCompleted = goal.progress === 100;

  const handleCardClick = () => {
    onClick?.(goal.id);
  };

  // Helper function to convert hex color to rgba with opacity
  const hexToRgba = (hex: string, opacity: number) => {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    if (result) {
      const r = parseInt(result[1], 16);
      const g = parseInt(result[2], 16);
      const b = parseInt(result[3], 16);
      return `rgba(${r}, ${g}, ${b}, ${opacity})`;
    }
    return `rgba(128, 128, 128, ${opacity})`; // fallback gray
  };

  // Get the background color for completed goals
  const getCompletedBackgroundColor = () => {
    if (!isCompleted) return undefined;

    // Check if we're in dark mode by looking at the document class
    const isDarkMode = typeof document !== 'undefined' && document.documentElement.classList.contains('dark');

    // Use 45.55% brighter opacity in dark mode (0.145546 vs 0.1)
    const opacity = isDarkMode ? 0.145546 : 0.1;

    if (goal.category?.color) {
      return hexToRgba(goal.category.color, opacity);
    }
    return `rgba(var(--chart-3-rgb), ${opacity})`; // fallback to original with adjusted opacity
  };

  return (
    <>
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        {/* Main container div */}
        {useGlowingEffect ? (
          <div className="relative rounded-lg goal-card-glowing-container" data-is-subgoal={isSubGoal ? 'true' : 'false'}>
            <GlowingEffect
              spread={40}
              glow={true}
              disabled={false}
              proximity={64}
              inactiveZone={0.01}
              borderWidth={12}
              className="rounded-lg"
              style={{
                position: 'absolute',
                top: '-2px',
                left: '-2px',
                right: '-2px',
                bottom: '-2px'
              }}
            />
            <div
              className={`
                flex flex-col
                ${isSubGoal ? 'p-2 sm:p-2' : 'p-4 sm:p-4'}
                rounded-lg
                ${isSubGoal ? 'mb-2' : 'mb-3'}
                hover:bg-muted/50
                cursor-pointer
                relative
                overflow-hidden
                w-full
                goal-card-mobile-padding
                ${isSubGoal ? 'shadow-sm' : 'shadow-sm hover:shadow-md'}

                ${isCompleted && !goal.category?.color ? 'goal-completed' : ''}
                focus:outline-none focus:ring-2 focus:ring-primary/20
                goal-card-print
                ${isSelected ? 'ring-2 ring-purple-500/40 border-purple-500/30 shadow-lg shadow-purple-500/20 bg-purple-500/5' : ''}
              `}
              onClick={handleCardClick}
              data-goal-id={goal.id}
              data-expanded={isExpanded ? 'true' : 'false'}
              data-is-subgoal={isSubGoal ? 'true' : 'false'}
              data-has-subgoals={hasSubGoals ? 'true' : 'false'}
              data-completed={isCompleted ? 'true' : 'false'}
              data-completed-view={isCompletedView ? 'true' : 'false'}
              role="button"
              tabIndex={0}
              aria-label={`Goal: ${goal.name}${isSubGoal ? ', Sub-goal' : ''}${hasSubGoals ? ', Has sub-goals' : ''}${isCompleted ? ', Completed' : ''}`}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  handleCardClick();
                }
              }}
              style={{
                backgroundColor: getCompletedBackgroundColor(),
              }}
            >
              {/* Header with title and actions */}
              <div className={`flex items-center justify-between ${compactView ? 'mb-1.5' : 'mb-3'}`}>
                <div className="flex items-center">
                  <GoalCardHeader
                    goal={goal}
                    isSubGoal={isSubGoal}
                    hasSubGoals={hasSubGoals || false}
                    isExpanded={isExpanded}
                    onExpandToggle={onExpandToggle}
                    compactView={compactView}
                  />
                </div>

                {/* Actions Dropdown */}
                <GoalCardActions
                  goal={goal}
                  isSubGoal={isSubGoal}
                  isCompletedView={isCompletedView}
                  onEdit={onEdit}
                  onOpenDetails={() => setIsDetailsModalOpen(true)}
                  onOpenDeleteAlert={() => onDelete && setIsAlertOpen(true)}
                  compactView={compactView}
                />
              </div>

              {/* Main content */}
              <GoalCardContent goal={goal} compactView={compactView || isSubGoal} />
            </div>
          </div>
        ) : (
          /* Regular card without glowing effect */
          <div
            className={`
              flex flex-col
              ${isSubGoal ? 'p-2 sm:p-2' : 'p-4 sm:p-4'}
              border rounded-lg
              ${isSubGoal ? 'mb-2' : 'mb-3'}
              hover:bg-muted/50
              goal-card-hover-effect
              cursor-pointer
              relative
              overflow-hidden
              w-full
              goal-card-mobile-padding
              ${isSubGoal ? 'shadow-sm' : 'shadow-sm hover:shadow-md'}

              ${isCompleted && !goal.category?.color ? 'goal-completed' : ''}
              focus:outline-none focus:ring-2 focus:ring-primary/20
              goal-card-print
              ${isSelected ? 'ring-2 ring-purple-500/40 border-purple-500/30 shadow-lg shadow-purple-500/20 bg-purple-500/5' : ''}
            `}
            onClick={handleCardClick}
            data-goal-id={goal.id}
            data-expanded={isExpanded ? 'true' : 'false'}
            data-is-subgoal={isSubGoal ? 'true' : 'false'}
            data-has-subgoals={hasSubGoals ? 'true' : 'false'}
            data-completed={isCompleted ? 'true' : 'false'}
            data-completed-view={isCompletedView ? 'true' : 'false'}
            role="button"
            tabIndex={0}
            aria-label={`Goal: ${goal.name}${isSubGoal ? ', Sub-goal' : ''}${hasSubGoals ? ', Has sub-goals' : ''}${isCompleted ? ', Completed' : ''}`}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                handleCardClick();
              }
            }}
            style={{
              borderLeftWidth: '4px',
              // Always preserve the category color for the left border
              borderLeftColor: goal.category ? goal.category.color || '#808080' : '#808080',
              borderLeftStyle: 'solid',
              borderTopStyle: isSubGoal ? 'dashed' : 'solid',
              borderRightStyle: 'solid',
              borderBottomStyle: isSubGoal ? 'dashed' : 'solid',
              backgroundColor: getCompletedBackgroundColor(),
              // Only apply completion border to top, right, bottom - not left
              borderTopColor: isCompleted ? 'var(--chart-3)' : undefined,
              borderRightColor: isCompleted ? 'var(--chart-3)' : undefined,
              borderBottomColor: isCompleted ? 'var(--chart-3)' : undefined
            }}
          >
            {/* Header with title and actions */}
            <div className={`flex items-center justify-between ${compactView ? 'mb-1.5' : 'mb-3'}`}>
              <div className="flex items-center">
                <GoalCardHeader
                  goal={goal}
                  isSubGoal={isSubGoal}
                  hasSubGoals={hasSubGoals || false}
                  isExpanded={isExpanded}
                  onExpandToggle={onExpandToggle}
                  compactView={compactView}
                />
              </div>

              {/* Actions Dropdown */}
              <GoalCardActions
                goal={goal}
                isSubGoal={isSubGoal}
                isCompletedView={isCompletedView}
                onEdit={onEdit}
                onOpenDetails={() => setIsDetailsModalOpen(true)}
                onOpenDeleteAlert={() => onDelete && setIsAlertOpen(true)}
                compactView={compactView}
              />
            </div>

            {/* Main content */}
            <GoalCardContent goal={goal} compactView={compactView || isSubGoal} />
          </div>
        )}

        {/* Delete Confirmation Dialog Content */}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the goal
              "{goal.name}" and potentially its associated data.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => onDelete && onDelete(goal.id)}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Goal Details Modal */}
      <GoalDetailsModal
        isOpen={isDetailsModalOpen}
        onClose={() => setIsDetailsModalOpen(false)}
        goal={goal}
        categories={categories}
      />
    </>
  );
}