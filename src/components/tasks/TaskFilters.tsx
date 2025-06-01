'use client';

import React from 'react';
import { TaskPriority, TaskStatus } from '@prisma/client';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { X, Check as CheckIcon } from 'lucide-react';

export type TaskFilterOptions = {
  status: string | null;
  priority: TaskPriority | null;
  goalId: string | null; // Keep for backward compatibility
  goalIds: string[]; // New array for multi-select goals
  categoryIds: string[]; // Array for multi-select categories
  isOverdue?: boolean;
  searchQuery?: string;
  sortBy?: string;
  sortDirection?: 'asc' | 'desc';
};

interface TaskFiltersProps {
  filters: TaskFilterOptions;
  onFilterChange: (filters: TaskFilterOptions) => void;
  goals: { id: string; name: string; parentGoalId?: string | null }[];
}

export function TaskFilters({ filters, onFilterChange, goals }: TaskFiltersProps) {
  const handleStatusChange = (value: string) => {
    onFilterChange({
      ...filters,
      status: value === 'all' ? null : value,
      // No longer need to set isOverdue here as it's moved to priority
    });
  };

  const handlePriorityChange = (value: string) => {
    onFilterChange({
      ...filters,
      priority: value === 'all' ? null : (value === 'overdue' ? null : value as TaskPriority),
      // Set isOverdue flag when 'overdue' is selected from priority dropdown
      isOverdue: value === 'overdue' ? true : false,
    });
  };

  const handleGoalChange = (value: string) => {
    if (value === 'all') {
      // Clear all goal selections
      onFilterChange({
        ...filters,
        goalId: null,
        goalIds: [],
      });
    } else {
      // Add to the goalIds array if not already present
      const newGoalIds = filters.goalIds.includes(value)
        ? filters.goalIds.filter(id => id !== value) // Remove if already selected
        : [...filters.goalIds, value]; // Add if not selected

      onFilterChange({
        ...filters,
        goalId: newGoalIds.length > 0 ? newGoalIds[0] : null, // Keep goalId for backward compatibility
        goalIds: newGoalIds,
      });
    }
  };

  const handleClearFilters = () => {
    onFilterChange({
      status: null,
      priority: null,
      goalId: null,
      goalIds: [], // Clear goalIds array
      categoryIds: [],
      isOverdue: false,
      searchQuery: '',
      sortBy: filters.sortBy,
      sortDirection: filters.sortDirection,
    });
  };

  const hasActiveFilters = filters.status || filters.priority || filters.goalId || filters.goalIds.length > 0 || filters.categoryIds.length > 0 || filters.isOverdue || filters.searchQuery;

  return (
    <div className="flex items-center space-x-4 py-2">
      <div className="w-40">
        <Select
          value={filters.status || 'all'}
          onValueChange={handleStatusChange}
        >
          <SelectTrigger id="status-filter" className="h-9">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value={TaskStatus.TODO}>To Do</SelectItem>
            <SelectItem value={TaskStatus.IN_PROGRESS}>In Progress</SelectItem>
            <SelectItem value={TaskStatus.COMPLETED}>Completed Only</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div className="w-40">
        <Select
          value={filters.priority || 'all'}
          onValueChange={handlePriorityChange}
        >
          <SelectTrigger id="priority-filter" className="h-9">
            <SelectValue placeholder="All Priorities" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Priorities</SelectItem>
            <SelectItem value="overdue">Overdue</SelectItem>
            <SelectItem value={TaskPriority.LOW}>Low</SelectItem>
            <SelectItem value={TaskPriority.MEDIUM}>Medium</SelectItem>
            <SelectItem value={TaskPriority.HIGH}>High</SelectItem>
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
