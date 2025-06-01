/**
 * Layout Component Template
 * 
 * This template demonstrates the standard structure for a layout component.
 * Use this as a starting point for creating new layout components.
 * 
 * Key features:
 * - No 'use client' directive (server component by default)
 * - Standardized import structure
 * - BaseComponentProps extension
 * - Proper className handling with cn()
 * - JSDoc documentation
 * - Proper prop spreading
 */

import * as React from 'react';
import { cn } from '@/lib/utils';
import { BaseComponentProps, RequiredChildrenProps } from '@/types/component-types';

/**
 * Props for the LayoutComponent
 * @interface LayoutComponentProps
 * @extends {BaseComponentProps}
 * @extends {RequiredChildrenProps}
 */
export interface LayoutComponentProps extends BaseComponentProps, RequiredChildrenProps {
  /**
   * Optional padding size
   */
  padding?: 'none' | 'sm' | 'md' | 'lg';
  
  /**
   * Optional maximum width
   */
  maxWidth?: 'sm' | 'md' | 'lg' | 'xl' | 'full';
}

/**
 * A layout component for structuring content
 * 
 * @example
 * ```tsx
 * <LayoutComponent padding="md" maxWidth="lg">
 *   <p>Content goes here</p>
 * </LayoutComponent>
 * ```
 */
export function LayoutComponent({
  className,
  children,
  padding = 'md',
  maxWidth = 'full',
  ...props
}: LayoutComponentProps) {
  // Map padding values to classes
  const paddingClasses = {
    none: '',
    sm: 'p-2',
    md: 'p-4',
    lg: 'p-6',
  };
  
  // Map maxWidth values to classes
  const maxWidthClasses = {
    sm: 'max-w-screen-sm',
    md: 'max-w-screen-md',
    lg: 'max-w-screen-lg',
    xl: 'max-w-screen-xl',
    full: 'max-w-full',
  };
  
  return (
    <div
      className={cn(
        // Base styles
        'mx-auto',
        // Apply padding based on prop
        paddingClasses[padding],
        // Apply max width based on prop
        maxWidthClasses[maxWidth],
        // Apply custom className
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
