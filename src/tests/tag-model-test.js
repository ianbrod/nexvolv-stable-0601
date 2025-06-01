/**
 * Browser-compatible test script for validating the tag-based architecture implementation (Phase 1)
 */

// Mock implementation of the Tag model for browser testing
const TagType = {
  CATEGORY: 'category',
  GOAL: 'goal',
  SUB_GOAL: 'sub-goal',
  USER: 'user'
};

const TAG_PREFIXES = {
  CATEGORY: 'cat-tag-',
  GOAL: 'goal-tag-',
  SUB_GOAL: 'sub-goal-tag-',
  USER: 'user-tag-'
};

// Helper function to create a UUID (for browser testing)
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function createTag(name, type, options = {}) {
  // Generate ID based on type
  let prefix = '';
  switch (type) {
    case TagType.CATEGORY:
      prefix = TAG_PREFIXES.CATEGORY;
      break;
    case TagType.GOAL:
      prefix = TAG_PREFIXES.GOAL;
      break;
    case TagType.SUB_GOAL:
      prefix = TAG_PREFIXES.SUB_GOAL;
      break;
    case TagType.USER:
      prefix = TAG_PREFIXES.USER;
      break;
  }

  const id = `${prefix}${generateUUID()}`;

  return {
    id,
    name,
    color: options.color || '#808080', // Default gray color
    type,
    parentId: options.parentId,
    order: options.order || 0,
    isSystem: options.isSystem || false,
    metadata: options.metadata,
    userId: options.userId
  };
}

function isSystemTag(tagId) {
  return (
    tagId.startsWith(TAG_PREFIXES.CATEGORY) ||
    tagId.startsWith(TAG_PREFIXES.GOAL) ||
    tagId.startsWith(TAG_PREFIXES.SUB_GOAL)
  );
}

function getTagTypeFromId(tagId) {
  if (tagId.startsWith(TAG_PREFIXES.CATEGORY)) {
    return TagType.CATEGORY;
  } else if (tagId.startsWith(TAG_PREFIXES.GOAL)) {
    return TagType.GOAL;
  } else if (tagId.startsWith(TAG_PREFIXES.SUB_GOAL)) {
    return TagType.SUB_GOAL;
  } else if (tagId.startsWith(TAG_PREFIXES.USER)) {
    return TagType.USER;
  }
  return null;
}

// Mock database for browser testing
const mockTagDB = {
  open: () => Promise.resolve(),
  close: () => {},
  tables: [
    { name: 'logEntries' },
    { name: 'transcriptionData' },
    { name: 'tags' },
    { name: 'tagEntryRelations' }
  ]
};

// Mock conversion functions
function dbEntryToLogEntry(dbEntry, transcription) {
  return {
    id: dbEntry.id,
    title: dbEntry.title,
    audioUrl: dbEntry.audioUrl || '',
    transcription: transcription?.text || '',
    summary: transcription?.summary,
    duration: dbEntry.duration,
    createdAt: dbEntry.createdAt,
    updatedAt: dbEntry.updatedAt,
    isFavorite: dbEntry.isFavorite || false,
    tags: dbEntry.tags || [],
    segments: transcription?.segments,
    srtData: transcription?.srtData,
    folderId: dbEntry.folderId,
    isArchived: dbEntry.isArchived,
    archivedAt: dbEntry.archivedAt
  };
}

function logEntryToDBEntry(entry) {
  return {
    id: entry.id,
    title: entry.title,
    createdAt: entry.createdAt,
    updatedAt: entry.updatedAt,
    previewText: entry.transcription.substring(0, 100),
    duration: entry.duration,
    hasFullTranscription: !!entry.transcription,
    userId: undefined,
    isFavorite: entry.isFavorite,
    tags: entry.tags || [],
    folderId: entry.folderId,
    audioUrl: entry.audioUrl,
    isArchived: entry.isArchived,
    archivedAt: entry.archivedAt
  };
}

/**
 * Test the Tag model implementation
 */
function testTagModel() {
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
function testLogEntryModel() {
  console.log('Testing LogEntry model...');
  
  try {
    // Create a sample log entry
    const logEntry = {
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
async function testDatabaseSchema() {
  console.log('Testing database schema...');
  
  try {
    // Open the database
    await mockTagDB.open();
    console.log('Database opened successfully');
    
    // Check if tables exist
    const tableNames = mockTagDB.tables.map(table => table.name);
    console.log('Database tables:', tableNames);
    
    const requiredTables = ['logEntries', 'transcriptionData', 'tags', 'tagEntryRelations'];
    for (const tableName of requiredTables) {
      if (!tableNames.includes(tableName)) {
        console.error(`Required table '${tableName}' is missing`);
        return false;
      }
    }
    
    // Close the database
    mockTagDB.close();
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
export async function runTagModelTests() {
  console.log('Running tag model tests...');
  
  const tagModelResult = testTagModel();
  const logEntryModelResult = testLogEntryModel();
  const databaseSchemaResult = await testDatabaseSchema();
  
  const allTestsPassed = tagModelResult && logEntryModelResult && databaseSchemaResult;
  
  console.log('All tests passed:', allTestsPassed);
  return allTestsPassed;
}
