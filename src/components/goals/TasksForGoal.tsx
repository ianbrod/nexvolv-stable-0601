'use client';

import React, { useState, useTransition, useEffect } from 'react';
import { Task, Goal, TaskStatus, Category } from '@prisma/client';
import { TaskModal } from '@/components/tasks/TaskModal';
import { MinimalistTaskAccordion } from './MinimalistTaskAccordion';
import { deleteTask } from '@/actions/tasks';
import { getTasksForGoal } from '@/actions/getTasksForGoal';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { PlusCircle, CheckCircle2 } from 'lucide-react';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/lib/utils';

interface TasksForGoalProps {
  goal: Goal & {
    category?: {
      id: string;
      name: string;
      color?: string;
    } | null;
  };
  tasks: Task[];
  subGoals?: Goal[];
  categories?: Category[]; // Add categories for hierarchical dropdown
  isCreateModalOpen?: boolean;
  setIsCreateModalOpen?: (isOpen: boolean) => void;
}

export function TasksForGoal({
  goal,
  tasks: initialTasks,
  subGoals = [],
  categories = [],
  isCreateModalOpen: propIsCreateModalOpen,
  setIsCreateModalOpen: propSetIsCreateModalOpen
}: TasksForGoalProps) {
  const router = useRouter();
  // Use props for modal state if provided, otherwise use local state
  const [localIsCreateModalOpen, setLocalIsCreateModalOpen] = useState(false);
  const isCreateModalOpen = propIsCreateModalOpen !== undefined ? propIsCreateModalOpen : localIsCreateModalOpen;
  const setIsCreateModalOpen = propSetIsCreateModalOpen || setLocalIsCreateModalOpen;

  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const [showCompletedTasks, setShowCompletedTasks] = useState(false);

  // Local state for tasks to enable real-time updates
  const [tasks, setTasks] = useState<Task[]>(initialTasks);

  // Update local tasks state when initialTasks changes (from server)
  useEffect(() => {
    setTasks(initialTasks);
  }, [initialTasks]);

  // Filter tasks for this goal and its sub-goals
  const goalIds = [goal.id, ...(subGoals?.map(sg => sg.id) || [])];
  const filteredTasks = tasks.filter(task => {
    // First filter by goal
    if (!task.goalId || !goalIds.includes(task.goalId)) {
      return false;
    }

    // Then filter by completed status if needed
    if (!showCompletedTasks && task.status === TaskStatus.COMPLETED) {
      return false;
    }

    return true;
  });

  console.log('TasksForGoal - Filtered Tasks:', filteredTasks.length, 'for goal:', goal.name);
  console.log('All tasks provided:', tasks.length);
  console.log('Goal IDs to filter by:', goalIds);

  // Function to open the modal for editing
  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  // Function to close the modal
  const handleCloseModal = () => {
    setIsEditModalOpen(false);
    setEditingTask(null); // Clear editing task when modal closes

    // Refresh tasks after editing
    refreshTasks();
  };

  // Handle task status changes
  const handleTaskStatusChange = (taskId: string, status: TaskStatus, updatedTasks: Task[]) => {
    // Update the local tasks state with the updated tasks
    setTasks(updatedTasks);
  };

  // Function to confirm task deletion
  const handleDeleteConfirm = (taskId: string) => {
    setTaskToDelete(taskId);
    setIsDeleteAlertOpen(true);
  };

  // Function to execute task deletion
  const handleDeleteTask = async () => {
    if (!taskToDelete) return;

    startTransition(async () => {
      const result = await deleteTask(taskToDelete);

      if (result.success) {
        // Update local state immediately for real-time UI update
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskToDelete));

        // Also refresh from server to ensure consistency
        refreshTasks();
      } else {
        console.error('Failed to delete task:', result.message);
      }

      setIsDeleteAlertOpen(false);
      setTaskToDelete(null);
    });
  };

  // Function to refresh tasks for this goal
  const refreshTasks = async () => {
    if (!goal) return;

    startTransition(async () => {
      try {
        const result = await getTasksForGoal(goal.id);
        // Instead of refreshing the whole page, we can use the router.refresh() method
        // which will revalidate data without a full page reload
        router.refresh();
      } catch (error) {
        console.error('Error refreshing tasks:', error);
      }
    });
  };

  // Listen for task status change events
  useEffect(() => {
    const handleTaskStatusChange = (event: Event) => {
      const customEvent = event as CustomEvent<{ taskId: string, status: string }>;
      const { taskId, status } = customEvent.detail;

      // Check if the task belongs to this goal or its subgoals
      const isRelevantTask = filteredTasks.some(task => task.id === taskId);

      if (isRelevantTask) {
        console.log(`Task ${taskId} status changed to ${status}, refreshing tasks for goal ${goal.name}`);
        refreshTasks();
      }
    };

    const handleTaskDeleted = (event: Event) => {
      const customEvent = event as CustomEvent<{ taskId: string }>;
      const { taskId } = customEvent.detail;

      // Check if the task belongs to this goal or its subgoals
      const isRelevantTask = filteredTasks.some(task => task.id === taskId);

      if (isRelevantTask) {
        console.log(`Task ${taskId} deleted, refreshing tasks for goal ${goal.name}`);
        refreshTasks();
      }
    };

    const handleTaskCreated = (event: Event) => {
      const customEvent = event as CustomEvent<{ goalId: string }>;
      const { goalId } = customEvent.detail;

      // Check if the task belongs to this goal or its subgoals
      const isRelevantGoal = goalId === goal.id || subGoals?.some(sg => sg.id === goalId);

      if (isRelevantGoal) {
        console.log(`Task created for goal ${goalId}, refreshing tasks for goal ${goal.name}`);
        refreshTasks();
      }
    };

    // Add event listeners
    window.addEventListener('task-status-changed', handleTaskStatusChange);
    window.addEventListener('task-deleted', handleTaskDeleted);
    window.addEventListener('task-created', handleTaskCreated);

    // Clean up
    return () => {
      window.removeEventListener('task-status-changed', handleTaskStatusChange);
      window.removeEventListener('task-deleted', handleTaskDeleted);
      window.removeEventListener('task-created', handleTaskCreated);
    };
  }, [goal.id, filteredTasks, subGoals]);

  // Function to get goal name by ID
  const getGoalName = (goalId: string | null) => {
    if (!goalId) return null;

    if (goalId === goal.id) return goal.name;

    const subGoal = subGoals?.find(sg => sg.id === goalId);
    return subGoal ? subGoal.name : null;
  };

  return (
    <div className="space-y-4">
      <div className="mb-2">
        <div className="flex items-center gap-2 mb-2">
          <Badge
            variant="outline"
            className="text-base font-medium px-3 py-1 border-2"
            style={goal.category?.color ? {
              borderColor: `${goal.category?.color}80`,
              color: goal.category?.color,
              backgroundColor: `${goal.category?.color}10`
            } : {}}
          >
            {goal.name}
          </Badge>
          {goal.progress === 100 && (
            <Badge
              variant="default"
              className={cn(
                "font-medium bg-[var(--chart-3)] text-white",
                "flex items-center gap-1"
              )}
            >
              <CheckCircle2 className="h-3.5 w-3.5" />
              Completed
            </Badge>
          )}
        </div>

        {/* Show Completed Toggle */}
        <div className="flex items-center space-x-1.5 ml-1">
          <Label htmlFor="show-completed-tasks" className="text-xs cursor-pointer">
            Completed
          </Label>
          <Switch
            id="show-completed-tasks"
            checked={showCompletedTasks}
            onCheckedChange={setShowCompletedTasks}
            className="scale-50 data-[state=unchecked]:!bg-purple-500 data-[state=unchecked]:!border-purple-500"
          />
        </div>
      </div>

      {filteredTasks.length > 0 ? (
        <MinimalistTaskAccordion
          tasks={filteredTasks}
          goals={[goal, ...(subGoals || [])]}
          onEdit={handleEdit}
          onDeleteTask={handleDeleteConfirm}
          onStatusChange={handleTaskStatusChange}
          isPending={isPending}
        />
      ) : (
        <div className="text-center py-8 text-muted-foreground">
          <p>No tasks found for this goal.</p>
        </div>
      )}

      {/* Create Task Modal */}
      <TaskModal
        mode="create"
        isOpen={isCreateModalOpen}
        onOpenChange={(open) => {
          setIsCreateModalOpen(open);
          if (!open) {
            // Refresh tasks after creating a new task
            refreshTasks();
          }
        }}
        goals={[goal, ...(subGoals || [])]} // Pass current goal and subgoals
        categories={categories} // Pass categories for hierarchical dropdown
        initialData={{ goalId: goal.id }} // Pre-select the current goal
        onTaskCreated={(newTask) => {
          // Update the local tasks state with the new task
          setTasks(prevTasks => [...prevTasks, newTask]);
        }}
      />

      {/* Edit Task Modal */}
      {editingTask && (
        <TaskModal
          mode="edit"
          isOpen={isEditModalOpen}
          onOpenChange={handleCloseModal}
          initialData={editingTask}
          goals={[goal, ...(subGoals || [])]}
          categories={categories} // Pass categories for hierarchical dropdown
          key={`edit-${editingTask.id}`}
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
            <AlertDialogCancel asChild>
              <Button variant="outline" onClick={() => setIsDeleteAlertOpen(false)} disabled={isPending}>Cancel</Button>
            </AlertDialogCancel>
            <AlertDialogAction asChild>
              <Button
                variant="destructive"
                onClick={handleDeleteTask}
                disabled={isPending}
                className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              >
                Delete
              </Button>
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
