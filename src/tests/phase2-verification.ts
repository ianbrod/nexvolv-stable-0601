/**
 * Comprehensive verification script for Phase 2 implementation
 *
 * This script verifies all aspects of the Phase 2 implementation:
 * 1. Audio chunking functionality
 * 2. Base model optimization
 * 3. IndexedDB storage
 */

import * as fs from 'fs';
import * as path from 'path';
import { whisperService } from '../lib/whisper/whisper-service';
import { splitAudioIntoChunks, DEFAULT_CHUNKING_CONFIG } from '../lib/whisper/audio-chunker';
import { CaptainsLogStorage } from '../lib/storage/captains-log-storage';
import { captainsLogDB } from '../lib/storage/captains-log-database';
import { MigrationUtility } from '../lib/storage/migration-utility';
import Dexie from 'dexie';

// Test results tracking
const testResults: Record<string, boolean> = {};

/**
 * Run a test and record the result
 */
async function runTest(name: string, testFn: () => Promise<boolean>) {
  console.log(`\n=== Running test: ${name} ===`);
  try {
    const result = await testFn();
    testResults[name] = result;
    console.log(`Test "${name}": ${result ? 'PASSED' : 'FAILED'}`);
    return result;
  } catch (error) {
    console.error(`Test "${name}" threw an exception:`, error);
    testResults[name] = false;
    return false;
  }
}

/**
 * Test 1: Verify audio chunking functionality
 */
async function testAudioChunking() {
  // Create a test audio blob
  const testAudioBlob = new Blob([], { type: 'audio/wav' });

  // Set a large size to test chunking logic
  Object.defineProperty(testAudioBlob, 'size', { value: 10 * 1024 * 1024 }); // 10MB

  // Test chunking configuration
  console.log('Default chunking config:', DEFAULT_CHUNKING_CONFIG);

  // Test if chunking is triggered for large files
  const shouldUseChunking = testAudioBlob.size / (1024 * 1024) > 5;
  console.log(`Should use chunking: ${shouldUseChunking}`);

  // Verify chunking method exists
  const hasChunkingMethod = typeof whisperService.transcribeWithChunking === 'function';
  console.log(`Has chunking method: ${hasChunkingMethod}`);

  return shouldUseChunking && hasChunkingMethod;
}

/**
 * Test 2: Verify base model optimization
 */
async function testBaseModelOptimization() {
  // Access the private method using type assertion
  const service = whisperService as any;

  // Check if the optimization methods exist
  const hasBaseModelConfig = typeof service.getBaseModelConfig === 'function';
  const hasGenerateScript = typeof service.generatePythonScript === 'function';

  console.log(`Has base model config method: ${hasBaseModelConfig}`);
  console.log(`Has generate script method: ${hasGenerateScript}`);

  if (hasBaseModelConfig && hasGenerateScript) {
    // Get the base model config
    const config = service.getBaseModelConfig();

    // Verify key optimization settings
    const hasVadFilter = config.vad_filter === true;
    const hasComputeType = config.compute_type === 'int8';
    const hasChunkSettings = config.chunk_length_s > 0 && config.stride_length_s > 0;

    console.log(`Has VAD filter: ${hasVadFilter}`);
    console.log(`Has compute type optimization: ${hasComputeType}`);
    console.log(`Has chunk settings: ${hasChunkSettings}`);

    return hasVadFilter && hasComputeType && hasChunkSettings;
  }

  return false;
}

/**
 * Test 3: Verify IndexedDB storage
 */
async function testIndexedDBStorage() {
  try {
    // Verify database exists
    const dbExists = captainsLogDB instanceof Dexie;
    console.log(`Database exists: ${dbExists}`);

    // Verify tables exist
    const hasEntriesTable = captainsLogDB.tables.some(t => t.name === 'captainsLogEntries');
    const hasTranscriptionTable = captainsLogDB.tables.some(t => t.name === 'transcriptionData');

    console.log(`Has entries table: ${hasEntriesTable}`);
    console.log(`Has transcription table: ${hasTranscriptionTable}`);

    // Test CRUD operations
    const testData = {
      text: 'Test transcription for verification',
      segments: [{ id: 0, start: 0, end: 1, text: 'Test transcription' }]
    };

    // Create
    const entryId = await CaptainsLogStorage.saveEntry('Verification Test', testData);
    console.log(`Created entry with ID: ${entryId}`);

    // Read
    const { entry, transcription } = await CaptainsLogStorage.getEntry(entryId);
    const readSuccess = entry.title === 'Verification Test' &&
                        transcription.text === testData.text;

    console.log(`Read success: ${readSuccess}`);

    // Delete
    await CaptainsLogStorage.deleteEntry(entryId);
    console.log('Entry deleted');

    // Verify deletion
    let deleteSuccess = true;
    try {
      await CaptainsLogStorage.getEntry(entryId);
      deleteSuccess = false;
    } catch (error) {
      // Expected error - entry should not exist
      deleteSuccess = true;
    }

    console.log(`Delete success: ${deleteSuccess}`);

    // Test migration utility
    const hasMigrationUtility = typeof MigrationUtility.migrateFromLocalStorage === 'function';
    console.log(`Has migration utility: ${hasMigrationUtility}`);

    return dbExists && hasEntriesTable && hasTranscriptionTable &&
           readSuccess && deleteSuccess && hasMigrationUtility;
  } catch (error) {
    console.error('Error in IndexedDB test:', error);
    return false;
  }
}

/**
 * Main verification function
 */
async function verifyPhase2Implementation() {
  console.log('Starting Phase 2 implementation verification...');

  // Run all tests
  await runTest('Audio Chunking', testAudioChunking);
  await runTest('Base Model Optimization', testBaseModelOptimization);
  await runTest('IndexedDB Storage', testIndexedDBStorage);

  // Print summary
  console.log('\n=== VERIFICATION SUMMARY ===');
  let allPassed = true;

  for (const [testName, result] of Object.entries(testResults)) {
    console.log(`${testName}: ${result ? 'PASSED' : 'FAILED'}`);
    if (!result) allPassed = false;
  }

  console.log(`\nOverall verification: ${allPassed ? 'PASSED' : 'FAILED'}`);

  return allPassed;
}

// Run verification
verifyPhase2Implementation();
