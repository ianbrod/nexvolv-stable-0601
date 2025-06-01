'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { GoalCardData, CategoryData } from './types';
import { CompletedGoalsHeader } from './CompletedGoalsHeader';
import { CompletedGoalsList } from './CompletedGoalsList';
import { Button } from '@/components/ui/button';
import { ArrowLeft } from 'lucide-react';
import { CategoriesPanel } from './CategoriesPanel';

interface CompletedGoalsClientWrapperProps {
  goals: GoalCardData[];
  categories: CategoryData[];
}

/**
 * Client wrapper component for the Completed Goals Repository page
 *
 * Handles client-side state and interactions for the completed goals view
 */
export function CompletedGoalsClientWrapper({
  goals,
  categories
}: CompletedGoalsClientWrapperProps) {
  const router = useRouter();

  // State for filtering and sorting
  const [filteredGoals, setFilteredGoals] = useState<GoalCardData[]>(goals);
  const [selectedCategoryIds, setSelectedCategoryIds] = useState<string[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState<'recent' | 'oldest' | 'alphabetical'>('recent');
  const [expandedGoals, setExpandedGoals] = useState<Set<string>>(new Set());
  const [categorySelectMode, setCategorySelectMode] = useState(false);

  // Handle ESC key to exit category select mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && categorySelectMode) {
        setCategorySelectMode(false);
        // If multiple categories are selected, keep only the first one
        if (selectedCategoryIds.length > 1) {
          setSelectedCategoryIds([selectedCategoryIds[0]]);
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [categorySelectMode, selectedCategoryIds]);

  // Apply filters and sorting whenever dependencies change
  useEffect(() => {
    let result = [...goals];

    // Apply category filter
    if (selectedCategoryIds.length > 0) {
      // For parent goals, check if they match any of the selected categories
      result = result.filter(goal => {
        if (!goal.parentGoalId) {
          return goal.categoryId ? selectedCategoryIds.includes(goal.categoryId) : false;
        } else {
          // For sub-goals, include them if their parent matches any of the selected categories
          const parentGoal = goals.find(g => g.id === goal.parentGoalId);
          return parentGoal?.categoryId ? selectedCategoryIds.includes(parentGoal.categoryId) : false;
        }
      });
    }

    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(goal =>
        goal.name.toLowerCase().includes(query) ||
        (goal.description && goal.description.toLowerCase().includes(query))
      );
    }

    // Apply sorting
    result.sort((a, b) => {
      if (sortBy === 'recent') {
        // Sort by completion date (most recent first)
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
      } else if (sortBy === 'oldest') {
        // Sort by completion date (oldest first)
        return new Date(a.updatedAt).getTime() - new Date(b.updatedAt).getTime();
      } else {
        // Sort alphabetically
        return a.name.localeCompare(b.name);
      }
    });

    setFilteredGoals(result);
  }, [goals, selectedCategoryIds, searchQuery, sortBy]);

  // Handle category selection
  const handleCategoryClick = (categoryId: string | null) => {
    if (categoryId === null) {
      // "All Categories" option - clear selection
      setSelectedCategoryIds([]);
    } else {
      if (categorySelectMode) {
        // In select mode: Toggle the category in the selection (multi-select)
        setSelectedCategoryIds(prev => {
          const isSelected = prev.includes(categoryId);
          if (isSelected) {
            // Remove the category if it's already selected
            return prev.filter(id => id !== categoryId);
          } else {
            // Add the category if it's not selected
            return [...prev, categoryId];
          }
        });
      } else {
        // In normal mode: Select only this category (single-select)
        setSelectedCategoryIds([categoryId]);
      }
    }
  };

  // Handle clearing all selected categories
  const handleClearCategorySelection = () => {
    setSelectedCategoryIds([]);
  };

  // Handle category select mode toggle
  const handleCategorySelectModeToggle = () => {
    setCategorySelectMode(prev => {
      const newMode = !prev;
      // If exiting select mode and multiple categories are selected, keep only the first one
      if (!newMode && selectedCategoryIds.length > 1) {
        setSelectedCategoryIds([selectedCategoryIds[0]]);
      }
      return newMode;
    });
  };

  // Handle categories reordering (not used in this view but required by the component)
  const handleCategoriesReordered = (newOrder: CategoryData[]) => {
    // No need to implement for completed goals view
  };

  // Handle search input
  const handleSearchChange = (query: string) => {
    setSearchQuery(query);
  };

  // Handle sort selection
  const handleSortChange = (sort: 'recent' | 'oldest' | 'alphabetical') => {
    setSortBy(sort);
  };

  // Handle goal card click
  const handleGoalClick = (goalId: string) => {
    // Toggle expanded state
    setExpandedGoals(prev => {
      const newSet = new Set(prev);
      if (newSet.has(goalId)) {
        newSet.delete(goalId);
      } else {
        newSet.add(goalId);
      }
      return newSet;
    });
  };

  // Handle expand toggle
  const handleExpandToggle = (goalId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    handleGoalClick(goalId);
  };

  // Handle collapse all expanded goals
  const handleCollapseAll = () => {
    setExpandedGoals(new Set());
    console.log('All completed goals collapsed');
  };

  return (
    <div className="flex h-full min-h-[calc(100vh-6rem)]">
      {/* Categories Panel (Left) */}
      <CategoriesPanel
        categories={categories}
        selectedCategoryIds={selectedCategoryIds}
        onCategoryClick={handleCategoryClick}
        onCategoriesReordered={handleCategoriesReordered}
        onClearSelection={handleClearCategorySelection}
        selectMode={categorySelectMode}
        onSelectModeToggle={handleCategorySelectModeToggle}
      />

      {/* Main Content (Right) */}
      <div className="flex-1 px-4 flex flex-col">
        {/* Back button and header - Fixed height */}
        <div className="flex-shrink-0">
          <div className="flex items-center mb-2">
            <Button variant="ghost" asChild className="mr-2 -ml-4">
              <Link href="/goals">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Goals
              </Link>
            </Button>
          </div>

          {/* Header with title and actions */}
          <CompletedGoalsHeader
            goalCount={filteredGoals.length}
            searchQuery={searchQuery}
            onSearchChange={handleSearchChange}
            onCollapseAll={handleCollapseAll}
            hasExpandedGoals={expandedGoals.size > 0}
          />
        </div>

        {/* Goals list - Flexible height */}
        <div className="flex-grow overflow-auto h-full space-y-4 pb-8">
          <CompletedGoalsList
            goals={filteredGoals}
            categories={categories}
            expandedGoals={expandedGoals}
            onExpandToggle={handleExpandToggle}
          />
        </div>
      </div>
    </div>
  );
}
