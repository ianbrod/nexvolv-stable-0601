import { 
  addDays, 
  addWeeks, 
  addMonths, 
  addYears, 
  isBefore, 
  isAfter,
  getDay,
  getDaysInMonth,
  setDate,
  startOfMonth,
  endOfMonth,
  format,
  isWeekend
} from 'date-fns';

export interface EnhancedRecurrenceConfig {
  recurrence: string; // 'daily', 'weekly', 'monthly', 'yearly'
  recurrenceInterval?: number; // Every N days/weeks/months
  weeklyDays?: string; // "1,3,5" for Mon,Wed,Fri
  monthlyType?: string; // "date" or "weekday"
  monthlyWeekday?: number; // 0=Sunday, 6=Saturday
  monthlyWeekNumber?: number; // 1-5, -1 for last
  recurrenceEndDate?: Date;
  maxOccurrences?: number;
}

export interface ReminderInstance {
  id: string;
  title: string;
  description?: string;
  dueDate: Date;
  isVirtual: boolean;
  originalId: string;
  instanceNumber?: number;
}

/**
 * Generate recurring instances based on enhanced recurrence configuration
 */
export function generateEnhancedRecurringInstances(
  reminder: any,
  config: EnhancedRecurrenceConfig,
  maxInstances = 50
): ReminderInstance[] {
  if (!reminder.isRecurring || !config.recurrence) {
    return [{
      id: reminder.id,
      title: reminder.title,
      description: reminder.description,
      dueDate: new Date(reminder.dueDate),
      isVirtual: false,
      originalId: reminder.id
    }];
  }

  const instances: ReminderInstance[] = [];
  const today = new Date();
  const startDate = new Date(reminder.dueDate);
  const interval = config.recurrenceInterval || 1;
  
  // Parse excluded and completed instances
  const excludedInstanceIds = reminder.excludedInstances
    ? reminder.excludedInstances.split(',').map((id: string) => id.trim())
    : [];
  const completedInstanceIds = reminder.completedInstances
    ? reminder.completedInstances.split(',').map((id: string) => id.trim())
    : [];

  // Always include the original reminder
  instances.push({
    id: reminder.id,
    title: reminder.title,
    description: reminder.description,
    dueDate: startDate,
    isVirtual: false,
    originalId: reminder.id
  });

  let currentDate = new Date(startDate);
  let instanceCount = 1;

  for (let i = 0; i < maxInstances && instanceCount < maxInstances; i++) {
    // Calculate next occurrence
    const nextDate = getNextOccurrenceDate(currentDate, config);
    
    if (!nextDate) break;

    // Check termination conditions
    if (config.recurrenceEndDate && isAfter(nextDate, config.recurrenceEndDate)) {
      break;
    }

    if (config.maxOccurrences && instanceCount >= config.maxOccurrences) {
      break;
    }

    // Stop if we're too far in the future (12 months)
    const futureLimit = addMonths(today, 12);
    if (isAfter(nextDate, futureLimit)) {
      break;
    }

    const instanceId = `${reminder.id}-${instanceCount}`;

    // Skip if excluded
    if (excludedInstanceIds.includes(instanceId)) {
      currentDate = nextDate;
      instanceCount++;
      continue;
    }

    // Create instance
    instances.push({
      id: instanceId,
      title: reminder.title,
      description: reminder.description,
      dueDate: nextDate,
      isVirtual: true,
      originalId: reminder.id,
      instanceNumber: instanceCount
    });

    currentDate = nextDate;
    instanceCount++;
  }

  return instances;
}

/**
 * Calculate the next occurrence date based on enhanced recurrence configuration
 */
export function getNextOccurrenceDate(
  currentDate: Date,
  config: EnhancedRecurrenceConfig
): Date | null {
  const interval = config.recurrenceInterval || 1;

  switch (config.recurrence) {
    case 'daily':
      return addDays(currentDate, interval);

    case 'weekly':
      if (config.weeklyDays) {
        return getNextWeeklyOccurrence(currentDate, config.weeklyDays, interval);
      }
      return addWeeks(currentDate, interval);

    case 'monthly':
      if (config.monthlyType === 'weekday') {
        return getNextMonthlyWeekdayOccurrence(
          currentDate,
          config.monthlyWeekday!,
          config.monthlyWeekNumber!,
          interval
        );
      }
      return addMonths(currentDate, interval);

    case 'yearly':
      return addYears(currentDate, interval);

    default:
      return null;
  }
}

/**
 * Get next weekly occurrence for specific days
 */
function getNextWeeklyOccurrence(
  currentDate: Date,
  weeklyDays: string,
  interval: number
): Date {
  const selectedDays = weeklyDays.split(',').map(d => parseInt(d.trim())).sort();
  const currentDay = getDay(currentDate);
  
  // Find next day in the current week
  const nextDayInWeek = selectedDays.find(day => day > currentDay);
  
  if (nextDayInWeek !== undefined) {
    // Next occurrence is in the current week
    const daysToAdd = nextDayInWeek - currentDay;
    return addDays(currentDate, daysToAdd);
  } else {
    // Next occurrence is in a future week
    const weeksToAdd = interval;
    const firstDayOfNextCycle = selectedDays[0];
    const daysToAdd = (weeksToAdd * 7) - currentDay + firstDayOfNextCycle;
    return addDays(currentDate, daysToAdd);
  }
}

/**
 * Get next monthly weekday occurrence (e.g., 2nd Tuesday, last Friday)
 */
function getNextMonthlyWeekdayOccurrence(
  currentDate: Date,
  weekday: number,
  weekNumber: number,
  interval: number
): Date {
  let targetMonth = addMonths(currentDate, interval);
  
  if (weekNumber === -1) {
    // Last occurrence of weekday in month
    return getLastWeekdayOfMonth(targetMonth, weekday);
  } else {
    // Nth occurrence of weekday in month
    return getNthWeekdayOfMonth(targetMonth, weekday, weekNumber);
  }
}

/**
 * Get the Nth weekday of a month (e.g., 2nd Tuesday)
 */
function getNthWeekdayOfMonth(date: Date, weekday: number, n: number): Date {
  const firstOfMonth = startOfMonth(date);
  const firstWeekday = getDay(firstOfMonth);
  
  // Calculate days to add to get to the first occurrence of the weekday
  let daysToAdd = (weekday - firstWeekday + 7) % 7;
  
  // Add weeks to get to the nth occurrence
  daysToAdd += (n - 1) * 7;
  
  const targetDate = addDays(firstOfMonth, daysToAdd);
  
  // Check if the target date is still in the same month
  if (targetDate.getMonth() !== date.getMonth()) {
    // If not, there's no nth occurrence of this weekday in this month
    // Return the next month's first occurrence
    return getNthWeekdayOfMonth(addMonths(date, 1), weekday, 1);
  }
  
  return targetDate;
}

/**
 * Get the last occurrence of a weekday in a month
 */
function getLastWeekdayOfMonth(date: Date, weekday: number): Date {
  const lastOfMonth = endOfMonth(date);
  const lastWeekday = getDay(lastOfMonth);
  
  // Calculate days to subtract to get to the last occurrence of the weekday
  const daysToSubtract = (lastWeekday - weekday + 7) % 7;
  
  return addDays(lastOfMonth, -daysToSubtract);
}

/**
 * Format recurrence pattern for display
 */
export function formatRecurrencePattern(config: EnhancedRecurrenceConfig): string {
  const interval = config.recurrenceInterval || 1;
  const intervalText = interval > 1 ? ` ${interval}` : '';

  switch (config.recurrence) {
    case 'daily':
      return interval === 1 ? 'Daily' : `Every ${interval} days`;

    case 'weekly':
      if (config.weeklyDays) {
        const days = config.weeklyDays.split(',').map(d => {
          const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
          return dayNames[parseInt(d.trim())];
        });
        const weekText = interval === 1 ? 'week' : `${interval} weeks`;
        return `Every ${weekText} on ${days.join(', ')}`;
      }
      return interval === 1 ? 'Weekly' : `Every ${interval} weeks`;

    case 'monthly':
      if (config.monthlyType === 'weekday' && config.monthlyWeekday !== undefined && config.monthlyWeekNumber !== undefined) {
        const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
        const weekNumbers = ['', '1st', '2nd', '3rd', '4th', '5th'];
        const weekText = config.monthlyWeekNumber === -1 ? 'last' : weekNumbers[config.monthlyWeekNumber];
        const monthText = interval === 1 ? 'month' : `${interval} months`;
        return `Every ${monthText} on the ${weekText} ${dayNames[config.monthlyWeekday]}`;
      }
      return interval === 1 ? 'Monthly' : `Every ${interval} months`;

    case 'yearly':
      return interval === 1 ? 'Yearly' : `Every ${interval} years`;

    default:
      return 'Unknown pattern';
  }
}
