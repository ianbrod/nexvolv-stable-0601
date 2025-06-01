'use client';

import React, { useState, useEffect } from 'react';
import { Task, Goal, TaskStatus } from '@prisma/client';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { finalUpdateTaskStatus } from '@/actions/finalUpdateTaskStatus';
import { DraggableTaskItem } from './DraggableTaskItem';

// Define column configuration
const COLUMNS = [
  { id: 'TODO', title: 'To Do' },
  { id: 'IN_PROGRESS', title: 'In Progress' },
  { id: 'COMPLETED', title: 'Completed' }
];

interface SimplifiedKanbanBoardProps {
  tasks: Task[];
  goals: Goal[];
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onCompletionChange?: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  isParentPending: boolean;
}

export function SimplifiedKanbanBoard({
  tasks,
  goals,
  onEdit,
  onStatusChange,
  onCompletionChange,
  onDeleteTask,
  isParentPending,
}: SimplifiedKanbanBoardProps) {
  // Group tasks by status
  const [groupedTasks, setGroupedTasks] = useState<Record<string, Task[]>>({});

  // Update grouped tasks when tasks prop changes
  useEffect(() => {
    const grouped = COLUMNS.reduce((acc, column) => {
      acc[column.id] = tasks.filter(task => String(task.status) === column.id);
      return acc;
    }, {} as Record<string, Task[]>);

    setGroupedTasks(grouped);
  }, [tasks]);

  // Handle drag start - store the task ID and original status
  const handleDragStart = (e: React.DragEvent, taskId: string, currentStatus: string) => {
    e.dataTransfer.setData('taskId', taskId);
    e.dataTransfer.setData('originalStatus', currentStatus);
    e.dataTransfer.effectAllowed = 'move';

    console.log(`[DnD] Started dragging task: ${taskId}, current status: ${currentStatus}`);

    // Add a dragging class to the element
    const element = e.currentTarget as HTMLElement;
    element.classList.add('opacity-50');
  };

  // Handle drag end - remove visual effects
  const handleDragEnd = (e: React.DragEvent) => {
    // Remove the dragging class
    const element = e.currentTarget as HTMLElement;
    element.classList.remove('opacity-50');
  };

  // Handle drag over - prevent default to allow drop
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  // Handle drop - update task status
  const handleDrop = async (e: React.DragEvent, newStatus: string) => {
    e.preventDefault();

    const taskId = e.dataTransfer.getData('taskId');
    const originalStatus = e.dataTransfer.getData('originalStatus');

    if (!taskId || originalStatus === newStatus) return;

    console.log(`[DnD] Dropping task ${taskId} from ${originalStatus} to ${newStatus}`);

    // Find the task
    const task = tasks.find(t => t.id === taskId);
    if (!task) return;

    // Update local state immediately for responsive UI
    setGroupedTasks(prev => {
      const updated = { ...prev };

      // Remove from previous group
      updated[originalStatus] = (updated[originalStatus] || []).filter(t => t.id !== taskId);

      // Add to new group with updated status
      const updatedTask = { ...task, status: newStatus as TaskStatus };
      updated[newStatus] = [...(updated[newStatus] || []), updatedTask];

      return updated;
    });

    // Call the parent's onStatusChange
    onStatusChange(taskId, newStatus as TaskStatus);

    // Call server action directly
    try {
      const result = await finalUpdateTaskStatus(taskId, newStatus);
      console.log(`[DnD] Server action result:`, result);

      if (!result.success) {
        console.error(`[DnD] Failed to update task status:`, result.message);

        // Revert the local state on failure
        setGroupedTasks(prev => {
          const reverted = { ...prev };

          // Remove from new group
          reverted[newStatus] = (reverted[newStatus] || []).filter(t => t.id !== taskId);

          // Add back to original group
          reverted[originalStatus] = [...(reverted[originalStatus] || []), task];

          return reverted;
        });
      }
    } catch (error) {
      console.error(`[DnD] Error updating task status:`, error);

      // Revert the local state on error
      setGroupedTasks(prev => {
        const reverted = { ...prev };

        // Remove from new group
        reverted[newStatus] = (reverted[newStatus] || []).filter(t => t.id !== taskId);

        // Add back to original group
        reverted[originalStatus] = [...(reverted[originalStatus] || []), task];

        return reverted;
      });
    }
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
      {COLUMNS.map(column => (
        <Card
          key={column.id}
          className="bg-background border shadow-sm flex flex-col py-0 gap-0"
          onDragOver={handleDragOver}
          onDrop={(e) => handleDrop(e, column.id)}
        >
          <CardHeader className="pb-0 pt-2 flex-shrink-0">
            <CardTitle className="text-lg font-medium flex items-center">
              {column.title}
              <Badge variant="outline" className="ml-2">
                {groupedTasks[column.id]?.length || 0}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden px-6 pb-0">
            <div className="space-y-3 h-[calc(100vh-230px)] overflow-y-auto px-1 pt-1 pb-0">
              {groupedTasks[column.id]?.length === 0 ? (
                <p className="text-muted-foreground text-center py-0">No tasks</p>
              ) : (
                groupedTasks[column.id]?.map((task) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, task.id, String(task.status))}
                    onDragEnd={handleDragEnd}
                    className="cursor-grab active:cursor-grabbing"
                  >
                    <DraggableTaskItem
                      task={task}
                      goals={goals}
                      onEdit={onEdit}
                      onStatusChange={onStatusChange}
                      onCompletionChange={onCompletionChange}
                      onDeleteTask={onDeleteTask}
                      isParentPending={isParentPending}
                    />
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
