import { NextRequest, NextResponse } from 'next/server';
import { dataURLToBlob } from '@/lib/audio-chunker';
import { transcribeAudio } from '@/lib/whisper/transcription-abstraction';

// Set maximum duration for large file transcription (15 minutes)
export const maxDuration = 900;

export async function POST(request: NextRequest) {
  try {
    // Check if the request is JSON or FormData
    const contentType = request.headers.get('content-type') || '';

    let audioBlob: Blob;
    let selectedModelId: string | undefined;

    if (contentType.includes('application/json')) {
      // Handle JSON request (from AudioUploader component)
      const data = await request.json();
      const audioDataUrl = data.audioData;
      selectedModelId = data.selectedModelId;

      if (!audioDataUrl) {
        return NextResponse.json(
          { error: 'No audio data provided in JSON request' },
          { status: 400 }
        );
      }

      // Convert data URL to Blob
      audioBlob = dataURLToBlob(audioDataUrl);
      console.log('Received audio data URL, converted to blob:', `${audioBlob.size / 1024 / 1024} MB`);
      console.log('Selected model from JSON request:', selectedModelId);
    } else {
      // Handle FormData request (from other components)
      const formData = await request.formData();
      const audioFile = formData.get('audio') as File;
      selectedModelId = formData.get('selectedModelId') as string;

      if (!audioFile) {
        return NextResponse.json(
          { error: 'No audio file provided in form data' },
          { status: 400 }
        );
      }

      // Convert the File to a Blob
      audioBlob = new Blob([await audioFile.arrayBuffer()], { type: audioFile.type });
      console.log('Received audio file, converted to blob:', `${audioBlob.size / 1024 / 1024} MB`);
      console.log('Selected model from FormData request:', selectedModelId);
    }

    // Call the transcribeAudio function from the abstraction layer
    console.log('Calling transcribeAudio with blob size:', `${audioBlob.size / 1024 / 1024} MB`);

    // Create a progress handler for detailed logging
    const progressHandler = (progress: number) => {
      console.log(`Transcription progress: ${progress}%`);
    };

    // Create a stage change handler for detailed logging
    const stageChangeHandler = (stage: string) => {
      console.log(`Transcription stage: ${stage}`);
    };

    // Call the transcription function with progress reporting
    const result = await transcribeAudio(audioBlob, {
      onProgress: progressHandler,
      onStageChange: stageChangeHandler,
      generateSummary: true,
      selectedModelId: selectedModelId // Pass the selected model to transcription
    });

    if (!result.success) {
      // Handle transcription failure
      console.error('Transcription failed:', result.error);
      return NextResponse.json(
        { error: result.error || 'Transcription failed' },
        { status: 500 }
      );
    }

    const response = {
      transcription: result.data?.transcription || '',
      summary: result.data?.summary || '',
      segments: result.data?.segments || [],
      srtData: result.data?.srtData || ''
    };

    // Return the transcription response
    console.log('Transcription successful');
    return NextResponse.json(response);
  } catch (error) {
    console.error('Error in transcribe API route:', error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Internal server error' },
      { status: 500 }
    );
  }
}
