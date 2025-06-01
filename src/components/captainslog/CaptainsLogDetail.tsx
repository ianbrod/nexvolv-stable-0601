'use client';

import React, { useState, useRef, useEffect, useMemo } from 'react';
import { splitTranscriptionIntoSegments, findSegmentAtTime, findSegmentFromClick } from '@/lib/transcription-utils';
import { AudioPlayer } from './AudioPlayer';
import { LogEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import {
  ArrowLeft,
  Star,
  StarOff,
  Trash2,
  Play,
  Pause,
  Clock,
  Edit,
  Check,
  X
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatDuration } from '@/lib/utils';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
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
  onUpdate: (updatedEntry: LogEntry) => void;
  onDelete: (entryId: string) => void;
  onToggleFavorite: (entryId: string) => void;
}

export function CaptainsLogDetail({
  entry,
  onBack,
  onUpdate,
  onDelete,
  onToggleFavorite
}: CaptainsLogDetailProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editedTitle, setEditedTitle] = useState(entry.title);
  const [editedTranscription, setEditedTranscription] = useState(entry.transcription);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const audioPlayerRef = useRef<{ seekTo: (time: number) => void }>(null);

  // Split transcription into time-aligned segments
  const segments = useMemo(() => {
    // Make sure we have valid inputs
    if (!entry.transcription || !entry.duration || isNaN(entry.duration)) {
      console.warn('Invalid inputs for splitTranscriptionIntoSegments:', {
        transcription: !!entry.transcription,
        duration: entry.duration
      });
      // Use a default duration if needed
      const safeDuration = entry.duration > 0 ? entry.duration : 60;
      return splitTranscriptionIntoSegments(entry.transcription || '', safeDuration);
    }
    return splitTranscriptionIntoSegments(entry.transcription, entry.duration);
  }, [entry.transcription, entry.duration]);

  // Update active segment based on current playback time
  useEffect(() => {
    if (segments.length > 0 && !isEditing) {
      try {
        const newActiveSegment = findSegmentAtTime(segments, currentPlaybackTime);
        if (newActiveSegment !== activeSegmentIndex && newActiveSegment >= 0 && newActiveSegment < segments.length) {
          // Only log every few segments to reduce console spam
          if (newActiveSegment % 3 === 0) {
            console.log('Active segment changed to:', newActiveSegment, 'at time:', currentPlaybackTime);
          }

          setActiveSegmentIndex(newActiveSegment);

          // Scroll the active segment into view, but only if it's significantly different
          // This prevents too much scrolling for small changes
          if (Math.abs(newActiveSegment - activeSegmentIndex) > 2) {
            setTimeout(() => {
              const activeElement = document.querySelector(`[data-segment-index="${newActiveSegment}"]`);
              if (activeElement) {
                activeElement.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
              }
            }, 100);
          }
        }
      } catch (error) {
        console.error('Error updating active segment:', error);
      }
    }
  }, [currentPlaybackTime, segments, activeSegmentIndex, isEditing]);

  // Handle audio playback time updates
  const handleTimeUpdate = (time: number) => {
    if (typeof time === 'number' && isFinite(time) && !isNaN(time)) {
      setCurrentPlaybackTime(time);

      // This is where audio-to-text synchronization happens
      // The useEffect above will handle updating the active segment
    }
  };

  // Handle clicks on the transcription to seek to that position
  const handleTranscriptionClick = (event: React.MouseEvent<HTMLDivElement>) => {
    if (!entry.transcription || !audioPlayerRef.current || segments.length === 0) return;

    // Find which segment was clicked
    const clickedSegmentIndex = findSegmentFromClick(event, segments);
    if (clickedSegmentIndex < 0 || clickedSegmentIndex >= segments.length) {
      console.warn('Invalid segment index:', clickedSegmentIndex);
      return;
    }

    console.log('Clicked segment:', clickedSegmentIndex, segments[clickedSegmentIndex]);

    // Get the start time of the clicked segment
    const seekTime = segments[clickedSegmentIndex].startTime;
    console.log('Seeking to time:', seekTime, 'out of', entry.duration);

    // Update the active segment
    setActiveSegmentIndex(clickedSegmentIndex);

    // Seek to that position in the audio
    try {
      if (audioPlayerRef.current) {
        audioPlayerRef.current.seekTo(seekTime);
      } else {
        console.error('Audio player reference is not available');
      }
    } catch (error) {
      console.error('Error seeking to time:', error);
    }
  };

  // We now handle scrolling in the time update effect

  // Handle audio playback
  const handlePlayPause = () => {
    // In a real implementation, this would control the audio element
    setIsPlaying(!isPlaying);
  };

  // Handle save edits
  const handleSaveEdits = () => {
    onUpdate({
      ...entry,
      title: editedTitle,
      transcription: editedTranscription,
      updatedAt: new Date()
    });
    setIsEditing(false);
  };

  // Handle cancel edits
  const handleCancelEdits = () => {
    setEditedTitle(entry.title);
    setEditedTranscription(entry.transcription);
    setIsEditing(false);
  };

  // Handle delete
  const handleDelete = () => {
    setDeleteDialogOpen(true);
  };

  // Handle confirm delete
  const handleConfirmDelete = () => {
    onDelete(entry.id);
    setDeleteDialogOpen(false);
  };

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <Button variant="ghost" onClick={onBack} className="pl-0">
          <ArrowLeft className="mr-2 h-4 w-4" />
          Back to Logs
        </Button>
        <div className="flex items-center space-x-2">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onToggleFavorite(entry.id)}
            className={entry.isFavorite ? "text-amber-500" : ""}
          >
            {entry.isFavorite ? <StarOff className="h-5 w-5" /> : <Star className="h-5 w-5" />}
          </Button>
          {!isEditing && (
            <Button variant="ghost" size="icon" onClick={() => setIsEditing(true)}>
              <Edit className="h-5 w-5" />
            </Button>
          )}
          <Button variant="ghost" size="icon" className="text-destructive" onClick={handleDelete}>
            <Trash2 className="h-5 w-5" />
          </Button>
        </div>
      </div>

      {isEditing ? (
        <div className="space-y-4">
          <Input
            value={editedTitle}
            onChange={(e) => setEditedTitle(e.target.value)}
            className="text-xl font-bold"
          />
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={handleCancelEdits}>
              <X className="mr-2 h-4 w-4" />
              Cancel
            </Button>
            <Button onClick={handleSaveEdits}>
              <Check className="mr-2 h-4 w-4" />
              Save Changes
            </Button>
          </div>
        </div>
      ) : (
        <h1 className="text-2xl font-bold">{entry.title}</h1>
      )}

      <div className="flex items-center text-sm text-muted-foreground">
        <Clock className="mr-1 h-3 w-3" />
        <span>{formatDistanceToNow(entry.createdAt, { addSuffix: true })} • {formatDuration(entry.duration)}</span>
      </div>

      <Card className="bg-muted/30">
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">Audio Recording</CardTitle>
          <CardDescription>Listen to the original recording</CardDescription>
        </CardHeader>
        <CardContent>
          <AudioPlayer
            ref={audioPlayerRef}
            audioUrl={entry.audioUrl}
            duration={entry.duration}
            onTimeUpdate={handleTimeUpdate}
          />
        </CardContent>
      </Card>

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
                  <span
                    key={index}
                    className={`transition-colors duration-200 ${index === activeSegmentIndex
                      ? 'bg-blue-200/60 rounded px-1 py-0.5 shadow-sm'
                      : 'hover:bg-blue-100/30 hover:rounded hover:px-1 hover:py-0.5'}`}
                    data-start-time={segment.startTime}
                    data-end-time={segment.endTime}
                    data-segment-index={index}
                    onClick={(e) => {
                      e.stopPropagation(); // Prevent event bubbling
                      if (!audioPlayerRef.current) {
                        console.error('Audio player reference not available');
                        return;
                      }

                      // Calculate a safe time to seek to
                      let safeTime = 0;

                      try {
                        // Try to get time from segment with a larger adjustment to fix the offset issue
                        if (typeof segment.startTime === 'number' && isFinite(segment.startTime) && !isNaN(segment.startTime)) {
                          // Find the previous segment's start time if possible
                          let adjustedTime;

                          // Try to use an even earlier segment to fix the 1-2 block delay
                          // If we're at least at the third segment, try to use three segments back
                          if (index >= 3 && segments[index-3] &&
                              typeof segments[index-3].startTime === 'number' &&
                              isFinite(segments[index-3].startTime)) {
                            // Use the segment that's three back
                            adjustedTime = segments[index-3].startTime;
                            console.log(`Using segment from three back: ${adjustedTime}s instead of current: ${segment.startTime}s`);
                          }
                          // If we're at least at the second segment, try to use two segments back
                          else if (index >= 2 && segments[index-2] &&
                              typeof segments[index-2].startTime === 'number' &&
                              isFinite(segments[index-2].startTime)) {
                            // Use the segment that's two back
                            adjustedTime = segments[index-2].startTime;
                            console.log(`Using segment from two back: ${adjustedTime}s instead of current: ${segment.startTime}s`);
                          }
                          // Otherwise, if we're not at the first segment, try to use the previous segment's start time
                          else if (index > 0 && segments[index-1] &&
                              typeof segments[index-1].startTime === 'number' &&
                              isFinite(segments[index-1].startTime)) {
                            // Use the previous segment's start time
                            adjustedTime = segments[index-1].startTime;
                            console.log(`Using previous segment time: ${adjustedTime}s instead of current: ${segment.startTime}s`);
                          } else {
                            // Apply a larger offset (about 3-4 segments worth)
                            const avgSegmentDuration = entry.duration / segments.length;
                            const offset = Math.min(4.0, avgSegmentDuration * 3.5);
                            adjustedTime = Math.max(0, segment.startTime - offset);
                            console.log(`Applied offset of ${offset}s to time: ${segment.startTime}s → ${adjustedTime}s`);
                          }

                          safeTime = adjustedTime;
                        } else {
                          // Fallback: calculate based on index and duration with a larger offset
                          const segmentCount = segments.length || 1;
                          const segmentDuration = (entry.duration || 60) / segmentCount;

                          // Use an offset based on the segment index
                          if (index >= 3) {
                            // If we're at least at the third segment, go back three segments
                            safeTime = Math.max(0, (index - 3) * segmentDuration);
                          } else if (index >= 2) {
                            // If we're at the second segment, go back two segments
                            safeTime = Math.max(0, (index - 2) * segmentDuration);
                          } else if (index > 0) {
                            // If we're at the first segment, go back one segment
                            safeTime = Math.max(0, (index - 1) * segmentDuration);
                          } else {
                            safeTime = 0; // Start at the beginning for the first segment
                          }
                        }

                        // Ensure time is within valid range
                        safeTime = Math.max(0, Math.min(safeTime, entry.duration || 60));

                        console.log(`Clicking segment ${index} to seek to ${safeTime}s`);

                        // IMPORTANT: We need to set the active segment to the one we clicked on,
                        // not the one we're seeking to. This fixes the mismatch between
                        // the clicked segment and the highlighted segment.
                        setActiveSegmentIndex(index);

                        // Then try to seek with a small delay to ensure UI updates first
                        setTimeout(() => {
                          try {
                            audioPlayerRef.current?.seekTo(safeTime);
                          } catch (error) {
                            console.error('Error seeking to segment:', error);
                          }
                        }, 10);
                      } catch (error) {
                        console.error('Error processing segment click:', error);
                      }
                    }}
                  >
                    {segment.text}
                    {index < segments.length - 1 && ' '}
                  </span>
                ))
              ) : (
                entry.transcription
              )}
            </div>

            {/* No progress indicator or text hint needed */}
          </div>
        )}
      </div>

      {/* Summary section with improved styling */}
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



      {/* Delete Confirmation Dialog */}
      <DeleteConfirmation
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={handleConfirmDelete}
        title="Delete Recording"
        description="Are you sure you want to delete this recording? This action cannot be undone."
      />
    </div>
  );
}
