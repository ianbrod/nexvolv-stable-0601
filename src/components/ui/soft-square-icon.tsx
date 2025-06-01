import React from 'react';
import { cn } from '@/lib/utils';

interface SoftSquareIconProps {
  size?: number;
  color?: string;
  isCompleted?: boolean;
  isRecurring?: boolean;
  isVirtualInstance?: boolean;
  isDismissing?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

/**
 * Soft Round-Edged Square Icon Component
 * Standardized reminder icon used across Week View and Month View
 */
export function SoftSquareIcon({
  size = 15, // Standardized default size
  color = 'transparent',
  isCompleted = false,
  isRecurring = false,
  isVirtualInstance = false,
  isDismissing = false,
  className,
  style = {}
}: SoftSquareIconProps) {
  // Get the fill color based on state
  const getFillColor = (): string => {
    if (isCompleted) {
      return '#9ca3af'; // Gray for completed reminders
    }
    return color || 'transparent'; // Use provided color or transparent if unassociated
  };

  // Get the border color for recurring indicators
  const getBorderColor = (): string => {
    if (isCompleted) {
      return '#9ca3af'; // Gray for completed reminders
    }
    // Use the category color for border if available, otherwise fall back to red
    return color && color !== 'transparent' ? color : '#ef4444';
  };

  // Create the soft square style
  const softSquareStyle: React.CSSProperties = {
    width: `${size}px`,
    height: `${size}px`,
    borderRadius: isRecurring ? '0.25rem' : '0', // Soft rounded corners for recurring, straight edges for one-off
    border: 'none',
    backgroundColor: getFillColor(),
    opacity: isCompleted ? 0.5 : (isDismissing ? 0.7 : 1),
    display: 'block',
    position: 'relative',
    filter: isVirtualInstance ? 'brightness(1.2)' : 'none',
    transition: 'opacity 0.2s ease, background-color 0.2s ease, border-radius 0.2s ease',
    ...style
  };

  return (
    <span
      className={cn(
        "transition-all",
        className
      )}
      style={softSquareStyle}
    />
  );
}
