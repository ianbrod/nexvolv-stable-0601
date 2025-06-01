/**
 * Simple verification script for Phase 2 implementation
 * 
 * This script verifies the existence of all required files and their structure
 * without requiring TypeScript compilation.
 */

const fs = require('fs');
const path = require('path');

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
 * Test 1: Verify file existence
 */
async function testFileExistence() {
  const requiredFiles = [
    'src/lib/whisper/audio-chunker.ts',
    'src/lib/whisper/whisper-service.ts',
    'src/lib/storage/captains-log-database.ts',
    'src/lib/storage/captains-log-storage.ts',
    'src/lib/storage/migration-utility.ts'
  ];
  
  const results = {};
  
  for (const file of requiredFiles) {
    const exists = fs.existsSync(file);
    results[file] = exists;
    console.log(`${file}: ${exists ? 'EXISTS' : 'MISSING'}`);
  }
  
  const allExist = Object.values(results).every(result => result === true);
  return allExist;
}

/**
 * Test 2: Verify file content for key functions
 */
async function testFileContent() {
  const filesToCheck = [
    {
      path: 'src/lib/whisper/audio-chunker.ts',
      requiredContent: [
        'splitAudioIntoChunks',
        'DEFAULT_CHUNKING_CONFIG',
        'audioBufferToWav'
      ]
    },
    {
      path: 'src/lib/whisper/whisper-service.ts',
      requiredContent: [
        'transcribeWithChunking',
        'mergeTranscriptionResults',
        'getBaseModelConfig',
        'generatePythonScript'
      ]
    },
    {
      path: 'src/lib/storage/captains-log-database.ts',
      requiredContent: [
        'CaptainsLogDatabase',
        'CaptainsLogEntry',
        'TranscriptionData'
      ]
    },
    {
      path: 'src/lib/storage/captains-log-storage.ts',
      requiredContent: [
        'saveEntry',
        'getAllEntries',
        'getEntry',
        'deleteEntry'
      ]
    },
    {
      path: 'src/lib/storage/migration-utility.ts',
      requiredContent: [
        'migrateFromLocalStorage'
      ]
    }
  ];
  
  const results = {};
  
  for (const file of filesToCheck) {
    if (!fs.existsSync(file.path)) {
      results[file.path] = false;
      console.log(`${file.path}: MISSING`);
      continue;
    }
    
    const content = fs.readFileSync(file.path, 'utf8');
    const contentResults = {};
    
    for (const requiredString of file.requiredContent) {
      const hasContent = content.includes(requiredString);
      contentResults[requiredString] = hasContent;
      console.log(`${file.path} - ${requiredString}: ${hasContent ? 'FOUND' : 'MISSING'}`);
    }
    
    results[file.path] = Object.values(contentResults).every(result => result === true);
  }
  
  const allContentValid = Object.values(results).every(result => result === true);
  return allContentValid;
}

/**
 * Test 3: Verify chunking implementation
 */
async function testChunkingImplementation() {
  const whisperServicePath = 'src/lib/whisper/whisper-service.ts';
  const content = fs.readFileSync(whisperServicePath, 'utf8');
  
  // Check for key chunking logic
  const hasChunkSizeCheck = content.includes('fileSizeMB > 5');
  const hasChunkingMethod = content.includes('transcribeWithChunking');
  const hasMergeMethod = content.includes('mergeTranscriptionResults');
  
  console.log(`Size-based chunking check: ${hasChunkSizeCheck ? 'FOUND' : 'MISSING'}`);
  console.log(`Chunking method: ${hasChunkingMethod ? 'FOUND' : 'MISSING'}`);
  console.log(`Merge results method: ${hasMergeMethod ? 'FOUND' : 'MISSING'}`);
  
  return hasChunkSizeCheck && hasChunkingMethod && hasMergeMethod;
}

/**
 * Test 4: Verify base model optimization
 */
async function testBaseModelOptimization() {
  const whisperServicePath = 'src/lib/whisper/whisper-service.ts';
  const content = fs.readFileSync(whisperServicePath, 'utf8');
  
  // Check for key optimization features
  const hasBaseModelConfig = content.includes('getBaseModelConfig');
  const hasVadFilter = content.includes('vad_filter: true');
  const hasComputeType = content.includes('compute_type: "int8"');
  const hasMemoryOptimization = content.includes('torch.set_num_threads(1)');
  
  console.log(`Base model config method: ${hasBaseModelConfig ? 'FOUND' : 'MISSING'}`);
  console.log(`VAD filter: ${hasVadFilter ? 'FOUND' : 'MISSING'}`);
  console.log(`Compute type optimization: ${hasComputeType ? 'FOUND' : 'MISSING'}`);
  console.log(`Memory optimization: ${hasMemoryOptimization ? 'FOUND' : 'MISSING'}`);
  
  return hasBaseModelConfig && hasVadFilter && hasComputeType && hasMemoryOptimization;
}

/**
 * Test 5: Verify IndexedDB implementation
 */
async function testIndexedDBImplementation() {
  const dbPath = 'src/lib/storage/captains-log-database.ts';
  const storagePath = 'src/lib/storage/captains-log-storage.ts';
  const migrationPath = 'src/lib/storage/migration-utility.ts';
  
  const dbContent = fs.readFileSync(dbPath, 'utf8');
  const storageContent = fs.readFileSync(storagePath, 'utf8');
  const migrationContent = fs.readFileSync(migrationPath, 'utf8');
  
  // Check for key IndexedDB features
  const hasDexieImport = dbContent.includes('import Dexie from');
  const hasDbSchema = dbContent.includes('version(1).stores');
  const hasCrudOperations = 
    storageContent.includes('saveEntry') && 
    storageContent.includes('getAllEntries') && 
    storageContent.includes('getEntry') && 
    storageContent.includes('deleteEntry');
  const hasMigration = migrationContent.includes('migrateFromLocalStorage');
  const hasQuotaHandling = storageContent.includes('QuotaExceededError');
  
  console.log(`Dexie import: ${hasDexieImport ? 'FOUND' : 'MISSING'}`);
  console.log(`Database schema: ${hasDbSchema ? 'FOUND' : 'MISSING'}`);
  console.log(`CRUD operations: ${hasCrudOperations ? 'FOUND' : 'MISSING'}`);
  console.log(`Migration utility: ${hasMigration ? 'FOUND' : 'MISSING'}`);
  console.log(`Quota handling: ${hasQuotaHandling ? 'FOUND' : 'MISSING'}`);
  
  return hasDexieImport && hasDbSchema && hasCrudOperations && hasMigration && hasQuotaHandling;
}

/**
 * Main verification function
 */
async function verifyPhase2Implementation() {
  console.log('Starting Phase 2 implementation verification...');
  
  // Run all tests
  await runTest('File Existence', testFileExistence);
  await runTest('File Content', testFileContent);
  await runTest('Chunking Implementation', testChunkingImplementation);
  await runTest('Base Model Optimization', testBaseModelOptimization);
  await runTest('IndexedDB Implementation', testIndexedDBImplementation);
  
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
