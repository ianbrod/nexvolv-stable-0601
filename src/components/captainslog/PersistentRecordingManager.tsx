'use client';

import React, { useState, useRef, useEffect, useImperativeHandle, forwardRef } from 'react';
import { LogEntry } from '@/types';
import { generateUniqueId } from '@/lib/utils/entry-deduplication';
import { generateTitle } from '@/lib/gemini';

// Helper function to convert a Blob to a data URL
const blobToDataURL = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
};

interface PersistentRecordingManagerProps {
  onSave: (entry: LogEntry) => void;
  onStateChange: (isRecording: boolean, isPaused: boolean) => void;
}

export interface PersistentRecordingManagerRef {
  startRecording: () => Promise<void>;
  pauseRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
  isRecording: boolean;
  isPaused: boolean;
  recordingDuration: number;
}

/**
 * Persistent recording manager that maintains recording state
 * independently of UI components (modal/widget)
 */
export const PersistentRecordingManager = forwardRef<PersistentRecordingManagerRef, PersistentRecordingManagerProps>(
  ({ onSave, onStateChange }, ref) => {
    const [isRecording, setIsRecording] = useState(false);
    const [isPaused, setIsPaused] = useState(false);
    const [wasPaused, setWasPaused] = useState(false);
    const [recordingDuration, setRecordingDuration] = useState(0);

    const mediaRecorderRef = useRef<MediaRecorder | null>(null);
    const audioChunksRef = useRef<Blob[]>([]);
    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const isPausedRef = useRef(false);
    const onStateChangeRef = useRef(onStateChange);

    // Keep the callback ref updated
    useEffect(() => {
      onStateChangeRef.current = onStateChange;
    }, [onStateChange]);

    // Notify parent of state changes
    useEffect(() => {
      onStateChangeRef.current(isRecording, isPaused);
    }, [isRecording, isPaused]);

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

        // Reset recording duration
        setRecordingDuration(0);
        isPausedRef.current = false;
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
          isPausedRef.current = false;
        } else {
          // Pause recording
          mediaRecorderRef.current.pause();
          isPausedRef.current = true;

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
        isPausedRef.current = false;

        // Stop all audio tracks
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
      }
    };

    // Cancel recording without saving
    const cancelRecording = () => {
      if (mediaRecorderRef.current && isRecording) {
        // Remove event handlers to prevent processing
        mediaRecorderRef.current.ondataavailable = null;
        mediaRecorderRef.current.onstop = null;

        // Stop recording
        mediaRecorderRef.current.stop();
        setIsRecording(false);
        setIsPaused(false);
        isPausedRef.current = false;
        setRecordingDuration(0);

        // Stop all audio tracks
        mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());

        console.log('Recording cancelled - no entry will be created');
      }
    };

    // Create entry immediately and start background transcription
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
          transcription: '',
          summary: '',
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

        // Save entry immediately
        onSave(newEntry);

        // Start background transcription
        startBackgroundTranscription(newEntry, audioBlob);

      } catch (error) {
        console.error('Error creating entry:', error);
        alert('Error creating entry. Please try again.');
      }
    };

    // Background transcription function
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

    // Expose functions and state to parent via ref
    useImperativeHandle(ref, () => ({
      startRecording,
      pauseRecording,
      stopRecording,
      cancelRecording,
      isRecording,
      isPaused,
      recordingDuration
    }));

    // Clean up on unmount
    useEffect(() => {
      return () => {
        if (mediaRecorderRef.current && isRecording) {
          mediaRecorderRef.current.stream.getTracks().forEach(track => track.stop());
        }
      };
    }, [isRecording]);

    // This component doesn't render anything - it's just a state manager
    return null;
  }
);

PersistentRecordingManager.displayName = 'PersistentRecordingManager';
