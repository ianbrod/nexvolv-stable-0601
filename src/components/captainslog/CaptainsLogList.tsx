'use client';

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { LogEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Mic,
  Search,
  Star,
  Clock,
  Trash2,
  Upload,
  FolderIcon,
  Filter,
  MoreHorizontal,
  Edit,
  MoveVertical,
  CheckSquare,
  Square,
  GripVertical
} from 'lucide-react';
import {
  DndContext,
  DragOverlay,
  useSensor,
  useSensors,
  PointerSensor,
  KeyboardSensor,
  closestCenter,
  pointerWithin,
  rectIntersection,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent
} from '@dnd-kit/core';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { formatDistanceToNow, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { formatDuration } from '@/lib/utils';
import { DeleteConfirmation } from '@/components/ui/delete-confirmation';
import { LeftNavPanel } from './LeftNavPanel';
import { DateFilter } from './DateFilter';
import { Checkbox } from '@/components/ui/checkbox';
import { CaptainsLogBulkActionBar } from './CaptainsLogBulkActionBar';
import { singleFolderAssociationService } from '@/lib/services/single-folder-association-service';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal
} from "@/components/ui/dropdown-menu";

interface Folder {
  id: string;
  name: string;
}

interface CaptainsLogListProps {
  entries: LogEntry[];
  onSelectEntry: (entry: LogEntry) => void;
  onNewRecording: () => void;
  onUploadAudio: () => void;
  onToggleFavorite: (entryId: string) => Promise<void>;
  onDeleteEntry: (entryId: string) => Promise<void>;
  folders?: Folder[];
  onAddFolder?: (name: string) => void;
  onDeleteFolder?: (id: string) => void;
  onRenameFolder?: (id: string, newName: string) => void;
  onAssignToFolder?: (entryId: string, folderId: string) => Promise<void>;
  goals?: any[];
}

// Draggable entry component
function DraggableEntry({
  entry,
  folders,
  goals,
  onSelectEntry,
  onToggleFavorite,
  onDeleteEntry,
  selectMode,
  selectedEntries,
  onEntrySelect,
  setEntryToDelete,
  setDeleteDialogOpen,
  activeEntry
}: {
  entry: LogEntry,
  folders: Folder[],
  goals: any[],
  onSelectEntry: (entry: LogEntry) => void,
  onToggleFavorite: (entryId: string) => Promise<void>,
  onDeleteEntry: (entryId: string) => Promise<void>,
  selectMode: boolean,
  selectedEntries: Set<string>,
  onEntrySelect: (entryId: string, isSelected: boolean, isShiftClick?: boolean) => void,
  setEntryToDelete: React.Dispatch<React.SetStateAction<string | null>>,
  setDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>,
  activeEntry: LogEntry | null
}) {
  // Make the entry both draggable and droppable
  const { attributes, listeners, setNodeRef: setDragRef, transform, isDragging } = useDraggable({
    id: entry.id,
    data: {
      type: 'entry',
      entry
    }
  });

  // Make the entry's original position a drop target for cancellation
  const { setNodeRef: setDropRef, isOver } = useDroppable({
    id: `entry-position:${entry.id}`,
    data: {
      type: 'entry-position',
      entryId: entry.id
    },
    disabled: !activeEntry || activeEntry.id !== entry.id // Only enable when this entry is being dragged
  });

  // Combine the refs
  const setNodeRef = (node: HTMLElement | null) => {
    setDragRef(node);
    setDropRef(node);
  };

  const style = transform ? {
    transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
    opacity: isDragging ? 0.5 : 1,
    zIndex: isDragging ? 50 : 'auto',
  } : undefined;

  // Add a highlight effect when dragging over the original position
  const isBeingDraggedOver = isOver && activeEntry && activeEntry.id === entry.id;

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-md p-4 hover:bg-muted/50 transition-colors cursor-pointer ${isBeingDraggedOver ? 'bg-primary/10 border-primary/30 border-2' : ''}`}
      onClick={() => !selectMode && onSelectEntry(entry)}
      {...attributes}
    >
      {isBeingDraggedOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md z-10">
          <div className="text-sm font-medium text-primary">Drop here to cancel</div>
        </div>
      )}
      <div className="flex justify-between items-start">
        <div className="flex items-start">
          {/* Drag handle */}
          <div
            className="mr-2 cursor-grab active:cursor-grabbing"
            {...listeners}
            onClick={(e) => e.stopPropagation()}
          >
            <GripVertical className="h-5 w-5 text-muted-foreground" />
          </div>

          {selectMode && (
            <div
              className="mr-3 mt-1"
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                const isShiftClick = e.shiftKey;
                const isCurrentlySelected = selectedEntries.has(entry.id);
                onEntrySelect(entry.id, !isCurrentlySelected, isShiftClick);
              }}
              onMouseDown={(e) => {
                // Prevent text selection when shift-clicking
                if (e.shiftKey) {
                  e.preventDefault();
                }
              }}
            >
              <Checkbox
                checked={selectedEntries.has(entry.id)}
                className="h-5 w-5 pointer-events-none"
              />
            </div>
          )}

          <Button
            variant="ghost"
            size="icon"
            className="h-8 w-8 mr-2"
            onClick={async (e) => {
              e.stopPropagation();
              await onToggleFavorite(entry.id);
            }}
          >
            <Star
              className={`h-5 w-5 ${entry.isFavorite ? "text-amber-500 fill-amber-500" : "text-muted-foreground"}`}
            />
          </Button>

          <div>
            <h3 className="font-medium text-lg">{entry.title}</h3>
            <div className="text-sm text-muted-foreground flex items-center mt-1">
              <Clock className="mr-1 h-3 w-3" />
              <span>{formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })} • {formatDuration(entry.duration)}</span>
              {entry.folderId && (
                <>
                  <span className="mx-1">•</span>
                  {entry.folderId.startsWith('goal:')
                    ? (
                      <>
                        <span className="w-2 h-2 rounded-full bg-primary mr-1 inline-block"></span>
                        {(() => {
                          const goal = goals.find(g => `goal:${g.id}` === entry.folderId);
                          if (!goal) return 'Unknown Goal';

                          // Find the category for this goal
                          const category = folders.find(f => f.id === `cat-folder-${goal.category}`);

                          if (category) {
                            return (
                              <span>
                                <span className="text-muted-foreground">{category.name}: </span>
                                {goal.name}
                              </span>
                            );
                          }

                          return goal.name;
                        })()}
                      </>
                    )
                    : (
                      <>
                        <FolderIcon className="h-3 w-3 mr-1" />
                        <span>{folders.find(f => f.id === entry.folderId)?.name || 'Unknown Folder'}</span>
                      </>
                    )}
                </>
              )}
            </div>
          </div>
        </div>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8"
              onClick={(e) => e.stopPropagation()}
            >
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                onSelectEntry(entry);
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              className="text-red-500"
              onClick={(e) => {
                e.stopPropagation();
                setEntryToDelete(entry.id);
                setDeleteDialogOpen(true);
              }}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
      <p className="text-sm mt-2 line-clamp-2">{entry.transcription}</p>
    </div>
  );
}

// Drag overlay component for visual feedback during drag
function DragOverlayContent({ entry }: { entry: LogEntry }) {
  return (
    <div className="border rounded-md p-4 bg-background shadow-md w-[calc(100%-3rem)] max-w-3xl">
      <div className="flex items-start">
        <GripVertical className="h-5 w-5 text-muted-foreground mr-2" />
        <div>
          <h3 className="font-medium text-lg">{entry.title}</h3>
          <div className="text-sm text-muted-foreground">
            {formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })}
          </div>
        </div>
      </div>
    </div>
  );
}

export function CaptainsLogList({
  entries,
  onSelectEntry,
  onNewRecording,
  onUploadAudio,
  onToggleFavorite,
  onDeleteEntry,
  folders = [],
  onAddFolder = () => {},
  onDeleteFolder = () => {},
  onRenameFolder = () => {},
  onAssignToFolder = () => {},
  goals = []
}: CaptainsLogListProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState('recent');
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);
  const [animatedFolderId, setAnimatedFolderId] = useState<string | null>(null);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [selectMode, setSelectMode] = useState(false);
  const [lastSelectedEntryId, setLastSelectedEntryId] = useState<string | null>(null);
  const recordButtonRef = useRef<HTMLButtonElement>(null);
  const micIconRef = useRef<SVGSVGElement>(null);

  // Drag and drop state
  const [activeEntry, setActiveEntry] = useState<LogEntry | null>(null);
  const [isDraggingOverCancelZone, setIsDraggingOverCancelZone] = useState(false);
  const [originalEntryFolderId, setOriginalEntryFolderId] = useState<string | null>(null);

  // Handle ESC key to exit selection mode
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && selectMode) {
        setSelectMode(false);
        setSelectedEntries(new Set());
        setLastSelectedEntryId(null);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [selectMode]);

  // Clear text selection when in select mode and shift-clicking
  useEffect(() => {
    const handleMouseUp = () => {
      if (selectMode) {
        // Clear any text selection that might have occurred during shift-click
        if (window.getSelection) {
          window.getSelection()?.removeAllRanges();
        }
      }
    };

    if (selectMode) {
      document.addEventListener('mouseup', handleMouseUp);
      return () => {
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [selectMode]);

  // Filter entries based on search query, active filter, and date range
  const filteredEntries = entries.filter(entry => {
    // Text search filter
    const matchesSearch = searchQuery === '' ||
                         entry.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         entry.transcription.toLowerCase().includes(searchQuery.toLowerCase());

    // Category/Goal filter
    let matchesFilter = true;
    if (activeFilter === 'favorites') {
      matchesFilter = entry.isFavorite;
    } else if (activeFilter === 'uncategorized') {
      matchesFilter = !entry.folderId;
    } else if (activeFilter.startsWith('folder:')) {
      const folderId = activeFilter.replace('folder:', '');
      matchesFilter = entry.folderId === folderId;
    } else if (activeFilter.startsWith('goal:')) {
      const goalId = activeFilter.replace('goal:', '');
      // Check if the entry is assigned to this goal directly
      if (entry.folderId === `goal:${goalId}`) {
        matchesFilter = true;
      } else {
        // If not directly assigned to the goal, check if it's in the goal's category
        const goal = goals.find(g => g.id === goalId);
        if (goal && goal.category) {
          const categoryFolderId = `cat-folder-${goal.category}`;
          matchesFilter = entry.folderId === categoryFolderId;
        } else {
          matchesFilter = false;
        }
      }
    }

    // Date filter
    let matchesDateRange = true;
    if (startDate && endDate) {
      matchesDateRange = isWithinInterval(new Date(entry.createdAt), {
        start: startOfDay(startDate),
        end: endOfDay(endDate)
      });
    } else if (startDate) {
      matchesDateRange = new Date(entry.createdAt) >= startOfDay(startDate);
    } else if (endDate) {
      matchesDateRange = new Date(entry.createdAt) <= endOfDay(endDate);
    }

    return matchesSearch && matchesFilter && matchesDateRange;
  });

  // Sort entries by date (newest first)
  const sortedEntries = [...filteredEntries].sort((a, b) =>
    new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );

  const handleDateFilterChange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Function to handle entry selection with range selection support
  const handleEntrySelect = useCallback((entryId: string, isSelected: boolean, isShiftClick: boolean = false) => {
    const newSelectedEntries = new Set(selectedEntries);

    if (isShiftClick && lastSelectedEntryId && lastSelectedEntryId !== entryId) {
      // Handle range selection
      const currentEntryIndex = sortedEntries.findIndex(entry => entry.id === entryId);
      const lastEntryIndex = sortedEntries.findIndex(entry => entry.id === lastSelectedEntryId);

      if (currentEntryIndex !== -1 && lastEntryIndex !== -1) {
        // Determine the range
        const startIndex = Math.min(currentEntryIndex, lastEntryIndex);
        const endIndex = Math.max(currentEntryIndex, lastEntryIndex);

        // Select all entries in the range
        for (let i = startIndex; i <= endIndex; i++) {
          newSelectedEntries.add(sortedEntries[i].id);
        }
      }
    } else {
      // Handle single selection
      if (isSelected) {
        newSelectedEntries.add(entryId);
      } else {
        newSelectedEntries.delete(entryId);
      }
    }

    setSelectedEntries(newSelectedEntries);
    setLastSelectedEntryId(entryId);
  }, [selectedEntries, lastSelectedEntryId, sortedEntries]);

  // Bulk action handlers
  const handleBulkToggleFavorite = async () => {
    // Convert Set to Array for easier async handling
    const selectedIds = Array.from(selectedEntries);
    console.log(`Toggling favorite status for ${selectedIds.length} entries`);

    // Process each entry sequentially to avoid race conditions
    for (const id of selectedIds) {
      await onToggleFavorite(id);
    }

    // Keep selection active after operation
  };



  const handleBulkDelete = () => {
    // Show confirmation dialog before deleting
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    // Convert Set to Array for easier async handling
    const selectedIds = Array.from(selectedEntries);

    // Process each entry sequentially
    for (const id of selectedIds) {
      await onDeleteEntry(id);
    }

    setSelectedEntries(new Set());
    setLastSelectedEntryId(null);
    setSelectMode(false);
    setDeleteDialogOpen(false);
  };

  const handleBulkAssignToFolder = async (folderId: string) => {
    // Convert Set to Array for easier async handling
    const selectedIds = Array.from(selectedEntries);
    console.log(`Moving ${selectedIds.length} entries to folder: ${folderId || 'uncategorized'}`);

    try {
      if (folderId === '' || folderId === 'uncategorized') {
        // Move to uncategorized (clear all associations)
        await singleFolderAssociationService.bulkMoveToUncategorized(selectedIds);
        setAnimatedFolderId('uncategorized');
        setTimeout(() => setAnimatedFolderId(null), 1000);
        console.log(`Bulk moved ${selectedIds.length} entries to uncategorized`);
        return;
      }

      // Determine folder type and create assignment
      let assignment;
      if (folderId.startsWith('goal:')) {
        const goalId = folderId.replace('goal:', '');
        assignment = {
          folderId: `goal:${goalId}`,
          folderType: 'goal' as const
        };
      } else {
        // Custom folder
        assignment = {
          folderId: folderId,
          folderType: 'custom' as const
        };
      }

      // Use the new single folder association service
      await singleFolderAssociationService.bulkAssignToFolder(selectedIds, assignment);

      // Animate the folder that received the entries
      setAnimatedFolderId(folderId);
      setTimeout(() => setAnimatedFolderId(null), 1000);

      console.log(`Bulk assignment to folder ${folderId} complete`);
    } catch (error) {
      console.error('Error in bulk assignment:', error);
    }

    // Keep selection active after operation
  };

  // Note: animatedFolderId state is already declared above

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // 8px of movement before drag starts
      },
    }),
    useSensor(KeyboardSensor)
  );

  // Handle drag start
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeId = active.id as string;

    // Find the entry being dragged
    const draggedEntry = entries.find(entry => entry.id === activeId);
    if (draggedEntry) {
      setActiveEntry(draggedEntry);
      // Store the original folder ID to allow cancellation
      setOriginalEntryFolderId(draggedEntry.folderId || null);
    }
  };

  // Handle drag over
  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event;

    // Check if dragging over the cancel zone
    if (over && over.id === 'cancel-zone') {
      setIsDraggingOverCancelZone(true);
    } else {
      setIsDraggingOverCancelZone(false);
    }
  };

  // Handle drag end
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset active entry and drag states
    setActiveEntry(null);
    setIsDraggingOverCancelZone(false);
    setOriginalEntryFolderId(null);

    // If no valid drop target, do nothing
    if (!over) return;

    const entryId = active.id as string;
    const dropTarget = over.id as string;

    // Check if dropped on the cancel zone or original entry position
    if (dropTarget === 'cancel-zone' || dropTarget.startsWith('entry-position:')) {
      console.log('Drag operation cancelled');
      // No action needed - the drag is simply cancelled
      return;
    }

    // Check if dropped on a folder, goal, uncategorized, or favorites
    if (dropTarget === 'uncategorized') {
      // Move to uncategorized (clear all associations)
      try {
        await singleFolderAssociationService.moveToUncategorized(entryId);
        setAnimatedFolderId('uncategorized');
        setTimeout(() => setAnimatedFolderId(null), 1000);
        console.log(`Successfully moved entry ${entryId} to uncategorized`);
      } catch (error) {
        console.error('Error moving entry to uncategorized:', error);
      }
    }
    else if (dropTarget === 'favorites') {
      // Mark as favorite and keep current folder assignment
      onToggleFavorite(entryId);

      // Find the entry to check if it was already a favorite
      const entry = entries.find(e => e.id === entryId);
      // Only toggle if it's not already a favorite
      if (entry && !entry.isFavorite) {
        // Show animation feedback
        setAnimatedFolderId('favorites');
        setTimeout(() => setAnimatedFolderId(null), 1000);
      }
    }
    else if (dropTarget.startsWith('folder:')) {
      // Extract folder ID from the drop target ID
      const folderId = dropTarget.replace('folder:', '');

      try {
        // Create folder assignment for custom folder
        const assignment = {
          folderId: folderId,
          folderType: 'custom' as const
        };

        await singleFolderAssociationService.assignEntryToFolder(entryId, assignment);
        setAnimatedFolderId(folderId);
        setTimeout(() => setAnimatedFolderId(null), 1000);
        console.log(`Successfully assigned entry ${entryId} to custom folder ${folderId}`);
      } catch (error) {
        console.error('Error assigning entry to custom folder:', error);
      }
    }
    else if (dropTarget.startsWith('goal:')) {
      // It's a goal folder
      const goalId = dropTarget.replace('goal:', '');

      try {
        // Create folder assignment for goal
        const assignment = {
          folderId: `goal:${goalId}`,
          folderType: 'goal' as const
        };

        await singleFolderAssociationService.assignEntryToFolder(entryId, assignment);
        setAnimatedFolderId(dropTarget);
        setTimeout(() => setAnimatedFolderId(null), 1000);
        console.log(`Successfully assigned entry ${entryId} to goal ${goalId}`);
      } catch (error) {
        console.error('Error assigning entry to goal:', error);
      }
    }
  };

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => {
        // First try pointerWithin which is more accurate for nested elements
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) {
          return pointerCollisions;
        }

        // Fall back to rectIntersection if pointerWithin doesn't find anything
        const rectCollisions = rectIntersection(args);
        if (rectCollisions.length > 0) {
          return rectCollisions;
        }

        // Finally, use closestCenter as a last resort
        return closestCenter(args);
      }}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      <div className="flex h-full">
        <LeftNavPanel
        onSelectFilter={setActiveFilter}
        activeFilter={activeFilter}
        folders={folders}
        onAddFolder={onAddFolder}
        onDeleteFolder={onDeleteFolder}
        onRenameFolder={onRenameFolder}
        animatedFolderId={animatedFolderId}
        goals={goals}
      />

      <div className="flex-1 flex flex-col">
        <div className="sticky top-0 bg-background z-10 p-6 pb-2 border-b shadow-sm">
          <div className="flex justify-between items-center">
            <h1 className="text-2xl font-bold">
              {activeFilter === 'recent' && 'Recent Recordings'}
              {activeFilter === 'favorites' && 'Favorite Recordings'}
              {activeFilter === 'uncategorized' && 'Uncategorized Recordings'}
              {activeFilter.startsWith('folder:') && folders.find(f => `folder:${f.id}` === activeFilter)?.name}
              {activeFilter.startsWith('goal:') && (
                <>
                  <span className="text-muted-foreground font-normal text-lg mr-2">
                    {goals.find(g => g.id === activeFilter.replace('goal:', ''))?.category &&
                      folders.find(f => f.id === `cat-folder-${goals.find(g => g.id === activeFilter.replace('goal:', ''))?.category}`)?.name}
                  </span>
                  <span>
                    {goals.find(g => g.id === activeFilter.replace('goal:', ''))?.name}
                  </span>
                </>
              )}
            </h1>

            <div className="flex items-center space-x-2">
              <Button
                onClick={onUploadAudio}
                variant="outline"
                size="sm"
                className="flex items-center"
              >
                <Upload className="mr-2 h-4 w-4" />
                Upload
              </Button>
              <Button
                onClick={onNewRecording}
                variant="default"
                size="sm"
                className="flex items-center bg-primary"
                ref={recordButtonRef}
              >
                <Mic ref={micIconRef} className="mr-2 h-5 w-5" />
                Record
              </Button>

            </div>
          </div>

          <div className="flex flex-col space-y-2 mt-4">
            <div className="relative">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search recordings..."
                className="pl-8"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className="flex items-center space-x-2">
              <div className="flex space-x-1">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setSelectMode(!selectMode);
                    if (selectMode) {
                      setSelectedEntries(new Set());
                      setLastSelectedEntryId(null);
                    }
                  }}
                  className={selectMode ? 'bg-muted' : ''}
                >
                  {selectMode ? (
                    <CheckSquare className="mr-2 h-4 w-4" />
                  ) : (
                    <Square className="mr-2 h-4 w-4" />
                  )}
                  {selectMode ? 'Cancel' : 'Select'}
                </Button>

                {/* Select All / None toggle */}
                {selectMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      if (selectedEntries.size === sortedEntries.length) {
                        // Deselect all
                        setSelectedEntries(new Set());
                        setLastSelectedEntryId(null);
                      } else {
                        // Select all
                        setSelectedEntries(new Set(sortedEntries.map(entry => entry.id)));
                        setLastSelectedEntryId(sortedEntries[sortedEntries.length - 1]?.id || null);
                      }
                    }}
                  >
                    {selectedEntries.size === sortedEntries.length ? 'None' : 'All'}
                  </Button>
                )}
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={showDateFilter ? 'bg-muted' : ''}
              >
                <Filter className="mr-2 h-4 w-4" />
                Date Filter
              </Button>
            </div>

            {showDateFilter && (
              <DateFilter onDateFilterChange={handleDateFilterChange} />
            )}
          </div>
        </div>

        {/* Create a droppable area for the record scroll area that acts as a cancel zone */}
        {(() => {
          // Use the useDroppable hook to make this area a drop target
          const { setNodeRef, isOver } = useDroppable({
            id: 'cancel-zone',
            data: {
              type: 'cancel-zone'
            }
          });

          return (
            <div
              ref={setNodeRef}
              className={`flex-1 overflow-y-auto p-6 pt-4 ${isOver ? 'bg-muted/30 border-2 border-dashed border-primary/30' : ''}`}
            >
              {activeEntry && isOver && (
                <div className="sticky top-0 mb-4 p-3 bg-background/80 backdrop-blur-sm border rounded-md text-sm text-muted-foreground">
                  Drop here to cancel the drag operation
                </div>
              )}

              {sortedEntries.length === 0 ? (
                <div className="text-center p-8 border rounded-md bg-muted/20 mt-4">
                  <p className="text-muted-foreground mb-4">
                    {entries.length === 0
                      ? "No recordings found. Start by creating a new recording."
                      : "No recordings match your search criteria."}
                  </p>
                  {entries.length === 0 && (
                    <Button onClick={onNewRecording} variant="outline">
                      <Mic className="mr-2 h-4 w-4" />
                      Start Recording
                    </Button>
                  )}
                </div>
              ) : (
                <div className="space-y-3 mt-4">
                  {sortedEntries.map((entry) => (
                    <DraggableEntry
                      key={entry.id}
                      entry={entry}
                      folders={folders}
                      goals={goals}
                      onSelectEntry={onSelectEntry}
                      onToggleFavorite={onToggleFavorite}
                      onDeleteEntry={onDeleteEntry}
                      selectMode={selectMode}
                      selectedEntries={selectedEntries}
                      onEntrySelect={handleEntrySelect}
                      setEntryToDelete={setEntryToDelete}
                      setDeleteDialogOpen={setDeleteDialogOpen}
                      activeEntry={activeEntry}
                    />
                  ))}
                </div>
              )}
            </div>
          );
        })()}

      </div>

      <DeleteConfirmation
        isOpen={deleteDialogOpen}
        onClose={() => {
          setDeleteDialogOpen(false);
        }}
        onConfirm={() => {
          if (selectedEntries.size > 0) {
            // Bulk delete
            confirmBulkDelete();
          } else if (entryToDelete) {
            // Single delete
            onDeleteEntry(entryToDelete);
            setEntryToDelete(null);
            setDeleteDialogOpen(false);
          }
        }}
        title={selectedEntries.size > 0 ? "Delete Recordings" : "Delete Recording"}
        description={selectedEntries.size > 0
          ? `Are you sure you want to delete ${selectedEntries.size} recording${selectedEntries.size > 1 ? 's' : ''}? This action cannot be undone.`
          : "Are you sure you want to delete this recording? This action cannot be undone."
        }
      />

      {/* Bulk Action Bar */}
      <CaptainsLogBulkActionBar
        selectedCount={selectedEntries.size}
        onClearSelection={() => {
          setSelectedEntries(new Set());
          setLastSelectedEntryId(null);
          setSelectMode(false);
        }}
        onToggleFavorite={handleBulkToggleFavorite}
        onDelete={handleBulkDelete}
        onAssignToFolder={handleBulkAssignToFolder}
        folders={folders}
        goals={goals}
      />

      {/* Drag overlay for visual feedback */}
      <DragOverlay>
        {activeEntry && <DragOverlayContent entry={activeEntry} />}
      </DragOverlay>
    </div>
    </DndContext>
  );
}
