'use client';

import React, { useCallback, useMemo } from 'react';
import { cn } from '@/lib/utils';

interface DateHeaderProps {
  date: string;
  isSticky?: boolean;
  className?: string;
  onClick?: () => void;
  isActive?: boolean;
  count?: number;
  style?: React.CSSProperties;
  type?: 'day' | 'week' | 'month' | 'year';
  showBoundaryIndicator?: boolean;
}

/**
 * A reusable date header component for timeline sections
 */
const DateHeaderComponent = ({
  date,
  isSticky = true,
  className = '',
  onClick,
  isActive = false,
  count,
  style,
  type = 'day',
  showBoundaryIndicator = true
}: DateHeaderProps) => {
  // Determine the color and style based on the chunk type
  const getBoundaryColor = useMemo(() => {
    // Special case for "No Due Date" header
    if (date === 'No Due Date') {
      return 'bg-amber-500';
    }

    switch (type) {
      case 'day': return 'bg-blue-500';
      case 'week': return 'bg-green-500';
      case 'month': return 'bg-purple-500';
      case 'year': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  }, [date, type]);

  return (
    <div
      style={style}
      className={cn(
        "py-2 font-medium text-sm border-b flex justify-between items-center relative",
        isSticky && "sticky top-0 bg-background z-10",
        isActive && "bg-primary/5",
        onClick && "cursor-pointer hover:bg-muted/50 transition-colors",
        className
      )}
      onClick={onClick}
      data-testid="date-header"
    >
      {/* Boundary indicator */}
      {showBoundaryIndicator && (
        <div
          className={cn(
            "absolute left-0 top-0 bottom-0 w-1",
            getBoundaryColor
          )}
        />
      )}

      <span className="ml-2">{date}</span>

      <div className="flex items-center space-x-2">
        {/* Chunk type indicator */}
        <span className={cn(
          "text-xs px-1.5 py-0.5 rounded-sm text-white",
          getBoundaryColor
        )}>
          {type.charAt(0).toUpperCase() + type.slice(1)}
        </span>

        {/* Count badge */}
        {count !== undefined && (
          <span className="text-xs text-muted-foreground bg-muted px-2 py-0.5 rounded-full">
            {count}
          </span>
        )}
      </div>
    </div>
  );
}

export const DateHeader = React.memo(DateHeaderComponent);
export default React.memo(DateHeaderComponent);
