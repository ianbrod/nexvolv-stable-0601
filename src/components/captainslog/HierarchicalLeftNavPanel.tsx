'use client';

import React, { useState, useRef, KeyboardEvent, useEffect, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import {
  Clock,
  FolderIcon,
  Star,
  Plus,
  Trash2,
  PenSquare,
  MoreVertical,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  X,
  Check,
  Loader2,
  Archive
} from 'lucide-react';
import { cn } from '@/lib/utils';
import { Input } from '@/components/ui/input';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useDroppable } from '@dnd-kit/core';
import { VirtualFolder } from '@/types/virtual-folder';
import { virtualFolderTreeBuilder } from '@/lib/services/virtual-folder-tree-builder';
import { CaptainsLogSavedFiltersDropdown } from './CaptainsLogSavedFiltersDropdown';
import { CaptainsLogFilterOptions } from '@/types';

interface HierarchicalLeftNavPanelProps {
  onSelectFilter: (filter: string) => void;
  activeFilter: string;
  onAddFolder?: (name: string, color?: string) => void;
  onDeleteFolder?: (id: string) => void;
  onRenameFolder?: (id: string, newName: string) => void;
  animatedFolderId?: string | null;
  selectedFilters?: string[];
  onMultiSelectFilter?: (filter: string) => void;
  isMultiSelectMode?: boolean;
  // Add props for saved filters functionality
  searchQuery?: string;
  startDate?: Date | null;
  endDate?: Date | null;
  showDateFilter?: boolean;
  onApplyFilter?: (filters: CaptainsLogFilterOptions) => void;
}

// Droppable uncategorized component
function UncategorizedDroppable({
  activeFilter,
  onSelectFilter,
  isAnimating,
  selectedFilters = [],
  onMultiSelectFilter,
  isMultiSelectMode = false
}: {
  activeFilter: string,
  onSelectFilter: (filter: string) => void,
  isAnimating?: boolean,
  selectedFilters?: string[],
  onMultiSelectFilter?: (filter: string) => void,
  isMultiSelectMode?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'uncategorized',
    data: {
      type: 'uncategorized'
    }
  });

  const isSelected = isMultiSelectMode
    ? selectedFilters.includes('uncategorized')
    : activeFilter === 'uncategorized';

  const handleClick = () => {
    if (isMultiSelectMode && onMultiSelectFilter) {
      onMultiSelectFilter('uncategorized');
    } else {
      onSelectFilter('uncategorized');
    }
  };

  return (
    <Button
      ref={setNodeRef}
      variant="ghost"
      style={{ borderRadius: 0 }} // Remove rounded corners to match design
      className={cn(
        "w-full justify-start h-10 px-3 group transition-all duration-200 relative",
        "hover:bg-accent/60 hover:shadow-sm",
        isSelected && "bg-accent/70 shadow-sm border-l-2 border-primary font-medium",
        isOver && "bg-primary/20 ring-2 ring-primary/30",
        isAnimating && "animate-pulse",
        isMultiSelectMode && "hover:bg-muted/50"
      )}
      onClick={handleClick}
    >
      {isMultiSelectMode && (
        <div className={cn(
          "w-4 h-4 rounded border mr-3 flex items-center justify-center transition-colors",
          isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
        )}>
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
      )}
      <FolderIcon className="mr-3 h-4 w-4 text-amber-500 group-hover:scale-110 transition-transform" />
      <span className="font-medium">Uncategorized</span>
      {/* Drop indicator */}
      {isOver && (
        <div className="absolute inset-0 border-2 border-primary border-dashed rounded-lg pointer-events-none" />
      )}
    </Button>
  );
}

// Droppable favorites component
function FavoritesDroppable({
  activeFilter,
  onSelectFilter,
  isAnimating,
  selectedFilters = [],
  onMultiSelectFilter,
  isMultiSelectMode = false
}: {
  activeFilter: string,
  onSelectFilter: (filter: string) => void,
  isAnimating?: boolean,
  selectedFilters?: string[],
  onMultiSelectFilter?: (filter: string) => void,
  isMultiSelectMode?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'favorites',
    data: {
      type: 'favorites'
    }
  });

  const isSelected = isMultiSelectMode
    ? selectedFilters.includes('favorites')
    : activeFilter === 'favorites';

  const handleClick = () => {
    if (isMultiSelectMode && onMultiSelectFilter) {
      onMultiSelectFilter('favorites');
    } else {
      onSelectFilter('favorites');
    }
  };

  return (
    <Button
      ref={setNodeRef}
      variant="ghost"
      style={{ borderRadius: 0 }} // Remove rounded corners to match design
      className={cn(
        "w-full justify-start h-10 px-3 group transition-all duration-200 relative",
        "hover:bg-accent/60 hover:shadow-sm",
        isSelected && "bg-accent/70 shadow-sm border-l-2 border-primary font-medium",
        isOver && "bg-primary/20 ring-2 ring-primary/30",
        isAnimating && "animate-pulse"
      )}
      onClick={handleClick}
    >
      {isMultiSelectMode && (
        <div className={cn(
          "w-4 h-4 rounded border mr-3 flex items-center justify-center transition-colors",
          isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
        )}>
          {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
        </div>
      )}
      <Star className="mr-3 h-4 w-4 text-amber-500 fill-amber-500 group-hover:scale-110 transition-transform drop-shadow-sm" />
      <span className="font-medium">Favorites</span>
      {/* Drop indicator */}
      {isOver && (
        <div className="absolute inset-0 border-2 border-primary border-dashed rounded-lg pointer-events-none" />
      )}
    </Button>
  );
}

// Hierarchical droppable folder component
function HierarchicalDroppableFolder({
  folder,
  activeFilter,
  onSelectFilter,
  isAnimating,
  selectedFilters = [],
  onMultiSelectFilter,
  isMultiSelectMode = false,
  expandedFolders,
  setExpandedFolders
}: {
  folder: VirtualFolder,
  activeFilter: string,
  onSelectFilter: (filter: string) => void,
  isAnimating: boolean,
  selectedFilters?: string[],
  onMultiSelectFilter?: (filter: string) => void,
  isMultiSelectMode?: boolean,
  expandedFolders: Set<string>,
  setExpandedFolders: React.Dispatch<React.SetStateAction<Set<string>>>
}) {
  // Use shared expansion state instead of local state
  const isExpanded = expandedFolders.has(folder.id);

  // State for double-click detection
  const [clickTimeout, setClickTimeout] = useState<NodeJS.Timeout | null>(null);

  // Cleanup timeout on unmount
  useEffect(() => {
    return () => {
      if (clickTimeout) {
        clearTimeout(clickTimeout);
      }
    };
  }, [clickTimeout]);

  // Create a droppable area specifically for this folder (not including children)
  const { setNodeRef, isOver } = useDroppable({
    id: `folder:${folder.id}`,
    data: {
      type: 'folder',
      id: folder.id,
      sourceId: folder.sourceId,
      folderType: folder.type,
      isExpanded: isExpanded
    }
  });

  // Toggle expanded state
  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    setExpandedFolders(prev => {
      const newSet = new Set(prev);
      if (isExpanded) {
        newSet.delete(folder.id);
      } else {
        newSet.add(folder.id);
      }
      return newSet;
    });
  };

  // Recursively collect all descendant folder IDs
  const getAllDescendantIds = (folder: VirtualFolder): string[] => {
    const ids: string[] = [];
    if (folder.children) {
      for (const child of folder.children) {
        ids.push(child.id);
        ids.push(...getAllDescendantIds(child));
      }
    }
    return ids;
  };

  // Toggle expand/collapse all descendants of this folder
  const toggleExpandAll = () => {
    const descendantIds = getAllDescendantIds(folder);
    const allDescendantsExpanded = descendantIds.length > 0 &&
      descendantIds.every(id => expandedFolders.has(id)) &&
      isExpanded;

    setExpandedFolders(prev => {
      const newSet = new Set(prev);

      if (allDescendantsExpanded) {
        // Collapse all: remove this folder and all descendants
        newSet.delete(folder.id);
        descendantIds.forEach(id => newSet.delete(id));
      } else {
        // Expand all: add this folder and all descendants
        newSet.add(folder.id);
        descendantIds.forEach(id => newSet.add(id));
      }

      return newSet;
    });
  };

  const folderId = `folder:${folder.id}`;
  const isSelected = isMultiSelectMode
    ? selectedFilters.includes(folderId)
    : activeFilter === folderId;

  // Check if a child folder is selected (for inheritance styling)
  const hasSelectedChild = useMemo(() => {
    if (isSelected) return false; // Don't show inheritance if this folder itself is selected

    const checkChildSelection = (children: VirtualFolder[]): boolean => {
      for (const child of children) {
        const childFolderId = `folder:${child.id}`;
        const childIsSelected = isMultiSelectMode
          ? selectedFilters.includes(childFolderId)
          : activeFilter === childFolderId;

        if (childIsSelected) return true;
        if (child.children && checkChildSelection(child.children)) return true;
      }
      return false;
    };

    return folder.children ? checkChildSelection(folder.children) : false;
  }, [folder.children, activeFilter, selectedFilters, isMultiSelectMode, isSelected]);

  const handleClick = () => {
    // Clear any existing timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }

    // Only handle double-click for category folders
    if (folder.type === 'category') {
      // Set a timeout for single-click
      const timeout = setTimeout(() => {
        // Single click - normal selection behavior
        if (isMultiSelectMode && onMultiSelectFilter) {
          onMultiSelectFilter(folderId);
        } else {
          onSelectFilter(folderId);
        }
        setClickTimeout(null);
      }, 300); // 300ms delay to detect double-click

      setClickTimeout(timeout);
    } else {
      // For non-category folders, handle click immediately
      if (isMultiSelectMode && onMultiSelectFilter) {
        onMultiSelectFilter(folderId);
      } else {
        onSelectFilter(folderId);
      }
    }
  };

  const handleDoubleClick = () => {
    // Clear the single-click timeout
    if (clickTimeout) {
      clearTimeout(clickTimeout);
      setClickTimeout(null);
    }

    // Only toggle expand/collapse all for category folders
    if (folder.type === 'category') {
      toggleExpandAll();
    }
  };

  // Calculate indentation based on folder level
  const indentationPx = (folder.level || 0) * 16;

  return (
    <div className="relative">
      <Button
        ref={setNodeRef}
        variant="ghost"
        style={{
          borderRadius: 0, // Remove rounded corners to match design
          // Proper indentation: categories start at 4px, goals at 12px, subgoals at 5px
          paddingLeft: folder.type === 'category'
            ? '4px'
            : folder.type === 'goal'
            ? '20px'
            : '5px', // Subgoals with minimal padding
          // Add color-coded left border positioned at the button level
          borderLeft: folder.color ? `4px solid ${folder.color}` : undefined,
          marginLeft: `${(folder.level || 0) * 16}px` // Move the entire button to create indented border
        }}
        className={cn(
          "w-full justify-start h-auto py-2 px-2 group transition-all duration-200 relative",
          "hover:bg-accent/50 hover:shadow-sm",
          // Selection styling
          isSelected && "bg-accent/70 shadow-sm font-medium",
          // Inheritance styling - subtle indication when child is selected
          hasSelectedChild && !isSelected && "bg-accent/30 border-l-2 border-accent/60",
          isOver && "bg-primary/20 ring-2 ring-primary/30",
          isAnimating && "animate-pulse",
          // Enhanced type-based styling
          folder.type === 'category' && "font-semibold text-foreground",
          folder.type === 'goal' && "font-medium text-foreground/90",
          folder.type === 'subgoal' && "font-normal text-muted-foreground",
          folder.type === 'custom' && "font-medium text-foreground/80 opacity-90", // Custom folder styling
          isMultiSelectMode && "hover:bg-muted/50"
        )}
        onClick={handleClick}
        onDoubleClick={handleDoubleClick}
      >
        <div className="flex items-center w-full min-h-[24px]">
          {/* Multi-select checkbox */}
          {isMultiSelectMode && (
            <div className={cn(
              "w-4 h-4 rounded border mr-2 flex items-center justify-center transition-colors",
              isSelected ? "bg-primary border-primary" : "border-muted-foreground/40"
            )}>
              {isSelected && <Check className="h-3 w-3 text-primary-foreground" />}
            </div>
          )}

          {/* Folder icon for categories and custom folders, with solid fill matching folder color */}
          {(folder.type === 'category' || folder.type === 'custom') && (
            <div className="relative mr-2 flex items-center">
              <FolderIcon
                className={cn(
                  "h-4 w-4 transition-all duration-200",
                  "group-hover:scale-110",
                  "drop-shadow-sm",
                  isSelected && "scale-110",
                  hasSelectedChild && !isSelected && "scale-105 opacity-80", // Subtle inheritance styling
                  folder.type === 'custom' && "opacity-80" // Slightly muted for custom folders
                )}
                style={{
                  color: folder.color,
                  fill: folder.color // Solid fill matching folder color
                }}
              />
              {/* Subtle glow effect for selected items */}
              {isSelected && (
                <div
                  className="absolute inset-0 rounded-full blur-sm opacity-30"
                  style={{ backgroundColor: folder.color }}
                />
              )}
              {/* Subtle inheritance glow effect */}
              {hasSelectedChild && !isSelected && (
                <div
                  className="absolute inset-0 rounded-full blur-sm opacity-15"
                  style={{ backgroundColor: folder.color }}
                />
              )}
            </div>
          )}

          {/* Expand/collapse icon for folders with children - positioned consistently */}
          <div className="w-6 flex justify-start items-center">
            {folder.children && folder.children.length > 0 && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  toggleExpanded(e);
                }}
                className={cn(
                  "p-1 rounded-md cursor-pointer transition-all duration-150",
                  "hover:bg-accent/60 hover:scale-105 active:scale-95",
                  "flex items-center justify-center"
                )}
              >
                {isExpanded ?
                  <ChevronDown className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" /> :
                  <ChevronRight className="h-3 w-3 text-muted-foreground group-hover:text-foreground transition-colors" />
                }
              </div>
            )}
          </div>

          <span className={cn(
            "truncate flex-1 transition-colors duration-200 text-left",
            "group-hover:text-foreground",
            isSelected && "font-medium",
            hasSelectedChild && !isSelected && "font-medium opacity-80" // Subtle inheritance text styling
          )}>
            {folder.name}
          </span>

          {/* Entry count badge for categories only */}
          {folder.type === 'category' && folder.children && folder.children.length > 0 && (
            <div className={cn(
              "ml-2 px-1.5 py-0.5 rounded-full text-xs font-medium",
              "bg-muted/50 text-muted-foreground",
              "group-hover:bg-accent/60 transition-colors duration-200",
              "opacity-0 group-hover:opacity-100"
            )}>
              {folder.children.length}
            </div>
          )}
        </div>

        {/* Enhanced visual indicator for drop target */}
        {isOver && (
          <div
            className="absolute inset-0 pointer-events-none border-2 border-primary border-dashed rounded-lg bg-primary/5"
            aria-hidden="true"
          />
        )}
      </Button>

      {/* Render child folders if expanded */}
      {isExpanded && folder.children && folder.children.length > 0 && (
        <div onClick={(e) => e.stopPropagation()}>
          {folder.children.map(childFolder => (
            <HierarchicalDroppableFolder
              key={childFolder.id}
              folder={childFolder}
              activeFilter={activeFilter}
              onSelectFilter={onSelectFilter}
              isAnimating={isAnimating && childFolder.id === folder.id}
              selectedFilters={selectedFilters}
              onMultiSelectFilter={onMultiSelectFilter}
              isMultiSelectMode={isMultiSelectMode}
              expandedFolders={expandedFolders}
              setExpandedFolders={setExpandedFolders}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function HierarchicalLeftNavPanel({
  onSelectFilter,
  activeFilter,
  onAddFolder,
  onDeleteFolder,
  onRenameFolder,
  animatedFolderId,
  selectedFilters = [],
  onMultiSelectFilter,
  isMultiSelectMode = false,
  searchQuery = '',
  startDate = null,
  endDate = null,
  showDateFilter = false,
  onApplyFilter,
}: HierarchicalLeftNavPanelProps) {
  const [virtualFolders, setVirtualFolders] = useState<VirtualFolder[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editedFolderName, setEditedFolderName] = useState('');


  const [collapseKey, setCollapseKey] = useState(0); // Key to force re-render and collapse all
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set()); // Shared expansion state

  // Fetch Prisma data and build folder tree
  useEffect(() => {
    async function fetchFolders() {
      try {
        setIsLoading(true);
        setError(null);

        console.log('Fetching hierarchical folder tree for left nav panel...');

        // Build virtual folder tree from Prisma entities
        const folderTree = await virtualFolderTreeBuilder.buildFolderTree();

        console.log(`Loaded ${folderTree.length} top-level folders for navigation`);

        setVirtualFolders(folderTree);
      } catch (error) {
        console.error('Error loading folder tree for navigation:', error);
        setError('Failed to load folders');
      } finally {
        setIsLoading(false);
      }
    }

    fetchFolders();
  }, []);

  // Function to toggle multi-select mode
  const toggleMultiSelectMode = () => {
    if (onMultiSelectFilter) {
      const event = new CustomEvent('toggleMultiSelectMode', {
        detail: { isMultiSelectMode: !isMultiSelectMode }
      });
      window.dispatchEvent(event);
    }
  };

  // Function to collapse all folders
  const handleCollapseAll = () => {
    setCollapseKey(prev => prev + 1); // Force re-render of all folder components
    setExpandedFolders(new Set()); // Clear all expanded folders
    console.log('All folders collapsed');
  };

  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const handleAddFolder = async () => {
    if (newFolderName.trim() && onAddFolder) {
      await onAddFolder(newFolderName.trim());
      setNewFolderName('');
      setIsAddingFolder(false);

      // Reload virtual folders to include the new custom folder
      try {
        const folderTree = await virtualFolderTreeBuilder.buildFolderTree();
        setVirtualFolders(folderTree);
      } catch (error) {
        console.error('Error reloading folders after add:', error);
      }
    }
  };

  const cancelAddFolder = () => {
    setNewFolderName('');
    setIsAddingFolder(false);
  };

  // Handle clicks outside the input field to cancel adding
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (isAddingFolder && newFolderInputRef.current && !newFolderInputRef.current.contains(event.target as Node)) {
        cancelAddFolder();
      }
    };

    if (isAddingFolder) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [isAddingFolder]);

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddFolder();
    } else if (e.key === 'Escape') {
      cancelAddFolder();
    }
  };

  const handleRenameFolder = async (id: string) => {
    if (editedFolderName.trim() && onRenameFolder) {
      await onRenameFolder(id, editedFolderName.trim());
      setEditingFolderId(null);
      setEditedFolderName('');

      // Reload virtual folders to reflect the name change
      try {
        const folderTree = await virtualFolderTreeBuilder.buildFolderTree();
        setVirtualFolders(folderTree);
      } catch (error) {
        console.error('Error reloading folders after rename:', error);
      }
    }
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      handleRenameFolder(id);
    } else if (e.key === 'Escape') {
      cancelEditFolder();
    }
  };

  const startEditingFolder = (folder: VirtualFolder) => {
    setEditingFolderId(folder.id);
    setEditedFolderName(folder.name);
  };

  const cancelEditFolder = () => {
    setEditingFolderId(null);
    setEditedFolderName('');
  };

  // Handle clicks outside the edit input field to cancel editing
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (editingFolderId) {
        // Check if the click is outside any input field that might be for editing
        const editInputs = document.querySelectorAll('input[placeholder*="Type name"]');
        let clickedOutside = true;

        editInputs.forEach(input => {
          if (input.contains(event.target as Node)) {
            clickedOutside = false;
          }
        });

        if (clickedOutside) {
          cancelEditFolder();
        }
      }
    };

    if (editingFolderId) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [editingFolderId]);

  return (
    <div className="w-80 border-r border-border/50 h-full flex flex-col bg-card/30 backdrop-blur-sm">
      {/* Fixed Navigation links */}
      <div className="px-4 py-4 border-b border-border/30">
        <h3 className="text-xs font-semibold text-muted-foreground/80 mb-3 tracking-wider uppercase">Navigation</h3>
        <nav className="space-y-1">
          <Button
            variant="ghost"
            style={{ borderRadius: 0 }} // Remove rounded corners to match design
            className={cn(
              "w-full justify-start h-10 px-3 group transition-all duration-200",
              "hover:bg-accent/60 hover:shadow-sm",
              (isMultiSelectMode ? selectedFilters.includes('recent') : activeFilter === 'recent') &&
                "bg-accent/70 shadow-sm border-l-2 border-primary font-medium",
              isMultiSelectMode && "hover:bg-muted/50"
            )}
            onClick={() => {
              if (isMultiSelectMode && onMultiSelectFilter) {
                onMultiSelectFilter('recent');
              } else {
                onSelectFilter('recent');
              }
            }}
          >
            {isMultiSelectMode && (
              <div className={cn(
                "w-4 h-4 rounded border mr-3 flex items-center justify-center transition-colors",
                selectedFilters.includes('recent') ? "bg-primary border-primary" : "border-muted-foreground/40"
              )}>
                {selectedFilters.includes('recent') && <Check className="h-3 w-3 text-primary-foreground" />}
              </div>
            )}
            <Clock className="mr-3 h-4 w-4 text-blue-500 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Recent Files</span>
          </Button>
          <UncategorizedDroppable
            activeFilter={activeFilter}
            onSelectFilter={onSelectFilter}
            isAnimating={animatedFolderId === 'uncategorized'}
            selectedFilters={selectedFilters}
            onMultiSelectFilter={onMultiSelectFilter}
            isMultiSelectMode={isMultiSelectMode}
          />
          <FavoritesDroppable
            activeFilter={activeFilter}
            onSelectFilter={onSelectFilter}
            isAnimating={animatedFolderId === 'favorites'}
            selectedFilters={selectedFilters}
            onMultiSelectFilter={onMultiSelectFilter}
            isMultiSelectMode={isMultiSelectMode}
          />

        </nav>
      </div>

      {/* Scrollable Folders section */}
      <div className="px-4 py-4 flex-1 overflow-hidden min-h-0">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center">
            <h3 className="text-xs font-semibold text-muted-foreground/80 mr-2 tracking-wider uppercase">Folders</h3>
            <Button
              variant="ghost"
              size="icon"
              className={cn(
                "h-6 w-6 p-0 ml-1 rounded-md transition-all duration-200",
                isMultiSelectMode && "bg-primary/20 text-primary hover:bg-primary/30"
              )}
              onClick={toggleMultiSelectMode}
              title={isMultiSelectMode ? "Exit Multi-Select Mode" : "Enter Multi-Select Mode"}
            >
              <Check className="h-3 w-3" />
            </Button>
          </div>
          <div className="flex items-center space-x-1">
            {/* Saved Filters Dropdown */}
            {onApplyFilter && (
              <CaptainsLogSavedFiltersDropdown
                currentFilters={{
                  activeFilter,
                  selectedFilters,
                  isMultiSelectMode,
                  searchQuery,
                  startDate,
                  endDate,
                  showDateFilter,
                }}
                onApplyFilter={onApplyFilter}
              />
            )}
            {/* Collapse All Button - only show when folders are expanded */}
            {expandedFolders.size > 0 && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-gray-500/10 hover:text-gray-600 transition-colors"
                onClick={handleCollapseAll}
                title="Collapse All Folders"
              >
                <ChevronUp className="h-3.5 w-3.5" />
              </Button>
            )}
            {(isMultiSelectMode ? selectedFilters.length > 1 : activeFilter !== 'recent') && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-destructive/10 hover:text-destructive transition-colors"
                onClick={() => {
                  if (isMultiSelectMode) {
                    // Clear all filters and set only "Recent Files"
                    // First, dispatch a custom event to clear all filters
                    const clearEvent = new CustomEvent('clearAllFilters');
                    window.dispatchEvent(clearEvent);
                  } else {
                    onSelectFilter('recent');
                  }
                }}
                title="Clear Filters"
              >
                <X className="h-3.5 w-3.5" />
              </Button>
            )}
            {onAddFolder && (
              <Button
                variant="ghost"
                size="icon"
                className="h-7 w-7 rounded-md hover:bg-green-500/10 hover:text-green-600 transition-colors"
                onClick={() => setIsAddingFolder(true)}
                disabled={isAddingFolder}
              >
                <Plus className="h-3.5 w-3.5" />
              </Button>
            )}
          </div>
        </div>

        {/* Add folder input */}
        {isAddingFolder && onAddFolder && (
          <div className="mb-2">
            <Input
              ref={newFolderInputRef}
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Type folder name & press Enter"
              className="h-8 text-sm"
              autoFocus
            />
          </div>
        )}

        {/* Loading state */}
        {isLoading && (
          <div className="flex flex-col items-center justify-center py-6 space-y-3">
            <div className="relative">
              <Loader2 className="h-5 w-5 animate-spin text-primary" />
              <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
            </div>
            <div className="text-center">
              <div className="text-sm font-medium text-foreground">Loading folders</div>
              <div className="text-xs text-muted-foreground mt-1">Organizing content...</div>
            </div>
          </div>
        )}

        {/* Error state */}
        {error && (
          <div className="text-center py-6 space-y-3">
            <div className="mx-auto w-10 h-10 rounded-full bg-destructive/10 flex items-center justify-center">
              <div className="w-5 h-5 rounded-full bg-destructive/20" />
            </div>
            <div>
              <div className="text-sm font-medium text-foreground">Failed to load</div>
              <div className="text-xs text-muted-foreground mt-1">{error}</div>
            </div>
            <Button
              variant="outline"
              size="sm"
              className="h-8 px-3 text-xs hover:bg-accent/50 transition-colors"
              onClick={() => window.location.reload()}
            >
              Try Again
            </Button>
          </div>
        )}

        {/* Scrollable Folder list */}
        {!isLoading && !error && (
          <div className="overflow-y-scroll overflow-x-hidden flex-1 min-h-0" style={{ maxHeight: 'calc(100vh - 320px)' }}>
            <nav className="space-y-1 pb-4">
              {virtualFolders.length === 0 ? (
                <div className="text-center py-8 space-y-3">
                  <div className="mx-auto w-12 h-12 rounded-full bg-muted/30 flex items-center justify-center">
                    <FolderIcon className="w-6 h-6 text-muted-foreground/50" />
                  </div>
                  <div>
                    <div className="text-sm font-medium text-foreground">No folders found</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      Create categories and goals to organize your content
                    </div>
                  </div>
                </div>
              ) : (
                virtualFolders.map(folder => (
                  <div key={`${folder.id}-${collapseKey}`} className="flex items-center group relative">
                    {editingFolderId === folder.id ? (
                      <div className="flex items-center flex-1">
                        <Input
                          value={editedFolderName}
                          onChange={(e) => setEditedFolderName(e.target.value)}
                          onKeyDown={(e) => handleEditKeyDown(e, folder.id)}
                          placeholder="Type name & press Enter"
                          className="h-8 text-sm"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <>
                        <div className="w-full relative">
                          <HierarchicalDroppableFolder
                            key={`folder-${folder.id}-${collapseKey}`}
                            folder={folder}
                            activeFilter={activeFilter}
                            onSelectFilter={onSelectFilter}
                            isAnimating={animatedFolderId === folder.id}
                            selectedFilters={selectedFilters}
                            onMultiSelectFilter={onMultiSelectFilter}
                            isMultiSelectMode={isMultiSelectMode}
                            expandedFolders={expandedFolders}
                            setExpandedFolders={setExpandedFolders}
                          />
                          {/* Three dots menu for custom folders only */}
                          {folder.type === 'custom' && onDeleteFolder && onRenameFolder && (
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button
                                  variant="ghost"
                                  size="icon"
                                  className="h-6 w-6 opacity-60 hover:opacity-100 absolute right-2 top-1/2 transform -translate-y-1/2"
                                  onClick={(e) => e.stopPropagation()}
                                >
                                  <MoreVertical className="h-3 w-3" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuItem onClick={() => startEditingFolder(folder)}>
                                  <PenSquare className="h-3 w-3 mr-2" />
                                  Rename
                                </DropdownMenuItem>
                                <DropdownMenuItem
                                  onClick={async () => {
                                    if (onDeleteFolder) {
                                      await onDeleteFolder(folder.id);
                                      // Reload virtual folders to remove the deleted custom folder
                                      try {
                                        const folderTree = await virtualFolderTreeBuilder.buildFolderTree();
                                        setVirtualFolders(folderTree);
                                      } catch (error) {
                                        console.error('Error reloading folders after delete:', error);
                                      }
                                    }
                                  }}
                                  className="text-red-500"
                                >
                                  <Trash2 className="h-3 w-3 mr-2" />
                                  Delete
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          )}
                        </div>
                      </>
                    )}
                  </div>
                ))
              )}
            </nav>
          </div>
        )}
      </div>
    </div>
  );
}
