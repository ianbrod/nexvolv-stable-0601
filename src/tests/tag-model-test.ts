/**
 * Test script for validating the tag-based architecture implementation (Phase 1)
 */

import { Tag, TagType, createTag, isSystemTag, getTagTypeFromId } from '../lib/storage/tag-model';
import { tagDB, dbEntryToLogEntry, logEntryToDBEntry } from '../lib/storage/tag-database';
import { LogEntry } from '@/types';

/**
 * Test the Tag model implementation
 */
function testTagModel(): boolean {
  console.log('Testing Tag model...');
  
  try {
    // Test creating a category tag
    const categoryTag = createTag('Work', TagType.CATEGORY, {
      color: '#ff0000',
      isSystem: true,
      order: 1
    });
    
    console.log('Created category tag:', categoryTag);
    
    // Validate the tag properties
    if (categoryTag.name !== 'Work' || 
        categoryTag.color !== '#ff0000' || 
        categoryTag.type !== TagType.CATEGORY ||
        categoryTag.isSystem !== true ||
        categoryTag.order !== 1) {
      console.error('Tag properties do not match expected values');
      return false;
    }
    
    // Test tag ID prefix
    if (!categoryTag.id.startsWith('cat-tag-')) {
      console.error('Category tag ID does not have the correct prefix');
      return false;
    }
    
    // Test isSystemTag function
    if (!isSystemTag(categoryTag.id)) {
      console.error('isSystemTag failed to identify a system tag');
      return false;
    }
    
    // Test getTagTypeFromId function
    const tagType = getTagTypeFromId(categoryTag.id);
    if (tagType !== TagType.CATEGORY) {
      console.error('getTagTypeFromId failed to return the correct tag type');
      return false;
    }
    
    // Test creating a user tag
    const userTag = createTag('Personal', TagType.USER, {
      color: '#00ff00',
      isSystem: false,
      order: 2
    });
    
    console.log('Created user tag:', userTag);
    
    // Test isSystemTag function with user tag
    if (isSystemTag(userTag.id)) {
      console.error('isSystemTag incorrectly identified a user tag as a system tag');
      return false;
    }
    
    console.log('Tag model tests passed!');
    return true;
  } catch (error) {
    console.error('Error testing Tag model:', error);
    return false;
  }
}

/**
 * Test the LogEntry model update
 */
function testLogEntryModel(): boolean {
  console.log('Testing LogEntry model...');
  
  try {
    // Create a sample log entry
    const logEntry: LogEntry = {
      id: 'test-entry-1',
      title: 'Test Entry',
      audioUrl: 'https://example.com/audio.mp3',
      transcription: 'This is a test transcription',
      duration: 60,
      createdAt: new Date(),
      updatedAt: new Date(),
      isFavorite: false,
      tags: ['tag-1', 'tag-2'], // Now required
      folderId: 'old-folder-id' // Deprecated but still supported
    };
    
    console.log('Created log entry:', logEntry);
    
    // Convert to DB entry
    const dbEntry = logEntryToDBEntry(logEntry);
    console.log('Converted to DB entry:', dbEntry);
    
    // Validate conversion
    if (!Array.isArray(dbEntry.tags) || dbEntry.tags.length !== 2) {
      console.error('DB entry tags are not correctly converted');
      return false;
    }
    
    // Convert back to log entry
    const convertedEntry = dbEntryToLogEntry(dbEntry, {
      entryId: dbEntry.id,
      text: logEntry.transcription,
      segments: []
    });
    console.log('Converted back to log entry:', convertedEntry);
    
    // Validate conversion back
    if (!Array.isArray(convertedEntry.tags) || convertedEntry.tags.length !== 2) {
      console.error('Converted entry tags are not correctly converted');
      return false;
    }
    
    console.log('LogEntry model tests passed!');
    return true;
  } catch (error) {
    console.error('Error testing LogEntry model:', error);
    return false;
  }
}

/**
 * Test the database schema
 */
async function testDatabaseSchema(): Promise<boolean> {
  console.log('Testing database schema...');
  
  try {
    // Open the database
    await tagDB.open();
    console.log('Database opened successfully');
    
    // Check if tables exist
    const tableNames = tagDB.tables.map(table => table.name);
    console.log('Database tables:', tableNames);
    
    const requiredTables = ['logEntries', 'transcriptionData', 'tags', 'tagEntryRelations'];
    for (const tableName of requiredTables) {
      if (!tableNames.includes(tableName)) {
        console.error(`Required table '${tableName}' is missing`);
        return false;
      }
    }
    
    // Close the database
    tagDB.close();
    console.log('Database closed successfully');
    
    console.log('Database schema tests passed!');
    return true;
  } catch (error) {
    console.error('Error testing database schema:', error);
    return false;
  }
}

/**
 * Run all tests
 */
export async function runTagModelTests(): Promise<boolean> {
  console.log('Running tag model tests...');
  
  const tagModelResult = testTagModel();
  const logEntryModelResult = testLogEntryModel();
  const databaseSchemaResult = await testDatabaseSchema();
  
  const allTestsPassed = tagModelResult && logEntryModelResult && databaseSchemaResult;
  
  console.log('All tests passed:', allTestsPassed);
  return allTestsPassed;
}

// Run tests if this file is executed directly
if (typeof window !== 'undefined') {
  console.log('Running tag model tests in browser...');
  runTagModelTests().then(result => {
    console.log('Tests completed with result:', result);
  });
}
