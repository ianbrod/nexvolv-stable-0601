'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';

interface PanelResizeHandleProps {
  onResize: (newWidth: number) => void;
  onResizeStart: () => void;
  onResizeEnd: () => void;
  onDoubleClick: () => void;
  currentWidth: number;
  getConstrainedWidth: (width: number) => number;
  isVisible?: boolean;
}

/**
 * Resize handle component for panel dividers
 */
export function PanelResizeHandle({
  onResize,
  onResizeStart,
  onResizeEnd,
  onDoubleClick,
  currentWidth,
  getConstrainedWidth,
  isVisible = true
}: PanelResizeHandleProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startWidth, setStartWidth] = useState(0);
  const handleRef = useRef<HTMLDivElement>(null);

  // Start dragging when mouse down on the handle
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (!isVisible) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    setStartX(e.clientX);
    setStartWidth(currentWidth);
    onResizeStart();
  }, [isVisible, currentWidth, onResizeStart]);

  // Handle mouse move during drag
  const handleMouseMove = useCallback((e: MouseEvent) => {
    if (!isDragging) return;

    e.preventDefault();
    
    // Calculate the new width based on mouse movement
    // For a right panel, moving left decreases width, moving right increases width
    const deltaX = e.clientX - startX;
    const newWidth = startWidth - deltaX; // Subtract because we're resizing from the left edge
    
    // Apply constraints and call resize handler
    const constrainedWidth = getConstrainedWidth(newWidth);
    onResize(constrainedWidth);
  }, [isDragging, startX, startWidth, getConstrainedWidth, onResize]);

  // Stop dragging when mouse up
  const handleMouseUp = useCallback((e: MouseEvent) => {
    if (!isDragging) return;
    
    e.preventDefault();
    setIsDragging(false);
    onResizeEnd();
  }, [isDragging, onResizeEnd]);

  // Handle double-click to reset width
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    onDoubleClick();
  }, [onDoubleClick]);

  // Add and remove event listeners for mouse events
  useEffect(() => {
    if (typeof document === 'undefined') return;

    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      // Prevent text selection during drag
      document.body.style.userSelect = 'none';
    } else {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      
      // Restore text selection
      document.body.style.userSelect = '';
    }

    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
      document.body.style.userSelect = '';
    };
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Don't render if not visible
  if (!isVisible) {
    return null;
  }

  return (
    <div
      ref={handleRef}
      className={`panel-resize-handle ${isDragging ? 'dragging' : ''}`}
      onMouseDown={handleMouseDown}
      onDoubleClick={handleDoubleClick}
      title="Drag to resize panel width, double-click to reset"
      role="separator"
      aria-orientation="vertical"
      aria-label="Resize panel width"
      tabIndex={0}
      onKeyDown={(e) => {
        // Allow keyboard interaction for accessibility
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onDoubleClick();
        }
      }}
    />
  );
}
