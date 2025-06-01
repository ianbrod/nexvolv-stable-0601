'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createPortal } from 'react-dom';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { GoalModal } from './GoalModal';
import { Category, Goal } from '@prisma/client';

interface PortalSubGoalButtonProps {
  parentGoal: Goal;
  categories: Category[];
}

export function PortalSubGoalButton({ parentGoal, categories }: PortalSubGoalButtonProps) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isMounted, setIsMounted] = useState(false);

  // Add debug logging
  console.log('PortalSubGoalButton render:', {
    isModalOpen,
    parentGoal: parentGoal ? { id: parentGoal.id, name: parentGoal.name } : null
  });

  // Handle mounting
  useEffect(() => {
    setIsMounted(true);
    return () => setIsMounted(false);
  }, []);

  useEffect(() => {
    console.log('Modal state changed to:', isModalOpen);
    return () => console.log('PortalSubGoalButton effect cleanup');
  }, [isModalOpen]);

  const handleOpenModal = (e: React.MouseEvent) => {
    console.log('handleOpenModal called');
    e.stopPropagation();
    e.preventDefault();
    setIsModalOpen(true);
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

      {isModalOpen && isMounted && typeof window !== 'undefined' &&
        createPortal(
          <GoalModal
            isOpen={isModalOpen}
            onClose={handleCloseModal}
            categories={categories}
            parentGoal={parentGoal}
            isSubGoal={true}
          />,
          document.body
        )
      }
    </>
  );
}
