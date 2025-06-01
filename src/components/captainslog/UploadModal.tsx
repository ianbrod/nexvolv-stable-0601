'use client';

import React from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { AudioUploader } from './AudioUploader';
import { LogEntry } from '@/types';
import { TranscriptionErrorBoundary } from '@/components/transcription/TranscriptionErrorBoundary';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (entry: LogEntry) => void;
}

export function UploadModal({ isOpen, onClose, onSave }: UploadModalProps) {
  const handleSave = (entry: LogEntry) => {
    onSave(entry);
    // Don't auto-close modal anymore - let user close manually
    // This allows them to see the upload progress and close when ready
  };

  const handleCancel = () => {
    onClose();
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Transcribe Files</DialogTitle>
        </DialogHeader>
        <TranscriptionErrorBoundary onReset={onClose}>
          <AudioUploader
            onCancel={handleCancel}
            onSave={handleSave}
          />
        </TranscriptionErrorBoundary>
      </DialogContent>
    </Dialog>
  );
}
