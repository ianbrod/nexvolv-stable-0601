'use client';

import React, { useCallback, useMemo } from 'react';
import { Category } from '@prisma/client';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { CategoryManager } from './CategoryManager';

interface CategoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: Category[];
}

export const CategoryModal = React.memo(function CategoryModal({ isOpen, onClose, categories }: CategoryModalProps) {
  const handleSuccess = useCallback(() => {
    onClose();
  }, [onClose]);

  // Memoize dialog props to prevent unnecessary re-renders
  const dialogProps = useMemo(() => ({
    open: isOpen,
    onOpenChange: onClose
  }), [isOpen, onClose]);

  return (
    <Dialog {...dialogProps}>
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
            onClose={handleSuccess}
          />
        </div>
      </DialogContent>
    </Dialog>
  );
});
