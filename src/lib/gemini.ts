/**
 * AI client for generating summaries and titles
 *
 * This module previously used Gemini API but now uses OpenRouter.
 * The function names are kept the same for backward compatibility.
 */

// Import the OpenRouter module
import { callOpenRouterAPI } from './openrouter';

/**
 * Call the AI API with a prompt (now uses OpenRouter instead of Gemini)
 * @param prompt - The prompt to send to the API
 * @returns The generated text
 */
async function callGeminiAPI(prompt: string): Promise<string> {
  try {
    console.log('Calling OpenRouter API (via Gemini compatibility layer) with prompt:', prompt.substring(0, 100) + '...');

    // For client-side calls, we'll use a server-side API route
    // since API keys shouldn't be exposed in the browser
    if (typeof window !== 'undefined') {
      console.log('Running in browser, using API route for OpenRouter API');

      try {
        // Call our server-side API route (now using the OpenRouter route)
        // The model will be determined by the server based on the user's settings
        const response = await fetch('/api/generate-text-openrouter', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            prompt,
            temperature: 0.2,
            maxTokens: 150
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
        if (prompt.includes('title')) {
          return `Recording ${new Date().toLocaleDateString()}`;
        } else if (prompt.includes('summary')) {
          return 'This recording contains a conversation about important topics discussed during the session.';
        } else {
          return 'Generated content';
        }
      }
    }

    // Server-side API call - use OpenRouter directly with model from store
    return await callOpenRouterAPI(prompt, undefined, {
      temperature: 0.2,
      maxTokens: 150
    });
  } catch (error) {
    console.error('Error calling AI API:', error);
    throw error;
  }
}

/**
 * Generate a summary of the given text using OpenRouter API
 * (previously used Gemini API, function name kept for backward compatibility)
 */
export async function generateSummary(text: string): Promise<string> {
  try {
    const prompt = `Please provide a concise summary of this transcription in 2-3 sentences. Focus on the key points and main ideas: ${text}`;
    const summary = await callGeminiAPI(prompt);
    console.log('Generated summary:', summary);
    return summary;
  } catch (error) {
    console.error('Error generating summary with OpenRouter:', error);
    // Return a fallback summary
    return `Summary of recording: ${text.split(' ').slice(0, 15).join(' ')}...`;
  }
}

/**
 * Generate a title for a recording based on its transcription using OpenRouter API
 * (previously used Gemini API, function name kept for backward compatibility)
 */
export async function generateTitle(text: string): Promise<string> {
  try {
    const prompt = `Please generate a concise, descriptive title (5-7 words maximum) for this audio recording based on its transcription. The title should capture the main topic or purpose of the recording: ${text}`;
    const title = await callGeminiAPI(prompt);
    console.log('Generated title:', title);
    return title;
  } catch (error) {
    console.error('Error generating title with OpenRouter:', error);
    // Return a fallback title
    return `Recording ${new Date().toLocaleDateString()}`;
  }
}
