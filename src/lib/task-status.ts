import { TaskStatus } from '@prisma/client';
import { logTaskStatus } from './debug';

/**
 * Utility functions for handling task status consistently
 */

// Define the valid status values as string literals
export type TaskStatusLiteral = 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';

/**
 * Cycles through task statuses in a consistent order:
 * TODO -> IN_PROGRESS -> COMPLETED -> TODO
 */
export function cycleTaskStatus(currentStatus: TaskStatus | string): TaskStatus {
  logTaskStatus('Cycling from status:', currentStatus);
  
  // Normalize the status to a string for comparison
  const statusStr = String(currentStatus);
  
  switch(statusStr) {
    case 'TODO':
      return TaskStatus.IN_PROGRESS;
    case 'IN_PROGRESS':
      return TaskStatus.COMPLETED;
    case 'COMPLETED':
    default:
      return TaskStatus.TODO;
  }
}

/**
 * Maps a column ID to a task status
 */
export function columnToStatus(columnId: string): TaskStatus {
  switch(columnId) {
    case 'todo':
      return TaskStatus.TODO;
    case 'in-progress':
      return TaskStatus.IN_PROGRESS;
    case 'completed':
      return TaskStatus.COMPLETED;
    default:
      return TaskStatus.TODO;
  }
}

/**
 * Maps a task status to a column ID
 */
export function statusToColumn(status: TaskStatus | string): string {
  // Normalize the status to a string for comparison
  const statusStr = String(status);
  
  switch(statusStr) {
    case 'TODO':
      return 'todo';
    case 'IN_PROGRESS':
      return 'in-progress';
    case 'COMPLETED':
      return 'completed';
    default:
      return 'todo';
  }
}

/**
 * Validates if a status is valid
 */
export function isValidStatus(status: any): boolean {
  return ['TODO', 'IN_PROGRESS', 'COMPLETED', 'ARCHIVED'].includes(String(status));
}
