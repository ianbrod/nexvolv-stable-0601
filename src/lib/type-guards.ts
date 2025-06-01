/**
 * Type Guards
 *
 * This file contains type guard functions for runtime type checking.
 * Type guards are functions that perform runtime checks to determine if a value
 * matches a specific type, and provide TypeScript with type narrowing.
 */

import { Category, Goal, Task, LogEntry, Reminder } from '@/types';
import { ApiResponse, isSuccessResponse, isErrorResponse } from '@/types/api';

/**
 * Type guard for checking if a value is a non-null object
 */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/**
 * Type guard for checking if a value is an array
 */
export function isArray<T = unknown>(value: unknown): value is Array<T> {
  return Array.isArray(value);
}

/**
 * Type guard for checking if a value is a string
 */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/**
 * Type guard for checking if a value is a number
 */
export function isNumber(value: unknown): value is number {
  return typeof value === 'number' && !isNaN(value);
}

/**
 * Type guard for checking if a value is a boolean
 */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/**
 * Type guard for checking if a value is a Date
 */
export function isDate(value: unknown): value is Date {
  return value instanceof Date && !isNaN(value.getTime());
}

/**
 * Type guard for checking if a value is a valid ISO date string
 */
export function isISODateString(value: unknown): value is string {
  if (!isString(value)) return false;
  const date = new Date(value);
  return !isNaN(date.getTime()) && value.includes('T');
}

/**
 * Type guard for checking if a value is a Category
 */
export function isCategory(value: unknown): value is Category {
  if (!isObject(value)) return false;

  return (
    'id' in value && isString(value.id) &&
    'name' in value && isString(value.name) &&
    (!('color' in value) || value.color === undefined || isString(value.color))
  );
}

/**
 * Type guard for checking if a value is a Goal
 */
export function isGoal(value: unknown): value is Goal {
  if (!isObject(value)) return false;

  return (
    'id' in value && isString(value.id) &&
    'name' in value && isString(value.name) &&
    'createdAt' in value && (isDate(value.createdAt) || isISODateString(value.createdAt))
  );
}

/**
 * Type guard for checking if a value is a Task
 */
export function isTask(value: unknown): value is Task {
  if (!isObject(value)) return false;

  return (
    'id' in value && isString(value.id) &&
    'name' in value && isString(value.name) &&
    'priority' in value && isString(value.priority) &&
    'status' in value && isString(value.status) &&
    'createdAt' in value && (isDate(value.createdAt) || isISODateString(value.createdAt))
  );
}

/**
 * Type guard for checking if a value is a Reminder
 */
export function isReminder(value: unknown): value is Reminder {
  if (!isObject(value)) return false;

  return (
    'id' in value && isString(value.id) &&
    'title' in value && isString(value.title) &&
    'dueDate' in value && (isDate(value.dueDate) || isISODateString(value.dueDate)) &&
    'isRecurring' in value && isBoolean(value.isRecurring) &&
    'userId' in value && isString(value.userId) &&
    'isCompleted' in value && isBoolean(value.isCompleted) &&
    'createdAt' in value && (isDate(value.createdAt) || isISODateString(value.createdAt))
  );
}

/**
 * Type guard for checking if a value is a LogEntry
 */
export function isLogEntry(value: unknown): value is LogEntry {
  if (!isObject(value)) return false;

  return (
    'id' in value && isString(value.id) &&
    'title' in value && isString(value.title) &&
    'audioUrl' in value && isString(value.audioUrl) &&
    'transcription' in value && isString(value.transcription) &&
    'duration' in value && isNumber(value.duration) &&
    'createdAt' in value && (isDate(value.createdAt) || isISODateString(value.createdAt)) &&
    'updatedAt' in value && (isDate(value.updatedAt) || isISODateString(value.updatedAt)) &&
    'isFavorite' in value && isBoolean(value.isFavorite) &&
    // Optional fields don't need to be checked for existence
    (!('isArchived' in value) || isBoolean(value.isArchived)) &&
    (!('archivedAt' in value) || isDate(value.archivedAt) || isISODateString(value.archivedAt))
  );
}

// Re-export API response type guards for convenience
export { isSuccessResponse, isErrorResponse };
