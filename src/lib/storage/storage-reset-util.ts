/**
 * Storage Reset Utility
 * Provides a simple interface for resetting the database
 */

import { TagBasedDatabase } from './tag-database';

/**
 * Reset the tag-based database
 * This is useful when there's a version mismatch or other database issues
 */
export const resetTagBasedStorage = async (): Promise<void> => {
  try {
    await TagBasedDatabase.resetDatabase();
    console.log('Tag-based database reset complete');
    
    // Force page reload to ensure clean state
    if (typeof window !== 'undefined') {
      window.location.reload();
    }
  } catch (error) {
    console.error('Failed to reset tag-based storage:', error);
    throw error;
  }
};

/**
 * Check if the tag-based database needs to be reset
 * @returns A promise that resolves to an object with needsReset and currentVersion properties
 */
export const checkTagBasedDatabaseVersion = async (): Promise<{ needsReset: boolean, currentVersion: number | null }> => {
  return TagBasedDatabase.checkDatabaseVersion();
};

/**
 * Handle a version error in the tag-based database
 * @returns A promise that resolves to true if the database was reset, false otherwise
 */
export const handleTagBasedVersionError = async (): Promise<boolean> => {
  return TagBasedDatabase.handleVersionError();
};
