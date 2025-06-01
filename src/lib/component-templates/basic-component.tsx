/**
 * Basic Component Template
 * 
 * This template demonstrates the standard structure for a basic UI component.
 * Use this as a starting point for creating new components.
 * 
 * Key features:
 * - Proper 'use client' directive
 * - Standardized import structure
 * - BaseComponentProps extension
 * - Proper className handling with cn()
 * - JSDoc documentation
 * - Proper prop spreading
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { BaseComponentProps, RequiredChildrenProps } from '@/types/component-types';

/**
 * Props for the BasicComponent
 * @interface BasicComponentProps
 * @extends {BaseComponentProps}
 * @extends {RequiredChildrenProps}
 */
export interface BasicComponentProps extends BaseComponentProps, RequiredChildrenProps {
  /**
   * Optional additional props
   */
  additionalProp?: string;
}

/**
 * A basic component that renders children with proper className handling
 * 
 * @example
 * ```tsx
 * <BasicComponent className="my-custom-class">
 *   Content goes here
 * </BasicComponent>
 * ```
 */
export function BasicComponent({
  className,
  children,
  additionalProp,
  ...props
}: BasicComponentProps) {
  return (
    <div
      className={cn(
        // Base styles
        'rounded-md p-4',
        // Apply custom className
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
