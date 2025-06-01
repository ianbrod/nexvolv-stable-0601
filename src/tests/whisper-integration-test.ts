/**
 * Integration test for Whisper transcription with chunking
 * 
 * This script tests the complete Whisper transcription flow with real audio files.
 * It supports testing with files of different sizes to verify chunking functionality.
 */

import * as fs from 'fs';
import * as path from 'path';
import { whisperService } from '../lib/whisper/whisper-service';
import { CaptainsLogStorage } from '../lib/storage/captains-log-storage';

/**
 * Test transcription with a real audio file
 */
async function testTranscription(audioFilePath: string) {
  try {
    console.log(`Testing transcription with file: ${audioFilePath}`);
    
    // Read the audio file
    const audioBuffer = fs.readFileSync(audioFilePath);
    const audioBlob = new Blob([audioBuffer], { type: 'audio/wav' });
    
    // Log file size
    const fileSizeMB = audioBlob.size / (1024 * 1024);
    console.log(`Audio file size: ${fileSizeMB.toFixed(2)} MB`);
    
    // Start transcription with progress reporting
    console.log('Starting transcription...');
    const startTime = Date.now();
    
    const result = await whisperService.transcribeAudio(
      audioBlob,
      {
        language: 'en',
        wordTimestamps: true
      },
      (progress) => {
        console.log(`Transcription progress: ${progress.toFixed(1)}%`);
      }
    );
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`Transcription completed in ${duration.toFixed(2)} seconds`);
    console.log(`Transcription text (first 100 chars): ${result.text.substring(0, 100)}...`);
    console.log(`Number of segments: ${result.segments.length}`);
    
    // Save to IndexedDB
    console.log('Saving to IndexedDB...');
    const entryId = await CaptainsLogStorage.saveEntry(
      `Test - ${path.basename(audioFilePath)}`,
      result
    );
    
    console.log(`Saved to IndexedDB with ID: ${entryId}`);
    
    // Retrieve from IndexedDB to verify
    console.log('Retrieving from IndexedDB...');
    const { entry, transcription } = await CaptainsLogStorage.getEntry(entryId);
    
    console.log(`Retrieved entry: ${entry.title}`);
    console.log(`Retrieved transcription text length: ${transcription.text.length}`);
    console.log(`Retrieved segments count: ${transcription.segments.length}`);
    
    // Clean up
    await CaptainsLogStorage.deleteEntry(entryId);
    console.log('Test entry deleted from IndexedDB');
    
    return {
      success: true,
      fileSize: fileSizeMB,
      processingTime: duration,
      textLength: result.text.length,
      segmentsCount: result.segments.length
    };
  } catch (error) {
    console.error('Error in transcription test:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : String(error)
    };
  }
}

/**
 * Main test function
 */
async function runTest() {
  // Check if file path is provided
  if (process.argv.length < 3) {
    console.error('Please provide an audio file path as an argument');
    console.error('Example: npx ts-node src/tests/whisper-integration-test.ts path/to/audio.wav');
    process.exit(1);
  }
  
  const audioFilePath = process.argv[2];
  
  // Check if file exists
  if (!fs.existsSync(audioFilePath)) {
    console.error(`File not found: ${audioFilePath}`);
    process.exit(1);
  }
  
  // Run the test
  const result = await testTranscription(audioFilePath);
  
  if (result.success) {
    console.log('\n=== TEST SUMMARY ===');
    console.log(`File size: ${result.fileSize.toFixed(2)} MB`);
    console.log(`Processing time: ${result.processingTime.toFixed(2)} seconds`);
    console.log(`Text length: ${result.textLength} characters`);
    console.log(`Segments count: ${result.segmentsCount}`);
    console.log('TEST PASSED');
  } else {
    console.error('\n=== TEST SUMMARY ===');
    console.error(`Error: ${result.error}`);
    console.error('TEST FAILED');
    process.exit(1);
  }
}

// Run the test
runTest();
