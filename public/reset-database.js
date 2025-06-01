/**
 * Browser script to reset Captain's Log database and fix constraint errors
 * 
 * To use: Copy and paste this entire script into your browser console
 */

(async function resetCaptainsLogDatabase() {
  console.log('🔄 Resetting Captain\'s Log Database...\n');

  try {
    // Delete all Captain's Log databases
    const databases = ['captainsLogDatabase', 'tagBasedDatabase', 'nexvolvDatabase'];
    
    console.log('🗑️  Deleting existing databases...');
    
    for (const dbName of databases) {
      try {
        await new Promise((resolve, reject) => {
          const deleteReq = indexedDB.deleteDatabase(dbName);
          deleteReq.onsuccess = () => {
            console.log(`✅ Deleted database: ${dbName}`);
            resolve();
          };
          deleteReq.onerror = () => reject(deleteReq.error);
          deleteReq.onblocked = () => {
            console.log(`⚠️  Database ${dbName} is blocked, close all tabs and try again`);
            resolve();
          };
        });
      } catch (error) {
        console.log(`⚠️  Could not delete ${dbName}:`, error.message);
      }
    }

    // Clear localStorage entries related to Captain's Log
    console.log('\n🧹 Clearing localStorage...');
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.includes('captainsLog') ||
        key.includes('logEntries') ||
        key.includes('transcription') ||
        key.includes('whisper')
      )) {
        keysToRemove.push(key);
      }
    }

    keysToRemove.forEach(key => {
      localStorage.removeItem(key);
      console.log(`   Removed: ${key}`);
    });

    // Clear sessionStorage as well
    console.log('\n🧹 Clearing sessionStorage...');
    const sessionKeysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.includes('captainsLog') ||
        key.includes('logEntries') ||
        key.includes('transcription')
      )) {
        sessionKeysToRemove.push(key);
      }
    }

    sessionKeysToRemove.forEach(key => {
      sessionStorage.removeItem(key);
      console.log(`   Removed: ${key}`);
    });

    console.log('\n🎉 Database reset complete!');
    console.log('📝 What was fixed:');
    console.log('   ✅ Removed conflicting database schemas');
    console.log('   ✅ Cleared duplicate key constraints');
    console.log('   ✅ Reset version conflicts');
    console.log('   ✅ Cleaned up localStorage and sessionStorage');
    
    console.log('\n🔄 Next steps:');
    console.log('   1. Refresh the page (F5 or Ctrl+R)');
    console.log('   2. Try recording or uploading audio again');
    console.log('   3. The database will be recreated with the correct schema');
    console.log('   4. Your Prisma data (tasks, goals, etc.) is unaffected');

    // Optionally refresh the page automatically
    console.log('\n⏰ Auto-refreshing page in 3 seconds...');
    setTimeout(() => {
      window.location.reload();
    }, 3000);

  } catch (error) {
    console.error('❌ Error during database reset:', error);
    console.log('\n🔧 Manual steps if automatic reset failed:');
    console.log('   1. Open Developer Tools (F12)');
    console.log('   2. Go to Application/Storage tab');
    console.log('   3. Delete IndexedDB databases manually');
    console.log('   4. Clear localStorage and sessionStorage');
    console.log('   5. Refresh the page');
  }
})();
