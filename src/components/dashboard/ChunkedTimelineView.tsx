'use client';

import React, { useState, useCallback, useMemo, useRef, useEffect } from 'react';
import { Task } from '@/types';
import { VariableSizeList, ListChildComponentProps } from 'react-window';
import { TimelineItem } from './TimelineItem';
import { DateHeader } from './DateHeader';
import { TimelineItemSkeleton } from './TimelineItemSkeleton';
import { DateHeaderSkeleton } from './DateHeaderSkeleton';
import { TimelineErrorBoundary } from './TimelineErrorBoundary';
import { chunkTimelineItemsByDate, ChunkingOptions, DateChunk, optimizedChunkTimelineItems } from '@/lib/utils/timeline-chunking';
import { getCachedChunks } from '@/lib/utils/chunk-cache';
import { calculateViewport, ViewportInfo, shouldLoadItem } from '@/lib/utils/lazy-loading';
import { Card, CardHeader, CardTitle, CardContent, CardFooter } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { ZoomIn, ZoomOut, Calendar, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { debounce, throttle } from 'lodash';

interface ChunkedTimelineViewProps {
  tasks: Task[];
  height?: number;
  width?: number | string;
  onTaskClick?: (task: Task) => void;
  className?: string;
  title?: string;
  initialChunkBy?: 'day' | 'week' | 'month' | 'year';
  showControls?: boolean;
  /** Enable adaptive chunk sizes based on performance */
  enableAdaptiveChunking?: boolean;
  /** Enable progressive chunk loading */
  enableProgressiveLoading?: boolean;
  /** Maximum number of chunks to load simultaneously */
  maxSimultaneousChunks?: number;
}

// Type for the cache of item heights
type ItemHeightCache = {
  [key: string]: number;
};

/**
 * A timeline view that chunks items by date
 */
export function ChunkedTimelineView({
  tasks,
  height = 400,
  width = '100%',
  onTaskClick,
  className = '',
  title = 'Timeline',
  initialChunkBy = 'day',
  showControls = true,
  enableAdaptiveChunking = true,
  enableProgressiveLoading = true,
  maxSimultaneousChunks = 5
}: ChunkedTimelineViewProps) {
  // State for chunking options
  const [chunkBy, setChunkBy] = useState<'day' | 'week' | 'month' | 'year'>(initialChunkBy);
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc');

  // State for selected task
  const [selectedTaskId, setSelectedTaskId] = useState<string | null>(null);

  // Ref for the list component
  const listRef = useRef<VariableSizeList>(null);

  // Cache for item heights
  const [itemHeightCache] = useState<ItemHeightCache>({});

  // Enhanced chunking with adaptive optimization
  const chunkedTimeline = useMemo(() => {
    const startTime = performance.now();

    const options: ChunkingOptions = {
      chunkBy,
      sortDirection,
      includeItemsWithoutDates: true,
      // Add adaptive chunking options
      ...(enableAdaptiveChunking && {
        deviceCapabilities: {
          deviceType: window.innerWidth < 768 ? 'mobile' : window.innerWidth < 1024 ? 'tablet' : 'desktop',
          totalMemory: (navigator as any).deviceMemory ? (navigator as any).deviceMemory * 1024 * 1024 * 1024 : undefined
        }
      })
    };

    // Use optimized chunking for better performance
    const result = enableAdaptiveChunking
      ? getCachedChunks(optimizedChunkTimelineItems, tasks, options)
      : getCachedChunks(chunkTimelineItemsByDate, tasks, options);

    const endTime = performance.now();
    setRenderTime(endTime - startTime);
    setLastChunkSize(result.chunks.length);

    return result;
  }, [tasks, chunkBy, sortDirection, enableAdaptiveChunking]);

  // Flatten chunks into a single array for rendering
  const flatItems = useMemo(() => {
    const items: (DateChunk | Task)[] = [];

    chunkedTimeline.chunks.forEach(chunk => {
      // Add the chunk header
      items.push(chunk);

      // Add the chunk items
      chunk.items.forEach(item => {
        items.push(item);
      });
    });

    return items;
  }, [chunkedTimeline]);

  // State for tracking scroll position
  const [scrollOffset, setScrollOffset] = useState<number>(0);
  const [scrollDirection, setScrollDirection] = useState<'forward' | 'backward' | null>(null);
  const [viewport, setViewport] = useState<ViewportInfo | null>(null);
  const [loadedItems, setLoadedItems] = useState<Set<number>>(new Set());
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Progressive loading state
  const [loadingProgress, setLoadingProgress] = useState<number>(0);
  const [loadedChunks, setLoadedChunks] = useState<Set<string>>(new Set());
  const [chunkLoadingQueue, setChunkLoadingQueue] = useState<string[]>([]);

  // Performance tracking
  const [renderTime, setRenderTime] = useState<number>(0);
  const [lastChunkSize, setLastChunkSize] = useState<number>(0);

  // Handle scroll events
  const handleScroll = useCallback(({ scrollOffset, scrollDirection }: { scrollOffset: number, scrollDirection: 'forward' | 'backward' }) => {
    // Store current scroll position
    setScrollOffset(scrollOffset);
    setScrollDirection(scrollDirection);

    // Store in sessionStorage for persistence between navigations
    try {
      // Use a unique key based on the view type to avoid conflicts
      sessionStorage.setItem('chunkedTimelineScrollPosition', scrollOffset.toString());
    } catch (error) {
      console.error('Failed to save scroll position:', error);
    }
  }, []);

  // Debounced function to update viewport and trigger loading
  const updateViewport = useMemo(() => debounce((
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
      5, // overscanCount
      10 // loadingThreshold
    );

    setViewport(newViewport);

    // Determine which items need to be loaded
    const itemsToLoad = new Set<number>();
    for (let i = 0; i < itemCount; i++) {
      if (shouldLoadItem(i, newViewport, 20)) {
        itemsToLoad.add(i);
      }
    }

    // Update loaded items
    setLoadedItems(itemsToLoad);

  }, 100), []);

  // Restore scroll position on mount
  useEffect(() => {
    try {
      const savedPosition = sessionStorage.getItem('chunkedTimelineScrollPosition');
      if (savedPosition && listRef.current) {
        const position = parseInt(savedPosition, 10);
        listRef.current.scrollTo(position);
      }
    } catch (error) {
      console.error('Failed to restore scroll position:', error);
    }
  }, []);

  // Reset list when chunking options change
  useEffect(() => {
    if (listRef.current) {
      listRef.current.resetAfterIndex(0);
    }
  }, [chunkBy, sortDirection]);

  // Function to determine if an item is a chunk header
  const isChunkHeader = useCallback((item: DateChunk | Task): item is DateChunk => {
    return 'chunks' in chunkedTimeline && 'label' in item;
  }, [chunkedTimeline]);

  // Function to get item height
  const getItemHeight = useCallback((index: number) => {
    const item = flatItems[index];

    // Headers have fixed height
    if (isChunkHeader(item)) {
      return 40; // Header height
    }

    // Use cached height for tasks if available
    const cachedHeight = itemHeightCache[`task-${item.id}`];
    if (cachedHeight) {
      return cachedHeight;
    }

    // Default task height
    return 60;
  }, [flatItems, isChunkHeader, itemHeightCache]);

  // Update viewport when scrolling or when items change
  useEffect(() => {
    if (flatItems.length > 0) {
      updateViewport(
        scrollOffset,
        scrollDirection,
        height,
        flatItems.length,
        getItemHeight
      );
    }
  }, [scrollOffset, scrollDirection, flatItems, height, getItemHeight, updateViewport]);

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



  // Handle task click
  const handleTaskClick = useCallback((task: Task) => {
    setSelectedTaskId(task.id);

    if (onTaskClick) {
      onTaskClick(task);
    }
  }, [onTaskClick]);

  // Handle chunk type change
  const handleChunkTypeChange = useCallback((value: string) => {
    setChunkBy(value as 'day' | 'week' | 'month' | 'year');
  }, []);

  // Handle sort direction change
  const handleSortDirectionChange = useCallback((value: string) => {
    setSortDirection(value as 'asc' | 'desc');
  }, []);

  // Check if an item is loaded
  const isItemLoaded = useCallback((index: number): boolean => {
    return loadedItems.has(index) && !isLoading;
  }, [loadedItems, isLoading]);

  // Row renderer
  const Row = useCallback(({ index, style }: ListChildComponentProps) => {
    const item = flatItems[index];
    const loaded = isItemLoaded(index);

    // Show skeleton loader for items that are not yet loaded
    if (!loaded) {
      if (isChunkHeader(item)) {
        return <DateHeaderSkeleton style={style} />;
      } else {
        return <TimelineItemSkeleton style={style} />;
      }
    }

    // Show actual content for loaded items
    if (isChunkHeader(item)) {
      return (
        <DateHeader
          date={item.label}
          style={style}
          count={item.items.length}
          type={item.type}
          showBoundaryIndicator={true}
        />
      );
    }

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
  }, [flatItems, isChunkHeader, handleTaskClick, selectedTaskId, isItemLoaded]);

  // If there are no tasks, show empty state
  if (tasks.length === 0) {
    return (
      <Card className={className}>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center justify-center h-[300px] text-muted-foreground">
          No tasks to display
        </CardContent>
      </Card>
    );
  }

  return (
    <TimelineErrorBoundary>
      <Card className={className}>
        <CardHeader className="pb-2">
          <div className="flex justify-between items-center">
            <CardTitle>{title}</CardTitle>

            {showControls && (
              <div className="flex space-x-2">
                {/* Zoom controls */}
                <div className="flex border rounded-md overflow-hidden">
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none"
                    onClick={() => {
                      // Zoom out (larger chunks)
                      const chunkTypes: ('day' | 'week' | 'month' | 'year')[] = ['day', 'week', 'month', 'year'];
                      const currentIndex = chunkTypes.indexOf(chunkBy);
                      if (currentIndex < chunkTypes.length - 1) {
                        setChunkBy(chunkTypes[currentIndex + 1]);
                      }
                    }}
                    disabled={chunkBy === 'year'}
                  >
                    <ZoomOut className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none border-l border-r"
                    onClick={() => {
                      // Reset to day view
                      setChunkBy('day');
                    }}
                  >
                    <Calendar className="h-4 w-4" />
                  </Button>

                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-none"
                    onClick={() => {
                      // Zoom in (smaller chunks)
                      const chunkTypes: ('day' | 'week' | 'month' | 'year')[] = ['day', 'week', 'month', 'year'];
                      const currentIndex = chunkTypes.indexOf(chunkBy);
                      if (currentIndex > 0) {
                        setChunkBy(chunkTypes[currentIndex - 1]);
                      }
                    }}
                    disabled={chunkBy === 'day'}
                  >
                    <ZoomIn className="h-4 w-4" />
                  </Button>
                </div>

                <Select value={chunkBy} onValueChange={handleChunkTypeChange}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue placeholder="Group by" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="day">By Day</SelectItem>
                    <SelectItem value="week">By Week</SelectItem>
                    <SelectItem value="month">By Month</SelectItem>
                    <SelectItem value="year">By Year</SelectItem>
                  </SelectContent>
                </Select>

                <Select value={sortDirection} onValueChange={handleSortDirectionChange}>
                  <SelectTrigger className="w-[120px] h-8">
                    <SelectValue placeholder="Sort" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="asc">Ascending</SelectItem>
                    <SelectItem value="desc">Descending</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </CardHeader>

        <CardContent className={cn("p-0", flatItems.length === 0 && "flex items-center justify-center h-[300px]")}>
          {flatItems.length === 0 ? (
            <div className="text-muted-foreground">No tasks to display</div>
          ) : (
            <>
              <VariableSizeList
                ref={listRef}
                height={height}
                width={width}
                itemCount={flatItems.length}
                itemSize={getItemHeight}
                overscanCount={5}
                className="p-4"
                onScroll={handleScroll}
                initialScrollOffset={scrollOffset}
              >
                {Row}
              </VariableSizeList>

              {/* Loading indicator */}
              {isLoading && (
                <div className="absolute bottom-4 right-4 bg-background/80 rounded-full p-2 shadow-md">
                  <Loader2 className="h-5 w-5 animate-spin text-primary" />
                </div>
              )}
            </>
          )}
        </CardContent>

        {/* Loading status footer */}
        {viewport && (
          <CardFooter className="py-2 px-4 text-xs text-muted-foreground border-t">
            <div className="flex justify-between w-full">
              <span>
                Viewing items {viewport.visibleStartIndex + 1}-{viewport.visibleEndIndex + 1} of {flatItems.length}
              </span>
              <span>
                {isLoading ? 'Loading...' : 'All items loaded'}
              </span>
            </div>
          </CardFooter>
        )}
      </Card>
    </TimelineErrorBoundary>
  );
}

export default React.memo(ChunkedTimelineView);
