'use client';

import React from 'react';
import { RecordingTimer } from './RecordingTimer';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { useGlobalRecording } from '@/components/providers/GlobalRecordingProvider';
import {
  ArrowLeft,
  Mic,
  Square,
  Pause,
  Play
} from 'lucide-react';

interface RecordingInterfaceProps {
  isRecording: boolean;
  isPaused: boolean;
  onStart: () => void;
  onPause: () => void;
  onStop: () => void;
  onCancel: () => void;
  isProcessing?: boolean;
}

/**
 * Recording interface component that displays recording controls
 * without managing recording state (state is managed by PersistentRecordingManager)
 */
export function RecordingInterface({
  isRecording,
  isPaused,
  onStart,
  onPause,
  onStop,
  onCancel,
  isProcessing = false
}: RecordingInterfaceProps) {
  const { recordingDuration } = useGlobalRecording();
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
              Recording <RecordingTimer duration={recordingDuration} />
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
                  onClick={onPause}
                >
                  {isPaused ? <Play className="h-6 w-6 text-green-500" /> : <Pause className="h-6 w-6 text-amber-500" />}
                </Button>
              )}

              <Button
                variant={isRecording ? "destructive" : "outline"}
                size="icon"
                className={`${isRecording ? 'h-16 w-16' : 'h-32 w-32'} rounded-full shadow-md transition-all duration-200 ${isRecording ? 'bg-red-500 hover:bg-red-600 hover:shadow-lg' : 'bg-purple-500/20 hover:bg-purple-500/30 dark:bg-purple-400/20 dark:hover:bg-purple-400/30 border-2 border-purple-500 dark:border-purple-400 text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200 hover:shadow-lg'}`}
                onClick={isRecording ? onStop : onStart}
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
}
