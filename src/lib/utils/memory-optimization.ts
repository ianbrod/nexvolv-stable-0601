import { Task } from '@/types';

/**
 * Options for memory optimization
 */
export interface MemoryOptimizationOptions {
  /** Maximum number of items to keep in memory */
  maxItemsInMemory?: number;
  /** Number of items to keep before the viewport */
  itemsBeforeViewport?: number;
  /** Number of items to keep after the viewport */
  itemsAfterViewport?: number;
  /** Whether to use lightweight item proxies for off-screen items */
  useLightweightProxies?: boolean;
  /** Whether to compress item data for off-screen items */
  compressOffscreenItems?: boolean;
  /** Whether to enable memory pool management */
  enableMemoryPool?: boolean;
  /** Whether to enable automatic garbage collection hints */
  enableGCHints?: boolean;
  /** Memory pressure threshold (0-1) */
  memoryPressureThreshold?: number;
}

/**
 * Memory pool for reusing objects
 */
class MemoryPool<T> {
  private pool: T[] = [];
  private createFn: () => T;
  private resetFn: (item: T) => void;
  private maxSize: number;

  constructor(createFn: () => T, resetFn: (item: T) => void, maxSize: number = 100) {
    this.createFn = createFn;
    this.resetFn = resetFn;
    this.maxSize = maxSize;
  }

  acquire(): T {
    if (this.pool.length > 0) {
      return this.pool.pop()!;
    }
    return this.createFn();
  }

  release(item: T): void {
    if (this.pool.length < this.maxSize) {
      this.resetFn(item);
      this.pool.push(item);
    }
  }

  clear(): void {
    this.pool.length = 0;
  }

  get size(): number {
    return this.pool.length;
  }
}

/**
 * WeakMap-based cache for better garbage collection
 */
class WeakCache<K extends object, V> {
  private cache = new WeakMap<K, V>();
  private hits = 0;
  private misses = 0;

  get(key: K): V | undefined {
    const value = this.cache.get(key);
    if (value !== undefined) {
      this.hits++;
    } else {
      this.misses++;
    }
    return value;
  }

  set(key: K, value: V): void {
    this.cache.set(key, value);
  }

  has(key: K): boolean {
    return this.cache.has(key);
  }

  delete(key: K): boolean {
    return this.cache.delete(key);
  }

  getStats(): { hits: number; misses: number; hitRate: number } {
    const total = this.hits + this.misses;
    return {
      hits: this.hits,
      misses: this.misses,
      hitRate: total > 0 ? this.hits / total : 0
    };
  }

  resetStats(): void {
    this.hits = 0;
    this.misses = 0;
  }
}

/**
 * Default options for memory optimization
 */
const DEFAULT_OPTIONS: MemoryOptimizationOptions = {
  maxItemsInMemory: 1000,
  itemsBeforeViewport: 100,
  itemsAfterViewport: 100,
  useLightweightProxies: true,
  compressOffscreenItems: true,
  enableMemoryPool: true,
  enableGCHints: true,
  memoryPressureThreshold: 0.8,
};

/**
 * Global memory pools for different object types
 */
const taskProxyPool = new MemoryPool<TaskProxy>(
  () => ({
    id: '',
    name: '',
    priority: 'MEDIUM',
    status: 'TODO',
    dueDate: null,
    isProxy: true,
    originalIndex: 0,
  }),
  (proxy) => {
    proxy.id = '';
    proxy.name = '';
    proxy.priority = 'MEDIUM';
    proxy.status = 'TODO';
    proxy.dueDate = null;
    proxy.originalIndex = 0;
  }
);

/**
 * Global weak cache for task proxies
 */
const taskProxyCache = new WeakCache<Task, TaskProxy>();

/**
 * Memory pressure monitor
 */
class MemoryPressureMonitor {
  private static instance: MemoryPressureMonitor;
  private memoryPressure = 0;
  private listeners: ((pressure: number) => void)[] = [];
  private intervalId: number | null = null;

  static getInstance(): MemoryPressureMonitor {
    if (!MemoryPressureMonitor.instance) {
      MemoryPressureMonitor.instance = new MemoryPressureMonitor();
    }
    return MemoryPressureMonitor.instance;
  }

  startMonitoring(): void {
    if (this.intervalId) return;

    this.intervalId = window.setInterval(() => {
      this.updateMemoryPressure();
    }, 5000); // Check every 5 seconds
  }

  stopMonitoring(): void {
    if (this.intervalId) {
      clearInterval(this.intervalId);
      this.intervalId = null;
    }
  }

  private updateMemoryPressure(): void {
    if ('memory' in performance && 'usedJSHeapSize' in (performance as any).memory) {
      const memory = (performance as any).memory;
      const pressure = memory.usedJSHeapSize / memory.jsHeapSizeLimit;
      this.memoryPressure = Math.min(pressure, 1);

      this.listeners.forEach(listener => listener(this.memoryPressure));
    }
  }

  addListener(listener: (pressure: number) => void): () => void {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index > -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  getCurrentPressure(): number {
    return this.memoryPressure;
  }
}

/**
 * Lightweight proxy for a task
 * Contains only the essential properties needed for virtualization
 */
export interface TaskProxy {
  id: string;
  name: string;
  priority: 'LOW' | 'MEDIUM' | 'HIGH';
  status: 'TODO' | 'IN_PROGRESS' | 'COMPLETED' | 'ARCHIVED';
  dueDate?: Date | null;
  isProxy: true;
  originalIndex: number;
}

/**
 * Creates a lightweight proxy for a task using memory pool
 * @param task The original task
 * @param index The original index of the task
 * @param usePool Whether to use the memory pool
 * @returns A lightweight proxy for the task
 */
export function createTaskProxy(task: Task, index: number, usePool: boolean = true): TaskProxy {
  // Check cache first
  const cached = taskProxyCache.get(task);
  if (cached && cached.originalIndex === index) {
    return cached;
  }

  let proxy: TaskProxy;

  if (usePool) {
    proxy = taskProxyPool.acquire();
    proxy.id = task.id;
    proxy.name = task.name;
    proxy.priority = task.priority;
    proxy.status = task.status;
    proxy.dueDate = task.dueDate;
    proxy.originalIndex = index;
  } else {
    proxy = {
      id: task.id,
      name: task.name,
      priority: task.priority,
      status: task.status,
      dueDate: task.dueDate,
      isProxy: true,
      originalIndex: index,
    };
  }

  // Cache the proxy
  taskProxyCache.set(task, proxy);

  return proxy;
}

/**
 * Releases a task proxy back to the memory pool
 * @param proxy The task proxy to release
 */
export function releaseTaskProxy(proxy: TaskProxy): void {
  taskProxyPool.release(proxy);
}

/**
 * Optimizes memory usage for a large list of tasks
 * @param tasks The original tasks
 * @param visibleStartIndex The start index of the visible viewport
 * @param visibleEndIndex The end index of the visible viewport
 * @param options Memory optimization options
 * @returns Optimized tasks array
 */
export function optimizeMemoryUsage(
  tasks: Task[],
  visibleStartIndex: number,
  visibleEndIndex: number,
  options: MemoryOptimizationOptions = {}
): (Task | TaskProxy)[] {
  const mergedOptions = { ...DEFAULT_OPTIONS, ...options };

  const {
    maxItemsInMemory,
    itemsBeforeViewport,
    itemsAfterViewport,
    useLightweightProxies,
    compressOffscreenItems,
    enableMemoryPool,
    enableGCHints,
    memoryPressureThreshold,
  } = mergedOptions;

  // Check memory pressure and adjust strategy
  const memoryMonitor = MemoryPressureMonitor.getInstance();
  const currentPressure = memoryMonitor.getCurrentPressure();
  const isHighMemoryPressure = currentPressure > (memoryPressureThreshold || 0.8);

  // Adjust parameters based on memory pressure
  const adjustedMaxItems = isHighMemoryPressure ? Math.floor((maxItemsInMemory || 1000) * 0.5) : (maxItemsInMemory || 1000);
  const adjustedBeforeViewport = isHighMemoryPressure ? Math.floor((itemsBeforeViewport || 100) * 0.5) : (itemsBeforeViewport || 100);
  const adjustedAfterViewport = isHighMemoryPressure ? Math.floor((itemsAfterViewport || 100) * 0.5) : (itemsAfterViewport || 100);

  // If the number of tasks is less than the maximum, return the original tasks
  if (tasks.length <= adjustedMaxItems) {
    return tasks;
  }

  // Calculate the range of items to keep in full detail
  const startIndex = Math.max(0, visibleStartIndex - adjustedBeforeViewport);
  const endIndex = Math.min(tasks.length - 1, visibleEndIndex + adjustedAfterViewport);

  // Create optimized array
  const optimizedTasks: (Task | TaskProxy)[] = new Array(tasks.length);

  // Fill the array with proxies or compressed items
  for (let i = 0; i < tasks.length; i++) {
    if (i >= startIndex && i <= endIndex) {
      // Keep items in the viewport range in full detail
      optimizedTasks[i] = tasks[i];
    } else if (useLightweightProxies) {
      // Use lightweight proxies for off-screen items
      optimizedTasks[i] = createTaskProxy(tasks[i], i, enableMemoryPool);
    } else if (compressOffscreenItems) {
      // Compress off-screen items by removing non-essential properties
      const { id, name, priority, status, dueDate } = tasks[i];
      optimizedTasks[i] = { id, name, priority, status, dueDate } as Task;
    } else {
      // Fallback to original items
      optimizedTasks[i] = tasks[i];
    }
  }

  // Trigger garbage collection hint if enabled and under high memory pressure
  if (enableGCHints && isHighMemoryPressure && 'gc' in window && typeof (window as any).gc === 'function') {
    setTimeout(() => {
      try {
        (window as any).gc();
      } catch (e) {
        // GC not available, ignore
      }
    }, 0);
  }

  return optimizedTasks;
}

/**
 * Restores a task from its proxy
 * @param proxy The task proxy
 * @param tasks The original tasks array
 * @returns The original task
 */
export function restoreTaskFromProxy(
  proxy: TaskProxy,
  tasks: Task[]
): Task {
  return tasks[proxy.originalIndex];
}

/**
 * Checks if an item is a task proxy
 * @param item The item to check
 * @returns True if the item is a task proxy
 */
export function isTaskProxy(item: Task | TaskProxy): item is TaskProxy {
  return 'isProxy' in item && item.isProxy === true;
}

/**
 * Estimates the memory usage of a task
 * @param task The task to estimate
 * @returns Estimated memory usage in bytes
 */
export function estimateTaskMemoryUsage(task: Task): number {
  let size = 0;

  // Base object overhead (varies by browser, but ~40 bytes is common)
  size += 40;

  // String properties
  size += task.id.length * 2;
  size += task.name.length * 2;
  size += (task.description?.length || 0) * 2;
  size += (task.notes?.length || 0) * 2;

  // Date objects (approximately 40 bytes each)
  if (task.dueDate) size += 40;
  if (task.startedAt) size += 40;
  if (task.completedAt) size += 40;
  if (task.recurrenceEndDate) size += 40;
  if (task.lastGeneratedDate) size += 40;
  if (task.createdAt) size += 40;
  if (task.updatedAt) size += 40;

  // Arrays
  if (task.tags) {
    size += 40; // Array overhead
    task.tags.forEach(tag => {
      size += tag.length * 2;
    });
  }

  // Nested objects
  if (task.goal) {
    size += 100; // Rough estimate for a goal object
  }

  return size;
}

/**
 * Estimates the memory usage of a task proxy
 * @param proxy The task proxy to estimate
 * @returns Estimated memory usage in bytes
 */
export function estimateProxyMemoryUsage(proxy: TaskProxy): number {
  let size = 0;

  // Base object overhead
  size += 40;

  // String properties
  size += proxy.id.length * 2;
  size += proxy.name.length * 2;

  // Date objects
  if (proxy.dueDate) size += 40;

  // Number properties
  size += 8; // originalIndex

  return size;
}

/**
 * Calculates the memory savings from using proxies
 * @param tasks The original tasks
 * @param optimizedTasks The optimized tasks
 * @returns Memory savings in bytes
 */
export function calculateMemorySavings(
  tasks: Task[],
  optimizedTasks: (Task | TaskProxy)[]
): number {
  let originalSize = 0;
  let optimizedSize = 0;

  for (let i = 0; i < tasks.length; i++) {
    originalSize += estimateTaskMemoryUsage(tasks[i]);

    if (isTaskProxy(optimizedTasks[i])) {
      optimizedSize += estimateProxyMemoryUsage(optimizedTasks[i]);
    } else {
      optimizedSize += estimateTaskMemoryUsage(optimizedTasks[i] as Task);
    }
  }

  return originalSize - optimizedSize;
}

/**
 * Gets memory optimization statistics
 */
export function getMemoryOptimizationStats(): {
  proxyPoolSize: number;
  cacheStats: { hits: number; misses: number; hitRate: number };
  memoryPressure: number;
} {
  return {
    proxyPoolSize: taskProxyPool.size,
    cacheStats: taskProxyCache.getStats(),
    memoryPressure: MemoryPressureMonitor.getInstance().getCurrentPressure(),
  };
}

/**
 * Clears all memory optimization caches and pools
 */
export function clearMemoryOptimizationCaches(): void {
  taskProxyPool.clear();
  taskProxyCache.resetStats();
}

/**
 * Starts memory pressure monitoring
 */
export function startMemoryPressureMonitoring(): () => void {
  const monitor = MemoryPressureMonitor.getInstance();
  monitor.startMonitoring();

  return () => {
    monitor.stopMonitoring();
  };
}

/**
 * Adds a memory pressure listener
 */
export function addMemoryPressureListener(listener: (pressure: number) => void): () => void {
  return MemoryPressureMonitor.getInstance().addListener(listener);
}

/**
 * Advanced memory optimization with adaptive strategies
 */
export function adaptiveMemoryOptimization(
  tasks: Task[],
  visibleStartIndex: number,
  visibleEndIndex: number,
  deviceCapabilities?: {
    totalMemory?: number;
    availableMemory?: number;
    deviceType?: 'mobile' | 'tablet' | 'desktop';
  }
): (Task | TaskProxy)[] {
  const baseOptions: MemoryOptimizationOptions = { ...DEFAULT_OPTIONS };

  // Adjust based on device capabilities
  if (deviceCapabilities) {
    const { totalMemory, deviceType } = deviceCapabilities;

    if (deviceType === 'mobile' || (totalMemory && totalMemory < 4 * 1024 * 1024 * 1024)) {
      // Mobile or low-memory device
      baseOptions.maxItemsInMemory = 500;
      baseOptions.itemsBeforeViewport = 50;
      baseOptions.itemsAfterViewport = 50;
      baseOptions.memoryPressureThreshold = 0.7;
    } else if (deviceType === 'tablet' || (totalMemory && totalMemory < 8 * 1024 * 1024 * 1024)) {
      // Tablet or medium-memory device
      baseOptions.maxItemsInMemory = 750;
      baseOptions.itemsBeforeViewport = 75;
      baseOptions.itemsAfterViewport = 75;
      baseOptions.memoryPressureThreshold = 0.75;
    }
    // Desktop defaults are already set
  }

  return optimizeMemoryUsage(tasks, visibleStartIndex, visibleEndIndex, baseOptions);
}
