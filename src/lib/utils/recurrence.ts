import { RecurrencePattern, Task, TaskStatus } from '@prisma/client';
import { addDays, addMonths, addWeeks, addYears, isWeekend, setHours, setMinutes, setSeconds, setMilliseconds } from 'date-fns';

/**
 * Calculates the next occurrence date based on the recurrence pattern and the last date
 * @param lastDate The last occurrence date
 * @param pattern The recurrence pattern
 * @returns The next occurrence date
 */
export function getNextOccurrenceDate(lastDate: Date, pattern: RecurrencePattern): Date | null {
  if (pattern === RecurrencePattern.NONE) {
    return null;
  }

  // Normalize the time to midnight to avoid time zone issues
  const normalizedDate = setMilliseconds(setSeconds(setMinutes(setHours(lastDate, 0), 0), 0), 0);

  switch (pattern) {
    case RecurrencePattern.DAILY:
      return addDays(normalizedDate, 1);

    case RecurrencePattern.WEEKDAYS:
      // Skip weekends
      let nextDay = addDays(normalizedDate, 1);
      while (isWeekend(nextDay)) {
        nextDay = addDays(nextDay, 1);
      }
      return nextDay;

    case RecurrencePattern.WEEKLY:
      return addWeeks(normalizedDate, 1);

    case RecurrencePattern.BIWEEKLY:
      return addWeeks(normalizedDate, 2);

    case RecurrencePattern.MONTHLY:
      return addMonths(normalizedDate, 1);

    case RecurrencePattern.YEARLY:
      return addYears(normalizedDate, 1);

    default:
      return null;
  }
}

/**
 * Determines if a recurring task should generate a new instance
 * @param task The recurring task
 * @returns True if a new instance should be generated
 */
export function shouldGenerateNextInstance(task: Task): boolean {
  if (task.recurrencePattern === RecurrencePattern.NONE) {
    return false;
  }

  // If the task has no due date, we can't generate the next instance
  if (!task.dueDate) {
    return false;
  }

  // If the task has a recurrence end date and it's in the past, don't generate new instances
  if (task.recurrenceEndDate && task.recurrenceEndDate < new Date()) {
    return false;
  }

  // If the task is completed and has no lastGeneratedDate, generate the next instance
  if (task.status === TaskStatus.COMPLETED && !task.lastGeneratedDate) {
    return true;
  }

  // If the task is completed and the lastGeneratedDate is before the completedAt date,
  // generate the next instance
  if (task.status === TaskStatus.COMPLETED && task.lastGeneratedDate && task.completedAt &&
      task.lastGeneratedDate < task.completedAt) {
    return true;
  }

  return false;
}

/**
 * Creates a new task instance based on a recurring task
 * @param task The recurring task
 * @returns A new task instance with updated dates
 */
export function createNextTaskInstance(task: Task): Partial<Task> {
  if (!task.dueDate) {
    return {};
  }

  const nextDueDate = getNextOccurrenceDate(task.dueDate, task.recurrencePattern);

  if (!nextDueDate) {
    return {};
  }

  // Create a new task instance with the same properties but a new due date
  return {
    name: task.name,
    description: task.description,
    priority: task.priority,
    dueDate: nextDueDate,
    status: TaskStatus.TODO,
    completedAt: null,
    startedAt: null,
    recurrencePattern: task.recurrencePattern,
    recurrenceEndDate: task.recurrenceEndDate,
    parentTaskId: task.id, // Reference to the original task
    goalId: task.goalId,
    userId: task.userId,
  };
}