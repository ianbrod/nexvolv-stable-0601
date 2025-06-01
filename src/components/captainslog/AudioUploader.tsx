'use client';

import React, { useState, useCallback } from 'react';
import { FileUpload } from '@/components/ui/file-upload';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Label } from '@/components/ui/label';
import { Loader2, Upload, AlertCircle, CheckCircle2, X, FileAudio, Zap, Brain } from 'lucide-react';
import { LogEntry, FileUploadItem, FileUploadQueue } from '@/types';
import { convertAudioToSupportedFormat } from '@/lib/audio-converter';
import { generateUniqueId } from '@/lib/utils/entry-deduplication';
import { WHISPER_MODELS } from '@/lib/whisper/model-config';
import { blobToDataURL } from '@/lib/utils/fileExport';

interface AudioUploaderProps {
  onCancel: () => void;
  onSave: (entry: LogEntry) => void;
}

export function AudioUploader({ onCancel, onSave }: AudioUploaderProps) {
  const [uploadQueue, setUploadQueue] = useState<FileUploadQueue>({
    items: [],
    isProcessing: false,
    canStartTranscription: false
  });
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedModel, setSelectedModel] = useState<string>('base.en');

  // Handle multiple file selection - APPEND to existing queue
  const handleFilesSelected = useCallback((files: File[]) => {
    const newItems: FileUploadItem[] = files.map(file => ({
      id: generateUniqueId(),
      file,
      status: 'pending',
      progress: 0
    }));

    setUploadQueue(prev => ({
      ...prev,
      items: [...prev.items, ...newItems], // Append instead of replace
      canStartTranscription: false
    }));
    setError(null);
  }, []);

  // Handle single file selection (for backward compatibility)
  const handleFileSelected = (file: File) => {
    handleFilesSelected([file]);
  };

  // Remove file from queue
  const removeFile = useCallback((itemId: string) => {
    setUploadQueue(prev => ({
      ...prev,
      items: prev.items.filter(item => item.id !== itemId)
    }));
  }, []);

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    // Only set dragging to false if we're leaving the drop zone entirely
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      // Filter for audio files
      const audioFiles = Array.from(files).filter(file =>
        file.type.startsWith('audio/') ||
        file.name.toLowerCase().match(/\.(mp3|wav|m4a|aac|ogg|flac)$/)
      );

      if (audioFiles.length > 0) {
        handleFilesSelected(audioFiles);
      } else {
        setError('Please drop audio files only');
      }
    }
  }, [handleFilesSelected]);

  // Process a single file
  const processFile = async (item: FileUploadItem): Promise<LogEntry> => {
    const file = item.file;

    // Update item status to converting
    setUploadQueue(prev => ({
      ...prev,
      items: prev.items.map(i =>
        i.id === item.id ? { ...i, status: 'converting', progress: 10 } : i
      )
    }));

    try {
      // Step 1: Convert and compress the audio file
      let audioBlob: Blob;

      // Check if we should compress or use the file directly
      const isAlreadyCompressed = file.type.includes('mp3') ||
                                  file.type.includes('mpeg') ||
                                  file.type.includes('m4a') ||
                                  file.type.includes('aac') ||
                                  file.name.toLowerCase().endsWith('.mp3') ||
                                  file.name.toLowerCase().endsWith('.m4a') ||
                                  file.name.toLowerCase().endsWith('.aac');

      // Update progress to 20%
      setUploadQueue(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.id === item.id ? { ...i, progress: 20 } : i
        )
      }));

      // For files under 80MB that are already compressed, use them directly
      if (isAlreadyCompressed && file.size <= 80 * 1024 * 1024) {
        audioBlob = file;
      } else if (!isAlreadyCompressed && file.size > 10 * 1024 * 1024) {
        // Convert and compress large uncompressed files
        try {
          audioBlob = await convertAudioToSupportedFormat(file, true, 'whisper');

          // Check if the compressed blob is still too large
          if (audioBlob.size > 80 * 1024 * 1024) {
            throw new Error(`Audio file is too large after compression (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB). Maximum size is 80 MB.`);
          }
        } catch (error) {
          // If compression fails, check if we can use the original file
          if (file.size > 80 * 1024 * 1024) {
            throw new Error(`Audio file is too large (${(file.size / 1024 / 1024).toFixed(2)} MB). Maximum size is 80 MB.`);
          }
          audioBlob = file;
        }
      } else {
        // Small files or already compressed files that don't need compression
        audioBlob = file;

        // Final safety check
        if (audioBlob.size > 80 * 1024 * 1024) {
          throw new Error(`Audio file is too large (${(audioBlob.size / 1024 / 1024).toFixed(2)} MB). Maximum size is 80 MB.`);
        }
      }

      // Update progress to 40%
      setUploadQueue(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.id === item.id ? { ...i, status: 'uploading', progress: 40 } : i
        )
      }));

      // Step 2: Create the log entry
      // Convert blob to data URL for persistent storage (like CaptainsLogRecorder does)
      const audioURL = await blobToDataURL(audioBlob);
      const tempAudio = new Audio(audioURL);

      // Default values for the entry
      let duration = 60; // Default duration

      // Get the duration if possible
      try {
        await new Promise<void>((resolve) => {
          tempAudio.addEventListener('loadedmetadata', () => {
            duration = tempAudio.duration;
            resolve();
          });
          setTimeout(resolve, 2000); // Timeout after 2 seconds
        });
      } catch (error) {
        console.error('Error getting audio duration:', error);
      }

      // Create the log entry
      const newEntry: LogEntry = {
        id: generateUniqueId(),
        title: file.name.replace(/\.[^/.]+$/, '') || `Uploaded Audio ${new Date().toLocaleString()}`,
        audioUrl: audioURL, // Now using persistent data URL instead of temporary blob URL
        transcription: 'Processing transcription...',
        summary: 'This recording is being processed. Please check back in a moment.',
        duration,
        segments: [],
        srtData: '',
        createdAt: new Date(),
        updatedAt: new Date(),
        isFavorite: false,
        processingStatus: 'creating',
        processingProgress: 40
      };

      // Update progress to 60%
      setUploadQueue(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.id === item.id ? { ...i, progress: 60, logEntry: newEntry } : i
        )
      }));

      // Save the entry immediately so the user can see it
      onSave(newEntry);

      // Update progress to 80% (upload complete)
      setUploadQueue(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.id === item.id ? { ...i, progress: 80 } : i
        )
      }));

      return newEntry;

    } catch (error) {
      // Update item with error status
      setUploadQueue(prev => ({
        ...prev,
        items: prev.items.map(i =>
          i.id === item.id ? {
            ...i,
            status: 'error',
            error: error instanceof Error ? error.message : 'Failed to process file'
          } : i
        )
      }));
      throw error;
    }
  };



  // Handle transcription and close modal immediately
  const handleTranscribeFiles = async () => {
    if (uploadQueue.items.length === 0) {
      setError('Please select audio files first');
      return;
    }

    // Process all files and create entries immediately
    for (const item of uploadQueue.items) {
      try {
        const entry = await processFile(item);
        // Start background transcription
        startBackgroundTranscription(entry, item.file);
      } catch (error) {
        console.error(`Error processing file ${item.file.name}:`, error);
      }
    }

    // Close modal immediately after starting the process
    onCancel();
  };

  // Start background transcription for a file
  const startBackgroundTranscription = async (entry: LogEntry, file: File) => {
    try {
      // Update entry to transcribing status
      const transcribingEntry: LogEntry = {
        ...entry,
        processingStatus: 'transcribing',
        processingProgress: 60
      };
      onSave(transcribingEntry);

      // Start transcription
      const formData = new FormData();
      formData.append('audio', file, file.name);
      formData.append('selectedModelId', selectedModel);

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status} ${response.statusText}`);
      }

      const result = await response.json();

      // Update entry with transcription results
      const updatedEntry: LogEntry = {
        ...entry,
        transcription: result.transcription || entry.transcription,
        summary: result.summary || entry.summary,
        segments: result.segments || entry.segments,
        srtData: result.srtData || entry.srtData,
        updatedAt: new Date(),
        processingStatus: 'complete',
        processingProgress: 100
      };

      onSave(updatedEntry);

    } catch (error) {
      console.error('Transcription error:', error);

      // Update entry with error status
      const errorEntry: LogEntry = {
        ...entry,
        updatedAt: new Date(),
        processingStatus: 'error',
        processingProgress: 0
      };
      onSave(errorEntry);
    }
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        {/* Model Selection */}
        <Card className="p-4">
          <div className="space-y-3">
            <h4 className="text-sm font-medium">Transcription Model</h4>
            <RadioGroup
              value={selectedModel}
              onValueChange={setSelectedModel}
              className="grid grid-cols-2 gap-3"
            >
              <div>
                <RadioGroupItem
                  value="base.en"
                  id="model-base"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="model-base"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Zap className="mb-2 h-5 w-5 text-blue-500" />
                  <div className="text-center">
                    <div className="text-sm font-medium">Base</div>
                    <div className="text-xs text-muted-foreground mt-1">Faster, less accurate</div>
                  </div>
                </Label>
              </div>

              <div>
                <RadioGroupItem
                  value="medium.en"
                  id="model-medium"
                  className="peer sr-only"
                />
                <Label
                  htmlFor="model-medium"
                  className="flex flex-col items-center justify-between rounded-md border-2 border-muted bg-popover p-3 hover:bg-accent hover:text-accent-foreground peer-data-[state=checked]:border-primary [&:has([data-state=checked])]:border-primary cursor-pointer"
                >
                  <Brain className="mb-2 h-5 w-5 text-purple-500" />
                  <div className="text-center">
                    <div className="text-sm font-medium">Medium</div>
                    <div className="text-xs text-muted-foreground mt-1">Slower, more accurate</div>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            {/* Comprehensive Disclaimer Section */}
            <div className="pt-2 border-t border-muted">
              <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
                {/* Left Column */}
                <div className="space-y-1">
                  <div>Powered by OpenAI Whisper technology</div>
                  <div>Supported formats: MP3, WAV, M4A, AAC, OGG, FLAC (max 80MB)</div>
                </div>

                {/* Right Column */}
                <div className="space-y-1 text-right">
                  <div>Base processing time ~10-15s/min</div>
                  <div>Medium processing time ~35-45s/min</div>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* File Grid */}
        <div
          className={`relative border-2 border-dashed rounded-lg p-6 min-h-[200px] transition-colors ${
            isDragging
              ? 'border-primary bg-primary/5'
              : 'border-primary/20'
          }`}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
        >
          {isDragging && (
            <div className="absolute inset-0 flex items-center justify-center bg-primary/10 rounded-lg z-10">
              <div className="text-lg font-medium text-primary">Drop audio files here</div>
            </div>
          )}
          <div className="grid grid-cols-3 gap-4">
            {uploadQueue.items.map((item) => (
              <div key={item.id} className="relative">
                <div className="bg-muted rounded-lg p-4 text-center space-y-2">
                  <FileAudio className="h-8 w-8 mx-auto text-muted-foreground" />
                  <div className="text-sm font-medium truncate">{item.file.name}</div>
                  <div className="absolute top-2 right-2">
                    <div className="bg-primary rounded-full p-1">
                      <CheckCircle2 className="h-3 w-3 text-white" />
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="absolute top-2 left-2"
                    onClick={() => removeFile(item.id)}
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              </div>
            ))}

            {/* Add Files Button */}
            <div className="border-2 border-dashed border-muted-foreground/20 rounded-lg p-4 flex items-center justify-center">
              <input
                type="file"
                multiple
                accept="audio/*"
                onChange={(e) => {
                  const files = e.target.files;
                  if (files && files.length > 0) {
                    handleFilesSelected(Array.from(files));
                  }
                }}
                className="hidden"
                id="file-input"
              />
              <label htmlFor="file-input" className="cursor-pointer text-center space-y-2 w-full">
                <div className="bg-muted rounded-full p-3 w-12 h-12 mx-auto flex items-center justify-center">
                  <Upload className="h-6 w-6 text-muted-foreground" />
                </div>
                <div className="text-sm text-muted-foreground">Add Files</div>
              </label>
            </div>
          </div>
        </div>

        {error && (
          <div className="flex items-center text-red-500 text-sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}


      </div>

      <div className="flex justify-end space-x-2 pt-4 border-t">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button
          onClick={handleTranscribeFiles}
          disabled={uploadQueue.items.length === 0}
          className={uploadQueue.items.length === 0
            ? "flex items-center"
            : "flex items-center bg-purple-500/20 hover:bg-purple-500/30 dark:bg-purple-400/20 dark:hover:bg-purple-400/30 border-2 border-purple-500 dark:border-purple-400 text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200 transition-all duration-200"
          }
        >
          <Upload className="h-4 w-4 mr-2" />
          Transcribe
        </Button>
      </div>
    </div>
  );
}
