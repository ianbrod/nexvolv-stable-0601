'use client';

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { FixedSizeList, VariableSizeList, ListChildComponentProps, areEqual } from 'react-window';
import { Task } from '@/types';
import { TimelineItem } from './TimelineItem';
import { TimelineItemSkeleton } from './TimelineItemSkeleton';
import { TimelineErrorBoundary } from './TimelineErrorBoundary';
import { Card, CardContent, CardFooter } from '@/components/ui/card';
import { format } from 'date-fns';
import { calculateViewport, ViewportInfo, shouldLoadItem } from '@/lib/utils/lazy-loading';
import { Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { debounce, throttle } from 'lodash';
import {
  optimizeMemoryUsage,
  isTaskProxy,
  restoreTaskFromProxy,
  TaskProxy,
  calculateMemorySavings
} from '@/lib/utils/memory-optimization';

// Type for the cache of item heights
type ItemHeightCache = {
  [key: string]: number;
};

interface VirtualizedTimelineProps {
  tasks: Task[];
  height: number;
  width: number | string;
  itemHeight?: number;
  onTaskClick?: (task: Task) => void;
  variableHeight?: boolean;
  className?: string;
  groupByDate?: boolean;
  /** Whether to optimize memory usage for large lists */
  optimizeMemory?: boolean;
  /** Maximum number of items to keep in memory */
  maxItemsInMemory?: number;
  /** Number of items to keep before the viewport */
  itemsBeforeViewport?: number;
  /** Number of items to keep after the viewport */
  itemsAfterViewport?: number;
  /** Whether to use lightweight item proxies for off-screen items */
  useLightweightProxies?: boolean;
  /** Whether to show memory usage statistics */
  showMemoryStats?: boolean;
  /** Enable progressive loading for better UX */
  enableProgressiveLoading?: boolean;
  /** Overscan count for better scroll performance */
  overscanCount?: number;
  /** Enable intelligent preloading based on scroll patterns */
  enableIntelligentPreloading?: boolean;
}

/**
 * A wrapper component that provides virtualized rendering for timeline items
 * Supports both fixed and variable height items
 */
export function VirtualizedTimelineWrapper({
  tasks,
  height,
  width,
  itemHeight = 60,
  onTaskClick,
  variableHeight = false,
  className = '',
  groupByDate = false,
  optimizeMemory = false,
  maxItemsInMemory = 1000,
  itemsBeforeViewport = 100,
  itemsAfterViewport = 100,
  useLightweightProxies = true,
  showMemoryStats = false,
  enableProgressiveLoading = true,
  overscanCount = 5,
  enableIntelligentPreloading = true
}: VirtualizedTimelineProps) {
  // Ref for the list component
  const listRef = useRef<FixedSizeList | VariableSizeList>(null);

  // Cache for variable height items
  const [itemHeightCache] = useState<ItemHeightCache>({});

  // State for selected task
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // State for optimized tasks and memory statistics
  const [optimizedTasks, setOptimizedTasks] = useState<(Task | TaskProxy)[]>([]);
  const [memorySavings, setMemorySavings] = useState<number>(0);
  const [memoryUsage, setMemoryUsage] = useState<{ original: number, optimized: number }>({
    original: 0,
    optimized: 0
  });

  // State for progressive loading
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [isProgressiveLoading, setIsProgressiveLoading] = useState<boolean>(false);

  // State for scroll performance tracking
  const [scrollVelocity, setScrollVelocity] = useState<number>(0);
  const [lastScrollTime, setLastScrollTime] = useState<number>(0);
  const [lastScrollOffset, setLastScrollOffset] = useState<number>(0);

  // Group tasks by date if needed
  const groupedTasks = groupByDate
    ? groupTasksByDate(tasks)
    : { items: tasks, dateHeaders: [] };

  // Get all items (tasks + date headers if grouped)
  const allItems = groupByDate
    ? [...groupedTasks.dateHeaders, ...groupedTasks.items]
    : optimizeMemory && optimizedTasks.length > 0 ? optimizedTasks : tasks;

  // Function to determine if an item is a date header
  const isDateHeader = (index: number): boolean => {
    if (!groupByDate) return false;
    return groupedTasks.dateHeaders.includes(allItems[index]);
  };

  // Function to get item height (for variable height list)
  const getItemHeight = (index: number): number => {
    const item = allItems[index];
    const itemId = 'id' in item ? item.id : `header-${index}`;

    // Return cached height if available
    if (itemHeightCache[itemId]) {
      return itemHeightCache[itemId];
    }

    // Default heights
    if (isDateHeader(index)) {
      return 40; // Date headers are smaller
    }

    // Default task height based on content
    const task = item as Task;
    return task.description ? itemHeight + 20 : itemHeight;
  };

  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTaskId(task.id);
    if (onTaskClick) {
      onTaskClick(task);
    }
  }, [onTaskClick]);

  // Check if an item is loaded
  const isItemLoaded = useCallback((index: number): boolean => {
    return loadedItems.has(index) && !isLoading;
  }, [loadedItems, isLoading]);

  // Memoized row renderer for better performance
  const Row = React.memo(({ index, style }: ListChildComponentProps) => {
    const item = allItems[index];
    const loaded = isItemLoaded(index);

    // Show skeleton loader for items that are not yet loaded
    if (!loaded) {
      return <TimelineItemSkeleton style={style} />;
    }

    // Render date header
    if (isDateHeader(index)) {
      const dateStr = 'date' in item ? item.date : '';
      return (
        <div
          style={style}
          className="sticky top-0 bg-background z-10 py-2 font-medium text-sm border-b"
        >
          {dateStr}
        </div>
      );
    }

    // Handle task proxies
    if (isTaskProxy(item)) {
      // For proxies, we render a simplified version of the task
      // When clicked, we restore the full task data
      return (
        <TimelineItem
          task={item as any} // Pass the proxy with minimal data
          style={style}
          index={index}
          onClick={(proxy) => {
            // Restore the full task when clicked
            const fullTask = restoreTaskFromProxy(proxy as unknown as TaskProxy, tasks);
            handleTaskClick(fullTask);
          }}
          isSelected={item.id === selectedTaskId}
          isProxy={true}
        />
      );
    }

    // Render regular task item
    const task = item as Task;
    return (
      <TimelineItem
        task={task}
        style={style}
        index={index}
        onClick={handleTaskClick}
        isSelected={task.id === selectedTaskId}
      />
    );
  }, areEqual);

  Row.displayName = 'TimelineRow';

  // State for tracking scroll position and lazy loading
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const [scrollDirection, setScrollDirection] = useState<'forward' | 'backward' | null>(null);
  const [viewport, setViewport] = useState<ViewportInfo | null>(null);
  const [loadedItems, setLoadedItems] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Enhanced scroll handler with performance tracking
  const handleScroll = useCallback(({ scrollOffset, scrollDirection }: { scrollOffset: number, scrollDirection: 'forward' | 'backward' }) => {
    const currentTime = performance.now();

    // Calculate scroll velocity for performance optimization
    if (lastScrollTime > 0) {
      const timeDelta = currentTime - lastScrollTime;
      const offsetDelta = Math.abs(scrollOffset - lastScrollOffset);
      const velocity = timeDelta > 0 ? offsetDelta / timeDelta : 0;
      setScrollVelocity(velocity);
    }

    setLastScrollTime(currentTime);
    setLastScrollOffset(scrollOffset);

    // Store current scroll position
    setScrollOffset(scrollOffset);
    setScrollDirection(scrollDirection);

    // Store in sessionStorage for persistence between navigations
    try {
      sessionStorage.setItem('timelineScrollPosition', scrollOffset.toString());
    } catch (error) {
      console.error('Failed to save scroll position:', error);
    }
  }, [lastScrollTime, lastScrollOffset]);

  // Optimized viewport update with adaptive debouncing
  const updateViewport = useMemo(() => {
    // Use throttle for high-velocity scrolling, debounce for low-velocity
    const throttledUpdate = throttle((
      scrollOffset: number,
      scrollDirection: 'forward' | 'backward' | null,
      height: number,
      itemCount: number,
      getItemHeight: (index: number) => number
    ) => {
      const newViewport = calculateViewport(
        scrollOffset,
        scrollDirection,
        height,
        itemCount,
        getItemHeight,
        overscanCount,
        10 // loadingThreshold
      );

      setViewport(newViewport);

      // Intelligent preloading based on scroll direction and velocity
      const itemsToLoad = new Set<number>();
      const baseRange = enableIntelligentPreloading ? Math.ceil(scrollVelocity * 2) + 20 : 20;

      for (let i = 0; i < itemCount; i++) {
        if (shouldLoadItem(i, newViewport, baseRange)) {
          itemsToLoad.add(i);
        }
      }

      // Progressive loading for better UX
      if (enableProgressiveLoading && itemsToLoad.size > 50) {
        setIsProgressiveLoading(true);
        const sortedItems = Array.from(itemsToLoad).sort((a, b) => {
          // Prioritize items closer to viewport center
          const viewportCenter = (newViewport.visibleStartIndex + newViewport.visibleEndIndex) / 2;
          return Math.abs(a - viewportCenter) - Math.abs(b - viewportCenter);
        });

        // Load items in batches
        let loadedCount = 0;
        const batchSize = 10;
        const loadBatch = () => {
          const batch = sortedItems.slice(loadedCount, loadedCount + batchSize);
          setLoadedItems(prev => new Set([...prev, ...batch]));
          loadedCount += batchSize;
          setLoadingProgress(Math.min(loadedCount / sortedItems.length, 1));

          if (loadedCount < sortedItems.length) {
            requestAnimationFrame(loadBatch);
          } else {
            setIsProgressiveLoading(false);
            setLoadingProgress(0);
          }
        };
        loadBatch();
      } else {
        setLoadedItems(itemsToLoad);
      }
    }, scrollVelocity > 1 ? 16 : 100); // 16ms for high velocity, 100ms for low velocity

    return throttledUpdate;
  }, [overscanCount, enableIntelligentPreloading, scrollVelocity, enableProgressiveLoading]);

  // Restore scroll position on mount
  useEffect(() => {
    try {
      const savedPosition = sessionStorage.getItem('timelineScrollPosition');
      if (savedPosition && listRef.current) {
        const position = parseInt(savedPosition, 10);
        listRef.current.scrollTo(position);
      }
    } catch (error) {
      console.error('Failed to restore scroll position:', error);
    }
  }, []);

  // Reset list when tasks change, but preserve scroll position if appropriate
  useEffect(() => {
    if (listRef.current) {
      if (variableHeight && 'resetAfterIndex' in listRef.current) {
        // Reset all measurements
        listRef.current.resetAfterIndex(0);
      }
    }
  }, [tasks, variableHeight]);

  // Update viewport when scrolling or when items change
  useEffect(() => {
    if (allItems.length > 0) {
      const getItemHeightFn = (index: number) => {
        const item = allItems[index];
        const itemId = 'id' in item ? item.id : `header-${index}`;

        // Return cached height if available
        if (itemHeightCache[itemId]) {
          return itemHeightCache[itemId];
        }

        // Default heights
        if (isDateHeader(index)) {
          return 40; // Date headers are smaller
        }

        // Default task height based on content
        const task = item as Task;
        return task.description ? itemHeight + 20 : itemHeight;
      };

      const newViewport = calculateViewport(
        scrollOffset,
        scrollDirection,
        height,
        allItems.length,
        getItemHeightFn,
        5, // overscanCount
        10 // loadingThreshold
      );

      // Update viewport
      updateViewport(
        scrollOffset,
        scrollDirection,
        height,
        allItems.length,
        getItemHeightFn
      );

      // Apply memory optimization if enabled
      if (optimizeMemory && !groupByDate && tasks.length > maxItemsInMemory) {
        const optimized = optimizeMemoryUsage(
          tasks,
          newViewport.visibleStartIndex,
          newViewport.visibleEndIndex,
          {
            maxItemsInMemory,
            itemsBeforeViewport,
            itemsAfterViewport,
            useLightweightProxies
          }
        );

        // Calculate memory savings
        const savings = calculateMemorySavings(tasks, optimized);
        setMemorySavings(savings);

        // Update memory usage statistics
        const originalSize = tasks.length * 500; // Rough estimate
        const optimizedSize = originalSize - savings;
        setMemoryUsage({
          original: originalSize,
          optimized: optimizedSize
        });

        // Update optimized tasks
        setOptimizedTasks(optimized);
      } else if (optimizeMemory && tasks.length <= maxItemsInMemory) {
        // Reset optimized tasks if the task count is below the threshold
        setOptimizedTasks([]);
        setMemorySavings(0);
        setMemoryUsage({ original: 0, optimized: 0 });
      }
    }
  }, [
    scrollOffset,
    scrollDirection,
    allItems,
    tasks,
    height,
    itemHeight,
    itemHeightCache,
    isDateHeader,
    updateViewport,
    optimizeMemory,
    maxItemsInMemory,
    itemsBeforeViewport,
    itemsAfterViewport,
    useLightweightProxies,
    groupByDate
  ]);

  // Simulate loading items
  useEffect(() => {
    if (viewport && loadedItems.size > 0) {
      // In a real implementation, this would fetch data for the items that need to be loaded
      setIsLoading(true);

      // Simulate network delay
      const loadingTimeout = setTimeout(() => {
        setIsLoading(false);
      }, 500);

      return () => clearTimeout(loadingTimeout);
    }
  }, [viewport, loadedItems]);

  // If no tasks, show empty state
  if (tasks.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-4 text-center">
          <p className="text-muted-foreground">No tasks to display</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <TimelineErrorBoundary>
      <Card className={className}>
        <CardContent className="p-0 relative">
          {variableHeight ? (
            <VariableSizeList
              ref={listRef as React.RefObject<VariableSizeList>}
              height={height}
              width={width}
              itemCount={allItems.length}
              itemSize={getItemHeight}
              overscanCount={overscanCount}
              onScroll={handleScroll}
              initialScrollOffset={scrollOffset}
              useIsScrolling={enableProgressiveLoading}
            >
              {Row}
            </VariableSizeList>
          ) : (
            <FixedSizeList
              ref={listRef as React.RefObject<FixedSizeList>}
              height={height}
              width={width}
              itemCount={allItems.length}
              itemSize={itemHeight}
              overscanCount={overscanCount}
              onScroll={handleScroll}
              initialScrollOffset={scrollOffset}
              useIsScrolling={enableProgressiveLoading}
            >
              {Row}
            </FixedSizeList>
          )}

          {/* Enhanced loading indicator with progress */}
          {(isLoading || isProgressiveLoading) && (
            <div className="absolute bottom-4 right-4 bg-background/80 rounded-lg p-3 shadow-md">
              <div className="flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin text-primary" />
                <span className="text-xs text-muted-foreground">
                  {isProgressiveLoading ? `Loading ${Math.round(loadingProgress * 100)}%` : 'Loading...'}
                </span>
              </div>
              {isProgressiveLoading && (
                <div className="w-20 h-1 bg-gray-200 rounded-full mt-1">
                  <div
                    className="h-1 bg-primary rounded-full transition-all duration-300"
                    style={{ width: `${loadingProgress * 100}%` }}
                  />
                </div>
              )}
            </div>
          )}
        </CardContent>

        {/* Loading status footer */}
        {viewport && (
          <CardFooter className="py-2 px-4 text-xs text-muted-foreground border-t">
            <div className="flex justify-between w-full">
              <span>
                Viewing items {viewport.visibleStartIndex + 1}-{viewport.visibleEndIndex + 1} of {allItems.length}
              </span>
              <span>
                {isLoading ? 'Loading...' : 'All items loaded'}
              </span>
            </div>

            {/* Memory optimization stats */}
            {showMemoryStats && optimizeMemory && memorySavings > 0 && (
              <div className="flex justify-between w-full mt-1 pt-1 border-t border-gray-100">
                <span>
                  Memory optimization: {(memorySavings / 1024).toFixed(1)} KB saved
                </span>
                <span>
                  {optimizedTasks.filter(isTaskProxy).length} proxied items
                </span>
              </div>
            )}
          </CardFooter>
        )}
      </Card>
    </TimelineErrorBoundary>
  );
}

// Helper function to group tasks by date
function groupTasksByDate(tasks: Task[]) {
  const tasksByDate: { [key: string]: Task[] } = {};
  const dateHeaders: any[] = [];

  // Group tasks by date
  tasks.forEach(task => {
    if (task.dueDate) {
      const dateKey = format(new Date(task.dueDate), 'yyyy-MM-dd');
      const dateDisplay = format(new Date(task.dueDate), 'EEEE, MMMM d, yyyy');

      if (!tasksByDate[dateKey]) {
        tasksByDate[dateKey] = [];
        dateHeaders.push({ id: `header-${dateKey}`, date: dateDisplay });
      }

      tasksByDate[dateKey].push(task);
    }
  });

  // Flatten grouped tasks
  const items = Object.values(tasksByDate).flat();

  return { items, dateHeaders };
}

export default React.memo(VirtualizedTimelineWrapper);
