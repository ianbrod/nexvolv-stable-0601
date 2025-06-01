'use client';

// This component is client-only to avoid hydration mismatches with DnD

import React, { useState, useTransition, useEffect, useCallback, memo, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Category } from '@prisma/client';
import { GripVertical, Check as CheckIcon } from 'lucide-react';
import { updateCategoryOrder } from '@/actions/categories';
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from '@dnd-kit/core';
import {
  restrictToVerticalAxis,
  snapCenterToCursor,
} from '@dnd-kit/modifiers';
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { CSS } from '@dnd-kit/utilities';

interface SortableCategoryProps {
  category: Category;
  onCategoryClick: (categoryId: string) => void;
  isSelected: boolean;
}

// Custom comparison function for SortableCategory
const areSortableCategoryPropsEqual = (prevProps: SortableCategoryProps, nextProps: SortableCategoryProps) => {
  // Compare category properties that affect rendering
  if (prevProps.category.id !== nextProps.category.id) return false;
  if (prevProps.category.name !== nextProps.category.name) return false;
  if (prevProps.category.color !== nextProps.category.color) return false;
  if (prevProps.category.order !== nextProps.category.order) return false;

  // Compare other props
  if (prevProps.isSelected !== nextProps.isSelected) return false;

  // For function props, assume they're stable if memoized by parent
  if (prevProps.onCategoryClick !== nextProps.onCategoryClick) return false;

  return true;
};

const SortableCategory = memo(function SortableCategory({ category, onCategoryClick, isSelected }: SortableCategoryProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: category.id });

  const style = useMemo(() => ({
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 50 : 'auto',
  }), [transform, transition, isDragging]);

  const handleClick = useCallback(() => {
    onCategoryClick(category.id);
  }, [onCategoryClick, category.id]);

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`flex items-center w-full ${isDragging ? 'opacity-80 bg-accent/20' : ''}`}
    >
      <Button
        variant={isSelected ? "secondary" : "ghost"}
        className="w-full justify-start font-normal group"
        onClick={handleClick}
      >
        <div className="flex items-center w-full">
          <div
            {...attributes}
            {...listeners}
            className="cursor-grab opacity-30 group-hover:opacity-100 transition-opacity mr-1 hover:scale-110"
          >
            <GripVertical className="h-4 w-4 text-muted-foreground" />
          </div>
          <div
            className="w-3 h-3 rounded-full mr-2"
            style={{ backgroundColor: category.color || '#808080' }}
          />
          <div className="flex items-center justify-between w-full">
            <span>{category.name}</span>
            {isSelected && (
              <div className="ml-2 text-primary">
                <CheckIcon className="h-4 w-4" />
              </div>
            )}
          </div>
        </div>
      </Button>
    </div>
  );
}, areSortableCategoryPropsEqual);

interface DraggableCategoriesListProps {
  categories: Category[];
  onCategoriesReordered?: (newOrder: Category[]) => void;
  onCategoryClick: (categoryId: string | null) => void;
  selectedCategoryIds: string[];
}

export const DraggableCategoriesList = memo(function DraggableCategoriesList({
  categories,
  onCategoriesReordered,
  onCategoryClick,
  selectedCategoryIds,
}: DraggableCategoriesListProps) {
  const [items, setItems] = useState(categories);
  const [, startTransition] = useTransition(); // Using only startTransition

  // Update items when categories prop changes
  useEffect(() => {
    setItems(categories);
  }, [categories]);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      // Make the pointer sensor more forgiving
      activationConstraint: {
        distance: 8, // 8px seems to be a good balance
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  // Track if we're currently processing a server update
  const [isUpdating, setIsUpdating] = useState(false);

  const handleDragEnd = useCallback(async (event: DragEndEvent) => {
    const { active, over } = event;

    if (over && active.id !== over.id && !isUpdating) {
      // Find indices
      const oldIndex = items.findIndex((item) => item.id === active.id);
      const newIndex = items.findIndex((item) => item.id === over.id);

      // Create the new order
      const newOrder = arrayMove([...items], oldIndex, newIndex);

      // Update local state immediately for a responsive UI
      setItems(newOrder);

      // Call the callback if provided
      if (onCategoriesReordered) {
        onCategoriesReordered(newOrder);
      }

      // Prevent multiple simultaneous updates
      setIsUpdating(true);

      // Save the new order to the database
      startTransition(async () => {
        try {
          // Create an array of categories with their new order
          const categoriesWithOrder = newOrder.map((category, index) => ({
            id: category.id,
            order: index,
          }));

          // Call the server action to update the order
          const result = await updateCategoryOrder({
            categories: categoriesWithOrder,
          });

          if (!result.success) {
            console.error('Failed to update category order:', result.message);
            // Revert to original order on failure
            setItems(categories);
          }
        } catch (error) {
          console.error('Error updating category order:', error);
          // Revert to original order on error
          setItems(categories);
        } finally {
          setIsUpdating(false);
        }
      });
    }
  }, [items, onCategoriesReordered, categories, startTransition, isUpdating]);

  // Memoize the sortable items array
  const sortableItems = useMemo(() => {
    return items.map(item => item.id);
  }, [items]);

  return (
    <div className="space-y-1 w-full">
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
        modifiers={[restrictToVerticalAxis, snapCenterToCursor]}
      >
        <SortableContext
          items={sortableItems}
          strategy={verticalListSortingStrategy}
        >
          <div className="space-y-1 w-full">
            {items.map((category) => (
              <SortableCategory
                key={category.id}
                category={category}
                onCategoryClick={onCategoryClick}
                isSelected={selectedCategoryIds.includes(category.id)}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>
    </div>
  );
});

// Custom comparison function for DraggableCategoriesList
const areDraggableCategoriesListPropsEqual = (
  prevProps: DraggableCategoriesListProps,
  nextProps: DraggableCategoriesListProps
) => {
  // Compare categories array
  if (prevProps.categories.length !== nextProps.categories.length) return false;

  for (let i = 0; i < prevProps.categories.length; i++) {
    const prevCategory = prevProps.categories[i];
    const nextCategory = nextProps.categories[i];

    if (prevCategory.id !== nextCategory.id) return false;
    if (prevCategory.name !== nextCategory.name) return false;
    if (prevCategory.color !== nextCategory.color) return false;
    if (prevCategory.order !== nextCategory.order) return false;
    if (prevCategory.updatedAt?.getTime() !== nextCategory.updatedAt?.getTime()) return false;
  }

  // Compare selectedCategoryIds array
  if (prevProps.selectedCategoryIds.length !== nextProps.selectedCategoryIds.length) return false;
  for (let i = 0; i < prevProps.selectedCategoryIds.length; i++) {
    if (prevProps.selectedCategoryIds[i] !== nextProps.selectedCategoryIds[i]) return false;
  }

  // For function props, assume they're stable if memoized by parent
  if (prevProps.onCategoriesReordered !== nextProps.onCategoriesReordered) return false;
  if (prevProps.onCategoryClick !== nextProps.onCategoryClick) return false;

  return true;
};

// Export with custom comparison
export const DraggableCategoriesListOptimized = memo(DraggableCategoriesList, areDraggableCategoriesListPropsEqual);
