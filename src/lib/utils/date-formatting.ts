/**
 * Date formatting utilities for charts and other components
 * 
 * This module provides a set of functions for formatting dates in various ways,
 * with support for internationalization and different time ranges.
 */

import { format, isValid, parseISO } from 'date-fns';
import { enUS, es, fr, de, ja, zhCN } from 'date-fns/locale';

// Supported locales
export const locales = {
  'en-US': enUS,
  'es': es,
  'fr': fr,
  'de': de,
  'ja': ja,
  'zh-CN': zhCN,
};

// Time range type for charts
export type TimeRange = 'day' | 'week' | 'month' | 'year' | 'all';

// Format options for different time ranges
export interface DateFormatOptions {
  locale?: keyof typeof locales;
  timeRange?: TimeRange;
  includeTime?: boolean;
  includeYear?: boolean;
}

/**
 * Safely formats a date string or Date object
 * 
 * @param date - The date to format (string, Date, or timestamp)
 * @param formatString - The date-fns format string to use
 * @param options - Additional formatting options
 * @returns Formatted date string or 'Invalid date' if the date is invalid
 */
export function formatDateSafe(
  date: string | Date | number | undefined | null,
  formatString: string = 'MMM d, yyyy',
  options: { locale?: keyof typeof locales } = {}
): string {
  if (date === undefined || date === null) {
    return 'No date';
  }

  try {
    // Convert string to Date if needed
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    
    // Check if date is valid
    if (!isValid(dateObj)) {
      return 'Invalid date';
    }
    
    // Format with the specified locale or default to en-US
    const localeObj = options.locale ? locales[options.locale] : locales['en-US'];
    return format(dateObj, formatString, { locale: localeObj });
  } catch (error) {
    console.error('Error formatting date:', error);
    return 'Invalid date';
  }
}

/**
 * Format a date for chart axis labels based on time range
 * 
 * @param date - The date to format (string, Date, or timestamp)
 * @param timeRange - The time range of the chart
 * @param options - Additional formatting options
 * @returns Formatted date string for chart axis
 */
export function formatChartDate(
  date: string | Date | number,
  timeRange: TimeRange = 'month',
  options: { locale?: keyof typeof locales } = {}
): string {
  // Get the appropriate format string based on time range
  let formatString: string;
  
  switch (timeRange) {
    case 'day':
      formatString = 'h:mm a'; // Hours and minutes with AM/PM
      break;
    case 'week':
      formatString = 'EEE d'; // Day of week + day number (e.g., "Mon 1")
      break;
    case 'month':
      formatString = 'd'; // Day of month (e.g., "15")
      break;
    case 'year':
      formatString = 'MMM'; // Month name (e.g., "Jan")
      break;
    case 'all':
      formatString = 'MMM yyyy'; // Month and year (e.g., "Jan 2023")
      break;
    default:
      formatString = 'MMM d'; // Month and day (e.g., "Jan 15")
  }
  
  return formatDateSafe(date, formatString, options);
}

/**
 * Format a date for chart tooltips with more detail
 * 
 * @param date - The date to format (string, Date, or timestamp)
 * @param options - Additional formatting options
 * @returns Formatted date string for tooltips
 */
export function formatChartTooltipDate(
  date: string | Date | number,
  options: { locale?: keyof typeof locales, includeTime?: boolean } = {}
): string {
  const formatString = options.includeTime 
    ? 'MMMM d, yyyy h:mm a'  // With time
    : 'MMMM d, yyyy';        // Without time
  
  return formatDateSafe(date, formatString, options);
}

/**
 * Validate a date and return a default value if invalid
 * 
 * @param date - The date to validate (string, Date, or timestamp)
 * @param defaultValue - The default value to return if the date is invalid
 * @returns A valid Date object or the default value
 */
export function validateDate(
  date: string | Date | number | undefined | null,
  defaultValue: Date = new Date()
): Date {
  if (date === undefined || date === null) {
    return defaultValue;
  }
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    return isValid(dateObj) ? dateObj : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}

/**
 * Convert a date to a timestamp (milliseconds since epoch)
 * 
 * @param date - The date to convert (string, Date, or timestamp)
 * @param defaultValue - The default value to return if the date is invalid
 * @returns A timestamp (milliseconds since epoch) or the default value
 */
export function dateToTimestamp(
  date: string | Date | number | undefined | null,
  defaultValue: number = Date.now()
): number {
  if (date === undefined || date === null) {
    return defaultValue;
  }
  
  try {
    const dateObj = typeof date === 'string' ? parseISO(date) : new Date(date);
    return isValid(dateObj) ? dateObj.getTime() : defaultValue;
  } catch (error) {
    return defaultValue;
  }
}
