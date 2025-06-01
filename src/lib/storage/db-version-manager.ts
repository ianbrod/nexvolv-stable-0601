/**
 * Database Version Manager
 * Provides utilities for managing database versions and handling version conflicts
 */

/**
 * Class for managing database versions
 */
export class DatabaseVersionManager {
  /**
   * Reset a database by deleting it
   * @param databaseName The name of the database to reset
   * @returns A promise that resolves when the database is deleted
   */
  static async resetDatabase(databaseName: string): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        console.log(`Attempting to delete database: ${databaseName}`);
        
        // Request to delete the database
        const request = window.indexedDB.deleteDatabase(databaseName);
        
        // Handle success
        request.onsuccess = () => {
          console.log(`Successfully deleted database: ${databaseName}`);
          resolve();
        };
        
        // Handle error
        request.onerror = (event) => {
          const error = new Error(`Error deleting database: ${databaseName}`);
          console.error('Database deletion failed', error);
          reject(error);
        };
        
        // Handle blocking (when the database is still in use)
        request.onblocked = () => {
          const error = new Error(`Database deletion blocked: ${databaseName}. Please close all other tabs with this app.`);
          console.error('Database deletion blocked', error);
          reject(error);
        };
      } catch (error) {
        console.error('Error in resetDatabase', error);
        reject(error);
      }
    });
  }

  /**
   * Check if a database exists
   * @param databaseName The name of the database to check
   * @returns A promise that resolves to true if the database exists, false otherwise
   */
  static async databaseExists(databaseName: string): Promise<boolean> {
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
        console.error('Error checking if database exists:', error);
        resolve(false);
      }
    });
  }

  /**
   * Get the version of a database
   * @param databaseName The name of the database to check
   * @returns A promise that resolves to the version number, or null if the database doesn't exist
   */
  static async getDatabaseVersion(databaseName: string): Promise<number | null> {
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
          // If there's an error, return null
          resolve(null);
        };
      } catch (error) {
        console.error('Error getting database version:', error);
        resolve(null);
      }
    });
  }

  /**
   * Check if a database needs to be reset due to version conflicts
   * @param databaseName The name of the database to check
   * @param targetVersion The target version number
   * @returns A promise that resolves to an object with needsReset and currentVersion properties
   */
  static async checkDatabaseVersion(databaseName: string, targetVersion: number): Promise<{ needsReset: boolean, currentVersion: number | null }> {
    try {
      const currentVersion = await this.getDatabaseVersion(databaseName);
      
      // If the database doesn't exist, it doesn't need to be reset
      if (currentVersion === null) {
        return { needsReset: false, currentVersion: null };
      }
      
      // If the current version is different from the target version, it needs to be reset
      const needsReset = currentVersion !== targetVersion;
      
      return { needsReset, currentVersion };
    } catch (error) {
      console.error('Error checking database version:', error);
      // If there's an error, assume the database needs to be reset
      return { needsReset: true, currentVersion: null };
    }
  }

  /**
   * Handle a version error by checking if the database needs to be reset
   * @param databaseName The name of the database
   * @param targetVersion The target version number
   * @returns A promise that resolves to true if the database was reset, false otherwise
   */
  static async handleVersionError(databaseName: string, targetVersion: number): Promise<boolean> {
    try {
      const { needsReset, currentVersion } = await this.checkDatabaseVersion(databaseName, targetVersion);
      
      if (needsReset) {
        console.log(`Database ${databaseName} current version (${currentVersion}) is incompatible or requires reset. Target version: ${targetVersion}. Attempting reset.`);
        await this.resetDatabase(databaseName);
        return true;
      }
      
      return false;
    } catch (error) {
      console.error('Error handling version error:', error);
      return false;
    }
  }

  /**
   * Check if an error is a version error
   * @param error The error to check
   * @returns True if the error is a version error, false otherwise
   */
  static isVersionError(error: any): boolean {
    if (!error) return false;
    
    const errorMessage = error instanceof Error ? error.message : String(error);
    
    return errorMessage.includes('version') ||
           errorMessage.includes('VersionError') ||
           errorMessage.includes('different version');
  }
}

/**
 * Helper function to check if an error is a version error
 * @param error The error to check
 * @returns True if the error is a version error, false otherwise
 */
export function isVersionError(error: any): boolean {
  return DatabaseVersionManager.isVersionError(error);
}
