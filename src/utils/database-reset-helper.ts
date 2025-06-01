/**
 * Database Reset Helper
 * 
 * This utility helps resolve database version conflicts by providing
 * functions to reset and clean up the IndexedDB databases.
 */

/**
 * Reset all Captain's Log databases to resolve version conflicts
 */
export async function resetAllCaptainsLogDatabases(): Promise<void> {
  console.log('🔄 Starting database reset to resolve version conflicts...');

  try {
    // List of database names that might exist
    const databaseNames = [
      'captainsLogDatabase',
      'CaptainsLogTagDatabase',
      'TagDatabase'
    ];

    // Close any existing connections first
    console.log('📴 Closing existing database connections...');

    // Delete each database
    for (const dbName of databaseNames) {
      try {
        console.log(`🗑️ Deleting database: ${dbName}`);
        
        await new Promise<void>((resolve, reject) => {
          const deleteRequest = window.indexedDB.deleteDatabase(dbName);
          
          deleteRequest.onsuccess = () => {
            console.log(`✅ Successfully deleted database: ${dbName}`);
            resolve();
          };
          
          deleteRequest.onerror = (event) => {
            console.warn(`⚠️ Error deleting database ${dbName}:`, event);
            // Don't reject, continue with other databases
            resolve();
          };
          
          deleteRequest.onblocked = () => {
            console.warn(`🚫 Database deletion blocked for ${dbName}. Please close all other tabs.`);
            // Continue anyway
            setTimeout(resolve, 1000);
          };
        });
        
      } catch (error) {
        console.warn(`Error deleting database ${dbName}:`, error);
        // Continue with other databases
      }
    }

    // Clear related localStorage items
    console.log('🧹 Clearing localStorage items...');
    const localStorageKeys = [
      'captainsLogEntries',
      'captainsLogFolders',
      'captainsLogTags',
      'captainsLogSettings'
    ];

    for (const key of localStorageKeys) {
      try {
        localStorage.removeItem(key);
        console.log(`✅ Cleared localStorage: ${key}`);
      } catch (error) {
        console.warn(`Error clearing localStorage ${key}:`, error);
      }
    }

    // Clear cache if available
    if (window.caches) {
      try {
        console.log('🧹 Clearing cache storage...');
        const cacheNames = await caches.keys();
        await Promise.all(cacheNames.map(name => caches.delete(name)));
        console.log('✅ Cache storage cleared');
      } catch (error) {
        console.warn('Error clearing cache:', error);
      }
    }

    console.log('✅ Database reset complete!');
    console.log('🔄 Please reload the page to complete the reset process.');

    return;

  } catch (error) {
    console.error('❌ Error during database reset:', error);
    throw error;
  }
}

/**
 * Check database versions to identify conflicts
 */
export async function checkDatabaseVersions(): Promise<void> {
  console.log('🔍 Checking database versions...');

  try {
    // Get list of databases
    if ('databases' in indexedDB) {
      const databases = await (indexedDB as any).databases();
      console.log('📊 Found databases:', databases);

      for (const db of databases) {
        console.log(`Database: ${db.name}, Version: ${db.version}`);
      }
    } else {
      console.log('⚠️ Cannot list databases (not supported in this browser)');
    }

  } catch (error) {
    console.error('Error checking database versions:', error);
  }
}

/**
 * Force reload the page with cache busting
 */
export function forceReload(): void {
  console.log('🔄 Force reloading page...');
  
  // Add timestamp to URL to bust cache
  const url = new URL(window.location.href);
  url.searchParams.set('reset', Date.now().toString());
  
  window.location.href = url.toString();
}

/**
 * Complete database reset and reload
 */
export async function resetAndReload(): Promise<void> {
  try {
    await resetAllCaptainsLogDatabases();
    
    // Wait a moment for cleanup to complete
    setTimeout(() => {
      forceReload();
    }, 1000);
    
  } catch (error) {
    console.error('Error during reset and reload:', error);
    
    // Fallback to simple reload
    setTimeout(() => {
      window.location.reload();
    }, 1000);
  }
}

// Export for browser console use
if (typeof window !== 'undefined') {
  (window as any).resetCaptainsLogDatabases = resetAndReload;
  (window as any).checkDatabaseVersions = checkDatabaseVersions;
  
  console.log('🛠️ Database reset utilities loaded!');
  console.log('💡 To reset databases, run: resetCaptainsLogDatabases()');
  console.log('💡 To check versions, run: checkDatabaseVersions()');
}
