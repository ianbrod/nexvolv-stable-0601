'use client';

import React, { useState, useCallback } from 'react';
import { Button } from '@/components/ui/button';
import { Settings } from 'lucide-react';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CategoryManager } from './CategoryManager';
import { Category } from '@prisma/client';

interface ManageCategoriesButtonProps {
  categories: Category[];
  onCategoriesChanged?: () => void;
}

export const ManageCategoriesButton = React.memo(function ManageCategoriesButton({ categories, onCategoriesChanged }: ManageCategoriesButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleOpenModal = useCallback(() => {
    setIsOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsOpen(false);
    if (onCategoriesChanged) {
      onCategoriesChanged();
    }
  }, [onCategoriesChanged]);

  return (
    <>
      <Button 
        variant="outline" 
        onClick={handleOpenModal}
        className="flex items-center gap-1"
      >
        <Settings className="h-4 w-4" />
        <span>Manage Categories</span>
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-[600px]">
          <DialogHeader>
            <DialogTitle>Manage Categories</DialogTitle>
            <DialogDescription>
              Create, edit, or delete categories for organizing your goals.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4">
            <CategoryManager 
              categories={categories} 
              onClose={handleCloseModal}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
});
