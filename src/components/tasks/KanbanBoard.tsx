'use client';

import React, { useState } from 'react';
import { Task, Goal, TaskPriority, TaskStatus } from '@prisma/client';
import { TaskItem } from './TaskItem';
import { DraggableTaskItem } from './DraggableTaskItem';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { updateTaskStatus } from '@/actions/updateTaskStatus'; // Import the simplified server action
import { columnToStatus, debugTask } from '@/lib/taskUtils'; // Import task utilities
import {
  DndContext,
  DragEndEvent,
  DragOverEvent,
  DragOverlay,
  DragStartEvent,
  PointerSensor,
  useSensor,
  useSensors
} from '@dnd-kit/core';
import { SortableContext, arrayMove, verticalListSortingStrategy } from '@dnd-kit/sortable';

interface KanbanBoardProps {
  tasks: Task[];
  goals: Goal[];
  onEdit: (task: Task) => void;
  onStatusChange: (taskId: string, status: TaskStatus) => void;
  onCompletionChange?: (taskId: string, completed: boolean) => void;
  onDeleteTask: (taskId: string) => void;
  isParentPending: boolean;
}

export function KanbanBoard({
  tasks,
  goals,
  onEdit,
  onStatusChange,
  onCompletionChange,
  onDeleteTask,
  isParentPending,
}: KanbanBoardProps) {
  // State for drag and drop
  const [activeId, setActiveId] = useState<string | null>(null);
  const [localTasks, setLocalTasks] = useState<Task[]>(tasks);

  // Update local tasks when props change
  React.useEffect(() => {
    setLocalTasks(tasks);
  }, [tasks]);

  // Configure sensors for drag and drop
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // Minimum drag distance before activation
      },
    })
  );

  // Function to get goal name by ID
  const getGoalName = (goalId: string | null) => {
    if (!goalId) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal?.name || null;
  };

  // Group tasks by status
  const todoTasks = localTasks.filter(task => task.status === TaskStatus.TODO);
  const inProgressTasks = localTasks.filter(task => task.status === TaskStatus.IN_PROGRESS);
  const completedTasks = localTasks.filter(task => task.status === TaskStatus.COMPLETED);

  // Get active task
  const activeTask = activeId ? localTasks.find(task => task.id === activeId) : null;

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  // Handle drag over
  const handleDragOver = (event: DragOverEvent) => {
    const { active, over } = event;

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Find the active task
    const activeTask = localTasks.find(task => task.id === activeId);

    if (!activeTask) return;

    // Check if we're dragging over a column
    if (overId === 'todo' || overId === 'in-progress' || overId === 'completed') {
      // Get the new status from the column ID
      const newStatus = columnToStatus[overId];

      // If status hasn't changed, do nothing
      if (String(activeTask.status) === newStatus) return;

      debugTask('KanbanDnD', `Dragging task ${activeId} over column ${overId}, new status: ${newStatus}`);

      // Update the task status locally
      setLocalTasks(tasks =>
        tasks.map(task =>
          task.id === activeId
            ? { ...task, status: newStatus as TaskStatus }
            : task
        )
      );
    }
  };

  // Handle drag end - simplified for better performance and reliability
  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null); // Clear active ID immediately

    if (!over) return;

    const activeId = active.id as string;
    const overId = over.id as string;

    // Only process if dropping over a column
    if (overId !== 'todo' && overId !== 'in-progress' && overId !== 'completed') return;

    // Find the active task
    const activeTask = localTasks.find(task => task.id === activeId);
    if (!activeTask) return;

    // Get the new status from the column ID
    const newStatus = columnToStatus[overId];

    // If status hasn't changed, do nothing
    if (String(activeTask.status) === newStatus) return;

    debugTask('KanbanDnD', `Dropped task ${activeId} onto column ${overId}, setting status to ${newStatus}`);

    // Update local state immediately (optimistic update)
    setLocalTasks(tasks => tasks.map(task =>
      task.id === activeId ? { ...task, status: newStatus as TaskStatus } : task
    ));

    // Call the parent's onStatusChange to update the UI
    // This will trigger a UI update and potentially a server action
    onStatusChange(activeId, newStatus as TaskStatus);

    // Also call the server action directly as a backup
    try {
      const result = await updateTaskStatus(activeId, newStatus);
      debugTask('KanbanDnD', 'Server response:', result);

      if (!result.success) {
        debugTask('KanbanDnD', `Status update failed: ${result.message}`);
        // We don't revert the UI here since onStatusChange should handle that
      }
    } catch (error) {
      debugTask('KanbanDnD', `Error calling server action: ${error}`);
      // We don't revert the UI here since onStatusChange should handle that
    }
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 h-full">
        {/* To Do Column */}
        <Card className="bg-background border shadow-sm flex flex-col py-0 gap-0" id="todo">
          <CardHeader className="pb-0 pt-2 flex-shrink-0">
            <CardTitle className="text-lg font-medium flex items-center">
              To Do
              <Badge variant="outline" className="ml-2">
                {todoTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden px-6 pb-0">
            <div className="space-y-3 h-[calc(100vh-230px)] overflow-y-auto px-1 pt-1 pb-0">
              <SortableContext items={todoTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                {todoTasks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-0">No tasks to do</p>
                ) : (
                  todoTasks.map((task) => (
                    <DraggableTaskItem
                      key={task.id}
                      task={task}
                      goals={goals}
                      onEdit={onEdit}
                      onStatusChange={onStatusChange}
                      onCompletionChange={onCompletionChange}
                      onDeleteTask={onDeleteTask}
                      isParentPending={isParentPending}
                      goalName={getGoalName(task.goalId)}
                    />
                  ))
                )}
              </SortableContext>
            </div>
          </CardContent>
        </Card>

        {/* In Progress Column */}
        <Card className="bg-background border shadow-sm border-l-4 border-l-purple-500 flex flex-col py-0 gap-0" id="in-progress">
          <CardHeader className="pb-0 pt-2 flex-shrink-0">
            <CardTitle className="text-lg font-medium flex items-center">
              In Progress
              <Badge variant="outline" className="ml-2">
                {inProgressTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden px-6 pb-0">
            <div className="space-y-3 h-[calc(100vh-230px)] overflow-y-auto px-1 pt-1 pb-0">
              <SortableContext items={inProgressTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                {inProgressTasks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-0">No tasks in progress</p>
                ) : (
                  inProgressTasks.map((task) => (
                    <DraggableTaskItem
                      key={task.id}
                      task={task}
                      goals={goals}
                      onEdit={onEdit}
                      onStatusChange={onStatusChange}
                      onCompletionChange={onCompletionChange}
                      onDeleteTask={onDeleteTask}
                      isParentPending={isParentPending}
                      goalName={getGoalName(task.goalId)}
                    />
                  ))
                )}
              </SortableContext>
            </div>
          </CardContent>
        </Card>

        {/* Completed Column */}
        <Card className="bg-background border shadow-sm flex flex-col py-0 gap-0" id="completed">
          <CardHeader className="pb-0 pt-2 flex-shrink-0">
            <CardTitle className="text-lg font-medium flex items-center">
              Completed
              <Badge variant="outline" className="ml-2">
                {completedTasks.length}
              </Badge>
            </CardTitle>
          </CardHeader>
          <CardContent className="flex-grow overflow-hidden px-6 pb-0">
            <div className="space-y-3 h-[calc(100vh-230px)] overflow-y-auto px-1 pt-1 pb-0">
              <SortableContext items={completedTasks.map(task => task.id)} strategy={verticalListSortingStrategy}>
                {completedTasks.length === 0 ? (
                  <p className="text-muted-foreground text-center py-0">No completed tasks</p>
                ) : (
                  completedTasks.map((task) => (
                    <DraggableTaskItem
                      key={task.id}
                      task={task}
                      goals={goals}
                      onEdit={onEdit}
                      onStatusChange={onStatusChange}
                      onCompletionChange={onCompletionChange}
                      onDeleteTask={onDeleteTask}
                      isParentPending={isParentPending}
                      goalName={getGoalName(task.goalId)}
                    />
                  ))
                )}
              </SortableContext>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Drag Overlay */}
      <DragOverlay>
        {activeId && activeTask ? (
          <div className="opacity-80">
            <TaskItem
              task={activeTask}
              goals={goals}
              onEdit={onEdit}
              onStatusChange={onStatusChange}
              onCompletionChange={onCompletionChange}
              onDeleteTask={onDeleteTask}
              isParentPending={isParentPending}
              goalName={getGoalName(activeTask.goalId)}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  );
}
