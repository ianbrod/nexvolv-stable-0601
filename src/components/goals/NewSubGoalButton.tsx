'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { GoalModal } from './GoalModal';
import { Category, Goal } from '@prisma/client';

interface NewSubGoalButtonProps {
  parentGoal: Goal;
  categories: Category[];
}

export function NewSubGoalButton({ parentGoal, categories }: NewSubGoalButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);

  // Add debug logging
  console.log('NewSubGoalButton render, isModalOpen:', isModalOpen);

  useEffect(() => {
    console.log('Modal state changed to:', isModalOpen);
    return () => console.log('NewSubGoalButton effect cleanup');
  }, [isModalOpen]);

  // Add a prop to receive a callback for closing parent modals
  const handleOpenModal = (e: React.MouseEvent) => {
    console.log('handleOpenModal called');
    // Prevent event propagation
    e.stopPropagation();
    e.preventDefault();

    // Close any open dialogs in the DOM
    const openDialogs = document.querySelectorAll('[role="dialog"]');
    console.log('Found open dialogs:', openDialogs.length);
    openDialogs.forEach(dialog => {
      // Find the close button and click it
      const closeButton = dialog.querySelector('button[aria-label="Close"]');
      console.log('Found close button:', !!closeButton);
      if (closeButton instanceof HTMLElement) {
        closeButton.click();
      }
    });

    // Wait a moment before opening the new modal
    console.log('Setting timeout to open modal');
    setTimeout(() => {
      console.log('Timeout fired, setting modal open');
      setIsModalOpen(true);
    }, 300);
  };

  const handleCloseModal = () => {
    console.log('handleCloseModal called');
    setIsModalOpen(false);

    // Use router.refresh() instead of window.location.reload()
    // This will refresh the server components without a full page reload
    console.log('Refreshing router');
    router.refresh();
  };

  return (
    <>
      <Button onClick={handleOpenModal} size="sm" className="h-8">
        <Plus className="h-4 w-4 mr-1" /> Add Sub-Goal
      </Button>

      <GoalModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        categories={categories}
        parentGoal={parentGoal}
        isSubGoal={true}
      />
    </>
  );
}
