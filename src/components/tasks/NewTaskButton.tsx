'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { PlusCircle } from 'lucide-react';
import { TaskModal } from './TaskModal';
import { Goal } from '@prisma/client'; // Import Prisma Goal type

interface NewTaskButtonProps {
  goals: Goal[]; // Accept goals needed for the modal's form
}

export function NewTaskButton({ goals }: NewTaskButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  return (
    <>
      {/* The button itself now triggers the state change */}
      <Button
        onClick={() => setIsModalOpen(true)}
        className="bg-primary hover:bg-primary/90 text-primary-foreground"
      >
        <PlusCircle className="mr-2 h-4 w-4" /> New Task
      </Button>

      {/* The Modal is controlled by this component's state */}
      <TaskModal
        mode="create"
        isOpen={isModalOpen}
        onOpenChange={setIsModalOpen} // Let the modal control the state
        goals={goals} // Pass goals down to the form within the modal
        key="create-task-modal" // Use a key if needed, maybe based on state
      />
    </>
  );
}