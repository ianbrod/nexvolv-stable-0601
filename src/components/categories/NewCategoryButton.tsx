'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Plus } from 'lucide-react';
import { Category } from '@prisma/client';
import { CategoryModal } from './CategoryModal';

interface NewCategoryButtonProps {
  categories: Category[];
}

export const NewCategoryButton = React.memo(function NewCategoryButton({ categories }: NewCategoryButtonProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
    }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);

  return (
    <>
      <Button 
        size="sm" 
        variant="ghost" 
        className="h-8 w-8 p-0"
        onClick={handleOpenModal}
      >
        <Plus className="h-4 w-4" />
      </Button>

      <CategoryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        categories={categories}
      />
    </>
  );
});
