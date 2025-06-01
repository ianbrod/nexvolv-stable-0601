import { describe, it, expect } from 'vitest';
import { chunkTimelineItemsByDate, isTaskInDateChunk } from './timeline-chunking';
import { Task } from '@/types';
import { addDays, subDays, startOfWeek, startOfMonth, startOfYear } from 'date-fns';

describe('timeline-chunking', () => {
  // Sample tasks for testing
  const today = new Date();
  const yesterday = subDays(today, 1);
  const tomorrow = addDays(today, 1);
  const nextWeek = addDays(today, 7);
  
  const sampleTasks: Task[] = [
    {
      id: '1',
      name: 'Task 1',
      priority: 'MEDIUM',
      status: 'TODO',
      dueDate: today,
    },
    {
      id: '2',
      name: 'Task 2',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: yesterday,
    },
    {
      id: '3',
      name: 'Task 3',
      priority: 'LOW',
      status: 'COMPLETED',
      dueDate: tomorrow,
    },
    {
      id: '4',
      name: 'Task 4',
      priority: 'MEDIUM',
      status: 'TODO',
      dueDate: nextWeek,
    },
    {
      id: '5',
      name: 'Task 5',
      priority: 'LOW',
      status: 'TODO',
      // No due date
    },
  ];

  describe('chunkTimelineItemsByDate', () => {
    it('should chunk tasks by day correctly', () => {
      const result = chunkTimelineItemsByDate(sampleTasks, { chunkBy: 'day' });
      
      // Should have 4 chunks (3 days + 1 for no date)
      expect(result.chunks.length).toBe(4);
      
      // Check that each day has the correct number of tasks
      const todayChunk = result.chunks.find(chunk => 
        chunk.items.some(item => item.id === '1')
      );
      const yesterdayChunk = result.chunks.find(chunk => 
        chunk.items.some(item => item.id === '2')
      );
      const tomorrowChunk = result.chunks.find(chunk => 
        chunk.items.some(item => item.id === '3')
      );
      const noDateChunk = result.chunks.find(chunk => 
        chunk.items.some(item => item.id === '5')
      );
      
      expect(todayChunk?.items.length).toBe(1);
      expect(yesterdayChunk?.items.length).toBe(1);
      expect(tomorrowChunk?.items.length).toBe(1);
      expect(noDateChunk?.items.length).toBe(1);
    });

    it('should chunk tasks by week correctly', () => {
      const result = chunkTimelineItemsByDate(sampleTasks, { chunkBy: 'week' });
      
      // Should have at least 2 chunks (current week, next week, and possibly no date)
      expect(result.chunks.length).toBeGreaterThanOrEqual(2);
      
      // Find the current week chunk (should contain today, yesterday, and tomorrow)
      const currentWeekChunk = result.chunks.find(chunk => 
        chunk.items.some(item => item.id === '1')
      );
      
      // Current week chunk should have 3 tasks (today, yesterday, tomorrow)
      expect(currentWeekChunk?.items.length).toBeGreaterThanOrEqual(3);
    });

    it('should exclude items without dates when specified', () => {
      const result = chunkTimelineItemsByDate(sampleTasks, { 
        chunkBy: 'day',
        includeItemsWithoutDates: false
      });
      
      // Should have 4 chunks (today, yesterday, tomorrow, next week)
      expect(result.chunks.length).toBe(4);
      
      // No chunk should contain the task without a due date
      const hasNoDateTask = result.chunks.some(chunk => 
        chunk.items.some(item => item.id === '5')
      );
      
      expect(hasNoDateTask).toBe(false);
    });

    it('should sort chunks in descending order when specified', () => {
      const result = chunkTimelineItemsByDate(sampleTasks, { 
        chunkBy: 'day',
        sortDirection: 'desc'
      });
      
      // First chunk should be the latest date (next week)
      const firstChunk = result.chunks[0];
      expect(firstChunk.items.some(item => item.id === '4')).toBe(true);
    });
  });

  describe('isTaskInDateChunk', () => {
    it('should correctly identify if a task is in a day chunk', () => {
      const taskWithDate: Task = {
        id: '1',
        name: 'Task 1',
        priority: 'MEDIUM',
        status: 'TODO',
        dueDate: today,
      };
      
      expect(isTaskInDateChunk(taskWithDate, today, 'day')).toBe(true);
      expect(isTaskInDateChunk(taskWithDate, yesterday, 'day')).toBe(false);
    });

    it('should correctly identify if a task is in a week chunk', () => {
      const taskWithDate: Task = {
        id: '1',
        name: 'Task 1',
        priority: 'MEDIUM',
        status: 'TODO',
        dueDate: today,
      };
      
      expect(isTaskInDateChunk(taskWithDate, startOfWeek(today), 'week')).toBe(true);
      expect(isTaskInDateChunk(taskWithDate, startOfWeek(nextWeek), 'week')).toBe(false);
    });

    it('should return false for tasks without due dates', () => {
      const taskWithoutDate: Task = {
        id: '5',
        name: 'Task 5',
        priority: 'LOW',
        status: 'TODO',
      };
      
      expect(isTaskInDateChunk(taskWithoutDate, today, 'day')).toBe(false);
      expect(isTaskInDateChunk(taskWithoutDate, today, 'week')).toBe(false);
      expect(isTaskInDateChunk(taskWithoutDate, today, 'month')).toBe(false);
      expect(isTaskInDateChunk(taskWithoutDate, today, 'year')).toBe(false);
    });
  });
});
