'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Search, SortAsc, Clock } from 'lucide-react';
import { CategoryData } from './types';

interface CompletedGoalsFiltersProps {
  categories: CategoryData[];
  selectedCategory: string | null;
  searchQuery: string;
  sortBy: 'recent' | 'oldest' | 'alphabetical';
  onCategoryChange: (categoryId: string | null) => void;
  onSearchChange: (query: string) => void;
  onSortChange: (sort: 'recent' | 'oldest' | 'alphabetical') => void;
}

/**
 * Filters component for the Goal Wins page
 *
 * Provides filtering and sorting options for completed goals
 */
export function CompletedGoalsFilters({
  categories,
  selectedCategory,
  searchQuery,
  sortBy,
  onCategoryChange,
  onSearchChange,
  onSortChange
}: CompletedGoalsFiltersProps) {
  return (
    <div className="bg-muted/30 p-4 rounded-lg space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* Search filter */}
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <div className="relative">
            <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              id="search"
              placeholder="Search by name or description..."
              className="pl-8"
              value={searchQuery}
              onChange={(e) => onSearchChange(e.target.value)}
            />
          </div>
        </div>

        {/* Category filter */}
        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select
            value={selectedCategory || ''}
            onValueChange={(value) => onCategoryChange(value || null)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="All Categories" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">All Categories</SelectItem>
              {categories.map((category) => (
                <SelectItem key={category.id} value={category.id}>
                  {category.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Sort options */}
        <div className="space-y-2">
          <Label htmlFor="sort">Sort By</Label>
          <Select
            value={sortBy}
            onValueChange={(value) => onSortChange(value as any)}
          >
            <SelectTrigger id="sort">
              <SelectValue placeholder="Sort By" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="recent">Most Recently Completed</SelectItem>
              <SelectItem value="oldest">Oldest Completed First</SelectItem>
              <SelectItem value="alphabetical">Alphabetical (A-Z)</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>
    </div>
  );
}
