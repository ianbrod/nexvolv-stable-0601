'use client';

/**
 * Hook for handling form errors in a consistent way
 */

import { useState, useCallback } from 'react';
import { AppError } from '@/lib/error-handling';
import { ZodError } from 'zod';

interface FormErrorState {
  hasError: boolean;
  message: string | null;
  fieldErrors: Record<string, string[]>;
}

/**
 * Hook for handling form errors
 *
 * @returns Form error state and utility functions
 */
export function useFormError() {
  const [errorState, setErrorState] = useState<FormErrorState>({
    hasError: false,
    message: null,
    fieldErrors: {},
  });

  /**
   * Clear all form errors
   */
  const clearErrors = useCallback(() => {
    setErrorState({
      hasError: false,
      message: null,
      fieldErrors: {},
    });
  }, []);

  /**
   * Set a general form error
   *
   * @param message The error message
   */
  const setError = useCallback((message: string) => {
    setErrorState({
      hasError: true,
      message,
      fieldErrors: {},
    });

    // Log error instead of showing toast
    console.error('Form Error:', message);
  }, []);

  /**
   * Set field-specific errors
   *
   * @param fieldErrors Record of field names to error messages
   * @param message Optional general error message
   */
  const setFieldErrors = useCallback((
    fieldErrors: Record<string, string | string[]>,
    message?: string
  ) => {
    // Normalize field errors to ensure all values are string arrays
    const normalizedErrors: Record<string, string[]> = {};

    for (const [field, error] of Object.entries(fieldErrors)) {
      normalizedErrors[field] = Array.isArray(error) ? error : [error];
    }

    setErrorState({
      hasError: true,
      message: message || null,
      fieldErrors: normalizedErrors,
    });

    // Show toast for general message if provided
    if (message) {
      addToast({
        title: 'Validation Error',
        description: message,
        type: 'destructive',
        duration: 5000,
      });
    }
  }, [addToast]);

  /**
   * Handle an error from a server action or API call
   *
   * @param error The error to handle
   */
  const handleError = useCallback((error: unknown) => {
    // Handle AppError objects
    if (error && typeof error === 'object' && 'code' in error && 'message' in error) {
      const appError = error as AppError;

      // Handle validation errors with field details
      if (appError.code === 'VALIDATION_ERROR' && appError.details) {
        if (typeof appError.details === 'object' && appError.details !== null) {
          // Handle Zod error format
          const fieldErrors: Record<string, string[]> = {};

          for (const [field, fieldError] of Object.entries(appError.details)) {
            if (field === '_errors') continue;

            if (typeof fieldError === 'object' && fieldError !== null && '_errors' in fieldError) {
              const errors = (fieldError as any)._errors;
              if (Array.isArray(errors)) {
                fieldErrors[field] = errors;
              }
            }
          }

          setFieldErrors(fieldErrors, appError.message);
          return;
        }
      }

      // Handle general app errors
      setError(appError.message);
      return;
    }

    // Handle Zod errors directly
    if (error instanceof ZodError) {
      const fieldErrors: Record<string, string[]> = {};

      for (const issue of error.errors) {
        const field = issue.path.join('.');
        if (!fieldErrors[field]) {
          fieldErrors[field] = [];
        }
        fieldErrors[field].push(issue.message);
      }

      setFieldErrors(fieldErrors, 'Validation failed');
      return;
    }

    // Handle standard Error objects
    if (error instanceof Error) {
      setError(error.message);
      return;
    }

    // Handle unknown errors
    setError(typeof error === 'string' ? error : 'An unexpected error occurred');
  }, [setError, setFieldErrors]);

  return {
    ...errorState,
    setError,
    setFieldErrors,
    handleError,
    clearErrors,
  };
}

export default useFormError;
