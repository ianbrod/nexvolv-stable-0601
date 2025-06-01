'use client';

import React, { useState, useEffect, useCallback } from 'react';

interface ResizeHandleProps {
  onResize: (newWidth: number) => void;
  onDoubleClick?: () => void;
  minWidth: number;
  maxWidth: number;
  currentWidth: number;
  isCollapsed?: boolean;
}

const ResizeHandleComponent = ({
  onResize,
  onDoubleClick,
  minWidth,
  maxWidth,
  currentWidth,
  isCollapsed = false
}: ResizeHandleProps) => {
  const [isDragging, setIsDragging] = useState(false);

  // Start dragging when mouse down on the handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (isCollapsed) return;
    e.preventDefault();
    setIsDragging(true);
  }, [isCollapsed]);

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    // Check if window is defined (client-side only)
    if (typeof window === 'undefined') return;

    // Calculate the new width based on the mouse position
    // For the right panel, we need to calculate from the right edge of the screen
    const windowWidth = window.innerWidth;
    const newWidth = windowWidth - e.clientX;

    // Apply constraints
    const constrainedWidth = Math.max(minWidth, Math.min(maxWidth, newWidth));

    // Call the onResize callback with the new width
    onResize(constrainedWidth);
  }, [isDragging, minWidth, maxWidth, onResize]);

  // Stop dragging when mouse up
  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
  }, []);

  // Handle double-click to toggle between min and max width
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    if (isCollapsed || !onDoubleClick) return;
    e.preventDefault();
    e.stopPropagation();
    onDoubleClick();
  }, [isCollapsed, onDoubleClick]);

  // Add and remove event listeners
  useEffect(() => {
    // Only run on client-side
    if (typeof document === 'undefined') return;

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);

      // Add a class to the body to indicate dragging (for cursor styling)
      document.body.classList.add('resizing');
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);

      // Remove the class when done
      document.body.classList.remove('resizing');
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.classList.remove('resizing');
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Don't render the handle when collapsed
  if (isCollapsed) {
    return null;
  }

  return (
    <div
      className={`panel-resize-handle ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel width. Double-click to toggle between minimum and maximum width."
      title="Drag to resize panel, double-click to toggle min/max width"
      tabIndex={0}
      onKeyDown={(e) => {
        // Allow keyboard interaction for accessibility
        if ((e.key === 'Enter' || e.key === ' ') && onDoubleClick) {
          e.preventDefault();
          onDoubleClick();
        }
      }}
    />
  );
};

export const ResizeHandle = React.memo(ResizeHandleComponent);
