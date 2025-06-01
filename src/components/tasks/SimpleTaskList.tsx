'use client';

import React, { useState, useEffect } from 'react';
import { Task, Goal, Category } from '@prisma/client';
import { SimpleTaskItem } from './SimpleTaskItem';
import { TaskModal } from './TaskModal';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from '@/components/ui/alert-dialog';
import { deleteTask } from '@/actions/tasks';

interface SimpleTaskListProps {
  tasks: Task[];
  goals: Goal[];
  categories?: Category[]; // Add categories for hierarchical dropdown
}

export function SimpleTaskList({ tasks, goals, categories = [] }: SimpleTaskListProps) {
  // Remove local state for tasks; use the 'tasks' prop directly
  // const [localTasks, setLocalTasks] = useState<Task[]>(tasks);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [taskToDelete, setTaskToDelete] = useState<string | null>(null);
  // Remove view modal state
  // const [viewingTask, setViewingTask] = useState<Task | null>(null);
  // const [isViewModalOpen, setIsViewModalOpen] = useState(false);

  // Remove useEffect that updates local state
  // useEffect(() => {
  //   setLocalTasks(tasks);
  // }, [tasks]);

  // Get goal name for a task
  const getGoalName = (goalId: string | null): string | null => {
    if (!goalId) return null;
    const goal = goals.find(g => g.id === goalId);
    return goal ? goal.name : null;
  };

  // Handle edit button click
  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setIsEditModalOpen(true);
  };

  // Remove view handler
  // const handleView = (task: Task) => {
  //   setViewingTask(task);
  //   setIsViewModalOpen(true);
  // };

  // Handle delete button click
  const handleDelete = (taskId: string) => {
    setTaskToDelete(taskId);
    setIsDeleteAlertOpen(true);
  };

  // Handle delete confirmation
  const handleDeleteConfirm = async () => {
    if (!taskToDelete) return;

    try {
      const result = await deleteTask(taskToDelete);
      console.log(`[SimpleTaskList] Delete task result:`, result);

      // Close the alert
      setIsDeleteAlertOpen(false);
      setTaskToDelete(null);
    } catch (error) {
      console.error(`[SimpleTaskList] Error deleting task:`, error);
    }
  };

  // Handle modal open/close state changes
  const handleModalOpenChange = (open: boolean) => {
    // Only reset state when the modal is closing
    if (!open) {
      setIsEditModalOpen(false);
      setEditingTask(null);
      // Remove view modal state reset
      // setIsViewModalOpen(false);
      // setViewingTask(null);
    } else {
      // If opening is handled elsewhere (like handleEdit), this might not be needed
      // Or, ensure isEditModalOpen is set true when opening if controlled this way
      setIsEditModalOpen(true);
    }
  };

  return (
    <div className="space-y-2">
      {/* Iterate directly over the 'tasks' prop */}
      {tasks.map(task => (
        <SimpleTaskItem
          key={task.id}
          task={task}
          goalName={getGoalName(task.goalId)}
          onEdit={handleEdit}
          onDelete={handleDelete}
          // Remove onView prop
          // onView={handleView}
        />
      ))}

      {/* Edit Modal */}
      {editingTask && (
        <TaskModal
          isOpen={isEditModalOpen}
          // Use onOpenChange instead of onClose
          onOpenChange={handleModalOpenChange}
          // Pass task data as initialData
          initialData={editingTask}
          goals={goals}
          categories={categories} // Pass categories for hierarchical dropdown
          mode="edit"
        />
      )}

      {/* Remove View Modal section */}

      {/* Delete Confirmation */}
      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the task.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteConfirm}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
