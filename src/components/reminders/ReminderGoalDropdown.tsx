'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { ChevronDown, CheckIcon } from 'lucide-react';
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
import styles from './ReminderGoalDropdown.module.css';

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
  order?: number;
}

interface ReminderComprehensiveDropdownProps {
  categories?: Category[];
  goals?: Goal[];
  selectedCategoryId?: string;
  selectedGoalId?: string;
  onSelectionChange: (selection: { type: 'category' | 'goal' | 'clear', id?: string }) => void;
}

export function ReminderComprehensiveDropdown({
  categories = [],
  goals = [],
  selectedCategoryId,
  selectedGoalId,
  onSelectionChange
}: ReminderComprehensiveDropdownProps) {
  // Group goals by category
  // Sort categories by their order first, then group goals
  const goalsByCategory = (categories || [])
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(category => {
      // Get all top-level goals for this category (no parentGoalId)
      const topLevelGoals = (goals || []).filter(goal =>
        goal.categoryId === category.id && !goal.parentGoalId
      );

      return {
        category,
        goals: topLevelGoals.sort((a, b) => (a.order || 0) - (b.order || 0))
      };
    });

  // Function to get subgoals for a parent goal
  const getSubgoals = (parentGoalId: string) => {
    return (goals || []).filter(goal => goal.parentGoalId === parentGoalId);
  };

  // Function to check if a goal has subgoals
  const hasSubgoals = (goalId: string) => {
    return (goals || []).some(goal => goal.parentGoalId === goalId);
  };

  // Determine the display text for the dropdown trigger
  const getDisplayText = () => {
    if (selectedGoalId) {
      const selectedGoal = (goals || []).find(g => g.id === selectedGoalId);
      return selectedGoal ? selectedGoal.name : 'None';
    }

    if (selectedCategoryId) {
      const selectedCategory = (categories || []).find(c => c.id === selectedCategoryId);
      return selectedCategory ? selectedCategory.name : 'None';
    }

    return 'None';
  };

  // Render a goal item with its subgoals recursively
  const renderGoalItem = (goal: Goal, level: number = 0) => {
    const subgoals = getSubgoals(goal.id);
    const hasChildren = subgoals.length > 0;
    const isSelected = selectedGoalId === goal.id;

    if (hasChildren) {
      return (
        <DropdownMenuSub key={goal.id}>
          <DropdownMenuSubTrigger
            className={cn(
              styles.dropdownGoal,
              "flex items-center",
              isSelected && "bg-accent font-medium"
            )}
            data-dropdown-type="goal"
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
            <span className={cn(styles.dropdownGoal, "truncate font-medium")}>{goal.name}</span>
            {isSelected && <CheckIcon className="h-3 w-3 ml-2" />}
          </DropdownMenuSubTrigger>
          <DropdownMenuPortal>
            <DropdownMenuSubContent>
              {/* Goal itself as an option */}
              <DropdownMenuItem
                onClick={() => onSelectionChange({ type: 'goal', id: goal.id })}
                className={cn(
                  styles.dropdownGoal,
                  "flex items-center",
                  isSelected && "bg-accent font-medium"
                )}
                data-dropdown-type="goal"
              >
                <div
                  className="w-2 h-2 rounded-full mr-2"
                  style={{ backgroundColor: goal.category?.color || '#808080' }}
                />
                <span className={cn(styles.dropdownGoal, "font-medium")}>{goal.name} (Goal)</span>
                {isSelected && <CheckIcon className="h-3 w-3 ml-auto" />}
              </DropdownMenuItem>

              <DropdownMenuSeparator />

              {/* Subgoals */}
              {subgoals.map(subgoal => (
                <DropdownMenuItem
                  key={subgoal.id}
                  onClick={() => onSelectionChange({ type: 'goal', id: subgoal.id })}
                  className={cn(
                    styles.dropdownSubgoal,
                    "flex items-center",
                    selectedGoalId === subgoal.id && "bg-accent font-medium"
                  )}
                  data-dropdown-type="subgoal"
                >
                  <div
                    className="w-1.5 h-1.5 rounded-full mr-2 ml-1"
                    style={{ backgroundColor: goal.category?.color || '#808080' }}
                  />
                  <span className={styles.dropdownSubgoal}>{subgoal.name}</span>
                  {selectedGoalId === subgoal.id && <CheckIcon className="h-3 w-3 ml-auto" />}
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
          onClick={() => onSelectionChange({ type: 'goal', id: goal.id })}
          className={cn(
            styles.dropdownGoal,
            "flex items-center",
            isSelected && "bg-accent font-medium"
          )}
          data-dropdown-type="goal"
        >
          <div
            className="w-2 h-2 rounded-full mr-2"
            style={{ backgroundColor: goal.category?.color || '#808080' }}
          />
          <span className={styles.dropdownGoal}>{goal.name}</span>
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
            className="w-full justify-between h-10"
          >
            <span className="truncate">{getDisplayText()}</span>
            <ChevronDown className="h-4 w-4 ml-2 opacity-50" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent className="w-56" align="start">
          <DropdownMenuItem
            onClick={() => onSelectionChange({ type: 'clear' })}
            className={cn(
              !selectedGoalId && !selectedCategoryId && "bg-accent font-medium"
            )}
          >
            None
          </DropdownMenuItem>

          <DropdownMenuSeparator />

          {/* Categories and their goals */}
          {goalsByCategory.map(({ category, goals }) => (
            <DropdownMenuSub key={category.id}>
              <DropdownMenuSubTrigger
                className={cn(
                  styles.dropdownCategory,
                  "flex items-center",
                  selectedCategoryId === category.id && "bg-accent font-medium"
                )}
                data-dropdown-type="category"
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
                <span className={cn(styles.dropdownCategory, "truncate")}>{category.name}</span>
                {selectedCategoryId === category.id && (
                  <CheckIcon className="h-3 w-3 ml-auto" />
                )}
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  {/* Category itself as an option */}
                  <DropdownMenuItem
                    onClick={() => onSelectionChange({ type: 'category', id: category.id })}
                    className={cn(
                      styles.dropdownCategory,
                      "flex items-center",
                      selectedCategoryId === category.id && "bg-accent font-medium"
                    )}
                    data-dropdown-type="category"
                  >
                    <div
                      className="h-3 w-3 rounded-full mr-2"
                      style={{ backgroundColor: category.color || '#808080' }}
                    />
                    <span className={cn(styles.dropdownCategory, "font-medium")}>{category.name} (Category)</span>
                    {selectedCategoryId === category.id && <CheckIcon className="h-3 w-3 ml-auto" />}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Goals in this category */}
                  {goals.map(goal => renderGoalItem(goal, 0))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
