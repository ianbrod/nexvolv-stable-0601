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
import styles from '../reminders/ReminderGoalDropdown.module.css';

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

interface GoalHierarchicalDropdownProps {
  categories: Category[];
  goals: Goal[];
  selectedCategoryId?: string;
  selectedGoalId?: string;
  onSelectionChange: (selection: { type: 'category' | 'goal' | 'clear', id?: string }) => void;
  disabled?: boolean;
}

export function GoalHierarchicalDropdown({
  categories,
  goals,
  selectedCategoryId,
  selectedGoalId,
  onSelectionChange,
  disabled = false
}: GoalHierarchicalDropdownProps) {
  // Group goals by category - only top-level goals (no subgoals)
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

  // Determine the display text for the dropdown trigger
  const getDisplayText = () => {
    if (selectedGoalId) {
      const selectedGoal = goals.find(g => g.id === selectedGoalId);
      return selectedGoal ? selectedGoal.name : 'None';
    }

    if (selectedCategoryId) {
      const selectedCategory = categories.find(c => c.id === selectedCategoryId);
      return selectedCategory ? selectedCategory.name : 'None';
    }

    return 'None';
  };

  // Render a goal item (no subgoals for goal creation)
  const renderGoalItem = (goal: Goal) => {
    const isSelected = selectedGoalId === goal.id;

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
        <span className={cn(styles.dropdownGoal, "truncate font-medium")}>{goal.name}</span>
        {isSelected && <CheckIcon className="h-3 w-3 ml-auto" />}
      </DropdownMenuItem>
    );
  };

  return (
    <div className="relative">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="outline"
            className="w-full justify-between h-10"
            disabled={disabled}
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
          {goalsByCategory
            .filter(({ goals }) => goals.length > 0) // Only show categories that have goals
            .map(({ category, goals }) => (
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
                    <span className={cn(styles.dropdownCategory, "font-semibold")}>{category.name} (Category)</span>
                    {selectedCategoryId === category.id && <CheckIcon className="h-3 w-3 ml-auto" />}
                  </DropdownMenuItem>

                  <DropdownMenuSeparator />

                  {/* Goals in this category */}
                  {goals.map(goal => renderGoalItem(goal))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          ))}

          {/* Categories without goals - show as direct selectable items */}
          {categories
            .filter(category => !goalsByCategory.find(gc => gc.category.id === category.id && gc.goals.length > 0))
            .sort((a, b) => (a.order || 0) - (b.order || 0))
            .map(category => (
              <DropdownMenuItem
                key={category.id}
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
                <span className={cn(styles.dropdownCategory, "truncate font-semibold")}>{category.name}</span>
                {selectedCategoryId === category.id && <CheckIcon className="h-3 w-3 ml-auto" />}
              </DropdownMenuItem>
            ))}
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
