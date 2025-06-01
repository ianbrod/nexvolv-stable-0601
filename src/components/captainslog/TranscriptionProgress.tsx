'use client';

import React from 'react';
import { Progress } from '@/components/ui/progress';
import { Loader2, CheckCircle2, AlertCircle } from 'lucide-react';

interface TranscriptionProgressProps {
  status?: 'idle' | 'converting' | 'creating' | 'transcribing' | 'complete' | 'error';
  progress?: number;
}

export function TranscriptionProgress({ status, progress = 0 }: TranscriptionProgressProps) {
  if (!status || status === 'idle' || status === 'complete') {
    return null;
  }

  // Map status to a user-friendly message
  const getMessage = () => {
    switch (status) {
      case 'converting':
        return 'Converting audio...';
      case 'creating':
        return 'Creating entry...';
      case 'transcribing':
        return 'Transcribing audio...';
      case 'error':
        return 'Error processing transcription';
      default:
        return 'Processing...';
    }
  };

  return (
    <div className="space-y-2 my-3 bg-muted/20 p-3 rounded-md border">
      <div className="flex items-center justify-between text-sm">
        <div className="flex items-center">
          {status === 'error' ? (
            <AlertCircle className="h-4 w-4 mr-2 text-red-500" />
          ) : (
            <Loader2 className="h-4 w-4 mr-2 animate-spin text-primary" />
          )}
          <span className="font-medium">{getMessage()}</span>
        </div>
        {status !== 'error' && <span className="text-sm font-bold">{progress}%</span>}
      </div>

      {status !== 'error' && <Progress value={progress} className="h-2" />}

      {/* Processing stages indicators */}
      <div className="flex justify-between text-xs pt-1">
        <div className="flex flex-col items-center">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center mb-1 ${status === 'converting' || status === 'creating' || status === 'transcribing' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
            1
          </div>
          <span className={`${status === 'converting' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            Converting
          </span>
        </div>

        <div className="flex flex-col items-center">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center mb-1 ${status === 'creating' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
            2
          </div>
          <span className={`${status === 'creating' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            Creating
          </span>
        </div>

        <div className="flex flex-col items-center">
          <div className={`w-5 h-5 rounded-full flex items-center justify-center mb-1 ${status === 'transcribing' ? 'bg-primary text-white' : 'bg-muted text-muted-foreground'}`}>
            3
          </div>
          <span className={`${status === 'transcribing' ? 'text-primary font-medium' : 'text-muted-foreground'}`}>
            Transcribing
          </span>
        </div>
      </div>
    </div>
  );
}
