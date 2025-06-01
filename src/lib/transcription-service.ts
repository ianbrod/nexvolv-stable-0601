/**
 * Transcription service for handling OpenAI and OpenRouter API calls
 */

import { useAIConfigStore } from '@/stores/aiConfigStore';

/**
 * Transcribe audio using OpenAI Whisper API
 */
export async function transcribeWithOpenAI(audioFile: File) {
  try {
    // Create a FormData object to send the audio file
    const formData = new FormData();

    // Determine the file extension based on the blob type
    let fileExtension = 'webm';
    if (audioFile.type === 'audio/wav') {
      fileExtension = 'wav';
    } else if (audioFile.type === 'audio/mp3' || audioFile.type === 'audio/mpeg') {
      fileExtension = 'mp3';
    } else if (audioFile.type === 'audio/aac') {
      fileExtension = 'aac';
    }

    formData.append('file', audioFile, `audio.${fileExtension}`);
    formData.append('model', 'whisper-1');
    formData.append('language', 'en');
    formData.append('response_format', 'verbose_json');
    formData.append('temperature', '0');

    // Add a detailed prompt for better transcription
    const transcriptionPrompt = 'Please transcribe the following audio with proper punctuation, capitalization, and formatting. ' +
      'Use periods at the end of sentences, capitalize the first word of each sentence, ' +
      'use commas appropriately, and include question marks for questions. ' +
      'Format the text as a properly punctuated paragraph. ' +
      'This is a professional recording, so please maintain formal language and proper grammar.';

    formData.append('prompt', transcriptionPrompt);

    // Use the API key from environment variables or fallback to the provided key
    const apiKey = process.env.OPENAI_API_KEY || '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';

    console.log('Using OpenAI API key (first 10 chars):', apiKey.substring(0, 10) + '...');

    // Send the request to the OpenAI API
    const response = await fetch('https://api.openai.com/v1/audio/transcriptions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`
      },
      body: formData
    });

    if (!response.ok) {
      console.error(`OpenAI API error: Status ${response.status} ${response.statusText}`);
      let errorMessage = `Status ${response.status} ${response.statusText}`;

      try {
        const errorData = await response.json();
        errorMessage = errorData.error?.message || errorMessage;
        console.error('Error details:', errorData);
      } catch (e) {
        console.error('Could not parse error response as JSON');
      }

      return {
        success: false,
        error: `OpenAI API error: ${errorMessage}`
      };
    }

    // Get the transcription data
    const transcriptionData = await response.json();

    // Process the segments if available
    let segments = [];
    let srtData = '';

    if (transcriptionData.segments) {
      segments = transcriptionData.segments.map((segment: any) => ({
        text: segment.text,
        start: segment.start,
        end: segment.end
      }));

      // Generate SRT data
      srtData = transcriptionData.segments.map((segment: any, index: number) => {
        const startTime = formatSRTTime(segment.start);
        const endTime = formatSRTTime(segment.end);
        return `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
      }).join('\n');
    }

    return {
      success: true,
      transcription: transcriptionData.text,
      segments,
      srtData
    };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred during transcription'
    };
  }
}

/**
 * Generate a summary using OpenRouter API
 */
export async function generateSummaryWithOpenRouter(transcription: string) {
  // Check for API key before attempting any API calls
  const apiKey = process.env.NEXT_PUBLIC_OPENROUTER_API_KEY ||
                (typeof window !== 'undefined' ?
                 useAIConfigStore?.getState()?.openRouterApiKey : '');

  if (!apiKey) {
    console.log('OpenRouter API key not found, skipping summary generation');
    return { success: false, error: 'API key not configured' };
  }

  try {
    // Import the OpenRouter module
    const { callOpenRouterAPI } = await import('@/lib/openrouter');

    // Define the prompt with the specific formatting requirements
    const prompt = `Please analyze this transcription and provide your response in the following format EXACTLY:

A concise summary in 1-2 sentences.

<h3>Key Points</h3>
<ul>
<li>First key point</li>
<li>Second key point</li>
<li>Third key point</li>
<li>Add more if needed, up to 5 points</li>
</ul>

<h3>Action Items</h3>
<ul>
<li>First action item</li>
<li>Additional action items if present</li>
</ul>

IMPORTANT FORMATTING INSTRUCTIONS:
1. Do NOT include a "Summary" header - just start with the summary text directly
2. Use the exact HTML tags as shown above (<h3>, <ul>, <li>) for other sections
3. Do not use markdown formatting (no ## or * symbols)
4. Only include Action Items section if there are clear tasks mentioned
5. Be concise but comprehensive
6. Make sure to close all HTML tags properly
7. Do NOT use square brackets [] in your response
8. ONLY include the Action Items section if there are clear tasks mentioned

Transcription: ${transcription}`;

    console.log('Generating summary with prompt length:', prompt.length);

    try {
      // Call the OpenRouter API with the prompt - model will be taken from the store
      const summary = await callOpenRouterAPI(prompt, undefined, {
        temperature: 0.2,
        maxTokens: 800  // Increased token limit for longer summaries
      });

      console.log('Summary generated successfully, length:', summary.length);

      // Return the summary
      return {
        success: true,
        summary
      };
    } catch (summaryError) {
      console.error('Error calling OpenRouter API for summary:', summaryError);

      // Create a fallback summary
      const fallbackSummary = `<p>This recording contains a conversation that was transcribed. The transcription begins with "${transcription.substring(0, 100)}..."</p>
<h3>Key Points</h3>
<ul>
<li>Transcription was generated but summary could not be created</li>
<li>Recording length: ${transcription.split(' ').length} words</li>
</ul>`;

      return {
        success: true,
        summary: fallbackSummary
      };
    }
  } catch (error) {
    console.error('Error generating summary:', error);

    // Create a fallback summary even for outer errors
    const fallbackSummary = `<p>This recording contains a conversation that was transcribed.</p>
<h3>Key Points</h3>
<ul>
<li>Transcription was generated but summary could not be created</li>
<li>Recording length: ${transcription.split(' ').length} words</li>
</ul>`;

    // Return a success with fallback summary instead of an error
    // This ensures the UI always has something to display
    return {
      success: true,
      summary: fallbackSummary
    };
  }
}

// Helper function to format time for SRT
function formatSRTTime(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 1000);

  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}
