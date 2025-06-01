'use client';

import * as React from "react";
import { useRef, useState, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Upload, AlertCircle, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { convertAudioToSupportedFormat } from "@/lib/audio-converter";

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  onFilesSelected?: (files: File[]) => void; // For multiple file selection
  accept?: string;
  maxSize?: number; // in MB
  buttonText?: string;
  disabled?: boolean;
  className?: string;
  convertAacToMp3?: boolean;
  multiple?: boolean; // Enable multiple file selection
}

export function FileUpload({
  onFileSelected,
  onFilesSelected,
  accept = "*",
  maxSize = 50, // Default max size: 50MB
  buttonText = "Select File",
  disabled = false,
  className,
  convertAacToMp3 = true,
  multiple = false,
}: FileUploadProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const dropZoneRef = useRef<HTMLDivElement>(null);
  const [error, setError] = useState<string | null>(null);
  const [fileName, setFileName] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isConverting, setIsConverting] = useState(false);

  const handleClick = () => {
    if (!disabled && inputRef.current) {
      inputRef.current.click();
    }
  };

  const processFile = useCallback(async (file: File) => {
    setFileName(file.name);
    setError(null);

    // Check file size
    const fileSizeInMB = file.size / (1024 * 1024);
    if (fileSizeInMB > maxSize) {
      setError(`File size exceeds the maximum limit of ${maxSize}MB`);
      return;
    }

    // Check if it's an AAC file that needs conversion
    if (convertAacToMp3 && (file.type === 'audio/aac' || file.name.toLowerCase().endsWith('.aac'))) {
      try {
        setIsConverting(true);
        const convertedBlob = await convertAudioToSupportedFormat(file);

        // Create a new File object from the converted Blob
        const convertedFile = new File(
          [convertedBlob],
          file.name.replace(/\.aac$/i, '.mp3'),
          { type: 'audio/mp3' }
        );

        setFileName(convertedFile.name);
        setIsConverting(false);
        onFileSelected(convertedFile);
      } catch (error) {
        console.error('Error converting AAC file:', error);
        setError('Failed to convert AAC file. Using original file instead.');
        setIsConverting(false);
        onFileSelected(file);
      }
    } else {
      // For non-AAC files, just pass the file directly
      onFileSelected(file);
    }
  }, [convertAacToMp3, maxSize, onFileSelected]);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;

    if (multiple && onFilesSelected) {
      // Handle multiple files
      const fileArray = Array.from(files);
      onFilesSelected(fileArray);
    } else {
      // Handle single file
      processFile(files[0]);
    }
  };

  // Drag and drop handlers
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (!disabled) setIsDragging(true);
  }, [disabled]);

  const handleDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);

    if (disabled) return;

    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      if (multiple && onFilesSelected) {
        // Handle multiple files
        const fileArray = Array.from(files);

        // Validate all files if accept filter is specified
        if (accept !== '*') {
          const acceptTypes = accept.split(',').map(type => type.trim());
          const invalidFiles = fileArray.filter(file => {
            const fileType = file.type;
            const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

            return !acceptTypes.some(type => {
              if (type.startsWith('.')) {
                return fileExtension === type.toLowerCase();
              } else if (type.endsWith('/*')) {
                const category = type.split('/')[0];
                return fileType.startsWith(`${category}/`);
              } else {
                return fileType === type;
              }
            });
          });

          if (invalidFiles.length > 0) {
            setError(`Some files are not accepted. Please upload ${accept} files only.`);
            return;
          }
        }

        onFilesSelected(fileArray);
      } else {
        // Handle single file (existing logic)
        const file = files[0];
        if (accept !== '*') {
          const acceptTypes = accept.split(',').map(type => type.trim());
          const fileType = file.type;
          const fileExtension = `.${file.name.split('.').pop()?.toLowerCase()}`;

          const isAccepted = acceptTypes.some(type => {
            if (type.startsWith('.')) {
              return fileExtension === type.toLowerCase();
            } else if (type.endsWith('/*')) {
              const category = type.split('/')[0];
              return fileType.startsWith(`${category}/`);
            } else {
              return fileType === type;
            }
          });

          if (!isAccepted) {
            setError(`File type not accepted. Please upload ${accept} files.`);
            return;
          }
        }

        processFile(file);
      }
    }
  }, [disabled, accept, processFile, multiple, onFilesSelected]);

  return (
    <div className={cn("space-y-2", className)}>
      <input
        type="file"
        ref={inputRef}
        onChange={handleFileChange}
        accept={accept}
        multiple={multiple}
        className="hidden"
        disabled={disabled}
      />

      <div className="flex flex-col space-y-2">
        <div
          ref={dropZoneRef}
          onDragEnter={handleDragEnter}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className={cn(
            "border-2 border-dashed rounded-md p-6 transition-colors",
            isDragging ? "border-primary bg-primary/5" : "border-muted-foreground/20",
            disabled ? "opacity-50 cursor-not-allowed" : "cursor-pointer",
            "flex flex-col items-center justify-center gap-2"
          )}
          onClick={handleClick}
        >
          <Upload className="h-8 w-8 text-muted-foreground" />
          <div className="flex flex-col items-center gap-1">
            <p className="text-sm font-medium">
              {isDragging ? "Drop file here" : buttonText}
            </p>
            <p className="text-xs text-muted-foreground">
              Drag & drop or click to browse
            </p>
            {accept !== "*" && (
              <p className="text-xs text-muted-foreground">
                Accepts: {accept}
              </p>
            )}
          </div>
        </div>

        {fileName && !error && (
          <p className="text-sm text-muted-foreground truncate max-w-full">
            Selected: {fileName}
          </p>
        )}

        {isConverting && (
          <div className="flex items-center text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            Converting AAC file to MP3 format...
          </div>
        )}

        {error && (
          <div className="flex items-center text-red-500 text-sm">
            <AlertCircle className="h-4 w-4 mr-2" />
            {error}
          </div>
        )}
      </div>
    </div>
  );
}
