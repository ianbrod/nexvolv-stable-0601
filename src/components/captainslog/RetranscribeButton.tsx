'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Sparkles, RefreshCw, AlertCircle } from 'lucide-react';
import { LogEntry } from '@/types';
import { convertAudioToSupportedFormat } from '@/lib/audio-converter';

/**
 * RetranscribeButton Props
 *
 * @property entry - The log entry to re-transcribe
 * @property onRetranscribe - Callback when re-transcription is complete
 */
interface RetranscribeButtonProps {
  entry: LogEntry;
  onRetranscribe: (updatedEntry: LogEntry) => void;
}

/**
 * Button component for re-transcribing existing recordings
 *
 * Features:
 * - Sends audio to the transcription API
 * - Shows loading state during processing
 * - Handles errors gracefully
 * - Updates the entry with new transcription and summary
 */
export function RetranscribeButton({ entry, onRetranscribe }: RetranscribeButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleRetranscribe = async () => {
    if (!entry.audioUrl) {
      setError('No audio available for this entry');
      return;
    }

    setIsProcessing(true);
    setError(null);

    try {
      // Variables to be used across try blocks
      let formData = new FormData();

      try {
        // Fetch the audio data from the data URL
        const response = await fetch(entry.audioUrl);
        if (!response.ok) {
          throw new Error(`Failed to fetch audio: ${response.status} ${response.statusText}`);
        }

        const originalBlob = await response.blob();

        // Convert and compress the audio to reduce file size
        console.log(`Original audio size: ${(originalBlob.size / 1024 / 1024).toFixed(2)} MB`);
        setError('Compressing audio...');

        // Create a File object from the Blob
        const audioFile = new File([originalBlob], 'audio.webm', { type: originalBlob.type });

        // Convert and compress the audio with a very low sample rate for maximum compression
        setError('Compressing audio (this may take a moment)...');
        const compressedBlob = await convertAudioToSupportedFormat(audioFile, true);
        console.log(`Compressed audio size: ${(compressedBlob.size / 1024 / 1024).toFixed(2)} MB`);

        // Check if the compressed blob is still too large
        if (compressedBlob.size > 25 * 1024 * 1024) {
          throw new Error(`Audio file is too large (${(compressedBlob.size / 1024 / 1024).toFixed(2)} MB). Maximum size is 25 MB.`);
        }

        setError(null);

        // Create a FormData object to send the audio file
        formData = new FormData();
        formData.append('audio', compressedBlob);
        formData.append('entryId', entry.id);
      } catch (fetchError) {
        console.error('Error fetching or processing audio:', fetchError);
        throw new Error(`Error processing audio: ${fetchError.message}`);
      }

      // Call the server action to transcribe the audio using the local Whisper model
      console.log('Sending audio for re-transcription with local Whisper model...');
      const apiResponse = await fetch('/api/retranscribe', {
        method: 'POST',
        body: formData
      });

      if (!apiResponse.ok) {
        const errorData = await apiResponse.json();
        throw new Error(errorData.error || 'Transcription failed');
      }

      const data = await apiResponse.json();

      // Create updated entry with new transcription and summary
      const updatedEntry: LogEntry = {
        ...entry,
        transcription: data.transcription || entry.transcription,
        summary: data.summary || entry.summary,
        segments: data.segments || entry.segments,
        srtData: data.srtData || entry.srtData
      };

      // Call the onRetranscribe callback with the updated entry
      onRetranscribe(updatedEntry);
    } catch (error) {
      console.error('Error re-transcribing:', error);
      setError(error instanceof Error ? error.message : 'Failed to re-transcribe');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div className="space-y-2">
      <Button
        variant="outline"
        className="w-full flex items-center justify-center"
        onClick={handleRetranscribe}
        disabled={isProcessing || !entry.audioUrl}
      >
        {isProcessing ? (
          <>
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
            Processing...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-4 w-4" />
            Re-Generate Transcription & Summary
          </>
        )}
      </Button>

      {error && (
        <div className="text-sm text-red-500 flex items-center">
          <AlertCircle className="h-4 w-4 mr-1" />
          {error}
        </div>
      )}

      <p className="text-xs text-center text-muted-foreground">
        Uses local Whisper model to re-process recordings for improved accuracy
      </p>
    </div>
  );
}
