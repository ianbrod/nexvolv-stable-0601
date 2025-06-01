/**
 * Browser Data Cleanup Script
 * 
 * This script provides instructions and code snippets for clearing
 * IndexedDB and browser storage data manually.
 */

console.log('🧹 Browser Data Cleanup Instructions');
console.log('=====================================');
console.log('');
console.log('To clear all voice/transcription data and provide a clean slate:');
console.log('');
console.log('1. Open your browser and navigate to: http://localhost:3000');
console.log('2. Open Developer Tools (F12 or right-click > Inspect)');
console.log('3. Go to the "Application" tab (Chrome) or "Storage" tab (Firefox)');
console.log('4. Run the following code in the Console tab:');
console.log('');
console.log('--- COPY AND PASTE THIS CODE IN BROWSER CONSOLE ---');
console.log('');

const cleanupCode = `
// Clear IndexedDB databases
async function clearAllIndexedDB() {
  const dbNames = [
    'captainsLogDatabase',
    'nexvolvDatabase', 
    'tagBasedDatabase',
    'CaptainsLogDatabase'
  ];
  
  console.log('🧹 Clearing IndexedDB databases...');
  
  for (const dbName of dbNames) {
    try {
      const deleteReq = indexedDB.deleteDatabase(dbName);
      await new Promise((resolve) => {
        deleteReq.onsuccess = () => {
          console.log('✅ Cleared database:', dbName);
          resolve();
        };
        deleteReq.onerror = () => {
          console.log('⚠️ Could not clear database:', dbName);
          resolve();
        };
      });
    } catch (error) {
      console.warn('Error clearing', dbName, ':', error);
    }
  }
  
  // Clear localStorage
  const localStorageKeys = [
    'captainsLogEntries',
    'captainsLogFolders', 
    'tagBasedEntries',
    'nexvolvData',
    'transcriptionCache',
    'voiceRecordings'
  ];
  
  localStorageKeys.forEach(key => {
    try {
      localStorage.removeItem(key);
      console.log('✅ Cleared localStorage:', key);
    } catch (error) {
      console.warn('Could not clear localStorage', key, ':', error);
    }
  });
  
  // Clear sessionStorage
  try {
    sessionStorage.clear();
    console.log('✅ Cleared sessionStorage');
  } catch (error) {
    console.warn('Could not clear sessionStorage:', error);
  }
  
  // Clear cache storage
  if ('caches' in window) {
    try {
      const cacheNames = await caches.keys();
      await Promise.all(cacheNames.map(name => caches.delete(name)));
      console.log('✅ Cleared cache storage');
    } catch (error) {
      console.warn('Could not clear cache storage:', error);
    }
  }
  
  console.log('🎉 Cleanup completed! Refresh the page.');
}

// Run the cleanup
clearAllIndexedDB();
`;

console.log(cleanupCode);
console.log('');
console.log('--- END OF CODE ---');
console.log('');
console.log('5. After running the code, refresh the page');
console.log('6. Verify cleanup by checking Application > IndexedDB (should be empty)');
console.log('');
console.log('Alternative: Use browser settings to clear all site data');
console.log('  - Chrome: Settings > Privacy > Clear browsing data > Advanced');
console.log('  - Firefox: Settings > Privacy > Clear Data');
console.log('  - Select "Cookies and site data" and "Cached web content"');
console.log('');

// Also create a function that can be called from Node.js
function generateCleanupInstructions() {
  return {
    instructions: [
      'Open browser and navigate to http://localhost:3000',
      'Open Developer Tools (F12)',
      'Go to Console tab',
      'Paste and run the cleanup code',
      'Refresh the page'
    ],
    cleanupCode: cleanupCode.trim(),
    manualSteps: [
      'Open browser settings',
      'Go to Privacy/Clear browsing data',
      'Select "Cookies and site data" and "Cached web content"',
      'Clear data for localhost:3000'
    ]
  };
}

module.exports = { generateCleanupInstructions };
