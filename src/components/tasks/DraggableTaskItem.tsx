'use client';

import React, { useState } from 'react';
import { Task, Goal, TaskStatus } from '@prisma/client';
import { useSortable } from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';
import { cn } from '@/lib/utils';
import { Badge } from '@/components/ui/badge';
import { format } from 'date-fns';
import { TaskPriority } from '@prisma/client';
import { Edit, Eye, Trash2, MoreHorizontal } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { UnifiedTaskDetailView } from './UnifiedTaskDetailView';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

interface DraggableTaskItemProps {
  task: Task;
  goals: Goal[];
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onCompletionChange?: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  isParentPending: boolean;
  goalName?: string | null;
}

export function DraggableTaskItem({
  task,
  goals,
  onEdit,
  onStatusChange,
  onCompletionChange,
  onDeleteTask,
  isParentPending,
  goalName
}: DraggableTaskItemProps) {
  // State for detail view and delete confirmation
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging
  } = useSortable({ id: task.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 1000 : 1,
  };

  // Define priority styles for icons only
  const getPriorityStyles = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return {
          icon: 'text-red-500'
        };
      case TaskPriority.MEDIUM:
        return {
          icon: 'text-yellow-500'
        };
      case TaskPriority.LOW:
        return {
          icon: 'text-blue-500'
        };
      default:
        return {
          icon: 'text-gray-500'
        };
    }
  };

  // Get category color for the left border
  const getCategoryColor = (): string => {
    // If task has a goal with a category, use the category color
    if (task.goal?.category?.color) {
      // Apply the color directly as a style instead of a Tailwind class
      return 'border-l-custom';
    }

    // Fallback to priority colors if no category is available
    switch (task.priority) {
      case TaskPriority.HIGH:
        return 'border-l-red-500';
      case TaskPriority.MEDIUM:
        return 'border-l-yellow-500';
      case TaskPriority.LOW:
        return 'border-l-blue-500';
      default:
        return 'border-l-gray-300';
    }
  };

  // Get the border color style if using a custom category color
  const getBorderStyle = () => {
    if (task.goal?.category?.color) {
      return { borderLeftColor: task.goal.category.color };
    }
    return {};
  };

  // Define status colors and styles
  const getStatusStyles = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return {
          color: 'text-green-600',
          label: 'Completed'
        };
      case TaskStatus.IN_PROGRESS:
        return {
          color: 'text-purple-600',
          label: 'In Progress'
        };
      case TaskStatus.TODO:
        return {
          color: 'text-blue-600',
          label: 'To Do'
        };
      default:
        return {
          color: 'text-gray-600',
          label: 'Unknown'
        };
    }
  };

  // Get background color based on task status
  const getBackgroundColor = (): string => {
    switch (task.status) {
      case TaskStatus.TODO:
        return 'bg-white dark:bg-gray-800'; // White for light mode, darker gray for dark mode
      case TaskStatus.IN_PROGRESS:
        return 'bg-fuchsia-50 dark:bg-fuchsia-950/30'; // Magenta tint with dark mode variant
      case TaskStatus.COMPLETED:
        return 'bg-stone-100 dark:bg-stone-800/30'; // Stone gray with dark mode variant
      default:
        return 'bg-white dark:bg-gray-800';
    }
  };

  // Helper to format date
  const formatDate = (dateInput?: Date | null): string => {
    if (!dateInput) return 'No date';
    try {
      return format(new Date(dateInput), 'PPP'); // Use date-fns format
    } catch (e) {
      console.error("Error formatting date:", e, "Input:", dateInput);
      return 'Invalid Date';
    }
  };

  // Find the goal name if not provided
  const resolvedGoalName = goalName || (task.goalId
    ? goals.find(g => g.id === task.goalId)?.name || null
    : null);

  // Handle delete confirmation
  const handleDeleteConfirm = () => {
    onDeleteTask(task.id);
    setIsDeleteAlertOpen(false);
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...attributes}
      {...listeners}
      className="cursor-grab active:cursor-grabbing mb-2"
    >
      <div
        className={cn(
          "transition-colors relative flex flex-col p-3 border rounded-md shadow-sm",
          "border-l-8", // Thickest left border for full-size draggable task items (2x thickness from border-l-4)
          getCategoryColor(),
          getBackgroundColor(),
          task.status === TaskStatus.COMPLETED && "opacity-40", // Apply opacity to completed tasks
          isParentPending && "opacity-50 cursor-not-allowed", // Dim when pending
          "hover:bg-accent/5" // Subtle hover effect
        )}
        style={getBorderStyle()}
      >
        {/* Task title */}
        <div className="flex justify-between items-center mb-1">
          <h3
            className={cn(
              "font-medium text-base truncate",
              task.status === TaskStatus.COMPLETED && "line-through text-muted-foreground"
            )}
            title={task.name}
          >
            {task.name}
          </h3>

          {/* 3-dot menu */}
          <div className="flex items-center flex-shrink-0">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="ghost"
                  size="icon"
                  className="h-6 w-6 p-0"
                  disabled={isParentPending}
                  onClick={(e) => e.stopPropagation()} // Prevent triggering the main div's onClick
                >
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  setIsDetailViewOpen(true);
                }}>
                  <Eye className="h-4 w-4 mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={(e) => {
                  e.stopPropagation();
                  onEdit(task);
                }}>
                  <Edit className="h-4 w-4 mr-2" />
                  Edit
                </DropdownMenuItem>

                <DropdownMenuItem
                  onClick={(e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    setIsDeleteAlertOpen(true);
                  }}
                  className="text-destructive hover:text-destructive hover:bg-destructive/10"
                >
                  <Trash2 className="h-4 w-4 mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Metadata */}
        <div className="flex flex-wrap gap-1 text-xs text-muted-foreground">
          {/* Priority indicator - first */}
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 h-4 font-normal",
              getPriorityStyles(task.priority).icon
            )}
          >
            {task.priority}
          </Badge>

          {/* Due date - second */}
          {task.dueDate && (
            <div className={cn(
              "flex items-center",
              // Highlight overdue tasks
              task.dueDate < new Date() && task.status !== TaskStatus.COMPLETED && "text-red-500 font-medium"
            )}>
              <span>{formatDate(task.dueDate)}</span>
            </div>
          )}

          {/* Goal badge - last */}
          {resolvedGoalName && (
            <Badge
              variant="outline"
              className="text-xs font-normal truncate max-w-[200px]"
              title={resolvedGoalName}
              style={getBorderStyle().borderLeftColor ?
                {
                  borderColor: `${getBorderStyle().borderLeftColor}80`,
                  color: getBorderStyle().borderLeftColor
                } : {}
              }
            >
              {resolvedGoalName}
            </Badge>
          )}
        </div>

        {/* No action buttons at the bottom */}
      </div>

      {/* Task Detail View */}
      {isDetailViewOpen && (
        <UnifiedTaskDetailView
          task={task}
          goalName={resolvedGoalName}
          isOpen={isDetailViewOpen}
          onOpenChange={setIsDetailViewOpen}
          onEdit={onEdit}
          mode="modal"
        />
      )}

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isParentPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isParentPending}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
