import { describe, it, expect, vi, beforeEach } from 'vitest';
import { chunkCache, getCachedChunks } from './chunk-cache';
import { Task } from '@/types';
import { ChunkingOptions, ChunkedTimeline } from './timeline-chunking';

describe('chunk-cache', () => {
  // Sample tasks for testing
  const sampleTasks: Task[] = [
    {
      id: '1',
      name: 'Task 1',
      priority: 'MEDIUM',
      status: 'TODO',
      dueDate: new Date('2023-06-15'),
    },
    {
      id: '2',
      name: 'Task 2',
      priority: 'HIGH',
      status: 'IN_PROGRESS',
      dueDate: new Date('2023-06-16'),
    },
  ];

  // Sample options for testing
  const sampleOptions: ChunkingOptions = {
    chunkBy: 'day',
    sortDirection: 'asc',
  };

  // Sample chunking result
  const sampleResult: ChunkedTimeline = {
    chunks: [
      {
        id: 'chunk-1',
        label: 'Thursday, June 15, 2023',
        startDate: new Date('2023-06-15'),
        items: [sampleTasks[0]],
        type: 'day',
      },
      {
        id: 'chunk-2',
        label: 'Friday, June 16, 2023',
        startDate: new Date('2023-06-16'),
        items: [sampleTasks[1]],
        type: 'day',
      },
    ],
    totalItems: 2,
    dateRange: {
      startDate: new Date('2023-06-15'),
      endDate: new Date('2023-06-16'),
    },
  };

  beforeEach(() => {
    // Clear the cache before each test
    chunkCache.clear();
  });

  describe('chunkCache', () => {
    it('should store and retrieve cached results', () => {
      // Set a cache entry
      chunkCache.set(sampleTasks, sampleOptions, sampleResult);

      // Get the cached entry
      const cached = chunkCache.get(sampleTasks, sampleOptions);

      // Should return the cached result
      expect(cached).toEqual(sampleResult);
    });

    it('should return null for non-existent cache entries', () => {
      // Get a non-existent cache entry
      const cached = chunkCache.get(sampleTasks, sampleOptions);

      // Should return null
      expect(cached).toBeNull();
    });

    it('should clear the cache when clear() is called', () => {
      // Set a cache entry
      chunkCache.set(sampleTasks, sampleOptions, sampleResult);

      // Clear the cache
      chunkCache.clear();

      // Get the cached entry
      const cached = chunkCache.get(sampleTasks, sampleOptions);

      // Should return null
      expect(cached).toBeNull();
      expect(chunkCache.size()).toBe(0);
    });

    it('should report the correct cache size', () => {
      // Set a cache entry
      chunkCache.set(sampleTasks, sampleOptions, sampleResult);

      // Should have one entry
      expect(chunkCache.size()).toBe(1);

      // Set another entry with different options
      chunkCache.set(sampleTasks, { ...sampleOptions, chunkBy: 'week' }, sampleResult);

      // Should have two entries
      expect(chunkCache.size()).toBe(2);
    });
  });

  describe('getCachedChunks', () => {
    it('should return cached result if available', () => {
      // Set a cache entry
      chunkCache.set(sampleTasks, sampleOptions, sampleResult);

      // Create a mock chunk function that should not be called
      const mockChunkFn = vi.fn(() => sampleResult);

      // Get cached chunks
      const result = getCachedChunks(mockChunkFn, sampleTasks, sampleOptions);

      // Should return the cached result
      expect(result).toEqual(sampleResult);

      // Mock function should not have been called
      expect(mockChunkFn).not.toHaveBeenCalled();
    });

    it('should call chunk function and cache result if not in cache', () => {
      // Create a mock chunk function
      const mockChunkFn = vi.fn(() => sampleResult);

      // Get cached chunks
      const result = getCachedChunks(mockChunkFn, sampleTasks, sampleOptions);

      // Should return the result from the chunk function
      expect(result).toEqual(sampleResult);

      // Mock function should have been called
      expect(mockChunkFn).toHaveBeenCalledWith(sampleTasks, sampleOptions);

      // Result should be cached
      expect(chunkCache.get(sampleTasks, sampleOptions)).toEqual(sampleResult);
    });
  });
});
