/**
 * Utility for wrapping server actions with consistent error handling
 *
 * Note: This file should NOT have the 'use server' directive at the top
 * because it exports functions that are used in other server files.
 * The 'use server' directive should be added to the actual server action files.
 *
 * IMPORTANT: In Next.js, the 'use server' directive must be at the top of the file.
 * When using these wrappers, make sure to:
 * 1. Add 'use server' at the top of your server action file
 * 2. Create a server action function that uses the wrapper internally
 *
 * Example:
 * ```
 * 'use server';
 *
 * // Implementation function
 * async function myActionImpl(data) {
 *   // Implementation
 * }
 *
 * // Public server action
 * export async function myAction(data) {
 *   const wrapper = withValidation(MySchema, myActionImpl, options);
 *   return wrapper(data);
 * }
 * ```
 */

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import {
  createSuccessResponse,
  createErrorResponse,
  ApiResponse
} from './error-handling';
import { validateData } from './validation';

/**
 * Options for the action wrapper
 */
interface ActionWrapperOptions<T> {
  /** Paths to revalidate after successful action */
  revalidatePaths?: string[];
  /** Success message to include in the response */
  successMessage?: string;
  /** Context for error logging */
  context?: string;
}

/**
 * Wrap a server action with consistent error handling and validation
 *
 * @param schema Zod schema for validating input
 * @param action The action function to wrap
 * @param options Additional options
 * @returns A wrapped action function with consistent error handling
 */
export function withValidation<TInput, TOutput>(
  schema: z.ZodType<TInput>,
  action: (data: TInput) => Promise<TOutput>,
  options?: ActionWrapperOptions<TOutput>
) {
  return async (data: unknown): Promise<ApiResponse<TOutput>> => {
    try {
      // Validate input data
      const validationResult = validateData(schema, data);

      if (!validationResult.success) {
        return validationResult.error;
      }

      // Execute the action with validated data
      const result = await action(validationResult.data);

      // Revalidate paths if specified
      if (options?.revalidatePaths) {
        for (const path of options.revalidatePaths) {
          revalidatePath(path);
        }
      }

      // Return success response
      return createSuccessResponse(result, options?.successMessage);
    } catch (error) {
      // Return error response
      return createErrorResponse(error);
    }
  };
}

/**
 * Wrap a server action with consistent error handling (without validation)
 *
 * @param action The action function to wrap
 * @param options Additional options
 * @returns A wrapped action function with consistent error handling
 */
export function withErrorHandling<TInput, TOutput>(
  action: (data: TInput) => Promise<TOutput>,
  options?: ActionWrapperOptions<TOutput>
) {
  return async (data: TInput): Promise<ApiResponse<TOutput>> => {
    try {
      // Execute the action
      const result = await action(data);

      // Revalidate paths if specified
      if (options?.revalidatePaths) {
        for (const path of options.revalidatePaths) {
          revalidatePath(path);
        }
      }

      // Return success response
      return createSuccessResponse(result, options?.successMessage);
    } catch (error) {
      // Return error response
      return createErrorResponse(error, options?.context);
    }
  };
}
