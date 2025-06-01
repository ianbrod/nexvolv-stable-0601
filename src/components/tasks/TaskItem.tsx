'use client';

import React, { memo, useState } from 'react';
import { Task, TaskPriority, RecurrencePattern, TaskStatus } from '@prisma/client';
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import { format } from 'date-fns';
import { useTaskStatus } from '@/hooks/useTaskStatus';
import { Edit, Trash2, Eye } from 'lucide-react';
import { UnifiedTaskDetailView } from './UnifiedTaskDetailView';
import { Button } from "@/components/ui/button";
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

interface TaskItemProps {
  task: Task;
  onEdit: (task: Task) => void;
  onDeleteTask?: (taskId: string) => void;
  isParentPending?: boolean;
  goalName?: string | null;
  onClick?: (task: Task) => void;
}

export function TaskItem({
  task: initialTask,
  onEdit,
  onDeleteTask,
  isParentPending,
  goalName,
  onClick
}: TaskItemProps) {
  const [isAlertOpen, setIsAlertOpen] = useState(false);
  const [isDetailViewOpen, setIsDetailViewOpen] = useState(false);

  // Use the task status hook
  const { displayStatus, handleStatusChange, isLoading } = useTaskStatus(initialTask);

  // Helper to format date
  const formatDate = (dateInput?: Date | null): string => {
    if (!dateInput) return 'No date';
    try {
      return format(new Date(dateInput), 'PPP');
    } catch (e) {
      console.error("Error formatting date:", e, "Input:", dateInput);
      return 'Invalid Date';
    }
  };

  // Combine hook loading state and parent pending state
  const isPending = isLoading || isParentPending;

  // Actual delete handler passed to AlertDialogAction
  const handleDeleteConfirm = () => {
    if(onDeleteTask) {
      onDeleteTask(initialTask.id);
    }
    setIsAlertOpen(false);
  };

  // Define priority colors and styles
  const getPriorityStyles = (priority: TaskPriority) => {
    switch (priority) {
      case TaskPriority.HIGH:
        return {
          border: 'border-red-500',
          bg: 'bg-red-50',
          icon: 'text-red-500'
        };
      case TaskPriority.MEDIUM:
        return {
          border: 'border-yellow-500',
          bg: 'bg-yellow-50',
          icon: 'text-yellow-500'
        };
      case TaskPriority.LOW:
        return {
          border: 'border-blue-500',
          bg: 'bg-blue-50',
          icon: 'text-blue-500'
        };
      default:
        return {
          border: 'border-gray-300',
          bg: 'bg-gray-50',
          icon: 'text-gray-500'
        };
    }
  };

  // Define status colors and styles
  const getStatusStyles = (status: TaskStatus) => {
    switch (status) {
      case TaskStatus.COMPLETED:
        return {
          color: 'text-green-600',
          bg: 'bg-green-50',
          border: 'border-green-200',
          label: 'Completed'
        };
      case TaskStatus.IN_PROGRESS:
        return {
          color: 'text-purple-600',
          bg: 'bg-purple-50',
          border: 'border-purple-200',
          label: 'In Progress'
        };
      case TaskStatus.TODO:
        return {
          color: 'text-blue-600',
          bg: 'bg-blue-50',
          border: 'border-blue-200',
          label: 'To Do'
        };
      default:
        return {
          color: 'text-gray-600',
          bg: 'bg-gray-50',
          border: 'border-gray-200',
          label: 'Unknown'
        };
    }
  };

  return (
    <div
      key={initialTask.id}
      className={cn(
        "transition-colors relative flex items-center space-x-3 p-3 border rounded-md mb-0.5 shadow-sm",
        `border-l-8 ${getPriorityStyles(initialTask.priority).border}`, // Thickest left border for full-size task items (2x thickness from border-l-4)
        displayStatus === TaskStatus.COMPLETED ? "bg-muted/30" : getStatusStyles(displayStatus).bg,
        isPending && "opacity-50 cursor-not-allowed",
        "hover:bg-accent/5",
        onClick && "cursor-pointer"
      )}
      onClick={(e) => {
        // Only handle click if not pending and not clicking on a button or checkbox
        if (isPending) return;
        if (e.target instanceof HTMLButtonElement || e.target instanceof HTMLInputElement) return;
        if (onClick) onClick(initialTask);
      }}
    >
      {/* Left section with checkbox */}
      <div className="flex-shrink-0 pt-0.5">
        <Checkbox
          id={`task-complete-${initialTask.id}`} // Use initialTask.id
          checked={displayStatus === TaskStatus.COMPLETED} // Use displayStatus
          onCheckedChange={handleStatusChange} // Use hook's handler
          aria-label={`Mark task ${initialTask.name} as complete`} // Use initialTask.name
          disabled={isPending} // Use combined pending state
          className={cn(
            "h-5 w-5 border-2",
            displayStatus === TaskStatus.COMPLETED ? "border-green-500" : "border-gray-300" // Use displayStatus
          )}
        />
      </div>

      {/* Middle section with task details */}
      <div className="flex-grow min-w-0">
        <h3
          className={cn(
            "font-medium text-base truncate",
            displayStatus === TaskStatus.COMPLETED && "line-through text-muted-foreground" // Use displayStatus
          )}
          title={initialTask.name} // Use initialTask.name
        >
          {initialTask.name}
        </h3>

        {/* Task description - completely hidden on card face */}

        {/* Move all metadata to the same row as title */}
        <div className="flex items-center flex-wrap gap-2 text-xs text-muted-foreground">
          {/* Due date */}
          {initialTask.dueDate && ( // Use initialTask.dueDate
            <div className={cn(
              "flex items-center gap-1",
              // Highlight overdue tasks
              initialTask.dueDate < new Date() && displayStatus !== TaskStatus.COMPLETED && "text-red-500 font-medium" // Use initialTask.dueDate and displayStatus
            )}>
              <span>{formatDate(initialTask.dueDate)}</span>
              {initialTask.dueDate < new Date() && displayStatus !== TaskStatus.COMPLETED && ( // Use initialTask.dueDate and displayStatus
                <Badge variant="destructive" className="text-[10px] px-1 py-0 h-4">
                  Overdue
                </Badge>
              )}
            </div>
          )}

          {/* Goal badge */}
          {goalName && (
            <Badge
              variant="secondary"
              className="text-xs font-normal truncate max-w-[100px]"
              title={goalName}
            >
              {goalName}
            </Badge>
          )}

          {/* Status badge */}
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 h-4 font-normal",
              getStatusStyles(displayStatus).color // Use displayStatus
            )}
          >
            {getStatusStyles(displayStatus).label}
          </Badge>

          {/* Priority indicator */}
          <Badge
            variant="outline"
            className={cn(
              "text-[10px] px-1.5 py-0 h-4 font-normal",
              getPriorityStyles(initialTask.priority).icon // Use initialTask.priority
            )}
          >
            {initialTask.priority}
          </Badge>

          {/* Recurrence - only show if task is recurring */}
          {initialTask.recurrencePattern !== RecurrencePattern.NONE && ( // Use initialTask.recurrencePattern
            <span className="text-purple-600 text-[10px]">
              {initialTask.recurrencePattern.charAt(0) + initialTask.recurrencePattern.slice(1).toLowerCase()}
            </span>
          )}

          {/* Completed date - only show if task is completed */}
          {displayStatus === TaskStatus.COMPLETED && initialTask.completedAt && ( // Use displayStatus and initialTask.completedAt
            <span className="text-green-600 text-[10px]">
              Completed {formatDate(initialTask.completedAt)}
            </span>
          )}

          {/* Started date - only show if task is in progress */}
          {displayStatus === TaskStatus.IN_PROGRESS && initialTask.startedAt && ( // Use displayStatus and initialTask.startedAt
            <span className="text-purple-600 text-[10px]">
              Started {formatDate(initialTask.startedAt)}
            </span>
          )}
        </div>
      </div>

      {/* Right section with actions */}
      <div className="flex items-center gap-1 ml-auto">
        {/* Action buttons - more compact */}
        <div className="flex items-center">
          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => setIsDetailViewOpen(true)}
            disabled={isPending}
            title="View details"
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>

          <Button
            variant="ghost"
            size="icon"
            className="h-7 w-7"
            onClick={() => onEdit(initialTask)} // Use initialTask
            disabled={isPending}
            title="Edit task"
          >
            <Edit className="h-3.5 w-3.5" />
          </Button>

          {onDeleteTask && (
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 text-destructive hover:text-destructive/90"
              disabled={isPending}
              title="Delete task"
              onClick={() => setIsAlertOpen(true)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Task Detail View */}
      {isDetailViewOpen && (
        <UnifiedTaskDetailView
          task={initialTask}
          goalName={goalName}
          isOpen={isDetailViewOpen}
          onOpenChange={setIsDetailViewOpen}
          onEdit={onEdit}
          mode="modal"
        />
      )}

      {/* Keep AlertDialog for delete confirmation */}
      <AlertDialog open={isAlertOpen} onOpenChange={setIsAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteConfirm}
              disabled={isPending}
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

// Export both named and default exports for backward compatibility
export default TaskItem;