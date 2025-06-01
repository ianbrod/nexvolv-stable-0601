/**
 * Centralized error handling utilities for NexVolv
 *
 * This module provides standardized error handling functions and types
 * for consistent error management across the application.
 */

import { ZodError } from 'zod';
import { PrismaClientKnownRequestError, PrismaClientValidationError } from '@prisma/client/runtime/library';
import { logError } from '@/lib/debug';

/**
 * Standard error codes used throughout the application
 */
export enum ErrorCode {
  // Validation errors
  VALIDATION_ERROR = 'VALIDATION_ERROR',

  // Database errors
  DATABASE_ERROR = 'DATABASE_ERROR',
  RECORD_NOT_FOUND = 'RECORD_NOT_FOUND',
  UNIQUE_CONSTRAINT = 'UNIQUE_CONSTRAINT',
  FOREIGN_KEY_CONSTRAINT = 'FOREIGN_KEY_CONSTRAINT',

  // Authentication errors
  UNAUTHORIZED = 'UNAUTHORIZED',
  FORBIDDEN = 'FORBIDDEN',

  // API errors
  API_ERROR = 'API_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',

  // General errors
  UNKNOWN_ERROR = 'UNKNOWN_ERROR',
  NOT_IMPLEMENTED = 'NOT_IMPLEMENTED',
  TIMEOUT = 'TIMEOUT',
}

/**
 * Standard error response structure
 */
export interface AppError {
  code: ErrorCode | string;
  message: string;
  details?: unknown;
  status?: number;
}

// Import response types from our centralized type definitions
import {
  SuccessResponse,
  ErrorResponse,
  ApiResponse
} from '@/types/api';

/**
 * Handle server errors in a consistent way
 *
 * @param error The error to handle
 * @param context Optional context information
 * @returns A standardized AppError object
 */
export function handleServerError(error: unknown, context?: string): AppError {
  // Log the error with context
  logError(`Server error${context ? ` in ${context}` : ''}:`, error);

  // Zod validation errors
  if (error instanceof ZodError) {
    return {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Invalid input data',
      details: error.format(),
      status: 400,
    };
  }

  // Prisma known request errors (e.g., unique constraint violations)
  if (error instanceof PrismaClientKnownRequestError) {
    // Handle specific Prisma error codes
    switch (error.code) {
      case 'P2002': // Unique constraint violation
        return {
          code: ErrorCode.UNIQUE_CONSTRAINT,
          message: 'A record with this information already exists',
          details: error.meta,
          status: 409,
        };
      case 'P2003': // Foreign key constraint violation
        return {
          code: ErrorCode.FOREIGN_KEY_CONSTRAINT,
          message: 'Referenced record does not exist',
          details: error.meta,
          status: 400,
        };
      case 'P2025': // Record not found
        return {
          code: ErrorCode.RECORD_NOT_FOUND,
          message: 'Record not found',
          details: error.meta,
          status: 404,
        };
      default:
        return {
          code: ErrorCode.DATABASE_ERROR,
          message: `Database error: ${error.code}`,
          details: error.meta,
          status: 500,
        };
    }
  }

  // Prisma validation errors
  if (error instanceof PrismaClientValidationError) {
    return {
      code: ErrorCode.VALIDATION_ERROR,
      message: 'Invalid database operation',
      details: error.message,
      status: 400,
    };
  }

  // Handle fetch response errors
  if (error instanceof Response || (error && typeof error === 'object' && 'status' in error && 'statusText' in error)) {
    const response = error as Response;
    return {
      code: ErrorCode.API_ERROR,
      message: `API error: ${response.statusText || 'Unknown error'}`,
      details: { status: response.status },
      status: response.status,
    };
  }

  // Handle standard Error objects
  if (error instanceof Error) {
    // Check for specific error types based on name or message
    if (error.message.includes('unauthorized') || error.message.includes('unauthenticated')) {
      return {
        code: ErrorCode.UNAUTHORIZED,
        message: 'Authentication required',
        details: error.message,
        status: 401,
      };
    }

    if (error.message.includes('forbidden') || error.message.includes('not allowed')) {
      return {
        code: ErrorCode.FORBIDDEN,
        message: 'You do not have permission to perform this action',
        details: error.message,
        status: 403,
      };
    }

    if (error.message.includes('not found') || error.message.includes('doesn\'t exist')) {
      return {
        code: ErrorCode.RECORD_NOT_FOUND,
        message: 'The requested resource was not found',
        details: error.message,
        status: 404,
      };
    }

    // Generic error fallback
    return {
      code: ErrorCode.UNKNOWN_ERROR,
      message: error.message || 'An unexpected error occurred',
      details: {
        name: error.name,
        stack: process.env.NODE_ENV === 'development' ? error.stack : undefined,
      },
      status: 500,
    };
  }

  // Handle unknown errors
  return {
    code: ErrorCode.UNKNOWN_ERROR,
    message: 'An unexpected error occurred',
    details: String(error),
    status: 500,
  };
}

/**
 * Create a success response
 *
 * @param data Optional data to include in the response
 * @param message Optional success message
 * @returns A standardized success response
 */
export function createSuccessResponse<T = unknown>(data?: T, message?: string): SuccessResponse<T> {
  return {
    success: true,
    data,
    message,
  };
}

/**
 * Create an error response
 *
 * @param error The error to include in the response
 * @param message Optional error message that overrides the error's message
 * @returns A standardized error response
 */
export function createErrorResponse(error: unknown, message?: string): ErrorResponse {
  const appError = error instanceof Object && 'code' in error && 'message' in error
    ? error as AppError
    : handleServerError(error);

  return {
    success: false,
    error: appError,
    message: message || appError.message,
  };
}
