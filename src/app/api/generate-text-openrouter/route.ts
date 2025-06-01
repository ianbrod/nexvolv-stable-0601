import { NextRequest, NextResponse } from 'next/server';
import { useAIConfigStore } from '@/stores/aiConfigStore';

// Define the OpenRouter API URL
const OPENROUTER_API_URL = 'https://openrouter.ai/api/v1/chat/completions';

// Default model to use if none is specified
const DEFAULT_MODEL = 'anthropic/claude-3-haiku';

/**
 * Get the OpenRouter API key from the environment variables
 * Note: In server components/API routes, we can't access the client-side store
 */
function getOpenRouterApiKey(): string {
  // In server components, we can only use environment variables
  // The API key should be set in the .env file
  const apiKey = process.env.OPENROUTER_API_KEY || '';

  // Log whether we found a key (for debugging)
  if (!apiKey) {
    console.warn('No OpenRouter API key found in environment variables');
  } else {
    console.log('Using OpenRouter API key from environment variables');
  }

  return apiKey;
}

/**
 * Get the OpenRouter model from environment variables or use the default
 * Note: In server components/API routes, we can't access the client-side store
 */
function getOpenRouterModel(): string {
  // In server components, we can only use environment variables
  // If a model is specified in the environment, use that
  const envModel = process.env.OPENROUTER_MODEL || '';

  if (envModel) {
    console.log('Using OpenRouter model from environment variables:', envModel);
    return envModel;
  }

  // Fallback to default model
  console.log('Using default OpenRouter model:', DEFAULT_MODEL);
  return DEFAULT_MODEL;
}

export async function POST(request: NextRequest) {
  try {
    // Parse the request body
    const body = await request.json();
    const { prompt, model, temperature = 0.2, maxTokens = 150 } = body;

    if (!prompt) {
      return NextResponse.json(
        { error: 'Prompt is required' },
        { status: 400 }
      );
    }

    // Get the model from the request or from the store
    const modelToUse = model || getOpenRouterModel();

    console.log('Calling OpenRouter API with prompt:', prompt.substring(0, 100) + '...');
    console.log('Using model:', modelToUse);

    // Get the API key
    const apiKey = getOpenRouterApiKey();

    if (!apiKey) {
      console.error('OpenRouter API key not found');

      // For title generation, provide a fallback title instead of failing
      if (prompt.toLowerCase().includes('title')) {
        const fallbackTitle = `Recording ${new Date().toLocaleDateString()}`;
        console.log('Using fallback title:', fallbackTitle);
        return NextResponse.json({ text: fallbackTitle });
      }

      // For summary generation, provide a fallback summary
      if (prompt.toLowerCase().includes('summary')) {
        const fallbackSummary = 'This recording contains a conversation about important topics discussed during the session.';
        console.log('Using fallback summary:', fallbackSummary);
        return NextResponse.json({ text: fallbackSummary });
      }

      return NextResponse.json(
        { error: 'OpenRouter API key not found. Please set it in the settings.' },
        { status: 500 }
      );
    }

    // Call the OpenRouter API
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
      console.error('OpenRouter API error:', response.status, response.statusText);

      // Try to get more detailed error information
      let errorMessage = `Status ${response.status} ${response.statusText}`;
      try {
        const errorData = await response.json();
        console.error('Error details:', errorData);
        errorMessage = errorData.error?.message || errorMessage;
      } catch (e) {
        console.error('Could not parse error response as JSON');
      }

      // For title generation, provide a fallback title instead of failing
      if (prompt.toLowerCase().includes('title')) {
        const fallbackTitle = `Recording ${new Date().toLocaleDateString()}`;
        console.log('Using fallback title:', fallbackTitle);
        return NextResponse.json({ text: fallbackTitle });
      }

      // For summary generation, provide a fallback summary
      if (prompt.toLowerCase().includes('summary')) {
        const fallbackSummary = 'This recording contains a conversation about important topics discussed during the session.';
        console.log('Using fallback summary:', fallbackSummary);
        return NextResponse.json({ text: fallbackSummary });
      }

      return NextResponse.json(
        { error: `OpenRouter API error: ${errorMessage}` },
        { status: 500 }
      );
    }

    // Parse the response
    const data = await response.json();

    if (!data.choices || data.choices.length === 0) {
      console.error('No choices in OpenRouter API response');

      // Provide fallbacks based on the prompt type
      if (prompt.toLowerCase().includes('title')) {
        return NextResponse.json({ text: `Recording ${new Date().toLocaleDateString()}` });
      } else if (prompt.toLowerCase().includes('summary')) {
        return NextResponse.json({
          text: 'This recording contains a conversation about important topics discussed during the session.'
        });
      } else {
        return NextResponse.json({ text: 'Generated content' });
      }
    }

    // Extract the generated text
    const generatedText = data.choices[0].message.content.trim();

    // Return the generated text
    return NextResponse.json({ text: generatedText });
  } catch (error) {
    console.error('Error in generate-text-openrouter API route:', error);

    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'An unknown error occurred' },
      { status: 500 }
    );
  }
}
