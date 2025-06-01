'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { exportTranscription, exportSRT } from '@/lib/utils/fileExport';
import { LogEntry } from '@/types';

interface TranscriptionDownloadButtonsProps {
  entry: LogEntry;
}

/**
 * Component to display download buttons for transcription and SRT data
 */
export function TranscriptionDownloadButtons({ entry }: TranscriptionDownloadButtonsProps) {
  const handleDownloadTranscription = () => {
    if (entry.transcription) {
      exportTranscription(entry.transcription, entry.title);
    }
  };

  const handleDownloadSRT = () => {
    if (entry.srtData) {
      exportSRT(entry.srtData, entry.title);
    }
  };

  return (
    <div className="flex flex-wrap gap-2 mt-2">
      {entry.transcription && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadTranscription}
          className="flex items-center gap-1"
        >
          <Download className="h-4 w-4" />
          <span>Download Transcription</span>
        </Button>
      )}
      
      {entry.srtData && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleDownloadSRT}
          className="flex items-center gap-1"
        >
          <Download className="h-4 w-4" />
          <span>Download SRT</span>
        </Button>
      )}
    </div>
  );
}
