const { chromium } = require('playwright');

/**
 * Clear IndexedDB Script
 * 
 * This script clears all IndexedDB databases including voice/transcription data
 * to provide a clean slate for remote developers and test users.
 */

async function clearIndexedDB() {
  console.log('🧹 Starting IndexedDB cleanup...');
  
  let browser;
  try {
    // Launch browser
    browser = await chromium.launch();
    const context = await browser.newContext();
    const page = await context.newPage();
    
    // Navigate to localhost (adjust port if needed)
    await page.goto('http://localhost:3000', { waitUntil: 'domcontentloaded' });
    
    // Clear all IndexedDB databases
    await page.evaluate(async () => {
      // List of known database names to clear
      const dbNames = [
        'captainsLogDatabase',
        'nexvolvDatabase',
        'tagBasedDatabase',
        'CaptainsLogDatabase'
      ];
      
      console.log('Clearing IndexedDB databases...');
      
      // Clear specific databases
      for (const dbName of dbNames) {
        try {
          const deleteReq = indexedDB.deleteDatabase(dbName);
          await new Promise((resolve, reject) => {
            deleteReq.onsuccess = () => {
              console.log(`✅ Cleared database: ${dbName}`);
              resolve();
            };
            deleteReq.onerror = () => {
              console.warn(`⚠️ Could not clear database: ${dbName}`);
              resolve(); // Continue even if one fails
            };
          });
        } catch (error) {
          console.warn(`⚠️ Error clearing ${dbName}:`, error);
        }
      }
      
      // Clear localStorage items
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
          console.log(`✅ Cleared localStorage: ${key}`);
        } catch (error) {
          console.warn(`⚠️ Could not clear localStorage ${key}:`, error);
        }
      });
      
      // Clear sessionStorage
      try {
        sessionStorage.clear();
        console.log('✅ Cleared sessionStorage');
      } catch (error) {
        console.warn('⚠️ Could not clear sessionStorage:', error);
      }
      
      // Clear any cached data
      if ('caches' in window) {
        try {
          const cacheNames = await caches.keys();
          await Promise.all(
            cacheNames.map(cacheName => caches.delete(cacheName))
          );
          console.log('✅ Cleared cache storage');
        } catch (error) {
          console.warn('⚠️ Could not clear cache storage:', error);
        }
      }
      
      return 'IndexedDB and storage cleanup completed';
    });
    
    console.log('🎉 IndexedDB cleanup completed successfully!');
    
  } catch (error) {
    console.error('❌ Error during IndexedDB cleanup:', error);
    console.log('');
    console.log('💡 Manual cleanup instructions:');
    console.log('  1. Open browser developer tools (F12)');
    console.log('  2. Go to Application/Storage tab');
    console.log('  3. Clear IndexedDB databases manually');
    console.log('  4. Clear Local Storage and Session Storage');
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

// Check if playwright is available
async function checkPlaywright() {
  try {
    require('playwright');
    return true;
  } catch (error) {
    return false;
  }
}

async function main() {
  const hasPlaywright = await checkPlaywright();
  
  if (!hasPlaywright) {
    console.log('⚠️ Playwright not found. Installing...');
    console.log('Run: npm install --save-dev playwright');
    console.log('Then: npx playwright install chromium');
    console.log('');
    console.log('Alternative manual cleanup:');
    console.log('  1. Open http://localhost:3000 in browser');
    console.log('  2. Open Developer Tools (F12)');
    console.log('  3. Go to Application > Storage');
    console.log('  4. Clear IndexedDB, Local Storage, and Session Storage');
    return;
  }
  
  await clearIndexedDB();
}

main().catch(console.error);
