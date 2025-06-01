import { 
  handleServerError, 
  createSuccessResponse, 
  createErrorResponse, 
  ErrorCode 
} from '@/lib/error-handling';
import { ZodError, z } from 'zod';
import { PrismaClientKnownRequestError } from '@prisma/client/runtime/library';

// Mock the logError function
jest.mock('@/lib/debug', () => ({
  logError: jest.fn(),
}));

describe('Error Handling Utilities', () => {
  describe('handleServerError', () => {
    it('should handle Zod validation errors', () => {
      // Create a Zod error
      const schema = z.object({
        name: z.string().min(3),
        email: z.string().email(),
      });
      
      let zodError: ZodError;
      try {
        schema.parse({ name: 'a', email: 'invalid-email' });
      } catch (error) {
        zodError = error as ZodError;
        
        // Test the error handling
        const result = handleServerError(zodError);
        
        expect(result.code).toBe(ErrorCode.VALIDATION_ERROR);
        expect(result.message).toBe('Invalid input data');
        expect(result.status).toBe(400);
        expect(result.details).toBeDefined();
      }
    });
    
    it('should handle Prisma known request errors', () => {
      // Create a mock Prisma error for unique constraint violation
      const prismaError = new PrismaClientKnownRequestError(
        'Unique constraint failed on the fields: (`email`)',
        {
          code: 'P2002',
          clientVersion: '4.0.0',
          meta: { target: ['email'] }
        }
      );
      
      const result = handleServerError(prismaError);
      
      expect(result.code).toBe(ErrorCode.UNIQUE_CONSTRAINT);
      expect(result.message).toBe('A record with this information already exists');
      expect(result.status).toBe(409);
      expect(result.details).toEqual({ target: ['email'] });
    });
    
    it('should handle standard Error objects', () => {
      const error = new Error('Something went wrong');
      
      const result = handleServerError(error);
      
      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.message).toBe('Something went wrong');
      expect(result.status).toBe(500);
      expect(result.details).toBeDefined();
    });
    
    it('should handle unknown errors', () => {
      const result = handleServerError('This is not an Error object');
      
      expect(result.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.message).toBe('An unexpected error occurred');
      expect(result.status).toBe(500);
      expect(result.details).toBe('This is not an Error object');
    });
    
    it('should include context in the log message if provided', () => {
      const logError = require('@/lib/debug').logError;
      const error = new Error('Test error');
      
      handleServerError(error, 'test-context');
      
      expect(logError).toHaveBeenCalledWith('Server error in test-context:', error);
    });
  });
  
  describe('createSuccessResponse', () => {
    it('should create a success response with data', () => {
      const data = { id: '1', name: 'Test' };
      
      const result = createSuccessResponse(data, 'Success message');
      
      expect(result.success).toBe(true);
      expect(result.data).toBe(data);
      expect(result.message).toBe('Success message');
    });
    
    it('should create a success response without data', () => {
      const result = createSuccessResponse(undefined, 'Success message');
      
      expect(result.success).toBe(true);
      expect(result.data).toBeUndefined();
      expect(result.message).toBe('Success message');
    });
  });
  
  describe('createErrorResponse', () => {
    it('should create an error response from an AppError object', () => {
      const appError = {
        code: ErrorCode.VALIDATION_ERROR,
        message: 'Validation failed',
        details: { field: 'error' },
        status: 400
      };
      
      const result = createErrorResponse(appError);
      
      expect(result.success).toBe(false);
      expect(result.error).toBe(appError);
      expect(result.message).toBe('Validation failed');
    });
    
    it('should create an error response from a standard Error', () => {
      const error = new Error('Something went wrong');
      
      const result = createErrorResponse(error);
      
      expect(result.success).toBe(false);
      expect(result.error.code).toBe(ErrorCode.UNKNOWN_ERROR);
      expect(result.message).toBe('Something went wrong');
    });
    
    it('should override the error message if provided', () => {
      const error = new Error('Original message');
      
      const result = createErrorResponse(error, 'Custom message');
      
      expect(result.success).toBe(false);
      expect(result.message).toBe('Custom message');
    });
  });
});
