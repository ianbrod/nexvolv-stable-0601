'use client';

import React from 'react';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal, Edit, Trash2, FileText, LineChart } from 'lucide-react';
import { GoalCardData } from './types';

interface GoalCardActionsProps {
  goal: GoalCardData;
  isSubGoal: boolean;
  isCompletedView?: boolean;
  onEdit?: (goal: GoalCardData) => void;
  onDelete?: (id: string) => void;
  onOpenDetails: () => void;
  onOpenDeleteAlert: () => void;
  compactView?: boolean;
}

/**
 * Actions dropdown menu for the GoalCard
 */
export function GoalCardActions({
  goal,
  isSubGoal,
  isCompletedView,
  onEdit,
  onOpenDetails,
  onOpenDeleteAlert,
  compactView = false
}: GoalCardActionsProps) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
        <Button
          variant="ghost"
          size="icon"
          className={`${compactView ? 'h-6 w-6' : 'h-8 w-8'} relative z-20 hover:bg-muted/80 transition-colors duration-150`}
          aria-label="Goal actions menu"
        >
          <MoreHorizontal className={`${compactView ? 'h-3.5 w-3.5' : 'h-4 w-4'}`} aria-hidden="true" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {/* Details option */}
        <DropdownMenuItem
          onClick={(e) => {
            e.stopPropagation();
            onOpenDetails();
          }}
        >
          <FileText className="mr-2 h-4 w-4" /> Details
        </DropdownMenuItem>

        {/* Progress History link - for parent goals only */}
        {!isSubGoal ? (
          <Link href={`/goals/${goal.id}`} onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem>
              <LineChart className="mr-2 h-4 w-4" /> Progress History
            </DropdownMenuItem>
          </Link>
        ) : (
          <Link href={`/goals/${goal.parentGoalId}`} onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem>
              <LineChart className="mr-2 h-4 w-4" /> Parent Goal Progress
            </DropdownMenuItem>
          </Link>
        )}

        <DropdownMenuSeparator />

        {onEdit && (
          <DropdownMenuItem onClick={(e) => { e.stopPropagation(); onEdit(goal); }}>
            <Edit className="mr-2 h-4 w-4" /> Edit
          </DropdownMenuItem>
        )}
        {onOpenDeleteAlert && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-destructive focus:text-destructive"
              onClick={(e) => { e.stopPropagation(); onOpenDeleteAlert(); }}
            >
              <Trash2 className="mr-2 h-4 w-4" /> Delete
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
