'use client';

import React, { useState } from 'react';
import { Reminder } from '@/types';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
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
import { format } from 'date-fns';
import { Check, Clock, MoreVertical, X, Bell, Trash, Edit } from 'lucide-react';
import { cn } from '@/lib/utils';
import { ReminderStatus } from '@/lib/schemas/reminders';
import { ReminderEditModal } from './ReminderEditModal';
import { useReminders } from '@/contexts/ReminderContext';

interface ReminderItemProps {
  reminder: Reminder;
  onRefresh: () => Promise<void>;
}

const ReminderItemComponent = ({ reminder, onRefresh }: ReminderItemProps) => {
  const { completeReminderItem, dismissReminderItem, snoozeReminderItem, deleteReminder, isLoading } = useReminders();
  const [localLoading, setLocalLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [editModalOpen, setEditModalOpen] = useState(false);

  // Get status badge color and text
  const getStatusBadge = (status: ReminderStatus) => {
    switch (status) {
      case 'PENDING':
        return { color: 'bg-yellow-100 text-yellow-800 border-yellow-300', text: 'Pending' };
      case 'TRIGGERED':
        return { color: 'bg-orange-100 text-orange-800 border-orange-300', text: 'Triggered' };
      case 'NOTIFIED':
        return { color: 'bg-purple-100 text-purple-800 border-purple-300', text: 'Notified' };
      case 'COMPLETED':
        return { color: 'bg-green-100 text-green-800 border-green-300', text: 'Completed' };
      case 'DISMISSED':
        return { color: 'bg-gray-100 text-gray-800 border-gray-300', text: 'Dismissed' };
      case 'SNOOZED':
        return { color: 'bg-blue-100 text-blue-800 border-blue-300', text: 'Snoozed' };
      default:
        return { color: 'bg-gray-100 text-gray-800 border-gray-300', text: 'Unknown' };
    }
  };

  const statusBadge = getStatusBadge(reminder.status as ReminderStatus);

  // Handle complete action
  const handleComplete = async () => {
    setLocalLoading(true);
    const result = await completeReminderItem(reminder.id);
    if (result.success) {
      console.log("The reminder has been marked as completed.");
    } else {
      const errorMessage = result.message || result.error?.message || "Failed to complete reminder";
      console.error("Error completing reminder:", errorMessage);
    }
    setLocalLoading(false);
  };

  // Handle dismiss action
  const handleDismiss = async () => {
    setLocalLoading(true);
    const result = await dismissReminderItem(reminder.id);
    if (result.success) {
      console.log("The reminder has been dismissed.");
    } else {
      const errorMessage = result.message || result.error?.message || "Failed to dismiss reminder";
      console.error("Error dismissing reminder:", errorMessage);
    }
    setLocalLoading(false);
  };

  // Handle snooze action
  const handleSnooze = async (minutes: number) => {
    setLocalLoading(true);
    const result = await snoozeReminderItem(reminder.id, minutes);
    if (result.success) {
      console.log(`The reminder has been snoozed for ${minutes} minutes.`);
    } else {
      const errorMessage = result.message || result.error?.message || "Failed to snooze reminder";
      console.error("Error snoozing reminder:", errorMessage);
    }
    setLocalLoading(false);
  };

  // Handle delete action
  const handleDelete = async () => {
    setLocalLoading(true);
    const result = await deleteReminder(reminder.id);
    if (result.success) {
      console.log("The reminder has been deleted.");
    } else {
      const errorMessage = result.message || result.error?.message || "Failed to delete reminder";
      console.error("Error deleting reminder:", errorMessage);
    }
    setLocalLoading(false);
    setDeleteDialogOpen(false);
  };

  return (
    <Card className={cn(
      "border-l-4",
      reminder.status === 'COMPLETED' ? "border-l-green-500 opacity-70" : "border-l-blue-500",
      reminder.dueDate < new Date() && reminder.status !== 'COMPLETED' && reminder.status !== 'DISMISSED' ? "border-l-red-500" : ""
    )}>
      <CardContent className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-3 flex-grow">
            <Checkbox
              checked={reminder.status === 'COMPLETED'}
              onCheckedChange={handleComplete}
              disabled={isLoading || localLoading || reminder.status === 'COMPLETED'}
              className="mt-1"
            />
            <div className="flex-grow">
              <div className="flex items-center gap-2">
                <h3 className={cn(
                  "font-medium",
                  reminder.status === 'COMPLETED' && "line-through text-muted-foreground"
                )}>
                  {reminder.title || 'Untitled Reminder'}
                </h3>
                <Badge className={cn("text-xs", statusBadge.color)}>
                  {statusBadge.text}
                </Badge>
              </div>
              {reminder.description && (
                <p className="text-sm text-muted-foreground mt-1">
                  {reminder.description}
                </p>
              )}
              <div className="flex items-center gap-2 mt-2 text-xs text-muted-foreground">
                <Clock className="h-3 w-3" />
                <span>
                  {reminder.dueDate && !isNaN(new Date(reminder.dueDate).getTime())
                    ? format(new Date(reminder.dueDate), 'MMM d, yyyy h:mm a')
                    : 'Invalid date'}
                </span>
                {reminder.isRecurring && (
                  <Badge variant="outline" className="text-xs">
                    Recurring: {reminder.recurrence}
                  </Badge>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {reminder.status !== 'COMPLETED' && reminder.status !== 'DISMISSED' && (
              <>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleComplete}
                  disabled={isLoading || localLoading}
                  title="Complete"
                >
                  <Check className="h-4 w-4 text-green-600" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleDismiss}
                  disabled={isLoading || localLoading}
                  title="Dismiss"
                >
                  <X className="h-4 w-4 text-red-600" />
                </Button>
              </>
            )}

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon">
                  <MoreVertical className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {reminder.status !== 'COMPLETED' && reminder.status !== 'DISMISSED' && (
                  <>
                    <DropdownMenuItem onClick={() => handleSnooze(5)}>
                      <Clock className="h-4 w-4 mr-2" />
                      Snooze 5 minutes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSnooze(15)}>
                      <Clock className="h-4 w-4 mr-2" />
                      Snooze 15 minutes
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => handleSnooze(60)}>
                      <Clock className="h-4 w-4 mr-2" />
                      Snooze 1 hour
                    </DropdownMenuItem>
                  </>
                )}
                <DropdownMenuItem onClick={() => setEditModalOpen(true)}>
                  <Edit className="h-4 w-4 mr-2 text-blue-600" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setDeleteDialogOpen(true)}>
                  <Trash className="h-4 w-4 mr-2 text-red-600" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </CardContent>

      {/* Delete confirmation dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete the reminder "{reminder.title || 'Untitled Reminder'}".
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isLoading || localLoading}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDelete}
              disabled={isLoading || localLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit modal */}
      <ReminderEditModal
        isOpen={editModalOpen}
        onClose={() => setEditModalOpen(false)}
        reminder={reminder}
      />
    </Card>
  );
}

export const ReminderItem = React.memo(ReminderItemComponent);
