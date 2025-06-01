'use client';

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { RecordingTimer } from './RecordingTimer';
import { Button } from '@/components/ui/button';
import {
  ArrowLeft,
  Mic,
  Square,
  Pause,
  Play
} from 'lucide-react';
import { generateTitle } from '@/lib/gemini';
import { LogEntry } from '@/types';
import { generateUniqueId } from '@/lib/utils/entry-deduplication';
import { Card, CardContent } from '@/components/ui/card';

// Helper function to convert a Blob to a data URL
const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

/**
 * CaptainsLogRecorder Props
 *
 * @property onCancel - Callback when recording is cancelled
 * @property onSave - Callback when recording is saved
 */
interface CaptainsLogRecorderProps {
  onCancel: () => void;
  onSave: (entry: LogEntry) => void;
}

/**
 * CaptainsLogRecorder Ref Interface
 */
export interface CaptainsLogRecorderRef {
  cancelRecording: () => void;
  pauseRecording: () => void;
  stopRecording: () => void;
  isRecording: boolean;
  isPaused: boolean;
}

/**
 * Component for recording, transcribing, and saving Captain's Log entries
 *
 * Features:
 * - Audio recording with pause/resume functionality
 * - Accurate duration tracking
 * - Transcription using OpenAI Whisper API
 * - Summary generation using OpenRouter API
 * - Preview and editing before saving
 */
export const CaptainsLogRecorder = forwardRef<CaptainsLogRecorderRef, CaptainsLogRecorderProps>(
  ({ onCancel, onSave }, ref) => {
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [wasPaused, setWasPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);



  // Start recording
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;
      audioChunksRef.current = [];

      // Reset recording state
      setRecordingDuration(0);
      setWasPaused(false);
      setIsPaused(false);

      // Track the actual recording time
      const recordingStartTimeRef = { current: 0 };
      const totalPausedTimeRef = { current: 0 };
      const pauseStartTimeRef = { current: 0 };

      // Store these in refs so they persist across renders
      recordingStartTimeRef.current = Date.now();

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = () => {
        // Calculate the final duration based on actual elapsed time
        const now = Date.now();
        const elapsedMs = now - recordingStartTimeRef.current - totalPausedTimeRef.current;
        const elapsedSeconds = Math.round(elapsedMs / 1000);

        // Update the recording duration with the accurate elapsed time
        setRecordingDuration(elapsedSeconds);
        console.log('Final recording duration (calculated):', elapsedSeconds, 'seconds');

        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        console.log('Audio blob created, size:', audioBlob.size);

        // Create entry immediately and close modal (like file uploads)
        createEntryAndStartTranscription(audioBlob, elapsedSeconds);
      };

      // Handle pause events to track actual recording time
      mediaRecorder.onpause = () => {
        pauseStartTimeRef.current = Date.now();
        console.log('Recording paused at:', pauseStartTimeRef.current);
      };

      // Handle resume events to calculate paused time
      mediaRecorder.onresume = () => {
        const pauseDuration = Date.now() - pauseStartTimeRef.current;
        totalPausedTimeRef.current += pauseDuration;
        console.log('Recording resumed. Pause duration:', pauseDuration, 'ms, Total paused time:', totalPausedTimeRef.current, 'ms');
      };

      mediaRecorder.start();
      setIsRecording(true);
      recordingStartTimeRef.current = Date.now();

      // Start timer for UI display
      setRecordingDuration(0);
      timerRef.current = setInterval(() => {
        if (!isPaused) {
          setRecordingDuration(prev => prev + 1);
        }
      }, 1000);
    } catch (error) {
      console.error('Error accessing microphone:', error);
      alert('Could not access microphone. Please check your browser permissions.');
    }
  };

  // Pause recording
  const pauseRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      if (isPaused) {
        // Resume recording
        mediaRecorderRef.current.resume();

        // Restart timer
        timerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      } else {
        // Pause recording
        mediaRecorderRef.current.pause();

        // Stop timer
        if (timerRef.current) {
          clearInterval(timerRef.current);
        }

        // Mark that this recording has been paused at least once
        setWasPaused(true);
      }
      setIsPaused(!isPaused);
    }
  };

  // Stop recording
  const stopRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);
      // Note: We don't reset wasPaused here because we need it for duration calculation

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Store the final duration from our timer
      // We'll validate this with the actual audio duration when the blob is created
      const finalTimerDuration = recordingDuration;
      console.log('Final timer duration:', finalTimerDuration);

      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
    }
  };

  // Cancel recording without saving (for modal close)
  const cancelRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      // Remove event handlers to prevent processing
      mediaRecorderRef.current.ondataavailable = null;
      mediaRecorderRef.current.onstop = null;

      // Stop recording
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      setIsPaused(false);

      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      // Stop all audio tracks
      mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

      console.log('Recording cancelled - no entry will be created');
    }
  };

  // Expose recording functions and state to parent via ref
  useImperativeHandle(ref, () => ({
    cancelRecording,
    pauseRecording,
    stopRecording,
    isRecording,
    isPaused
  }));



  // Create entry immediately and start background transcription (like file uploads)
  const createEntryAndStartTranscription = async (audioBlob: Blob, duration: number) => {
    try {
      console.log('Creating entry immediately and starting background transcription...');

      // Generate auto-title with the requested format
      const now = new Date();
      const dateStr = now.toLocaleDateString('en-US', {
        month: 'numeric',
        day: 'numeric',
        year: 'numeric'
      });
      const timeStr = now.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
      const autoTitle = `Voice Recording (${dateStr}, ${timeStr})`;

      // Convert audio blob to data URL for storage
      const audioUrl = await blobToDataURL(audioBlob);

      // Create entry immediately with auto-generated title
      const newEntry: LogEntry = {
        id: generateUniqueId(),
        title: autoTitle,
        audioUrl: audioUrl,
        transcription: '', // Will be filled by background transcription
        summary: '', // Will be filled by background transcription
        duration: duration,
        segments: [],
        srtData: '',
        createdAt: now,
        updatedAt: now,
        isFavorite: false,
        tags: [],
        processingStatus: 'transcribing'
      };

      console.log('Created entry with auto-title:', autoTitle);

      // Save entry immediately and close modal
      onSave(newEntry);

      // Start background transcription
      startBackgroundTranscription(newEntry, audioBlob);

    } catch (error) {
      console.error('Error creating entry:', error);
      alert('Error creating entry. Please try again.');
    }
  };

  // Background transcription function (similar to file uploads)
  const startBackgroundTranscription = async (entry: LogEntry, audioBlob: Blob) => {
    try {
      console.log('Starting background transcription for entry:', entry.id);

      // Create FormData for transcription API
      const formData = new FormData();
      formData.append('audio', audioBlob);

      // Call transcription API
      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData
      });

      if (response.ok) {
        const data = await response.json();
        console.log('Background transcription completed:', data);

        // Update entry with transcription results
        const updatedEntry: LogEntry = {
          ...entry,
          transcription: data.transcription || '',
          summary: data.summary || '',
          segments: data.segments || [],
          srtData: data.srtData || '',
          processingStatus: 'complete',
          updatedAt: new Date()
        };

        // Try to generate a better title
        if (data.transcription) {
          try {
            const generatedTitle = await generateTitle(data.transcription);
            if (generatedTitle && generatedTitle.length > 0 && !generatedTitle.includes('Recording')) {
              updatedEntry.title = generatedTitle;
              console.log('Updated title to:', generatedTitle);
            }
          } catch (titleError) {
            console.error('Error generating title:', titleError);
            // Keep the auto-generated title
          }
        }

        // Save updated entry
        onSave(updatedEntry);

      } else {
        console.error('Background transcription failed:', response.status, response.statusText);

        // Update entry with error status
        const errorEntry: LogEntry = {
          ...entry,
          transcription: '[Transcription failed - please try again]',
          summary: `<h3>Transcription Error</h3><p>The transcription service encountered an error. You can retry transcription or add notes manually.</p>`,
          processingStatus: 'error',
          updatedAt: new Date()
        };

        onSave(errorEntry);
      }

    } catch (error) {
      console.error('Error in background transcription:', error);

      // Update entry with error status
      const errorEntry: LogEntry = {
        ...entry,
        transcription: '[Transcription failed - please try again]',
        summary: `<h3>Transcription Error</h3><p>An error occurred during transcription. You can retry transcription or add notes manually.</p>`,
        processingStatus: 'error',
        updatedAt: new Date()
      };

      onSave(errorEntry);
    }
  };



  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }

      if (mediaRecorderRef.current && isRecording) {
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isRecording]);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={onCancel} className="pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Cancel
        </Button>
        <div className="text-lg font-medium">
          {isRecording ? (
            <span className="flex items-center text-red-500">
              <span className="h-2 w-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
              Recording <RecordingTimer isRecording={isRecording} isPaused={isPaused} />
            </span>
          ) : null}
        </div>
      </div>

      {/* Recording interface */}
      <Card className="bg-muted/30">
        <CardContent className="pt-6">
          <div className="flex flex-col items-center justify-center space-y-4">
            <div className="flex items-center space-x-4">
              {isRecording && (
                <Button
                  variant="outline"
                  size="icon"
                  className="h-12 w-12 rounded-full border-2 shadow-sm hover:shadow-md transition-all duration-200"
                  onClick={pauseRecording}
                >
                  {isPaused ? <Play className="h-6 w-6 text-green-500" /> : <Pause className="h-6 w-6 text-amber-500" />}
                </Button>
              )}

              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                className={`${isRecording ? 'h-16 w-16' : 'h-32 w-32'} rounded-full shadow-md transition-all duration-200 ${isRecording ? 'bg-red-500 hover:bg-red-600 hover:shadow-lg' : 'bg-purple-500/20 hover:bg-purple-500/30 dark:bg-purple-400/20 dark:hover:bg-purple-400/30 border-2 border-purple-500 dark:border-purple-400 text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200 hover:shadow-lg'}`}
                onClick={isRecording ? stopRecording : startRecording}
                disabled={isProcessing}
              >
                {isRecording ? <Square className="h-8 w-8" style={{height: '32px', width: '32px'}} /> : <Mic className="h-16 w-16" style={{height: '64px', width: '64px'}} />}
              </Button>
            </div>

            <div className="text-center">
              <p className="text-sm font-medium">
                {isRecording ? (
                  <span className="flex items-center justify-center">
                    <span className="h-2 w-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                    {isPaused ? "Recording Paused" : "Recording in Progress"}
                  </span>
                ) : (
                  "Ready to Record"
                )}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
});
