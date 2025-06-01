'use client';

import React, { useState } from 'react';
import { Reminder } from '@/types';
import { useReminders } from '@/contexts/ReminderContext';

import { ReminderEditModal } from './ReminderEditModal';
import { ReminderDetailsModal } from './ReminderDetailsModal';
import { RecurringReminderActionDialog } from './RecurringReminderActionDialog';
import { cn } from '@/lib/utils';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
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
import { Button } from '@/components/ui/button';
import { Edit, Trash, X, MoreVertical, Info } from 'lucide-react';

interface ReminderActionMenuProps {
  reminder: Reminder;
  triggerElement?: React.ReactNode;
  align?: 'start' | 'center' | 'end';
  side?: 'top' | 'right' | 'bottom' | 'left';
  onActionComplete?: () => Promise<void>;
  onOpenChange?: (open: boolean) => void;
  onOpenEditModal?: (reminder: Reminder) => void;
  onOpenDetailsModal?: (reminder: Reminder) => void;
}

export function ReminderActionMenu({
  reminder,
  triggerElement,
  align = 'center',
  side = 'top',
  onActionComplete,
  onOpenChange,
  onOpenEditModal,
  onOpenDetailsModal
}: ReminderActionMenuProps) {

  const { dismissReminderItem, deleteReminder, isLoading } = useReminders();
  const [localLoading, setLocalLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [detailsModalOpen, setDetailsModalOpen] = useState(false);
  const [recurringDialogOpen, setRecurringDialogOpen] = useState(false);
  const [currentAction, setCurrentAction] = useState<'dismiss' | 'delete'>('dismiss');

  // Check if this is a virtual instance or recurring reminder
  const isVirtualInstance = 'isVirtualInstance' in reminder && reminder.isVirtualInstance === true;
  const isRecurring = reminder.isRecurring || isVirtualInstance;

  // Note: Complete action is not used in this component

  // Handle dismiss action
  const handleDismiss = async () => {
    // For recurring reminders, show the confirmation dialog
    if (isRecurring) {
      setCurrentAction('dismiss');
      setRecurringDialogOpen(true);
      return;
    }

    // For non-recurring reminders, dismiss directly
    await dismissSingleReminder();
  };

  // Dismiss just this single reminder
  const dismissSingleReminder = async () => {
    setLocalLoading(true);
    try {
      console.log("ReminderActionMenu: Dismissing single reminder ID:", reminder.id);
      const result = await dismissReminderItem(reminder.id);

      if (result.success) {
        console.log("Reminder dismissed successfully");
        if (onActionComplete) await onActionComplete();
      } else {
        const errorMessage = result.message || result.error?.message || "Failed to dismiss reminder";
        console.error("Failed to dismiss reminder:", errorMessage);
      }
    } catch (error) {
      console.error("Error dismissing reminder:", error);
    } finally {
      setLocalLoading(false);
      setRecurringDialogOpen(false);
    }
  };

  // Dismiss all occurrences of this recurring reminder
  const dismissAllReminders = async () => {
    setLocalLoading(true);
    try {
      // For virtual instances, we need to get the original reminder ID
      const originalId = isVirtualInstance && reminder.originalReminderId
        ? reminder.originalReminderId
        : reminder.id;

      console.log("ReminderActionMenu: Dismissing all occurrences of reminder ID:", originalId);
      // Pass true as the second parameter to indicate dismissing all occurrences
      const result = await dismissReminderItem(originalId, true);

      if (result.success) {
        console.log("All reminders dismissed successfully");
        if (onActionComplete) await onActionComplete();
      } else {
        const errorMessage = result.message || result.error?.message || "Failed to dismiss reminders";
        console.error("Failed to dismiss reminders:", errorMessage);
      }
    } catch (error) {
      console.error("Error dismissing all reminders:", error);
    } finally {
      setLocalLoading(false);
      setRecurringDialogOpen(false);
    }
  };

  // Note: Snooze action is not used in this component

  // Handle delete action
  const handleDelete = async () => {
    console.log("ReminderActionMenu: handleDelete called for reminder ID:", reminder.id);

    // For recurring reminders, show the confirmation dialog
    if (isRecurring) {
      setCurrentAction('delete');
      setRecurringDialogOpen(true);
      return;
    }

    // For non-recurring reminders, show the regular delete dialog
    setDeleteDialogOpen(true);
  };

  // Delete just this single reminder
  const deleteSingleReminder = async () => {
    console.log("ReminderActionMenu: Deleting single reminder ID:", reminder.id);
    setLocalLoading(true);

    try {
      console.log("ReminderActionMenu: Calling deleteReminder from context");
      const result = await deleteReminder(reminder.id);
      console.log("ReminderActionMenu: deleteReminder result:", result);

      if (result.success) {
        console.log("ReminderActionMenu: Delete successful");

        // Call onActionComplete to refresh the UI
        if (onActionComplete) {
          console.log("ReminderActionMenu: Calling onActionComplete callback");
          try {
            await onActionComplete();
            console.log("ReminderActionMenu: onActionComplete callback executed successfully");
          } catch (callbackError) {
            console.error("ReminderActionMenu: Error in onActionComplete callback:", callbackError);
            // Still consider the operation successful since the deletion worked
          }
        }
      } else {
        const errorMessage = result.message || result.error?.message || "Failed to delete reminder";
        console.error("ReminderActionMenu: Delete failed with error:", errorMessage);
      }
    } catch (error) {
      console.error("ReminderActionMenu: Exception during delete operation:", error);
    } finally {
      setLocalLoading(false);
      setDeleteDialogOpen(false);
      setRecurringDialogOpen(false);
    }
  };

  // Delete all occurrences of this recurring reminder
  const deleteAllReminders = async () => {
    setLocalLoading(true);
    try {
      // For virtual instances, we need to get the original reminder ID
      const originalId = isVirtualInstance && reminder.originalReminderId
        ? reminder.originalReminderId
        : reminder.id;

      console.log("ReminderActionMenu: Deleting all occurrences of reminder ID:", originalId);
      const result = await deleteReminder(originalId);

      if (result.success) {
        console.log("All reminders deleted successfully");
        if (onActionComplete) await onActionComplete();
      } else {
        const errorMessage = result.message || result.error?.message || "Failed to delete reminders";
        console.error("Failed to delete reminders:", errorMessage);
      }
    } catch (error) {
      console.error("Error deleting all reminders:", error);
    } finally {
      setLocalLoading(false);
      setRecurringDialogOpen(false);
    }
  };

  // Function to stop event propagation
  const stopPropagation = (e: React.MouseEvent) => {
    e.stopPropagation();
  };

  return (
    <>
      <DropdownMenu onOpenChange={onOpenChange}>
        <DropdownMenuTrigger asChild onClick={stopPropagation}>
          {triggerElement || (
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={stopPropagation}>
              <MoreVertical className="h-4 w-4" />
            </Button>
          )}
        </DropdownMenuTrigger>
        <DropdownMenuContent align={align} side={side} onClick={stopPropagation}>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenDetailsModal) {
                onOpenDetailsModal(reminder);
              } else {
                setDetailsModalOpen(true);
              }
            }}
            disabled={isLoading || localLoading}
          >
            <Info className="h-4 w-4 mr-2 text-gray-600" />
            View Details
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleDismiss();
            }}
            disabled={isLoading || localLoading || reminder.isCompleted}
            className={cn(
              reminder.isCompleted && "opacity-50 cursor-not-allowed",
              localLoading && "bg-gray-100"
            )}
          >
            <X className={cn(
              "h-4 w-4 mr-2",
              localLoading ? "text-gray-400" : "text-red-600",
              reminder.isCompleted && "text-gray-400"
            )} />
            {localLoading ? "Dismissing..." : "Dismiss"}
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              if (onOpenEditModal) {
                onOpenEditModal(reminder);
              } else {
                setEditModalOpen(true);
              }
            }}
            disabled={isLoading || localLoading}
          >
            <Edit className="h-4 w-4 mr-2 text-blue-600" />
            Edit
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={(e) => {
              e.stopPropagation();
              handleDelete();
            }}
            disabled={isLoading || localLoading}
          >
            <Trash className="h-4 w-4 mr-2 text-red-600" />
            Delete
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Delete Confirmation Dialog for non-recurring reminders */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent onClick={(e) => e.stopPropagation()}>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the reminder "{reminder.title}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel
              disabled={localLoading}
              onClick={(e) => e.stopPropagation()}
            >
              Cancel
            </AlertDialogCancel>
            <AlertDialogAction
              onClick={async (e) => {
                e.stopPropagation();
                await deleteSingleReminder();
              }}
              disabled={localLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {localLoading ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Recurring Reminder Action Dialog for recurring reminders */}
      <RecurringReminderActionDialog
        isOpen={recurringDialogOpen}
        onOpenChange={setRecurringDialogOpen}
        reminderTitle={reminder.title}
        action={currentAction}
        onConfirmSingle={currentAction === 'dismiss' ? dismissSingleReminder : deleteSingleReminder}
        onConfirmAll={currentAction === 'dismiss' ? dismissAllReminders : deleteAllReminders}
        isLoading={localLoading}
      />

      {/* Edit Modal */}
      <ReminderEditModal
        isOpen={editModalOpen}
        onClose={() => {
          setEditModalOpen(false);
          if (onActionComplete) onActionComplete();
        }}
        reminder={reminder}
      />

      {/* Details Modal */}
      <ReminderDetailsModal
        isOpen={detailsModalOpen}
        onClose={() => setDetailsModalOpen(false)}
        reminder={reminder}
      />
    </>
  );
}
