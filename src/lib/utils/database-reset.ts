/**
 * Database Reset Utilities
 * Provides functions to reset IndexedDB databases when version conflicts occur
 */

/**
 * Reset all Captain's Log related databases
 * This is useful when there are version conflicts or corruption
 */
export async function resetAllCaptainsLogDatabases(): Promise<void> {
  const databasesToReset = [
    'captainsLogDatabase',
    'tagBasedDatabase',
    'nexvolvDatabase'
  ];

  console.log('Resetting all Captain\'s Log databases...');

  for (const dbName of databasesToReset) {
    try {
      await resetDatabase(dbName);
      console.log(`Successfully reset database: ${dbName}`);
    } catch (error) {
      console.warn(`Failed to reset database ${dbName}:`, error);
      // Continue with other databases
    }
  }

  // Clear related localStorage items
  try {
    const keysToRemove = [
      'captainsLogEntries',
      'captainsLogFolders',
      'tagBasedEntries',
      'nexvolvData'
    ];

    keysToRemove.forEach(key => {
      try {
        localStorage.removeItem(key);
        console.log(`Cleared localStorage: ${key}`);
      } catch (err) {
        console.warn(`Failed to clear localStorage ${key}:`, err);
      }
    });
  } catch (error) {
    console.warn('Error clearing localStorage:', error);
  }

  console.log('Database reset complete. Reloading page...');
  
  // Force a hard reload
  setTimeout(() => {
    window.location.href = window.location.pathname + '?reset=' + Date.now();
  }, 1000);
}

/**
 * Reset a specific IndexedDB database
 */
export async function resetDatabase(dbName: string): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    try {
      console.log(`Deleting database: ${dbName}`);
      const deleteRequest = window.indexedDB.deleteDatabase(dbName);

      deleteRequest.onsuccess = () => {
        console.log(`Successfully deleted database: ${dbName}`);
        resolve();
      };

      deleteRequest.onerror = (event: Event) => {
        console.error(`Error deleting database ${dbName}:`, event);
        reject(new Error(`Failed to delete database ${dbName}`));
      };

      deleteRequest.onblocked = () => {
        console.warn(`Database deletion blocked for ${dbName}. Please close all other tabs.`);
        // Don't reject, just resolve after a timeout
        setTimeout(() => {
          console.log(`Continuing despite blocked deletion for ${dbName}`);
          resolve();
        }, 2000);
      };

      // Timeout after 10 seconds
      setTimeout(() => {
        console.warn(`Database deletion timeout for ${dbName}`);
        resolve();
      }, 10000);

    } catch (err) {
      console.error(`Error in deleteDatabase for ${dbName}:`, err);
      reject(err);
    }
  });
}

/**
 * Check if there are any version conflicts in IndexedDB
 */
export async function checkForVersionConflicts(): Promise<boolean> {
  try {
    // Try to open each database and check for version errors
    const databases = ['captainsLogDatabase', 'tagBasedDatabase', 'nexvolvDatabase'];
    
    for (const dbName of databases) {
      try {
        // This will throw if there's a version conflict
        const request = window.indexedDB.open(dbName);
        await new Promise((resolve, reject) => {
          request.onsuccess = () => {
            request.result.close();
            resolve(true);
          };
          request.onerror = () => reject(request.error);
          request.onblocked = () => reject(new Error('Database blocked'));
        });
      } catch (error) {
        console.warn(`Version conflict detected in ${dbName}:`, error);
        return true;
      }
    }
    
    return false;
  } catch (error) {
    console.error('Error checking for version conflicts:', error);
    return true; // Assume conflict if we can't check
  }
}

/**
 * Show a user-friendly error message with reset option
 */
export function showDatabaseErrorDialog(): void {
  const message = `
Database version conflict detected. This can happen when the app is updated.

Would you like to reset the database? This will:
- Clear all Captain's Log entries stored locally
- Reset folder assignments
- Fix version conflicts

Note: Your goals and categories in the main app will not be affected.
  `.trim();

  if (confirm(message)) {
    resetAllCaptainsLogDatabases();
  }
}
