/**
 * Verification script for FFmpeg-based audio chunking
 * 
 * This script tests the FFmpeg-based audio chunking implementation.
 * Run with: node src/tests/verify-ffmpeg-chunking.js
 */

const fs = require('fs');
const path = require('path');
const { exec } = require('child_process');
const { promisify } = require('util');
const execPromise = promisify(exec);

// Test results tracking
const testResults = {};

/**
 * Run a test and record the result
 */
async function runTest(name, testFn) {
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
 * Test 1: Verify FFmpeg is installed
 */
async function testFFmpegInstallation() {
  try {
    const { stdout } = await execPromise('ffmpeg -version');
    console.log('FFmpeg version info:', stdout.split('\n')[0]);
    return true;
  } catch (error) {
    console.error('FFmpeg is not installed or not in PATH');
    return false;
  }
}

/**
 * Test 2: Verify FFmpeg can split audio files
 */
async function testFFmpegSplitting() {
  // Create a temporary directory for test files
  const tempDir = path.join(__dirname, 'temp');
  if (!fs.existsSync(tempDir)) {
    fs.mkdirSync(tempDir, { recursive: true });
  }
  
  try {
    // Create a test audio file (1 second of silence)
    const testAudioPath = path.join(tempDir, 'test_audio.wav');
    await execPromise(`ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 1 -c:a pcm_s16le "${testAudioPath}"`);
    console.log(`Created test audio file: ${testAudioPath}`);
    
    // Split the audio file
    const outputPath = path.join(tempDir, 'test_chunk.wav');
    await execPromise(`ffmpeg -y -i "${testAudioPath}" -ss 0 -t 0.5 -c copy "${outputPath}"`);
    console.log(`Created test chunk: ${outputPath}`);
    
    // Verify the chunk exists
    const chunkExists = fs.existsSync(outputPath);
    console.log(`Chunk file exists: ${chunkExists}`);
    
    // Clean up
    fs.unlinkSync(testAudioPath);
    fs.unlinkSync(outputPath);
    fs.rmdirSync(tempDir);
    
    return chunkExists;
  } catch (error) {
    console.error('Error testing FFmpeg splitting:', error);
    return false;
  }
}

/**
 * Test 3: Verify audio-chunker.ts implementation
 */
async function testAudioChunkerImplementation() {
  const audioChunkerPath = path.join(__dirname, '..', 'lib', 'whisper', 'audio-chunker.ts');
  
  if (!fs.existsSync(audioChunkerPath)) {
    console.error(`audio-chunker.ts not found at ${audioChunkerPath}`);
    return false;
  }
  
  const content = fs.readFileSync(audioChunkerPath, 'utf8');
  
  // Check for key functions
  const hasSplitAudioWithFFmpeg = content.includes('splitAudioWithFFmpeg');
  const hasCleanupChunks = content.includes('cleanupChunks');
  
  console.log(`splitAudioWithFFmpeg function: ${hasSplitAudioWithFFmpeg ? 'FOUND' : 'MISSING'}`);
  console.log(`cleanupChunks function: ${hasCleanupChunks ? 'FOUND' : 'MISSING'}`);
  
  return hasSplitAudioWithFFmpeg && hasCleanupChunks;
}

/**
 * Test 4: Verify whisper-service.ts implementation
 */
async function testWhisperServiceImplementation() {
  const whisperServicePath = path.join(__dirname, '..', 'lib', 'whisper', 'whisper-service.ts');
  
  if (!fs.existsSync(whisperServicePath)) {
    console.error(`whisper-service.ts not found at ${whisperServicePath}`);
    return false;
  }
  
  const content = fs.readFileSync(whisperServicePath, 'utf8');
  
  // Check for key functions
  const hasTranscribeWithFFmpegChunking = content.includes('transcribeWithFFmpegChunking');
  
  console.log(`transcribeWithFFmpegChunking function: ${hasTranscribeWithFFmpegChunking ? 'FOUND' : 'MISSING'}`);
  
  return hasTranscribeWithFFmpegChunking;
}

/**
 * Main verification function
 */
async function verifyFFmpegChunking() {
  console.log('Starting FFmpeg chunking verification...');
  
  // Run all tests
  await runTest('FFmpeg Installation', testFFmpegInstallation);
  await runTest('FFmpeg Splitting', testFFmpegSplitting);
  await runTest('Audio Chunker Implementation', testAudioChunkerImplementation);
  await runTest('Whisper Service Implementation', testWhisperServiceImplementation);
  
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
verifyFFmpegChunking();
