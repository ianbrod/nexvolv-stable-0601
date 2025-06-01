import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { db } from '@/lib/db';
import { validateImportData, detectFileFormat, getImportHistory, saveImportHistory } from '../dataExport';

// Mock the database
vi.mock('@/lib/db', () => ({
  db: {
    goals: {
      toArray: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue(undefined),
      bulkAdd: vi.fn().mockResolvedValue(undefined)
    },
    tasks: {
      toArray: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue(undefined),
      bulkAdd: vi.fn().mockResolvedValue(undefined)
    },
    categories: {
      toArray: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue(undefined),
      bulkAdd: vi.fn().mockResolvedValue(undefined)
    },
    habits: {
      toArray: vi.fn().mockResolvedValue([]),
      clear: vi.fn().mockResolvedValue(undefined),
      bulkAdd: vi.fn().mockResolvedValue(undefined)
    },
    transaction: vi.fn().mockImplementation((mode, tables, callback) => callback())
  }
}));

// We're using the global localStorage mock from setup.ts

describe('Data Export Utilities', () => {

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('validateImportData', () => {
    it('should validate correct data structure', () => {
      const data = {
        goals: [],
        tasks: [],
        categories: []
      };

      expect(() => validateImportData(data)).not.toThrow();
    });

    it('should throw error for missing required collections', () => {
      const data = {
        goals: [],
        tasks: []
      };

      expect(() => validateImportData(data)).toThrow('Missing required data collections');
    });

    it('should throw error for non-array collections', () => {
      const data = {
        goals: {},
        tasks: [],
        categories: []
      };

      expect(() => validateImportData(data)).toThrow('Data collections must be arrays');
    });
  });

  describe('detectFileFormat', () => {
    it('should detect JSON format', () => {
      const jsonData = JSON.stringify({ test: 'data' });

      expect(detectFileFormat(jsonData)).toBe('json');
    });

    it('should detect CSV format', () => {
      const csvData = 'name,age\nJohn,30\nJane,25';

      expect(detectFileFormat(csvData)).toBe('csv');
    });
  });

  describe('importHistory', () => {
    it('should save and retrieve import history', () => {
      const entry = {
        date: '2023-01-01T12:00:00.000Z',
        format: 'json' as const,
        success: true,
        itemCounts: {
          goals: 5,
          tasks: 10,
          categories: 3,
          habits: 0
        }
      };

      saveImportHistory(entry);

      const history = getImportHistory();

      expect(history).toHaveLength(1);
      expect(history[0].date).toBe(entry.date);
      expect(history[0].format).toBe('json');
      expect(history[0].itemCounts?.goals).toBe(5);
    });

    it('should limit history to 10 entries', () => {
      // Add 12 entries
      for (let i = 0; i < 12; i++) {
        saveImportHistory({
          date: `2023-01-${i + 1}T12:00:00.000Z`,
          success: true
        });
      }

      const history = getImportHistory();

      expect(history).toHaveLength(10);
      // The newest entry should be first
      expect(history[0].date).toBe('2023-01-12T12:00:00.000Z');
    });

    it('should handle localStorage errors', () => {
      // Mock localStorage.getItem to throw an error
      localStorage.getItem = vi.fn().mockImplementationOnce(() => {
        throw new Error('Storage error');
      });

      const history = getImportHistory();

      expect(history).toEqual([]);
    });
  });
});
