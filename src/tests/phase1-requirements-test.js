/**
 * Test script to verify Phase 1 implementation against requirements
 */
const fs = require('fs');
const path = require('path');

// Define the requirements from tag-build.md
const requirements = {
  tagModel: {
    file: path.join(__dirname, '..', 'lib', 'storage', 'tag-model.ts'),
    requirements: [
      {
        name: 'TagType enum',
        check: (content) => content.includes('export enum TagType') &&
                           content.includes('CATEGORY = \'category\'') &&
                           content.includes('GOAL = \'goal\'') &&
                           content.includes('SUB_GOAL = \'sub-goal\'') &&
                           content.includes('USER = \'user\'')
      },
      {
        name: 'Tag interface with required properties',
        check: (content) => content.includes('export interface Tag') &&
                           content.includes('id: string') &&
                           content.includes('name: string') &&
                           content.includes('color: string') &&
                           content.includes('type: TagType') &&
                           content.includes('parentId?: string') &&
                           content.includes('order: number') &&
                           content.includes('isSystem: boolean') &&
                           content.includes('metadata?: Record<string, any>')
      },
      {
        name: 'Helper functions',
        check: (content) => content.includes('export function createTag') &&
                           content.includes('export function isSystemTag') &&
                           content.includes('export function getTagTypeFromId')
      }
    ]
  },
  logEntryModel: {
    file: path.join(__dirname, '..', 'types', 'index.ts'),
    requirements: [
      {
        name: 'LogEntry interface with tags array',
        check: (content) => {
          // Check if LogEntry interface exists
          if (!content.includes('export interface LogEntry')) return false;

          // Extract the LogEntry interface content
          const match = content.match(/export interface LogEntry\s*{[^}]*}/s);
          if (!match) return false;

          const logEntryContent = match[0];

          // Check if tags is required (not optional with ?)
          return logEntryContent.includes('tags: string[]') &&
                 !logEntryContent.includes('tags?: string[]');
        }
      },
      {
        name: 'Deprecated folderId property',
        check: (content) => content.includes('folderId?: string') &&
                           content.includes('// Deprecated')
      }
    ]
  },
  databaseSchema: {
    file: path.join(__dirname, '..', 'lib', 'storage', 'tag-database.ts'),
    requirements: [
      {
        name: 'TagBasedDatabase class',
        check: (content) => content.includes('export class TagBasedDatabase extends Dexie')
      },
      {
        name: 'Database tables',
        check: (content) => content.includes('logEntries!: Dexie.Table<DBLogEntry, string>') &&
                           content.includes('transcriptionData!: Dexie.Table<DBTranscriptionData, string>') &&
                           content.includes('tags!: Dexie.Table<Tag, string>') &&
                           content.includes('tagEntryRelations!: Dexie.Table<TagEntryRelation, string>')
      },
      {
        name: 'Database schema definition',
        check: (content) => content.includes('this.version(DB_VERSION).stores({') &&
                           content.includes('logEntries: \'id, createdAt, updatedAt, userId, isFavorite, isArchived, archivedAt\'') &&
                           content.includes('transcriptionData: \'entryId\'') &&
                           content.includes('tags: \'id, name, type, parentId, order, isSystem, userId\'') &&
                           content.includes('tagEntryRelations: \'id, tagId, entryId, createdAt\'')
      },
      {
        name: 'Conversion functions',
        check: (content) => content.includes('export function dbEntryToLogEntry') &&
                           content.includes('export function logEntryToDBEntry')
      }
    ]
  }
};

/**
 * Check a file against its requirements
 */
function checkRequirements(fileInfo) {
  console.log(`\nChecking ${path.basename(fileInfo.file)}...`);

  if (!fs.existsSync(fileInfo.file)) {
    console.error(`❌ File not found: ${fileInfo.file}`);
    return { passed: 0, total: fileInfo.requirements.length };
  }

  const content = fs.readFileSync(fileInfo.file, 'utf8');
  let passed = 0;

  for (const req of fileInfo.requirements) {
    const result = req.check(content);
    if (result) {
      console.log(`✅ ${req.name}: Passed`);
      passed++;
    } else {
      console.error(`❌ ${req.name}: Failed`);
    }
  }

  return { passed, total: fileInfo.requirements.length };
}

/**
 * Run all requirement checks
 */
function runRequirementChecks() {
  console.log('Checking Phase 1 implementation against requirements...');

  let totalPassed = 0;
  let totalRequirements = 0;

  for (const [key, fileInfo] of Object.entries(requirements)) {
    const { passed, total } = checkRequirements(fileInfo);
    totalPassed += passed;
    totalRequirements += total;
  }

  console.log(`\nSummary: ${totalPassed}/${totalRequirements} requirements passed`);

  if (totalPassed === totalRequirements) {
    console.log('✅ All requirements passed! Phase 1 implementation is complete.');
    return true;
  } else {
    console.error(`❌ ${totalRequirements - totalPassed} requirements failed. Please review the issues above.`);
    return false;
  }
}

// Run the checks if this file is executed directly
if (require.main === module) {
  runRequirementChecks();
}

module.exports = { runRequirementChecks };
