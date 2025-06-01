import { captainsLogDB, FolderData } from './captains-log-database';
import { CaptainsLogStorage } from './captains-log-storage';
import { LogEntry } from '@/types';

/**
 * Utility for migrating data from localStorage to IndexedDB
 */
export const MigrationUtility = {
  /**
   * Migrate data from localStorage to IndexedDB
   */
  async migrateFromLocalStorage(): Promise<boolean> {
    try {
      console.log('Checking for data to migrate from localStorage to IndexedDB...');

      // Check if localStorage has entries
      const localStorageData = localStorage.getItem('captainsLogEntries');
      if (!localStorageData) {
        console.log('No data found in localStorage to migrate');
        return false;
      }

      // Parse localStorage data
      const entries = JSON.parse(localStorageData, (key, value) => {
        // Convert ISO date strings back to Date objects
        if (typeof value === 'string' &&
            (key === 'createdAt' || key === 'updatedAt' || key === 'recordedAt')) {
          return new Date(value);
        }
        return value;
      });

      if (!Array.isArray(entries) || entries.length === 0) {
        console.log('No valid entries found in localStorage');
        return false;
      }

      console.log(`Found ${entries.length} entries in localStorage to migrate`);

      // Check if entries already exist in IndexedDB
      const existingCount = await captainsLogDB.captainsLogEntries.count();
      if (existingCount > 0) {
        console.log(`IndexedDB already has ${existingCount} entries, skipping migration`);
        return false;
      }

      // Migrate folders first
      await this.migrateFolders();

      // Migrate each entry
      let migratedCount = 0;

      for (const entry of entries) {
        try {
          // Create a proper LogEntry object
          const logEntry: LogEntry = {
            id: entry.id || `migrated-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
            title: entry.title || 'Migrated Entry',
            audioUrl: entry.audioUrl || '',
            transcription: entry.transcription || '',
            summary: entry.summary || '',
            duration: typeof entry.duration === 'number' && !isNaN(entry.duration) ? entry.duration : 60,
            createdAt: entry.createdAt instanceof Date ? entry.createdAt : new Date(),
            updatedAt: entry.updatedAt instanceof Date ? entry.updatedAt : new Date(),
            isFavorite: !!entry.isFavorite,
            segments: Array.isArray(entry.segments) ? entry.segments : [],
            srtData: entry.srtData || '',
            folderId: entry.folderId
          };

          // Save to IndexedDB
          await CaptainsLogStorage.saveLogEntry(logEntry);

          migratedCount++;
        } catch (error) {
          console.error(`Error migrating entry ${entry.id || 'unknown'}:`, error);
        }
      }

      console.log(`Successfully migrated ${migratedCount} of ${entries.length} entries`);

      // If all entries were migrated successfully, clear localStorage
      if (migratedCount === entries.length) {
        console.log('All entries migrated successfully, clearing localStorage');
        localStorage.removeItem('captainsLogEntries');
      }

      return migratedCount > 0;
    } catch (error) {
      console.error('Error during migration:', error);
      return false;
    }
  },

  /**
   * Migrate folders from localStorage to IndexedDB
   */
  async migrateFolders(): Promise<boolean> {
    try {
      console.log('Checking for folders to migrate from localStorage to IndexedDB...');

      // Check if localStorage has folders
      const localStorageData = localStorage.getItem('captainsLogFolders');
      if (!localStorageData) {
        console.log('No folders found in localStorage to migrate');
        return false;
      }

      // Parse localStorage data
      const folders = JSON.parse(localStorageData);

      if (!Array.isArray(folders) || folders.length === 0) {
        console.log('No valid folders found in localStorage');
        return false;
      }

      console.log(`Found ${folders.length} folders in localStorage to migrate`);

      // Check if folders already exist in IndexedDB
      const existingCount = await captainsLogDB.folders.count();
      if (existingCount > 0) {
        console.log(`IndexedDB already has ${existingCount} folders, skipping migration`);
        return false;
      }

      // Migrate each folder
      let migratedCount = 0;

      await captainsLogDB.transaction('rw', captainsLogDB.folders, async () => {
        for (const folder of folders) {
          try {
            // Create a proper FolderData object
            const folderData: FolderData = {
              id: folder.id || `migrated-folder-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
              name: folder.name || 'Migrated Folder',
              color: folder.color,
              isSystem: folder.isSystem || false,
              userId: folder.userId
            };

            // Save to IndexedDB
            await captainsLogDB.folders.add(folderData);

            migratedCount++;
          } catch (error) {
            console.error(`Error migrating folder ${folder.id || 'unknown'}:`, error);
          }
        }
      });

      console.log(`Successfully migrated ${migratedCount} of ${folders.length} folders`);

      // If all folders were migrated successfully, clear localStorage
      if (migratedCount === folders.length) {
        console.log('All folders migrated successfully, clearing localStorage');
        localStorage.removeItem('captainsLogFolders');
      }

      return migratedCount > 0;
    } catch (error) {
      console.error('Error during folder migration:', error);
      return false;
    }
  },

  /**
   * Check if migration is needed
   */
  async isMigrationNeeded(): Promise<boolean> {
    try {
      // Check if localStorage has entries
      const localStorageData = localStorage.getItem('captainsLogEntries');
      if (!localStorageData) {
        return false;
      }

      // Parse localStorage data
      const entries = JSON.parse(localStorageData);

      if (!Array.isArray(entries) || entries.length === 0) {
        return false;
      }

      // Check if entries already exist in IndexedDB
      const existingCount = await captainsLogDB.captainsLogEntries.count();
      if (existingCount > 0) {
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error checking if migration is needed:', error);
      return false;
    }
  }
};
