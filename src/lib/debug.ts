/**
 * Debug utility functions for consistent logging
 */

// Simple debug logger that can be enabled/disabled
// Set to false in production to disable all debug logging
export const DEBUG = process.env.NODE_ENV === 'development';

/**
 * Type for loggable values
 */
type LoggableValue =
  | string
  | number
  | boolean
  | null
  | undefined
  | Record<string, unknown>
  | Array<unknown>
  | Error;

/**
 * Log task status messages
 */
export const logTaskStatus = (message: string, ...args: LoggableValue[]) => {
  if (DEBUG) {
    console.log(`[Task Status] ${message}`, ...args);
  }
};

/**
 * Log drag and drop operations
 */
export const logDragDrop = (message: string, ...args: LoggableValue[]) => {
  if (DEBUG) {
    console.log(`[Kanban DnD] ${message}`, ...args);
  }
};

/**
 * Log audio player related messages
 */
export const logAudioPlayer = (message: string, ...args: LoggableValue[]) => {
  if (DEBUG) {
    console.log(`[Audio Player] ${message}`, ...args);
  }
};

/**
 * Log database operations
 */
export const logDatabase = (message: string, ...args: LoggableValue[]) => {
  if (DEBUG) {
    console.log(`[Database] ${message}`, ...args);
  }
};

/**
 * Log errors (always enabled, even in production)
 */
export const logError = (message: string, error: unknown) => {
  console.error(`[Error] ${message}`, error);
};
