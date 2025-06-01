import { db } from '@/lib/db';
import { parseCSV, convertCSVToAppData } from './csvConverter';

// Function to export all data as JSON
export async function exportAllData() {
  try {
    const data = {
      goals: await db.goals.toArray(),
      tasks: await db.tasks.toArray(),
      categories: await db.categories.toArray(),
      // Export any other tables as needed
      exportDate: new Date().toISOString(),
      version: '1.0',
    };

    const jsonData = JSON.stringify(data, null, 2);
    const filename = `nexvolv-export-${new Date().toISOString().split('T')[0]}.json`;

    return {
      success: true,
      data: jsonData,
      filename: filename,
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    return {
      success: false,
      error: 'Failed to export data',
    };
  }
}

/**
 * Validate imported data structure
 * @param data The data to validate
 * @returns True if valid, throws error if invalid
 */
export function validateImportData(data: any) {
  // Check if required properties exist
  if (!data.goals || !data.tasks || !data.categories) {
    throw new Error('Invalid data format: Missing required data collections');
  }

  // Check if properties are arrays
  if (!Array.isArray(data.goals) || !Array.isArray(data.tasks) || !Array.isArray(data.categories)) {
    throw new Error('Invalid data format: Data collections must be arrays');
  }

  // Additional validation could be added here

  return true;
}

/**
 * Detect file format from content
 * @param fileContent The file content as string
 * @returns 'json' or 'csv'
 */
export function detectFileFormat(fileContent: string): 'json' | 'csv' {
  // Try to parse as JSON first
  try {
    JSON.parse(fileContent);
    return 'json';
  } catch (e) {
    // If it's not valid JSON, assume it's CSV
    return 'csv';
  }
}

// Function to import data from JSON or CSV
export async function importData(fileContent: string) {
  try {
    // Detect file format
    const format = detectFileFormat(fileContent);

    // Parse data based on format
    let data;
    if (format === 'json') {
      data = JSON.parse(fileContent);
    } else {
      // Parse CSV and convert to app data format
      const csvData = parseCSV(fileContent);
      data = convertCSVToAppData(csvData);
    }

    // Validate the data structure
    validateImportData(data);

    // Clear existing data
    await db.transaction('rw', [db.goals, db.tasks, db.categories], async () => {
      await db.goals.clear();
      await db.tasks.clear();
      await db.categories.clear();

      // Import data
      if (data.goals.length > 0) await db.goals.bulkAdd(data.goals);
      if (data.tasks.length > 0) await db.tasks.bulkAdd(data.tasks);
      if (data.categories.length > 0) await db.categories.bulkAdd(data.categories);
    });

    // Save import history
    saveImportHistory({
      date: new Date().toISOString(),
      format,
      success: true,
      itemCounts: {
        goals: data.goals.length,
        tasks: data.tasks.length,
        categories: data.categories.length,
      }
    });

    return {
      success: true,
      message: 'Data imported successfully',
      format,
      data, // Include the data for preview
      itemCounts: {
        goals: data.goals.length,
        tasks: data.tasks.length,
        categories: data.categories.length,
      }
    };
  } catch (error) {
    console.error('Error importing data:', error);

    // Save failed import to history
    saveImportHistory({
      date: new Date().toISOString(),
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    });

    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to import data',
    };
  }
}

/**
 * Interface for import history entry
 */
export interface ImportHistoryEntry {
  date: string;
  format?: 'json' | 'csv';
  success: boolean;
  error?: string;
  itemCounts?: {
    goals: number;
    tasks: number;
    categories: number;
  };
}

/**
 * Save an entry to the import history
 * @param entry The import history entry to save
 */
export function saveImportHistory(entry: ImportHistoryEntry) {
  try {
    // Get existing history from localStorage
    const historyJson = localStorage.getItem('import-history');
    const history: ImportHistoryEntry[] = historyJson ? JSON.parse(historyJson) : [];

    // Add new entry to the beginning
    history.unshift(entry);

    // Keep only the last 10 entries
    const trimmedHistory = history.slice(0, 10);

    // Save back to localStorage
    localStorage.setItem('import-history', JSON.stringify(trimmedHistory));
  } catch (error) {
    console.error('Error saving import history:', error);
  }
}

/**
 * Get the import history
 * @returns Array of import history entries
 */
export function getImportHistory(): ImportHistoryEntry[] {
  try {
    const historyJson = localStorage.getItem('import-history');
    return historyJson ? JSON.parse(historyJson) : [];
  } catch (error) {
    console.error('Error getting import history:', error);
    return [];
  }
}

// Function to delete all data
export async function deleteAllData() {
  try {
    await db.transaction('rw', [db.goals, db.tasks, db.categories], async () => {
      await db.goals.clear();
      await db.tasks.clear();
      await db.categories.clear();
    });

    return {
      success: true,
      message: 'All data deleted successfully',
    };
  } catch (error) {
    console.error('Error deleting data:', error);
    return {
      success: false,
      error: 'Failed to delete data',
    };
  }
}