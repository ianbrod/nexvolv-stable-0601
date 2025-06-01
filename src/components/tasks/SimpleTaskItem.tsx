'use client';

import React, { memo, useState, useCallback } from 'react';
import { Task, TaskStatus } from '@prisma/client';
import { Checkbox } from '@/components/ui/checkbox';
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { MoreHorizontal, Edit, Trash2, Eye, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTaskStatus } from '@/hooks/useTaskStatus';
import { UnifiedTaskDetailView } from '@/components/tasks/UnifiedTaskDetailView';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SimpleTaskItemProps {
  task: Task;
  goalName?: string | null;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onClick?: (task: Task) => void;
  onStatusChange?: (taskId: string, status: TaskStatus, updatedTask: Task) => void;
  isSelected?: boolean;
}

const SimpleTaskItemComponent = ({
  task,
  goalName,
  onEdit,
  onDelete,
  onClick,
  onStatusChange,
  isSelected = false,
}: SimpleTaskItemProps) => {
  // State for detail view modal
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);

  // Instantiate the hook
  const { displayStatus, handleStatusChange, isLoading } = useTaskStatus(task, onStatusChange);

  // Memoized event handlers to prevent unnecessary re-renders
  const handleEdit = useCallback(() => {
    onEdit(task);
  }, [onEdit, task]);

  const handleDelete = useCallback(() => {
    onDelete(task.id);
  }, [onDelete, task.id]);

  const handleClick = useCallback(() => {
    if (onClick && !isLoading) {
      onClick(task);
    }
  }, [onClick, task, isLoading]);

  const handleDetailViewOpen = useCallback(() => {
    setIsDetailViewOpen(true);
  }, []);

  const handleDetailViewClose = useCallback((open: boolean) => {
    setIsDetailViewOpen(open);
  }, []);

  // Format date for display
  const formatDate = useCallback((date: Date | null): string => {
    if (!date) return '';
    return format(new Date(date), 'MMM d, yyyy');
  }, []);

  // Get priority display and color
  const getPriorityDisplay = () => {
    switch (task.priority) {
      case 'HIGH':
        return { label: 'High', color: 'text-red-600 bg-red-50 border-red-200 dark:bg-red-900/30 dark:border-red-800' };
      case 'MEDIUM':
        return { label: 'Medium', color: 'text-amber-600 bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800' };
      case 'LOW':
        return { label: 'Low', color: 'text-green-600 bg-green-50 border-green-200 dark:bg-green-900/30 dark:border-green-800' };
      default:
        return { label: 'Normal', color: 'text-gray-600 bg-gray-50 border-gray-200 dark:bg-gray-800 dark:border-gray-700' };
    }
  };

  // Get status display
  // Updated getStatusDisplay to use displayStatus from hook
  const getStatusDisplay = (): string => {
    // Compare against Prisma enum values
    switch (displayStatus) {
      case TaskStatus.TODO: // Use Prisma enum value
        return 'To Do';
      case TaskStatus.IN_PROGRESS: // Use Prisma enum value
        return 'In Progress';
      case TaskStatus.COMPLETED: // Use Prisma enum value
        return 'Completed';
      default:
        // Handle potential non-cycleable statuses (like ARCHIVED) if necessary
        const statusString = displayStatus as string;
        // Simple fallback display for other statuses
        return statusString.charAt(0).toUpperCase() + statusString.slice(1).toLowerCase().replace('_', ' ');
    }
  };

  // Get status badge class based on task status
  // Updated to use our new CSS classes
  const getStatusBadgeClass = (): string => {
    switch (displayStatus) {
      case TaskStatus.TODO:
        return 'status-badge-todo';
      case TaskStatus.IN_PROGRESS:
        return 'status-badge-in-progress';
      case TaskStatus.COMPLETED:
        return 'status-badge-completed';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  // Get background color based on task status
  // Updated getBackgroundColor to use displayStatus from hook and Prisma enum values
  const getBackgroundColor = (): string => {
    switch (displayStatus) {
      case TaskStatus.TODO: // Compare with Prisma enum value
        return 'bg-white dark:bg-gray-800'; // White for light mode, darker gray for dark mode
      case TaskStatus.IN_PROGRESS: // Compare with Prisma enum value
        return 'bg-fuchsia-50 dark:bg-fuchsia-950/30'; // Magenta tint with dark mode variant
      case TaskStatus.COMPLETED: // Compare with Prisma enum value
        return 'bg-stone-100 dark:bg-stone-800/30'; // Stone gray with dark mode variant
      default: // Fallback for other statuses
        return 'bg-white dark:bg-gray-800';
    }
  };

  // Always use border-l-custom class to allow custom border color
  const getCategoryColor = (): string => {
    return 'border-l-custom';
  };

  // Get the border color style based on available information
  const getBorderStyle = () => {
    // First check if we have a goal with category in the task object
    if ('goal' in task && task.goal && (task.goal as any).category && (task.goal as any).category.color) {
      return { borderLeftColor: (task.goal as any).category.color };
    }

    // For subgoal tasks, we need to extract the color from the parent component
    // This is passed via the goalName prop
    if (goalName) {
      // Use fixed colors for known categories to match the rest of the UI
      // These are the standard category colors used in the app
      if (goalName.toLowerCase().includes('work')) {
        return { borderLeftColor: '#4f46e5' }; // Indigo
      } else if (goalName.toLowerCase().includes('personal')) {
        return { borderLeftColor: '#16a34a' }; // Green
      } else if (goalName.toLowerCase().includes('health')) {
        return { borderLeftColor: '#ef4444' }; // Red
      } else if (goalName.toLowerCase().includes('finance')) {
        return { borderLeftColor: '#f59e0b' }; // Amber
      } else if (goalName.toLowerCase().includes('education')) {
        return { borderLeftColor: '#8b5cf6' }; // Violet
      } else if (goalName.toLowerCase().includes('family')) {
        return { borderLeftColor: '#ec4899' }; // Pink
      } else if (goalName.toLowerCase().includes('social')) {
        return { borderLeftColor: '#06b6d4' }; // Cyan
      } else if (goalName.toLowerCase().includes('career')) {
        return { borderLeftColor: '#0ea5e9' }; // Sky
      } else if (goalName.toLowerCase().includes('hobby')) {
        return { borderLeftColor: '#84cc16' }; // Lime
      } else if (goalName.toLowerCase().includes('travel')) {
        return { borderLeftColor: '#f97316' }; // Orange
      } else if (goalName.toLowerCase().includes('spiritual')) {
        return { borderLeftColor: '#9333ea' }; // Purple
      } else if (goalName.toLowerCase().includes('creative')) {
        return { borderLeftColor: '#14b8a6' }; // Teal
      } else {
        // Use a consistent color based on the goal name
        // This is a simple hash function to generate a color from a string
        const hash = Array.from(goalName).reduce((acc, char) => {
          return char.charCodeAt(0) + ((acc << 5) - acc);
        }, 0);
        // Generate a color with a fixed saturation and lightness for better consistency
        return { borderLeftColor: `hsl(${Math.abs(hash) % 360}, 70%, 50%)` };
      }
    }

    // Fallback to priority colors if no category or goal name is available
    switch (task.priority) {
      case 'HIGH':
        return { borderLeftColor: '#ef4444' }; // Red
      case 'MEDIUM':
        return { borderLeftColor: '#f59e0b' }; // Amber
      case 'LOW':
        return { borderLeftColor: '#16a34a' }; // Green
      default:
        return { borderLeftColor: '#9ca3af' }; // Gray
    }
  };

  return (
    <div
      className={cn(
        "flex items-center justify-between p-3 border rounded-md mt-0 mb-0.5 shadow-sm",
        "border-l-8", // Thickest left border for full-size task items (2x thickness from border-l-4)
        "h-[72px]", // Fixed height to ensure consistency
        getCategoryColor(),
        getBackgroundColor(),
        // Apply opacity based on displayStatus using Prisma enum value
        displayStatus === TaskStatus.COMPLETED && "opacity-40",
        // Improved loading state - subtle visual feedback without animations
        isLoading && "cursor-default ring-1 ring-blue-300 dark:ring-blue-600 bg-blue-50/30 dark:bg-blue-950/20",
        onClick && !isLoading && "cursor-pointer hover:bg-accent/10", // Only allow hover/click if not loading
        // Add subtle glow effect when selected - matching week view current day border with blur
        isSelected && "ring-1 ring-purple-500/40 border-purple-500/30 shadow-lg shadow-purple-500/20 bg-purple-500/5"
      )}
      style={getBorderStyle()}
      // Prevent main div click if loading or if the click target is the checkbox area
      onClick={(e) => {
          if (isLoading) return;
          // Check if the click originated from the checkbox wrapper or its children
          const checkboxWrapper = (e.target as Element).closest('[data-checkbox-wrapper="true"]');
          if (!checkboxWrapper) {
              handleClick();
          }
      }}
    >
      <div className="flex items-center gap-3 flex-grow overflow-hidden">
        <div
          // Use handleStatusChange from hook, disable clicks while loading
          className={cn(
            "relative",
            isLoading && "opacity-75" // Clean opacity reduction when loading
          )}
          data-checkbox-wrapper="true" // Add data attribute to identify this area
          onClick={(e) => {
            e.stopPropagation(); // Prevent triggering the main div's onClick
            if (!isLoading) {
              handleStatusChange();
            }
          }}
          style={{ cursor: isLoading ? 'default' : 'pointer' }} // Change cursor based on loading state
        >
          <Checkbox
            // Use displayStatus for checked state using Prisma enum value
            checked={displayStatus === TaskStatus.COMPLETED}
            // Don't disable checkbox - keep it visually normal
            disabled={false}
            className="h-5 w-5 pointer-events-none" // Add pointer-events-none as click is handled by wrapper
            // Update data-in-progress based on displayStatus using Prisma enum value
            data-in-progress={displayStatus === TaskStatus.IN_PROGRESS ? "true" : "false"}
            aria-label={`Task status: ${displayStatus}. Click to change.`} // Add accessibility label
          />
          {/* Clean loading indicator without animations */}
          {isLoading && (
            <div className="absolute inset-0 flex items-center justify-center">
              <Check className="h-3 w-3 text-blue-500 dark:text-blue-400" />
            </div>
          )}
        </div>

        <div className="flex flex-col overflow-hidden">
          <span className={cn(
            "font-medium truncate max-w-[400px]",
            // Use displayStatus for styling using Prisma enum value
            displayStatus === TaskStatus.COMPLETED && "line-through text-gray-500"
          )}
            title={task.name} // Add title for hover text on truncated content
          >
            {task.name}
          </span>

          <div className="flex items-center gap-2 text-xs text-gray-500 mt-1 overflow-hidden">
            {/* Priority level */}
            <Badge variant="outline" className={cn("text-xs whitespace-nowrap", getPriorityDisplay().color)}>
              {getPriorityDisplay().label}
            </Badge>

            {/* Due date */}
            {task.dueDate && (
              <span className="whitespace-nowrap">Due: {formatDate(task.dueDate)}</span>
            )}

            {/* Status badge - only in list view */}
            <Badge className={cn("text-xs whitespace-nowrap", getStatusBadgeClass())}>
              {getStatusDisplay()}
            </Badge>

            {/* Goal badge */}
            {goalName && (
              <Badge
                variant="outline"
                className="text-xs font-normal truncate max-w-[150px]"
                title={goalName}
                style={getBorderStyle().borderLeftColor ?
                  {
                    borderColor: `${getBorderStyle().borderLeftColor}80`,
                    color: getBorderStyle().borderLeftColor
                  } : {}
                }
              >
                {goalName}
              </Badge>
            )}
          </div>
        </div>
      </div>

      <div className="flex items-center flex-shrink-0">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="sm"
              className="h-8 w-8 p-0 flex-shrink-0"
              onClick={(e) => e.stopPropagation()} // Prevent triggering the main div's onClick
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              handleDetailViewOpen();
            }}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </DropdownMenuItem>
            <DropdownMenuItem onClick={(e) => {
              e.stopPropagation();
              handleEdit();
            }}>
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>

            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                e.preventDefault();
                handleDelete();
              }}
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Task Detail Modal */}
      {isDetailViewOpen && (
        <UnifiedTaskDetailView
          task={task}
          goalName={goalName}
          isOpen={isDetailViewOpen}
          onOpenChange={handleDetailViewClose}
          onEdit={handleEdit}
          mode="modal"
        />
      )}
    </div>
  );
};

// Custom comparison function for React.memo
const arePropsEqual = (prevProps: SimpleTaskItemProps, nextProps: SimpleTaskItemProps) => {
  // Compare task properties that affect rendering
  if (prevProps.task.id !== nextProps.task.id) return false;
  if (prevProps.task.name !== nextProps.task.name) return false;
  if (prevProps.task.status !== nextProps.task.status) return false;
  if (prevProps.task.priority !== nextProps.task.priority) return false;
  if (prevProps.task.dueDate?.getTime() !== nextProps.task.dueDate?.getTime()) return false;
  if (prevProps.task.updatedAt?.getTime() !== nextProps.task.updatedAt?.getTime()) return false;

  // Compare other props
  if (prevProps.goalName !== nextProps.goalName) return false;
  if (prevProps.isSelected !== nextProps.isSelected) return false;

  // For function props, we assume they're stable if they're memoized by parent
  // If not, this comparison will help prevent unnecessary re-renders
  if (prevProps.onEdit !== nextProps.onEdit) return false;
  if (prevProps.onDelete !== nextProps.onDelete) return false;
  if (prevProps.onClick !== nextProps.onClick) return false;
  if (prevProps.onStatusChange !== nextProps.onStatusChange) return false;

  return true;
};

// Export the memoized version with custom comparison
export const SimpleTaskItem = memo(SimpleTaskItemComponent, arePropsEqual);
export default memo(SimpleTaskItemComponent, arePropsEqual);
