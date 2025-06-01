'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';
import { printFriendlyStyles } from '@/lib/utils/timeline-item-theme';

export interface TimelineItemSkeletonProps {
  style?: React.CSSProperties; // Required for react-window
  className?: string;
  itemType?: 'task' | 'goal' | 'habit' | 'event' | 'reminder' | 'note';
}

/**
 * A skeleton loader component for timeline items
 * Used as a placeholder while items are loading
 */
export function TimelineItemSkeleton({
  style,
  className,
  itemType = 'task'
}: TimelineItemSkeletonProps) {
  return (
    <div
      style={style}
      className={cn(
        'p-3 rounded-md mb-1 border-l-2 border-l-gray-300 bg-gray-100/50 animate-pulse',
        'dark:bg-gray-800/30 dark:border-l-gray-700',
        printFriendlyStyles.background,
        printFriendlyStyles.border,
        className
      )}
      data-testid="timeline-item-skeleton"
    >
      <div className="flex justify-between items-start">
        <div className="flex items-start gap-2">
          {/* Icon skeleton */}
          <Skeleton className="h-4 w-4 rounded-md flex-shrink-0 mt-0.5" />

          {/* Title skeleton */}
          <Skeleton className="h-4 w-[160px] rounded-md" />
        </div>

        <div className="flex items-center gap-1">
          {/* Badge skeletons */}
          <Skeleton className="h-4 w-[40px] rounded-full" />
          <Skeleton className="h-4 w-[40px] rounded-full" />
        </div>
      </div>

      {/* Description skeleton */}
      <Skeleton className="h-3 w-[250px] mt-2 rounded-md" />
    </div>
  );
}

export default React.memo(TimelineItemSkeleton);
