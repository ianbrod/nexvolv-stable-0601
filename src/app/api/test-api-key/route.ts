import { NextRequest, NextResponse } from 'next/server';

export async function GET(request: NextRequest) {
  try {
    // Get the OpenAI API key from environment variables
    const openaiKey = process.env.OPENAI_API_KEY || 'Not found';
    const openrouterKey = process.env.OPENROUTER_API_KEY || 'Not found';
    
    // Return the first 10 characters of each key for security
    return NextResponse.json({
      openaiKey: openaiKey.substring(0, 10) + '...',
      openrouterKey: openrouterKey.substring(0, 10) + '...',
      envVarsLoaded: !!process.env.OPENAI_API_KEY
    });
  } catch (error) {
    console.error('Error in test-api-key API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
