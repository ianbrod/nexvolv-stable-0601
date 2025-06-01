import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/whisper/transcription-abstraction';

// Set maximum duration for large file re-transcription (15 minutes)
export const maxDuration = 900;

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;
    const entryId = formData.get('entryId') as string;

    if (!audioFile) {
      return NextResponse.json(
        { error: 'No audio file provided' },
        { status: 400 }
      );
    }

    if (!entryId) {
      return NextResponse.json(
        { error: 'No entry ID provided' },
        { status: 400 }
      );
    }

    // Convert the File to a Blob
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type });

    // Create progress and stage change handlers for logging
    const progressHandler = (progress: number) => {
      console.log(`Re-transcription progress: ${progress}%`);
    };

    const stageChangeHandler = (stage: string) => {
      console.log(`Re-transcription stage: ${stage}`);
    };

    // Call the transcribeAudio function from the abstraction layer
    const result = await transcribeAudio(audioBlob, {
      onProgress: progressHandler,
      onStageChange: stageChangeHandler,
      generateSummary: true
    });

    if (!result.success) {
      // Handle re-transcription failure
      return NextResponse.json(
        { error: result.error || 'Re-transcription failed' },
        { status: 500 }
      );
    }

    const response = {
      transcription: result.data?.transcription || '',
      summary: result.data?.summary || '',
      segments: result.data?.segments || [],
      srtData: result.data?.srtData || ''
    };

    // Return the re-transcription response

    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in re-transcribe API route:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}
