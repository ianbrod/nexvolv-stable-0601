'use client';

import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { Download, FileText, FileAudio, Package, Loader2 } from 'lucide-react';
import { LogEntry } from '@/types';
import { exportTranscription, exportSRT, exportAudioFile, exportCompletePackage } from '@/lib/utils/fileExport';


interface ExportMenuProps {
  entry: LogEntry;
}

/**
 * Export Menu Component
 *
 * Provides unified export functionality for:
 * - Transcription (.txt)
 * - SRT file (.srt)
 * - Audio file (original format)
 * - Complete package (ZIP with all files)
 */
export function ExportMenu({ entry }: ExportMenuProps) {
  const [isExporting, setIsExporting] = useState<string | null>(null);


  const handleExportTranscription = async () => {
    if (!entry.transcription) {
      console.error('No transcription available for this recording.');
      return;
    }

    try {
      setIsExporting('transcription');
      exportTranscription(entry.transcription, entry.title);
      console.log('Transcription exported successfully.');
    } catch (error) {
      console.error('Error exporting transcription:', error);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportSRT = async () => {
    if (!entry.srtData) {
      console.error('No SRT data available for this recording.');
      return;
    }

    try {
      setIsExporting('srt');
      exportSRT(entry.srtData, entry.title);
      console.log('SRT file exported successfully.');
    } catch (error) {
      console.error('Error exporting SRT:', error);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportAudio = async () => {
    if (!entry.audioUrl) {
      console.error('No audio file available for this recording.');
      return;
    }

    try {
      setIsExporting('audio');
      await exportAudioFile(entry.audioUrl, entry.title);
      console.log('Audio file exported successfully.');
    } catch (error) {
      console.error('Error exporting audio:', error);
    } finally {
      setIsExporting(null);
    }
  };

  const handleExportComplete = async () => {
    try {
      setIsExporting('complete');
      await exportCompletePackage(entry);
      console.log('Complete package exported successfully.');
    } catch (error) {
      console.error('Error exporting complete package:', error);
    } finally {
      setIsExporting(null);
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="h-8 w-8 p-0"
          disabled={isExporting !== null}
        >
          {isExporting ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Download className="h-4 w-4" />
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuItem
          onClick={handleExportTranscription}
          disabled={!entry.transcription || isExporting !== null}
        >
          <FileText className="h-4 w-4 mr-2" />
          Transcription (.txt)
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleExportSRT}
          disabled={!entry.srtData || isExporting !== null}
        >
          <FileText className="h-4 w-4 mr-2" />
          SRT File (.srt)
        </DropdownMenuItem>

        <DropdownMenuItem
          onClick={handleExportAudio}
          disabled={!entry.audioUrl || isExporting !== null}
        >
          <FileAudio className="h-4 w-4 mr-2" />
          Audio File
        </DropdownMenuItem>

        <DropdownMenuSeparator />

        <DropdownMenuItem
          onClick={handleExportComplete}
          disabled={isExporting !== null}
        >
          <Package className="h-4 w-4 mr-2" />
          Complete Package (ZIP)
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
