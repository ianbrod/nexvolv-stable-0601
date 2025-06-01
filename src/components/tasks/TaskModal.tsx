'use client';

import React, { useState } from 'react';
// Use Prisma types
import { Goal, Task, Category } from '@prisma/client';
// Import the input type from the schema definition file
import { CreateTaskInput } from '@/lib/schemas/tasks';
import { TaskForm } from './TaskForm';
// Remove client-side DB imports
// import { addTask, updateTask } from "@/lib/db";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogTrigger,
} from "@/components/ui/dialog";

interface TaskModalProps {
  trigger?: React.ReactNode;
  isOpen?: boolean;
  onOpenChange?: (open: boolean) => void;
  mode: 'create' | 'edit';
  // Use Prisma Task type for initial data consistency
  initialData?: Task | null;
  goals: Goal[]; // Keep this prop name as TaskForm expects it
  categories: Category[]; // Add categories for hierarchical dropdown
  onSuccess?: () => void; // Callback for when the form submits successfully
  onTaskCreated?: (newTask: Task) => void; // Callback for when a task is created
}

export function TaskModal({
  trigger,
  isOpen: controlledOpen,
  onOpenChange: setControlledOpen,
  mode,
  initialData,
  goals,
  categories,
  onSuccess,
  onTaskCreated
}: TaskModalProps) {
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const open = controlledOpen !== undefined ? controlledOpen : internalIsOpen;
  const setOpen = setControlledOpen !== undefined ? setControlledOpen : setInternalIsOpen;

  // Callback for when the form submits successfully
  const handleSuccess = () => {
    console.log("Task operation successful!");
    setOpen(false); // Close the modal on success

    // Call the external success callback if provided
    if (onSuccess) {
      onSuccess();
    }
  };

  const handleOpenChange = (openState: boolean) => {
    if (!openState) {
        // Reset logic if needed
    }
    if (setControlledOpen) {
      setControlledOpen(openState);
    } else {
      setInternalIsOpen(openState);
    }
  };

  // Prepare initial data for the form, matching CreateTaskInput + id
  const formInitialData: (CreateTaskInput & { id: string }) | undefined = initialData
    ? {
        id: initialData.id,
        name: initialData.name,
        description: initialData.description ?? undefined,
        priority: initialData.priority,
        dueDate: initialData.dueDate,
        goalId: initialData.goalId
      }
    : mode === 'create' && goals.length > 0
      ? {
        id: '', // Empty ID for new task
        name: '',
        description: '',
        priority: 'MEDIUM',
        dueDate: null,
        // Use the provided goalId from initialData if available, otherwise use the first goal
        goalId: initialData?.goalId || goals[0].id
      }
    : undefined;

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      {!controlledOpen && trigger && <DialogTrigger asChild>{trigger}</DialogTrigger>}
      <DialogContent className="sm:max-w-[550px]">
        <DialogHeader>
          <DialogTitle>{mode === 'create' ? 'Create New Task' : 'Edit Task'}</DialogTitle>
          <DialogDescription>
            {mode === 'create' ? "Fill in the details for your new task." : "Update the details of your task."}
          </DialogDescription>
        </DialogHeader>

        <TaskForm
          key={formInitialData?.id || 'create'}
          initialData={formInitialData}
          goals={goals} // Pass the received goals list to TaskForm
          categories={categories} // Pass categories for hierarchical dropdown
          onFormSubmitSuccess={handleSuccess}
          onCancel={() => setOpen(false)}
          onTaskCreated={onTaskCreated}
        />
      </DialogContent>
    </Dialog>
  );
}