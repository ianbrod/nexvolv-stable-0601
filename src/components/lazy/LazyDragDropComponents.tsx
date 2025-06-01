'use client';

import dynamic from 'next/dynamic';
import { Loader2, GripVertical } from 'lucide-react';

// Loading component for drag and drop features
const DragDropLoadingSpinner = () => (
  <div className="flex items-center justify-center p-4">
    <GripVertical className="h-6 w-6 text-muted-foreground mr-2" />
    <Loader2 className="h-6 w-6 animate-spin" />
    <span className="ml-2 text-sm text-muted-foreground">Loading drag & drop...</span>
  </div>
);

// Lazy load draggable goal list
export const LazyDraggableGoalList = dynamic(
  () => import('@/components/goals/DraggableGoalList').then(mod => ({ default: mod.DraggableGoalList })),
  {
    loading: () => <DragDropLoadingSpinner />,
    ssr: false, // Drag and drop requires client-side interaction
  }
);

// Lazy load draggable categories list
export const LazyDraggableCategoriesList = dynamic(
  () => import('@/components/categories/DraggableCategoriesList').then(mod => ({ default: mod.DraggableCategoriesList })),
  {
    loading: () => <DragDropLoadingSpinner />,
    ssr: false,
  }
);

// Lazy load draggable task item
export const LazyDraggableTaskItem = dynamic(
  () => import('@/components/tasks/DraggableTaskItem').then(mod => ({ default: mod.DraggableTaskItem })),
  {
    loading: () => <DragDropLoadingSpinner />,
    ssr: false,
  }
);

// Lazy load captain's log with drag and drop
export const LazyTagBasedCaptainsLogListWithDnd = dynamic(
  () => import('@/components/captainslog/TagBasedCaptainsLogList').then(mod => ({ default: mod.TagBasedCaptainsLogList })),
  {
    loading: () => <DragDropLoadingSpinner />,
    ssr: false,
  }
);

// Higher-order component for lazy loading DnD context
export const withLazyDndContext = <P extends object>(Component: React.ComponentType<P>) => {
  const LazyDndContext = dynamic(
    () => import('@dnd-kit/core').then(mod => ({ default: mod.DndContext })),
    {
      loading: () => <DragDropLoadingSpinner />,
      ssr: false,
    }
  );

  return function WrappedComponent(props: P) {
    return (
      <LazyDndContext>
        <Component {...props} />
      </LazyDndContext>
    );
  };
};

// Export types for better TypeScript support
export type LazyDragDropComponentProps = {
  onDragStart?: () => void;
  onDragEnd?: () => void;
  onLoad?: () => void;
  onError?: (error: Error) => void;
};
