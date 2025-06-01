/**
 * Test script for Whisper chunking functionality
 * 
 * This script tests the audio chunking and transcription with chunking functionality.
 */

import { whisperService } from '../lib/whisper/whisper-service';
import { splitAudioIntoChunks } from '../lib/whisper/audio-chunker';

/**
 * Test audio chunking
 */
async function testAudioChunking() {
  try {
    console.log('Testing audio chunking...');
    
    // Create a test audio blob (this would be a real audio file in production)
    const testAudioBlob = new Blob([], { type: 'audio/wav' });
    
    // Split into chunks
    const chunks = await splitAudioIntoChunks(testAudioBlob);
    
    console.log(`Successfully split audio into ${chunks.length} chunks`);
    console.log('Chunk sizes:', chunks.map(chunk => chunk.size));
    
    return true;
  } catch (error) {
    console.error('Error testing audio chunking:', error);
    return false;
  }
}

/**
 * Test transcription with chunking
 */
async function testTranscriptionWithChunking() {
  try {
    console.log('Testing transcription with chunking...');
    
    // Create a test audio blob (this would be a real audio file in production)
    const testAudioBlob = new Blob([], { type: 'audio/wav' });
    
    // Set the size to trigger chunking (> 5MB)
    Object.defineProperty(testAudioBlob, 'size', { value: 6 * 1024 * 1024 });
    
    // Mock the transcribeWithChunking method to avoid actual transcription
    const originalMethod = whisperService.transcribeWithChunking;
    whisperService.transcribeWithChunking = async () => {
      console.log('Mock transcribeWithChunking called');
      return {
        text: 'Test transcription',
        segments: []
      };
    };
    
    // Call transcribeAudio which should use chunking for large files
    const result = await whisperService.transcribeAudio(testAudioBlob);
    
    // Restore original method
    whisperService.transcribeWithChunking = originalMethod;
    
    console.log('Transcription result:', result);
    
    return true;
  } catch (error) {
    console.error('Error testing transcription with chunking:', error);
    return false;
  }
}

/**
 * Run all tests
 */
async function runTests() {
  console.log('Running Whisper chunking tests...');
  
  const chunkingResult = await testAudioChunking();
  console.log(`Audio chunking test ${chunkingResult ? 'PASSED' : 'FAILED'}`);
  
  const transcriptionResult = await testTranscriptionWithChunking();
  console.log(`Transcription with chunking test ${transcriptionResult ? 'PASSED' : 'FAILED'}`);
  
  console.log('All tests completed');
}

// Run tests
runTests();
