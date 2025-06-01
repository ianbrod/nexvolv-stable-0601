/**
 * Test script for IndexedDB storage functionality
 * 
 * This script tests the Captain's Log storage using IndexedDB.
 */

import { CaptainsLogStorage } from '../lib/storage/captains-log-storage';
import { captainsLogDB } from '../lib/storage/captains-log-database';
import { MigrationUtility } from '../lib/storage/migration-utility';

/**
 * Test saving and retrieving entries
 */
async function testSaveAndRetrieve() {
  try {
    console.log('Testing save and retrieve...');
    
    // Create a test transcription result
    const testTranscription = {
      text: 'This is a test transcription for IndexedDB storage.',
      segments: [
        { id: 0, start: 0, end: 2, text: 'This is a test' },
        { id: 1, start: 2, end: 4, text: 'transcription for IndexedDB storage.' }
      ],
      srtData: '1\n00:00:00,000 --> 00:00:02,000\nThis is a test\n\n2\n00:00:02,000 --> 00:00:04,000\ntranscription for IndexedDB storage.',
      summary: 'Test transcription'
    };
    
    // Save the entry
    const entryId = await CaptainsLogStorage.saveEntry(
      'Test Entry',
      testTranscription,
      'test-user'
    );
    
    console.log(`Entry saved with ID: ${entryId}`);
    
    // Retrieve all entries
    const allEntries = await CaptainsLogStorage.getAllEntries();
    console.log(`Retrieved ${allEntries.length} entries`);
    
    // Retrieve the specific entry
    const { entry, transcription } = await CaptainsLogStorage.getEntry(entryId);
    
    console.log('Retrieved entry:', entry);
    console.log('Retrieved transcription:', transcription);
    
    // Verify the data
    const isValid = 
      entry.title === 'Test Entry' &&
      entry.userId === 'test-user' &&
      transcription.text === testTranscription.text &&
      transcription.segments.length === testTranscription.segments.length;
    
    if (isValid) {
      console.log('Data verification passed');
    } else {
      console.error('Data verification failed');
    }
    
    // Clean up
    await CaptainsLogStorage.deleteEntry(entryId);
    console.log('Entry deleted');
    
    return isValid;
  } catch (error) {
    console.error('Error testing save and retrieve:', error);
    return false;
  }
}

/**
 * Test migration from localStorage
 */
async function testMigration() {
  try {
    console.log('Testing migration from localStorage...');
    
    // Clear any existing data
    await captainsLogDB.delete();
    await captainsLogDB.open();
    
    // Create test data in localStorage
    const testEntries = [
      {
        id: 'test-1',
        title: 'Test Entry 1',
        createdAt: new Date(),
        updatedAt: new Date(),
        transcription: 'This is test transcription 1',
        segments: [{ id: 0, start: 0, end: 2, text: 'This is test transcription 1' }]
      },
      {
        id: 'test-2',
        title: 'Test Entry 2',
        createdAt: new Date(),
        updatedAt: new Date(),
        transcription: 'This is test transcription 2',
        segments: [{ id: 0, start: 0, end: 2, text: 'This is test transcription 2' }]
      }
    ];
    
    // Save to localStorage
    localStorage.setItem('captainsLogEntries', JSON.stringify(testEntries));
    
    // Run migration
    const migrationResult = await MigrationUtility.migrateFromLocalStorage();
    
    console.log(`Migration result: ${migrationResult}`);
    
    // Verify migration
    const migratedEntries = await CaptainsLogStorage.getAllEntries();
    console.log(`Found ${migratedEntries.length} migrated entries`);
    
    const isValid = migratedEntries.length === testEntries.length;
    
    // Clean up
    await captainsLogDB.delete();
    await captainsLogDB.open();
    localStorage.removeItem('captainsLogEntries');
    
    return isValid;
  } catch (error) {
    console.error('Error testing migration:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Running IndexedDB storage tests...');
  
  const saveResult = await testSaveAndRetrieve();
  console.log(`Save and retrieve test ${saveResult ? 'PASSED' : 'FAILED'}`);
  
  const migrationResult = await testMigration();
  console.log(`Migration test ${migrationResult ? 'PASSED' : 'FAILED'}`);
  
  console.log('All tests completed');
}

// Run tests
runTests();
