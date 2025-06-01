'use client';

import React, { useRef, useEffect } from 'react';
import { Task } from '@prisma/client';
import { taskHeightCache } from './TaskHeightCache';

interface TaskResizeObserverProps {
  task: Task;
  onResize?: (taskId: string, newHeight: number) => void;
  children: React.ReactNode;
}

/**
 * A component that observes changes in a task item's size and updates the cache
 */
export function TaskResizeObserver({ task, onResize, children }: TaskResizeObserverProps) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!ref.current) return;

    const element = ref.current;
    const currentTaskId = task.id;

    // Store previous height to avoid unnecessary updates
    let prevHeight = taskHeightCache.getHeight(currentTaskId);

    const resizeObserver = new ResizeObserver(entries => {
      for (const entry of entries) {
        const newHeight = Math.round(entry.contentRect.height);

        // Only update if height has actually changed
        if (newHeight !== prevHeight) {
          prevHeight = newHeight;

          // Update the cache with the new height
          taskHeightCache.setHeight(currentTaskId, newHeight);

          // Call the callback if provided
          if (onResize) {
            onResize(currentTaskId, newHeight);
          }
        }
      }
    });

    resizeObserver.observe(element);

    return () => {
      resizeObserver.unobserve(element);
    };
  }, [task.id, onResize]);

  return (
    <div ref={ref}>
      {children}
    </div>
  );
}
