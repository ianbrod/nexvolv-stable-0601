/**
 * Error utilities for Whisper transcription
 * 
 * This module provides error categorization and handling utilities for the Whisper transcription service.
 */

/**
 * Error categories for Whisper transcription
 */
export enum WhisperErrorCategory {
  PYTHON_ENVIRONMENT = 'python_environment',
  MODEL_LOADING = 'model_loading',
  TRANSCRIPTION = 'transcription',
  STORAGE = 'storage',
  API = 'api',
  UNKNOWN = 'unknown'
}

/**
 * Categorize an error based on its message
 */
export function categorizeError(error: Error): WhisperErrorCategory {
  const message = error.message.toLowerCase();
  
  if (message.includes('python') || message.includes('command failed')) {
    return WhisperErrorCategory.PYTHON_ENVIRONMENT;
  }
  
  if (message.includes('model') || message.includes('download')) {
    return WhisperErrorCategory.MODEL_LOADING;
  }
  
  if (message.includes('transcri') || message.includes('audio')) {
    return WhisperErrorCategory.TRANSCRIPTION;
  }
  
  if (message.includes('storage') || message.includes('quota') || message.includes('indexeddb')) {
    return WhisperErrorCategory.STORAGE;
  }
  
  if (message.includes('api') || message.includes('openrouter')) {
    return WhisperErrorCategory.API;
  }
  
  return WhisperErrorCategory.UNKNOWN;
}

/**
 * Get a user-friendly error message based on category
 */
export function getUserFriendlyErrorMessage(error: Error): string {
  const category = categorizeError(error);
  
  switch (category) {
    case WhisperErrorCategory.PYTHON_ENVIRONMENT:
      return 'Python environment issue detected. Please ensure Python 3.8+ is installed and available in your PATH.';
    
    case WhisperErrorCategory.MODEL_LOADING:
      return 'Failed to load the Whisper model. Please check your internet connection and try again.';
    
    case WhisperErrorCategory.TRANSCRIPTION:
      return 'Transcription failed. Please try with a different audio file or check the audio format.';
    
    case WhisperErrorCategory.STORAGE:
      return 'Storage error. You may have reached your browser storage limit. Try deleting some entries.';
    
    case WhisperErrorCategory.API:
      return 'API error. Please check your API key and internet connection.';
    
    default:
      return `An unexpected error occurred: ${error.message}`;
  }
}

/**
 * Handle a transcription error with proper logging and categorization
 */
export function handleTranscriptionError(
  error: unknown, 
  context: string
): { success: false; error: string; errorCategory: WhisperErrorCategory } {
  console.error(`Error in ${context}:`, error);
  
  const actualError = error instanceof Error ? error : new Error(String(error));
  const errorCategory = categorizeError(actualError);
  const userFriendlyMessage = getUserFriendlyErrorMessage(actualError);
  
  console.error(`Error category: ${errorCategory}`);
  console.error(`Error stack:`, actualError.stack || 'No stack trace available');
  
  return {
    success: false,
    error: userFriendlyMessage,
    errorCategory
  };
}
