'use client';

import React, { RefObject } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { RecordingInterface } from './RecordingInterface';
import { PersistentRecordingManagerRef } from './PersistentRecordingManager';
import { TranscriptionErrorBoundary } from '@/components/transcription/TranscriptionErrorBoundary';
import { useGlobalRecording } from '@/components/providers/GlobalRecordingProvider';
import { Minimize2 } from 'lucide-react';
import { minimizeRecording } from '@/lib/events/recording-events';

interface RecordingModalProps {
  isOpen: boolean;
  onClose: () => void;
  recordingManagerRef: RefObject<PersistentRecordingManagerRef>;
  canMinimize?: boolean;
}

export function RecordingModal({ isOpen, onClose, recordingManagerRef, canMinimize = true }: RecordingModalProps) {
  const { isRecording, isPaused } = useGlobalRecording();

  const handleCancel = () => {
    // Cancel any active recording before closing
    recordingManagerRef.current?.cancelRecording();
    onClose();
  };

  const handleModalClose = (open: boolean) => {
    if (!open) {
      // Modal is being closed - cancel any active recording
      recordingManagerRef.current?.cancelRecording();
      onClose();
    }
  };

  const handleMinimize = () => {
    minimizeRecording();
  };

  return (
    <Dialog open={isOpen} onOpenChange={handleModalClose}>
      <DialogContent className="sm:max-w-xl max-h-[60vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle>New Recording</DialogTitle>
            {canMinimize && (
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8"
                onClick={handleMinimize}
                title="Minimize to floating widget"
              >
                <Minimize2 className="h-4 w-4" />
              </Button>
            )}
          </div>
        </DialogHeader>
        <TranscriptionErrorBoundary onReset={onClose}>
          <RecordingInterface
            isRecording={isRecording}
            isPaused={isPaused}
            onStart={() => recordingManagerRef.current?.startRecording()}
            onPause={() => recordingManagerRef.current?.pauseRecording()}
            onStop={() => recordingManagerRef.current?.stopRecording()}
            onCancel={handleCancel}
          />
        </TranscriptionErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
