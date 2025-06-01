'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, FolderIcon, CheckIcon, X } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuSeparator,
} from "@/components/ui/dropdown-menu";
import { cn } from '@/lib/utils';

// Define types for our component
interface Category {
  id: string;
  name: string;
  color: string;
  order?: number;
}

interface Goal {
  id: string;
  name: string;
  categoryId?: string | null;
  parentGoalId?: string | null;
  category?: {
    id: string;
    name: string;
    color: string;
  } | null;
}

interface HierarchicalFilterDropdownProps {
  categories: Category[];
  goals: Goal[];
  selectedCategoryIds: string[];
  selectedGoalId: string | null; // Keep for backward compatibility
  selectedGoalIds?: string[]; // New prop for multi-select goals
  onSelectionChange: (selection: {
    type: 'category' | 'goal' | 'clear',
    id?: string
  }) => void;
}

export function HierarchicalFilterDropdown({
  categories,
  goals,
  selectedCategoryIds,
  selectedGoalId,
  selectedGoalIds = [], // Default to empty array
  onSelectionChange
}: HierarchicalFilterDropdownProps) {
  // Group goals by category
  // Sort categories by their order first, then group goals
  const goalsByCategory = categories
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(category => {
      // Get all top-level goals for this category (no parentGoalId)
      const topLevelGoals = goals.filter(goal =>
        goal.categoryId === category.id && !goal.parentGoalId
      );

      return {
        category,
        goals: topLevelGoals.sort((a, b) => (a.order || 0) - (b.order || 0))
      };
    });

  // Function to get subgoals for a parent goal
  const getSubgoals = (parentGoalId: string) => {
    return goals.filter(goal => goal.parentGoalId === parentGoalId);
  };

  // Function to check if a goal has subgoals
  const hasSubgoals = (goalId: string) => {
    return goals.some(goal => goal.parentGoalId === goalId);
  };

  // Determine the display text for the dropdown trigger
  const getDisplayText = () => {
    // Get all selected goals (from both selectedGoalId and selectedGoalIds)
    const allSelectedGoalIds = [...selectedGoalIds];
    if (selectedGoalId && !allSelectedGoalIds.includes(selectedGoalId)) {
      allSelectedGoalIds.push(selectedGoalId);
    }

    // Count how many different filter types are active
    let activeFilterCount = 0;
    if (allSelectedGoalIds.length > 0) activeFilterCount++;
    if (selectedCategoryIds.length > 0) activeFilterCount++;

    // If multiple filter types are active, show a summary
    if (activeFilterCount > 1) {
      const goalCount = allSelectedGoalIds.length;
      const categoryCount = selectedCategoryIds.length;
      return `${goalCount} goal${goalCount > 1 ? 's' : ''}, ${categoryCount} categor${categoryCount > 1 ? 'ies' : 'y'}`;
    }
    // If only goals are selected
    else if (allSelectedGoalIds.length > 0) {
      if (allSelectedGoalIds.length === 1) {
        const goal = goals.find(g => g.id === allSelectedGoalIds[0]);
        return goal ? goal.name : 'All';
      } else {
        return `${allSelectedGoalIds.length} goals selected`;
      }
    }
    // If only categories are selected
    else if (selectedCategoryIds.length > 0) {
      if (selectedCategoryIds.length === 1) {
        const category = categories.find(c => c.id === selectedCategoryIds[0]);
        return category ? category.name : 'All';
      } else {
        return `${selectedCategoryIds.length} categories selected`;
      }
    }
    // If nothing is selected
    else {
      return 'All';
    }
  };

  // Render a goal item with its subgoals recursively
  const renderGoalItem = (goal: Goal, level: number = 0) => {
    const subgoals = getSubgoals(goal.id);
    const hasChildren = subgoals.length > 0;

    // Check if this goal is selected (either in selectedGoalId or selectedGoalIds)
    const isSelected = selectedGoalId === goal.id || selectedGoalIds.includes(goal.id);

    if (hasChildren) {
      return (
        <DropdownMenuSub key={goal.id}>
          <DropdownMenuSubTrigger
            className={cn(
              "flex items-center",
              isSelected && "bg-accent font-medium"
            )}
            onClick={(e) => {
              // Prevent the dropdown from opening/closing
              e.preventDefault();
              // Select the goal
              onSelectionChange({ type: 'goal', id: goal.id });
            }}
          >
            <div
              className="w-2 h-2 rounded-full mr-2"
              style={{ backgroundColor: goal.category?.color || '#808080' }}
            />
            <span className="truncate font-medium">{goal.name}</span>
            {isSelected && <CheckIcon className="h-3 w-3 ml-2" />}
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {/* Goal itself as an option */}
              <DropdownMenuItem
                onClick={() => onSelectionChange({ type: 'goal', id: goal.id })}
                className={cn(
                  "flex items-center",
                  isSelected && "bg-accent font-medium"
                )}
              >
                <div
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: goal.category?.color || '#808080' }}
                />
                <span className="font-medium">{goal.name} (Goal)</span>
                {isSelected && <CheckIcon className="h-3 w-3 ml-auto" />}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Subgoals */}
              {subgoals.map(subgoal => (
                <DropdownMenuItem
                  key={subgoal.id}
                  onClick={() => onSelectionChange({ type: 'goal', id: subgoal.id })}
                  className={cn(
                    "flex items-center",
                    (selectedGoalId === subgoal.id || selectedGoalIds.includes(subgoal.id)) && "bg-accent font-medium"
                  )}
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full mr-2 ml-1"
                    style={{ backgroundColor: goal.category?.color || '#808080' }}
                  />
                  {subgoal.name}
                  {(selectedGoalId === subgoal.id || selectedGoalIds.includes(subgoal.id)) && <CheckIcon className="h-3 w-3 ml-auto" />}
                </DropdownMenuItem>
              ))}
            </DropdownMenuSubContent>
          </DropdownMenuPortal>
        </DropdownMenuSub>
      );
    } else {
      return (
        <DropdownMenuItem
          key={goal.id}
          className={cn(
            "flex items-center w-full",
            isSelected && "bg-accent font-medium"
          )}
          onClick={() => onSelectionChange({ type: 'goal', id: goal.id })}
        >
          <div
            className={cn(
              "rounded-full mr-2",
              goal.parentGoalId ? "w-1.5 h-1.5 ml-1" : "w-2 h-2"
            )}
            style={{ backgroundColor: goal.category?.color || '#808080' }}
          />
          {goal.parentGoalId && (
            <span className="inline-block w-4 text-muted-foreground mr-1">↳</span>
          )}
          <span className="truncate">{goal.name}</span>
          {isSelected && <CheckIcon className="h-3 w-3 ml-auto" />}
        </DropdownMenuItem>
      );
    }
  };

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-9"
          >
            <span className="truncate">{getDisplayText()}</span>
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuItem
            onClick={() => onSelectionChange({ type: 'clear' })}
            className={cn(
              !selectedGoalId && selectedCategoryIds.length === 0 && "bg-accent font-medium"
            )}
          >
            All
          </DropdownMenuItem>
          <DropdownMenuSeparator />

          {/* Categories and their goals */}
          {goalsByCategory.map(({ category, goals }) => (
            <DropdownMenuSub key={category.id}>
              <DropdownMenuSubTrigger
                className={cn(
                  "flex items-center",
                  selectedCategoryIds.includes(category.id) && "bg-accent font-medium"
                )}
                onClick={(e) => {
                  // Prevent the dropdown from opening/closing
                  e.preventDefault();
                  // Select the category
                  onSelectionChange({ type: 'category', id: category.id });
                }}
              >
                <div
                  className="h-3 w-3 rounded-full mr-2"
                  style={{ backgroundColor: category.color || '#808080' }}
                />
                <span className="truncate font-semibold">{category.name}</span>
                {selectedCategoryIds.includes(category.id) && (
                  <CheckIcon className="h-3 w-3 ml-auto" />
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {/* Goals in this category */}
                  {goals.length > 0 ? (
                    goals.map(goal => renderGoalItem(goal))
                  ) : (
                    <DropdownMenuItem disabled>No goals in this category</DropdownMenuItem>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
