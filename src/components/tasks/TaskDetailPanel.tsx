'use client';

import React from 'react';
import { Task as PrismaTask, TaskStatus } from '@prisma/client';

// Define a more complete Task type that includes the goal relationship
type Task = PrismaTask & {
  goal?: {
    id: string;
    name: string;
    category?: {
      id: string;
      name: string;
      color: string;
    } | null;
  } | null;
};
import { format } from 'date-fns';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Edit, X, Calendar, Clock, CheckCircle, AlertCircle } from 'lucide-react';

interface TaskDetailPanelProps {
  task: Task | null;
  goalName?: string | null;
  onClose: () => void;
  onEdit: (task: Task) => void;
}

export function TaskDetailPanel({ task, goalName, onClose, onEdit }: TaskDetailPanelProps) {
  if (!task) return null;

  // Format date for display
  const formatDate = (date: Date | null): string => {
    if (!date) return 'No due date';
    return format(new Date(date), 'MMM d, yyyy h:mm a');
  };

  // Get status display
  const getStatusDisplay = (): string => {
    switch (task.status) {
      case TaskStatus.TODO:
        return 'To Do';
      case TaskStatus.IN_PROGRESS:
        return 'In Progress';
      case TaskStatus.COMPLETED:
        return 'Completed';
      case TaskStatus.ARCHIVED:
        return 'Archived';
      default:
        return 'Unknown';
    }
  };

  // Get status color - using CSS classes that support dark mode
  const getStatusColor = (): string => {
    switch (task.status) {
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

  // Get priority display
  const getPriorityDisplay = (): string => {
    switch (task.priority) {
      case 'HIGH':
        return 'High';
      case 'MEDIUM':
        return 'Medium';
      case 'LOW':
        return 'Low';
      default:
        return 'None';
    }
  };

  // Get priority color - with dark mode support
  const getPriorityColor = (): string => {
    switch (task.priority) {
      case 'HIGH':
        return 'bg-red-50 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      case 'MEDIUM':
        return 'bg-yellow-50 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400';
      case 'LOW':
        return 'bg-green-50 text-green-700 dark:bg-green-900/30 dark:text-green-400';
      default:
        return 'bg-gray-50 text-gray-700 dark:bg-gray-800 dark:text-gray-300';
    }
  };

  return (
    <Card className="h-full flex flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-xl font-bold">Task Details</CardTitle>
        <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
          <X className="h-4 w-4" />
        </Button>
      </CardHeader>
      <CardContent className="flex-grow overflow-auto">
        <div className="space-y-4">
          <div>
            <h2 className="text-xl font-semibold">{task.name}</h2>
            {goalName && (
              <Badge variant="outline" className="mt-1">
                {goalName}
              </Badge>
            )}
          </div>

          <div className="flex flex-wrap gap-2">
            <Badge className={getStatusColor()}>
              <CheckCircle className="h-3 w-3 mr-1" />
              {getStatusDisplay()}
            </Badge>
            <Badge className={getPriorityColor()}>
              <AlertCircle className="h-3 w-3 mr-1" />
              {getPriorityDisplay()} Priority
            </Badge>
          </div>

          {task.dueDate && (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Calendar className="h-4 w-4 mr-2" />
              <span>Due: {formatDate(task.dueDate)}</span>
            </div>
          )}

          {task.createdAt && (
            <div className="flex items-center text-sm text-gray-500 dark:text-gray-400">
              <Clock className="h-4 w-4 mr-2" />
              <span>Created: {format(new Date(task.createdAt), 'MMM d, yyyy')}</span>
            </div>
          )}

          {task.description && (
            <div className="mt-4">
              <h3 className="text-sm font-medium mb-2">Description</h3>
              <div className="text-sm text-gray-700 dark:text-gray-300 whitespace-pre-wrap p-3 bg-gray-50 dark:bg-gray-800 rounded-md border dark:border-gray-700">
                {task.description}
              </div>
            </div>
          )}
        </div>
      </CardContent>
      <CardFooter className="border-t pt-4">
        <Button onClick={() => onEdit(task)} className="w-full">
          <Edit className="h-4 w-4 mr-2" />
          Edit Task
        </Button>
      </CardFooter>
    </Card>
  );
}
