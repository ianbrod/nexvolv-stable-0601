'use client';

import React from 'react';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export type RecurringReminderAction = 'dismiss' | 'delete';

interface RecurringReminderActionDialogProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  reminderTitle: string;
  action: RecurringReminderAction;
  onConfirmSingle: () => Promise<void>;
  onConfirmAll: () => Promise<void>;
  isLoading?: boolean;
}

export function RecurringReminderActionDialog({
  isOpen,
  onOpenChange,
  reminderTitle,
  action,
  onConfirmSingle,
  onConfirmAll,
  isLoading = false,
}: RecurringReminderActionDialogProps) {
  const actionText = action === 'dismiss' ? 'dismiss' : 'delete';
  const actionTextCapitalized = action === 'dismiss' ? 'Dismiss' : 'Delete';
  const actioningText = action === 'dismiss' ? 'Dismissing' : 'Deleting';

  return (
    <AlertDialog open={isOpen} onOpenChange={onOpenChange}>
      <AlertDialogContent onClick={(e) => e.stopPropagation()}>
        <AlertDialogHeader>
          <AlertDialogTitle>{actionTextCapitalized} recurring reminder</AlertDialogTitle>
          <AlertDialogDescription>
            "{reminderTitle}" is a recurring reminder. Would you like to {actionText} just this occurrence or all occurrences?
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter className="flex flex-col sm:flex-row gap-2">
          <AlertDialogCancel
            disabled={isLoading}
            onClick={(e) => e.stopPropagation()}
            className="mt-0"
          >
            Cancel
          </AlertDialogCancel>
          <AlertDialogAction
            onClick={async (e) => {
              e.stopPropagation();
              await onConfirmSingle();
            }}
            disabled={isLoading}
            className="bg-blue-600 hover:bg-blue-700"
          >
            {isLoading ? `${actioningText}...` : `${actionTextCapitalized} this occurrence`}
          </AlertDialogAction>
          <AlertDialogAction
            onClick={async (e) => {
              e.stopPropagation();
              await onConfirmAll();
            }}
            disabled={isLoading}
            className="bg-red-600 hover:bg-red-700"
          >
            {isLoading ? `${actioningText}...` : `${actionTextCapitalized} all occurrences`}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
