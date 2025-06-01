'use client';

import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { PlusCircle } from 'lucide-react';
import { GoalModal } from './GoalModal';
import { CategoryData, GoalCardData } from './types';

interface NewGoalButtonProps {
  categories: CategoryData[];
  parentGoals?: GoalCardData[];
}

export function NewGoalButton({ categories, parentGoals = [] }: NewGoalButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = () => {
    setIsModalOpen(true);
  };

  const handleCloseModal = () => {
    setIsModalOpen(false);
  };

  return (
    <>
      <Button
        onClick={handleOpenModal}
        size="sm"
        className="bg-cyan-500/20 hover:bg-cyan-500/30 dark:bg-cyan-400/20 dark:hover:bg-cyan-400/30 border-2 border-cyan-500 dark:border-cyan-400 text-cyan-700 dark:text-cyan-300 hover:text-cyan-800 dark:hover:text-cyan-200 transition-all duration-200 hover:scale-105 hover:shadow-lg"
      >
        <PlusCircle className="mr-2 h-4 w-4" />
        New Goal
      </Button>

      <GoalModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        categories={categories}
        parentGoals={parentGoals}
        // Pass goalToEdit={null} or similar when edit is implemented
      />
    </>
  );
}