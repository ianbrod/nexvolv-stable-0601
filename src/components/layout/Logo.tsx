'use client';

import React from 'react';
import Image from 'next/image';
import { cn } from '@/lib/utils';

interface LogoProps {
  isCollapsed?: boolean;
  className?: string;
  sizeMultiplier?: number; // Allow custom size multiplier
}

/**
 * Logo component for the NexVolv application
 * - Non-interactive (not clickable)
 * - Responsive to sidebar collapsed/expanded state
 * - Sized to match other UI elements
 */
const LogoComponent = ({ isCollapsed = false, className, sizeMultiplier = 1 }: LogoProps) => {
  // Define fixed dimensions for both states to ensure consistent rendering
  const baseWidth = isCollapsed ? 28 : 84;
  const baseHeight = isCollapsed ? 28 : 84;
  const width = Math.round(baseWidth * sizeMultiplier);
  const height = Math.round(baseHeight * sizeMultiplier);

  // Calculate container size classes based on multiplier
  const containerSize = isCollapsed
    ? `w-[${Math.round(28 * sizeMultiplier)}px] h-[${Math.round(28 * sizeMultiplier)}px]`
    : "w-[84px] h-[84px]";

  return (
    <div
      className={cn(
        "flex items-center justify-center transition-all duration-300 ease-in-out",
        containerSize,
        className
      )}
      style={sizeMultiplier !== 1 ? {
        width: `${width}px`,
        height: `${height}px`
      } : undefined}
      aria-label="NexVolv Logo"
    >
      <Image
        src="/suped-nexvolv-logo.png"
        alt="NexVolv Logo"
        width={width}
        height={height}
        className="object-contain transition-all duration-300 ease-in-out"
        priority
      />
    </div>
  );
};

export const Logo = React.memo(LogoComponent);
