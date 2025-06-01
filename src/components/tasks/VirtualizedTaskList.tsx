'use client';

import React, { useRef, useState, useEffect, useCallback, useMemo } from 'react';
import { FixedSizeList as FixedList, VariableSizeList as VariableList } from 'react-window';
import { Task, Goal, TaskStatus } from '@prisma/client';
import { SimpleTaskItem } from './SimpleTaskItem';
import { TaskPlaceholder } from './TaskPlaceholder';
import { Checkbox } from '@/components/ui/checkbox';
import { taskHeightCache } from './TaskHeightCache';
import { BatchTaskMeasurer } from './TaskMeasurer';
import { TaskResizeObserver } from './TaskResizeObserver';
import { useScrollPositionStore } from '@/stores/scrollPositionStore';
import { throttle, debounce } from 'lodash';

// Define the props for the row renderer
interface TaskRowProps {
  index: number;
  style: React.CSSProperties;
  isScrolling?: boolean;
  data: {
    tasks: Task[];
    isSelectMode: boolean;
    selectedTasks: Set<string>;
    onTaskSelect: (taskId: string, isSelected: boolean) => void;
    getGoalName: (goalId: string | null) => string | null;
    onEdit: (task: Task) => void;
    onDelete: (taskId: string) => void;
    onTaskClick?: (task: Task) => void;
    onTaskResize?: (taskId: string, newHeight: number) => void;
    useScrollingPlaceholder?: boolean;
    scrollingPlaceholderDelay?: number;
    scrollingIntensity?: number;
    intensityThreshold?: number;
    selectedTaskId?: string | null;
  };
}

// Row renderer component for the virtualized list
const TaskRow = React.memo(({ index, style, isScrolling, data }: TaskRowProps) => {
  const {
    tasks,
    isSelectMode,
    selectedTasks,
    onTaskSelect,
    getGoalName,
    onEdit,
    onDelete,
    onTaskClick,
    onTaskResize,
    useScrollingPlaceholder = false, // Default to NOT using the placeholder during scrolling (less annoying)
    scrollingPlaceholderDelay = 500, // Default delay before showing placeholder (in ms) - longer delay
    scrollingIntensity = 0, // Scrolling intensity (0-100)
    intensityThreshold = 90, // Only show placeholders above this intensity (0-100) - much higher threshold
    selectedTaskId
  } = data;

  const task = tasks[index];
  const rowRef = useRef<HTMLDivElement>(null);
  const [showPlaceholder, setShowPlaceholder] = useState(false);

  // Use effect to delay showing the placeholder and only show it during intense scrolling
  useEffect(() => {
    let timeoutId: NodeJS.Timeout;

    // Only show placeholder if scrolling, placeholders are enabled, and scrolling is intense enough
    if (isScrolling && useScrollingPlaceholder && scrollingIntensity > intensityThreshold) {
      // Set a timeout to show the placeholder after the delay
      timeoutId = setTimeout(() => {
        setShowPlaceholder(true);
      }, scrollingPlaceholderDelay);
    } else {
      // Immediately hide the placeholder when not scrolling or scrolling gently
      setShowPlaceholder(false);
    }

    // Clean up the timeout when the component unmounts or when isScrolling changes
    return () => {
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
    };
  }, [isScrolling, useScrollingPlaceholder, scrollingPlaceholderDelay, scrollingIntensity, intensityThreshold]);

  // Handle resize events from the TaskResizeObserver
  const handleResize = useCallback((taskId: string, newHeight: number) => {
    if (onTaskResize) {
      onTaskResize(taskId, newHeight);
    }
  }, [onTaskResize]);

  // Memoize the checkbox change handler with shift-click support
  const handleCheckboxClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const isShiftClick = e.shiftKey;
    const isCurrentlySelected = selectedTasks.has(task.id);
    onTaskSelect(task.id, !isCurrentlySelected, isShiftClick);
  }, [task.id, onTaskSelect, selectedTasks]);

  // Handle mouse down to prevent text selection during shift-click
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    // Prevent text selection when shift-clicking
    if (e.shiftKey) {
      e.preventDefault();
    }
  }, []);

  // Handle keyboard navigation
  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    switch (e.key) {
      case 'Enter':
      case ' ':
        e.preventDefault();
        if (onTaskClick) {
          onTaskClick(task);
        }
        break;
    }
  }, [task, onTaskClick]);

  // Show placeholder during scrolling if enabled and delay has passed
  if (showPlaceholder) {
    return (
      <div
        style={style}
        className="px-2"
        role="listitem"
      >
        <TaskPlaceholder />
      </div>
    );
  }

  return (
    <div
      ref={rowRef}
      style={style}
      className="px-2"
      data-task-id={task.id}
      tabIndex={0}
      role="listitem"
      aria-label={`Task: ${task.name}`}
      onKeyDown={handleKeyDown}
    >
      <div className="flex items-start gap-2">
        {/* Selection checkbox - only visible in select mode */}
        {isSelectMode && (
          <div
            onClick={handleCheckboxClick}
            onMouseDown={handleMouseDown}
            className="mt-4 cursor-pointer"
          >
            <Checkbox
              checked={selectedTasks.has(task.id)}
              onCheckedChange={() => {
                // This will be handled by the onClick above
              }}
              className="pointer-events-none"
            />
          </div>
        )}

        {/* Task Item */}
        <div className={isSelectMode ? 'flex-grow' : 'w-full'}>
          <SimpleTaskItem
            task={task}
            goalName={getGoalName(task.goalId)}
            onEdit={onEdit}
            onDelete={onDelete}
            onClick={onTaskClick}
            isSelected={selectedTaskId === task.id}
          />
        </div>
      </div>
    </div>
  );
});

// Props for the VirtualizedTaskList component
interface VirtualizedTaskListProps {
  tasks: Task[];
  isSelectMode: boolean;
  selectedTasks: Set<string>;
  onTaskSelect: (taskId: string, isSelected: boolean, isShiftClick?: boolean) => void;
  getGoalName: (goalId: string | null) => string | null;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onTaskClick?: (task: Task) => void;
  height?: number | string; // Allow percentage string for height
  width?: number | string;
  itemSize?: number;
  className?: string;
  useVariableHeights?: boolean;
  overscanCount?: number;
  useScrollingPlaceholder?: boolean; // Whether to use placeholder during scrolling
  scrollingPlaceholderDelay?: number; // Delay before showing placeholder during scrolling (in ms)
  intensityThreshold?: number; // Threshold for scrolling intensity (0-100)
  selectedTaskId?: string | null; // ID of the currently selected task for glow effect
  /** Enable windowing optimization for better scroll performance */
  enableWindowingOptimization?: boolean;
  /** Enable intelligent preloading based on scroll direction */
  enableIntelligentPreloading?: boolean;
  /** Buffer size for preloading items */
  preloadBuffer?: number;
}

export function VirtualizedTaskList({
  tasks,
  isSelectMode,
  selectedTasks,
  onTaskSelect,
  getGoalName,
  onEdit,
  onDelete,
  onTaskClick,
  height = 500, // Default height if not provided
  width = '100%',
  itemSize = 85, // Default height for each task item (reduced for tighter spacing)
  className = '',
  useVariableHeights = true, // Default to using variable heights
  overscanCount = 5, // Default overscan count
  useScrollingPlaceholder = false, // Default to NOT using placeholder during scrolling (less annoying)
  scrollingPlaceholderDelay = 500, // Default delay before showing placeholder (in ms) - longer delay
  intensityThreshold = 90, // Default threshold for scrolling intensity (0-100, higher = less frequent)
  selectedTaskId,
  enableWindowingOptimization = true,
  enableIntelligentPreloading = true,
  preloadBuffer = 10,
}: VirtualizedTaskListProps) {
  // Use different refs for fixed and variable size lists
  const fixedListRef = useRef<FixedList>(null);
  const variableListRef = useRef<VariableList>(null);
  const [listHeight, setListHeight] = useState(height);
  const [containerWidth, setContainerWidth] = useState<number | string>(width);
  const containerRef = useRef<HTMLDivElement>(null);

  // State to track if measurements are complete
  const [measurementsComplete, setMeasurementsComplete] = useState(!useVariableHeights);

  // Get scroll position store functions
  const { saveScrollPosition, getScrollPosition } = useScrollPositionStore();

  // Track if initial scroll position has been restored
  const [hasRestoredScroll, setHasRestoredScroll] = useState(false);

  // Track scrolling intensity (0-100)
  const [scrollingIntensity, setScrollingIntensity] = useState(0);
  const consecutiveScrollsRef = useRef(0);
  const scrollTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Performance tracking state
  const [scrollDirection, setScrollDirection] = useState<'up' | 'down' | null>(null);
  const [lastScrollOffset, setLastScrollOffset] = useState(0);
  const [preloadedItems, setPreloadedItems] = useState<Set<number>>(new Set());

  // Windowing optimization state
  const [visibleRange, setVisibleRange] = useState<{ start: number; end: number }>({ start: 0, end: 0 });

  // Optimized function to get item size with caching
  const getItemSize = useCallback((index: number) => {
    const task = tasks[index];
    if (!task) return itemSize;

    // Use cached height if available, otherwise estimate
    const cachedHeight = taskHeightCache.getHeight(task.id, task);
    return cachedHeight;
  }, [tasks, itemSize]);

  // Memoized visible tasks for better performance
  const visibleTasks = useMemo(() => {
    if (!enableWindowingOptimization) return tasks;

    const { start, end } = visibleRange;
    const buffer = preloadBuffer;
    const startIndex = Math.max(0, start - buffer);
    const endIndex = Math.min(tasks.length - 1, end + buffer);

    return tasks.slice(startIndex, endIndex + 1);
  }, [tasks, visibleRange, enableWindowingOptimization, preloadBuffer]);

  // Reset list when tasks change
  useEffect(() => {
    if (variableListRef.current) {
      variableListRef.current.resetAfterIndex(0);
    }
  }, [tasks]);

  // Update container width based on parent element
  useEffect(() => {
    if (containerRef.current && width === '100%') {
      const resizeObserver = new ResizeObserver(entries => {
        for (let entry of entries) {
          setContainerWidth(entry.contentRect.width);
        }
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        if (containerRef.current) {
          resizeObserver.unobserve(containerRef.current);
        }
      };
    }
  }, [width]);

  // Calculate the height based on the container and number of tasks
  useEffect(() => {
    // Use the container's height if available
    if (containerRef.current) {
      const updateHeight = () => {
        if (containerRef.current) {
          // Get the container height
          const containerHeight = containerRef.current.clientHeight;

          // For variable heights, we use a different approach to calculate total height
          if (useVariableHeights) {
            // Calculate an estimated height based on available measurements
            let totalHeight = 0;
            for (let i = 0; i < tasks.length; i++) {
              totalHeight += getItemSize(i);
            }

            // Limit to the maximum height
            const calculatedHeight = Math.min(totalHeight, containerHeight || height || 500);
            setListHeight(calculatedHeight);
          } else {
            // For fixed heights, use the simple calculation
            const calculatedHeight = Math.min(tasks.length * itemSize, containerHeight || height || 500);
            setListHeight(calculatedHeight);
          }
        }
      };

      // Initial update
      updateHeight();

      // Create a ResizeObserver to update height when container size changes
      const resizeObserver = new ResizeObserver(() => {
        updateHeight();
      });

      resizeObserver.observe(containerRef.current);

      return () => {
        if (containerRef.current) {
          resizeObserver.unobserve(containerRef.current);
        }
      };
    } else {
      // Fallback if container ref is not available
      // For variable heights, we use a different approach to calculate total height
      if (useVariableHeights) {
        // Calculate an estimated height based on available measurements
        let totalHeight = 0;
        for (let i = 0; i < tasks.length; i++) {
          totalHeight += getItemSize(i);
        }

        // Limit to the maximum height
        const calculatedHeight = Math.min(totalHeight, typeof height === 'number' ? height : 500);
        setListHeight(calculatedHeight);
      } else {
        // For fixed heights, use the simple calculation
        const calculatedHeight = Math.min(tasks.length * itemSize,
                                        typeof height === 'number' ? height : 500);
        setListHeight(calculatedHeight);
      }
    }
  }, [tasks, height, itemSize, useVariableHeights, getItemSize, measurementsComplete]);

  // Handle completion of measurements
  const handleMeasurementsComplete = useCallback(() => {
    setMeasurementsComplete(true);
    // Reset the list to use the new measurements
    if (variableListRef.current) {
      variableListRef.current.resetAfterIndex(0);
    }
  }, []);

  // If there are no tasks, show a message
  if (tasks.length === 0) {
    return null;
  }

  // Handle task resize events
  const handleTaskResize = useCallback((taskId: string, newHeight: number) => {
    // The height is already updated in the cache by TaskResizeObserver
    // We just need to reset the list to use the new measurements

    // Reset the list to recalculate sizes
    if (variableListRef.current) {
      // Find the index of the task
      const taskIndex = tasks.findIndex(task => task.id === taskId);
      if (taskIndex !== -1) {
        // Use requestAnimationFrame to avoid too many updates in a single frame
        requestAnimationFrame(() => {
          if (variableListRef.current) {
            variableListRef.current.resetAfterIndex(taskIndex);
          }
        });
      }
    }
  }, [tasks]);

  // Enhanced scroll handler with performance optimizations
  const handleScroll = useCallback(({ scrollOffset }: { scrollOffset: number }) => {
    // Save the current scroll position to the store
    saveScrollPosition('taskList', scrollOffset);

    // Track scroll direction for intelligent preloading
    const direction = scrollOffset > lastScrollOffset ? 'down' : 'up';
    setScrollDirection(direction);
    setLastScrollOffset(scrollOffset);

    // Calculate visible range for windowing optimization
    if (enableWindowingOptimization) {
      const itemHeight = useVariableHeights ? 85 : itemSize; // Estimate
      const containerHeight = typeof height === 'number' ? height : 500;
      const startIndex = Math.floor(scrollOffset / itemHeight);
      const endIndex = Math.min(
        tasks.length - 1,
        startIndex + Math.ceil(containerHeight / itemHeight)
      );

      setVisibleRange({ start: startIndex, end: endIndex });
    }

    // Intelligent preloading based on scroll direction
    if (enableIntelligentPreloading) {
      const preloadRange = direction === 'down'
        ? { start: visibleRange.end, end: Math.min(tasks.length - 1, visibleRange.end + preloadBuffer) }
        : { start: Math.max(0, visibleRange.start - preloadBuffer), end: visibleRange.start };

      const newPreloadedItems = new Set(preloadedItems);
      for (let i = preloadRange.start; i <= preloadRange.end; i++) {
        newPreloadedItems.add(i);
      }
      setPreloadedItems(newPreloadedItems);
    }

    // Increment consecutive scrolls counter
    consecutiveScrollsRef.current += 1;

    // Calculate scrolling intensity based on consecutive scroll events
    const newIntensity = Math.min(consecutiveScrollsRef.current * 10, 100);
    setScrollingIntensity(newIntensity);

    // Clear any existing timer
    if (scrollTimerRef.current) {
      clearTimeout(scrollTimerRef.current);
    }

    // Set a timer to decrease intensity when scrolling slows or stops
    scrollTimerRef.current = setTimeout(() => {
      consecutiveScrollsRef.current = 0;
      setScrollingIntensity(0);
    }, 150);

  }, [
    saveScrollPosition,
    lastScrollOffset,
    enableWindowingOptimization,
    enableIntelligentPreloading,
    useVariableHeights,
    itemSize,
    height,
    tasks.length,
    visibleRange,
    preloadBuffer,
    preloadedItems
  ]);

  // Restore scroll position when component mounts or tasks change
  useEffect(() => {
    // Only restore scroll if we haven't already and measurements are complete
    if (!hasRestoredScroll && measurementsComplete && tasks.length > 0) {
      // Use a longer timeout to ensure the list has fully rendered
      setTimeout(() => {
        const savedScrollPosition = getScrollPosition('taskList');

        // Only scroll if there's a saved position
        if (savedScrollPosition > 0) {
          if (useVariableHeights && variableListRef.current) {
            variableListRef.current.scrollTo(savedScrollPosition);

            // Double-check the scroll position after a short delay
            setTimeout(() => {
              if (variableListRef.current) {
                variableListRef.current.scrollTo(savedScrollPosition);
              }
            }, 50);
          } else if (fixedListRef.current) {
            fixedListRef.current.scrollTo(savedScrollPosition);

            // Double-check the scroll position after a short delay
            setTimeout(() => {
              if (fixedListRef.current) {
                fixedListRef.current.scrollTo(savedScrollPosition);
              }
            }, 50);
          }
        }

        // Mark that we've restored the scroll position
        setHasRestoredScroll(true);
      }, 200);
    }
  }, [hasRestoredScroll, measurementsComplete, tasks, getScrollPosition, useVariableHeights]);

  // Handle keyboard navigation for the virtualized list
  const handleListKeyDown = useCallback((e: React.KeyboardEvent) => {
    // Find all focusable task items
    const taskElements = document.querySelectorAll('[data-task-id]');
    if (!taskElements.length) return;

    // Find the currently focused element
    const focusedElement = document.activeElement;
    const focusedIndex = Array.from(taskElements).findIndex(el => el === focusedElement);

    // If no element is focused, focus the first one
    if (focusedIndex === -1 && taskElements.length > 0) {
      (taskElements[0] as HTMLElement).focus();
      return;
    }

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault();
        if (focusedIndex < taskElements.length - 1) {
          // Get the next task index
          const nextIndex = focusedIndex + 1;

          // Ensure the item is in view before focusing
          if (useVariableHeights && variableListRef.current) {
            variableListRef.current.scrollToItem(nextIndex, 'center');
          } else if (fixedListRef.current) {
            fixedListRef.current.scrollToItem(nextIndex, 'center');
          }

          // Use setTimeout to allow the scroll to complete before focusing
          setTimeout(() => {
            (taskElements[nextIndex] as HTMLElement).focus();
          }, 50);
        }
        break;
      case 'ArrowUp':
        e.preventDefault();
        if (focusedIndex > 0) {
          // Get the previous task index
          const prevIndex = focusedIndex - 1;

          // Ensure the item is in view before focusing
          if (useVariableHeights && variableListRef.current) {
            variableListRef.current.scrollToItem(prevIndex, 'center');
          } else if (fixedListRef.current) {
            fixedListRef.current.scrollToItem(prevIndex, 'center');
          }

          // Use setTimeout to allow the scroll to complete before focusing
          setTimeout(() => {
            (taskElements[prevIndex] as HTMLElement).focus();
          }, 50);
        }
        break;
      case 'Home':
        e.preventDefault();
        if (taskElements.length > 0) {
          // Scroll to the top
          if (useVariableHeights && variableListRef.current) {
            variableListRef.current.scrollToItem(0, 'start');
          } else if (fixedListRef.current) {
            fixedListRef.current.scrollToItem(0, 'start');
          }

          // Use setTimeout to allow the scroll to complete before focusing
          setTimeout(() => {
            (taskElements[0] as HTMLElement).focus();
          }, 50);
        }
        break;
      case 'End':
        e.preventDefault();
        if (taskElements.length > 0) {
          const lastIndex = taskElements.length - 1;

          // Scroll to the bottom
          if (useVariableHeights && variableListRef.current) {
            variableListRef.current.scrollToItem(lastIndex, 'end');
          } else if (fixedListRef.current) {
            fixedListRef.current.scrollToItem(lastIndex, 'end');
          }

          // Use setTimeout to allow the scroll to complete before focusing
          setTimeout(() => {
            (taskElements[lastIndex] as HTMLElement).focus();
          }, 50);
        }
        break;
    }
  }, [useVariableHeights]);

  // Common props for both list types
  const commonProps = {
    height: listHeight,
    width: containerWidth,
    itemCount: tasks.length,
    overscanCount: overscanCount,
    onScroll: handleScroll,
    useIsScrolling: useScrollingPlaceholder, // Enable isScrolling detection
    itemData: {
      tasks,
      isSelectMode,
      selectedTasks,
      onTaskSelect,
      getGoalName,
      onEdit,
      onDelete,
      onTaskClick,
      onTaskResize: handleTaskResize,
      useScrollingPlaceholder,
      scrollingPlaceholderDelay,
      scrollingIntensity,
      intensityThreshold,
      selectedTaskId
    }
  };

  return (
    <div
      ref={containerRef}
      className={className}
      onKeyDown={handleListKeyDown}
      tabIndex={-1}
      role="list"
      aria-label="Task list"
    >
      {/* Batch measure tasks if using variable heights and measurements aren't complete */}
      {useVariableHeights && !measurementsComplete && (
        <BatchTaskMeasurer
          tasks={tasks}
          getGoalName={getGoalName}
          onAllMeasurementsComplete={handleMeasurementsComplete}
        />
      )}

      {/* Render either a variable or fixed size list based on the prop */}
      {useVariableHeights ? (
        <VariableList
          ref={variableListRef}
          itemSize={getItemSize}
          {...commonProps}
        >
          {TaskRow}
        </VariableList>
      ) : (
        <FixedList
          ref={fixedListRef}
          itemSize={itemSize}
          {...commonProps}
        >
          {TaskRow}
        </FixedList>
      )}
    </div>
  );
}
