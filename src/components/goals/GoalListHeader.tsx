'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';
import { Trophy, ChevronUp } from 'lucide-react';
import { NewGoalButton } from './NewGoalButton';
import { SearchBar } from './SearchBar';
import { GoalListHeaderProps } from './goal-list-types';

/**
 * Header component for the goal list
 */
export function GoalListHeader({
  categories,
  parentGoals = [],
  onCollapseAll,
  hasExpandedGoals = false,
  searchQuery,
  onSearchChange
}: GoalListHeaderProps) {
  return (
    <div className="mb-4 space-y-4">
      {/* Title and Action Buttons Row */}
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">
          Goals
        </h2>
        <div className="flex gap-2">
        {/* Collapse All Button - only show if there are expanded goals */}
        {hasExpandedGoals && onCollapseAll && (
          <Button
            variant="outline"
            size="sm"
            onClick={onCollapseAll}
            className="bg-gray-100 hover:bg-gray-200 border-gray-300 text-gray-700 dark:bg-gray-800 dark:hover:bg-gray-700 dark:border-gray-600 dark:text-gray-300"
          >
            <ChevronUp className="mr-2 h-4 w-4" />
            Collapse All
          </Button>
        )}

        {/* Completed Goals Wins Link */}
        <Button
          variant="outline"
          size="sm"
          asChild
          className="bg-amber-100 hover:bg-amber-200 border-2 border-amber-300 text-black dark:bg-amber-700/30 dark:hover:bg-amber-700/50 dark:border-amber-700 dark:text-amber-300"
        >
          <Link href="/goals/completed">
            <Trophy className="mr-2 h-4 w-4" style={{ color: '#F59E0B' }} />
            Wins
          </Link>
        </Button>

        {/* New Goal Button */}
        <NewGoalButton
          categories={categories}
          parentGoals={parentGoals}
        />
        </div>
      </div>

      {/* Search Bar Row */}
      <div className="w-full">
        <SearchBar
          searchQuery={searchQuery || ''}
          onSearchChange={onSearchChange || (() => {})}
          placeholder="Search goals by name, description, or tags..."
          className="max-w-md"
        />
      </div>
    </div>
  );
}
