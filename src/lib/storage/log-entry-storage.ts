/**
 * Log Entry Storage Service
 * Provides CRUD operations for log entries with tag support
 */

import { LogEntry } from '@/types';
import { captainsLogDB, DBLogEntry, DBTranscriptionData, dbEntryToLogEntry, logEntryToDBEntry } from './tag-database';

/**
 * Class for managing log entry storage operations with tag support
 */
export class LogEntryStorage {
  /**
   * Create a new log entry
   * @param entry The log entry to create
   * @returns The ID of the created entry
   */
  async createEntry(entry: LogEntry): Promise<string> {
    try {
      // Ensure the entry has an ID
      if (!entry.id) {
        throw new Error('Log entry must have an ID');
      }

      // Convert LogEntry to DBLogEntry using the helper function
      const dbEntry: DBLogEntry = logEntryToDBEntry(entry);

      // Create transcription data if available
      const transcriptionData: DBTranscriptionData | undefined = entry.transcription ? {
        entryId: entry.id,
        text: entry.transcription,
        segments: entry.segments || [],
        srtData: entry.srtData,
        summary: entry.summary
      } : undefined;

      // Begin a transaction to add the entry and transcription data
      await captainsLogDB.transaction('rw', [captainsLogDB.logEntries, captainsLogDB.transcriptionData], async () => {
        // Add the entry
        await captainsLogDB.logEntries.add(dbEntry);

        // Add transcription data if available
        if (transcriptionData) {
          await captainsLogDB.transcriptionData.add(transcriptionData);
        }
      });

      console.log(`Log entry created with ID: ${entry.id}`);
      return entry.id;
    } catch (error) {
      console.error('Error creating log entry:', error);
      throw error;
    }
  }

  /**
   * Get a log entry by ID
   * @param id The ID of the log entry to get
   * @returns The log entry, or undefined if not found
   */
  async getLogEntry(id: string): Promise<LogEntry | undefined> {
    try {
      // Get the entry and transcription data
      const dbEntry = await captainsLogDB.logEntries.get(id);
      if (!dbEntry) {
        return undefined;
      }

      const transcriptionData = await captainsLogDB.transcriptionData.get(id);

      // Convert to LogEntry
      return dbEntryToLogEntry(dbEntry, transcriptionData);
    } catch (error) {
      console.error(`Error getting log entry with ID ${id}:`, error);
      throw error;
    }
  }

  /**
   * Alias for getLogEntry for backward compatibility
   */
  async getEntry(id: string): Promise<LogEntry | undefined> {
    return this.getLogEntry(id);
  }

  /**
   * Get all log entries
   * @returns Array of all log entries
   */
  async getAllEntries(): Promise<LogEntry[]> {
    try {
      // Get all entries
      const dbEntries = await captainsLogDB.logEntries.toArray();

      // Get all transcription data
      const transcriptionDataMap = new Map<string, DBTranscriptionData>();
      const transcriptionData = await captainsLogDB.transcriptionData.toArray();
      transcriptionData.forEach(data => {
        transcriptionDataMap.set(data.entryId, data);
      });

      // Convert to LogEntry objects
      return dbEntries.map(dbEntry => {
        const transcription = transcriptionDataMap.get(dbEntry.id);
        return dbEntryToLogEntry(dbEntry, transcription);
      });
    } catch (error) {
      console.error('Error getting all log entries:', error);
      throw error;
    }
  }

  /**
   * Alias for getAllEntries for consistency with naming
   */
  async getAllLogEntries(): Promise<LogEntry[]> {
    return this.getAllEntries();
  }

  /**
   * Update an existing log entry
   * @param entry The log entry to update
   */
  async updateEntry(entry: LogEntry): Promise<void> {
    try {
      // Ensure the entry exists
      const existingEntry = await captainsLogDB.logEntries.get(entry.id);
      if (!existingEntry) {
        throw new Error(`Log entry with ID ${entry.id} not found`);
      }

      // Convert LogEntry to DBLogEntry using the helper function
      const dbEntry: DBLogEntry = {
        ...logEntryToDBEntry(entry),
        updatedAt: new Date(), // Always update the updatedAt field
        userId: existingEntry.userId, // Preserve the user ID
      };

      // Create or update transcription data if available
      const transcriptionData: DBTranscriptionData | undefined = entry.transcription ? {
        entryId: entry.id,
        text: entry.transcription,
        segments: entry.segments || [],
        srtData: entry.srtData,
        summary: entry.summary
      } : undefined;

      // Begin a transaction to update the entry and transcription data
      await captainsLogDB.transaction('rw', [captainsLogDB.logEntries, captainsLogDB.transcriptionData], async () => {
        // Update the entry
        await captainsLogDB.logEntries.update(entry.id, dbEntry);

        // Update transcription data if available
        if (transcriptionData) {
          await captainsLogDB.transcriptionData.put(transcriptionData);
        }
      });

      console.log(`Log entry updated with ID: ${entry.id}`);
    } catch (error) {
      console.error(`Error updating log entry with ID ${entry.id}:`, error);
      throw error;
    }
  }

  /**
   * Delete a log entry
   * @param id The ID of the log entry to delete
   */
  async deleteEntry(id: string): Promise<void> {
    try {
      // Begin a transaction to delete the entry and transcription data
      await captainsLogDB.transaction('rw', [captainsLogDB.logEntries, captainsLogDB.transcriptionData], async () => {
        // Delete the transcription data
        await captainsLogDB.transcriptionData.delete(id);

        // Delete the entry
        await captainsLogDB.logEntries.delete(id);
      });

      console.log(`Log entry deleted with ID: ${id}`);
    } catch (error) {
      console.error(`Error deleting log entry with ID ${id}:`, error);
      throw error;
    }
  }

  // Note: Tag-based methods have been deprecated in favor of Prisma entity associations
  // Use categoryIds, goalIds, and subGoalIds arrays in the LogEntry object instead

  /**
   * Remove a tag from an entry
   * @param entryId The ID of the entry
   * @param tagId The ID of the tag to remove
   */
  async removeTagFromEntry(entryId: string, tagId: string): Promise<void> {
    try {
      // Begin a transaction
      await tagDB.transaction('rw', [tagDB.logEntries, tagDB.tagEntryRelations], async () => {
        // Get the entry
        const entry = await tagDB.logEntries.get(entryId);
        if (!entry) {
          throw new Error(`Log entry with ID ${entryId} not found`);
        }

        // Remove the tag from the entry's tags array
        entry.tags = entry.tags.filter(id => id !== tagId);
        await tagDB.logEntries.update(entryId, { tags: entry.tags });

        // Delete the tag-entry relationship
        const relationId = `${tagId}-${entryId}`;
        await tagDB.tagEntryRelations.delete(relationId);
      });

      console.log(`Removed tag ${tagId} from entry ${entryId}`);
    } catch (error) {
      console.error(`Error removing tag ${tagId} from entry ${entryId}:`, error);
      throw error;
    }
  }

  /**
   * Get all entries with a specific tag
   * @param tagId The ID of the tag
   * @returns Array of log entries with the specified tag
   */
  async getEntriesByTag(tagId: string): Promise<LogEntry[]> {
    try {
      // Get all tag-entry relationships for this tag
      const relations = await tagDB.tagEntryRelations
        .where('tagId')
        .equals(tagId)
        .toArray();

      // Get the entry IDs
      const entryIds = relations.map(relation => relation.entryId);

      // No entries found with this tag
      if (entryIds.length === 0) {
        return [];
      }

      // Get the entries
      const entries: LogEntry[] = [];
      for (const entryId of entryIds) {
        const entry = await this.getEntry(entryId);
        if (entry) {
          entries.push(entry);
        }
      }

      return entries;
    } catch (error) {
      console.error(`Error getting entries with tag ${tagId}:`, error);
      throw error;
    }
  }

  /**
   * Add a tag to multiple entries
   * @param entryIds Array of entry IDs
   * @param tagId The ID of the tag to add
   */
  async bulkAddTag(entryIds: string[], tagId: string): Promise<void> {
    try {
      // Begin a transaction
      await tagDB.transaction('rw', [tagDB.logEntries, tagDB.tagEntryRelations], async () => {
        const now = new Date();

        for (const entryId of entryIds) {
          // Get the entry
          const entry = await tagDB.logEntries.get(entryId);
          if (!entry) {
            console.warn(`Log entry with ID ${entryId} not found, skipping`);
            continue;
          }

          // Check if the tag is already associated with the entry
          const relationId = `${tagId}-${entryId}`;
          const existingRelation = await tagDB.tagEntryRelations.get(relationId);
          if (existingRelation) {
            console.log(`Tag ${tagId} is already associated with entry ${entryId}, skipping`);
            continue;
          }

          // Add the tag to the entry's tags array if it's not already there
          if (!entry.tags.includes(tagId)) {
            entry.tags.push(tagId);
            await tagDB.logEntries.update(entryId, { tags: entry.tags });
          }

          // Create a new tag-entry relationship
          const relation: TagEntryRelation = {
            id: relationId,
            tagId,
            entryId,
            createdAt: now
          };
          await tagDB.tagEntryRelations.add(relation);
        }
      });

      console.log(`Added tag ${tagId} to ${entryIds.length} entries`);
    } catch (error) {
      console.error(`Error adding tag ${tagId} to multiple entries:`, error);
      throw error;
    }
  }

  /**
   * Remove a tag from multiple entries
   * @param entryIds Array of entry IDs
   * @param tagId The ID of the tag to remove
   */
  async bulkRemoveTag(entryIds: string[], tagId: string): Promise<void> {
    try {
      // Begin a transaction
      await tagDB.transaction('rw', [tagDB.logEntries, tagDB.tagEntryRelations], async () => {
        for (const entryId of entryIds) {
          // Get the entry
          const entry = await tagDB.logEntries.get(entryId);
          if (!entry) {
            console.warn(`Log entry with ID ${entryId} not found, skipping`);
            continue;
          }

          // Remove the tag from the entry's tags array
          entry.tags = entry.tags.filter(id => id !== tagId);
          await tagDB.logEntries.update(entryId, { tags: entry.tags });

          // Delete the tag-entry relationship
          const relationId = `${tagId}-${entryId}`;
          await tagDB.tagEntryRelations.delete(relationId);
        }
      });

      console.log(`Removed tag ${tagId} from ${entryIds.length} entries`);
    } catch (error) {
      console.error(`Error removing tag ${tagId} from multiple entries:`, error);
      throw error;
    }
  }

  /**
   * Replace all tags for an entry
   * @param entryId The ID of the entry
   * @param tagIds Array of tag IDs to associate with the entry
   */
  async replaceEntryTags(entryId: string, tagIds: string[]): Promise<void> {
    try {
      // Begin a transaction
      await tagDB.transaction('rw', [tagDB.logEntries, tagDB.tagEntryRelations], async () => {
        // Get the entry
        const entry = await tagDB.logEntries.get(entryId);
        if (!entry) {
          throw new Error(`Log entry with ID ${entryId} not found`);
        }

        // Delete all existing tag-entry relationships for this entry
        await tagDB.tagEntryRelations
          .where('entryId')
          .equals(entryId)
          .delete();

        // Update the entry's tags array
        entry.tags = [...tagIds];
        await tagDB.logEntries.update(entryId, { tags: entry.tags });

        // Create new tag-entry relationships
        const now = new Date();
        for (const tagId of tagIds) {
          const relationId = `${tagId}-${entryId}`;
          const relation: TagEntryRelation = {
            id: relationId,
            tagId,
            entryId,
            createdAt: now
          };
          await tagDB.tagEntryRelations.add(relation);
        }
      });

      console.log(`Replaced tags for entry ${entryId} with ${tagIds.length} tags`);
    } catch (error) {
      console.error(`Error replacing tags for entry ${entryId}:`, error);
      throw error;
    }
  }
}

// Create a singleton instance of the log entry storage service
export const logEntryStorage = new LogEntryStorage();
