/**
 * Variant Component Template
 * 
 * This template demonstrates the standard structure for a component with variants.
 * Use this as a starting point for creating new components with different variants.
 * 
 * Key features:
 * - Proper 'use client' directive
 * - Standardized import structure
 * - BaseComponentProps extension
 * - Proper className handling with cn()
 * - JSDoc documentation
 * - Proper prop spreading
 * - Variant handling with class-variance-authority
 */

'use client';

import * as React from 'react';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { BaseComponentProps, RequiredChildrenProps } from '@/types/component-types';

// Define variants using class-variance-authority
const variantComponentVariants = cva(
  // Base styles applied to all variants
  'rounded-md px-4 py-2 font-medium transition-colors focus:outline-none focus:ring-2 focus:ring-offset-2',
  {
    variants: {
      variant: {
        primary: 'bg-primary text-white hover:bg-primary/90 focus:ring-primary/50',
        secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary/50',
        outline: 'border border-input bg-background hover:bg-accent hover:text-accent-foreground focus:ring-input/50',
        ghost: 'hover:bg-accent hover:text-accent-foreground focus:ring-accent/50',
      },
      size: {
        sm: 'text-sm h-8',
        md: 'text-base h-10',
        lg: 'text-lg h-12',
      },
    },
    defaultVariants: {
      variant: 'primary',
      size: 'md',
    },
  }
);

/**
 * Props for the VariantComponent
 * @interface VariantComponentProps
 * @extends {BaseComponentProps}
 * @extends {RequiredChildrenProps}
 * @extends {VariantProps<typeof variantComponentVariants>}
 */
export interface VariantComponentProps 
  extends BaseComponentProps, 
    RequiredChildrenProps,
    VariantProps<typeof variantComponentVariants> {
  /**
   * Optional click handler
   */
  onClick?: () => void;
}

/**
 * A component with different variants and sizes
 * 
 * @example
 * ```tsx
 * <VariantComponent variant="primary" size="md" onClick={handleClick}>
 *   Click me
 * </VariantComponent>
 * ```
 */
export function VariantComponent({
  className,
  variant,
  size,
  children,
  onClick,
  ...props
}: VariantComponentProps) {
  return (
    <button
      type="button"
      className={cn(variantComponentVariants({ variant, size, className }))}
      onClick={onClick}
      {...props}
    >
      {children}
    </button>
  );
}
