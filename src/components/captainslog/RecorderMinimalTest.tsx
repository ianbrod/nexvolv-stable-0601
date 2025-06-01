'use client';

import React, { useState } from 'react';
import { useAudioRecorder } from './useAudioRecorder';

export default function RecorderMinimalTest() {
  const { isRecording, error, start, stop, audioBlob, permissionGranted } = useAudioRecorder();
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  React.useEffect(() => {
    if (audioBlob) {
      const url = URL.createObjectURL(audioBlob);
      setAudioUrl(url);
      return () => {
        URL.revokeObjectURL(url);
      };
    }
  }, [audioBlob]);

  return (
    <div style={{ padding: 24, maxWidth: 400 }}>
      <h2>Minimal Audio Recorder Test</h2>
      {error && <div style={{ color: 'red' }}>Error: {error}</div>}
      {!permissionGranted && (
        <div>
          <button onClick={start}>Request Microphone & Start Recording</button>
          <div>Microphone permission is required.</div>
        </div>
      )}
      {permissionGranted && !isRecording && (
        <button onClick={start}>Start Recording</button>
      )}
      {isRecording && (
        <button onClick={stop}>Stop Recording</button>
      )}
      {audioUrl && (
        <div>
          <audio controls src={audioUrl} />
        </div>
      )}
    </div>
  );
}
