import { Task } from '@/types';
import { format, isSameDay, isSameWeek, isSameMonth, isSameYear, startOfDay, startOfWeek, startOfMonth, startOfYear } from 'date-fns';

/**
 * Represents a chunk of timeline items grouped by a date range
 */
export interface DateChunk {
  id: string;
  label: string;
  startDate: Date;
  endDate?: Date;
  items: Task[];
  type: 'day' | 'week' | 'month' | 'year';
  isLoaded: boolean;
  isCompressed: boolean;
  estimatedSize: number;
  priority: number; // For preloading priority
}

/**
 * Compressed chunk data for memory optimization
 */
export interface CompressedChunk {
  id: string;
  label: string;
  startDate: Date;
  endDate?: Date;
  itemCount: number;
  type: 'day' | 'week' | 'month' | 'year';
  compressedData: string; // JSON.stringify of essential data
}

/**
 * Represents the result of chunking timeline items
 */
export interface ChunkedTimeline {
  chunks: DateChunk[];
  totalItems: number;
  dateRange: {
    startDate: Date;
    endDate: Date;
  };
}

/**
 * Options for chunking timeline items
 */
export interface ChunkingOptions {
  chunkBy: 'day' | 'week' | 'month' | 'year';
  sortDirection?: 'asc' | 'desc';
  includeItemsWithoutDates?: boolean;
  maxItemsPerChunk?: number;
  enableCompression?: boolean;
  enablePredictiveLoading?: boolean;
  memoryOptimized?: boolean;
  dynamicChunkSizing?: boolean;
  deviceCapabilities?: {
    totalMemory?: number;
    deviceType?: 'mobile' | 'tablet' | 'desktop';
  };
  dateFormat?: {
    day?: string;
    week?: string;
    month?: string;
    year?: string;
  };
}

/**
 * Chunk manager for handling dynamic loading and compression
 */
class ChunkManager {
  private static instance: ChunkManager;
  private loadedChunks = new Map<string, DateChunk>();
  private compressedChunks = new Map<string, CompressedChunk>();
  private loadingPromises = new Map<string, Promise<DateChunk>>();
  private accessTimes = new Map<string, number>();
  private maxLoadedChunks = 50;

  static getInstance(): ChunkManager {
    if (!ChunkManager.instance) {
      ChunkManager.instance = new ChunkManager();
    }
    return ChunkManager.instance;
  }

  setMaxLoadedChunks(max: number): void {
    this.maxLoadedChunks = max;
    this.evictOldChunks();
  }

  async loadChunk(chunkId: string, loader: () => Promise<DateChunk>): Promise<DateChunk> {
    // Check if already loaded
    const loaded = this.loadedChunks.get(chunkId);
    if (loaded) {
      this.accessTimes.set(chunkId, Date.now());
      return loaded;
    }

    // Check if already loading
    const loading = this.loadingPromises.get(chunkId);
    if (loading) {
      return loading;
    }

    // Start loading
    const promise = loader();
    this.loadingPromises.set(chunkId, promise);

    try {
      const chunk = await promise;
      this.loadedChunks.set(chunkId, chunk);
      this.accessTimes.set(chunkId, Date.now());
      this.loadingPromises.delete(chunkId);

      // Evict old chunks if necessary
      this.evictOldChunks();

      return chunk;
    } catch (error) {
      this.loadingPromises.delete(chunkId);
      throw error;
    }
  }

  compressChunk(chunk: DateChunk): CompressedChunk {
    const essentialData = chunk.items.map(item => ({
      id: item.id,
      name: item.name,
      priority: item.priority,
      status: item.status,
      dueDate: item.dueDate,
    }));

    return {
      id: chunk.id,
      label: chunk.label,
      startDate: chunk.startDate,
      endDate: chunk.endDate,
      itemCount: chunk.items.length,
      type: chunk.type,
      compressedData: JSON.stringify(essentialData),
    };
  }

  decompressChunk(compressed: CompressedChunk): DateChunk {
    const items = JSON.parse(compressed.compressedData);

    return {
      id: compressed.id,
      label: compressed.label,
      startDate: compressed.startDate,
      endDate: compressed.endDate,
      items,
      type: compressed.type,
      isLoaded: true,
      isCompressed: false,
      estimatedSize: items.length * 500, // Rough estimate
      priority: 0,
    };
  }

  private evictOldChunks(): void {
    if (this.loadedChunks.size <= this.maxLoadedChunks) return;

    // Sort by access time and evict oldest
    const sortedChunks = Array.from(this.accessTimes.entries())
      .sort(([, a], [, b]) => a - b);

    const toEvict = sortedChunks.slice(0, this.loadedChunks.size - this.maxLoadedChunks);

    for (const [chunkId] of toEvict) {
      const chunk = this.loadedChunks.get(chunkId);
      if (chunk) {
        // Compress before evicting
        const compressed = this.compressChunk(chunk);
        this.compressedChunks.set(chunkId, compressed);
      }

      this.loadedChunks.delete(chunkId);
      this.accessTimes.delete(chunkId);
    }
  }

  getStats(): {
    loadedChunks: number;
    compressedChunks: number;
    totalMemoryEstimate: number;
  } {
    let totalMemory = 0;

    for (const chunk of this.loadedChunks.values()) {
      totalMemory += chunk.estimatedSize;
    }

    for (const compressed of this.compressedChunks.values()) {
      totalMemory += compressed.compressedData.length * 2; // Rough estimate for string storage
    }

    return {
      loadedChunks: this.loadedChunks.size,
      compressedChunks: this.compressedChunks.size,
      totalMemoryEstimate: totalMemory,
    };
  }

  clear(): void {
    this.loadedChunks.clear();
    this.compressedChunks.clear();
    this.loadingPromises.clear();
    this.accessTimes.clear();
  }
}

/**
 * Default chunking options
 */
export const DEFAULT_CHUNKING_OPTIONS: ChunkingOptions = {
  chunkBy: 'day',
  sortDirection: 'asc',
  includeItemsWithoutDates: true,
  enableCompression: true,
  enablePredictiveLoading: true,
  memoryOptimized: true,
  dynamicChunkSizing: true,
  dateFormat: {
    day: 'EEEE, MMMM d, yyyy',
    week: 'MMMM d, yyyy',
    month: 'MMMM yyyy',
    year: 'yyyy'
  }
};

/**
 * Chunks timeline items by date according to the specified options
 * @param items The timeline items to chunk
 * @param options The chunking options
 * @returns The chunked timeline
 */
export function chunkTimelineItemsByDate(
  items: Task[],
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): ChunkedTimeline {
  const mergedOptions = {
    ...DEFAULT_CHUNKING_OPTIONS,
    ...options
  };

  const {
    chunkBy,
    sortDirection,
    includeItemsWithoutDates,
    dateFormat,
    enableCompression,
    memoryOptimized,
    dynamicChunkSizing,
    deviceCapabilities
  } = mergedOptions;

  // Adjust chunk sizing based on device capabilities
  let maxItemsPerChunk = options.maxItemsPerChunk;
  if (dynamicChunkSizing && deviceCapabilities) {
    const { deviceType, totalMemory } = deviceCapabilities;
    if (deviceType === 'mobile' || (totalMemory && totalMemory < 4 * 1024 * 1024 * 1024)) {
      maxItemsPerChunk = maxItemsPerChunk ? Math.min(maxItemsPerChunk, 50) : 50;
    } else if (deviceType === 'tablet' || (totalMemory && totalMemory < 8 * 1024 * 1024 * 1024)) {
      maxItemsPerChunk = maxItemsPerChunk ? Math.min(maxItemsPerChunk, 100) : 100;
    }
  }

  // Filter out items without dates if specified
  const filteredItems = includeItemsWithoutDates
    ? items
    : items.filter(item => item.dueDate);

  // Group items by the specified chunk type
  const groupedItems: Record<string, Task[]> = {};
  const itemsWithoutDates: Task[] = [];

  // Track date range
  let minDate: Date | null = null;
  let maxDate: Date | null = null;

  // Group items by date
  filteredItems.forEach(item => {
    if (!item.dueDate) {
      itemsWithoutDates.push(item);
      return;
    }

    const itemDate = new Date(item.dueDate);

    // Update min/max dates
    if (!minDate || itemDate < minDate) minDate = itemDate;
    if (!maxDate || itemDate > maxDate) maxDate = itemDate;

    // Get the appropriate start date based on chunk type
    let chunkStartDate: Date;
    let formatString: string;

    switch (chunkBy) {
      case 'day':
        chunkStartDate = startOfDay(itemDate);
        formatString = dateFormat?.day || DEFAULT_CHUNKING_OPTIONS.dateFormat!.day!;
        break;
      case 'week':
        chunkStartDate = startOfWeek(itemDate);
        formatString = dateFormat?.week || DEFAULT_CHUNKING_OPTIONS.dateFormat!.week!;
        break;
      case 'month':
        chunkStartDate = startOfMonth(itemDate);
        formatString = dateFormat?.month || DEFAULT_CHUNKING_OPTIONS.dateFormat!.month!;
        break;
      case 'year':
        chunkStartDate = startOfYear(itemDate);
        formatString = dateFormat?.year || DEFAULT_CHUNKING_OPTIONS.dateFormat!.year!;
        break;
      default:
        chunkStartDate = startOfDay(itemDate);
        formatString = dateFormat?.day || DEFAULT_CHUNKING_OPTIONS.dateFormat!.day!;
    }

    const chunkKey = format(chunkStartDate, 'yyyy-MM-dd');

    if (!groupedItems[chunkKey]) {
      groupedItems[chunkKey] = [];
    }

    groupedItems[chunkKey].push(item);
  });

  // Create chunks from grouped items
  const chunks: DateChunk[] = Object.entries(groupedItems).map(([key, chunkItems], index) => {
    const chunkDate = new Date(key);
    const estimatedSize = chunkItems.length * 500; // Rough estimate per item

    return {
      id: `chunk-${key}`,
      label: format(chunkDate,
        chunkBy === 'day' ? (dateFormat?.day || DEFAULT_CHUNKING_OPTIONS.dateFormat!.day!) :
        chunkBy === 'week' ? (dateFormat?.week || DEFAULT_CHUNKING_OPTIONS.dateFormat!.week!) :
        chunkBy === 'month' ? (dateFormat?.month || DEFAULT_CHUNKING_OPTIONS.dateFormat!.month!) :
        (dateFormat?.year || DEFAULT_CHUNKING_OPTIONS.dateFormat!.year!)
      ),
      startDate: chunkDate,
      items: chunkItems,
      type: chunkBy,
      isLoaded: true,
      isCompressed: false,
      estimatedSize,
      priority: index, // Initial priority based on order
    };
  });

  // Sort chunks by date
  chunks.sort((a, b) => {
    const comparison = a.startDate.getTime() - b.startDate.getTime();
    return sortDirection === 'desc' ? -comparison : comparison;
  });

  // Add items without dates as a separate chunk if needed
  if (includeItemsWithoutDates && itemsWithoutDates.length > 0) {
    const noDueDateChunk: DateChunk = {
      id: 'chunk-no-date',
      label: 'No Due Date',
      startDate: new Date(0), // Use epoch time for items without dates
      items: itemsWithoutDates,
      type: chunkBy,
      isLoaded: true,
      isCompressed: false,
      estimatedSize: itemsWithoutDates.length * 500,
      priority: sortDirection === 'asc' ? chunks.length : -1,
    };

    // Add the "No Due Date" chunk at the beginning or end based on sort direction
    if (sortDirection === 'asc') {
      chunks.push(noDueDateChunk);
    } else {
      chunks.unshift(noDueDateChunk);
    }
  }

  return {
    chunks,
    totalItems: filteredItems.length,
    dateRange: {
      startDate: minDate || new Date(),
      endDate: maxDate || new Date()
    }
  };
}

/**
 * Determines if a task belongs to a specific date chunk
 * @param task The task to check
 * @param chunkDate The date of the chunk
 * @param chunkType The type of chunk
 * @returns True if the task belongs to the chunk, false otherwise
 */
export function isTaskInDateChunk(
  task: Task,
  chunkDate: Date,
  chunkType: 'day' | 'week' | 'month' | 'year'
): boolean {
  if (!task.dueDate) return false;

  const taskDate = new Date(task.dueDate);

  switch (chunkType) {
    case 'day':
      return isSameDay(taskDate, chunkDate);
    case 'week':
      return isSameWeek(taskDate, chunkDate);
    case 'month':
      return isSameMonth(taskDate, chunkDate);
    case 'year':
      return isSameYear(taskDate, chunkDate);
    default:
      return false;
  }
}

/**
 * Gets the chunk manager instance
 */
export function getChunkManager(): ChunkManager {
  return ChunkManager.getInstance();
}

/**
 * Optimized chunking with memory management
 */
export function optimizedChunkTimelineItems(
  items: Task[],
  options: ChunkingOptions = DEFAULT_CHUNKING_OPTIONS
): ChunkedTimeline {
  const manager = ChunkManager.getInstance();

  // Adjust max loaded chunks based on device capabilities
  if (options.deviceCapabilities) {
    const { deviceType, totalMemory } = options.deviceCapabilities;
    if (deviceType === 'mobile' || (totalMemory && totalMemory < 4 * 1024 * 1024 * 1024)) {
      manager.setMaxLoadedChunks(20);
    } else if (deviceType === 'tablet' || (totalMemory && totalMemory < 8 * 1024 * 1024 * 1024)) {
      manager.setMaxLoadedChunks(35);
    } else {
      manager.setMaxLoadedChunks(50);
    }
  }

  return chunkTimelineItemsByDate(items, options);
}

/**
 * Predictive chunk loading based on scroll direction and velocity
 */
export function predictiveChunkLoading(
  currentChunkIndex: number,
  scrollDirection: 'up' | 'down' | null,
  scrollVelocity: number,
  chunks: DateChunk[]
): string[] {
  const chunksToPreload: string[] = [];

  if (!scrollDirection) return chunksToPreload;

  // Calculate how many chunks to preload based on velocity
  const preloadCount = Math.min(Math.ceil(scrollVelocity / 100), 5);

  if (scrollDirection === 'down') {
    // Preload chunks ahead
    for (let i = 1; i <= preloadCount; i++) {
      const nextIndex = currentChunkIndex + i;
      if (nextIndex < chunks.length) {
        chunksToPreload.push(chunks[nextIndex].id);
      }
    }
  } else {
    // Preload chunks behind
    for (let i = 1; i <= preloadCount; i++) {
      const prevIndex = currentChunkIndex - i;
      if (prevIndex >= 0) {
        chunksToPreload.push(chunks[prevIndex].id);
      }
    }
  }

  return chunksToPreload;
}

/**
 * Gets chunking statistics
 */
export function getChunkingStats(): {
  loadedChunks: number;
  compressedChunks: number;
  totalMemoryEstimate: number;
} {
  return ChunkManager.getInstance().getStats();
}

/**
 * Clears all chunk caches
 */
export function clearChunkCaches(): void {
  ChunkManager.getInstance().clear();
}

/**
 * Adaptive chunk sizing based on content and performance
 */
export function adaptiveChunkSizing(
  items: Task[],
  performanceMetrics: {
    averageRenderTime: number;
    memoryUsage: number;
    deviceCapabilities?: {
      totalMemory?: number;
      deviceType?: 'mobile' | 'tablet' | 'desktop';
    };
  }
): ChunkingOptions {
  const baseOptions: ChunkingOptions = { ...DEFAULT_CHUNKING_OPTIONS };

  // Adjust based on render performance
  if (performanceMetrics.averageRenderTime > 50) {
    // Slow rendering, use smaller chunks
    baseOptions.maxItemsPerChunk = 25;
    baseOptions.chunkBy = 'day';
  } else if (performanceMetrics.averageRenderTime > 20) {
    // Medium rendering, moderate chunks
    baseOptions.maxItemsPerChunk = 50;
  } else {
    // Fast rendering, larger chunks allowed
    baseOptions.maxItemsPerChunk = 100;
  }

  // Adjust based on memory usage
  const memoryPressure = performanceMetrics.memoryUsage / (1024 * 1024 * 1024); // Convert to GB
  if (memoryPressure > 2) {
    // High memory usage, enable compression
    baseOptions.enableCompression = true;
    baseOptions.memoryOptimized = true;
    baseOptions.maxItemsPerChunk = Math.min(baseOptions.maxItemsPerChunk || 50, 30);
  }

  // Adjust based on device capabilities
  if (performanceMetrics.deviceCapabilities) {
    baseOptions.deviceCapabilities = performanceMetrics.deviceCapabilities;
    baseOptions.dynamicChunkSizing = true;
  }

  return baseOptions;
}
