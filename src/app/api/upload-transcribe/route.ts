import { NextRequest, NextResponse } from 'next/server';
import { transcribeAudio } from '@/lib/whisper/transcription-abstraction';

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const audioFile = formData.get('audio') as File;

    if (!audioFile) {
      return NextResponse.json(
        { success: false, error: 'No audio file provided' },
        { status: 400 }
      );
    }

    console.log('Received audio file:', audioFile.name, audioFile.type, `${audioFile.size / 1024 / 1024} MB`);

    // Convert the File to a Blob
    const audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type });

    // Create progress and stage change handlers for logging
    const progressHandler = (progress: number) => {
      console.log(`Transcription progress: ${progress}%`);
    };

    const stageChangeHandler = (stage: string) => {
      console.log(`Transcription stage: ${stage}`);
    };

    // Transcribe the audio using the abstraction layer
    const result = await transcribeAudio(audioBlob, {
      onProgress: progressHandler,
      onStageChange: stageChangeHandler,
      generateSummary: true
    });

    if (!result.success) {
      return NextResponse.json(
        { success: false, error: result.error },
        { status: 500 }
      );
    }

    // Extract the data from the result
    const transcription = result.data?.transcription || '';
    const summary = result.data?.summary || '';
    const segments = result.data?.segments || [];
    const srtData = result.data?.srtData || '';

    // Return the results
    return NextResponse.json({
      success: true,
      data: {
        transcription: transcription,
        summary: summary,
        segments: segments,
        srtData: srtData
      }
    });
  } catch (error) {
    console.error('Error in upload-transcribe API route:', error);
    return NextResponse.json(
      {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred'
      },
      { status: 500 }
    );
  }
}
