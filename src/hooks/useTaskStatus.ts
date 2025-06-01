// src/hooks/useTaskStatus.ts
'use client'; // Hook used by a client component

import { useState, useCallback, useEffect } from 'react';
// import { useTransition } from 'react'; // Optional: Uncomment if you want to use transitions

// --- Assumed Imports ---
// Make sure this path is correct for your project structure
import { finalUpdateTaskStatus } from '@/actions/finalUpdateTaskStatus';
// Import types directly from Prisma client
import { Task, TaskStatus } from '@prisma/client';

// Export the types so SimpleTaskItem can potentially use them if needed, though Prisma types are preferred globally
export type { Task, TaskStatus };


// Adjust getNextStatus to handle only cycleable states and use Prisma TaskStatus enum
const getNextStatus = (status: TaskStatus): TaskStatus => {
  // Use the Prisma enum values for comparison and return
  switch (status) {
    case TaskStatus.TODO: return TaskStatus.IN_PROGRESS;
    case TaskStatus.IN_PROGRESS: return TaskStatus.COMPLETED;
    case TaskStatus.COMPLETED: return TaskStatus.TODO;
    default:
      // If the status is not one of the cycleable ones (e.g., ARCHIVED), log and return the current status
      console.warn(`Status "${status}" is not cycleable. Returning current status.`);
      return status;
  }
};

export function useTaskStatus(initialTask: Task, onStatusChange?: (taskId: string, status: TaskStatus, updatedTask: Task) => void) {
  // Base state reflecting server truth (updated on success)
  const [currentStatus, setCurrentStatus] = useState<TaskStatus>(initialTask.status);
  // Optimistic state for immediate UI feedback
  const [optimisticStatus, setOptimisticStatus] = useState<TaskStatus>(currentStatus);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  // const [isPending, startTransition] = useTransition(); // Optional

  // Effect to sync internal state if the initial task prop changes externally
  // This is different from the problematic effect in TaskListWrapper.
  // It syncs the *hook's* internal state if the *initial input* changes,
  // which is a valid pattern for hooks receiving initial data via props.
  useEffect(() => {
     // Only update if the incoming prop status is different from the hook's base state
     // AND if we are NOT currently loading (to prevent reverting optimistic state during update)
     if (initialTask.status !== currentStatus && !isLoading) {
        // console.log(`[useTaskStatus ${initialTask.id}] Prop status (${initialTask.status}) differs from base state (${currentStatus}) and not loading. Resetting hook state.`);
        setCurrentStatus(initialTask.status);
        setOptimisticStatus(initialTask.status); // Also reset optimistic state
        setError(null); // Clear any previous error on external reset
        // No need to reset isLoading here, it's handled by handleStatusChange
     }
     // Add isLoading to dependencies to ensure this effect re-evaluates when loading state changes.
  }, [initialTask.status, currentStatus, isLoading]);


  const handleStatusChange = useCallback(async () => {
    // Prevent multiple simultaneous updates
    if (isLoading) {
        console.log("Update already in progress, ignoring click.");
        return;
    }

    const previousOptimisticStatus = optimisticStatus; // Use optimistic state for cycling logic base
    const nextStatus = getNextStatus(previousOptimisticStatus);

    setError(null); // Clear previous error
    setOptimisticStatus(nextStatus); // Apply optimistic update immediately
    setIsLoading(true);

    try {
      // Call the server action
      const result = await finalUpdateTaskStatus(initialTask.id, nextStatus);

      if (result.success) {
        // Success: Align the base state with the successfully persisted state
        // This confirms the optimistic update was correct.
        setCurrentStatus(nextStatus);

        // Call the onStatusChange callback if provided
        if (typeof onStatusChange === 'function' && result.data) {
          onStatusChange(initialTask.id, nextStatus, result.data);
        }

        // Also dispatch a custom event for backward compatibility
        try {
          if (typeof window !== 'undefined') {
            const event = new CustomEvent('task-status-changed', {
              detail: { taskId: initialTask.id, status: nextStatus }
            });
            window.dispatchEvent(event);

            // Directly update progress bars if the global function exists
            // This is a last-resort approach when other methods fail
            if (typeof window.updateProgressBars === 'function' && result.data?.goal?.id) {
              console.log(`Direct progress update from useTaskStatus for goal ${result.data.goal.id}: ${result.data.goal.progress}%`);
              window.updateProgressBars(result.data.goal.id, result.data.goal.progress);
            }
          }
        } catch (e) {
          console.error("Failed to dispatch event:", e);
        }
      } else {
        // Server returned an error
        console.error("Server returned error updating task status:", result.message);
        setError(new Error(result.message || 'Task status update failed'));

        // Rollback: Revert optimistic state to the value before this attempt
        setOptimisticStatus(previousOptimisticStatus);
      }
    } catch (e) {
      console.error("Failed to update task status:", e);
      setError(e instanceof Error ? e : new Error('Task status update failed'));

      // Rollback: Revert optimistic state to the value before this attempt
      setOptimisticStatus(previousOptimisticStatus);
    } finally {
      // Ensure loading state is always turned off
      setIsLoading(false);
    }
  }, [optimisticStatus, isLoading, initialTask.id, onStatusChange]); // Dependencies for useCallback

  return {
    displayStatus: optimisticStatus, // Component renders this optimistic status
    handleStatusChange,
    isLoading,
    error,
    // isPending, // Optional: expose if using useTransition
  };
}