const fs = require('fs');
const path = require('path');

/**
 * Clean Database Script
 *
 * This script completely removes the existing database file and cleans up
 * any generated Prisma files to ensure a fresh start.
 */

async function cleanDatabase() {
  console.log('🧹 Starting database cleanup...');

  try {
    // Remove the SQLite database file
    const dbPath = path.join(__dirname, '..', 'prisma', 'dev.db');
    if (fs.existsSync(dbPath)) {
      try {
        fs.unlinkSync(dbPath);
        console.log('✅ Removed existing database file: dev.db');
      } catch (error) {
        if (error.code === 'EBUSY') {
          console.log('⚠️  Database file is locked (server may be running)');
          console.log('   Stop the development server and try again');
          console.log('   Or use: npx prisma db push --force-reset');
        } else {
          throw error;
        }
      }
    } else {
      console.log('ℹ️  No existing database file found');
    }

    // Remove any SQLite journal files
    const journalPath = path.join(__dirname, '..', 'prisma', 'dev.db-journal');
    if (fs.existsSync(journalPath)) {
      fs.unlinkSync(journalPath);
      console.log('✅ Removed database journal file');
    }

    // Remove any SQLite WAL files
    const walPath = path.join(__dirname, '..', 'prisma', 'dev.db-wal');
    if (fs.existsSync(walPath)) {
      fs.unlinkSync(walPath);
      console.log('✅ Removed database WAL file');
    }

    // Remove any SQLite SHM files
    const shmPath = path.join(__dirname, '..', 'prisma', 'dev.db-shm');
    if (fs.existsSync(shmPath)) {
      fs.unlinkSync(shmPath);
      console.log('✅ Removed database SHM file');
    }

    console.log('🎉 Database cleanup completed successfully!');
    console.log('');
    console.log('Next steps:');
    console.log('  1. Run "npm run db:setup" to create a fresh database');
    console.log('  2. Or run "npm run fresh-start" to setup and start development');

  } catch (error) {
    console.error('❌ Error during database cleanup:', error);
    process.exit(1);
  }
}

// Run the cleanup
cleanDatabase();
