'use client';

import React, { useState, useRef, useEffect, useCallback } from 'react';
import { LogEntry } from '@/types';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  DndContext,
  DragStartEvent,
  DragEndEvent,
  DragOverEvent,
  useSensors,
  useSensor,
  PointerSensor,
  DragOverlay,
  useDroppable,
  pointerWithin,
  rectIntersection,
  closestCenter
} from '@dnd-kit/core';
import { Mic, Search, Upload, Filter, Square, CheckSquare, GripVertical } from 'lucide-react';
import { formatDistanceToNow, isWithinInterval, startOfDay, endOfDay } from 'date-fns';
import { DeleteConfirmation } from '@/components/ui/delete-confirmation';
import { HierarchicalLeftNavPanel } from './HierarchicalLeftNavPanel';
import { HierarchicalDraggableEntry, isValidDropTarget } from './HierarchicalDragAndDrop';
import { VirtualFolder } from '@/types/virtual-folder';
import { virtualFolderTreeBuilder } from '@/lib/services/virtual-folder-tree-builder';
import { logFilteringService } from '@/lib/services/log-filtering-service';
import { logEntryStorage } from '@/lib/storage/log-entry-storage';
import { CaptainsLogBulkActionBar } from './CaptainsLogBulkActionBar';
import { DateFilter } from './DateFilter';
import { deduplicateEntries } from '@/lib/utils/entry-deduplication';
import { singleFolderAssociationService } from '@/lib/services/single-folder-association-service';
import { createCustomFolder, updateCustomFolder, deleteCustomFolder } from '@/actions/custom-folders';
import { CaptainsLogFilterOptions } from '@/types';

interface HierarchicalCaptainsLogListProps {
  entries: LogEntry[];
  onSelectEntry: (entry: LogEntry) => void;
  onSelectEntryWithEdit?: (entry: LogEntry, editMode: 'title' | 'summary' | 'transcription') => void;
  onToggleFavorite: (entryId: string) => void;
  onDeleteEntry: (entryId: string) => void;
  onNewRecording: () => void;
  onUploadAudio: () => void;
  goals?: any[];
}

// Component for drag overlay content
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

export function HierarchicalCaptainsLogList({
  entries,
  onSelectEntry,
  onSelectEntryWithEdit,
  onToggleFavorite,
  onDeleteEntry,
  onNewRecording,
  onUploadAudio,
  goals = []
}: HierarchicalCaptainsLogListProps) {
  // State for virtual folders
  const [virtualFolders, setVirtualFolders] = useState<VirtualFolder[]>([]);

  // State for entries (local copy for updates)
  const [logEntries, setLogEntries] = useState<LogEntry[]>(entries);

  // State for filtering and selection
  const [activeFilter, setActiveFilter] = useState('recent');
  const [selectedFilters, setSelectedFilters] = useState<string[]>([]);
  const [isMultiSelectMode, setIsMultiSelectMode] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectMode, setSelectMode] = useState(false);
  const [selectedEntries, setSelectedEntries] = useState<Set<string>>(new Set());
  const [lastSelectedEntryId, setLastSelectedEntryId] = useState<string | null>(null);

  // Date filter state
  const [startDate, setStartDate] = useState<Date | null>(null);
  const [endDate, setEndDate] = useState<Date | null>(null);
  const [showDateFilter, setShowDateFilter] = useState(false);

  // Keep selectedFilters in sync with activeFilter when not in multi-select mode
  useEffect(() => {
    if (!isMultiSelectMode) {
      setSelectedFilters([activeFilter]);
    }
  }, [activeFilter, isMultiSelectMode]);

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

  // Listen for multi-select mode toggle events from the left nav panel
  useEffect(() => {
    const handleToggleMultiSelectMode = (event: CustomEvent) => {
      const { isMultiSelectMode: newMode } = event.detail;

      // When enabling multi-select mode, only include the current filter if it's not "recent"
      if (newMode && !isMultiSelectMode) {
        if (activeFilter !== 'recent') {
          setSelectedFilters([activeFilter]);
        } else {
          setSelectedFilters([]);
        }
      } else if (!newMode && isMultiSelectMode) {
        // When disabling multi-select mode, set the active filter to the first selected filter
        if (selectedFilters.length > 0) {
          setActiveFilter(selectedFilters[0]);
        }
      }

      setIsMultiSelectMode(newMode);
    };

    window.addEventListener('toggleMultiSelectMode', handleToggleMultiSelectMode as EventListener);

    // Listen for clear all filters events
    const handleClearAllFilters = () => {
      if (isMultiSelectMode) {
        setSelectedFilters(['recent']);
      }
    };

    window.addEventListener('clearAllFilters', handleClearAllFilters);

    return () => {
      window.removeEventListener('toggleMultiSelectMode', handleToggleMultiSelectMode as EventListener);
      window.removeEventListener('clearAllFilters', handleClearAllFilters);
    };
  }, [activeFilter, isMultiSelectMode, selectedFilters, setActiveFilter]);

  // State for drag and drop
  const [activeEntry, setActiveEntry] = useState<LogEntry | null>(null);
  const [animatedFolderId, setAnimatedFolderId] = useState<string | null>(null);

  // State for delete confirmation
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [entryToDelete, setEntryToDelete] = useState<string | null>(null);

  // Refs
  const recordButtonRef = useRef<HTMLButtonElement>(null);
  const micIconRef = useRef<SVGSVGElement>(null);

  // Configure DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8, // Minimum drag distance before activation
      },
    })
  );

  // Load virtual folders from Prisma data
  useEffect(() => {
    async function loadVirtualFolders() {
      try {
        // Build virtual folder tree from Prisma entities
        const folders = await virtualFolderTreeBuilder.buildFolderTree();
        setVirtualFolders(folders);
      } catch (error) {
        console.error('Error loading virtual folders:', error);
      }
    }

    loadVirtualFolders();
  }, []);

  // Update local entries state when props change with deduplication
  useEffect(() => {
    const uniqueEntries = deduplicateEntries(entries);
    setLogEntries(uniqueEntries);
  }, [entries]);

  // Handle single filter selection
  const handleSelectFilter = (filter: string) => {
    // In multi-select mode, delegate to handleMultiSelectFilter
    if (isMultiSelectMode) {
      handleMultiSelectFilter(filter);
    } else {
      // In single-select mode, just set the active filter
      setActiveFilter(filter);
    }
  };

  // Handle multi-select filter toggle
  const handleMultiSelectFilter = (filter: string) => {
    setSelectedFilters(prevFilters => {
      // If filter is already selected, remove it
      if (prevFilters.includes(filter)) {
        // Don't allow removing all filters - keep at least one
        if (prevFilters.length === 1) {
          return prevFilters;
        }
        return prevFilters.filter(f => f !== filter);
      }
      // Otherwise, add it
      return [...prevFilters, filter];
    });
  };

  // Handle applying saved filters
  const handleApplyFilter = (filters: CaptainsLogFilterOptions) => {
    setActiveFilter(filters.activeFilter);
    setSelectedFilters(filters.selectedFilters);
    setIsMultiSelectMode(filters.isMultiSelectMode);
    setSearchQuery(filters.searchQuery);
    setStartDate(filters.startDate);
    setEndDate(filters.endDate);
    setShowDateFilter(filters.showDateFilter);
  };

  // Handle date filter changes
  const handleDateFilterChange = (start: Date | null, end: Date | null) => {
    setStartDate(start);
    setEndDate(end);
  };

  // Helper function to find folder by ID (searches all levels)
  const findFolderById = (folders: VirtualFolder[], id: string): VirtualFolder | null => {
    for (const folder of folders) {
      // Check exact ID match
      if (folder.id === id) {
        return folder;
      }
      // Check sourceId match (for backward compatibility)
      if (folder.sourceId === id) {
        return folder;
      }
      // Recursively search children
      if (folder.children && folder.children.length > 0) {
        const found = findFolderById(folder.children, id);
        if (found) {
          return found;
        }
      }
    }
    return null;
  };

  // Helper function to get all child folder IDs for hierarchical filtering
  const getChildFolderIds = (folder: VirtualFolder): string[] => {
    const childIds: string[] = [];

    // Add the folder itself in the format that matches entry.folderId
    const folderId = `${folder.type}:${folder.sourceId}`;
    childIds.push(folderId);

    // Recursively add all children
    for (const child of folder.children) {
      childIds.push(...getChildFolderIds(child));
    }

    return childIds;
  };

  // Helper function to check if an entry matches a folder hierarchically
  const entryMatchesFolder = (entry: LogEntry, folder: VirtualFolder): boolean => {
    if (!entry.folderId) return false;

    // Direct match
    const directMatch = entry.folderId === `${folder.type}:${folder.sourceId}`;
    if (directMatch) return true;

    // Check if entry belongs to any child folder
    for (const child of folder.children) {
      if (entryMatchesFolder(entry, child)) {
        return true;
      }
    }

    return false;
  };



  // Filter entries using hierarchical logic on the loaded entries
  const filteredEntries = logEntries.filter(entry => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      const matchesTitle = entry.title.toLowerCase().includes(query);
      const matchesTranscription = entry.transcription.toLowerCase().includes(query);

      if (!matchesTitle && !matchesTranscription) {
        return false;
      }
    }

    // Apply date filter
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

    if (!matchesDateRange) {
      return false;
    }

    // Apply folder filter with hierarchical logic
    let matchesFilter = true;

    if (isMultiSelectMode) {
      // Multi-select mode: entry must match at least one selected filter
      if (selectedFilters.length === 0) {
        matchesFilter = false; // Show nothing when no filters are selected
      } else if (selectedFilters.includes('recent')) {
        matchesFilter = true; // Show everything when "recent" is selected
      } else {
        matchesFilter = selectedFilters.some(filter => {
          if (filter === 'recent') {
            return true;
          } else if (filter === 'favorites') {
            return entry.isFavorite;
          } else if (filter === 'uncategorized') {
            return !entry.folderId;
          } else if (filter.startsWith('folder:')) {
            const folderId = filter.replace('folder:', '');

            // Use the improved findFolderById function that searches all levels
            const folder = findFolderById(virtualFolders, folderId);
            if (folder) {
              // Use the hierarchical matching function
              return entryMatchesFolder(entry, folder);
            }
          }
          return false;
        });
      }
    } else {
      // Single filter mode
      if (activeFilter === 'recent') {
        matchesFilter = true; // Show all entries
      } else if (activeFilter === 'favorites') {
        matchesFilter = entry.isFavorite;
      } else if (activeFilter === 'uncategorized') {
        matchesFilter = !entry.folderId;
      } else if (activeFilter.startsWith('folder:')) {
        const folderId = activeFilter.replace('folder:', '');

        // Use the improved findFolderById function that searches all levels
        const folder = findFolderById(virtualFolders, folderId);

        if (folder) {
          // Use the new hierarchical matching function
          matchesFilter = entryMatchesFolder(entry, folder);
        } else {
          matchesFilter = false;
        }
      }
    }

    return matchesFilter;
  });

  // Sort entries by date (newest first)
  const sortedEntries = [...filteredEntries].sort((a, b) => {
    return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
  });

  // Custom folder management handlers
  const handleAddFolder = async (folderName: string) => {
    try {
      console.log('Creating new custom folder:', folderName);

      const result = await createCustomFolder({
        name: folderName,
        color: '#6b7280' // Default gray color
      });

      if (result.success && result.folder) {
        console.log('Successfully created custom folder:', result.folder);

        // Reload virtual folders to include the new custom folder
        const folders = await virtualFolderTreeBuilder.buildFolderTree();
        setVirtualFolders(folders);
      } else {
        console.error('Failed to create custom folder:', result.message);
        alert(`Error creating folder: ${result.message}`);
      }
    } catch (error) {
      console.error('Error creating custom folder:', error);
      alert(`Error creating folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleDeleteFolder = async (folderId: string) => {
    try {
      console.log('Deleting custom folder:', folderId);

      const result = await deleteCustomFolder(folderId);

      if (result.success) {
        console.log('Successfully deleted custom folder:', folderId);

        // Reload virtual folders to remove the deleted custom folder
        const folders = await virtualFolderTreeBuilder.buildFolderTree();
        setVirtualFolders(folders);
      } else {
        console.error('Failed to delete custom folder:', result.message);
        alert(`Error deleting folder: ${result.message}`);
      }
    } catch (error) {
      console.error('Error deleting custom folder:', error);
      alert(`Error deleting folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  const handleRenameFolder = async (folderId: string, newName: string) => {
    try {
      console.log('Renaming custom folder:', folderId, 'to:', newName);

      const result = await updateCustomFolder({
        id: folderId,
        name: newName
      });

      if (result.success) {
        console.log('Successfully renamed custom folder:', folderId);

        // Reload virtual folders to reflect the name change
        const folders = await virtualFolderTreeBuilder.buildFolderTree();
        setVirtualFolders(folders);
      } else {
        console.error('Failed to rename custom folder:', result.message);
        alert(`Error renaming folder: ${result.message}`);
      }
    } catch (error) {
      console.error('Error renaming custom folder:', error);
      alert(`Error renaming folder: ${error instanceof Error ? error.message : String(error)}`);
    }
  };

  // Handle bulk operations using the new hierarchical system
  const handleBulkAssignToFolder = async (folderId: string) => {
    const selectedIds = Array.from(selectedEntries);
    console.log(`Bulk assigning ${selectedIds.length} entries to folder ${folderId}`);

    try {
      if (folderId === '' || folderId === 'uncategorized') {
        // Move to uncategorized (clear all associations)
        await singleFolderAssociationService.bulkMoveToUncategorized(selectedIds);
        setAnimatedFolderId('uncategorized');
        setTimeout(() => setAnimatedFolderId(null), 1000);
        console.log(`Bulk moved ${selectedIds.length} entries to uncategorized`);
        return;
      }

      // Handle different folder ID formats
      let actualFolderId = folderId;
      let folderType: string | null = null;

      // Remove folder: prefix if present
      if (folderId.startsWith('folder:')) {
        actualFolderId = folderId.substring(7);
      }

      // Handle prefixed IDs from bulk action bar
      if (actualFolderId.startsWith('cat-folder-')) {
        // Category folder
        actualFolderId = actualFolderId.substring(11);
        folderType = 'category';
      } else if (actualFolderId.startsWith('goal:')) {
        // Goal folder
        actualFolderId = actualFolderId.substring(5);
        folderType = 'goal';
      } else if (actualFolderId.startsWith('subgoal:')) {
        // Subgoal folder
        actualFolderId = actualFolderId.substring(8);
        folderType = 'subgoal';
      }

      // Find the folder to get its type and sourceId
      const folder = findFolderById(virtualFolders, actualFolderId);
      if (!folder) {
        console.error(`Folder with ID ${actualFolderId} not found`);
        return;
      }

      // Use detected folder type or fall back to folder's actual type
      const finalFolderType = folderType || folder.type;

      // Create folder assignment
      const assignment = {
        folderId: singleFolderAssociationService.createFolderId(folder.sourceId, finalFolderType),
        folderType: finalFolderType
      };

      // Use the new single folder association service
      await singleFolderAssociationService.bulkAssignToFolder(selectedIds, assignment);

      // Animate the folder that received the entries
      setAnimatedFolderId(actualFolderId);
      setTimeout(() => setAnimatedFolderId(null), 1000);

      console.log(`Bulk assignment to ${folder.type} ${folder.sourceId} complete`);
    } catch (error) {
      console.error('Error in bulk assignment:', error);
    }
  };



  // Bulk action handlers
  const handleBulkToggleFavorite = async () => {
    const selectedIds = Array.from(selectedEntries);
    console.log(`Toggling favorite status for ${selectedIds.length} entries`);

    for (const id of selectedIds) {
      await onToggleFavorite(id);
    }
  };



  const handleBulkDelete = () => {
    // Show confirmation dialog before deleting
    setDeleteDialogOpen(true);
  };

  const confirmBulkDelete = async () => {
    const selectedIds = Array.from(selectedEntries);

    for (const id of selectedIds) {
      await onDeleteEntry(id);
    }

    setSelectedEntries(new Set());
    setLastSelectedEntryId(null);
    setSelectMode(false);
    setDeleteDialogOpen(false);
  };

  // DnD event handlers
  const handleDragStart = (event: DragStartEvent) => {
    const { active } = event;
    const activeData = active.data.current;

    if (activeData?.type === 'entry') {
      setActiveEntry(activeData.entry);
    }
  };

  const handleDragEnd = async (event: DragEndEvent) => {
    const { active, over } = event;

    // Reset active entry
    setActiveEntry(null);

    if (!over) {
      console.log('Drag ended without a valid drop target');
      return;
    }

    const dragData = active.data.current;
    const dropData = over.data.current;

    console.log('Drag ended:', { dragData, dropData });

    // Validate the drop
    if (!isValidDropTarget(dragData, dropData)) {
      console.log('Invalid drop target');
      return;
    }

    // Handle dropping on folders
    if (dragData?.type === 'entry' && dropData?.type === 'folder') {
      const entry = dragData.entry as LogEntry;
      const { sourceId, folderType } = dropData;

      try {
        // Create folder assignment
        const assignment = {
          folderId: singleFolderAssociationService.createFolderId(sourceId, folderType),
          folderType: folderType
        };

        // Use the new single folder association service
        await singleFolderAssociationService.assignEntryToFolder(entry.id, assignment);

        // Animate the folder that received the entry
        setAnimatedFolderId(dropData.id);
        setTimeout(() => setAnimatedFolderId(null), 1000);

        console.log(`Successfully assigned entry ${entry.id} to ${folderType} ${sourceId}`);
      } catch (error) {
        console.error('Error assigning entry to folder:', error);
      }
    }

    // Handle dropping on special targets (uncategorized, favorites)
    if (dragData?.type === 'entry' && (dropData?.type === 'uncategorized' || dropData?.type === 'favorites')) {
      const entry = dragData.entry as LogEntry;

      if (dropData.type === 'favorites') {
        // Toggle favorite status
        await onToggleFavorite(entry.id);
        setAnimatedFolderId('favorites');
        setTimeout(() => setAnimatedFolderId(null), 1000);
      } else if (dropData.type === 'uncategorized') {
        // Move to uncategorized (clear all associations)
        try {
          await singleFolderAssociationService.moveToUncategorized(entry.id);
          setAnimatedFolderId('uncategorized');
          setTimeout(() => setAnimatedFolderId(null), 1000);
          console.log(`Successfully moved entry ${entry.id} to uncategorized`);
        } catch (error) {
          console.error('Error moving entry to uncategorized:', error);
        }
      }
    }
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

  // Get folder name for display
  const getFolderName = (filterId: string): string => {
    if (filterId === 'recent') return 'Recent Recordings';
    if (filterId === 'favorites') return 'Favorite Recordings';
    if (filterId === 'uncategorized') return 'Uncategorized Recordings';

    if (filterId.startsWith('folder:')) {
      const folderId = filterId.replace('folder:', '');
      const folder = findFolderById(virtualFolders, folderId);
      return folder?.name || 'Unknown Folder';
    }

    return filterId;
  };

  return (
    <DndContext
      sensors={sensors}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
      collisionDetection={(args) => {
        // First try pointerWithin which is more accurate for nested elements
        const pointerCollisions = pointerWithin(args);
        if (pointerCollisions.length > 0) {
          // Filter out parent containers when child containers are available
          const filteredCollisions = pointerCollisions.filter((collision, index, array) => {
            // Check if this collision is a parent of another collision
            const isParent = array.some((otherCollision, otherIndex) => {
              if (index === otherIndex) return false;
              const thisId = collision.id.toString();
              const otherId = otherCollision.id.toString();
              // If both are folder IDs, check if one is a parent of the other
              if (thisId.startsWith('folder:') && otherId.startsWith('folder:')) {
                // For now, prefer the more specific (longer) ID
                return otherId.length > thisId.length;
              }
              return false;
            });
            return !isParent;
          });

          if (filteredCollisions.length > 0) {
            return filteredCollisions;
          }
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
    >
      <div className="flex h-[calc(100vh-3rem)]">
        <HierarchicalLeftNavPanel
          onSelectFilter={handleSelectFilter}
          activeFilter={activeFilter}
          animatedFolderId={animatedFolderId}
          selectedFilters={selectedFilters}
          onMultiSelectFilter={handleMultiSelectFilter}
          isMultiSelectMode={isMultiSelectMode}
          onAddFolder={handleAddFolder}
          onDeleteFolder={handleDeleteFolder}
          onRenameFolder={handleRenameFolder}
          searchQuery={searchQuery}
          startDate={startDate}
          endDate={endDate}
          showDateFilter={showDateFilter}
          onApplyFilter={handleApplyFilter}
        />

        <div className="flex-1 flex flex-col h-full overflow-hidden">
          {/* Header */}
          <div className="border-b p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center space-x-4">
                <h1 className="text-2xl font-bold">
                  {isMultiSelectMode ? (
                    selectedFilters.length === 1 ? (
                      getFolderName(selectedFilters[0])
                    ) : (
                      `${selectedFilters.length} Folders Selected`
                    )
                  ) : (
                    getFolderName(activeFilter)
                  )}
                </h1>
                <span className="text-muted-foreground">
                  {sortedEntries.length} {sortedEntries.length === 1 ? 'entry' : 'entries'}
                </span>
              </div>

              <div className="flex items-center space-x-2">
                <Button
                  ref={recordButtonRef}
                  onClick={onNewRecording}
                  className="bg-purple-500/20 hover:bg-purple-500/30 dark:bg-purple-400/20 dark:hover:bg-purple-400/30 border-2 border-purple-500 dark:border-purple-400 text-purple-700 dark:text-purple-300 hover:text-purple-800 dark:hover:text-purple-200 transition-all duration-200"
                >
                  <Mic ref={micIconRef} className="mr-2 h-4 w-4" />
                  Record
                </Button>
                <Button variant="outline" onClick={onUploadAudio}>
                  <Upload className="mr-2 h-4 w-4" />
                  Upload
                </Button>
              </div>
            </div>

            {/* Search and filters */}
            <div className="flex items-center space-x-4">
              <div className="relative flex-1 max-w-md">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
                <Input
                  placeholder="Search recordings..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Button
                variant="outline"
                onClick={() => setShowDateFilter(!showDateFilter)}
                className={showDateFilter ? "bg-muted" : ""}
              >
                <Filter className="mr-2 h-4 w-4" />
                Date Filter
              </Button>

              <div className="flex items-center space-x-1">
                <Button
                  variant="outline"
                  onClick={() => {
                    setSelectMode(!selectMode);
                    if (selectMode) {
                      setSelectedEntries(new Set());
                      setLastSelectedEntryId(null);
                    }
                  }}
                  className={selectMode ? "bg-muted" : ""}
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
            </div>

            {/* Date filter */}
            {showDateFilter && (
              <div className="mt-4">
                <DateFilter
                  onDateFilterChange={handleDateFilterChange}
                />
              </div>
            )}
          </div>

          {/* Bulk action bar */}
          {selectMode && selectedEntries.size > 0 && (
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
              folders={virtualFolders.map(folder => ({
                id: folder.type === 'category' ? `cat-folder-${folder.id}` : folder.id,
                name: folder.name,
                color: folder.color,
                isSystem: folder.type === 'category' || folder.type === 'goal' || folder.type === 'subgoal'
              }))}
              goals={goals}
            />
          )}

          {/* Entries list */}
          <div className="flex-1 overflow-y-auto p-4 min-h-0">
            {sortedEntries.length === 0 ? (
              <div className="text-center py-12">
                <div className="text-muted-foreground">
                  {searchQuery ? 'No recordings match your search.' : 'No recordings found.'}
                </div>
              </div>
            ) : (
              <div className="space-y-3">
                {sortedEntries.map((entry) => (
                  <HierarchicalDraggableEntry
                    key={entry.id}
                    entry={entry}
                    virtualFolders={virtualFolders}
                    onSelectEntry={onSelectEntry}
                    onSelectEntryWithEdit={onSelectEntryWithEdit}
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
        </div>
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeEntry ? <DragOverlayContent entry={activeEntry} /> : null}
      </DragOverlay>

      {/* Delete confirmation dialog */}
      <DeleteConfirmation
        isOpen={deleteDialogOpen}
        onClose={() => setDeleteDialogOpen(false)}
        onConfirm={() => {
          if (entryToDelete) {
            onDeleteEntry(entryToDelete);
            setEntryToDelete(null);
          } else {
            confirmBulkDelete();
          }
          setDeleteDialogOpen(false);
        }}
        title={entryToDelete ? "Delete Recording" : "Delete Recordings"}
        description={
          entryToDelete
            ? "Are you sure you want to delete this recording? This action cannot be undone."
            : `Are you sure you want to delete ${selectedEntries.size} recordings? This action cannot be undone.`
        }
      />
    </DndContext>
  );
}