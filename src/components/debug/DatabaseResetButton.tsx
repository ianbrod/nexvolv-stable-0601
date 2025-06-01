'use client';

import React, { useState } from 'react';

/**
 * Emergency database reset button for fixing constraint errors
 */
export function DatabaseResetButton() {
  const [isResetting, setIsResetting] = useState(false);
  const [resetComplete, setResetComplete] = useState(false);

  const handleReset = async () => {
    if (!confirm('This will reset the Captain\'s Log database and fix constraint errors. Your Prisma data (tasks, goals, etc.) will NOT be affected. Continue?')) {
      return;
    }

    setIsResetting(true);
    
    try {
      console.log('🔄 Resetting Captain\'s Log Database...');

      // Delete all Captain's Log databases
      const databases = ['captainsLogDatabase', 'tagBasedDatabase', 'nexvolvDatabase'];
      
      for (const dbName of databases) {
        try {
          await new Promise<void>((resolve, reject) => {
            const deleteReq = indexedDB.deleteDatabase(dbName);
            deleteReq.onsuccess = () => {
              console.log(`✅ Deleted database: ${dbName}`);
              resolve();
            };
            deleteReq.onerror = () => reject(deleteReq.error);
            deleteReq.onblocked = () => {
              console.log(`⚠️  Database ${dbName} is blocked`);
              resolve();
            };
          });
        } catch (error) {
          console.log(`⚠️  Could not delete ${dbName}:`, error);
        }
      }

      // Clear localStorage entries related to Captain's Log
      const keysToRemove = [];
      for (let i = 0; i < localStorage.length; i++) {
        const key = localStorage.key(i);
        if (key && (
          key.includes('captainsLog') ||
          key.includes('logEntries') ||
          key.includes('transcription')
        )) {
          keysToRemove.push(key);
        }
      }

      keysToRemove.forEach(key => {
        localStorage.removeItem(key);
        console.log(`Removed localStorage: ${key}`);
      });

      console.log('🎉 Database reset complete!');
      setResetComplete(true);
      
      // Auto-refresh after 2 seconds
      setTimeout(() => {
        window.location.reload();
      }, 2000);

    } catch (error) {
      console.error('❌ Error during database reset:', error);
      alert(`Reset failed: ${error instanceof Error ? error.message : String(error)}`);
    } finally {
      setIsResetting(false);
    }
  };

  if (resetComplete) {
    return (
      <div className="p-4 bg-green-100 border border-green-400 rounded-lg">
        <h3 className="text-green-800 font-semibold">✅ Database Reset Complete!</h3>
        <p className="text-green-700 text-sm mt-1">
          Page will refresh automatically. The constraint error should be fixed.
        </p>
      </div>
    );
  }

  return (
    <div className="p-4 bg-red-100 border border-red-400 rounded-lg">
      <h3 className="text-red-800 font-semibold">🚨 Database Constraint Error Detected</h3>
      <p className="text-red-700 text-sm mt-1 mb-3">
        There's a "Key already exists" error in the Captain's Log database. 
        This can be fixed by resetting the database.
      </p>
      <button
        onClick={handleReset}
        disabled={isResetting}
        className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 disabled:opacity-50 font-medium"
      >
        {isResetting ? '🔄 Resetting Database...' : '🔧 Fix Database (Reset Captain\'s Log)'}
      </button>
      <p className="text-xs text-red-600 mt-2">
        ⚠️ This only affects Captain's Log data. Your tasks, goals, and other data are safe.
      </p>
    </div>
  );
}
