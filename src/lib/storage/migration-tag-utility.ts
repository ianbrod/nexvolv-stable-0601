/**
 * Migration Utility for Prisma Association Architecture
 * Provides utilities for migrating data from the tag-based system to Prisma associations
 */

import { captainsLogDB } from './tag-database';

/**
 * Utility for migrating data to the Prisma association system
 */
export const MigrationUtility = {
  /**
   * Migrate all log entries to the new Prisma association system
   */
  async migrateLogEntriesToPrismaAssociations(): Promise<void> {
    try {
      console.log('Starting migration of log entries to Prisma association system...');

      // Get all log entries
      const entries = await captainsLogDB.logEntries.toArray();
      console.log(`Found ${entries.length} log entries to migrate`);

      let migratedCount = 0;

      for (const entry of entries) {
        let needsUpdate = false;
        const updates: any = {};

        // Initialize new association arrays if they don't exist
        if (!entry.categoryIds || !Array.isArray(entry.categoryIds)) {
          updates.categoryIds = [];
          needsUpdate = true;
        }
        if (!entry.goalIds || !Array.isArray(entry.goalIds)) {
          updates.goalIds = [];
          needsUpdate = true;
        }
        if (!entry.subGoalIds || !Array.isArray(entry.subGoalIds)) {
          updates.subGoalIds = [];
          needsUpdate = true;
        }

        // Ensure tags array exists for backward compatibility
        if (!entry.tags || !Array.isArray(entry.tags)) {
          updates.tags = [];
          needsUpdate = true;
        }

        if (needsUpdate) {
          await captainsLogDB.logEntries.update(entry.id, updates);
          migratedCount++;
          console.log(`Migrated entry ${entry.id} - added association arrays`);
        }
      }

      console.log(`Migration complete. Migrated ${migratedCount} entries.`);
    } catch (error) {
      console.error('Error during log entry migration:', error);
      throw error;
    }
  },

  /**
   * Get migration status
   */
  async getMigrationStatus(): Promise<{
    totalEntries: number;
    entriesWithAssociations: number;
    entriesNeedingMigration: number;
    entriesWithDeprecatedTags: number;
  }> {
    try {
      const entries = await captainsLogDB.logEntries.toArray();
      const totalEntries = entries.length;

      const entriesWithAssociations = entries.filter(entry =>
        entry.categoryIds && Array.isArray(entry.categoryIds) &&
        entry.goalIds && Array.isArray(entry.goalIds) &&
        entry.subGoalIds && Array.isArray(entry.subGoalIds)
      ).length;

      const entriesNeedingMigration = totalEntries - entriesWithAssociations;

      const entriesWithDeprecatedTags = entries.filter(entry =>
        entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0
      ).length;

      return {
        totalEntries,
        entriesWithAssociations,
        entriesNeedingMigration,
        entriesWithDeprecatedTags
      };
    } catch (error) {
      console.error('Error getting migration status:', error);
      throw error;
    }
  },

  /**
   * Clean up deprecated tag references (run after migration is complete)
   */
  async cleanupDeprecatedTags(): Promise<void> {
    try {
      console.log('Starting cleanup of deprecated tag references...');

      const entries = await captainsLogDB.logEntries.toArray();
      let cleanedCount = 0;

      for (const entry of entries) {
        if (entry.tags && Array.isArray(entry.tags) && entry.tags.length > 0) {
          // Clear deprecated tags array
          await captainsLogDB.logEntries.update(entry.id, {
            tags: []
          });
          cleanedCount++;
          console.log(`Cleaned deprecated tags from entry ${entry.id}`);
        }
      }

      console.log(`Cleanup complete. Cleaned ${cleanedCount} entries.`);
    } catch (error) {
      console.error('Error during tag cleanup:', error);
      throw error;
    }
  }
};
