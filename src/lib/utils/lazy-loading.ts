/**
 * Utility functions for lazy loading timeline items
 */

/**
 * Represents the viewport information for lazy loading
 */
export interface ViewportInfo {
  startIndex: number;
  endIndex: number;
  visibleStartIndex: number;
  visibleEndIndex: number;
  scrollOffset: number;
  scrollDirection: 'forward' | 'backward' | null;
  containerHeight: number;
  scrollVelocity: number;
  isScrolling: boolean;
}

/**
 * Priority levels for loading items
 */
export enum LoadingPriority {
  IMMEDIATE = 0,
  HIGH = 1,
  MEDIUM = 2,
  LOW = 3,
  BACKGROUND = 4,
}

/**
 * Loading queue item
 */
export interface LoadingQueueItem {
  index: number;
  priority: LoadingPriority;
  timestamp: number;
  retryCount: number;
  estimatedSize: number;
  loadCallback?: () => Promise<void>;
}

/**
 * Predictive loading configuration
 */
export interface PredictiveLoadingConfig {
  enabled: boolean;
  velocityThreshold: number;
  maxPredictiveItems: number;
  adaptiveStrategy: boolean;
}

/**
 * Calculates which items are in the viewport and which need to be loaded
 * @param scrollOffset Current scroll offset
 * @param scrollDirection Direction of scrolling
 * @param containerHeight Height of the viewport container
 * @param itemCount Total number of items
 * @param getItemHeight Function to get the height of an item
 * @param overscanCount Number of items to overscan (load outside viewport)
 * @param loadingThreshold Additional threshold for loading items
 * @param scrollVelocity Current scroll velocity
 * @param isScrolling Whether currently scrolling
 * @returns Viewport information
 */
export function calculateViewport(
  scrollOffset: number,
  scrollDirection: 'forward' | 'backward' | null,
  containerHeight: number,
  itemCount: number,
  getItemHeight: (index: number) => number,
  overscanCount: number = 5,
  loadingThreshold: number = 10,
  scrollVelocity: number = 0,
  isScrolling: boolean = false
): ViewportInfo {
  // Calculate visible items
  let visibleStartIndex = 0;
  let visibleEndIndex = 0;
  let currentOffset = 0;

  // Find the first visible item
  for (let i = 0; i < itemCount; i++) {
    const itemHeight = getItemHeight(i);
    if (currentOffset + itemHeight > scrollOffset) {
      visibleStartIndex = i;
      break;
    }
    currentOffset += itemHeight;
  }

  // Find the last visible item
  currentOffset = 0;
  for (let i = 0; i < itemCount; i++) {
    const itemHeight = getItemHeight(i);
    if (currentOffset > scrollOffset + containerHeight) {
      visibleEndIndex = i - 1;
      break;
    }
    currentOffset += itemHeight;

    // If we've reached the end of the list
    if (i === itemCount - 1) {
      visibleEndIndex = i;
    }
  }

  // Calculate overscan indices
  const overscanBackward = scrollDirection === 'backward' ? overscanCount + loadingThreshold : overscanCount;
  const overscanForward = scrollDirection === 'forward' ? overscanCount + loadingThreshold : overscanCount;

  const startIndex = Math.max(0, visibleStartIndex - overscanBackward);
  const endIndex = Math.min(itemCount - 1, visibleEndIndex + overscanForward);

  return {
    startIndex,
    endIndex,
    visibleStartIndex,
    visibleEndIndex,
    scrollOffset,
    scrollDirection,
    containerHeight,
    scrollVelocity,
    isScrolling
  };
}

/**
 * Determines if an item should be loaded based on viewport information
 * @param index Item index
 * @param viewport Viewport information
 * @param prefetchRange Range to prefetch outside the viewport
 * @returns True if the item should be loaded
 */
export function shouldLoadItem(
  index: number,
  viewport: ViewportInfo,
  prefetchRange: number = 20
): boolean {
  // Always load visible items
  if (index >= viewport.visibleStartIndex && index <= viewport.visibleEndIndex) {
    return true;
  }

  // Load items within the overscan range
  if (index >= viewport.startIndex && index <= viewport.endIndex) {
    return true;
  }

  // Load items in the prefetch range based on scroll direction
  if (viewport.scrollDirection === 'forward' &&
      index > viewport.endIndex &&
      index <= viewport.endIndex + prefetchRange) {
    return true;
  }

  if (viewport.scrollDirection === 'backward' &&
      index < viewport.startIndex &&
      index >= viewport.startIndex - prefetchRange) {
    return true;
  }

  return false;
}

/**
 * Determines the priority of loading an item
 * @param index Item index
 * @param viewport Viewport information
 * @returns Priority (1 = highest, 3 = lowest)
 */
export function getItemLoadingPriority(
  index: number,
  viewport: ViewportInfo
): LoadingPriority {
  // Visible items have highest priority
  if (index >= viewport.visibleStartIndex && index <= viewport.visibleEndIndex) {
    return LoadingPriority.IMMEDIATE;
  }

  // Items in the overscan range have high priority
  if (index >= viewport.startIndex && index <= viewport.endIndex) {
    return LoadingPriority.HIGH;
  }

  // Items in scroll direction have medium priority
  if (viewport.scrollDirection === 'forward' && index > viewport.endIndex) {
    return LoadingPriority.MEDIUM;
  }

  if (viewport.scrollDirection === 'backward' && index < viewport.startIndex) {
    return LoadingPriority.MEDIUM;
  }

  // All other items have lowest priority
  return LoadingPriority.LOW;
}

/**
 * Intersection Observer-based lazy loader
 */
class IntersectionLazyLoader {
  private static instance: IntersectionLazyLoader;
  private observer: IntersectionObserver | null = null;
  private loadingCallbacks = new Map<Element, () => void>();
  private loadedElements = new WeakSet<Element>();
  private errorElements = new WeakSet<Element>();

  static getInstance(): IntersectionLazyLoader {
    if (!IntersectionLazyLoader.instance) {
      IntersectionLazyLoader.instance = new IntersectionLazyLoader();
    }
    return IntersectionLazyLoader.instance;
  }

  initialize(options: IntersectionObserverInit = {}): void {
    if (this.observer) return;

    const defaultOptions: IntersectionObserverInit = {
      root: null,
      rootMargin: '50px',
      threshold: [0, 0.1, 0.5, 1.0],
      ...options,
    };

    this.observer = new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting && !this.loadedElements.has(entry.target)) {
          const callback = this.loadingCallbacks.get(entry.target);
          if (callback) {
            try {
              callback();
              this.loadedElements.add(entry.target);
            } catch (error) {
              this.errorElements.add(entry.target);
              console.error('Lazy loading error:', error);
            }
          }
        }
      });
    }, defaultOptions);
  }

  observe(element: Element, loadCallback: () => void): void {
    if (!this.observer) {
      this.initialize();
    }

    this.loadingCallbacks.set(element, loadCallback);
    this.observer!.observe(element);
  }

  unobserve(element: Element): void {
    if (this.observer) {
      this.observer.unobserve(element);
      this.loadingCallbacks.delete(element);
    }
  }

  disconnect(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.loadingCallbacks.clear();
    }
  }

  isLoaded(element: Element): boolean {
    return this.loadedElements.has(element);
  }

  hasError(element: Element): boolean {
    return this.errorElements.has(element);
  }
}

/**
 * Priority-based loading queue
 */
class LoadingQueue {
  private queue: LoadingQueueItem[] = [];
  private processing = false;
  private maxConcurrent = 3;
  private currentlyLoading = 0;
  private loadingPromises = new Map<number, Promise<void>>();

  add(item: LoadingQueueItem): void {
    // Remove existing item with same index if present
    this.queue = this.queue.filter(q => q.index !== item.index);

    // Insert based on priority
    const insertIndex = this.queue.findIndex(q => q.priority > item.priority);
    if (insertIndex === -1) {
      this.queue.push(item);
    } else {
      this.queue.splice(insertIndex, 0, item);
    }

    this.processQueue();
  }

  remove(index: number): void {
    this.queue = this.queue.filter(q => q.index !== index);
    this.loadingPromises.delete(index);
  }

  private async processQueue(): Promise<void> {
    if (this.processing || this.currentlyLoading >= this.maxConcurrent) {
      return;
    }

    this.processing = true;

    while (this.queue.length > 0 && this.currentlyLoading < this.maxConcurrent) {
      const item = this.queue.shift()!;
      this.currentlyLoading++;

      const promise = this.loadItem(item);
      this.loadingPromises.set(item.index, promise);

      promise.finally(() => {
        this.currentlyLoading--;
        this.loadingPromises.delete(item.index);
        this.processQueue();
      });
    }

    this.processing = false;
  }

  private async loadItem(item: LoadingQueueItem): Promise<void> {
    try {
      if (item.loadCallback) {
        await item.loadCallback();
      } else {
        // Simulate loading delay based on estimated size
        const loadTime = Math.min(item.estimatedSize / 1000, 100);
        await new Promise(resolve => setTimeout(resolve, loadTime));
      }

      console.log(`Loaded item ${item.index} with priority ${item.priority}`);
    } catch (error) {
      console.error(`Failed to load item ${item.index}:`, error);

      // Retry logic
      if (item.retryCount < 3) {
        item.retryCount++;
        item.priority = Math.min(item.priority + 1, LoadingPriority.BACKGROUND);
        this.add(item);
      }
    }
  }

  getStats(): {
    queueLength: number;
    currentlyLoading: number;
    totalProcessed: number;
  } {
    return {
      queueLength: this.queue.length,
      currentlyLoading: this.currentlyLoading,
      totalProcessed: this.loadingPromises.size,
    };
  }

  clear(): void {
    this.queue = [];
    this.loadingPromises.clear();
  }

  setMaxConcurrent(max: number): void {
    this.maxConcurrent = max;
  }
}

/**
 * Advanced lazy loading manager
 */
export class AdvancedLazyLoader {
  private static instance: AdvancedLazyLoader;
  private intersectionLoader: IntersectionLazyLoader;
  private loadingQueue: LoadingQueue;
  private predictiveConfig: PredictiveLoadingConfig;

  private constructor() {
    this.intersectionLoader = IntersectionLazyLoader.getInstance();
    this.loadingQueue = new LoadingQueue();
    this.predictiveConfig = {
      enabled: true,
      velocityThreshold: 100,
      maxPredictiveItems: 10,
      adaptiveStrategy: true,
    };
  }

  static getInstance(): AdvancedLazyLoader {
    if (!AdvancedLazyLoader.instance) {
      AdvancedLazyLoader.instance = new AdvancedLazyLoader();
    }
    return AdvancedLazyLoader.instance;
  }

  configure(config: Partial<PredictiveLoadingConfig>): void {
    this.predictiveConfig = { ...this.predictiveConfig, ...config };
  }

  observeElement(element: Element, loadCallback: () => void): void {
    this.intersectionLoader.observe(element, loadCallback);
  }

  unobserveElement(element: Element): void {
    this.intersectionLoader.unobserve(element);
  }

  addToQueue(item: LoadingQueueItem): void {
    this.loadingQueue.add(item);
  }

  removeFromQueue(index: number): void {
    this.loadingQueue.remove(index);
  }

  predictiveLoad(viewport: ViewportInfo, itemCount: number, getLoadCallback: (index: number) => () => Promise<void>): void {
    if (!this.predictiveConfig.enabled || !viewport.isScrolling) return;

    const { velocityThreshold, maxPredictiveItems, adaptiveStrategy } = this.predictiveConfig;

    if (Math.abs(viewport.scrollVelocity) < velocityThreshold) return;

    const direction = viewport.scrollDirection;
    if (!direction) return;

    let predictiveItems: number[] = [];
    const baseCount = adaptiveStrategy
      ? Math.min(Math.ceil(Math.abs(viewport.scrollVelocity) / 200), maxPredictiveItems)
      : maxPredictiveItems;

    if (direction === 'forward') {
      for (let i = 1; i <= baseCount; i++) {
        const index = viewport.endIndex + i;
        if (index < itemCount) {
          predictiveItems.push(index);
        }
      }
    } else {
      for (let i = 1; i <= baseCount; i++) {
        const index = viewport.startIndex - i;
        if (index >= 0) {
          predictiveItems.push(index);
        }
      }
    }

    // Add predictive items to loading queue
    predictiveItems.forEach((index, i) => {
      this.addToQueue({
        index,
        priority: LoadingPriority.BACKGROUND,
        timestamp: Date.now(),
        retryCount: 0,
        estimatedSize: 1000, // Default estimate
        loadCallback: getLoadCallback(index),
      });
    });
  }

  getStats(): {
    intersectionLoader: { loaded: number; errors: number };
    loadingQueue: { queueLength: number; currentlyLoading: number; totalProcessed: number };
  } {
    return {
      intersectionLoader: {
        loaded: 0, // Would need to track this in IntersectionLazyLoader
        errors: 0,  // Would need to track this in IntersectionLazyLoader
      },
      loadingQueue: this.loadingQueue.getStats(),
    };
  }

  clear(): void {
    this.intersectionLoader.disconnect();
    this.loadingQueue.clear();
  }
}

/**
 * Gets the advanced lazy loader instance
 */
export function getAdvancedLazyLoader(): AdvancedLazyLoader {
  return AdvancedLazyLoader.getInstance();
}

/**
 * Predictive loading based on user behavior patterns
 */
export function predictiveItemLoading(
  viewport: ViewportInfo,
  userBehavior: {
    averageScrollSpeed: number;
    preferredScrollDirection: 'forward' | 'backward' | null;
    sessionDuration: number;
  },
  itemCount: number
): number[] {
  const itemsToPreload: number[] = [];

  if (!viewport.isScrolling) return itemsToPreload;

  // Adjust prediction based on user behavior
  const behaviorMultiplier = userBehavior.preferredScrollDirection === viewport.scrollDirection ? 1.5 : 1.0;
  const speedMultiplier = Math.min(userBehavior.averageScrollSpeed / 100, 2.0);
  const sessionMultiplier = Math.min(userBehavior.sessionDuration / 300000, 1.5); // 5 minutes

  const totalMultiplier = behaviorMultiplier * speedMultiplier * sessionMultiplier;
  const preloadCount = Math.ceil(5 * totalMultiplier);

  if (viewport.scrollDirection === 'forward') {
    for (let i = 1; i <= preloadCount; i++) {
      const index = viewport.endIndex + i;
      if (index < itemCount) {
        itemsToPreload.push(index);
      }
    }
  } else if (viewport.scrollDirection === 'backward') {
    for (let i = 1; i <= preloadCount; i++) {
      const index = viewport.startIndex - i;
      if (index >= 0) {
        itemsToPreload.push(index);
      }
    }
  }

  return itemsToPreload;
}

/**
 * Adaptive loading strategy based on device performance
 */
export function adaptiveLoadingStrategy(
  deviceMetrics: {
    memoryUsage: number;
    cpuUsage: number;
    networkSpeed: number;
    batteryLevel?: number;
  }
): {
  maxConcurrentLoads: number;
  priorityThreshold: LoadingPriority;
  enablePredictive: boolean;
} {
  let maxConcurrentLoads = 3;
  let priorityThreshold = LoadingPriority.MEDIUM;
  let enablePredictive = true;

  // Adjust based on memory usage
  if (deviceMetrics.memoryUsage > 0.8) {
    maxConcurrentLoads = 1;
    priorityThreshold = LoadingPriority.IMMEDIATE;
    enablePredictive = false;
  } else if (deviceMetrics.memoryUsage > 0.6) {
    maxConcurrentLoads = 2;
    priorityThreshold = LoadingPriority.HIGH;
  }

  // Adjust based on CPU usage
  if (deviceMetrics.cpuUsage > 0.8) {
    maxConcurrentLoads = Math.min(maxConcurrentLoads, 1);
    enablePredictive = false;
  }

  // Adjust based on network speed (in Mbps)
  if (deviceMetrics.networkSpeed < 1) {
    maxConcurrentLoads = Math.min(maxConcurrentLoads, 1);
    priorityThreshold = LoadingPriority.IMMEDIATE;
  }

  // Adjust based on battery level (if available)
  if (deviceMetrics.batteryLevel !== undefined && deviceMetrics.batteryLevel < 0.2) {
    maxConcurrentLoads = Math.min(maxConcurrentLoads, 1);
    enablePredictive = false;
  }

  return {
    maxConcurrentLoads,
    priorityThreshold,
    enablePredictive,
  };
}
