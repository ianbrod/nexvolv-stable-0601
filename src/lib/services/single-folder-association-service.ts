/**
 * Single Folder Association Service
 *
 * This service manages the single-folder association system for log entries.
 * It replaces the previous multi-association system with a simpler, more intuitive approach.
 */

import { LogEntry } from '@/types';
import { captainsLogDB, DBLogEntry, DBTranscriptionData, dbEntryToLogEntry, logEntryToDBEntry } from '../storage/tag-database';

export interface FolderAssignment {
  folderId?: string;
  folderType?: 'category' | 'goal' | 'subgoal' | 'custom';
}

/**
 * Service for managing single folder associations
 */
export class SingleFolderAssociationService {

  /**
   * Assign an entry to a single folder
   */
  async assignEntryToFolder(entryId: string, assignment: FolderAssignment): Promise<void> {
    try {
      console.log(`Assigning entry ${entryId} to folder:`, assignment);



      // Get the current entry from the tag database
      const dbEntry = await captainsLogDB.logEntries.get(entryId);
      if (!dbEntry) {
        throw new Error(`Entry with ID ${entryId} not found`);
      }

      // Update the entry with single folder assignment
      const updatedEntry: DBLogEntry = {
        ...dbEntry,
        folderId: assignment.folderId,
        folderType: assignment.folderType,
        updatedAt: new Date()
      };

      // Save the updated entry
      await captainsLogDB.logEntries.put(updatedEntry);

      console.log(`Successfully assigned entry ${entryId} to folder ${assignment.folderId} (${assignment.folderType})`);

      // Emit custom event for real-time updates
      const event = new CustomEvent('captainslog-data-changed', {
        detail: { entryId, assignment, action: 'folder-assign' }
      });
      window.dispatchEvent(event);

    } catch (error: any) {
      console.error('Error assigning entry to folder:', error);

      // Handle specific database errors
      if (error.name === 'VersionError' || error.name === 'DatabaseClosedError') {
        console.error('Database version conflict detected. Please reset the database.');
        throw new Error('Database version conflict. Please refresh the page or clear browser data.');
      }

      throw error;
    }
  }

  /**
   * Move entry to uncategorized (clear all associations)
   */
  async moveToUncategorized(entryId: string): Promise<void> {
    try {
      console.log(`Moving entry ${entryId} to uncategorized`);

      // Get the current entry from the tag database
      const dbEntry = await captainsLogDB.logEntries.get(entryId);
      if (!dbEntry) {
        throw new Error(`Entry with ID ${entryId} not found`);
      }

      // Clear all folder associations
      const updatedEntry: DBLogEntry = {
        ...dbEntry,
        folderId: undefined,
        folderType: undefined,
        updatedAt: new Date()
      };

      // Save the updated entry
      await captainsLogDB.logEntries.put(updatedEntry);

      console.log(`Successfully moved entry ${entryId} to uncategorized`);

      // Emit custom event for real-time updates
      const event = new CustomEvent('captainslog-data-changed', {
        detail: { entryId, action: 'move-to-uncategorized' }
      });
      window.dispatchEvent(event);

    } catch (error) {
      console.error('Error moving entry to uncategorized:', error);
      throw error;
    }
  }

  /**
   * Bulk assign entries to a folder
   */
  async bulkAssignToFolder(entryIds: string[], assignment: FolderAssignment): Promise<void> {
    try {
      console.log(`Bulk assigning ${entryIds.length} entries to folder:`, assignment);

      for (const entryId of entryIds) {
        await this.assignEntryToFolder(entryId, assignment);
      }

      console.log(`Successfully bulk assigned ${entryIds.length} entries to folder`);

      // Emit bulk update event
      const event = new CustomEvent('captainslog-data-changed', {
        detail: { entryIds, assignment, action: 'bulk-folder-assign' }
      });
      window.dispatchEvent(event);

    } catch (error) {
      console.error('Error bulk assigning entries to folder:', error);
      throw error;
    }
  }

  /**
   * Bulk move entries to uncategorized
   */
  async bulkMoveToUncategorized(entryIds: string[]): Promise<void> {
    try {
      console.log(`Bulk moving ${entryIds.length} entries to uncategorized`);

      for (const entryId of entryIds) {
        await this.moveToUncategorized(entryId);
      }

      console.log(`Successfully bulk moved ${entryIds.length} entries to uncategorized`);

      // Emit bulk update event
      const event = new CustomEvent('captainslog-data-changed', {
        detail: { entryIds, action: 'bulk-move-to-uncategorized' }
      });
      window.dispatchEvent(event);

    } catch (error) {
      console.error('Error bulk moving entries to uncategorized:', error);
      throw error;
    }
  }

  /**
   * Get entries by folder
   */
  async getEntriesByFolder(folderId: string): Promise<LogEntry[]> {
    try {
      const dbEntries = await captainsLogDB.logEntries
        .where('folderId')
        .equals(folderId)
        .toArray();

      // Get transcription data for these entries
      const entryIds = dbEntries.map(entry => entry.id);
      const transcriptionData = await captainsLogDB.transcriptionData
        .where('entryId')
        .anyOf(entryIds)
        .toArray();

      const transcriptionMap = new Map(transcriptionData.map(t => [t.entryId, t]));

      // Convert to LogEntry objects using the helper function
      return dbEntries.map(dbEntry =>
        dbEntryToLogEntry(dbEntry, transcriptionMap.get(dbEntry.id))
      );

    } catch (error) {
      console.error('Error getting entries by folder:', error);
      throw error;
    }
  }

  /**
   * Get uncategorized entries (entries with no folder assignment)
   */
  async getUncategorizedEntries(): Promise<LogEntry[]> {
    try {
      const dbEntries = await captainsLogDB.logEntries
        .filter(entry => !entry.folderId)
        .toArray();

      // Get transcription data for these entries
      const entryIds = dbEntries.map(entry => entry.id);
      const transcriptionData = await captainsLogDB.transcriptionData
        .where('entryId')
        .anyOf(entryIds)
        .toArray();

      const transcriptionMap = new Map(transcriptionData.map(t => [t.entryId, t]));

      // Convert to LogEntry objects using the helper function
      return dbEntries.map(dbEntry =>
        dbEntryToLogEntry(dbEntry, transcriptionMap.get(dbEntry.id))
      );

    } catch (error) {
      console.error('Error getting uncategorized entries:', error);
      throw error;
    }
  }

  /**
   * Parse folder ID to extract type and source ID
   */
  parseFolderId(folderId: string): { sourceId: string; folderType: 'category' | 'goal' | 'subgoal' | 'custom' } {
    if (folderId.startsWith('category:')) {
      return { sourceId: folderId.substring(9), folderType: 'category' };
    } else if (folderId.startsWith('goal:')) {
      return { sourceId: folderId.substring(5), folderType: 'goal' };
    } else if (folderId.startsWith('subgoal:')) {
      return { sourceId: folderId.substring(8), folderType: 'subgoal' };
    } else {
      return { sourceId: folderId, folderType: 'custom' };
    }
  }

  /**
   * Create folder ID from source ID and type
   */
  createFolderId(sourceId: string, folderType: 'category' | 'goal' | 'subgoal' | 'custom'): string {
    if (folderType === 'custom') {
      return sourceId;
    }
    return `${folderType}:${sourceId}`;
  }
}

// Create a singleton instance
export const singleFolderAssociationService = new SingleFolderAssociationService();
