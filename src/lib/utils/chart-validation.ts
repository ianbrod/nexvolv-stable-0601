/**
 * Chart data validation utilities
 * 
 * This module provides functions for validating chart data and ensuring
 * that charts have valid data to display.
 */

import { isValid, parseISO } from 'date-fns';
import { validateDate, dateToTimestamp } from './date-formatting';

/**
 * Interface for progress data points
 */
export interface ProgressDataPoint {
  date: string | Date | number;
  progress: number;
  notes?: string;
  [key: string]: any;
}

/**
 * Validate a progress data point
 * 
 * @param dataPoint - The data point to validate
 * @returns True if the data point is valid, false otherwise
 */
export function isValidProgressDataPoint(dataPoint: any): dataPoint is ProgressDataPoint {
  if (!dataPoint || typeof dataPoint !== 'object') {
    return false;
  }
  
  // Check if date is valid
  if (!dataPoint.date) {
    return false;
  }
  
  try {
    const dateObj = typeof dataPoint.date === 'string' 
      ? parseISO(dataPoint.date) 
      : new Date(dataPoint.date);
    
    if (!isValid(dateObj)) {
      return false;
    }
  } catch (error) {
    return false;
  }
  
  // Check if progress is a number between 0 and 100
  if (typeof dataPoint.progress !== 'number' || 
      isNaN(dataPoint.progress) || 
      dataPoint.progress < 0 || 
      dataPoint.progress > 100) {
    return false;
  }
  
  return true;
}

/**
 * Filter out invalid data points from an array
 * 
 * @param data - Array of data points to validate
 * @returns Array of valid data points
 */
export function filterValidProgressData(data: any[]): ProgressDataPoint[] {
  if (!Array.isArray(data)) {
    return [];
  }
  
  return data.filter(isValidProgressDataPoint);
}

/**
 * Normalize progress data for chart display
 * 
 * @param data - Array of progress data points
 * @returns Normalized data with consistent format
 */
export function normalizeProgressData(data: ProgressDataPoint[]): ProgressDataPoint[] {
  if (!Array.isArray(data) || data.length === 0) {
    return [];
  }
  
  return data
    .filter(isValidProgressDataPoint)
    .map(point => ({
      // Convert date to timestamp for consistent comparison
      date: dateToTimestamp(point.date),
      // Ensure progress is within bounds
      progress: Math.max(0, Math.min(100, point.progress)),
      // Include other properties
      notes: point.notes || '',
      // Add any other properties from the original data point
      ...Object.entries(point)
        .filter(([key]) => !['date', 'progress', 'notes'].includes(key))
        .reduce((obj, [key, value]) => ({ ...obj, [key]: value }), {})
    }))
    // Sort by date
    .sort((a, b) => Number(a.date) - Number(b.date));
}

/**
 * Generate fallback data if no valid data is available
 * 
 * @param count - Number of data points to generate
 * @returns Array of fallback data points
 */
export function generateFallbackData(count: number = 7): ProgressDataPoint[] {
  const now = new Date();
  const fallbackData: ProgressDataPoint[] = [];
  
  for (let i = 0; i < count; i++) {
    const date = new Date(now);
    date.setDate(date.getDate() - (count - i - 1));
    
    fallbackData.push({
      date: date.getTime(),
      progress: 0,
      notes: 'No data available',
      isFallback: true
    });
  }
  
  return fallbackData;
}

/**
 * Ensure chart data is valid and has enough points to display
 * 
 * @param data - Array of progress data points
 * @param minPoints - Minimum number of data points required
 * @returns Validated and potentially augmented data
 */
export function ensureValidChartData(
  data: any[],
  minPoints: number = 2
): ProgressDataPoint[] {
  // Filter valid data points
  const validData = filterValidProgressData(data);
  
  // If we have enough valid data points, normalize and return
  if (validData.length >= minPoints) {
    return normalizeProgressData(validData);
  }
  
  // If we have some valid data but not enough, augment with fallback data
  if (validData.length > 0 && validData.length < minPoints) {
    const normalized = normalizeProgressData(validData);
    const needed = minPoints - normalized.length;
    
    // Generate fallback data points
    const fallback = generateFallbackData(needed);
    
    // Merge and sort
    return [...normalized, ...fallback].sort((a, b) => Number(a.date) - Number(b.date));
  }
  
  // If no valid data, return fallback data
  return generateFallbackData(minPoints);
}

/**
 * Calculate appropriate Y-axis domain based on data
 * 
 * @param data - Array of progress data points
 * @param padding - Padding percentage for the domain (0-1)
 * @returns Y-axis domain as [min, max]
 */
export function calculateYAxisDomain(
  data: ProgressDataPoint[],
  padding: number = 0.1
): [number, number] {
  if (!Array.isArray(data) || data.length === 0) {
    return [0, 100]; // Default domain for progress
  }
  
  // For progress data, we typically want 0-100
  // But we can adjust based on the actual data range
  const validData = filterValidProgressData(data);
  
  if (validData.length === 0) {
    return [0, 100];
  }
  
  // Find min and max progress values
  const progressValues = validData.map(point => point.progress);
  const minProgress = Math.min(...progressValues);
  const maxProgress = Math.max(...progressValues);
  
  // Add padding
  const range = maxProgress - minProgress;
  const paddingAmount = range * padding;
  
  // Ensure domain is within 0-100 for progress
  const min = Math.max(0, minProgress - paddingAmount);
  const max = Math.min(100, maxProgress + paddingAmount);
  
  // If range is very small, expand it to make the chart more readable
  if (max - min < 10) {
    return [Math.max(0, min - 5), Math.min(100, max + 5)];
  }
  
  return [min, max];
}
