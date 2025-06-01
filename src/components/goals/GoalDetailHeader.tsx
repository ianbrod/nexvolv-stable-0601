'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { AlertDialogTrigger } from "@/components/ui/alert-dialog";
import { Edit, Trash2, PlusCircle, Calendar, ArrowLeft } from 'lucide-react';
import { GoalDetailHeaderProps } from './goal-detail-types';

/**
 * Header component for the goal detail page
 */
export function GoalDetailHeader({
  goal,
  onEdit,
  isPending
}: GoalDetailHeaderProps) {
  const router = useRouter();

  // Get category color with fallback
  const categoryColor = goal.category?.color || '#808080';

  // Format deadline with error handling
  const formatDeadline = (deadline: Date | string | null) => {
    if (!deadline) return null;
    try {
      return format(new Date(deadline), 'PPP');
    } catch (error) {
      console.error("Error formatting deadline:", error);
      return "Invalid date";
    }
  };

  // Handle back button click
  const handleBackClick = () => {
    router.push('/goals');
  };

  // Get appropriate progress color based on completion percentage
  const getProgressColor = (progress: number) => {
    if (progress >= 100) return "bg-[var(--chart-3)]"; // Complete - green
    if (progress >= 75) return "bg-[var(--chart-2)]";  // Almost complete - blue
    if (progress >= 25) return "bg-[var(--chart-1)]";  // In progress - purple
    return "bg-[var(--chart-0)]";                      // Just started - gray
  };

  return (
    <div className="flex flex-col sm:flex-row justify-between items-start gap-3 mb-4">
      <div>
        <div className="flex items-center gap-2 mb-2">
          {/* Back button */}
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBackClick}
            className="p-0 h-8 w-8 mr-1"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>

          {/* Category color indicator */}
          <div
            className="w-3 h-3 rounded-full flex-shrink-0"
            style={{ backgroundColor: categoryColor }}
            title={goal.category?.name || 'Uncategorized'}
          />
          <div className="flex items-center">
            <h1 className="text-3xl font-bold">{goal.name}</h1>

            {/* Completion status badge */}
            {goal.progress === 100 && (
              <span className="ml-2 px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--chart-3)] text-white">
                Completed
              </span>
            )}
          </div>

          {/* Category and timeframe - inline with header */}
          <p className="text-sm text-muted-foreground">
            {goal.category?.name || 'Uncategorized'}
            {goal.timeframe ? ` • ${goal.timeframe}` : ''}
          </p>
        </div>


      </div>

      {/* Action Buttons for the Goal */}
      <div className="flex flex-wrap gap-2 mt-2 sm:mt-0">
        <Button
          variant="outline"
          size="sm"
          onClick={onEdit}
          disabled={isPending}
          className="h-9"
        >
          <Edit className="h-4 w-4 mr-2" /> Edit
        </Button>



        <AlertDialogTrigger asChild>
          <Button
            variant="outline"
            size="sm"
            disabled={isPending}
            className="h-9 border-destructive text-destructive hover:bg-destructive/10"
          >
            <Trash2 className="h-4 w-4 mr-2" /> Delete
          </Button>
        </AlertDialogTrigger>
      </div>
    </div>
  );
}
