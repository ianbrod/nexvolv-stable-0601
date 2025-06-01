'use client';

import React, { useEffect, useState, memo, useCallback, useMemo } from 'react';
import { Category } from '@prisma/client';
import { DraggableCategoriesList } from './DraggableCategoriesList';

interface ClientDraggableCategoriesListProps {
  categories: Category[];
  onCategoriesReordered?: (newOrder: Category[]) => void;
  onCategoryClick: (categoryId: string | null) => void;
  selectedCategoryIds: string[];
}

export const ClientDraggableCategoriesList = memo(function ClientDraggableCategoriesList(props: ClientDraggableCategoriesListProps) {
  // Use client-side rendering only to avoid hydration mismatches
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  // Memoize category click handler
  const handleCategoryClick = useCallback((categoryId: string | null) => {
    props.onCategoryClick(categoryId);
  }, [props.onCategoryClick]);

  // Memoize categories reordered handler
  const handleCategoriesReordered = useCallback((newOrder: Category[]) => {
    if (props.onCategoriesReordered) {
      props.onCategoriesReordered(newOrder);
    }
  }, [props.onCategoriesReordered]);

  // Memoize static category list for SSR
  const staticCategoryList = useMemo(() => (
    <div className="space-y-1">
      {/* Show a static version of the categories during SSR */}
      {props.categories.map((category) => (
        <button
          key={category.id}
          className={`w-full text-left px-3 py-2 rounded-md ${props.selectedCategoryIds.includes(category.id) ? 'bg-accent' : 'hover:bg-accent'} flex items-center justify-between`}
        >
          <div className="flex items-center">
            <div
              className="w-3 h-3 rounded-full mr-2"
              style={{ backgroundColor: category.color || '#808080' }}
            />
            {category.name}
          </div>
          {props.selectedCategoryIds.includes(category.id) && (
            <span>✓</span>
          )}
        </button>
      ))}
    </div>
  ), [props.categories, props.selectedCategoryIds]);

  if (!isClient) {
    // Return a placeholder with the same structure but no DnD functionality
    return staticCategoryList;
  }

  // Only render the DnD component on the client
  return (
    <DraggableCategoriesList
      categories={props.categories}
      onCategoriesReordered={handleCategoriesReordered}
      onCategoryClick={handleCategoryClick}
      selectedCategoryIds={props.selectedCategoryIds}
    />
  );
});
