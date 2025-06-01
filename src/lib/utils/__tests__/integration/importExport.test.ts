import fs from 'fs';
import path from 'path';
import { importData, exportAllData } from '../../dataExport';
import { parseCSV, convertCSVToAppData } from '../../csvConverter';
import { db } from '@/lib/db';

// Mock the database
jest.mock('@/lib/db', () => ({
  db: {
    goals: {
      toArray: jest.fn().mockResolvedValue([]),
      clear: jest.fn().mockResolvedValue(undefined),
      bulkAdd: jest.fn().mockResolvedValue(undefined)
    },
    tasks: {
      toArray: jest.fn().mockResolvedValue([]),
      clear: jest.fn().mockResolvedValue(undefined),
      bulkAdd: jest.fn().mockResolvedValue(undefined)
    },
    categories: {
      toArray: jest.fn().mockResolvedValue([]),
      clear: jest.fn().mockResolvedValue(undefined),
      bulkAdd: jest.fn().mockResolvedValue(undefined)
    },
    habits: {
      toArray: jest.fn().mockResolvedValue([]),
      clear: jest.fn().mockResolvedValue(undefined),
      bulkAdd: jest.fn().mockResolvedValue(undefined)
    },
    transaction: jest.fn().mockImplementation((mode, tables, callback) => callback())
  }
}));

describe('Import/Export Integration Tests', () => {
  const mockDataDir = path.join(__dirname, '..', 'mock-data');
  
  beforeEach(() => {
    jest.clearAllMocks();
  });
  
  it('should import JSON data correctly', async () => {
    // Read the mock JSON file
    const jsonData = fs.readFileSync(path.join(mockDataDir, 'export.json'), 'utf8');
    
    // Import the data
    const result = await importData(jsonData);
    
    // Check the result
    expect(result.success).toBe(true);
    expect(result.format).toBe('json');
    expect(result.itemCounts?.goals).toBe(5);
    expect(result.itemCounts?.tasks).toBe(5);
    expect(result.itemCounts?.categories).toBe(5);
    
    // Check that the database functions were called
    expect(db.transaction).toHaveBeenCalled();
    expect(db.goals.clear).toHaveBeenCalled();
    expect(db.tasks.clear).toHaveBeenCalled();
    expect(db.categories.clear).toHaveBeenCalled();
    expect(db.goals.bulkAdd).toHaveBeenCalled();
    expect(db.tasks.bulkAdd).toHaveBeenCalled();
    expect(db.categories.bulkAdd).toHaveBeenCalled();
  });
  
  it('should import CSV goals data correctly', async () => {
    // Read the mock CSV file
    const csvData = fs.readFileSync(path.join(mockDataDir, 'goals.csv'), 'utf8');
    
    // Parse the CSV data
    const parsedData = parseCSV(csvData);
    
    // Convert to app data format
    const appData = convertCSVToAppData(parsedData);
    
    // Check the converted data
    expect(appData.goals.length).toBe(5);
    expect(appData.tasks.length).toBe(0);
    expect(appData.categories.length).toBe(0);
    expect(appData.goals[0].name).toBe('Complete Project');
    expect(appData.goals[0].progress).toBe(75);
    
    // Import the data
    const result = await importData(csvData);
    
    // Check the result
    expect(result.success).toBe(true);
    expect(result.format).toBe('csv');
  });
  
  it('should import CSV tasks data correctly', async () => {
    // Read the mock CSV file
    const csvData = fs.readFileSync(path.join(mockDataDir, 'tasks.csv'), 'utf8');
    
    // Parse the CSV data
    const parsedData = parseCSV(csvData);
    
    // Convert to app data format
    const appData = convertCSVToAppData(parsedData);
    
    // Check the converted data
    expect(appData.goals.length).toBe(0);
    expect(appData.tasks.length).toBe(10);
    expect(appData.categories.length).toBe(0);
    expect(appData.tasks[0].name).toBe('Research competitors');
    expect(appData.tasks[0].priority).toBe('high');
    
    // Import the data
    const result = await importData(csvData);
    
    // Check the result
    expect(result.success).toBe(true);
    expect(result.format).toBe('csv');
  });
  
  it('should handle large datasets efficiently', async () => {
    // Create a large dataset
    const largeGoals = Array(1000).fill(null).map((_, i) => ({
      id: `goal-${i}`,
      name: `Goal ${i}`,
      description: `Description for goal ${i}`,
      status: 'active',
      progress: Math.floor(Math.random() * 100),
      category: 'Test',
      createdAt: new Date().toISOString()
    }));
    
    const largeTasks = Array(5000).fill(null).map((_, i) => ({
      id: `task-${i}`,
      name: `Task ${i}`,
      description: `Description for task ${i}`,
      status: 'todo',
      priority: 'medium',
      dueDate: new Date().toISOString(),
      goalId: `goal-${Math.floor(i / 5)}`,
      createdAt: new Date().toISOString()
    }));
    
    const largeData = {
      goals: largeGoals,
      tasks: largeTasks,
      categories: [{ id: 'cat-1', name: 'Test' }],
      exportDate: new Date().toISOString(),
      version: '1.0'
    };
    
    // Convert to JSON
    const jsonData = JSON.stringify(largeData);
    
    // Import the data
    const startTime = Date.now();
    const result = await importData(jsonData);
    const endTime = Date.now();
    
    // Check the result
    expect(result.success).toBe(true);
    expect(result.itemCounts?.goals).toBe(1000);
    expect(result.itemCounts?.tasks).toBe(5000);
    
    // Check that the import was reasonably fast (less than 1 second)
    // This is a rough benchmark and may need adjustment based on the environment
    expect(endTime - startTime).toBeLessThan(1000);
  });
});
