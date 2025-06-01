'use client';

import React, { useState, useCallback } from 'react';
import { ClientDraggableCategoriesList } from '@/components/categories/ClientDraggableCategoriesList';
import { CategoriesPanelProps } from './goal-list-types';
import { Button } from '@/components/ui/button';
import { X, CheckSquare, Square, Plus, Check } from 'lucide-react';
import { cn } from '@/lib/utils';
import { CategoryModal } from '@/components/categories/CategoryModal';

/**
 * Panel component for displaying and managing categories
 */
export function CategoriesPanel({
  categories,
  selectedCategoryIds,
  onCategoryClick,
  onCategoriesReordered,
  onClearSelection,
  selectMode,
  onSelectModeToggle
}: CategoriesPanelProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);

  const handleOpenModal = useCallback(() => {
    setIsModalOpen(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setIsModalOpen(false);
  }, []);
  return (
    <div className="w-64 min-w-64 flex-shrink-0 border-r border-border/50 h-full flex flex-col bg-card/30 backdrop-blur-sm hidden md:block">
      {/* Empty Header Space */}
      <div className="px-4 py-4 border-b border-border/30">
        {/* Intentionally left blank as requested */}
      </div>

      {/* Categories section with controls directly above the list */}
      <div className="px-4 py-4 flex-1 overflow-hidden min-h-0">
        {/* Categories Controls Header - positioned directly above the list */}
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <h3
              className="text-xs font-semibold text-muted-foreground/80 mr-2 tracking-wider uppercase cursor-pointer hover:text-foreground transition-colors"
              onClick={() => onCategoryClick(null)}
              title="Show All Categories"
            >
              Categories
            </h3>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 p-0 ml-1 rounded-md transition-all duration-200",
                selectMode && "bg-primary/20 text-primary hover:bg-primary/30"
              )}
              onClick={onSelectModeToggle}
              title={selectMode ? "Exit Select Mode" : "Enter Select Mode"}
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center space-x-1">
            {/* Clear Selection Button - only show when categories are selected */}
            {selectedCategoryIds.length > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={onClearSelection}
                title="Clear Selection"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            {/* Add Category Button */}
            <Button
              variant="ghost"
              size="icon"
              className="h-7 w-7 rounded-md hover:bg-green-500/10 hover:text-green-600 transition-colors"
              onClick={handleOpenModal}
              title="Add Category"
            >
              <Plus className="h-3.5 w-3.5" />
            </Button>
          </div>
        </div>

        {/* Show selection count when in select mode and categories are selected */}
        {selectMode && selectedCategoryIds.length > 0 && (
          <div className="text-xs text-muted-foreground text-center mb-3">
            {selectedCategoryIds.length} categor{selectedCategoryIds.length === 1 ? 'y' : 'ies'} selected
          </div>
        )}

        {/* Scrollable Categories List */}
        <div className="overflow-y-scroll overflow-x-hidden flex-1 min-h-0">
          <ClientDraggableCategoriesList
            categories={categories}
            onCategoriesReordered={onCategoriesReordered}
            onCategoryClick={onCategoryClick}
            selectedCategoryIds={selectedCategoryIds}
          />
        </div>
      </div>

      {/* Category Modal */}
      <CategoryModal
        isOpen={isModalOpen}
        onClose={handleCloseModal}
        categories={categories}
      />
    </div>
  );
}
