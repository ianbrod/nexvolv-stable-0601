'use client';

import dynamic from 'next/dynamic';
import { ComponentType } from 'react';
import { Loader2 } from 'lucide-react';

// Loading component for audio features
const AudioLoadingSpinner = () => (
  <div className="flex items-center justify-center p-8">
    <Loader2 className="h-8 w-8 animate-spin" />
    <span className="ml-2 text-sm text-muted-foreground">Loading audio features...</span>
  </div>
);

// Lazy load audio recorder component
export const LazyCaptainsLogRecorder = dynamic(
  () => import('@/components/captainslog/CaptainsLogRecorder').then(mod => ({ default: mod.CaptainsLogRecorder })),
  {
    loading: () => <AudioLoadingSpinner />,
    ssr: false, // Audio features require client-side APIs
  }
);

// Lazy load audio transcription components
export const LazyTranscriptionService = dynamic(
  () => import('@/lib/transcription-service').then(mod => ({ default: mod.TranscriptionService })),
  {
    loading: () => <AudioLoadingSpinner />,
    ssr: false,
  }
);

// Lazy load whisper integration
export const LazyWhisperService = dynamic(
  () => import('@/lib/whisper/whisper-service').then(mod => ({ default: mod.WhisperService })),
  {
    loading: () => <AudioLoadingSpinner />,
    ssr: false,
  }
);

// Lazy load audio recorder hook
export const useLazyAudioRecorder = () => {
  return dynamic(
    () => import('@/components/captainslog/useAudioRecorder').then(mod => ({ default: mod.useAudioRecorder })),
    {
      ssr: false,
    }
  );
};

// Lazy load captain's log list with audio features
export const LazyTagBasedCaptainsLogList = dynamic(
  () => import('@/components/captainslog/TagBasedCaptainsLogList').then(mod => ({ default: mod.TagBasedCaptainsLogList })),
  {
    loading: () => <AudioLoadingSpinner />,
    ssr: false,
  }
);

// Export types for better TypeScript support
export type LazyAudioComponentProps = {
  onLoad?: () => void;
  onError?: (error: Error) => void;
};
