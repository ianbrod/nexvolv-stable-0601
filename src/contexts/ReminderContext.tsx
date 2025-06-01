'use client';

import React, { createContext, useContext, ReactNode, useState, useMemo, useCallback, useTransition } from 'react';
import { useOptimistic } from 'react';
import { Reminder } from '@/types';
import {
  getReminders,
  createReminder,
  updateReminder as updateReminderAction,
  deleteReminder as deleteReminderAction,
  completeReminder,
  dismissReminder,
  snoozeReminder,
  triggerReminder,
  markReminderAsNotified
} from '@/actions/reminders-prisma';
import { ReminderFormValues, UpdateReminderValues } from '@/lib/schemas/reminders';

// Define the state interface for loading and error states
interface ReminderState {
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;
}

// Define the context interface with loading and error states
interface ReminderContextType {
  // Data
  reminders: Reminder[];

  // State
  isLoading: boolean;
  error: string | null;
  lastUpdated: Date | null;

  // Actions
  refreshReminders: () => Promise<void>;
  checkForDueReminders: () => Promise<Reminder[]>;
  addReminder: (data: ReminderFormValues) => Promise<{ success: boolean; reminder?: Reminder; error?: string }>;
  updateReminder: (id: string, data: UpdateReminderValues) => Promise<{ success: boolean; reminder?: Reminder; error?: string }>;
  deleteReminder: (id: string) => Promise<{ success: boolean; error?: string }>;
  completeReminderItem: (id: string) => Promise<{ success: boolean; error?: string }>;
  dismissReminderItem: (id: string, dismissAll?: boolean) => Promise<{ success: boolean; error?: string }>;
  snoozeReminderItem: (id: string, minutes: number) => Promise<{ success: boolean; error?: string }>;
  triggerReminderItem: (id: string) => Promise<{ success: boolean; error?: string }>;
  markReminderAsNotifiedItem: (id: string) => Promise<{ success: boolean; error?: string }>;

  // Optimistic updates
  addOptimisticReminder: (reminder: Reminder) => void;
}

const ReminderContext = createContext<ReminderContextType | undefined>(undefined);

export function ReminderProvider({
  children,
  initialReminders,
}: {
  children: ReactNode;
  initialReminders: Reminder[];
}) {
  // Base state for reminders
  const [reminders, setReminders] = useState<Reminder[]>(initialReminders);
  const [isPending, startTransition] = useTransition();

  // State for loading and error handling
  const [state, setState] = useState<ReminderState>({
    isLoading: false,
    error: null,
    lastUpdated: initialReminders.length > 0 ? new Date() : null,
  });

  // Optimistic state for immediate UI updates
  const [optimisticReminders, addOptimisticReminder] = useOptimistic(
    reminders,
    (state, newReminder: Reminder) => {
      // Check if this is a new reminder or an update to an existing one
      const existingIndex = state.findIndex(r => r.id === newReminder.id);

      if (existingIndex >= 0) {
        // Update existing reminder
        return [
          ...state.slice(0, existingIndex),
          newReminder,
          ...state.slice(existingIndex + 1)
        ];
      } else {
        // Add new reminder
        return [...state, newReminder];
      }
    }
  );

  // Function to refresh reminders
  const refreshReminders = useCallback(async () => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await getReminders();
      if (result.success && result.reminders) {
        setReminders(result.reminders);
        setState(prev => ({
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        }));
      } else {
        console.error('Failed to fetch reminders:', result.error);
        setState(prev => ({
          isLoading: false,
          error: result.error || 'Failed to fetch reminders',
          lastUpdated: prev.lastUpdated
        }));
      }
    } catch (error) {
      console.error('Error fetching reminders:', error);
      setState(prev => ({
        isLoading: false,
        error: error instanceof Error ? error.message : 'An unexpected error occurred',
        lastUpdated: prev.lastUpdated
      }));
    }
  }, []);

  // Function to check for due reminders
  const checkForDueReminders = useCallback(async () => {
    try {
      // Refresh reminders from the database
      await refreshReminders();

      // Find reminders that are due
      const now = new Date();
      const dueReminders = reminders.filter(reminder => {
        // Only consider pending or triggered reminders
        if (reminder.status !== 'PENDING' && reminder.status !== 'TRIGGERED') return false;

        // Check if the reminder is due
        const dueDate = new Date(reminder.dueDate);
        return dueDate <= now;
      });

      return dueReminders;
    } catch (error) {
      console.error('Error checking for due reminders:', error);
      return [];
    }
  }, [refreshReminders, reminders]);

  // Function to add a reminder with optimistic update
  const addOptimisticReminderWithTransition = useCallback((reminder: Reminder) => {
    startTransition(() => {
      addOptimisticReminder(reminder);
    });
  }, [addOptimisticReminder, startTransition]);

  // Function to add a new reminder
  const addReminder = useCallback(async (data: ReminderFormValues) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await createReminder(data);
      if (result.success && result.reminder) {
        // Update the state with the new reminder
        setReminders(prev => [...prev, result.reminder!]);
        setState(prev => ({
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        }));
        return { success: true, reminder: result.reminder };
      } else {
        setState(prev => ({
          isLoading: false,
          error: result.error || 'Failed to create reminder',
          lastUpdated: prev.lastUpdated
        }));
        return { success: false, error: result.error || 'Failed to create reminder' };
      }
    } catch (error) {
      console.error('Error creating reminder:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({
        isLoading: false,
        error: errorMessage,
        lastUpdated: prev.lastUpdated
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Function to update a reminder
  const updateReminder = useCallback(async (id: string, data: UpdateReminderValues) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      const result = await updateReminderAction(id, data);
      if (result.success && result.reminder) {
        // Update the state with the updated reminder
        setReminders(current =>
          current.map(reminder =>
            reminder.id === id ? { ...reminder, ...result.reminder } : reminder
          )
        );
        setState(prev => ({
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        }));
        return { success: true, reminder: result.reminder };
      } else {
        setState(prev => ({
          isLoading: false,
          error: result.error || 'Failed to update reminder',
          lastUpdated: prev.lastUpdated
        }));
        return { success: false, error: result.error || 'Failed to update reminder' };
      }
    } catch (error) {
      console.error('Error updating reminder:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({
        isLoading: false,
        error: errorMessage,
        lastUpdated: prev.lastUpdated
      }));
      return { success: false, error: errorMessage };
    }
  }, []);

  // Function to delete a reminder
  const deleteReminder = useCallback(async (id: string) => {
    console.log("ReminderContext: deleteReminder called for ID:", id);

    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Find the reminder before removing it (for logging)
      const reminderToDelete = reminders.find(r => r.id === id);
      console.log("ReminderContext: Reminder to delete:", reminderToDelete ? {
        id: reminderToDelete.id,
        title: reminderToDelete.title,
        isVirtualInstance: 'isVirtualInstance' in reminderToDelete ? reminderToDelete.isVirtualInstance : false,
        isRecurring: reminderToDelete.isRecurring
      } : 'Not found');

      // Optimistically update the UI
      console.log("ReminderContext: Optimistically removing reminder from UI");
      setReminders(current => current.filter(reminder => reminder.id !== id));

      console.log("ReminderContext: Calling deleteReminderAction");
      const result = await deleteReminderAction(id);
      console.log("ReminderContext: deleteReminderAction result:", result);

      if (result.success) {
        console.log("ReminderContext: Delete successful");
        setState(prev => ({
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        }));
        return { success: true };
      } else {
        console.error("ReminderContext: Delete failed with error:", result.error);
        // Revert the optimistic update if the server action failed
        console.log("ReminderContext: Reverting optimistic update by refreshing reminders");
        await refreshReminders();
        setState(prev => ({
          isLoading: false,
          error: result.error || 'Failed to delete reminder',
          lastUpdated: prev.lastUpdated
        }));
        return { success: false, error: result.error || 'Failed to delete reminder' };
      }
    } catch (error) {
      console.error('ReminderContext: Exception during delete operation:', error);
      // Revert the optimistic update if there was an error
      console.log("ReminderContext: Reverting optimistic update due to exception");
      await refreshReminders();
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({
        isLoading: false,
        error: errorMessage,
        lastUpdated: prev.lastUpdated
      }));
      return { success: false, error: errorMessage };
    }
  }, [refreshReminders, reminders]);

  // Function to complete a reminder
  const completeReminderItem = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      // Optimistically update the UI
      setReminders(current =>
        current.map(reminder =>
          reminder.id === id
            ? { ...reminder, status: 'COMPLETED', isCompleted: true, completedAt: new Date() }
            : reminder
        )
      );

      const result = await completeReminder(id);
      if (result.success) {
        setState(prev => ({
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        }));
        return { success: true };
      } else {
        // Revert the optimistic update if the server action failed
        await refreshReminders();
        setState(prev => ({
          isLoading: false,
          error: result.error || 'Failed to complete reminder',
          lastUpdated: prev.lastUpdated
        }));
        return { success: false, error: result.error || 'Failed to complete reminder' };
      }
    } catch (error) {
      console.error('Error completing reminder:', error);
      // Revert the optimistic update if there was an error
      await refreshReminders();
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({
        isLoading: false,
        error: errorMessage,
        lastUpdated: prev.lastUpdated
      }));
      return { success: false, error: errorMessage };
    }
  }, [refreshReminders]);

  // Function to dismiss a reminder (by marking it as completed)
  const dismissReminderItem = useCallback(async (id: string, dismissAll: boolean = false) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      console.log("ReminderContext: dismissReminderItem called for ID:", id, "dismissAll:", dismissAll);

      // For optimistic UI update, determine which reminders to update
      if (dismissAll && id.includes('-')) {
        // If dismissing all occurrences of a recurring reminder, get the original ID
        const originalId = id.split('-')[0];
        console.log("ReminderContext: Optimistically updating all instances of reminder with original ID:", originalId);

        // Update all instances with the same original ID
        setReminders(current =>
          current.map(reminder => {
            const isInstance = 'originalReminderId' in reminder && reminder.originalReminderId === originalId;
            const isOriginal = reminder.id === originalId;

            if (isInstance || isOriginal) {
              return {
                ...reminder,
                isCompleted: true,
                completedAt: new Date()
              };
            }
            return reminder;
          })
        );
      } else if (id.includes('-')) {
        // For a single occurrence of a recurring reminder
        // Find the original reminder to simulate adding to completedInstances
        const originalId = id.split('-')[0];
        console.log("ReminderContext: Optimistically updating single occurrence with ID:", id);

        // Mark just this instance as completed
        setReminders(current =>
          current.map(reminder =>
            reminder.id === id
              ? {
                  ...reminder,
                  isCompleted: true,
                  completedAt: new Date()
                }
              : reminder
          )
        );
      } else {
        // Just update a regular non-recurring reminder
        console.log("ReminderContext: Optimistically updating regular reminder with ID:", id);
        setReminders(current =>
          current.map(reminder =>
            reminder.id === id
              ? {
                  ...reminder,
                  isCompleted: true,
                  completedAt: new Date()
                }
              : reminder
          )
        );
      }

      const result = await dismissReminder(id, dismissAll);
      console.log("ReminderContext: dismissReminder result:", result);

      if (result.success) {
        setState(prev => ({
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        }));
        return { success: true };
      } else {
        // Revert the optimistic update if the server action failed
        console.error("ReminderContext: dismissReminder failed with error:", result.error);
        await refreshReminders();
        setState(prev => ({
          isLoading: false,
          error: result.error || 'Failed to dismiss reminder',
          lastUpdated: prev.lastUpdated
        }));
        return { success: false, error: result.error || 'Failed to dismiss reminder' };
      }
    } catch (error) {
      console.error('ReminderContext: Error dismissing reminder:', error);
      // Revert the optimistic update if there was an error
      await refreshReminders();
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({
        isLoading: false,
        error: errorMessage,
        lastUpdated: prev.lastUpdated
      }));
      return { success: false, error: errorMessage };
    }
  }, [refreshReminders]);

  // Function to snooze a reminder
  const snoozeReminderItem = useCallback(async (id: string, minutes: number) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      console.log("ReminderContext: snoozeReminderItem called for ID:", id, "minutes:", minutes);

      // Find the reminder to calculate the new due date for optimistic update
      const reminder = reminders.find(r => r.id === id);
      if (!reminder) {
        setState(prev => ({
          isLoading: false,
          error: 'Reminder not found',
          lastUpdated: prev.lastUpdated
        }));
        return { success: false, error: 'Reminder not found' };
      }

      // Calculate new due date for optimistic update
      const newDueDate = new Date(reminder.dueDate.getTime() + minutes * 60000);

      // Optimistically update the UI - only update dueDate, not status
      setReminders(current =>
        current.map(r =>
          r.id === id
            ? { ...r, dueDate: newDueDate }
            : r
        )
      );

      const result = await snoozeReminder(id, minutes);
      console.log("ReminderContext: snoozeReminder result:", result);

      if (result.success) {
        setState(prev => ({
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        }));
        return { success: true };
      } else {
        // Revert the optimistic update if the server action failed
        console.error("ReminderContext: snoozeReminder failed with error:", result.error);
        await refreshReminders();
        setState(prev => ({
          isLoading: false,
          error: result.error || 'Failed to snooze reminder',
          lastUpdated: prev.lastUpdated
        }));
        return { success: false, error: result.error || 'Failed to snooze reminder' };
      }
    } catch (error) {
      console.error('ReminderContext: Error snoozing reminder:', error);
      // Revert the optimistic update if there was an error
      await refreshReminders();
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({
        isLoading: false,
        error: errorMessage,
        lastUpdated: prev.lastUpdated
      }));
      return { success: false, error: errorMessage };
    }
  }, [refreshReminders, reminders]);

  // Function to mark a reminder as triggered (no status field in model, so we don't update anything)
  const triggerReminderItem = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      console.log("ReminderContext: triggerReminderItem called for ID:", id);

      // No optimistic update needed since there's no status field
      // Just call the server action
      const result = await triggerReminder(id);
      console.log("ReminderContext: triggerReminder result:", result);

      if (result.success) {
        setState(prev => ({
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        }));
        return { success: true };
      } else {
        const errorMessage = result.message || result.error?.message || 'Failed to trigger reminder';
        console.error("ReminderContext: triggerReminder failed with error:", errorMessage);
        setState(prev => ({
          isLoading: false,
          error: errorMessage,
          lastUpdated: prev.lastUpdated
        }));
        return { success: false, error: errorMessage };
      }
    } catch (error) {
      console.error('ReminderContext: Error triggering reminder:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({
        isLoading: false,
        error: errorMessage,
        lastUpdated: prev.lastUpdated
      }));
      return { success: false, error: errorMessage };
    }
  }, [refreshReminders]);

  // Function to mark a reminder as notified (no status field in model, so we don't update anything)
  const markReminderAsNotifiedItem = useCallback(async (id: string) => {
    setState(prev => ({ ...prev, isLoading: true, error: null }));
    try {
      console.log("ReminderContext: markReminderAsNotifiedItem called for ID:", id);

      // No optimistic update needed since there's no status field
      // Just call the server action
      const result = await markReminderAsNotified(id);
      console.log("ReminderContext: markReminderAsNotified result:", result);

      if (result.success) {
        setState(prev => ({
          isLoading: false,
          error: null,
          lastUpdated: new Date()
        }));
        return { success: true };
      } else {
        console.error("ReminderContext: markReminderAsNotified failed with error:", result.error);
        setState(prev => ({
          isLoading: false,
          error: result.error || 'Failed to mark reminder as notified',
          lastUpdated: prev.lastUpdated
        }));
        return { success: false, error: result.error || 'Failed to mark reminder as notified' };
      }
    } catch (error) {
      console.error('ReminderContext: Error marking reminder as notified:', error);
      const errorMessage = error instanceof Error ? error.message : 'An unexpected error occurred';
      setState(prev => ({
        isLoading: false,
        error: errorMessage,
        lastUpdated: prev.lastUpdated
      }));
      return { success: false, error: errorMessage };
    }
  }, [refreshReminders]);

  // Memoize the context value to prevent unnecessary re-renders
  const contextValue = useMemo(() => ({
    // Data
    reminders: optimisticReminders,

    // State
    isLoading: state.isLoading,
    error: state.error,
    lastUpdated: state.lastUpdated,

    // Actions
    refreshReminders,
    checkForDueReminders,
    addReminder,
    updateReminder,
    deleteReminder,
    completeReminderItem,
    dismissReminderItem,
    snoozeReminderItem,
    triggerReminderItem,
    markReminderAsNotifiedItem,

    // Optimistic updates
    addOptimisticReminder: addOptimisticReminderWithTransition,
  }), [
    optimisticReminders,
    state.isLoading,
    state.error,
    state.lastUpdated,
    refreshReminders,
    checkForDueReminders,
    addReminder,
    updateReminder,
    deleteReminder,
    completeReminderItem,
    dismissReminderItem,
    snoozeReminderItem,
    triggerReminderItem,
    markReminderAsNotifiedItem,
    addOptimisticReminderWithTransition
  ]);

  return (
    <ReminderContext.Provider value={contextValue}>
      {children}
    </ReminderContext.Provider>
  );
}

export function useReminders() {
  const context = useContext(ReminderContext);
  if (context === undefined) {
    throw new Error('useReminders must be used within a ReminderProvider');
  }
  return context;
}
