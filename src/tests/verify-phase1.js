/**
 * Verification script for Phase 1 of the tag-based architecture implementation
 * 
 * This script checks that all required files and components have been created
 * and contain the expected content.
 */

const fs = require('fs');
const path = require('path');

// Paths to check
const paths = {
  tagModel: path.join(__dirname, '..', 'lib', 'storage', 'tag-model.ts'),
  tagDatabase: path.join(__dirname, '..', 'lib', 'storage', 'tag-database.ts'),
  logEntryModel: path.join(__dirname, '..', 'types', 'index.ts')
};

// Expected content patterns
const expectedPatterns = {
  tagModel: [
    'export enum TagType',
    'export interface Tag',
    'id: string',
    'name: string',
    'color: string',
    'type: TagType',
    'parentId?: string',
    'order: number',
    'isSystem: boolean',
    'metadata?: Record<string, any>',
    'export function createTag',
    'export function isSystemTag',
    'export function getTagTypeFromId'
  ],
  tagDatabase: [
    'export class TagBasedDatabase extends Dexie',
    'logEntries!: Dexie.Table<DBLogEntry, string>',
    'transcriptionData!: Dexie.Table<DBTranscriptionData, string>',
    'tags!: Dexie.Table<Tag, string>',
    'tagEntryRelations!: Dexie.Table<TagEntryRelation, string>',
    'this.version(DB_VERSION).stores',
    'export function dbEntryToLogEntry',
    'export function logEntryToDBEntry'
  ],
  logEntryModel: [
    'export interface LogEntry',
    'tags: string[]',  // Now required, not optional
    'folderId?: string' // Deprecated but kept for backward compatibility
  ]
};

/**
 * Check if a file exists and contains the expected patterns
 */
function checkFile(filePath, patterns) {
  console.log(`Checking ${path.basename(filePath)}...`);
  
  if (!fs.existsSync(filePath)) {
    console.error(`❌ File not found: ${filePath}`);
    return false;
  }
  
  const content = fs.readFileSync(filePath, 'utf8');
  
  let allPatternsFound = true;
  for (const pattern of patterns) {
    if (!content.includes(pattern)) {
      console.error(`❌ Pattern not found in ${path.basename(filePath)}: "${pattern}"`);
      allPatternsFound = false;
    }
  }
  
  if (allPatternsFound) {
    console.log(`✅ All expected patterns found in ${path.basename(filePath)}`);
    return true;
  }
  
  return false;
}

/**
 * Main verification function
 */
function verifyPhase1() {
  console.log('Verifying Phase 1 implementation...\n');
  
  let allChecksPass = true;
  
  // Check tag model
  if (!checkFile(paths.tagModel, expectedPatterns.tagModel)) {
    allChecksPass = false;
  }
  
  // Check tag database
  if (!checkFile(paths.tagDatabase, expectedPatterns.tagDatabase)) {
    allChecksPass = false;
  }
  
  // Check log entry model update
  if (!checkFile(paths.logEntryModel, expectedPatterns.logEntryModel)) {
    allChecksPass = false;
  }
  
  console.log('\nVerification summary:');
  if (allChecksPass) {
    console.log('✅ All checks passed! Phase 1 implementation is complete.');
  } else {
    console.log('❌ Some checks failed. Please review the issues above.');
  }
  
  return allChecksPass;
}

// Run verification
verifyPhase1();
