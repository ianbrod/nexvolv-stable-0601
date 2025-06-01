/**
 * Validation utilities for NexVolv
 *
 * This module provides helper functions for form validation and data parsing
 * using Zod schemas.
 */

import { z } from 'zod';
import { createErrorResponse, ErrorCode } from './error-handling';

/**
 * Parse and validate data using a Zod schema
 *
 * @param schema The Zod schema to validate against
 * @param data The data to validate
 * @returns A result object with success status and either parsed data or error
 */
export function validateData<T extends z.ZodType<any, any, any>>(
  schema: T,
  data: unknown
): { success: true; data: z.infer<T> } | { success: false; error: ReturnType<typeof createErrorResponse> } {
  try {
    const result = schema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        error: createErrorResponse({
          code: ErrorCode.VALIDATION_ERROR,
          message: 'Validation failed',
          details: result.error.format(),
          status: 400,
        }),
      };
    }
  } catch (error) {
    return {
      success: false,
      error: createErrorResponse(error, 'Validation failed'),
    };
  }
}

/**
 * Parse and validate form data using a Zod schema
 *
 * @param schema The Zod schema to validate against
 * @param formData The FormData object to validate
 * @returns A result object with success status and either parsed data or error
 */
export function validateFormData<T extends z.ZodType<any, any, any>>(
  schema: T,
  formData: FormData
): { success: true; data: z.infer<T> } | { success: false; error: ReturnType<typeof createErrorResponse> } {
  try {
    // Convert FormData to a plain object
    const data = Object.fromEntries(formData.entries());

    // Handle special cases like checkboxes
    for (const [key, value] of Object.entries(data)) {
      // Convert "on" values from checkboxes to boolean true
      if (value === 'on') {
        data[key] = true;
      }
      // Convert empty strings to undefined for optional fields
      else if (value === '') {
        data[key] = undefined;
      }
    }

    return validateData(schema, data);
  } catch (error) {
    return {
      success: false,
      error: createErrorResponse(error, 'Form validation failed'),
    };
  }
}

/**
 * Parse and validate request body using a Zod schema
 *
 * @param schema The Zod schema to validate against
 * @param request The Request object containing the body to validate
 * @returns A promise that resolves to a result object with success status and either parsed data or error
 */
export async function validateRequestBody<T extends z.ZodType<any, any, any>>(
  schema: T,
  request: Request
): Promise<{ success: true; data: z.infer<T> } | { success: false; error: ReturnType<typeof createErrorResponse> }> {
  try {
    const contentType = request.headers.get('content-type') || '';

    let data: unknown;

    if (contentType.includes('application/json')) {
      data = await request.json();
    } else if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      data = Object.fromEntries(formData.entries());
    } else if (contentType.includes('application/x-www-form-urlencoded')) {
      const formData = await request.formData();
      data = Object.fromEntries(formData.entries());
    } else {
      return {
        success: false,
        error: createErrorResponse({
          code: ErrorCode.VALIDATION_ERROR,
          message: `Unsupported content type: ${contentType}`,
          status: 415,
        }),
      };
    }

    return validateData(schema, data);
  } catch (error) {
    return {
      success: false,
      error: createErrorResponse(error, 'Request validation failed'),
    };
  }
}
