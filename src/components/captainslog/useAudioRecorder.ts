import { useRef, useEffect, useCallback, useState } from 'react';

export interface UseAudioRecorderResult {
  isRecording: boolean;
  error: string | null;
  start: () => Promise<void>;
  stop: () => void;
  audioBlob: Blob | null;
  permissionGranted: boolean;
}

export function useAudioRecorder(): UseAudioRecorderResult {
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);

  const [isRecording, setIsRecording] = useState(false);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [permissionGranted, setPermissionGranted] = useState(false);

  // Centralized cleanup logic
  const cleanupMediaResources = useCallback(() => {
    if (recorderRef.current) {
      recorderRef.current.ondataavailable = null;
      recorderRef.current.onstop = null;
      recorderRef.current.onerror = null;
      if (recorderRef.current.state === 'recording') {
        try {
          recorderRef.current.stop();
        } catch (e) {}
      }
      recorderRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => {
        if (track.readyState === 'live') {
          track.stop();
        }
      });
      streamRef.current = null;
    }
    audioChunksRef.current = [];
    setIsRecording(false);
  }, []);

  // Setup cleanup on unmount
  useEffect(() => {
    return cleanupMediaResources;
  }, [cleanupMediaResources]);

  // --- Add logging for debugging ---
  useEffect(() => {
    if (error) {
      console.error('[AudioRecorder ERROR]', error);
    }
  }, [error]);

  // Request permission and get stream
  const getStream = useCallback(async () => {
    try {
      console.log('[AudioRecorder] Requesting getUserMedia...');
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;
      setPermissionGranted(true);
      setError(null);
      console.log('[AudioRecorder] Microphone access granted.');
      return stream;
    } catch (err: any) {
      setError('Microphone access denied or unavailable.');
      setPermissionGranted(false);
      console.error('[AudioRecorder] getUserMedia error:', err);
      throw err;
    }
  }, []);

  // Start recording
  const start = useCallback(async () => {
    setAudioBlob(null);
    audioChunksRef.current = [];
    let stream = streamRef.current;
    if (!stream) {
      try {
        stream = await getStream();
      } catch (err) {
        // getStream already sets error state
        return;
      }
    }
    try {
      const recorder = new MediaRecorder(stream!);
      recorderRef.current = recorder;
      recorder.ondataavailable = (event: BlobEvent) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };
      recorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: 'audio/webm' });
        setAudioBlob(blob);
        audioChunksRef.current = [];
        setIsRecording(false);
        // Stop all tracks after onstop
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => {
            if (track.readyState === 'live') {
              track.stop();
            }
          });
          streamRef.current = null;
        }
        recorderRef.current = null;
      };
      recorder.onerror = (event: any) => {
        setError('Recording error: ' + (event.error?.name || 'unknown'));
        setIsRecording(false);
        cleanupMediaResources();
      };
      recorder.start();
      setIsRecording(true);
      setError(null);
      console.log('[AudioRecorder] Recording started.');
    } catch (e: any) {
      setError('Failed to start recording: ' + e.message);
      setIsRecording(false);
      console.error('[AudioRecorder] Failed to start MediaRecorder:', e);
    }
  }, [getStream, cleanupMediaResources]);

  // Stop recording
  const stop = useCallback(() => {
    if (recorderRef.current && recorderRef.current.state === 'recording') {
      recorderRef.current.stop();
      console.log('[AudioRecorder] Stop requested.');
    }
  }, []);

  return {
    isRecording,
    error,
    start,
    stop,
    audioBlob,
    permissionGranted,
  };
}
