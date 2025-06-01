'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { RecordingTimer } from './RecordingTimer';
import { useGlobalRecording } from '@/components/providers/GlobalRecordingProvider';
import {
  Mic,
  Square,
  Pause,
  Play,
  Maximize2,
  X
} from 'lucide-react';
import { maximizeRecording } from '@/lib/events/recording-events';

interface MinimizedRecordingWidgetProps {
  isRecording: boolean;
  isPaused: boolean;
  onPause: () => void;
  onStop: () => void;
  onClose: () => void;
}

/**
 * Minimized floating recording widget that allows users to control recording
 * while navigating throughout the app
 */
export function MinimizedRecordingWidget({
  isRecording,
  isPaused,
  onPause,
  onStop,
  onClose
}: MinimizedRecordingWidgetProps) {
  const { recordingDuration } = useGlobalRecording();

  const handleMaximize = () => {
    maximizeRecording();
  };

  if (!isRecording) {
    return null;
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Card className="bg-background/95 backdrop-blur-sm border-2 shadow-lg">
        <CardContent className="p-3">
          <div className="flex items-center space-x-3">
            {/* Recording status indicator */}
            <div className="flex items-center space-x-2">
              <div className="flex items-center">
                <span className="h-2 w-2 rounded-full bg-red-500 mr-2 animate-pulse"></span>
                <Mic className="h-4 w-4 text-red-500" />
              </div>
              <div className="text-sm font-medium">
                <RecordingTimer duration={recordingDuration} />
              </div>
            </div>

            {/* Control buttons */}
            <div className="flex items-center space-x-1">
              {/* Pause/Resume button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onPause}
                title={isPaused ? "Resume recording" : "Pause recording"}
              >
                {isPaused ? (
                  <Play className="h-4 w-4 text-green-500" />
                ) : (
                  <Pause className="h-4 w-4 text-amber-500" />
                )}
              </Button>

              {/* Stop button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onStop}
                title="Stop recording"
              >
                <Square className="h-4 w-4 text-red-500" />
              </Button>

              {/* Maximize button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleMaximize}
                title="Expand recording interface"
              >
                <Maximize2 className="h-4 w-4" />
              </Button>

              {/* Close button */}
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={onClose}
                title="Cancel recording"
              >
                <X className="h-4 w-4" />
              </Button>
            </div>
          </div>

          {/* Status text */}
          <div className="mt-2 text-xs text-muted-foreground text-center">
            {isPaused ? "Recording Paused" : "Recording in Progress"}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
