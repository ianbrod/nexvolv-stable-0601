/**
 * Hierarchical Log Entry Storage Service
 *
 * This service provides CRUD operations for log entries using the new hierarchical
 * Prisma-based association system (categoryIds, goalIds, subGoalIds).
 *
 * This replaces the old tag-based system with a cleaner, more maintainable approach.
 */

import { LogEntry } from '@/types';
import { captainsLogDB, DBLogEntry, DBTranscriptionData, dbEntryToLogEntry, logEntryToDBEntry } from './tag-database';

export class HierarchicalLogEntryStorage {
  /**
   * Create a new log entry
   * @param entry The log entry to create
   * @returns The ID of the created entry
   */
  async createEntry(entry: LogEntry): Promise<string> {
    try {
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
        // Check if entry already exists and use put instead of add to avoid constraint errors
        const existingEntry = await captainsLogDB.logEntries.get(entry.id);
        if (existingEntry) {
          console.log(`Entry ${entry.id} already exists, updating instead of creating`);
          await captainsLogDB.logEntries.put(dbEntry);
        } else {
          await captainsLogDB.logEntries.add(dbEntry);
        }

        // Add or update transcription data if available
        if (transcriptionData) {
          await captainsLogDB.transcriptionData.put(transcriptionData);
        }
      });

      console.log(`Log entry created with ID: ${entry.id}`);
      return entry.id;
    } catch (error) {
      console.error(`Error creating log entry:`, error);
      throw error;
    }
  }

  /**
   * Get a log entry by ID
   * @param id The ID of the log entry
   * @returns The log entry or undefined if not found
   */
  async getEntry(id: string): Promise<LogEntry | undefined> {
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
      const entries = dbEntries.map(dbEntry => {
        const transcription = transcriptionDataMap.get(dbEntry.id);
        return dbEntryToLogEntry(dbEntry, transcription);
      });

      console.log(`Retrieved ${entries.length} log entries`);
      return entries;
    } catch (error) {
      console.error('Error getting all log entries:', error);
      throw error;
    }
  }

  /**
   * Update an existing log entry
   * @param entry The updated log entry
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

  /**
   * Get entries by category ID
   * @param categoryId The category ID to filter by
   * @returns Array of log entries associated with the category
   */
  async getEntriesByCategory(categoryId: string): Promise<LogEntry[]> {
    try {
      const dbEntries = await captainsLogDB.logEntries
        .filter(entry => entry.categoryIds && entry.categoryIds.includes(categoryId))
        .toArray();

      // Get transcription data for these entries
      const transcriptionDataMap = new Map<string, DBTranscriptionData>();
      const entryIds = dbEntries.map(entry => entry.id);
      const transcriptionData = await captainsLogDB.transcriptionData
        .where('entryId')
        .anyOf(entryIds)
        .toArray();

      transcriptionData.forEach(data => {
        transcriptionDataMap.set(data.entryId, data);
      });

      // Convert to LogEntry objects
      const entries = dbEntries.map(dbEntry => {
        const transcription = transcriptionDataMap.get(dbEntry.id);
        return dbEntryToLogEntry(dbEntry, transcription);
      });

      return entries;
    } catch (error) {
      console.error(`Error getting entries by category ${categoryId}:`, error);
      throw error;
    }
  }

  /**
   * Get entries by goal ID
   * @param goalId The goal ID to filter by
   * @returns Array of log entries associated with the goal
   */
  async getEntriesByGoal(goalId: string): Promise<LogEntry[]> {
    try {
      const dbEntries = await captainsLogDB.logEntries
        .filter(entry => entry.goalIds && entry.goalIds.includes(goalId))
        .toArray();

      // Get transcription data for these entries
      const transcriptionDataMap = new Map<string, DBTranscriptionData>();
      const entryIds = dbEntries.map(entry => entry.id);
      const transcriptionData = await captainsLogDB.transcriptionData
        .where('entryId')
        .anyOf(entryIds)
        .toArray();

      transcriptionData.forEach(data => {
        transcriptionDataMap.set(data.entryId, data);
      });

      // Convert to LogEntry objects
      const entries = dbEntries.map(dbEntry => {
        const transcription = transcriptionDataMap.get(dbEntry.id);
        return dbEntryToLogEntry(dbEntry, transcription);
      });

      return entries;
    } catch (error) {
      console.error(`Error getting entries by goal ${goalId}:`, error);
      throw error;
    }
  }

  /**
   * Get entries by subgoal ID
   * @param subGoalId The subgoal ID to filter by
   * @returns Array of log entries associated with the subgoal
   */
  async getEntriesBySubGoal(subGoalId: string): Promise<LogEntry[]> {
    try {
      const dbEntries = await captainsLogDB.logEntries
        .filter(entry => entry.subGoalIds && entry.subGoalIds.includes(subGoalId))
        .toArray();

      // Get transcription data for these entries
      const transcriptionDataMap = new Map<string, DBTranscriptionData>();
      const entryIds = dbEntries.map(entry => entry.id);
      const transcriptionData = await captainsLogDB.transcriptionData
        .where('entryId')
        .anyOf(entryIds)
        .toArray();

      transcriptionData.forEach(data => {
        transcriptionDataMap.set(data.entryId, data);
      });

      // Convert to LogEntry objects
      const entries = dbEntries.map(dbEntry => {
        const transcription = transcriptionDataMap.get(dbEntry.id);
        return dbEntryToLogEntry(dbEntry, transcription);
      });

      return entries;
    } catch (error) {
      console.error(`Error getting entries by subgoal ${subGoalId}:`, error);
      throw error;
    }
  }

  /**
   * Get uncategorized entries (entries with no associations)
   * @returns Array of log entries with no category, goal, or subgoal associations
   */
  async getUncategorizedEntries(): Promise<LogEntry[]> {
    try {
      const dbEntries = await captainsLogDB.logEntries
        .filter(entry =>
          (!entry.categoryIds || entry.categoryIds.length === 0) &&
          (!entry.goalIds || entry.goalIds.length === 0) &&
          (!entry.subGoalIds || entry.subGoalIds.length === 0)
        )
        .toArray();

      // Get transcription data for these entries
      const transcriptionDataMap = new Map<string, DBTranscriptionData>();
      const entryIds = dbEntries.map(entry => entry.id);
      const transcriptionData = await captainsLogDB.transcriptionData
        .where('entryId')
        .anyOf(entryIds)
        .toArray();

      transcriptionData.forEach(data => {
        transcriptionDataMap.set(data.entryId, data);
      });

      // Convert to LogEntry objects
      const entries = dbEntries.map(dbEntry => {
        const transcription = transcriptionDataMap.get(dbEntry.id);
        return dbEntryToLogEntry(dbEntry, transcription);
      });

      return entries;
    } catch (error) {
      console.error('Error getting uncategorized entries:', error);
      throw error;
    }
  }

  /**
   * Get favorite entries
   * @returns Array of favorite log entries
   */
  async getFavoriteEntries(): Promise<LogEntry[]> {
    try {
      const dbEntries = await captainsLogDB.logEntries
        .filter(entry => entry.isFavorite === true)
        .toArray();

      // Get transcription data for these entries
      const transcriptionDataMap = new Map<string, DBTranscriptionData>();
      const entryIds = dbEntries.map(entry => entry.id);
      const transcriptionData = await captainsLogDB.transcriptionData
        .where('entryId')
        .anyOf(entryIds)
        .toArray();

      transcriptionData.forEach(data => {
        transcriptionDataMap.set(data.entryId, data);
      });

      // Convert to LogEntry objects
      const entries = dbEntries.map(dbEntry => {
        const transcription = transcriptionDataMap.get(dbEntry.id);
        return dbEntryToLogEntry(dbEntry, transcription);
      });

      return entries;
    } catch (error) {
      console.error('Error getting favorite entries:', error);
      throw error;
    }
  }
}

// Create and export a singleton instance
export const hierarchicalLogEntryStorage = new HierarchicalLogEntryStorage();
