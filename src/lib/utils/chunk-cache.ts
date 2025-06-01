import { Task } from '@/types';
import { ChunkedTimeline, ChunkingOptions } from './timeline-chunking';

/**
 * Interface for a cache entry
 */
interface CacheEntry {
  timestamp: number;
  result: ChunkedTimeline;
}

/**
 * Cache for timeline chunk calculations
 */
class ChunkCache {
  private cache: Map<string, CacheEntry> = new Map();
  private maxSize: number;
  private maxAge: number; // in milliseconds

  /**
   * Creates a new chunk cache
   * @param maxSize Maximum number of entries in the cache
   * @param maxAgeMs Maximum age of cache entries in milliseconds
   */
  constructor(maxSize = 50, maxAgeMs = 60000) {
    this.maxSize = maxSize;
    this.maxAge = maxAgeMs;
  }

  /**
   * Generates a cache key from tasks and options
   * @param tasks The tasks to chunk
   * @param options The chunking options
   * @returns A cache key
   */
  private generateKey(tasks: Task[], options: ChunkingOptions): string {
    // Create a simplified representation of tasks for the key
    const tasksKey = tasks.map(task => ({
      id: task.id,
      dueDate: task.dueDate ? task.dueDate.toISOString() : null,
      status: task.status
    }));

    // Create a key from tasks and options
    return JSON.stringify({
      tasks: tasksKey,
      options
    });
  }

  /**
   * Gets a cached result if available
   * @param tasks The tasks to chunk
   * @param options The chunking options
   * @returns The cached result or null if not found
   */
  get(tasks: Task[], options: ChunkingOptions): ChunkedTimeline | null {
    const key = this.generateKey(tasks, options);
    const entry = this.cache.get(key);

    // Return null if no entry or entry is too old
    if (!entry || Date.now() - entry.timestamp > this.maxAge) {
      return null;
    }

    return entry.result;
  }

  /**
   * Sets a cache entry
   * @param tasks The tasks that were chunked
   * @param options The chunking options used
   * @param result The chunking result
   */
  set(tasks: Task[], options: ChunkingOptions, result: ChunkedTimeline): void {
    const key = this.generateKey(tasks, options);

    // Add to cache with current timestamp
    this.cache.set(key, {
      timestamp: Date.now(),
      result
    });

    // Prune cache if it's too large
    if (this.cache.size > this.maxSize) {
      this.prune();
    }
  }

  /**
   * Prunes the cache by removing the oldest entries
   */
  private prune(): void {
    // Convert to array for sorting
    const entries = Array.from(this.cache.entries());

    // Sort by timestamp (oldest first)
    entries.sort((a, b) => a[1].timestamp - b[1].timestamp);

    // Remove oldest entries until we're under the max size
    const entriesToRemove = entries.slice(0, entries.length - this.maxSize);
    for (const [key] of entriesToRemove) {
      this.cache.delete(key);
    }
  }

  /**
   * Clears the cache
   */
  clear(): void {
    this.cache.clear();
  }

  /**
   * Gets the current size of the cache
   */
  size(): number {
    return this.cache.size;
  }
}

// Export a singleton instance
export const chunkCache = new ChunkCache();

/**
 * Gets a cached chunking result or computes and caches a new one
 * @param chunkFn The function to compute chunks
 * @param tasks The tasks to chunk
 * @param options The chunking options
 * @returns The chunking result
 */
export function getCachedChunks(
  chunkFn: (tasks: Task[], options: ChunkingOptions) => ChunkedTimeline,
  tasks: Task[],
  options: ChunkingOptions
): ChunkedTimeline {
  // Try to get from cache
  const cached = chunkCache.get(tasks, options);
  if (cached) {
    return cached;
  }

  // Compute new result
  const result = chunkFn(tasks, options);

  // Cache the result
  chunkCache.set(tasks, options, result);

  return result;
}
