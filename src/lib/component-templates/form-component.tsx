/**
 * Form Component Template
 * 
 * This template demonstrates the standard structure for a form component.
 * Use this as a starting point for creating new form components.
 * 
 * Key features:
 * - Proper 'use client' directive
 * - Standardized import structure
 * - BaseComponentProps extension
 * - Proper className handling with cn()
 * - JSDoc documentation
 * - Proper prop spreading
 * - Form-specific props
 */

'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { BaseComponentProps, DisableableProps } from '@/types/component-types';

/**
 * Props for the FormComponent
 * @interface FormComponentProps
 * @extends {BaseComponentProps}
 * @extends {DisableableProps}
 */
export interface FormComponentProps extends BaseComponentProps, DisableableProps {
  /**
   * The name attribute for the form element
   */
  name: string;
  
  /**
   * The value of the form element
   */
  value: string;
  
  /**
   * Callback function when the value changes
   */
  onChange: (value: string) => void;
  
  /**
   * Whether the field is required
   */
  required?: boolean;
  
  /**
   * Placeholder text
   */
  placeholder?: string;
  
  /**
   * Error message to display
   */
  error?: string;
}

/**
 * A form component with proper handling of form-specific props
 * 
 * @example
 * ```tsx
 * <FormComponent
 *   name="email"
 *   value={email}
 *   onChange={setEmail}
 *   placeholder="Enter your email"
 *   required
 * />
 * ```
 */
export function FormComponent({
  className,
  name,
  value,
  onChange,
  disabled = false,
  required = false,
  placeholder,
  error,
  ...props
}: FormComponentProps) {
  // Handle change events
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    onChange(e.target.value);
  };
  
  return (
    <div className="space-y-2">
      <input
        type="text"
        id={name}
        name={name}
        value={value}
        onChange={handleChange}
        disabled={disabled}
        required={required}
        placeholder={placeholder}
        aria-invalid={!!error}
        className={cn(
          // Base styles
          'w-full px-3 py-2 border rounded-md',
          // Error state
          error && 'border-red-500 focus:ring-red-500',
          // Disabled state
          disabled && 'opacity-50 cursor-not-allowed',
          // Apply custom className
          className
        )}
        {...props}
      />
      
      {error && (
        <p className="text-sm text-red-500">{error}</p>
      )}
    </div>
  );
}
