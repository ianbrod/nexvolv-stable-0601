'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TaskPlaceholderProps {
  style?: React.CSSProperties;
}

/**
 * A simplified placeholder component for task items during fast scrolling
 * This is a lightweight version of the SimpleTaskItem component
 * that renders much faster during scrolling operations
 */
export function TaskPlaceholder({ style }: TaskPlaceholderProps) {
  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 border rounded-md mb-2 shadow-sm",
        "border-l-4 border-l-gray-300 bg-gray-50 dark:border-l-gray-600 dark:bg-gray-800/30"
      )}
      style={style}
    >
      {/* Checkbox placeholder */}
      <div className="flex items-center gap-3 flex-grow">
        <div className="relative">
          <div className="h-5 w-5 rounded-sm border border-gray-300 bg-gray-100 dark:border-gray-600 dark:bg-gray-700/50" />
        </div>

        {/* Content placeholder */}
        <div className="flex flex-col w-full">
          {/* Title placeholder */}
          <div className="h-5 bg-gray-200 dark:bg-gray-700/50 rounded w-3/4 mb-2"></div>

          {/* Metadata placeholders */}
          <div className="flex items-center gap-2">
            <div className="h-4 bg-gray-200 dark:bg-gray-700/40 rounded w-16"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700/40 rounded w-20"></div>
            <div className="h-4 bg-gray-200 dark:bg-gray-700/40 rounded w-12"></div>
          </div>
        </div>
      </div>

      {/* Action button placeholder */}
      <div className="flex items-center">
        <div className="h-8 w-8 rounded-full bg-gray-200 dark:bg-gray-700/50"></div>
      </div>
    </div>
  );
}

export default React.memo(TaskPlaceholder);
