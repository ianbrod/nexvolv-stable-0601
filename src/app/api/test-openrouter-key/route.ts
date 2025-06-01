import { NextRequest, NextResponse } from 'next/server';

/**
 * Tests an OpenRouter API key by making a minimal request to the OpenRouter API
 */
export async function POST(request: NextRequest) {
  try {
    // Parse the request body to get the API key
    const body = await request.json();
    const { apiKey } = body;

    if (!apiKey) {
      return NextResponse.json(
        { success: false, error: 'API key is required' },
        { status: 400 }
      );
    }

    // Validate the API key format
    if (!apiKey.startsWith('sk-or-')) {
      return NextResponse.json(
        { success: false, error: 'Invalid API key format. OpenRouter API keys should start with "sk-or-"' },
        { status: 400 }
      );
    }

    try {
      // Make a minimal request to the OpenRouter API to check if the key is valid
      // We're using the models endpoint which is lightweight and doesn't consume tokens
      const response = await fetch('https://openrouter.ai/api/v1/models', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'https://nexvolv.app',
          'X-Title': 'NexVolv Captain\'s Log'
        }
      });

      // Check if the request was successful
      if (response.ok) {
        // Verify that we actually got models back to confirm the key is valid
        const data = await response.json();

        if (!data.data || !Array.isArray(data.data) || data.data.length === 0) {
          return NextResponse.json(
            {
              success: false,
              error: 'Invalid API key - no models returned',
              status: 401
            },
            { status: 401 }
          );
        }

        // Return success with the first few characters of the API key for confirmation
        return NextResponse.json({
          success: true,
          message: 'API key is valid',
          keyPreview: apiKey.substring(0, 10) + '...'
        });
      } else {
        // If the response is not OK, parse the error message
        const errorData = await response.json();
        return NextResponse.json(
          {
            success: false,
            error: errorData.error?.message || 'Invalid API key',
            status: response.status
          },
          { status: response.status }
        );
      }
    } catch (fetchError) {
      console.error('Error fetching from OpenRouter API:', fetchError);
      return NextResponse.json(
        {
          success: false,
          error: 'Error connecting to OpenRouter API. Please check your internet connection and try again.'
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error('Error testing OpenRouter API key:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'An unknown error occurred'
      },
      { status: 500 }
    );
  }
}
