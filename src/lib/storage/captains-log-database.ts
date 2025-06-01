import Dexie from 'dexie';

/**
 * Interface for Captain's Log entry metadata
 */
export interface CaptainsLogEntry {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  previewText: string; // First 100 chars of transcription
  duration: number;
  hasFullTranscription: boolean;
  userId?: string;
  isFavorite?: boolean;
  folderId?: string;
  audioUrl?: string;
}

/**
 * Interface for transcription data
 */
export interface TranscriptionData {
  entryId: string;
  text: string;
  segments: any[];
  srtData?: string;
  summary?: string;
}

/**
 * Dexie database for Captain's Log
 * Note: Custom folders are now stored in Prisma database, not IndexedDB
 */
// Define a version number higher than what's in the browser
// The error shows the existing version is 40000000, so we need to use a higher number
const DB_VERSION = 50000001; // Incremented to remove folders table

export class CaptainsLogDatabase extends Dexie {
  captainsLogEntries!: Dexie.Table<CaptainsLogEntry, string>;
  transcriptionData!: Dexie.Table<TranscriptionData, string>;

  constructor() {
    super('captainsLogDatabase');

    // Use a single version definition with a high version number to avoid conflicts
    // This consolidates all previous schema versions
    this.version(DB_VERSION).stores({
      captainsLogEntries: 'id, createdAt, updatedAt, userId, folderId, isFavorite',
      transcriptionData: 'entryId'
      // Removed folders table - custom folders now stored in Prisma
    }).upgrade(tx => {
      console.log(`Upgrading database to version ${DB_VERSION}...`);

      // Ensure all entries have the required fields
      return tx.table('captainsLogEntries').toCollection().modify(entry => {
        // Remove archive fields if they exist
        if (entry.isArchived !== undefined) {
          delete entry.isArchived;
        }
        if (entry.archivedAt !== undefined) {
          delete entry.archivedAt;
        }

        // Ensure folder ID is properly defined (not null)
        if (entry.folderId === null) {
          entry.folderId = undefined;
        }

        // Ensure favorite status is properly defined
        if (entry.isFavorite === null) {
          entry.isFavorite = false;
        }

        // Log the entry for debugging
        console.log(`Upgraded entry ${entry.id} with folderId=${entry.folderId}`);
      });
    });
  }
}

// Export a singleton instance
export const captainsLogDB = new CaptainsLogDatabase();

/**
 * Fix folder assignments in the database
 * This is a direct fix for the folder assignment persistence issue
 */
export async function fixFolderAssignments(): Promise<void> {
  try {
    console.log('Fixing folder assignments in the database...');

    // First, check if we have folder assignments in localStorage
    const localStorageEntries = localStorage.getItem('captainsLogEntries');
    if (!localStorageEntries) {
      console.log('No entries found in localStorage, nothing to fix');
      return;
    }

    // Parse localStorage entries
    let parsedEntries: any[] = [];
    try {
      parsedEntries = JSON.parse(localStorageEntries);
      if (!Array.isArray(parsedEntries) || parsedEntries.length === 0) {
        console.log('No valid entries found in localStorage, nothing to fix');
        return;
      }
    } catch (parseError) {
      console.error('Error parsing localStorage entries:', parseError);
      return;
    }

    // Filter entries with folder assignments
    const entriesWithFolders = parsedEntries.filter(entry => entry.folderId !== undefined);
    console.log(`Found ${entriesWithFolders.length} entries with folder assignments in localStorage`);

    if (entriesWithFolders.length === 0) {
      console.log('No folder assignments found in localStorage, nothing to fix');
      return;
    }

    // Create a map of entry IDs to folder IDs
    const folderMap = new Map<string, string>();
    entriesWithFolders.forEach(entry => {
      if (entry.id && entry.folderId) {
        folderMap.set(entry.id, entry.folderId);
        console.log(`Mapped entry ${entry.id} to folder ${entry.folderId}`);
      }
    });

    // Update entries in the database
    await captainsLogDB.transaction('rw', captainsLogDB.captainsLogEntries, async () => {
      // Get all entries from the database
      const dbEntries = await captainsLogDB.captainsLogEntries.toArray();
      console.log(`Found ${dbEntries.length} entries in the database`);

      // Update entries with folder assignments
      for (const entry of dbEntries) {
        const folderId = folderMap.get(entry.id);
        if (folderId) {
          console.log(`Updating entry ${entry.id} with folder ${folderId} in the database`);

          // Update the entry with the folder ID
          await captainsLogDB.captainsLogEntries.update(entry.id, {
            folderId,
            updatedAt: new Date()
          });

          console.log(`Updated entry ${entry.id} with folder ${folderId} in the database`);
        }
      }
    });

    console.log('Finished fixing folder assignments in the database');
  } catch (error) {
    console.error('Error fixing folder assignments:', error);
  }
}

/**
 * Reset the database by deleting it and recreating it
 * This is useful when there's a version mismatch or other database issues
 */
export async function resetCaptainsLogDatabase(): Promise<void> {
  try {
    console.log('Attempting to reset captainsLogDatabase...');

    // Close the current database connection
    try {
      captainsLogDB.close();
      console.log('Closed existing database connection');
    } catch (err) {
      console.warn('Error closing database connection:', err);
      // Continue anyway
    }

    // Delete the database
    await new Promise<void>((resolve) => {
      try {
        console.log('Deleting database...');
        const deleteRequest = window.indexedDB.deleteDatabase('captainsLogDatabase');

        deleteRequest.onsuccess = () => {
          console.log('Successfully deleted captainsLogDatabase');
          resolve();
        };

        deleteRequest.onerror = (event: Event) => {
          console.error('Error deleting captainsLogDatabase:', event);
          // Don't reject, try to continue
          resolve();
        };

        deleteRequest.onblocked = () => {
          console.warn('Database deletion blocked. Please close all other tabs with this site open.');
          // Try to continue anyway
          resolve();
        };
      } catch (err) {
        console.error('Error in deleteDatabase:', err);
        // Don't reject, try to continue
        resolve();
      }
    });

    // Clear localStorage as well to be safe
    try {
      localStorage.removeItem('captainsLogEntries');
      localStorage.removeItem('captainsLogFolders');
      console.log('Cleared localStorage items');
    } catch (err) {
      console.error('Error clearing localStorage:', err);
    }

    // Force a hard reload to ensure clean state
    console.log('Reloading page to complete reset...');

    // Use a more aggressive reload approach
    try {
      // Clear any cached data
      if (window.caches) {
        try {
          caches.keys().then(keyList => {
            return Promise.all(keyList.map(key => {
              return caches.delete(key);
            }));
          });
          console.log('Cleared cache storage');
        } catch (cacheErr) {
          console.warn('Error clearing cache:', cacheErr);
        }
      }

      // Hard reload
      setTimeout(() => {
        window.location.href = window.location.pathname + '?reset=' + Date.now();
      }, 500);
    } catch (reloadErr) {
      console.error('Error during reload:', reloadErr);
      // Fallback to simple reload
      window.location.reload();
    }

    return;
  } catch (error) {
    console.error('Error resetting captainsLogDatabase:', error);
    // Show an alert to the user
    try {
      alert('Error resetting database. Please try again or clear your browser data manually.');
    } catch (alertErr) {
      console.error('Error showing alert:', alertErr);
    }

    // Try a simple reload as a last resort
    try {
      window.location.reload();
    } catch (reloadErr) {
      console.error('Error during fallback reload:', reloadErr);
    }

    return;
  }
}
