'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { TaskPriority, TaskStatus } from '@prisma/client';
import { CheckCircle, Clock, Trash2, X, Flag, ArrowUp, ArrowDown } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface BulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onMarkComplete: () => void;
  onMarkInProgress: () => void;
  onMarkTodo: () => void;
  onDelete: () => void;
  onSetPriorityLow: () => void;
  onSetPriorityMedium: () => void;
  onSetPriorityHigh: () => void;
  isPending: boolean;
}

export function BulkActionBar({
  selectedCount,
  onClearSelection,
  onMarkComplete,
  onMarkInProgress,
  onMarkTodo,
  onDelete,
  onSetPriorityLow,
  onSetPriorityMedium,
  onSetPriorityHigh,
  isPending
}: BulkActionBarProps) {
  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg shadow-lg p-2 z-50 flex items-center gap-2">
      <span className="text-sm font-medium px-2">
        {selectedCount} {selectedCount === 1 ? 'task' : 'tasks'} selected
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onMarkTodo}
          disabled={isPending}
          className="text-blue-600"
          title="Mark as To Do"
        >
          <Clock className="h-4 w-4 mr-1" />
          To Do
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onMarkInProgress}
          disabled={isPending}
          className="text-purple-600"
          title="Mark as In Progress"
        >
          <Clock className="h-4 w-4 mr-1" />
          In Progress
        </Button>

        <Button
          variant="outline"
          size="sm"
          onClick={onMarkComplete}
          disabled={isPending}
          className="text-green-600"
          title="Mark as Complete"
        >
          <CheckCircle className="h-4 w-4 mr-1" />
          Complete
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              className="text-amber-600"
              title="Set Priority"
            >
              <Flag className="h-4 w-4 mr-1" />
              Priority
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="center">
            <DropdownMenuItem
              onClick={onSetPriorityHigh}
              disabled={isPending}
              className="text-red-600 cursor-pointer"
            >
              <ArrowUp className="h-4 w-4 mr-2" />
              High
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onSetPriorityMedium}
              disabled={isPending}
              className="text-amber-600 cursor-pointer"
            >
              <Flag className="h-4 w-4 mr-2" />
              Medium
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={onSetPriorityLow}
              disabled={isPending}
              className="text-blue-600 cursor-pointer"
            >
              <ArrowDown className="h-4 w-4 mr-2" />
              Low
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          disabled={isPending}
          className="text-destructive"
          title="Delete selected tasks"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isPending}
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
