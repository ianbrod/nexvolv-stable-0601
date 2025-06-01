'use client';

import React from 'react';
import { LogEntry } from '@/types';
import { useDraggable, useDroppable } from '@dnd-kit/core';
import { VirtualFolder } from '@/types/virtual-folder';
import { captainsLogDB } from '@/lib/storage/tag-database';
import { singleFolderAssociationService } from '@/lib/services/single-folder-association-service';

// Helper function to recursively find a folder in the virtual folder tree
function findFolderInTree(folders: VirtualFolder[], predicate: (folder: VirtualFolder) => boolean): VirtualFolder | null {
  for (const folder of folders) {
    if (predicate(folder)) {
      return folder;
    }
    // Recursively search in children
    if (folder.children && folder.children.length > 0) {
      const found = findFolderInTree(folder.children, predicate);
      if (found) {
        return found;
      }
    }
  }
  return null;
}
import { formatDistanceToNow } from 'date-fns';
import { formatDuration } from '@/lib/utils';
import { Checkbox } from '@/components/ui/checkbox';
import { Button } from '@/components/ui/button';
import {
  Star,
  Clock,

  MoreHorizontal,
  Edit,
  Trash2,
  GripVertical
} from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
  DropdownMenuSeparator
} from "@/components/ui/dropdown-menu";

interface HierarchicalDraggableEntryProps {
  entry: LogEntry;
  virtualFolders: VirtualFolder[];
  onSelectEntry: (entry: LogEntry) => void;
  onSelectEntryWithEdit?: (entry: LogEntry, editMode: 'title' | 'summary' | 'transcription') => void;
  onToggleFavorite: (entryId: string) => void;
  onDeleteEntry: (entryId: string) => void;
  selectMode: boolean;
  selectedEntries: Set<string>;
  onEntrySelect: (entryId: string, isSelected: boolean, isShiftClick?: boolean) => void;
  setEntryToDelete: React.Dispatch<React.SetStateAction<string | null>>;
  setDeleteDialogOpen: React.Dispatch<React.SetStateAction<boolean>>;
  activeEntry: LogEntry | null;
}

export function HierarchicalDraggableEntry({
  entry,
  virtualFolders,
  onSelectEntry,
  onSelectEntryWithEdit,
  onToggleFavorite,
  onDeleteEntry,
  selectMode,
  selectedEntries,
  onEntrySelect,
  setEntryToDelete,
  setDeleteDialogOpen,
  activeEntry
}: HierarchicalDraggableEntryProps) {
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



  // Helper function to find folder by source ID
  const findFolderBySourceId = (folders: VirtualFolder[], sourceId: string): VirtualFolder | null => {
    for (const folder of folders) {
      if (folder.sourceId === sourceId) {
        return folder;
      }
      // Recursively search children
      const found = findFolderBySourceId(folder.children, sourceId);
      if (found) {
        return found;
      }
    }
    return null;
  };





  // Render the entry with its folder information
  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`border rounded-md p-3 hover:bg-muted/50 transition-colors cursor-pointer ${isBeingDraggedOver ? 'bg-primary/10 border-primary/30 border-2' : ''}`}
      onClick={() => !selectMode && onSelectEntry(entry)}
      {...attributes}
    >
      {isBeingDraggedOver && (
        <div className="absolute inset-0 flex items-center justify-center bg-background/50 rounded-md z-10">
          <div className="text-sm font-medium text-primary">Drop here to cancel</div>
        </div>
      )}
      <div className="flex justify-between items-start">
        <div className="flex items-start flex-1">
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

          <div className="flex-1 min-w-0">
            <h3 className="font-medium text-lg">{entry.title}</h3>
            <div className="flex items-start gap-4 mt-1">
              {/* Left side: Time details and folder label */}
              <div className="flex-shrink-0">
                <div className="text-sm text-muted-foreground flex items-center">
                  <Clock className="mr-1 h-3 w-3" />
                  <span>{formatDistanceToNow(new Date(entry.createdAt), { addSuffix: true })} • {formatDuration(entry.duration)}</span>
                </div>
                {/* Folder label beneath time details */}
                {(() => {
                  // Check for single folder association first
                  if (entry.folderId) {
                    // Find the folder in virtualFolders using recursive search
                    const folder = findFolderInTree(virtualFolders, f => {
                      if (entry.folderId?.startsWith('category:')) {
                        return f.type === 'category' && f.sourceId === entry.folderId.substring(9);
                      } else if (entry.folderId?.startsWith('goal:')) {
                        return f.type === 'goal' && f.sourceId === entry.folderId.substring(5);
                      } else if (entry.folderId?.startsWith('subgoal:')) {
                        return f.type === 'subgoal' && f.sourceId === entry.folderId.substring(8);
                      } else {
                        return f.id === entry.folderId;
                      }
                    });

                    if (folder) {
                      return (
                        <div className="flex items-center gap-1 mt-1">
                          <div
                            className="flex items-center px-2 py-1 text-xs rounded-md font-medium border"
                            style={{
                              color: folder.color,
                              borderColor: folder.color,
                              backgroundColor: 'transparent'
                            }}
                            title={`Assigned to ${folder.type}: ${folder.name}`}
                          >
                            {folder.name}
                          </div>
                        </div>
                      );
                    }
                  }



                  // Show nothing for uncategorized entries
                  return null;
                })()}
              </div>

              {/* Right side: Preview text */}
              <div className="flex-1 min-w-0">
                <p className="text-sm text-muted-foreground line-clamp-2">{entry.transcription}</p>

                {/* Simple processing status message */}
                {entry.processingStatus && entry.processingStatus !== 'complete' && (
                  <div className="mt-1 text-xs text-muted-foreground italic">
                    {entry.processingStatus === 'converting' && 'Converting audio...'}
                    {entry.processingStatus === 'creating' && 'Creating entry...'}
                    {entry.processingStatus === 'transcribing' && 'Transcribing audio...'}
                    {entry.processingStatus === 'error' && 'Processing failed'}
                  </div>
                )}
              </div>
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
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuItem
              onClick={(e) => {
                e.stopPropagation();
                // Use the new edit functionality if available, otherwise fall back to normal selection
                if (onSelectEntryWithEdit) {
                  onSelectEntryWithEdit(entry, 'transcription'); // Default to transcription edit mode
                } else {
                  onSelectEntry(entry);
                }
              }}
            >
              <Edit className="h-4 w-4 mr-2" />
              Edit
            </DropdownMenuItem>

            {/* Quick Association Management */}
            {(() => {
              // Check for single folder association
              if (entry.folderId) {
                // Find the folder in virtualFolders using recursive search
                const folder = findFolderInTree(virtualFolders, f => {
                  if (entry.folderId?.startsWith('category:')) {
                    return f.type === 'category' && f.sourceId === entry.folderId.substring(9);
                  } else if (entry.folderId?.startsWith('goal:')) {
                    return f.type === 'goal' && f.sourceId === entry.folderId.substring(5);
                  } else if (entry.folderId?.startsWith('subgoal:')) {
                    return f.type === 'subgoal' && f.sourceId === entry.folderId.substring(8);
                  } else {
                    return f.id === entry.folderId;
                  }
                });

                if (folder) {
                  return (
                    <>
                      <DropdownMenuSeparator />
                      <div className="px-2 py-1.5 text-xs font-medium text-muted-foreground">
                        Folder Assignment
                      </div>
                      <DropdownMenuItem
                        onClick={async (e) => {
                          e.stopPropagation();
                          // Move to uncategorized (remove folder assignment)
                          try {
                            await singleFolderAssociationService.moveToUncategorized(entry.id);
                            console.log(`Moved entry ${entry.id} to uncategorized`);
                          } catch (error) {
                            console.error('Error moving to uncategorized:', error);
                          }
                        }}
                        className="text-sm"
                      >
                        <div className="flex items-center justify-between w-full">
                          <div className="flex items-center">
                            <div
                              className="w-2 h-2 rounded-sm mr-2"
                              style={{ backgroundColor: folder.color }}
                            />
                            <span className="truncate">{folder.name}</span>
                          </div>
                          <span className="text-xs text-muted-foreground ml-2">Remove</span>
                        </div>
                      </DropdownMenuItem>
                    </>
                  );
                }
              }
              return null;
            })()}

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
    </div>
  );
}



// Helper function to validate drop targets
export function isValidDropTarget(
  dragData: any,
  dropData: any
): boolean {
  // Allow dropping entries on folders
  if (dragData.type === 'entry' && dropData.type === 'folder') {
    return true;
  }

  // Allow dropping entries on special targets (uncategorized, favorites)
  if (dragData.type === 'entry' && (dropData.type === 'uncategorized' || dropData.type === 'favorites')) {
    return true;
  }

  // Allow dropping entries back to their original position (cancel)
  if (dragData.type === 'entry' && dropData.type === 'entry-position') {
    return true;
  }

  return false;
}

// Export the helper function for use in the main component
export { captainsLogDB };
