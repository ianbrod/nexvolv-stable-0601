/**
 * CSV Converter Utility
 *
 * This module provides functions for converting between CSV and JSON formats,
 * with support for validation and error handling.
 */

import { z } from 'zod';

/**
 * Options for CSV parsing
 */
interface CSVParseOptions {
  delimiter?: string;
  hasHeader?: boolean;
  skipEmptyLines?: boolean;
  trimValues?: boolean;
}

/**
 * Options for CSV generation
 */
interface CSVGenerateOptions {
  delimiter?: string;
  includeHeader?: boolean;
}

/**
 * Parse CSV string to array of objects
 *
 * @param csvString - CSV string to parse
 * @param options - Parsing options
 * @returns Array of objects representing CSV rows
 */
export function parseCSV(csvString: string, options: CSVParseOptions = {}): any[] {
  const {
    delimiter = ',',
    hasHeader = true,
    skipEmptyLines = true,
    trimValues = true
  } = options;

  // Split the CSV string into lines
  const lines = csvString.split(/\r?\n/);

  // Filter out empty lines if skipEmptyLines is true
  const filteredLines = skipEmptyLines
    ? lines.filter(line => line.trim().length > 0)
    : lines;

  if (filteredLines.length === 0) {
    return [];
  }

  // Parse the header row if hasHeader is true
  const headerRow = hasHeader ? filteredLines[0].split(delimiter) : null;

  // Trim header values if trimValues is true
  const headers = headerRow && trimValues
    ? headerRow.map(header => header.trim())
    : headerRow;

  // Start parsing from the first data row
  const startIndex = hasHeader ? 1 : 0;

  // Parse each data row
  const result = [];
  for (let i = startIndex; i < filteredLines.length; i++) {
    const line = filteredLines[i];
    const values = line.split(delimiter);

    // Trim values if trimValues is true
    const trimmedValues = trimValues
      ? values.map(value => value.trim())
      : values;

    if (headers) {
      // Create an object with header keys and row values
      const row: Record<string, string> = {};
      for (let j = 0; j < headers.length; j++) {
        row[headers[j]] = trimmedValues[j] || '';
      }
      result.push(row);
    } else {
      // If no headers, just add the array of values
      result.push(trimmedValues);
    }
  }

  return result;
}

/**
 * Generate CSV string from array of objects
 *
 * @param data - Array of objects to convert to CSV
 * @param options - CSV generation options
 * @returns CSV string
 */
export function generateCSV(data: any[], options: CSVGenerateOptions = {}): string {
  const {
    delimiter = ',',
    includeHeader = true
  } = options;

  if (!Array.isArray(data) || data.length === 0) {
    return '';
  }

  // Extract headers from the first object
  const headers = Object.keys(data[0]);

  // Generate header row if includeHeader is true
  const headerRow = includeHeader
    ? headers.join(delimiter)
    : null;

  // Generate data rows
  const dataRows = data.map(row => {
    return headers.map(header => {
      const value = row[header];
      // Handle values that contain the delimiter or newlines
      if (typeof value === 'string' && (value.includes(delimiter) || value.includes('\n'))) {
        return `"${value.replace(/"/g, '""')}"`;
      }
      return value !== undefined && value !== null ? String(value) : '';
    }).join(delimiter);
  });

  // Combine header and data rows
  const rows = headerRow
    ? [headerRow, ...dataRows]
    : dataRows;

  return rows.join('\n');
}

/**
 * Convert CSV string to JSON string
 *
 * @param csvString - CSV string to convert
 * @param options - CSV parsing options
 * @returns JSON string
 */
export function csvToJSON(csvString: string, options: CSVParseOptions = {}): string {
  const data = parseCSV(csvString, options);
  return JSON.stringify(data, null, 2);
}

/**
 * Convert JSON string to CSV string
 *
 * @param jsonString - JSON string to convert
 * @param options - CSV generation options
 * @returns CSV string
 */
export function jsonToCSV(jsonString: string, options: CSVGenerateOptions = {}): string {
  try {
    const data = JSON.parse(jsonString);
    if (!Array.isArray(data)) {
      throw new Error('JSON data must be an array of objects');
    }
    return generateCSV(data, options);
  } catch (error) {
    console.error('Error converting JSON to CSV:', error);
    throw error;
  }
}

/**
 * Convert CSV data to the application's data format
 *
 * @param csvData - Parsed CSV data
 * @returns Structured data in the application format
 */
export function convertCSVToAppData(csvData: any[]): any {
  if (!Array.isArray(csvData) || csvData.length === 0) {
    throw new Error('Invalid CSV data');
  }

  // Determine the type of data based on the CSV structure
  const firstRow = csvData[0];
  const keys = Object.keys(firstRow);

  // Check if this is tasks data - check for tasks first since they might also have 'status'
  if (keys.includes('name') && keys.includes('dueDate')) {
    return {
      goals: [],
      tasks: csvData.map(row => ({
        id: row.id || `task-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: row.name,
        description: row.description || '',
        status: row.status || 'todo',
        priority: row.priority || 'medium',
        dueDate: row.dueDate ? new Date(row.dueDate) : null,
        goalId: row.goalId || null,
        createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
        // Add other task properties as needed
      })),
      categories: [],
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
  }

  // Check if this is goals data
  if (keys.includes('name') && (keys.includes('status') || keys.includes('progress'))) {
    return {
      goals: csvData.map(row => ({
        id: row.id || `goal-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
        name: row.name,
        description: row.description || '',
        status: row.status || 'active',
        progress: parseInt(row.progress) || 0,
        category: row.category || null,
        createdAt: row.createdAt ? new Date(row.createdAt) : new Date(),
        // Add other goal properties as needed
      })),
      tasks: [],
      categories: [],
      exportDate: new Date().toISOString(),
      version: '1.0',
    };
  }

  // If we can't determine the type, throw an error
  throw new Error('Unrecognized CSV data format');
}
