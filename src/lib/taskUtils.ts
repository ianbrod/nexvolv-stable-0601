/**
 * Utility functions for task management
 */

import { TaskStatus } from '@prisma/client';

// Type for loggable task data
type TaskLogData =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | Array<unknown>;

// Debug utility
export const debugTask = (area: string, message: string, data?: TaskLogData) => {
  const timestamp = new Date().toISOString();
  console.log(`[${timestamp}] [${area}] ${message}`, data ? data : '');
};

// Status cycling utility function
export const getNextStatus = (currentStatus: string): TaskStatus => {
  // Normalize the status to uppercase for comparison
  const normalizedStatus = String(currentStatus).toUpperCase();

  const statusCycle: Record<string, TaskStatus> = {
    'TODO': TaskStatus.IN_PROGRESS,
    'IN_PROGRESS': TaskStatus.COMPLETED,
    'COMPLETED': TaskStatus.TODO
  };

  // Ensure we always return a valid next status
  // If the current status is not in the cycle, default to 'TODO'
  const nextStatus = statusCycle[normalizedStatus] || TaskStatus.TODO;

  // Log for debugging
  console.log(`[getNextStatus] Current: ${normalizedStatus}, Next: ${nextStatus}`);

  return nextStatus;
};

// Column to status mapping
export const columnToStatus: Record<string, TaskStatus> = {
  'todo': TaskStatus.TODO,
  'in-progress': TaskStatus.IN_PROGRESS,
  'completed': TaskStatus.COMPLETED
};

// Status to column mapping
export const statusToColumn: Record<TaskStatus, string> = {
  [TaskStatus.TODO]: 'todo',
  [TaskStatus.IN_PROGRESS]: 'in-progress',
  [TaskStatus.COMPLETED]: 'completed'
};
