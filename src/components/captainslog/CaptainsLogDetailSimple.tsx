'use client';

import React, { useState, useEffect, useMemo } from 'react';
import { useEditor, EditorContent } from '@tiptap/react'; // Tiptap imports
import StarterKit from '@tiptap/starter-kit'; // Tiptap starter kit
import { SimpleAudioPlayer } from './SimpleAudioPlayer';
import { splitTranscriptionIntoSegmentsImproved, findActiveSegmentBinarySearch, groupSegmentsIntoParagraphs } from '@/lib/transcription-utils-improved';
import { LogEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Input } from '@/components/ui/input';
import { RetranscribeButton } from './RetranscribeButton';
import { TagInput } from '@/components/ui/tag-input';
import { Label } from '@/components/ui/label';
import { TranscriptionProgress } from './TranscriptionProgress';
import { UserNotesSection } from './UserNotesSection';
import {
  ArrowLeft,
  Star,
  StarOff,
  Trash2,
  Edit,
  Check,
  X,
  Clock,
  RefreshCw
} from 'lucide-react';
import { formatDistanceToNow } from 'date-fns';
import { formatDuration } from '@/lib/utils';
import { Card, CardContent } from '@/components/ui/card';
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

  return formattedSummary;
}

/**
 * CaptainsLogDetailSimple Props
 *
 * @property entry - The log entry to display
 * @property onBack - Callback when the back button is clicked
 * @property onDelete - Callback when the entry is deleted
 * @property onUpdate - Callback when the entry is updated
 * @property onToggleFavorite - Callback when the favorite status is toggled
 * @property initialEditMode - Optional initial edit mode to activate on load
 */
interface CaptainsLogDetailSimpleProps {
  entry: LogEntry;
  onBack: () => void;
  onDelete: (id: string) => void;
  onUpdate: (updatedEntry: LogEntry) => void;
  onToggleFavorite: (id: string) => void;
  initialEditMode?: 'title' | 'summary' | 'transcription';
}

/**
 * Detailed view for a Captain's Log entry
 *
 * Features:
 * - Audio playback with progress bar
 * - Transcription display with segment highlighting
 * - Summary display
 * - Editing capabilities for title and transcription
 * - Bidirectional synchronization between text and audio
 * - Re-transcription functionality for existing recordings
 */
export function CaptainsLogDetailSimple({ entry, onBack, onDelete, onUpdate, onToggleFavorite, initialEditMode }: CaptainsLogDetailSimpleProps) {
  type Segment = { text: string; startTime?: number; endTime?: number; start?: number; end?: number; }; // Made startTime/endTime optional
  const [isEditingTitle, setIsEditingTitle] = useState(false);
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [isEditingTranscription, setIsEditingTranscription] = useState(false);
  const [editedTitle, setEditedTitle] = useState(entry.title);
  const [editedTranscription, setEditedTranscription] = useState(entry.transcription || '');
  const [editedTags, setEditedTags] = useState(entry.tags || []);
  const [editedSummary, setEditedSummary] = useState<string>(entry.summary || ''); // Ensure it's always a string
  const [editedSegments, setEditedSegments] = useState<any[]>([]);
  const [showDeleteConfirmation, setShowDeleteConfirmation] = useState(false);
  const [currentPlaybackTime, setCurrentPlaybackTime] = useState(0);
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1);
  const [seekTo, setSeekTo] = useState<number | null>(null);

  // With SRT timestamps, we don't need any offset correction

  // Use SRT segments if available, otherwise split transcription
  const segments = useMemo<Segment[]>(() => {
    try {
      // If we have SRT segments from Whisper, use those
      if (entry.segments && entry.segments.length > 0) {
        console.log('Using SRT segments from Whisper:', entry.segments.length);
        return entry.segments.map((segment): Segment => ({
          text: segment.text,
          startTime: segment.startTime, // Removed || 0
          endTime: segment.endTime,     // Removed || 0
          start: segment.start,
          end: segment.end
        }));
      }

      // Fallback: split transcription if no segments are available
      if (!entry.transcription || !entry.duration) {
        return [];
      }
      console.log('No SRT segments available, using fallback splitting');
      return splitTranscriptionIntoSegmentsImproved(entry.transcription, entry.duration);
    } catch (error) {
      console.error('Error processing segments:', error);
      return [];
    }
  }, [entry.segments, entry.transcription, entry.duration]);

  // Group segments into paragraphs for better readability
  const paragraphs = useMemo(() => {
    try {
      if (segments.length === 0) {
        return [];
      }

      // Convert segments to the format expected by groupSegmentsIntoParagraphs
      const formattedSegments = segments.map(segment => ({
        text: segment.text,
        startTime: segment.startTime ?? segment.start ?? 0,
        endTime: segment.endTime ?? segment.end ?? 0
      }));

      return groupSegmentsIntoParagraphs(formattedSegments);
    } catch (error) {
      console.error('Error grouping segments into paragraphs:', error);
      return [];
    }
  }, [segments]);

  // Handle audio time updates
  const handleTimeUpdate = (time: number) => {
    setCurrentPlaybackTime(time);

    // Find active segment
    if (segments.length > 0 && !isEditingTranscription) {
      try {
        // Find the segment that corresponds to current playback time
        // With SRT timestamps, we don't need offset correction
        // Map segments to ensure startTime/endTime are numbers for the search function
        const searchableSegments = segments.map(s => ({
          ...s,
          startTime: s.startTime ?? s.start ?? 0, // Use .start as fallback for search
          endTime: s.endTime ?? s.end ?? 0,       // Use .end as fallback for search (assuming .end is also seconds)
        }));
        const currentSegmentIndex = findActiveSegmentBinarySearch(searchableSegments, time);

        if (currentSegmentIndex !== -1 && currentSegmentIndex !== activeSegmentIndex) {
          // Log only occasionally to reduce console spam
          if (currentSegmentIndex % 3 === 0) {
            console.log(`Time ${time.toFixed(2)}s maps to segment ${currentSegmentIndex}`);
          }
          setActiveSegmentIndex(currentSegmentIndex);
        }
      } catch (error) {
        console.error('Error processing segments:', error);
      }
    }
  };

  // Handle segment click - with SRT timestamps, we don't need offset correction
  const handleSegmentClick = (index: number) => {
    if (index < 0 || index >= segments.length) return;

    try {
      const segment = segments[index];

      // Check for both possible property names (start/startTime)
      const startTime: number = segment.startTime ?? segment.start ?? 0;

      if (typeof startTime !== 'number' || isNaN(startTime) || !isFinite(startTime)) {
        // Skip segments with invalid start times
        return;
      }

      // Set the active segment for visual feedback
      setActiveSegmentIndex(index as number);

      // Seek to the exact start time from the SRT data
      setSeekTo(startTime);

      // Reset seekTo after it's been consumed
      setTimeout(() => setSeekTo(null), 100);
    } catch (error) {
      console.error('Error handling segment click:', error);
    }
  };

  // Initialize edited segments when entering edit mode
  useEffect(() => {
    if (isEditingTranscription && segments.length > 0) {
      setEditedSegments([...segments]);
    }
  }, [isEditingTranscription, segments]);

  // Handle initial edit mode
  useEffect(() => {
    if (initialEditMode) {
      switch (initialEditMode) {
        case 'title':
          setIsEditingTitle(true);
          break;
        case 'summary':
          setIsEditingSummary(true);
          break;
        case 'transcription':
          setIsEditingTranscription(true);
          break;
      }
    }
  }, [initialEditMode]);

  // Handle save title
  const handleSaveTitle = () => {
    const updatedEntry = {
      ...entry,
      title: editedTitle,
      updatedAt: new Date()
    };
    onUpdate(updatedEntry);
    setIsEditingTitle(false);
  };

  // Handle save summary and tags
  const handleSaveSummary = () => {
    // Get HTML content from Tiptap editor
    const summaryHtml = editor?.getHTML() || '';
    const updatedEntry = {
      ...entry,
      summary: summaryHtml, // Use HTML from editor
      tags: editedTags,
      updatedAt: new Date()
    };
    onUpdate(updatedEntry);
    setIsEditingSummary(false);
  };

  // Handle save transcription
  const handleSaveTranscription = () => {
    const updatedEntry = {
      ...entry,
      transcription: editedTranscription,
      updatedAt: new Date()
    };

    // If we have edited segments, update them in the entry
    if (editedSegments.length > 0) {
      updatedEntry.segments = editedSegments;
    }

    console.log('Saving updated transcription:', updatedEntry);
    onUpdate(updatedEntry);
    setIsEditingTranscription(false);
  };

  // Handle cancel title
  const handleCancelTitle = () => {
    setEditedTitle(entry.title);
    setIsEditingTitle(false);
  };

  // Handle cancel summary
  const handleCancelSummary = () => {
    setEditedTags(entry.tags || []);
    setEditedSummary(entry.summary || ''); // Ensure string
    editor?.commands.setContent(entry.summary || ''); // Reset editor content
    setIsEditingSummary(false);
  };

  // Handle cancel transcription
  const handleCancelTranscription = () => {
    setEditedTranscription(entry.transcription || '');
    setIsEditingTranscription(false);
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

  // Tiptap Editor Setup
  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] }, // Configure desired extensions
        bulletList: { keepMarks: true, keepAttributes: true },
        orderedList: { keepMarks: true, keepAttributes: true },
        // Disable extensions not needed for summary
        blockquote: false,
        codeBlock: false,
        hardBreak: false,
        horizontalRule: false,
        code: false,
        strike: false, // Allow bold, italic, lists, headings
      }),
    ],
    content: editedSummary, // Initial content
    onUpdate: ({ editor }) => {
      setEditedSummary(editor.getHTML()); // Update state on change
    },
    editorProps: {
      attributes: {
        // Add styling similar to Textarea
        class: 'prose prose-sm sm:prose lg:prose-lg xl:prose-xl focus:outline-none border border-input bg-background shadow-sm rounded-md px-3 py-2 min-h-[120px] max-h-[400px] overflow-auto', // Added max-h and overflow-auto
      },
    },
  });

  // Reset editor content if editing is cancelled externally or entry changes
  useEffect(() => {
    if (!isEditingSummary && editor && entry.summary !== editor.getHTML()) {
      editor.commands.setContent(entry.summary || '');
    }
  }, [isEditingSummary, entry.summary, editor]);

  // Make sure editor is destroyed when component unmounts
  useEffect(() => {
    return () => {
      editor?.destroy();
    };
  }, [editor]);


  return (
    <div className="flex flex-col h-full relative" data-captains-log-detail>
      {/* Header with back button and title */}
      <div className="flex items-center gap-2 pt-1 pl-2 pr-6 pb-4">
        <Button variant="ghost" size="sm" onClick={onBack} className="hover:bg-transparent p-1 flex-shrink-0">
          <ArrowLeft className="h-4 w-4" />
        </Button>

        {isEditingTitle ? (
          <div className="flex items-center space-x-2 flex-1">
            <Input
              value={editedTitle}
              onChange={(e) => setEditedTitle(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleSaveTitle();
                } else if (e.key === 'Escape') {
                  e.preventDefault();
                  handleCancelTitle();
                }
              }}
              className="text-xl font-semibold"
              autoFocus
            />
            <Button size="sm" variant="ghost" onClick={handleSaveTitle}>
              <Check className="h-4 w-4" />
            </Button>
            <Button size="sm" variant="ghost" onClick={handleCancelTitle}>
              <X className="h-4 w-4" />
            </Button>
          </div>
        ) : (
          <h1
            className="text-xl font-semibold cursor-pointer hover:bg-muted/50 px-2 py-1 rounded-md transition-colors flex-1 truncate"
            onClick={() => setIsEditingTitle(true)}
          >
            {entry.title}
          </h1>
        )}
      </div>

      {/* Split-screen layout */}
      <div className="flex-1 flex gap-4 px-6 pb-4 min-h-0">
        {/* Left half (50%) - Transcription */}
        <div className="flex-1 min-h-0">
          {/* Transcription content - takes full height of left panel */}
          <div className="h-full min-h-0">
            {isEditingTranscription ? (
              <div className="h-full flex flex-col space-y-4">
                <div className="flex-1 min-h-0">
                  {editedSegments.length > 0 ? (
                    <div className="border rounded-md p-4 space-y-2 h-full overflow-y-auto">
                      {editedSegments.map((segment, index) => {
                        // Format timestamp for display (MM:SS)
                        const startTime = segment.startTime || segment.start || 0;
                        const minutes = Math.floor(startTime / 60);
                        const seconds = Math.floor(startTime % 60);
                        const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                        // Extract the segment text for editing
                        const segmentText = segment.text;

                        return (
                          <div key={index} className="flex gap-2">
                            <div className="text-xs text-muted-foreground w-10 flex-shrink-0 pt-1">
                              [{timestamp}]
                            </div>
                            <Textarea
                              value={segmentText}
                              onChange={(e) => {
                                // Update the segment text while preserving timestamps
                                const newSegments = [...editedSegments];
                                newSegments[index] = {
                                  ...newSegments[index],
                                  text: e.target.value
                                };

                                // Update the full transcription text
                                const newTranscription = newSegments.map(s => s.text).join(' ');
                                setEditedTranscription(newTranscription);
                                setEditedSegments(newSegments);
                              }}
                              className="min-h-[60px] text-sm"
                            />
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <Textarea
                      id="transcription"
                      value={editedTranscription}
                      onChange={(e) => setEditedTranscription(e.target.value)}
                      className="h-full resize-none focus:border-primary"
                      placeholder="Enter transcription here..."
                    />
                  )}
                </div>

                <div className="flex justify-between space-x-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      // Retranscribe the audio
                      if (onUpdate) {
                        onUpdate({
                          ...entry,
                          transcription: entry.transcription || '', // Clear transcription to trigger retranscription
                          segments: undefined,
                          processingStatus: 'transcribing',
                          processingProgress: 10
                        });
                      }
                    }}
                    className="text-muted-foreground"
                  >
                    <RefreshCw className="h-3.5 w-3.5 mr-1" />
                    Regenerate Transcription
                  </Button>

                  <div className="flex space-x-2">
                    <Button variant="outline" onClick={handleCancelTranscription}>
                      Cancel
                    </Button>
                    <Button onClick={handleSaveTranscription}>
                      Save Changes
                    </Button>
                  </div>
                </div>
              </div>
            ) : (
              <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200 h-full">
                <CardContent className="p-2 pt-0 h-full flex flex-col relative">
                  <div className="mb-0">
                    <h2 className="text-lg font-medium">Transcription</h2>
                  </div>

                  <div className="flex-1 overflow-y-auto">
                  {paragraphs.length > 0 ? (
                    <div className="space-y-6">
                      {paragraphs.map((paragraph, pIndex) => {
                        // Format timestamp for display (MM:SS)
                        const startTime = paragraph.startTime;
                        const minutes = Math.floor(startTime / 60);
                        const seconds = Math.floor(startTime % 60);
                        const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                        // Check if any segment in this paragraph is active
                        const isActive = paragraph.segments.some(s => s.index === activeSegmentIndex);

                        return (
                          <div key={pIndex} className="paragraph-container">
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-muted-foreground pt-1 w-10 flex-shrink-0">
                                [{timestamp}]
                              </span>
                              <p
                                className={`text-sm leading-relaxed ${isActive ? 'bg-primary/10 -mx-2 px-2 py-1 rounded-md' : ''}`}
                              >
                                {/* Map through segments and make each clickable while preserving paragraph format */}
                                {paragraph.segments.map((segment, sIndex) => (
                                  <span
                                    key={sIndex}
                                    className={`cursor-pointer ${segment.index === activeSegmentIndex ? 'bg-primary/20' : 'hover:bg-primary/5'}`}
                                    onClick={() => handleSegmentClick(segment.index)}
                                  >
                                    {segment.text}{sIndex < paragraph.segments.length - 1 ? ' ' : ''}
                                  </span>
                                ))}
                              </p>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : segments.length > 0 ? (
                    // Fallback to original segment view if paragraphs couldn't be created
                    <div className="space-y-4">
                      {segments.map((segment, index) => {
                        // Format timestamp for display (MM:SS)
                        const startTime = segment.startTime || segment.start || 0;
                        const minutes = Math.floor(startTime / 60);
                        const seconds = Math.floor(startTime % 60);
                        const timestamp = `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;

                        return (
                          <div
                            key={index}
                            className={`cursor-pointer transition-colors ${
                              index === activeSegmentIndex ? 'bg-primary/10 -mx-2 px-2 py-1 rounded-md' : ''
                            }`}
                            onClick={() => handleSegmentClick(index)}
                          >
                            <div className="flex items-start gap-2">
                              <span className="text-xs text-muted-foreground pt-0.5 w-10 flex-shrink-0">
                                [{timestamp}]
                              </span>
                              <span className="text-sm">{segment.text}</span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="text-muted-foreground italic">
                      No transcription available for this recording.
                    </p>
                  )}
                  </div>

                  {/* Edit button positioned at bottom right */}
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingTranscription(true)}
                    className="absolute bottom-2 right-2 h-7 w-7 p-0"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>

        {/* Right half (50%) - Split into Summary (top 25%) and Notes (bottom 25%) */}
        <div className="flex-1 flex flex-col gap-4 min-h-0">
          {/* Summary section - top half of right panel */}
          <div className="flex-1 min-h-0">
            <Card className="border shadow-sm hover:shadow-md transition-shadow duration-200 h-full">
              <CardContent className="p-2 pt-0 h-full flex flex-col relative">
                <div className="mb-0">
                  <h2 className="text-lg font-medium">Summary</h2>
                </div>

                {/* Summary content */}
                {isEditingSummary ? (
                  <div className="flex-1 flex flex-col space-y-2">
                    <div className="flex-1 min-h-0">
                      <EditorContent editor={editor} />
                    </div>

                    {/* Divider */}
                    <Separator className="my-2" />

                    {/* Tags section */}
                    <div className="space-y-2">
                      <TagInput
                        value={editedTags}
                        onChange={setEditedTags}
                        placeholder="Add tags..."
                      />
                      <p className="text-xs text-muted-foreground">Press Tab, Space, or Enter to add a tag</p>
                    </div>

                    {/* Save/Cancel buttons */}
                    <div className="flex justify-between items-center">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          // Regenerate summary using the current transcription
                          if (onUpdate) {
                            onUpdate({
                              ...entry,
                              summary: undefined, // Clear summary to trigger regeneration
                              processingStatus: 'transcribing',
                              processingProgress: 80
                            });
                          }
                        }}
                        className="text-muted-foreground"
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1" />
                        Regenerate Summary
                      </Button>

                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={handleCancelSummary}>
                          Cancel
                        </Button>
                        <Button size="sm" onClick={handleSaveSummary}>
                          Save Changes
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex flex-col min-h-0">
                    {entry.summary ? (
                      <div
                        className="flex-1 prose prose-sm max-w-none prose-headings:text-primary prose-headings:font-medium prose-li:my-0 prose-p:my-1 overflow-auto"
                        dangerouslySetInnerHTML={{ __html: formatSummary(entry.summary) }}
                      />
                    ) : (
                      <div className="flex-1 flex items-center justify-center">
                        <p className="text-muted-foreground italic text-center">
                          No summary available for this recording.
                        </p>
                      </div>
                    )}

                    {/* Divider */}
                    <Separator className="my-4" />

                    {/* Tags section */}
                    <div>
                      {entry.tags && entry.tags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {entry.tags.map((tag, index) => (
                            <div key={`${tag}-${index}`} className="bg-secondary text-secondary-foreground px-2 py-1 rounded-md text-sm">
                              {tag}
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-muted-foreground italic text-sm">
                          No tags added to this recording.
                        </p>
                      )}
                    </div>
                  </div>
                )}

                {/* Edit button positioned at bottom right - only show when not editing */}
                {!isEditingSummary && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setIsEditingSummary(true)}
                    className="absolute bottom-2 right-2 h-7 w-7 p-0 z-10"
                  >
                    <Edit className="h-3 w-3" />
                  </Button>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Notes section - bottom half of right panel */}
          <div className="flex-1 min-h-0">
            <UserNotesSection entry={entry} onUpdate={onUpdate} />
          </div>
        </div>
      </div>

      {/* Add padding at the bottom to account for the fixed player */}
      <div className="pb-16"></div>

      {/* Audio player at the bottom */}
      {/* Audio player at the bottom - Updated to use CSS variables for dynamic positioning */}
      <div className="fixed bottom-0 left-[var(--sidebar-left-width,0px)] right-[var(--sidebar-right-width,0px)] border-t shadow-md py-1.5 bg-background z-10 transition-all duration-300 ease-in-out">
        <div className="container mx-auto max-w-4xl">
          <div className="text-center mb-1 font-medium">
            {entry.title}
          </div>
          <SimpleAudioPlayer
            audioUrl={entry.audioUrl}
            onTimeUpdate={handleTimeUpdate}
            seekTo={seekTo}
            initialDuration={entry.duration}
            entry={entry}
          />
        </div>
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