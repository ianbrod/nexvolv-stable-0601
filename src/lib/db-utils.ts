/**
 * Utility functions for database management
 */

import { logDatabase, logError } from '@/lib/debug';

/**
 * Reset the IndexedDB database
 * This function deletes the database and returns a promise that resolves when the operation is complete
 * @param databaseName The name of the database to reset
 * @returns A promise that resolves when the database is deleted
 */
export async function resetDatabase(databaseName: string = 'nexvolvDatabase'): Promise<void> {
  return new Promise((resolve, reject) => {
    try {
      logDatabase(`Attempting to delete database: ${databaseName}`);
      
      // Request to delete the database
      const request = window.indexedDB.deleteDatabase(databaseName);
      
      // Handle success
      request.onsuccess = () => {
        logDatabase(`Successfully deleted database: ${databaseName}`);
        resolve();
      };
      
      // Handle error
      request.onerror = (event) => {
        const error = new Error(`Error deleting database: ${databaseName}`);
        logError('Database deletion failed', error);
        reject(error);
      };
      
      // Handle blocking (when the database is still in use)
      request.onblocked = () => {
        const error = new Error(`Database deletion blocked: ${databaseName}. Please close all other tabs with this app.`);
        logError('Database deletion blocked', error);
        reject(error);
      };
    } catch (error) {
      logError('Error in resetDatabase', error);
      reject(error);
    }
  });
}

/**
 * Check if a database exists
 * @param databaseName The name of the database to check
 * @returns A promise that resolves to true if the database exists, false otherwise
 */
export async function databaseExists(databaseName: string = 'nexvolvDatabase'): Promise<boolean> {
  return new Promise((resolve) => {
    try {
      // Get a list of all databases
      const request = window.indexedDB.databases();
      
      request.onsuccess = (event) => {
        // @ts-ignore - databases() is not in the TypeScript types yet
        const databases = event.target.result || [];
        const exists = databases.some((db: { name: string }) => db.name === databaseName);
        resolve(exists);
      };
      
      request.onerror = () => {
        // If there's an error, assume the database doesn't exist
        resolve(false);
      };
    } catch (error) {
      // If the databases() method is not supported, we can't check
      // Just assume the database might exist
      resolve(true);
    }
  });
}

/**
 * Get the version of a database
 * @param databaseName The name of the database to check
 * @returns A promise that resolves to the version number, or null if the database doesn't exist
 */
export async function getDatabaseVersion(databaseName: string = 'nexvolvDatabase'): Promise<number | null> {
  return new Promise((resolve) => {
    try {
      // Get a list of all databases
      const request = window.indexedDB.databases();
      
      request.onsuccess = (event) => {
        // @ts-ignore - databases() is not in the TypeScript types yet
        const databases = event.target.result || [];
        const db = databases.find((db: { name: string }) => db.name === databaseName);
        
        if (db) {
          resolve(db.version);
        } else {
          resolve(null);
        }
      };
      
      request.onerror = () => {
        // If there's an error, we can't determine the version
        resolve(null);
      };
    } catch (error) {
      // If the databases() method is not supported, we can't check
      resolve(null);
    }
  });
}
