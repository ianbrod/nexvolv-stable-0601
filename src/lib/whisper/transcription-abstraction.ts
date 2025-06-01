/**
 * Transcription Abstraction Layer
 *
 * This module provides a unified interface for transcription services,
 * supporting both local Whisper model and OpenAI API.
 *
 * For robust error handling in React components, use the TranscriptionErrorBoundary component:
 * import { TranscriptionErrorBoundary } from '@/components/transcription/TranscriptionErrorBoundary';
 */

import { whisperService } from './whisper-service';
import { generateSummaryWithOpenRouter } from '../transcription-service';
import { generateSRTFromSegments } from '../transcription-utils';
import { useAIConfigStore } from '@/stores/aiConfigStore';
import { useWhisperSettingsStore } from '@/stores/whisperSettingsStore';
import { WhisperErrorCategory, categorizeError, getUserFriendlyErrorMessage, handleTranscriptionError } from './error-utils';

// Configuration flag to control OpenRouter summary generation
const ENABLE_OPENROUTER_SUMMARIES = false; // Default to false

// Configuration for transcription
interface TranscriptionConfig {
  useLocalModel: boolean;
  modelName: string;
  language: string;
  temperature: number;
  apiKey?: string;
}

// Default configuration
const defaultConfig: TranscriptionConfig = {
  useLocalModel: true,
  modelName: 'base', // Using base model (confirmed)
  language: 'en',
  temperature: 0
};

// Current configuration
let currentConfig: TranscriptionConfig = { ...defaultConfig };

/**
 * Set the transcription configuration
 */
export function setTranscriptionConfig(config: Partial<TranscriptionConfig>): void {
  currentConfig = { ...currentConfig, ...config };
}

/**
 * Get the current transcription configuration
 */
export function getTranscriptionConfig(): TranscriptionConfig {
  return { ...currentConfig };
}

/**
 * Check if the local model is available
 */
export async function isLocalModelAvailable(): Promise<boolean> {
  return whisperService.isModelAvailable();
}

/**
 * Download the local model
 */
export async function downloadLocalModel(
  onProgress?: (progress: number) => void
): Promise<void> {
  return whisperService.downloadModel(onProgress);
}

/**
 * Transcribe audio using the configured service
 */
export async function transcribeAudio(
  audioBlob: Blob,
  options: {
    onProgress?: (progress: number) => void;
    onStageChange?: (stage: string) => void;
    language?: string;
    initialPrompt?: string;
    generateSummary?: boolean;
    selectedModelId?: string; // Allow client to specify model
  } = {}
): Promise<{
  success: boolean;
  data?: {
    transcription: string;
    summary?: string;
    segments?: any[];
    srtData?: string;
  };
  error?: string;
  errorCategory?: string;
}> {
  try {
    console.log('Starting transcription process with options:', JSON.stringify(options));
    console.log('Audio blob size:', audioBlob.size, 'bytes, type:', audioBlob.type);

    const { onProgress, onStageChange, language, initialPrompt, generateSummary = true, selectedModelId: clientModelId } = options;

    // Update progress
    if (onStageChange) onStageChange('preparing');
    if (onProgress) onProgress(10);

    // Use local model if configured
    console.log('Using local model:', currentConfig.useLocalModel);
    if (currentConfig.useLocalModel) {
      try {
        // Prioritize client-provided model, then store, then default
        let selectedModelId = clientModelId || 'base.en'; // Default fallback

        if (!clientModelId) {
          try {
            selectedModelId = useWhisperSettingsStore.getState().selectedModelId || 'base.en';
            console.log('Selected model from store:', selectedModelId);
          } catch (error) {
            console.log('Store not available (likely server-side), using default model:', selectedModelId);
          }
        } else {
          console.log('Selected model from client:', selectedModelId);
        }

        // Set the current model in the whisper service
        whisperService.setCurrentModel(selectedModelId);

        // Check if model is available
        console.log('Checking if local model is available...');
        const isAvailable = await isLocalModelAvailable();
        console.log('Local model available:', isAvailable);

        if (!isAvailable) {
          console.log(`Local model ${selectedModelId} not available, downloading...`);
          if (onStageChange) onStageChange('downloading-model');
          await whisperService.downloadModel(selectedModelId, (progress) => {
            console.log('Download progress:', progress);
            if (onProgress) onProgress(10 + progress * 0.2);
          });
          console.log('Model download complete');
        }

        // Use Python whisper implementation for transcription
        console.log('Starting transcription with Python backend...');
        if (onStageChange) onStageChange('transcribing');

        console.log('Transcription options:', {
          language: language || currentConfig.language,
          temperature: currentConfig.temperature,
          initialPrompt: initialPrompt ? 'provided' : 'not provided',
          wordTimestamps: true
        });

        const result = await whisperService.transcribeAudio(
          audioBlob,
          {
            language: language || currentConfig.language,
            temperature: currentConfig.temperature,
            initialPrompt,
            wordTimestamps: true
          },
          (progress) => {
            console.log('Python transcription progress:', progress);
            if (onProgress) onProgress(30 + progress * 0.4);
          }
        );

        console.log('Transcription complete, result:', {
          textLength: result.text?.length || 0,
          segmentsCount: result.segments?.length || 0
        });

        // Generate SRT data
        console.log('Generating SRT data...');
        const srtData = generateSRTFromSegments(
          result.segments.map(segment => ({
            text: segment.text,
            start: segment.start,
            end: segment.end
          }))
        );
        console.log('SRT data generated, length:', srtData.length);

        // Create a simple fallback summary
        const wordCount = result.text.split(' ').length;
        const minutes = Math.round((result.segments[result.segments.length - 1]?.end || 0) / 60);
        const fallbackSummary = `<p>Transcription of audio recording (${minutes} minutes, ${wordCount} words).</p>`;

        // Use fallback summary by default
        let summary = fallbackSummary;

        // Generate a summary with OpenRouter only if explicitly enabled
        if (generateSummary && ENABLE_OPENROUTER_SUMMARIES) {
          if (onStageChange) onStageChange('summarizing');

          try {
            console.log('Generating summary...');
            // Check for API key before attempting any API calls
            const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ||
                          (typeof window !== 'undefined' ?
                           useAIConfigStore?.getState()?.openRouterApiKey : '');

            if (apiKey) {
              const summaryResult = await generateSummaryWithOpenRouter(result.text);
              if (summaryResult.success) {
                summary = summaryResult.summary || fallbackSummary;
                console.log('Summary generated, length:', summary.length);
              }
            } else {
              console.log('OpenRouter API key not found, using fallback summary');
            }
          } catch (error) {
            console.error('Error generating summary (non-blocking):', error);
            // Continue with fallback summary
          }
        }

        if (onProgress) onProgress(100);
        if (onStageChange) onStageChange('complete');

        console.log('Transcription process complete, returning results');
        return {
          success: true,
          data: {
            transcription: result.text,
            summary,
            segments: result.segments,
            srtData
          }
        };
      } catch (error) {
        console.error('Error using local transcription:', error);

        // Categorize the error for better reporting
        const errorCategory = error instanceof Error ? categorizeError(error) : WhisperErrorCategory.UNKNOWN;
        console.log(`Local transcription error category: ${errorCategory}`);

        // If local transcription fails and we have an API key, fall back to API
        if (currentConfig.apiKey) {
          console.log('Falling back to API transcription');
          if (onStageChange) onStageChange('falling-back-to-api');

          // Set local model to false temporarily
          const originalConfig = { ...currentConfig };
          currentConfig.useLocalModel = false;

          // Call this function recursively with API
          const result = await transcribeAudio(audioBlob, options);

          // Restore original config
          currentConfig = originalConfig;

          return result;
        }

        // If we can't fall back, use the error handling utility
        return handleTranscriptionError(error, 'local transcription');
      }
    } else {
      // Use OpenAI API for transcription
      if (onStageChange) onStageChange('transcribing-api');

      // Create a FormData object to send the audio file
      const formData = new FormData();

      // Determine the file extension based on the blob type
      let fileExtension = 'webm';
      if (audioBlob.type === 'audio/wav') {
        fileExtension = 'wav';
      } else if (audioBlob.type === 'audio/mp3' || audioBlob.type === 'audio/mpeg') {
        fileExtension = 'mp3';
      } else if (audioBlob.type === 'audio/aac') {
        fileExtension = 'aac';
      }

      formData.append('file', audioBlob, `audio.${fileExtension}`);
      formData.append('model', 'whisper-1');
      formData.append('language', language || currentConfig.language);
      formData.append('response_format', 'verbose_json');
      formData.append('temperature', currentConfig.temperature.toString());

      // Add a detailed prompt for better transcription
      const transcriptionPrompt = initialPrompt ||
        'Please transcribe the following audio with proper punctuation, capitalization, and formatting. ' +
        'Use periods at the end of sentences, capitalize the first word of each sentence, ' +
        'use commas appropriately, and include question marks for questions. ' +
        'Format the text as a properly punctuated paragraph. ' +
        'This is a professional recording, so please maintain formal language and proper grammar.';

      formData.append('prompt', transcriptionPrompt);

      // Use the API key from configuration
      const apiKey = currentConfig.apiKey || process.env.OPENAI_API_KEY;

      if (!apiKey) {
        throw new Error('No API key provided for OpenAI transcription');
      }

      // Send the request to the OpenAI API
      const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`
        },
        body: formData
      });

      if (!response.ok) {
        let errorMessage = `OpenAI API error: Status ${response.status} ${response.statusText}`;

        try {
          const errorData = await response.json();
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          console.error('Could not parse error response as JSON');
        }

        throw new Error(errorMessage);
      }

      // Process the response
      const responseData = await response.json();

      // Extract the transcription text
      const transcription = responseData.text || '';

      // Extract segments with timestamps if available
      const segments = responseData.segments?.map((segment: any) => ({
        id: segment.id,
        text: segment.text,
        start: segment.start,
        end: segment.end,
        words: segment.words
      })) || [];

      // Generate SRT format for compatibility with existing code
      const srtData = generateSRTFromSegments(segments);

      // Create a simple fallback summary
      const wordCount = transcription.split(' ').length;
      const minutes = Math.round((segments[segments.length - 1]?.end || 0) / 60);
      const fallbackSummary = `<p>Transcription of audio recording (${minutes} minutes, ${wordCount} words).</p>`;

      // Use fallback summary by default
      let summary = fallbackSummary;

      // Generate a summary with OpenRouter only if explicitly enabled
      if (generateSummary && ENABLE_OPENROUTER_SUMMARIES) {
        if (onStageChange) onStageChange('summarizing');

        try {
          // Check for API key before attempting any API calls
          const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ||
                        (typeof window !== 'undefined' ?
                         useAIConfigStore.getState().openRouterApiKey : '');

          if (apiKey) {
            const summaryResult = await generateSummaryWithOpenRouter(transcription);
            if (summaryResult.success) {
              summary = summaryResult.summary || fallbackSummary;
            }
          } else {
            console.log('OpenRouter API key not found, using fallback summary');
          }
        } catch (error) {
          console.error('Error generating summary (non-blocking):', error);
          // Continue with fallback summary
        }
      }

      if (onProgress) onProgress(100);
      if (onStageChange) onStageChange('complete');

      return {
        success: true,
        data: {
          transcription,
          summary,
          segments,
          srtData
        }
      };
    }
  } catch (error) {
    console.error('Transcription error:', error);
    console.error('Error stack:', error instanceof Error ? error.stack : 'No stack trace available');

    // Categorize the error
    const errorCategory = error instanceof Error ? categorizeError(error) : WhisperErrorCategory.UNKNOWN;
    const userFriendlyMessage = error instanceof Error ? getUserFriendlyErrorMessage(error) : 'Unknown transcription error';

    // Log additional information about the environment
    console.error('Environment information:');
    console.error('- Node.js version:', process.version);
    console.error('- Platform:', process.platform);
    console.error('- Architecture:', process.arch);
    console.error('- Current working directory:', process.cwd());
    console.error('- Transcription config:', JSON.stringify(currentConfig));
    console.error('- Error category:', errorCategory);

    return {
      success: false,
      error: userFriendlyMessage,
      errorCategory
    };
  }
}
