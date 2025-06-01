'use server';

import { LogEntry } from '@/types';

/**
 * Parse SRT format data into segments with timestamps
 * SRT format example:
 * 1
 * 00:00:00,000 --> 00:00:05,000
 * This is the first segment of text.
 *
 * 2
 * 00:00:05,000 --> 00:00:10,000
 * This is the second segment of text.
 */
interface TranscriptSegment {
  index: number;
  startTime: number; // in seconds
  endTime: number; // in seconds
  text: string;
}

function parseSRT(srtData: string): { plainText: string; segments: TranscriptSegment[] } {
  // Initialize result
  const segments: TranscriptSegment[] = [];
  let plainText = '';

  // Split the SRT data by double newline (which separates entries)
  const entries = srtData.trim().split(/\n\s*\n/);

  for (const entry of entries) {
    // Split each entry into lines
    const lines = entry.trim().split('\n');

    // Need at least 3 lines for a valid entry (index, timestamp, text)
    if (lines.length < 3) continue;

    // Parse the index
    const index = parseInt(lines[0].trim());
    if (isNaN(index)) continue;

    // Parse the timestamp line
    const timestampMatch = lines[1].match(/([\d:,]+)\s*-->\s*([\d:,]+)/);
    if (!timestampMatch) continue;

    // Convert timestamp from HH:MM:SS,mmm format to seconds
    const startTime = parseTimestamp(timestampMatch[1]);
    const endTime = parseTimestamp(timestampMatch[2]);

    // Get the text (could be multiple lines)
    const text = lines.slice(2).join(' ').trim();

    // Add to segments
    segments.push({
      index,
      startTime,
      endTime,
      text
    });

    // Add to plain text with a space
    plainText += (plainText ? ' ' : '') + text;
  }

  return { plainText, segments };
}

/**
 * Parse timestamp from HH:MM:SS,mmm format to seconds
 */
function parseTimestamp(timestamp: string): number {
  // Format: HH:MM:SS,mmm
  const parts = timestamp.split(':');
  if (parts.length !== 3) return 0;

  const hours = parseInt(parts[0]);
  const minutes = parseInt(parts[1]);

  // The seconds part may contain milliseconds after a comma or period
  const secondsParts = parts[2].replace(',', '.').split('.');
  const seconds = parseInt(secondsParts[0]);
  const milliseconds = secondsParts.length > 1 ? parseInt(secondsParts[1]) / 1000 : 0;

  return hours * 3600 + minutes * 60 + seconds + milliseconds;
}

/**
 * Generate SRT format from segments
 */
function generateSRTFromSegments(segments: Array<{ text: string; start: number; end: number }>): string {
  if (!segments || !Array.isArray(segments) || segments.length === 0) {
    return '';
  }

  try {
    const srtParts: string[] = [];

    segments.forEach((segment, index) => {
      // Format the timestamps
      const startTime = formatTimestamp(segment.start);
      const endTime = formatTimestamp(segment.end);

      // Create the SRT entry
      const srtEntry = `${index + 1}\n${startTime} --> ${endTime}\n${segment.text}\n`;
      srtParts.push(srtEntry);
    });

    return srtParts.join('\n');
  } catch (error) {
    console.error('Error generating SRT data:', error);
    return '';
  }
}

/**
 * Format seconds to SRT timestamp format (00:00:00,000)
 */
function formatTimestamp(seconds: number): string {
  if (isNaN(seconds) || !isFinite(seconds) || seconds < 0) {
    return '00:00:00,000';
  }

  try {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);
    const milliseconds = Math.floor((seconds % 1) * 1000);

    return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${milliseconds.toString().padStart(3, '0')}`;
  } catch (error) {
    console.error('Error formatting timestamp:', error);
    return '00:00:00,000';
  }
}
import { revalidatePath } from 'next/cache';

// In a real implementation, these functions would interact with a database
// For now, we'll use mock data and localStorage in the client components

/**
 * Get all log entries
 */
export async function getLogEntries(): Promise<{ success: boolean; data?: LogEntry[]; error?: string }> {
  try {
    // Mock implementation - in a real app, this would fetch from a database
    return {
      success: true,
      data: [] // We'll use client-side state for now
    };
  } catch (error) {
    console.error('Error fetching log entries:', error);
    return {
      success: false,
      error: 'Failed to fetch log entries'
    };
  }
}

/**
 * Get a single log entry by ID
 */
export async function getLogEntryById(id: string): Promise<{ success: boolean; data?: LogEntry; error?: string }> {
  try {
    // Mock implementation
    return {
      success: true,
      data: undefined // We'll use client-side state for now
    };
  } catch (error) {
    console.error(`Error fetching log entry ${id}:`, error);
    return {
      success: false,
      error: 'Failed to fetch log entry'
    };
  }
}

/**
 * Create a new log entry
 */
export async function createLogEntry(entry: Omit<LogEntry, 'id' | 'createdAt' | 'updatedAt'>): Promise<{ success: boolean; data?: LogEntry; error?: string }> {
  try {
    // Mock implementation
    const newEntry: LogEntry = {
      ...entry,
      id: Date.now().toString(),
      createdAt: new Date(),
      updatedAt: new Date()
    };

    revalidatePath('/captainslog');

    return {
      success: true,
      data: newEntry
    };
  } catch (error) {
    console.error('Error creating log entry:', error);
    return {
      success: false,
      error: 'Failed to create log entry'
    };
  }
}

/**
 * Update an existing log entry
 */
export async function updateLogEntry(id: string, updates: Partial<LogEntry>): Promise<{ success: boolean; data?: LogEntry; error?: string }> {
  try {
    // Mock implementation
    revalidatePath('/captainslog');

    return {
      success: true,
      data: undefined // We'll use client-side state for now
    };
  } catch (error) {
    console.error(`Error updating log entry ${id}:`, error);
    return {
      success: false,
      error: 'Failed to update log entry'
    };
  }
}

/**
 * Delete a log entry
 */
export async function deleteLogEntry(id: string): Promise<{ success: boolean; error?: string }> {
  try {
    // Mock implementation
    revalidatePath('/captainslog');

    return {
      success: true
    };
  } catch (error) {
    console.error(`Error deleting log entry ${id}:`, error);
    return {
      success: false,
      error: 'Failed to delete log entry'
    };
  }
}

/**
 * Transcribe audio using local Whisper model
 */
export async function transcribeAudio(audioBlob: Blob): Promise<{ success: boolean; data?: { transcription: string; summary?: string; segments?: any[]; srtData?: string }; error?: string }> {
  try {
    // Import the transcription abstraction layer
    const { transcribeAudio: transcribeWithAbstraction } = await import('@/lib/whisper/transcription-abstraction');

    // Call the transcription function from the abstraction layer
    console.log('Using local Whisper model for transcription');

    const result = await transcribeWithAbstraction(audioBlob, {
      generateSummary: true
    });

    if (!result.success) {
      throw new Error(result.error || 'Transcription failed');
    }

    // Return the transcription result
    return {
      success: true,
      data: {
        transcription: result.data?.transcription || '',
        summary: result.data?.summary || '',
        segments: result.data?.segments || [],
        srtData: result.data?.srtData || ''
      }
    };
  } catch (error) {
    console.error('Error transcribing audio:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to transcribe audio'
    };
  }
}

/**
 * Generate suggestions from transcription
 */
export async function generateSuggestions(transcription: string): Promise<{ success: boolean; data?: { suggestedTasks?: string[]; suggestedGoals?: string[] }; error?: string }> {
  try {
    // Use OpenAI API to generate suggestions
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${process.env.OPENAI_API_KEY}`
      },
      body: JSON.stringify({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'system',
            content: `You are a helpful assistant that analyzes text and extracts potential tasks and goals.
                     Provide your response in JSON format with two arrays:
                     1. suggestedTasks: A list of 3-5 specific, actionable tasks
                     2. suggestedGoals: A list of 1-3 broader goals or objectives`
          },
          {
            role: 'user',
            content: `Based on this transcription, what tasks and goals can you identify? ${transcription}`
          }
        ],
        response_format: { type: "json_object" },
        max_tokens: 500
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(`OpenAI API error: ${errorData.error?.message || response.statusText}`);
    }

    const data = await response.json();
    const content = data.choices[0]?.message?.content || '{}';

    try {
      // Parse the JSON response
      const parsedContent = JSON.parse(content);

      return {
        success: true,
        data: {
          suggestedTasks: parsedContent.suggestedTasks || [],
          suggestedGoals: parsedContent.suggestedGoals || []
        }
      };
    } catch (parseError) {
      console.error('Error parsing OpenAI response:', parseError);
      // Fallback to default suggestions if parsing fails
      return {
        success: true,
        data: {
          suggestedTasks: [
            "Review the transcribed content",
            "Organize key points from the recording"
          ],
          suggestedGoals: [
            "Improve documentation of ideas"
          ]
        }
      };
    }
  } catch (error) {
    console.error('Error generating suggestions:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to generate suggestions'
    };
  }
}
