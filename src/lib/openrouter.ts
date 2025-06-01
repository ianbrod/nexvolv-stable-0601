/**
 * OpenRouter API client for generating summaries and titles
 */

import { useAIConfigStore } from '@/stores/aiConfigStore';

// Define the OpenRouter API URL
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Define the interface for OpenRouter API response
interface OpenRouterResponse {
  id: string;
  choices: {
    index: number;
    message: {
      role: string;
      content: string;
    };
    finish_reason: string;
  }[];
  model: string;
}

// Define available models
export const OPENROUTER_MODELS = {
  // OpenAI models
  'gpt-3.5-turbo': 'openai/gpt-3.5-turbo',
  'gpt-4': 'openai/gpt-4',
  'gpt-4-turbo': 'openai/gpt-4-turbo',

  // Anthropic models
  'claude-3-haiku': 'anthropic/claude-3-haiku',
  'claude-3-sonnet': 'anthropic/claude-3-sonnet',
  'claude-3-opus': 'anthropic/claude-3-opus',

  // Other models
  'mistral-medium': 'mistralai/mistral-medium',
  'llama-3': 'meta-llama/llama-3-8b-instruct',
};

// Default model to use if none is specified
const DEFAULT_MODEL = 'anthropic/claude-3-haiku';

/**
 * Get the OpenRouter API key from the store or environment variables
 */
function getOpenRouterApiKey(): string {
  // Try to get the API key from the store if we're in the browser
  if (typeof window !== 'undefined') {
    try {
      const { openRouterApiKey } = useAIConfigStore.getState();
      if (openRouterApiKey) {
        return openRouterApiKey;
      }
    } catch (error) {
      console.error('Error accessing AI config store:', error);
    }
  }

  // Fallback to environment variable
  return process.env.OPENROUTER_API_KEY || '';
}

/**
 * Get the OpenRouter model from the store or use the default
 */
function getOpenRouterModel(): string {
  // Try to get the model from the store if we're in the browser
  if (typeof window !== 'undefined') {
    try {
      const { openRouterModel } = useAIConfigStore.getState();
      if (openRouterModel) {
        return openRouterModel;
      }
    } catch (error) {
      console.error('Error accessing AI config store:', error);
    }
  }

  // Fallback to default model
  return DEFAULT_MODEL;
}

/**
 * Call the OpenRouter API with a prompt
 * @param prompt - The prompt to send to the API
 * @param model - The model to use (defaults to claude-3-haiku)
 * @param options - Additional options for the API call
 * @returns The generated text
 */
export async function callOpenRouterAPI(
  prompt: string,
  model?: string,
  options: {
    temperature?: number;
    maxTokens?: number;
    retries?: number;
  } = {}
): Promise<string> {
  const { temperature = 0.2, maxTokens = 150, retries = 2 } = options;
  let attempts = 0;

  // Get the model from the parameter or from the store
  const modelToUse = model || getOpenRouterModel();

  while (attempts <= retries) {
    try {
      console.log(`Calling OpenRouter API with model ${modelToUse} (attempt ${attempts + 1}/${retries + 1})`);
      console.log('Prompt (first 100 chars):', prompt.substring(0, 100) + '...');

      // Get the API key
      const apiKey = getOpenRouterApiKey();

      if (!apiKey) {
        throw new Error('OpenRouter API key not found. Please set it in the settings.');
      }

      // For client-side calls, we'll use a server-side API route
      // since API keys shouldn't be exposed in the browser
      if (typeof window !== 'undefined') {
        console.log('Running in browser, using API route for OpenRouter API');

        try {
          // Call our server-side API route
          const response = await fetch('/api/generate-text-openrouter', {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt,
              model: modelToUse,
              temperature,
              maxTokens
            }),
          });

          if (!response.ok) {
            throw new Error(`API route error: ${response.status} ${response.statusText}`);
          }

          const data = await response.json();
          return data.text;
        } catch (error) {
          console.error('Error calling API route:', error);

          // Return a reasonable fallback based on the prompt type
          if (prompt.toLowerCase().includes('title')) {
            return `Recording ${new Date().toLocaleDateString()}`;
          } else if (prompt.toLowerCase().includes('summary')) {
            return 'This recording contains a conversation about important topics discussed during the session.';
          } else {
            return 'Generated content';
          }
        }
      }

      // Server-side API call
      const response = await fetch(OPENROUTER_API_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://nexvolv.app',
          'X-Title': 'NexVolv Captain\'s Log'
        },
        body: JSON.stringify({
          model: modelToUse,
          messages: [
            {
              role: 'user',
              content: prompt
            }
          ],
          temperature: temperature,
          max_tokens: maxTokens
        })
      });

      if (!response.ok) {
        let errorMessage = `OpenRouter API error: ${response.status} ${response.statusText}`;
        try {
          const errorData = await response.json();
          console.error('OpenRouter API error response:', errorData);
          errorMessage = errorData.error?.message || errorMessage;
        } catch (e) {
          console.error('Could not parse error response as JSON');
        }
        throw new Error(errorMessage);
      }

      const data = await response.json() as OpenRouterResponse;
      console.log('OpenRouter API response:', data);

      if (!data.choices || data.choices.length === 0) {
        console.error('No choices in OpenRouter API response');
        throw new Error('No choices in OpenRouter API response');
      }

      const generatedText = data.choices[0].message.content.trim();
      return generatedText;
    } catch (error) {
      console.error(`Error calling OpenRouter API (attempt ${attempts + 1}/${retries + 1}):`, error);

      // If we've reached the maximum number of retries, throw the error
      if (attempts >= retries) {
        throw error;
      }

      // Otherwise, wait before retrying
      await new Promise(resolve => setTimeout(resolve, 1000 * (attempts + 1)));
      attempts++;
    }
  }

  // This should never be reached due to the throw in the catch block
  throw new Error('Failed to call OpenRouter API after multiple attempts');
}

/**
 * Generate a summary of the given text using OpenRouter API
 */
export async function generateSummary(text: string, model?: string): Promise<string> {
  try {
    const prompt = `Please provide a concise summary of this transcription in 2-3 sentences. Focus on the key points and main ideas: ${text}`;
    const summary = await callOpenRouterAPI(prompt, model);
    console.log('Generated summary:', summary);
    return summary;
  } catch (error) {
    console.error('Error generating summary with OpenRouter:', error);
    // Return a fallback summary
    return `Summary of recording: ${text.split(' ').slice(0, 15).join(' ')}...`;
  }
}

/**
 * Generate a title for a recording based on its transcription
 */
export async function generateTitle(text: string, model?: string): Promise<string> {
  try {
    const prompt = `Please generate a concise, descriptive title (5-7 words maximum) for this audio recording based on its transcription. The title should capture the main topic or purpose of the recording: ${text}`;
    const title = await callOpenRouterAPI(prompt, model);
    console.log('Generated title:', title);
    return title;
  } catch (error) {
    console.error('Error generating title with OpenRouter:', error);
    // Return a fallback title
    return `Recording ${new Date().toLocaleDateString()}`;
  }
}
