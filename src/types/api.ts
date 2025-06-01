/**
 * API Response Types
 * 
 * This file contains type definitions for API responses used throughout the application.
 * It provides a consistent structure for all API responses and error handling.
 */

import { ErrorCode } from '@/lib/error-handling';

/**
 * Base API response interface
 */
export interface BaseResponse {
  success: boolean;
  message?: string;
}

/**
 * Success response with optional data
 */
export interface SuccessResponse<T = unknown> extends BaseResponse {
  success: true;
  data?: T;
}

/**
 * Standard error structure
 */
export interface AppError {
  code: ErrorCode | string;
  message: string;
  details?: unknown;
  status?: number;
}

/**
 * Error response
 */
export interface ErrorResponse extends BaseResponse {
  success: false;
  error: AppError;
}

/**
 * Union type for all API responses
 */
export type ApiResponse<T = unknown> = SuccessResponse<T> | ErrorResponse;

/**
 * Type guard to check if a response is a success response
 */
export function isSuccessResponse<T>(response: ApiResponse<T>): response is SuccessResponse<T> {
  return response.success === true;
}

/**
 * Type guard to check if a response is an error response
 */
export function isErrorResponse(response: ApiResponse<any>): response is ErrorResponse {
  return response.success === false;
}

/**
 * Pagination metadata
 */
export interface PaginationMeta {
  currentPage: number;
  totalPages: number;
  pageSize: number;
  totalItems: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
}

/**
 * Paginated response
 */
export interface PaginatedResponse<T> extends SuccessResponse<T[]> {
  pagination: PaginationMeta;
}

/**
 * Type guard to check if a response is a paginated response
 */
export function isPaginatedResponse<T>(response: ApiResponse<any>): response is PaginatedResponse<T> {
  return response.success === true && 'pagination' in response;
}
