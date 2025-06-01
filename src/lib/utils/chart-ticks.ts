/**
 * Chart tick selection utilities
 * 
 * This module provides functions for selecting appropriate ticks for charts
 * based on data density, time range, and chart dimensions.
 */

import { TimeRange, dateToTimestamp, validateDate } from './date-formatting';
import { addDays, addMonths, differenceInDays, differenceInMonths } from 'date-fns';

/**
 * Interface for data points with a date property
 */
export interface DateDataPoint {
  date: string | Date | number;
  [key: string]: any;
}

/**
 * Options for generating chart ticks
 */
export interface TickGenerationOptions {
  timeRange: TimeRange;
  chartWidth?: number;
  minTickSpacing?: number;
  maxTicks?: number;
  includeEndpoints?: boolean;
}

/**
 * Generate appropriate ticks for a time-based chart
 * 
 * @param data - Array of data points with date property
 * @param options - Options for tick generation
 * @returns Array of timestamps to use as ticks
 */
export function generateChartTicks(
  data: DateDataPoint[],
  options: TickGenerationOptions
): number[] {
  if (!data || data.length === 0) {
    return [];
  }

  const {
    timeRange,
    chartWidth = 600,
    minTickSpacing = 60,
    maxTicks = Math.max(3, Math.floor(chartWidth / minTickSpacing)),
    includeEndpoints = true
  } = options;

  // Extract and validate dates
  const timestamps = data
    .map(item => dateToTimestamp(item.date))
    .filter(timestamp => !isNaN(timestamp));

  if (timestamps.length === 0) {
    return [];
  }

  // Sort timestamps chronologically
  const sortedTimestamps = [...timestamps].sort((a, b) => a - b);
  
  // Get first and last dates
  const firstDate = new Date(sortedTimestamps[0]);
  const lastDate = new Date(sortedTimestamps[sortedTimestamps.length - 1]);
  
  // If we have very few data points, just use those timestamps directly
  if (data.length <= maxTicks) {
    return sortedTimestamps;
  }

  // Calculate total time span
  const totalDays = Math.max(1, differenceInDays(lastDate, firstDate));
  
  // Calculate appropriate interval based on time range and data density
  let interval: number;
  let intervalUnit: 'day' | 'month' = 'day';
  
  switch (timeRange) {
    case 'day':
      // For day view, use hourly intervals
      interval = Math.max(1, Math.ceil(24 / maxTicks));
      break;
    case 'week':
      // For week view, aim for daily ticks if possible
      interval = Math.max(1, Math.ceil(7 / maxTicks));
      break;
    case 'month':
      // For month view, aim for ~weekly ticks
      interval = Math.max(3, Math.ceil(30 / maxTicks));
      break;
    case 'year':
      // For year view, use monthly intervals
      interval = Math.max(1, Math.ceil(12 / maxTicks));
      intervalUnit = 'month';
      break;
    case 'all':
      // For all-time view, calculate based on total span
      if (totalDays > 365) {
        // If span is more than a year, use monthly or quarterly intervals
        interval = Math.max(1, Math.ceil(differenceInMonths(lastDate, firstDate) / maxTicks));
        intervalUnit = 'month';
      } else {
        // Otherwise use appropriate day intervals
        interval = Math.max(7, Math.ceil(totalDays / maxTicks));
      }
      break;
    default:
      interval = Math.max(1, Math.ceil(totalDays / maxTicks));
  }

  // Generate ticks with consistent spacing
  const ticks: number[] = [];
  
  // Always include the first date if requested
  if (includeEndpoints) {
    ticks.push(firstDate.getTime());
  }

  // Generate intermediate ticks
  let currentDate = new Date(firstDate);
  
  while (currentDate < lastDate) {
    // Increment based on interval unit
    if (intervalUnit === 'month') {
      currentDate = addMonths(currentDate, interval);
    } else {
      currentDate = addDays(currentDate, interval);
    }
    
    // Add tick if it's before the last date
    if (currentDate < lastDate) {
      ticks.push(currentDate.getTime());
    }
  }
  
  // Always include the last date if requested
  if (includeEndpoints && (ticks.length === 0 || ticks[ticks.length - 1] !== lastDate.getTime())) {
    ticks.push(lastDate.getTime());
  }
  
  return ticks;
}

/**
 * Generate ticks for a chart with adaptive density based on chart width
 * 
 * @param data - Array of data points with date property
 * @param timeRange - The time range of the chart
 * @param chartWidth - The width of the chart in pixels
 * @returns Array of timestamps to use as ticks
 */
export function generateAdaptiveTicks(
  data: DateDataPoint[],
  timeRange: TimeRange,
  chartWidth: number = 600
): number[] {
  // Calculate appropriate tick density based on chart width
  // Wider charts can accommodate more ticks
  const minTickSpacing = 80; // Minimum pixels between ticks
  const maxTicks = Math.max(3, Math.floor(chartWidth / minTickSpacing));
  
  return generateChartTicks(data, {
    timeRange,
    chartWidth,
    maxTicks,
    minTickSpacing,
    includeEndpoints: true
  });
}

/**
 * Find the closest data point to a given timestamp
 * 
 * @param data - Array of data points with date property
 * @param timestamp - The timestamp to find the closest data point to
 * @returns The closest data point or undefined if no data points exist
 */
export function findClosestDataPoint(
  data: DateDataPoint[],
  timestamp: number
): DateDataPoint | undefined {
  if (!data || data.length === 0) {
    return undefined;
  }
  
  // Convert all dates to timestamps
  const dataWithTimestamps = data.map(item => ({
    ...item,
    _timestamp: dateToTimestamp(item.date)
  }));
  
  // Find the closest data point
  return dataWithTimestamps.reduce((closest, current) => {
    const closestDiff = Math.abs(closest._timestamp - timestamp);
    const currentDiff = Math.abs(current._timestamp - timestamp);
    return currentDiff < closestDiff ? current : closest;
  });
}
