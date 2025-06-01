'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { splitTranscriptionIntoSegmentsImproved, findActiveSegmentBinarySearch } from '@/lib/transcription-utils-improved';
import { AudioPlayerImproved } from './AudioPlayerImproved';
import { TranscriptSegment } from './TranscriptSegment';
import { LogEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Star,
  StarOff,
  Trash2,
  Edit,
  Check,
  X,
  Clock
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatDuration } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { DeleteConfirmation } from '@/components/ui/delete-confirmation';

/**
 * Format the summary text with proper HTML for bullet points and formatting
 */
function formatSummary(summary: string): string {
  if (!summary) return '';

  // First, remove the duplicate "Summary" header if present
  let formattedSummary = summary
    // Remove the Summary header (both HTML and plain text versions)
    .replace(/<h3>\s*Summary\s*<\/h3>/i, '')
    .replace(/^\s*##\s*Summary\s*$/gm, '');

  // The summary should already be in HTML format from the API
  // We just need to add some styling classes
  formattedSummary = formattedSummary
    // Add styling to h3 elements
    .replace(/<h3>/g, '<h3 class="text-lg font-semibold mt-3 mb-2">')
    // Add styling to ul elements
    .replace(/<ul>/g, '<ul class="list-disc pl-5 space-y-1">')
    // Add styling to li elements
    .replace(/<li>/g, '<li class="my-1">');

  // Handle any legacy markdown format that might still be present
  formattedSummary = formattedSummary
    // Convert markdown headers to HTML headers with proper styling
    .replace(/^\s*##\s+(.+)$/gm, '<h3 class="text-lg font-semibold mt-3 mb-2">$1</h3>')
    // Convert bullet points to list items
    .replace(/^\s*[-*]\s+(.+)$/gm, '<li class="my-1">$1</li>')
    // Convert double line breaks to HTML breaks
    .replace(/\n\n/g, '<br/>')
    // Convert bold markdown to HTML
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    // Convert italic markdown to HTML
    .replace(/\*(.+?)\*/g, '<em>$1</em>');

  // Ensure all list items are properly wrapped in ul tags
  if (formattedSummary.includes('<li') && !formattedSummary.includes('<ul')) {
    // Find all list items
    const listItemRegex = /<li[^>]*>[^<]*<\/li>/g;
    const listItems = formattedSummary.match(listItemRegex) || [];

    if (listItems.length > 0) {
      // Remove list items from the content
      let contentWithoutListItems = formattedSummary;
      listItems.forEach(item => {
        contentWithoutListItems = contentWithoutListItems.replace(item, '');
      });

      // Add list items wrapped in ul
      formattedSummary = contentWithoutListItems +
        '<ul class="list-disc pl-5 space-y-1">' + listItems.join('') + '</ul>';
    }
  }

  return formattedSummary;
}

interface CaptainsLogDetailProps {
  entry: LogEntry;
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdate: (updatedEntry: LogEntry) => void;
  onToggleFavorite: (id: string) => void;
}

export function CaptainsLogDetailImproved({ entry, onBack, onDelete, onUpdate, onToggleFavorite }: CaptainsLogDetailProps) {
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(entry.title);
  const [editedTranscription, setEditedTranscription] = useState(entry.transcription || '');
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState(entry.duration);
  const [isAudioReady, setIsAudioReady] = useState(false);
  const [seekTo, setSeekTo] = useState<number | null>(null);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);

  // Split transcription into time-aligned segments using improved algorithm
  const segments = useMemo(() => {
    try {
      // Make sure we have valid inputs
      if (!entry.transcription || !entry.duration || isNaN(entry.duration)) {
        console.warn('Invalid inputs for splitTranscriptionIntoSegmentsImproved:', {
          transcription: !!entry.transcription,
          duration: entry.duration
        });
        // Use a default duration if needed
        const safeDuration = entry.duration > 0 ? entry.duration : 60;
        return splitTranscriptionIntoSegmentsImproved(entry.transcription || '', safeDuration);
      }
      return splitTranscriptionIntoSegmentsImproved(entry.transcription, entry.duration);
    } catch (error) {
      console.error('Error splitting transcription into segments:', error);
      return [];
    }
  }, [entry.transcription, entry.duration]);

  // Handle audio time updates with high precision
  const handleTimeUpdate = (time: number) => {
    if (typeof time === 'number' && isFinite(time) && !isNaN(time)) {
      setCurrentPlaybackTime(time);

      // Find active segment using binary search (more efficient)
      if (segments.length > 0 && !isEditing && isAudioReady) {
        try {
          const newActiveSegment = findActiveSegmentBinarySearch(segments, time);
          if (newActiveSegment !== -1 && newActiveSegment !== activeSegmentIndex) {
            setActiveSegmentIndex(newActiveSegment);

            // Only log occasionally to reduce console spam
            if (newActiveSegment % 5 === 0) {
              console.log(`Active segment changed to ${newActiveSegment} at time ${time}s`);
            }
          }
        } catch (error) {
          console.error('Error finding active segment:', error);
        }
      }
    }
  };

  // Handle duration changes
  const handleDurationChange = (duration: number) => {
    if (typeof duration === 'number' && isFinite(duration) && !isNaN(duration) && duration > 0) {
      console.log('Duration updated to:', duration);
      setAudioDuration(duration);
    }
  };

  // Handle audio ready state
  const handleAudioReady = () => {
    console.log('Audio is ready for playback');
    setIsAudioReady(true);
  };

  // Handle segment click
  const handleSegmentClick = (index: number) => {
    if (!isAudioReady || index < 0 || index >= segments.length) {
      console.warn('Cannot handle segment click: Audio not ready or invalid index');
      return;
    }

    try {
      const segment = segments[index];

      // Validate segment time
      if (typeof segment.startTime !== 'number' || isNaN(segment.startTime) || !isFinite(segment.startTime)) {
        console.error('Invalid segment start time');
        return;
      }

      console.log(`Clicking segment ${index} to seek to ${segment.startTime}s`);

      // Set the active segment immediately for visual feedback
      setActiveSegmentIndex(index);

      // Set precise seek time with a small delay to ensure UI updates first
      setTimeout(() => {
        setSeekTo(segment.startTime);

        // Reset seek after it's been consumed
        setTimeout(() => setSeekTo(null), 100);
      }, 10);
    } catch (error) {
      console.error('Error handling segment click:', error);
    }
  };

  // Handle save
  const handleSave = () => {
    onUpdate({
      ...entry,
      title: editedTitle,
      transcription: editedTranscription,
      updatedAt: new Date()
    });
    setIsEditing(false);
  };

  // Handle cancel
  const handleCancel = () => {
    setEditedTitle(entry.title);
    setEditedTranscription(entry.transcription || '');
    setIsEditing(false);
  };

  // Handle delete
  const handleDelete = () => {
    setShowDeleteConfirmation(true);
  };

  // Confirm delete
  const confirmDelete = () => {
    onDelete(entry.id);
    setShowDeleteConfirmation(false);
  };

  return (
    <div className="space-y-4">
      {/* Header with back button and actions */}
      <div className="flex justify-between items-center">
        <Button variant="ghost" size="sm" onClick={onBack}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back
        </Button>
        <div className="flex space-x-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => onToggleFavorite(entry.id)}
            title={entry.isFavorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            {entry.isFavorite ? (
              <Star className="h-4 w-4 text-yellow-400" />
            ) : (
              <StarOff className="h-4 w-4" />
            )}
          </Button>
          {isEditing ? (
            <>
              <Button variant="ghost" size="sm" onClick={handleCancel}>
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button variant="default" size="sm" onClick={handleSave}>
                <Check className="mr-2 h-4 w-4" />
                Save
              </Button>
            </>
          ) : (
            <>
              <Button variant="ghost" size="sm" onClick={() => setIsEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button variant="ghost" size="sm" onClick={handleDelete} className="text-destructive">
                <Trash2 className="mr-2 h-4 w-4" />
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Title */}
      {isEditing ? (
        <Input
          value={editedTitle}
          onChange={(e) => setEditedTitle(e.target.value)}
          className="text-xl font-semibold"
        />
      ) : (
        <h1 className="text-xl font-semibold">{entry.title}</h1>
      )}

      {/* Metadata */}
      <div className="flex items-center text-sm text-muted-foreground">
        <Clock className="mr-1 h-4 w-4" />
        <span>
          {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
        </span>
        <Separator orientation="vertical" className="mx-2 h-4" />
        <span>{formatDuration(audioDuration)}</span>
      </div>

      {/* Audio player */}
      <Card>
        <CardContent className="p-4">
          <AudioPlayerImproved
            audioUrl={entry.audioUrl}
            onTimeUpdate={handleTimeUpdate}
            onDurationChange={handleDurationChange}
            onReady={handleAudioReady}
            seekTo={seekTo}
          />
        </CardContent>
      </Card>

      {/* Summary section */}
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Summary</h2>
        <Card className="bg-white border shadow-sm">
          <CardContent className="pt-3 pb-4">
            {entry.summary ? (
              <div
                className="prose prose-sm max-w-none prose-headings:text-primary prose-headings:font-medium prose-li:my-0 prose-p:my-1"
                dangerouslySetInnerHTML={{ __html: formatSummary(entry.summary) }}
              />
            ) : (
              <p className="text-muted-foreground italic">
                No summary available for this recording.
              </p>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Transcription */}
      <div className="space-y-2">
        <h2 className="text-lg font-medium">Transcription</h2>
        {isEditing ? (
          <Textarea
            value={editedTranscription}
            onChange={(e) => setEditedTranscription(e.target.value)}
            className="min-h-[200px] max-h-[400px] overflow-y-auto"
          />
        ) : (
          <div
            className="p-4 border rounded-md bg-white relative"
            title="Click on text to seek to that position in the audio"
          >
            {/* Segmented transcription with highlighting */}
            <div className="whitespace-pre-wrap cursor-pointer relative z-10 max-h-[400px] overflow-y-auto pr-2">
              {segments.length > 0 ? (
                segments.map((segment, index) => (
                  <TranscriptSegment
                    key={index}
                    text={segment.text}
                    startTime={segment.startTime}
                    endTime={segment.endTime}
                    isActive={index === activeSegmentIndex}
                    onClick={() => handleSegmentClick(index)}
                    index={index}
                  />
                ))
              ) : (
                entry.transcription
              )}
            </div>
          </div>
        )}
      </div>

      {/* Delete confirmation dialog */}
      <DeleteConfirmation
        isOpen={showDeleteConfirmation}
        onClose={() => setShowDeleteConfirmation(false)}
        onConfirm={confirmDelete}
        title="Delete Recording"
        description="Are you sure you want to delete this recording? This action cannot be undone."
      />
    </div>
  );
}