'use client';

import React, { forwardRef, memo, useState, useCallback, useMemo } from 'react';
import { Task } from '@/types';
import { cn } from '@/lib/utils';
import { format, isPast } from 'date-fns';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp } from 'lucide-react';
import {
  timelineItemTypeStyles,
  timelineItemStateBadges,
  priorityBorderStyles,
  printFriendlyStyles,
  TimelineItemState
} from '@/lib/utils/timeline-item-theme';

export interface TimelineItemProps {
  task: Task;
  style?: React.CSSProperties; // Required for react-window
  index?: number; // Required for react-window
  onClick?: (task: Task) => void;
  isSelected?: boolean;
  className?: string;
  isProxy?: boolean; // Whether this is a lightweight proxy
}

/**
 * A standardized timeline item component for use with virtualized lists
 * Optimized for consistent rendering and performance
 */
export const TimelineItem = memo(forwardRef<HTMLDivElement, TimelineItemProps>(
  ({ task, style, index, onClick, isSelected, className, isProxy }, ref) => {
    // State for expanded view
    const [isExpanded, setIsExpanded] = useState(false);

    // Determine item type (default to 'task')
    const itemType = 'task';
    const typeStyles = timelineItemTypeStyles[itemType];

    // Memoized item state calculation
    const itemState = useMemo((): TimelineItemState => {
      if (task.status === 'COMPLETED') return 'completed';
      if (task.status === 'ARCHIVED') return 'archived';
      if (task.status === 'IN_PROGRESS') return 'inProgress';
      if (task.dueDate && isPast(new Date(task.dueDate)) && task.status !== 'COMPLETED') return 'overdue';
      if (task.recurrencePattern && task.recurrencePattern !== 'NONE') return 'recurring';
      return 'default';
    }, [task.status, task.dueDate, task.recurrencePattern]);

    const stateBadge = timelineItemStateBadges[itemState];

    // Memoized formatted due date
    const formattedDueDate = useMemo(() => {
      return task.dueDate
        ? format(new Date(task.dueDate), 'MMM d, yyyy')
        : 'No due date';
    }, [task.dueDate]);

    // Memoized event handlers
    const handleClick = useCallback(() => {
      if (onClick) {
        onClick(task);
      }
    }, [onClick, task]);

    // Toggle expanded state
    const toggleExpanded = useCallback((e: React.MouseEvent) => {
      e.stopPropagation();
      setIsExpanded(!isExpanded);
    }, [isExpanded]);

    // Memoized derived values
    const isProxyItem = useMemo(() => isProxy === true, [isProxy]);
    const hasStateBadge = useMemo(() => itemState !== 'default', [itemState]);
    const ItemIcon = useMemo(() => typeStyles.icon, [typeStyles.icon]);

    return (
      <TooltipProvider>
        <div
          ref={ref}
          style={style} // Required for react-window
          className={cn(
            'p-3 rounded-md mb-1 cursor-pointer transition-all',
            // Apply type-based styling
            typeStyles.background,
            typeStyles.text,
            typeStyles.border,
            typeStyles.hoverBackground,
            // Dark mode variants
            typeStyles.darkBackground,
            typeStyles.darkText,
            typeStyles.darkBorder,
            typeStyles.darkHoverBackground,
            // Priority border styling
            priorityBorderStyles[task.priority as keyof typeof priorityBorderStyles] || '',
            // Selection styling
            isSelected && 'ring-2 ring-primary',
            // Proxy styling
            isProxyItem && 'opacity-90 hover:opacity-100',
            // Completed item styling
            task.status === 'COMPLETED' && 'line-through opacity-75',
            // Expanded state
            isExpanded && 'shadow-md',
            // Print-friendly styles
            printFriendlyStyles.background,
            printFriendlyStyles.text,
            printFriendlyStyles.border,
            // Focus state for accessibility
            'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
            typeStyles.focusRing,
            typeStyles.darkFocusRing,
            // Animation for state changes
            'transition-all duration-200',
            className
          )}
          onClick={handleClick}
          data-testid={`timeline-item-${task.id}`}
          tabIndex={0}
          role="button"
          aria-expanded={isExpanded}
        >
          <div className="flex justify-between items-start">
            <div className="flex items-start gap-2">
              {/* Item type icon */}
              <div className={cn(
                "flex-shrink-0 mt-0.5",
                typeStyles.iconColor,
                typeStyles.darkIconColor,
                printFriendlyStyles.icon
              )}>
                <ItemIcon className="h-4 w-4" />
              </div>

              <Tooltip>
                <TooltipTrigger asChild>
                  <h4 className="text-sm font-medium truncate max-w-[160px]">
                    {task.name}
                    {isProxyItem && <span className="text-xs text-muted-foreground ml-1">[proxy]</span>}
                  </h4>
                </TooltipTrigger>
                <TooltipContent>
                  <p>{task.name}</p>
                  <p className="text-xs text-muted-foreground">{formattedDueDate}</p>
                  {isProxyItem ? (
                    <p className="text-xs mt-1 text-blue-500">Click to load full task details</p>
                  ) : (
                    task.description && <p className="text-xs mt-1">{task.description}</p>
                  )}
                </TooltipContent>
              </Tooltip>
            </div>

            <div className="flex items-center gap-1">
              {/* State badge if applicable */}
              {hasStateBadge && (
                <Badge
                  className={cn(
                    "text-[10px] px-1 py-0 h-4",
                    stateBadge.background,
                    stateBadge.textColor,
                    "dark:" + stateBadge.darkBackground,
                    "dark:" + stateBadge.darkTextColor,
                    "print:bg-white print:text-black print:border print:border-gray-300"
                  )}
                >
                  {stateBadge.text}
                </Badge>
              )}

              {/* Priority badge */}
              <Badge variant="outline" className="text-xs">
                {task.priority}
              </Badge>

              {/* Expand/collapse button */}
              {!isProxyItem && task.description && (
                <button
                  onClick={toggleExpanded}
                  className="ml-1 p-1 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary"
                  aria-label={isExpanded ? "Collapse details" : "Expand details"}
                >
                  {isExpanded ? (
                    <ChevronUp className="h-3 w-3 text-muted-foreground" />
                  ) : (
                    <ChevronDown className="h-3 w-3 text-muted-foreground" />
                  )}
                </button>
              )}
            </div>
          </div>

          {/* Description - shown based on expanded state */}
          {!isProxyItem && task.description && (isExpanded ? (
            <div className="mt-2 text-xs text-muted-foreground animate-accordion-down">
              <p className="whitespace-pre-wrap">{task.description}</p>
              {task.dueDate && (
                <p className="mt-1">
                  <span className="font-medium">Due:</span> {formattedDueDate}
                </p>
              )}
            </div>
          ) : (
            <p className="text-xs text-muted-foreground mt-1 truncate max-w-[250px]">
              {task.description}
            </p>
          ))}

          {isProxyItem && (
            <p className="text-xs text-blue-500 mt-1 italic">
              Click to load full details
            </p>
          )}
        </div>
      </TooltipProvider>
    );
  }
));

TimelineItem.displayName = 'TimelineItem';

// Custom comparison function for better performance
const areTimelinePropsEqual = (prevProps: TimelineItemProps, nextProps: TimelineItemProps) => {
  // Compare task properties that affect rendering
  if (prevProps.task.id !== nextProps.task.id) return false;
  if (prevProps.task.name !== nextProps.task.name) return false;
  if (prevProps.task.status !== nextProps.task.status) return false;
  if (prevProps.task.priority !== nextProps.task.priority) return false;
  if (prevProps.task.dueDate?.getTime() !== nextProps.task.dueDate?.getTime()) return false;
  if (prevProps.task.description !== nextProps.task.description) return false;
  if (prevProps.task.recurrencePattern !== nextProps.task.recurrencePattern) return false;
  if (prevProps.task.updatedAt?.getTime() !== nextProps.task.updatedAt?.getTime()) return false;

  // Compare other props
  if (prevProps.index !== nextProps.index) return false;
  if (prevProps.isSelected !== nextProps.isSelected) return false;
  if (prevProps.className !== nextProps.className) return false;
  if (prevProps.isProxy !== nextProps.isProxy) return false;

  // For function props and style, assume they're stable if memoized by parent
  if (prevProps.onClick !== nextProps.onClick) return false;

  // Style comparison (shallow)
  if (prevProps.style !== nextProps.style) {
    if (!prevProps.style && !nextProps.style) return true;
    if (!prevProps.style || !nextProps.style) return false;

    // Compare key style properties that matter for virtualization
    if (prevProps.style.height !== nextProps.style.height) return false;
    if (prevProps.style.top !== nextProps.style.top) return false;
    if (prevProps.style.transform !== nextProps.style.transform) return false;
  }

  return true;
};

export default React.memo(TimelineItem, areTimelinePropsEqual);
