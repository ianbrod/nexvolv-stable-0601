'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Skeleton } from '@/components/ui/skeleton';

export interface DateHeaderSkeletonProps {
  style?: React.CSSProperties; // Required for react-window
  className?: string;
}

/**
 * A skeleton loader component for date headers
 * Used as a placeholder while headers are loading
 */
export function DateHeaderSkeleton({ style, className }: DateHeaderSkeletonProps) {
  return (
    <div
      style={style}
      className={cn(
        'sticky top-0 bg-background z-10 py-2 font-medium text-sm border-b animate-pulse',
        className
      )}
      data-testid="date-header-skeleton"
    >
      <div className="flex justify-between items-center">
        <Skeleton className="h-4 w-[150px] rounded-md" />
        <Skeleton className="h-4 w-[40px] rounded-md" />
      </div>
    </div>
  );
}

export default React.memo(DateHeaderSkeleton);
