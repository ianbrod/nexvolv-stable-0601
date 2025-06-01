import { describe, it, expect } from 'vitest';
import { parseCSV, generateCSV, csvToJSON, jsonToCSV, convertCSVToAppData } from '../csvConverter';

describe('CSV Converter Utility', () => {
  describe('parseCSV', () => {
    it('should parse a simple CSV string with headers', () => {
      const csvString = 'name,age,city\nJohn,30,New York\nJane,25,Los Angeles';
      const result = parseCSV(csvString);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        name: 'John',
        age: '30',
        city: 'New York'
      });
      expect(result[1]).toEqual({
        name: 'Jane',
        age: '25',
        city: 'Los Angeles'
      });
    });

    it('should handle empty lines', () => {
      const csvString = 'name,age,city\nJohn,30,New York\n\nJane,25,Los Angeles\n';
      const result = parseCSV(csvString);

      expect(result).toHaveLength(2);
    });

    it('should handle custom delimiters', () => {
      const csvString = 'name;age;city\nJohn;30;New York\nJane;25;Los Angeles';
      const result = parseCSV(csvString, { delimiter: ';' });

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('John');
    });

    it('should handle CSV without headers', () => {
      const csvString = 'John,30,New York\nJane,25,Los Angeles';
      const result = parseCSV(csvString, { hasHeader: false });

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual(['John', '30', 'New York']);
    });
  });

  describe('generateCSV', () => {
    it('should generate CSV string from array of objects', () => {
      const data = [
        { name: 'John', age: 30, city: 'New York' },
        { name: 'Jane', age: 25, city: 'Los Angeles' }
      ];

      const csvString = generateCSV(data);
      const lines = csvString.split('\n');

      expect(lines[0]).toBe('name,age,city');
      expect(lines[1]).toBe('John,30,New York');
      expect(lines[2]).toBe('Jane,25,Los Angeles');
    });

    it('should handle custom delimiters', () => {
      const data = [
        { name: 'John', age: 30, city: 'New York' },
        { name: 'Jane', age: 25, city: 'Los Angeles' }
      ];

      const csvString = generateCSV(data, { delimiter: ';' });

      expect(csvString).toContain('name;age;city');
      expect(csvString).toContain('John;30;New York');
    });

    it('should handle values with delimiters', () => {
      const data = [
        { name: 'John, Jr.', age: 30, city: 'New York' }
      ];

      const csvString = generateCSV(data);

      expect(csvString).toContain('"John, Jr."');
    });
  });

  describe('csvToJSON and jsonToCSV', () => {
    it('should convert CSV to JSON and back', () => {
      const csvString = 'name,age,city\nJohn,30,New York\nJane,25,Los Angeles';
      const jsonString = csvToJSON(csvString);
      const backToCsv = jsonToCSV(jsonString);

      expect(JSON.parse(jsonString)).toHaveLength(2);
      expect(backToCsv.split('\n')[0]).toBe('name,age,city');
    });
  });

  describe('convertCSVToAppData', () => {
    it('should convert goals CSV data to app format', () => {
      const csvData = [
        { name: 'Goal 1', status: 'active', progress: '50' },
        { name: 'Goal 2', status: 'completed', progress: '100' }
      ];

      const result = convertCSVToAppData(csvData);

      expect(result.goals).toHaveLength(2);
      expect(result.tasks).toHaveLength(0);
      expect(result.categories).toHaveLength(0);
      expect(result.goals[0].name).toBe('Goal 1');
      expect(result.goals[0].progress).toBe(50);
    });

    it('should convert tasks CSV data to app format', () => {
      const csvData = [
        { name: 'Task 1', status: 'todo', dueDate: '2023-01-01' },
        { name: 'Task 2', status: 'done', dueDate: '2023-01-02' }
      ];

      const result = convertCSVToAppData(csvData);

      expect(result.goals).toHaveLength(0);
      expect(result.tasks).toHaveLength(2);
      expect(result.categories).toHaveLength(0);
      expect(result.tasks[0].name).toBe('Task 1');
    });

    it('should throw error for unrecognized data format', () => {
      const csvData = [
        { foo: 'bar', baz: 'qux' }
      ];

      expect(() => convertCSVToAppData(csvData)).toThrow('Unrecognized CSV data format');
    });

    it('should throw error for empty data', () => {
      expect(() => convertCSVToAppData([])).toThrow('Invalid CSV data');
    });
  });
});
