'use client';

import React, { useState, useEffect, createContext, useContext, useRef, useCallback } from 'react';
import { RecordingModal } from '@/components/captainslog/RecordingModal';
import { UploadModal } from '@/components/captainslog/UploadModal';
import { MinimizedRecordingWidget } from '@/components/captainslog/MinimizedRecordingWidget';
import { PersistentRecordingManager, PersistentRecordingManagerRef } from '@/components/captainslog/PersistentRecordingManager';
import { addRecordingEventListener, RECORDING_EVENTS } from '@/lib/events/recording-events';
import { LogEntry } from '@/types';
import { hierarchicalLogEntryStorage } from '@/lib/storage/hierarchical-log-entry-storage';

interface GlobalRecordingContextType {
  isRecording: boolean;
  isUploading: boolean;
  isMinimized: boolean;
  isPaused: boolean;
  recordingDuration: number;
  openRecording: () => void;
  openUpload: () => void;
  closeRecording: () => void;
  closeUpload: () => void;
  minimizeRecording: () => void;
  maximizeRecording: () => void;
}

const GlobalRecordingContext = createContext<GlobalRecordingContextType | undefined>(undefined);

export function useGlobalRecording() {
  const context = useContext(GlobalRecordingContext);
  if (context === undefined) {
    throw new Error('useGlobalRecording must be used within a GlobalRecordingProvider');
  }
  return context;
}

interface GlobalRecordingProviderProps {
  children: React.ReactNode;
}

export function GlobalRecordingProvider({ children }: GlobalRecordingProviderProps) {
  const [isRecordingModalOpen, setIsRecordingModalOpen] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const recordingManagerRef = useRef<PersistentRecordingManagerRef>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Listen for global recording events
  useEffect(() => {
    const removeRecordingListener = addRecordingEventListener(
      RECORDING_EVENTS.TRIGGER_RECORDING,
      () => {
        setIsRecordingModalOpen(true);
        setIsMinimized(false);
      }
    );

    const removeUploadListener = addRecordingEventListener(
      RECORDING_EVENTS.TRIGGER_UPLOAD,
      () => setIsUploading(true)
    );

    const removeMinimizeListener = addRecordingEventListener(
      RECORDING_EVENTS.MINIMIZE_RECORDING,
      () => setIsMinimized(true)
    );

    const removeMaximizeListener = addRecordingEventListener(
      RECORDING_EVENTS.MAXIMIZE_RECORDING,
      () => setIsMinimized(false)
    );

    return () => {
      removeRecordingListener();
      removeUploadListener();
      removeMinimizeListener();
      removeMaximizeListener();
    };
  }, []);

  const openRecording = () => {
    setIsRecordingModalOpen(true);
    setIsMinimized(false);
  };
  const openUpload = () => setIsUploading(true);
  const closeRecording = () => {
    recordingManagerRef.current?.cancelRecording();
    setIsRecordingModalOpen(false);
    setIsMinimized(false);
  };
  const closeUpload = () => setIsUploading(false);
  const minimizeRecording = () => setIsMinimized(true);
  const maximizeRecording = () => setIsMinimized(false);

  // Widget control functions
  const handleWidgetPause = () => {
    recordingManagerRef.current?.pauseRecording();
  };

  const handleWidgetStop = () => {
    recordingManagerRef.current?.stopRecording();
  };

  const handleWidgetClose = () => {
    recordingManagerRef.current?.cancelRecording();
    setIsRecordingModalOpen(false);
    setIsMinimized(false);
  };

  // Handle saving new entries
  const handleSaveEntry = async (entry: LogEntry) => {
    try {
      // Check if this is an initial entry creation or an update
      const existingEntry = await hierarchicalLogEntryStorage.getEntry(entry.id);

      if (existingEntry) {
        // This is an update (e.g., transcription completion) - don't close modal
        await hierarchicalLogEntryStorage.updateEntry(entry);
        console.log('Entry updated successfully:', entry.title, 'Status:', entry.processingStatus);

        // Dispatch a custom event to notify other components that data has changed
        window.dispatchEvent(new CustomEvent('captainslog-data-changed', {
          detail: { type: 'update', entryId: entry.id, processingStatus: entry.processingStatus }
        }));
      } else {
        // This is a new entry creation - close modal after saving
        await hierarchicalLogEntryStorage.createEntry(entry);
        console.log('New entry created successfully:', entry.title);

        // Dispatch a custom event to notify other components that data has changed
        window.dispatchEvent(new CustomEvent('captainslog-data-changed', {
          detail: { type: 'create', entryId: entry.id }
        }));

        // Only close the modal for new entry creation, not for updates
        // This prevents background transcription updates from closing active recording modals
        if (entry.processingStatus === 'transcribing' || entry.processingStatus === 'idle') {
          // This is the initial save, close the modal
          setTimeout(() => {
            setIsRecordingModalOpen(false);
            setIsUploading(false);
            setIsMinimized(false);
          }, 100); // Small delay to ensure save completes
        }
      }
    } catch (error) {
      console.error('Failed to save entry:', error);
      // You might want to show a toast notification here
    }
  };

  // Timer for recording duration
  useEffect(() => {
    if (isRecording && !isPaused) {
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    } else {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    };
  }, [isRecording, isPaused]);

  // Callback to sync recording state from manager
  const handleRecordingStateChange = (recording: boolean, paused: boolean) => {
    setIsRecording(recording);
    setIsPaused(paused);

    // Reset duration when starting a new recording
    if (recording && !isRecording) {
      setRecordingDuration(0);
    }

    // Reset duration when stopping recording
    if (!recording && isRecording) {
      setRecordingDuration(0);
    }
  };

  const contextValue: GlobalRecordingContextType = {
    isRecording,
    isUploading,
    isMinimized,
    isPaused,
    recordingDuration,
    openRecording,
    openUpload,
    closeRecording,
    closeUpload,
    minimizeRecording,
    maximizeRecording,
  };

  return (
    <GlobalRecordingContext.Provider value={contextValue}>
      {children}

      {/* Persistent Recording Manager - always present */}
      <PersistentRecordingManager
        ref={recordingManagerRef}
        onSave={handleSaveEntry}
        onStateChange={handleRecordingStateChange}
      />

      {/* Global Recording Modal - only show when modal is open and not minimized */}
      <RecordingModal
        isOpen={isRecordingModalOpen && !isMinimized}
        onClose={closeRecording}
        recordingManagerRef={recordingManagerRef}
      />

      {/* Minimized Recording Widget - only show when recording and minimized */}
      <MinimizedRecordingWidget
        isRecording={isRecording && isMinimized}
        isPaused={isPaused}
        onPause={handleWidgetPause}
        onStop={handleWidgetStop}
        onClose={handleWidgetClose}
      />

      {/* Global Upload Modal */}
      <UploadModal
        isOpen={isUploading}
        onClose={closeUpload}
        onSave={handleSaveEntry}
      />
    </GlobalRecordingContext.Provider>
  );
}
