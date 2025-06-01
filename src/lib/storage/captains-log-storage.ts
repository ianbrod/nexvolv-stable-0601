import { captainsLogDB, CaptainsLogEntry, TranscriptionData, resetCaptainsLogDatabase } from './captains-log-database';
import { LogEntry } from '@/types';

// Helper function to check if an error is a version error
const isVersionError = (error: any): boolean => {
  if (!error) return false;
  const errorMessage = error instanceof Error ? error.message : String(error);
  return errorMessage.includes('version') ||
         errorMessage.includes('VersionError') ||
         errorMessage.includes('different version');
};

// Helper function to ensure folder assignments are saved to localStorage
const ensureFolderAssignmentsPersist = async (entryId: string, folderId: string | undefined): Promise<void> => {
  try {
    console.log(`Ensuring folder assignment persists for entry ${entryId} with folderId ${folderId}`);

    // Get existing entries from localStorage
    const existingEntriesJson = localStorage.getItem('captainsLogEntries');
    let existingEntries: LogEntry[] = [];

    if (existingEntriesJson) {
      try {
        existingEntries = JSON.parse(existingEntriesJson);
        if (!Array.isArray(existingEntries)) {
          existingEntries = [];
        }
      } catch (parseError) {
        console.error('Error parsing localStorage entries:', parseError);
        existingEntries = [];
      }
    }

    // Update or add the entry
    const entryIndex = existingEntries.findIndex(e => e.id === entryId);

    if (entryIndex >= 0) {
      // Update existing entry
      existingEntries[entryIndex] = {
        ...existingEntries[entryIndex],
        folderId,
        updatedAt: new Date()
      };
      console.log(`Updated existing entry in localStorage: ${entryId} with folderId ${folderId}`);
    } else {
      // Try to get the entry from IndexedDB
      try {
        const dbEntry = await captainsLogDB.captainsLogEntries.get(entryId);
        const transcription = await captainsLogDB.transcriptionData.get(entryId);

        if (dbEntry && transcription) {
          // Create a new entry
          const newEntry: LogEntry = {
            id: dbEntry.id,
            title: dbEntry.title,
            audioUrl: dbEntry.audioUrl || '',
            transcription: transcription.text,
            summary: transcription.summary || '',
            duration: dbEntry.duration,
            createdAt: dbEntry.createdAt,
            updatedAt: new Date(),
            isFavorite: dbEntry.isFavorite || false,
            segments: transcription.segments,
            srtData: transcription.srtData || '',
            folderId,
            isArchived: dbEntry.isArchived || false,
            archivedAt: dbEntry.archivedAt
          };

          existingEntries.push(newEntry);
          console.log(`Added new entry to localStorage: ${entryId} with folderId ${folderId}`);
        }
      } catch (dbError) {
        console.error(`Error getting entry from database:`, dbError);
      }
    }

    // Save back to localStorage
    localStorage.setItem('captainsLogEntries', JSON.stringify(existingEntries));
    console.log(`Saved ${existingEntries.length} entries to localStorage`);
  } catch (error) {
    console.error('Error ensuring folder assignment persists:', error);
  }
};

/**
 * Storage service for Captain's Log
 */
export const CaptainsLogStorage = {
  /**
   * Save a new Captain's Log entry with transcription data
   */
  async saveEntry(title: string, transcriptionResult: any, userId?: string): Promise<string> {
    try {
      // Generate ID
      const entryId = crypto.randomUUID ? crypto.randomUUID() : Date.now().toString();
      const now = new Date();

      // Create preview text (first 100 chars)
      const previewText = transcriptionResult.text.substring(0, 100) +
        (transcriptionResult.text.length > 100 ? '...' : '');

      // Create entry metadata
      const entry: CaptainsLogEntry = {
        id: entryId,
        title,
        createdAt: now,
        updatedAt: now,
        previewText,
        duration: transcriptionResult.duration || 0,
        hasFullTranscription: true,
        userId
      };

      // Create transcription data
      const transcription: TranscriptionData = {
        entryId,
        text: transcriptionResult.text,
        segments: transcriptionResult.segments || [],
        srtData: transcriptionResult.srtData || '',
        summary: transcriptionResult.summary || ''
      };

      // Save both in a transaction
      await captainsLogDB.transaction('rw', [captainsLogDB.captainsLogEntries, captainsLogDB.transcriptionData], async () => {
        await captainsLogDB.captainsLogEntries.add(entry);
        await captainsLogDB.transcriptionData.add(transcription);
      });

      console.log(`Entry saved successfully with ID: ${entryId}`);
      return entryId;
    } catch (error) {
      console.error('Error saving entry:', error);

      // Provide specific error message for quota exceeded
      if (
        typeof error === 'object' &&
        error !== null &&
        (
          (error as any).name === 'QuotaExceededError' ||
          typeof (error as any).message === 'string' && (error as any).message.includes('quota')
        )
      ) {
        throw new Error('Storage quota exceeded. Please free up space by deleting some entries.');
      }

      throw error;
    }
  },

  /**
   * Save an existing LogEntry to IndexedDB
   */
  async saveLogEntry(entry: LogEntry): Promise<string> {
    try {
      const now = new Date();

      // Create preview text (first 100 chars)
      const previewText = entry.transcription.substring(0, 100) +
        (entry.transcription.length > 100 ? '...' : '');

      // Create entry metadata
      const dbEntry: CaptainsLogEntry = {
        id: entry.id,
        title: entry.title,
        createdAt: entry.createdAt instanceof Date ? entry.createdAt : new Date(entry.createdAt),
        updatedAt: now,
        previewText,
        duration: entry.duration || 0,
        hasFullTranscription: true,
        userId: undefined, // Add user ID if needed
        isFavorite: entry.isFavorite,
        folderId: entry.folderId
      };

      // Create transcription data
      const transcription: TranscriptionData = {
        entryId: entry.id,
        text: entry.transcription,
        segments: entry.segments || [],
        srtData: entry.srtData || '',
        summary: entry.summary || ''
      };

      // Save both in a transaction
      try {
        await captainsLogDB.transaction('rw', [captainsLogDB.captainsLogEntries, captainsLogDB.transcriptionData], async () => {
          await captainsLogDB.captainsLogEntries.put(dbEntry);
          await captainsLogDB.transcriptionData.put(transcription);
        });

        // Ensure folder assignment persists by saving to localStorage
        if (entry.folderId !== undefined) {
          console.log(`Ensuring folder assignment persists for entry ${entry.id} with folderId ${entry.folderId}`);
          await ensureFolderAssignmentsPersist(entry.id, entry.folderId);
        }
      } catch (txError) {
        // Check if it's a version error
        if (isVersionError(txError)) {
          console.warn('Version error detected when saving entry. Attempting to save to localStorage as fallback.');

          // Save to localStorage as a fallback
          try {
            // Get existing entries from localStorage
            const existingEntriesJson = localStorage.getItem('captainsLogEntries');
            let existingEntries: LogEntry[] = [];

            if (existingEntriesJson) {
              try {
                existingEntries = JSON.parse(existingEntriesJson);
                if (!Array.isArray(existingEntries)) {
                  existingEntries = [];
                }
              } catch (parseError) {
                console.error('Error parsing localStorage entries:', parseError);
                existingEntries = [];
              }
            }

            // Update or add the entry
            const entryIndex = existingEntries.findIndex(e => e.id === entry.id);
            if (entryIndex >= 0) {
              existingEntries[entryIndex] = entry;
            } else {
              existingEntries.unshift(entry);
            }

            // Save back to localStorage
            localStorage.setItem('captainsLogEntries', JSON.stringify(existingEntries));
            console.log(`Entry saved to localStorage as fallback with ID: ${entry.id}`);

            // Throw a specific error to inform the user
            throw new Error('VersionError: The requested version is less than the existing version. Your data has been saved temporarily, but please reset the database to fix this issue permanently.');
          } catch (lsError) {
            console.error('Error saving to localStorage fallback:', lsError);
            throw txError; // Re-throw the original error
          }
        } else {
          // Not a version error, re-throw
          throw txError;
        }
      }

      console.log(`Entry updated successfully with ID: ${entry.id}`);
      return entry.id;
    } catch (error) {
      console.error('Error saving entry:', error);

      // Check if it's a version error that we've already handled
      if (error instanceof Error && error.message.startsWith('VersionError:')) {
        throw error; // Re-throw our custom error
      }

      // Provide specific error message for quota exceeded
      if (
        typeof error === 'object' &&
        error !== null &&
        (
          (error as any).name === 'QuotaExceededError' ||
          typeof (error as any).message === 'string' && (error as any).message.includes('quota')
        )
      ) {
        throw new Error('Storage quota exceeded. Please free up space by deleting some entries.');
      }

      // Check if it's a version error that we haven't handled yet
      if (isVersionError(error)) {
        throw new Error('VersionError: The requested version is less than the existing version. Please reset the database to fix this issue.');
      }

      throw error;
    }
  },

  /**
   * Save multiple LogEntries to IndexedDB
   */
  async saveLogEntries(entries: LogEntry[]): Promise<void> {
    try {
      await captainsLogDB.transaction('rw', [captainsLogDB.captainsLogEntries, captainsLogDB.transcriptionData], async () => {
        for (const entry of entries) {
          const now = new Date();

          // Create preview text (first 100 chars)
          const previewText = entry.transcription.substring(0, 100) +
            (entry.transcription.length > 100 ? '...' : '');

          // Create entry metadata
          const dbEntry: CaptainsLogEntry = {
            id: entry.id,
            title: entry.title,
            createdAt: entry.createdAt instanceof Date ? entry.createdAt : new Date(entry.createdAt),
            updatedAt: now,
            previewText,
            duration: entry.duration || 0,
            hasFullTranscription: true,
            userId: undefined, // Add user ID if needed
            folderId: entry.folderId, // Ensure folder ID is saved
            isFavorite: entry.isFavorite || false
          };

          // Create transcription data
          const transcription: TranscriptionData = {
            entryId: entry.id,
            text: entry.transcription,
            segments: entry.segments || [],
            srtData: entry.srtData || '',
            summary: entry.summary || ''
          };

          await captainsLogDB.captainsLogEntries.put(dbEntry);
          await captainsLogDB.transcriptionData.put(transcription);
        }
      });

      console.log(`${entries.length} entries saved successfully`);
    } catch (error) {
      console.error('Error saving entries:', error);
      throw error;
    }
  },

  /**
   * Get all Captain's Log entries (metadata only)
   * @param userId Optional user ID to filter by
   */
  async getAllEntries(userId?: string): Promise<CaptainsLogEntry[]> {
    try {
      let query = captainsLogDB.captainsLogEntries.orderBy('createdAt').reverse();

      // Filter by user if specified
      if (userId) {
        query = query.filter(entry => entry.userId === userId);
      }

      return await query.toArray();
    } catch (error) {
      console.error('Error getting entries:', error);
      throw error;
    }
  },

  /**
   * Get all Captain's Log entries with full transcription data
   * @param userId Optional user ID to filter by
   */
  async getAllLogEntries(userId?: string): Promise<LogEntry[]> {
    try {
      console.log('getAllLogEntries called');

      // Get all entry metadata
      const entries = await this.getAllEntries(userId);
      console.log(`Retrieved ${entries.length} entries from database`);

      // Log folder IDs for debugging
      entries.forEach(entry => {
        console.log(`Entry ${entry.id} has folderId: ${entry.folderId}`);
      });

      // Get transcription data for each entry
      const logEntries: LogEntry[] = [];

      for (const entry of entries) {
        try {
          const transcription = await captainsLogDB.transcriptionData.get(entry.id);

          if (transcription) {
            // Create the LogEntry object with all properties
            const logEntry: LogEntry = {
              id: entry.id,
              title: entry.title,
              audioUrl: entry.audioUrl || '', // Use stored audioUrl if available
              transcription: transcription.text,
              summary: transcription.summary || '',
              duration: entry.duration,
              createdAt: entry.createdAt,
              updatedAt: entry.updatedAt,
              isFavorite: entry.isFavorite || false, // Use stored isFavorite if available
              segments: transcription.segments,
              srtData: transcription.srtData || '',
              folderId: entry.folderId // Use stored folderId if available
            };

            // Log the folder ID for debugging
            console.log(`Created LogEntry for ${entry.id} with folderId: ${logEntry.folderId}`);

            logEntries.push(logEntry);
          }
        } catch (error) {
          console.error(`Error getting transcription for entry ${entry.id}:`, error);
        }
      }

      // Check if any entries have folder assignments
      const entriesWithFolders = logEntries.filter(entry => entry.folderId !== undefined);
      console.log(`${entriesWithFolders.length} entries have folder assignments`);

      // Try to load folder assignments from localStorage as a fallback
      try {
        const localStorageEntries = localStorage.getItem('captainsLogEntries');
        if (localStorageEntries) {
          const parsedEntries = JSON.parse(localStorageEntries);
          if (Array.isArray(parsedEntries) && parsedEntries.length > 0) {
            console.log(`Found ${parsedEntries.length} entries in localStorage`);

            // Check for folder assignments in localStorage
            const lsEntriesWithFolders = parsedEntries.filter(entry => entry.folderId !== undefined);
            console.log(`${lsEntriesWithFolders.length} localStorage entries have folder assignments`);

            // If we have folder assignments in localStorage but not in IndexedDB, use them
            if (lsEntriesWithFolders.length > 0 && entriesWithFolders.length === 0) {
              console.log('Using folder assignments from localStorage');

              // Update logEntries with folder assignments from localStorage
              for (const entry of logEntries) {
                const lsEntry = parsedEntries.find(e => e.id === entry.id);
                if (lsEntry && lsEntry.folderId) {
                  entry.folderId = lsEntry.folderId;
                  console.log(`Updated entry ${entry.id} with folderId: ${entry.folderId} from localStorage`);
                }
              }
            }
          }
        }
      } catch (lsError) {
        console.warn('Error reading from localStorage:', lsError);
      }

      return logEntries;
    } catch (error) {
      console.error('Error getting all log entries:', error);
      throw error;
    }
  },

  /**
   * Get a specific Captain's Log entry with full transcription data
   */
  async getEntry(id: string): Promise<{entry: CaptainsLogEntry, transcription: TranscriptionData}> {
    try {
      const entry = await captainsLogDB.captainsLogEntries.get(id);

      if (!entry) {
        throw new Error(`Entry with ID ${id} not found`);
      }

      const transcription = await captainsLogDB.transcriptionData.get(id);

      if (!transcription) {
        throw new Error(`Transcription data for entry ${id} not found`);
      }

      return { entry, transcription };
    } catch (error) {
      console.error(`Error getting entry ${id}:`, error);
      throw error;
    }
  },

  /**
   * Get a specific Captain's Log entry as a LogEntry
   */
  async getLogEntry(id: string): Promise<LogEntry> {
    try {
      const { entry, transcription } = await this.getEntry(id);

      return {
        id: entry.id,
        title: entry.title,
        audioUrl: entry.audioUrl || '', // Use stored audioUrl if available
        transcription: transcription.text,
        summary: transcription.summary || '',
        duration: entry.duration,
        createdAt: entry.createdAt,
        updatedAt: entry.updatedAt,
        isFavorite: entry.isFavorite || false, // Use stored isFavorite if available
        segments: transcription.segments,
        srtData: transcription.srtData || '',
        folderId: entry.folderId // Use stored folderId if available
      };
    } catch (error) {
      console.error(`Error getting log entry ${id}:`, error);
      throw error;
    }
  },

  /**
   * Update an existing Captain's Log entry
   */
  async updateEntry(id: string, updates: Partial<LogEntry>): Promise<void> {
    try {
      await captainsLogDB.transaction('rw', [captainsLogDB.captainsLogEntries, captainsLogDB.transcriptionData], async () => {
        // Get existing entry
        const entry = await captainsLogDB.captainsLogEntries.get(id);

        if (!entry) {
          throw new Error(`Entry with ID ${id} not found`);
        }

        // Update entry metadata
        const updatedEntry: CaptainsLogEntry = {
          ...entry,
          title: updates.title || entry.title,
          updatedAt: new Date(),
          previewText: updates.transcription ?
            (updates.transcription.substring(0, 100) + (updates.transcription.length > 100 ? '...' : '')) :
            entry.previewText,
          duration: updates.duration || entry.duration,
          // Explicitly update folder ID if provided
          folderId: updates.folderId !== undefined ? updates.folderId : entry.folderId,
          // Update favorite status if provided
          isFavorite: updates.isFavorite !== undefined ? updates.isFavorite : (entry.isFavorite || false)
        };

        // Log folder ID for debugging
        console.log(`Updating entry ${id} with folder ID: ${updatedEntry.folderId}`);

        await captainsLogDB.captainsLogEntries.put(updatedEntry);

        // Update transcription data if provided
        if (updates.transcription || updates.segments || updates.srtData || updates.summary) {
          const transcription = await captainsLogDB.transcriptionData.get(id);

          if (transcription) {
            const updatedTranscription: TranscriptionData = {
              ...transcription,
              text: updates.transcription || transcription.text,
              segments: updates.segments || transcription.segments,
              srtData: updates.srtData || transcription.srtData,
              summary: updates.summary || transcription.summary
            };

            await captainsLogDB.transcriptionData.put(updatedTranscription);
          }
        }
      });

      console.log(`Entry ${id} updated successfully`);
    } catch (error) {
      console.error(`Error updating entry ${id}:`, error);
      throw error;
    }
  },

  /**
   * Delete a Captain's Log entry and its transcription data
   */
  async deleteEntry(id: string): Promise<void> {
    try {
      await captainsLogDB.transaction('rw', [captainsLogDB.captainsLogEntries, captainsLogDB.transcriptionData], async () => {
        await captainsLogDB.captainsLogEntries.delete(id);
        await captainsLogDB.transcriptionData.delete(id);
      });

      console.log(`Entry ${id} deleted successfully`);
    } catch (error) {
      console.error(`Error deleting entry ${id}:`, error);
      throw error;
    }
  },

  // Note: Custom folder operations have been moved to Prisma database
  // See src/actions/custom-folders.ts for custom folder CRUD operations

  /**
   * Assign an entry to a folder
   */
  async assignEntryToFolder(entryId: string, folderId: string | undefined): Promise<void> {
    try {
      console.log(`assignEntryToFolder called with entryId=${entryId}, folderId=${folderId}`);

      // Get the entry
      const entry = await captainsLogDB.captainsLogEntries.get(entryId);

      if (!entry) {
        throw new Error(`Entry with ID ${entryId} not found`);
      }

      console.log(`Original entry from database:`, entry);
      console.log(`Original folderId: ${entry.folderId}`);

      // Update the entry with the new folder ID
      const updatedEntry = {
        ...entry,
        folderId,
        updatedAt: new Date()
      };

      console.log(`Updated entry to save:`, updatedEntry);
      console.log(`New folderId: ${updatedEntry.folderId}`);

      // Save the updated entry
      try {
        await captainsLogDB.captainsLogEntries.put(updatedEntry);
        console.log(`Entry ${entryId} assigned to folder ${folderId || 'uncategorized'}`);

        // Verify the update
        const verifiedEntry = await captainsLogDB.captainsLogEntries.get(entryId);
        console.log(`Verified entry after update:`, verifiedEntry);
        console.log(`Verified folderId: ${verifiedEntry?.folderId}`);

        // Ensure folder assignment persists by saving to localStorage
        await ensureFolderAssignmentsPersist(entryId, folderId);
      } catch (dbError) {
        console.error(`Error saving to database:`, dbError);

        // Try to save directly to the database without transaction
        try {
          await captainsLogDB.captainsLogEntries.update(entryId, { folderId, updatedAt: new Date() });
          console.log(`Used direct update method as fallback`);

          // Ensure folder assignment persists by saving to localStorage
          await ensureFolderAssignmentsPersist(entryId, folderId);
        } catch (updateError) {
          console.error(`Error with direct update:`, updateError);

          // Even if database update fails, try to save to localStorage
          await ensureFolderAssignmentsPersist(entryId, folderId);

          throw updateError;
        }
      }
    } catch (error) {
      console.error(`Error assigning entry ${entryId} to folder:`, error);

      // Last resort: try to save to localStorage even if everything else fails
      try {
        await ensureFolderAssignmentsPersist(entryId, folderId);
      } catch (lsError) {
        console.error(`Failed to save to localStorage as last resort:`, lsError);
      }

      throw error;
    }
  },


};
