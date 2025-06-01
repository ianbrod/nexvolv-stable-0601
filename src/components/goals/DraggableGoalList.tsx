'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { GoalCardData, CategoryData } from './types';
import { GoalCard } from './GoalCard';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  restrictToVerticalAxis,
  snapCenterToCursor,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

// Define props for the sortable goal item
interface SortableGoalItemProps {
  goal: GoalCardData;
  categories: CategoryData[];
  onEdit: (goal: GoalCardData) => void;
  onDelete: (id: string) => void;
  onClick: (goalId: string) => void;
  onExpandToggle: (goalId: string, e: React.MouseEvent) => void;
  isExpanded?: boolean;
  hasSubGoals?: boolean;
  selectedGoalId?: string | null;
}

// Sortable goal item component
function SortableGoalItem({
  goal,
  categories,
  onEdit,
  onDelete,
  onClick,
  onExpandToggle,
  isExpanded,
  hasSubGoals,
  selectedGoalId
}: SortableGoalItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: goal.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
    opacity: isDragging ? 0.5 : 1,
  };

  // Only allow dragging for top-level goals
  const isTopLevel = !goal.parentGoalId;

  return (
    <div
      ref={isTopLevel ? setNodeRef : undefined}
      style={isTopLevel ? style : undefined}
      {...(isTopLevel ? attributes : {})}
      {...(isTopLevel ? listeners : {})}
      className={isTopLevel ? 'cursor-grab active:cursor-grabbing' : ''}
    >
      <GoalCard
        goal={goal}
        categories={categories}
        onEdit={onEdit}
        onDelete={onDelete}
        onClick={onClick}
        onExpandToggle={onExpandToggle}
        isExpanded={isExpanded}
        hasSubGoals={hasSubGoals}
        isSelected={selectedGoalId === goal.id}
      />
    </div>
  );
}

// Props for the draggable goal list
interface DraggableGoalListProps {
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

// Main draggable goal list component
export function DraggableGoalList({
  goals,
  categories,
  onEdit,
  onDelete,
  isCompletedView,
  onClick,
  onExpandToggle,
  expandedGoals,
  onGoalsReordered,
  selectedGoalId
}: DraggableGoalListProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  // State for the ordered goals
  const [items, setItems] = useState<GoalCardData[]>([]);

  // Storage key for localStorage
  const storageKey = isCompletedView
    ? 'completedGoalOrder'
    : 'goalOrder';

  // Function to apply saved order from localStorage
  const applySavedOrder = (currentGoals: GoalCardData[]) => {
    try {
      const savedOrderString = localStorage.getItem(storageKey);

      if (savedOrderString) {
        const savedOrder = JSON.parse(savedOrderString);

        // Create a map of saved goals by ID
        const savedOrderMap = new Map();
        savedOrder.forEach((goal: GoalCardData, index: number) => {
          savedOrderMap.set(goal.id, index);
        });

        // Check if we have any saved goals that match our current goals
        const hasMatchingGoals = currentGoals.some(goal => savedOrderMap.has(goal.id));

        if (hasMatchingGoals) {
          console.log('Using saved goal order from localStorage');

          // Create a new array with the current goals data but ordered according to localStorage
          const orderedGoals = [...currentGoals].sort((a, b) => {
            // First handle parent/child relationship
            if (a.parentGoalId !== b.parentGoalId) {
              if (!a.parentGoalId) return -1;
              if (!b.parentGoalId) return 1;
              return 0;
            }

            // Then sort by saved order if both goals are in the saved order
            const aOrder = savedOrderMap.has(a.id) ? savedOrderMap.get(a.id) : Number.MAX_SAFE_INTEGER;
            const bOrder = savedOrderMap.has(b.id) ? savedOrderMap.get(b.id) : Number.MAX_SAFE_INTEGER;

            return aOrder - bOrder;
          });

          return orderedGoals;
        }
      }
    } catch (error) {
      console.error('Error loading goal order from localStorage:', error);
    }

    // If we get here, either there was no saved order or it was invalid
    console.log('Using server goal order');
    return currentGoals;
  };

  // Load goals on mount and when goals prop changes, prioritizing localStorage if available
  useEffect(() => {
    const orderedGoals = applySavedOrder(goals);
    setItems(orderedGoals);
  }, [goals, storageKey]);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Minimum drag distance before activation
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Handle drag end event
  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;

    if (over && active.id !== over.id && !isPending) {
      // Only allow reordering top-level goals
      const activeGoal = items.find(item => item.id === active.id);
      const overGoal = items.find(item => item.id === over.id);

      // If either goal is not found, exit early
      if (!activeGoal || !overGoal) return;

      // Only allow reordering if both goals are top-level or both have the same parent
      const activeIsTopLevel = !activeGoal.parentGoalId;
      const overIsTopLevel = !overGoal.parentGoalId;

      // Only allow reordering if both goals are at the same level
      if (activeIsTopLevel !== overIsTopLevel) return;

      // If they're subgoals, make sure they have the same parent
      if (!activeIsTopLevel && activeGoal.parentGoalId !== overGoal.parentGoalId) return;

      // Find indices
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      // Create the new order
      const newOrder = arrayMove([...items], oldIndex, newIndex);

      // Update local state immediately for a responsive UI
      setItems(newOrder);

      // Save the new order to localStorage for persistence
      try {
        localStorage.setItem(storageKey, JSON.stringify(newOrder));
        console.log(`Saved new goal order to localStorage with key: ${storageKey}`);
      } catch (error) {
        console.error(`Error saving goal order to localStorage:`, error);
      }

      // Get only the goals at the same level as the ones being reordered
      let goalIdsToUpdate: string[] = [];

      if (activeIsTopLevel) {
        // If reordering top-level goals, get all top-level goals in their new order
        goalIdsToUpdate = newOrder
          .filter(goal => !goal.parentGoalId)
          .map(goal => goal.id);
      } else {
        // If reordering subgoals, get all subgoals with the same parent in their new order
        goalIdsToUpdate = newOrder
          .filter(goal => goal.parentGoalId === activeGoal.parentGoalId)
          .map(goal => goal.id);
      }

      // Call the callback if provided
      if (onGoalsReordered) {
        onGoalsReordered(newOrder);
      }

      // Update the database directly for immediate persistence
      startTransition(async () => {
        try {
          const result = await fetch('/api/goals/reorder', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({ goalIds: goalIdsToUpdate }),
          });

          if (!result.ok) {
            console.error('Failed to update goal order on server');
          }
        } catch (error) {
          console.error('Error updating goal order:', error);
        }
      });
    }
  }

  // Filter out only top-level goals for the sortable context
  const topLevelGoals = items.filter(goal => !goal.parentGoalId);

  // Render the draggable goal list
  return (
    <div className="space-y-4">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, snapCenterToCursor]}
      >
        <SortableContext
          items={topLevelGoals.map(goal => goal.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-2">
            {topLevelGoals.map((goal) => {
              // Check if this goal has subgoals
              const hasSubGoals = goal.subGoalCount > 0 || items.some(g => g.parentGoalId === goal.id);
              const isExpanded = expandedGoals.has(goal.id);

              const isFirstGoal = topLevelGoals.indexOf(goal) === 0;
              return (
                <div key={goal.id} className={`space-y-2 ${isFirstGoal ? 'first-goal-container' : ''}`}>
                  {/* Render the sortable goal item */}
                  <SortableGoalItem
                    goal={goal}
                    categories={categories}
                    onEdit={onEdit}
                    onDelete={onDelete}
                    onClick={onClick}
                    onExpandToggle={onExpandToggle}
                    isExpanded={isExpanded}
                    hasSubGoals={hasSubGoals}
                    selectedGoalId={selectedGoalId}
                  />

                  {/* Render subgoals if expanded */}
                  {hasSubGoals && isExpanded && (
                    <div
                      className="pl-6 space-y-2 border-l-2 border-primary/20 ml-2"
                      style={{ marginTop: '8px' }}
                    >
                      {items
                        .filter(subGoal => subGoal.parentGoalId === goal.id)
                        .map(subGoal => {
                          const hasNestedSubGoals = subGoal.subGoalCount > 0 || items.some(g => g.parentGoalId === subGoal.id);
                          const isNestedExpanded = expandedGoals.has(subGoal.id);

                          return (
                            <div key={subGoal.id} className="space-y-2">
                              {/* Render the non-sortable subgoal */}
                              <GoalCard
                                goal={subGoal}
                                categories={categories}
                                onEdit={onEdit}
                                onDelete={onDelete}
                                isCompletedView={isCompletedView}
                                onClick={onClick}
                                onExpandToggle={onExpandToggle}
                                isExpanded={isNestedExpanded}
                                hasSubGoals={hasNestedSubGoals}
                                isSelected={selectedGoalId === subGoal.id}
                              />

                              {/* Recursively render nested subgoals if expanded */}
                              {hasNestedSubGoals && isNestedExpanded && (
                                <div
                                  className="pl-6 space-y-2 border-l-2 border-primary/20 ml-2"
                                  style={{ marginTop: '8px' }}
                                >
                                  {/* This is a simplified version - for deep nesting, you'd want to make this recursive */}
                                  {items
                                    .filter(nestedSubGoal => nestedSubGoal.parentGoalId === subGoal.id)
                                    .map(nestedSubGoal => (
                                      <GoalCard
                                        key={nestedSubGoal.id}
                                        goal={nestedSubGoal}
                                        categories={categories}
                                        onEdit={onEdit}
                                        onDelete={onDelete}
                                        isCompletedView={isCompletedView}
                                        onClick={onClick}
                                        onExpandToggle={onExpandToggle}
                                        isExpanded={expandedGoals.has(nestedSubGoal.id)}
                                        hasSubGoals={nestedSubGoal.subGoalCount > 0 || items.some(g => g.parentGoalId === nestedSubGoal.id)}
                                        isSelected={selectedGoalId === nestedSubGoal.id}
                                      />
                                    ))}
                                </div>
                              )}
                            </div>
                          );
                        })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
}
