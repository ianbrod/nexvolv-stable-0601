'use client';

import React from 'react';
import { Reminder } from '@/types';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import { SoftSquareIcon } from '@/components/ui/soft-square-icon';

interface ReminderDetailsModalProps {
  isOpen: boolean;
  onClose: () => void;
  reminder: Reminder;
}

export function ReminderDetailsModal({ isOpen, onClose, reminder }: ReminderDetailsModalProps) {
  // Get category color
  const getCategoryColor = (): string => {
    // If reminder has a direct category with a color
    if (reminder.category && typeof reminder.category === 'object' && reminder.category.color) {
      return reminder.category.color;
    }

    // If reminder has a goal with a category with a color
    if (reminder.goal && typeof reminder.goal === 'object' &&
        reminder.goal.category && typeof reminder.goal.category === 'object' &&
        reminder.goal.category.color) {
      return reminder.goal.category.color;
    }

    // No category color found
    return '';
  };

  const categoryColor = getCategoryColor();
  const isVirtualInstance = 'isVirtualInstance' in reminder && reminder.isVirtualInstance === true;

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <SoftSquareIcon
              size={12}
              color={categoryColor || '#808080'}
              isCompleted={reminder.isCompleted}
              isRecurring={reminder.isRecurring || isVirtualInstance}
              isVirtualInstance={isVirtualInstance}
            />
            {reminder.title}
          </DialogTitle>
          {reminder.description && (
            <DialogDescription>{reminder.description}</DialogDescription>
          )}
        </DialogHeader>
        <div className="space-y-4 py-4">
          {/* Status and Type */}
          <div className="flex flex-wrap gap-2">
            <Badge variant={reminder.isCompleted ? 'default' : 'outline'}
                  className={cn("px-2 py-1",
                    reminder.isCompleted
                      ? "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400"
                      : "border-red-300 text-red-600 dark:border-red-700 dark:text-red-400")}>
              {reminder.isCompleted ? 'Completed' : 'Pending'}
            </Badge>
            {reminder.isRecurring && (
              <Badge variant="secondary" className="px-2 py-1">
                Recurring: {reminder.recurrence}
              </Badge>
            )}
            {isVirtualInstance && (
              <Badge variant="outline" className="px-2 py-1 border-blue-300 text-blue-600 dark:border-blue-700 dark:text-blue-400">
                Recurring Instance
              </Badge>
            )}
          </div>

          {/* Due Date */}
          <div className="text-sm">
            <span className="font-medium">Due Date: </span>
            {reminder.dueDate && format(new Date(reminder.dueDate), 'PPP p')}
          </div>

          {/* Category */}
          {reminder.category && (
            <div className="text-sm">
              <span className="font-medium">Category: </span>
              <span className="flex items-center gap-1">
                <SoftSquareIcon
                  size={8}
                  color={categoryColor || '#808080'}
                  isCompleted={reminder.isCompleted}
                  isRecurring={reminder.isRecurring || isVirtualInstance}
                  isVirtualInstance={isVirtualInstance}
                />
                {typeof reminder.category === 'object' ? reminder.category.name : 'Unknown'}
              </span>
            </div>
          )}

          {/* Related Goal */}
          {reminder.goal && (
            <div className="text-sm">
              <span className="font-medium">Related Goal: </span>
              {typeof reminder.goal === 'object' ? reminder.goal.name : 'Unknown'}
            </div>
          )}

          {/* Created/Updated Dates */}
          <div className="text-xs text-muted-foreground mt-4 pt-2 border-t">
            <div>Created: {format(new Date(reminder.createdAt), 'PPP')}</div>
            <div>Last Updated: {format(new Date(reminder.updatedAt), 'PPP')}</div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
