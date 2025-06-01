/**
 * Audio URL Migration Utility
 * 
 * This utility helps migrate log entries that have broken blob URLs
 * to use proper data URLs or handle missing audio gracefully.
 */

import { captainsLogDB } from '@/lib/storage/tag-database';

/**
 * Check if an audio URL is a broken blob URL
 */
export function isBrokenBlobUrl(audioUrl: string): boolean {
  return audioUrl.startsWith('blob:') && !audioUrl.includes('data:');
}

/**
 * Check if an audio URL is a valid data URL
 */
export function isValidDataUrl(audioUrl: string): boolean {
  return audioUrl.startsWith('data:audio/');
}

/**
 * Migrate broken blob URLs in the database
 * This function will:
 * 1. Find all entries with broken blob URLs
 * 2. Set their audioUrl to empty string (graceful degradation)
 * 3. Log the affected entries for user awareness
 */
export async function migrateBrokenAudioUrls(): Promise<{
  totalEntries: number;
  brokenEntries: number;
  fixedEntries: number;
}> {
  try {
    console.log('Starting audio URL migration...');
    
    // Get all log entries
    const allEntries = await captainsLogDB.logEntries.toArray();
    const totalEntries = allEntries.length;
    
    // Find entries with broken blob URLs
    const brokenEntries = allEntries.filter(entry => 
      entry.audioUrl && isBrokenBlobUrl(entry.audioUrl)
    );
    
    console.log(`Found ${brokenEntries.length} entries with broken blob URLs out of ${totalEntries} total entries`);
    
    if (brokenEntries.length === 0) {
      console.log('No broken audio URLs found. Migration not needed.');
      return {
        totalEntries,
        brokenEntries: 0,
        fixedEntries: 0
      };
    }
    
    // Fix broken entries by setting audioUrl to empty string
    let fixedEntries = 0;
    for (const entry of brokenEntries) {
      try {
        await captainsLogDB.logEntries.update(entry.id, {
          audioUrl: '', // Set to empty string for graceful degradation
          updatedAt: new Date()
        });
        
        console.log(`Fixed entry: ${entry.title} (ID: ${entry.id})`);
        fixedEntries++;
      } catch (error) {
        console.error(`Failed to fix entry ${entry.id}:`, error);
      }
    }
    
    console.log(`Migration complete. Fixed ${fixedEntries} out of ${brokenEntries.length} broken entries.`);
    
    return {
      totalEntries,
      brokenEntries: brokenEntries.length,
      fixedEntries
    };
    
  } catch (error) {
    console.error('Error during audio URL migration:', error);
    throw error;
  }
}

/**
 * Get statistics about audio URLs in the database
 */
export async function getAudioUrlStats(): Promise<{
  totalEntries: number;
  entriesWithAudio: number;
  validDataUrls: number;
  brokenBlobUrls: number;
  emptyAudioUrls: number;
  otherUrls: number;
}> {
  try {
    const allEntries = await captainsLogDB.logEntries.toArray();
    
    const stats = {
      totalEntries: allEntries.length,
      entriesWithAudio: 0,
      validDataUrls: 0,
      brokenBlobUrls: 0,
      emptyAudioUrls: 0,
      otherUrls: 0
    };
    
    for (const entry of allEntries) {
      if (!entry.audioUrl || entry.audioUrl.trim() === '') {
        stats.emptyAudioUrls++;
      } else {
        stats.entriesWithAudio++;
        
        if (isValidDataUrl(entry.audioUrl)) {
          stats.validDataUrls++;
        } else if (isBrokenBlobUrl(entry.audioUrl)) {
          stats.brokenBlobUrls++;
        } else {
          stats.otherUrls++;
        }
      }
    }
    
    return stats;
  } catch (error) {
    console.error('Error getting audio URL stats:', error);
    throw error;
  }
}

/**
 * Auto-run migration on app startup if needed
 */
export async function autoMigrateIfNeeded(): Promise<void> {
  try {
    const stats = await getAudioUrlStats();
    
    if (stats.brokenBlobUrls > 0) {
      console.log(`Found ${stats.brokenBlobUrls} entries with broken blob URLs. Running auto-migration...`);
      await migrateBrokenAudioUrls();
    } else {
      console.log('No broken audio URLs found. No migration needed.');
    }
  } catch (error) {
    console.error('Error during auto-migration:', error);
    // Don't throw - this is a background process
  }
}
