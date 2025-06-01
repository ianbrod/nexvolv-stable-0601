import Dexie from 'dexie';
import { LogEntry } from '@/types';
import { DatabaseVersionManager } from './db-version-manager';

/**
 * Interface for database log entry
 * Updated to use single folder association for simplified UX
 */
export interface DBLogEntry {
  id: string;
  title: string;
  createdAt: Date;
  updatedAt: Date;
  previewText: string; // First 100 chars of transcription
  duration: number;
  hasFullTranscription: boolean;
  userId?: string;
  isFavorite?: boolean;
  // Single folder association (enforces single-folder UX)
  folderId?: string; // Single folder ID - can be category, goal, or subgoal ID with prefix
  folderType?: 'category' | 'goal' | 'subgoal' | 'custom'; // Type of folder for proper handling
  // Deprecated fields (kept for migration)
  categoryIds?: string[]; // Deprecated: Array of Prisma Category IDs
  goalIds?: string[]; // Deprecated: Array of Prisma Goal IDs
  subGoalIds?: string[]; // Deprecated: Array of Prisma SubGoal IDs
  tags?: string[]; // Deprecated: Array of tag IDs
  audioUrl?: string;
  // Processing status fields
  processingStatus?: 'idle' | 'converting' | 'creating' | 'transcribing' | 'complete' | 'error';
  processingProgress?: number; // 0-100
}

/**
 * Interface for transcription data
 */
export interface DBTranscriptionData {
  entryId: string;
  text: string;
  segments: any[];
  srtData?: string;
  summary?: string;
}

/**
 * Dexie database for Captain's Log with Prisma entity associations
 */
// Use a high version number to avoid conflicts with existing databases
// The error shows existing version is 40000000, so we need a version higher than that
const DB_VERSION = 60000000;

export class CaptainsLogDatabase extends Dexie {
  // Tables
  logEntries!: Dexie.Table<DBLogEntry, string>;
  transcriptionData!: Dexie.Table<DBTranscriptionData, string>;

  constructor() {
    super('captainsLogDatabase');

    // Define the schema for single folder association
    this.version(DB_VERSION).stores({
      logEntries: 'id, createdAt, updatedAt, userId, isFavorite, folderId, folderType',
      transcriptionData: 'entryId'
    }).upgrade(tx => {
      console.log(`Upgrading database to version ${DB_VERSION} for single folder association...`);

      // Migration logic: convert multiple associations to single association
      return tx.table('logEntries').toCollection().modify(entry => {
        // If entry has multiple associations, pick the first one and convert to single association
        if (entry.categoryIds && entry.categoryIds.length > 0) {
          entry.folderId = `category:${entry.categoryIds[0]}`;
          entry.folderType = 'category';
        } else if (entry.goalIds && entry.goalIds.length > 0) {
          entry.folderId = `goal:${entry.goalIds[0]}`;
          entry.folderType = 'goal';
        } else if (entry.subGoalIds && entry.subGoalIds.length > 0) {
          entry.folderId = `subgoal:${entry.subGoalIds[0]}`;
          entry.folderType = 'subgoal';
        } else if (entry.folderId && !entry.folderId.includes(':')) {
          // Handle legacy folderId format
          entry.folderType = 'custom';
        }

        console.log(`Migrated entry ${entry.id} to single association: ${entry.folderId} (${entry.folderType})`);
      }).then(() => {
        console.log('Database migration to single folder association complete');
      });
    });
  }

  /**
   * Initialize the database
   */
  async initialize(): Promise<void> {
    try {
      console.log('Captain\'s Log database initialized');
    } catch (error) {
      console.error('Error initializing database:', error);
      throw error;
    }
  }

  /**
   * Reset the database by deleting it and recreating it
   * This is useful when there's a version mismatch or other database issues
   */
  static async resetDatabase(): Promise<void> {
    try {
      console.log('Attempting to reset captainsLogDatabase...');

      // Close the current database connection if it's open
      try {
        captainsLogDB.close();
        console.log('Closed existing database connection');
      } catch (err) {
        console.warn('Error closing database connection:', err);
        // Continue anyway
      }

      // Delete the database
      await DatabaseVersionManager.resetDatabase('captainsLogDatabase');
      console.log('Database reset complete');

      // Force page reload to ensure clean state
      if (typeof window !== 'undefined') {
        window.location.reload();
      }
    } catch (error) {
      console.error('Failed to reset Captain\'s Log database:', error);
      throw error;
    }
  }

  /**
   * Check if the database needs to be reset due to version conflicts
   */
  static async checkDatabaseVersion(): Promise<{ needsReset: boolean, currentVersion: number | null }> {
    return DatabaseVersionManager.checkDatabaseVersion('captainsLogDatabase', DB_VERSION);
  }

  /**
   * Handle a version error by checking if the database needs to be reset
   */
  static async handleVersionError(): Promise<boolean> {
    return DatabaseVersionManager.handleVersionError('captainsLogDatabase', DB_VERSION);
  }
}

// Create a singleton instance of the database
export const captainsLogDB = new CaptainsLogDatabase();

/**
 * Helper function to convert a DBLogEntry to a LogEntry
 */
export function dbEntryToLogEntry(dbEntry: DBLogEntry, transcription?: DBTranscriptionData): LogEntry {
  return {
    id: dbEntry.id,
    title: dbEntry.title,
    audioUrl: dbEntry.audioUrl || '',
    transcription: transcription?.text || '',
    summary: transcription?.summary,
    duration: dbEntry.duration,
    createdAt: dbEntry.createdAt,
    updatedAt: dbEntry.updatedAt,
    isFavorite: dbEntry.isFavorite || false,
    // Single folder association
    folderId: dbEntry.folderId,
    folderType: dbEntry.folderType,
    // Deprecated fields (kept for migration)
    categoryIds: dbEntry.categoryIds || [],
    goalIds: dbEntry.goalIds || [],
    subGoalIds: dbEntry.subGoalIds || [],
    tags: dbEntry.tags || [],
    segments: transcription?.segments,
    srtData: transcription?.srtData,
    // Processing status fields
    processingStatus: dbEntry.processingStatus,
    processingProgress: dbEntry.processingProgress
  };
}

/**
 * Helper function to convert a LogEntry to a DBLogEntry
 */
export function logEntryToDBEntry(entry: LogEntry): DBLogEntry {
  return {
    id: entry.id,
    title: entry.title,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    previewText: entry.transcription.substring(0, 100),
    duration: entry.duration,
    hasFullTranscription: !!entry.transcription,
    userId: undefined, // Set this based on your auth system
    isFavorite: entry.isFavorite,
    // Single folder association
    folderId: entry.folderId,
    folderType: entry.folderType,
    // Deprecated fields (kept for migration)
    categoryIds: entry.categoryIds || [],
    goalIds: entry.goalIds || [],
    subGoalIds: entry.subGoalIds || [],
    tags: entry.tags || [],
    audioUrl: entry.audioUrl,
    // Processing status fields
    processingStatus: entry.processingStatus,
    processingProgress: entry.processingProgress
  };
}
