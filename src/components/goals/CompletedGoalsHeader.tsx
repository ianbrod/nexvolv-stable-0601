'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { SearchBar } from './SearchBar';
import { Filter, Download, Share2, ChevronUp } from 'lucide-react';

interface CompletedGoalsHeaderProps {
  goalCount: number;
  searchQuery: string;
  onSearchChange: (query: string) => void;
  onCollapseAll?: () => void;
  hasExpandedGoals?: boolean;
}

/**
 * Header component for the Completed Goals Repository page
 *
 * Styled to match the main goals page header with search functionality
 */
export function CompletedGoalsHeader({
  goalCount,
  searchQuery,
  onSearchChange,
  onCollapseAll,
  hasExpandedGoals = false
}: CompletedGoalsHeaderProps) {
  return (
    <div className="mb-4 space-y-4">
      {/* Title and count */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold">Goal Wins</h1>
          <p className="text-muted-foreground mt-1">
            {goalCount} {goalCount === 1 ? 'achievement' : 'achievements'} to celebrate
          </p>
        </div>

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
      </div>

      {/* Search Bar Row - matching main goals page layout */}
      <div className="w-full">
        <SearchBar
          searchQuery={searchQuery}
          onSearchChange={onSearchChange}
          placeholder="Search your wins by title, description, or category..."
          className="max-w-md"
        />
      </div>
    </div>
  );
}
