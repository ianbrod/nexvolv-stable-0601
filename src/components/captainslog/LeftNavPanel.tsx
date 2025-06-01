'use client';

import React, { useState, useRef, KeyboardEvent } from 'react';
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
  ChevronDown
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

interface Folder {
  id: string;
  name: string;
  color?: string;
  isSystem?: boolean;
  parentId?: string;
}

interface LeftNavPanelProps {
  onSelectFilter: (filter: string) => void;
  activeFilter: string;
  folders: Folder[];
  onAddFolder: (name: string) => void;
  onDeleteFolder: (id: string) => void;
  onRenameFolder: (id: string, newName: string) => void;
  animatedFolderId?: string | null; // Add optional prop for animation
  goals?: any[]; // Add goals parameter for showing goals when a category is selected
}

// Droppable uncategorized component
function UncategorizedDroppable({ activeFilter, onSelectFilter, isAnimating }: {
  activeFilter: string,
  onSelectFilter: (filter: string) => void,
  isAnimating?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'uncategorized',
    data: {
      type: 'uncategorized'
    }
  });

  console.log('UncategorizedDroppable rendered');

  return (
    <Button
      ref={setNodeRef}
      variant="ghost"
      className={cn(
        "w-full justify-start",
        activeFilter === 'uncategorized' && "bg-muted font-medium",
        isOver && "bg-primary/10", // Highlight when dragging over
        isAnimating && "animate-pulse-border" // Apply animation class
      )}
      onClick={() => onSelectFilter('uncategorized')}
    >
      <FolderIcon className="mr-2 h-4 w-4" />
      Uncategorized
    </Button>
  );
}

// Droppable favorites component
function FavoritesDroppable({ activeFilter, onSelectFilter, isAnimating }: {
  activeFilter: string,
  onSelectFilter: (filter: string) => void,
  isAnimating?: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: 'favorites',
    data: {
      type: 'favorites'
    }
  });

  console.log('FavoritesDroppable rendered');

  return (
    <Button
      ref={setNodeRef}
      variant="ghost"
      className={cn(
        "w-full justify-start",
        activeFilter === 'favorites' && "bg-muted font-medium",
        isOver && "bg-primary/10", // Highlight when dragging over
        isAnimating && "animate-pulse-border" // Apply animation class
      )}
      onClick={() => onSelectFilter('favorites')}
    >
      <Star className="mr-2 h-6 w-6 text-amber-500 fill-amber-500" />
      Favorites
    </Button>
  );
}

// DroppableGoalItem component for displaying goals and sub-goals with drop targets
function GoalItem({
  goal,
  subGoals,
  allGoals,
  activeFilter,
  onSelectFilter,
  level = 0,
  categoryColor
}: {
  goal: any,
  subGoals: any[],
  allGoals: any[],
  activeFilter: string,
  onSelectFilter: (filter: string) => void,
  level: number,
  categoryColor?: string
}) {
  const [isExpanded, setIsExpanded] = useState(false);
  const hasSubGoals = subGoals.length > 0;

  // Make the goal a drop target
  const { setNodeRef: setGoalRef, isOver: isGoalOver } = useDroppable({
    id: `goal:${goal.id}`,
    data: {
      type: 'goal',
      id: goal.id
    }
  });

  return (
    <div className="space-y-1">
      <div className="flex items-center">
        <Button
          ref={setGoalRef}
          variant="ghost"
          className={cn(
            "w-full justify-start",
            activeFilter === `goal:${goal.id}` && "bg-muted font-medium",
            level > 0 && "text-sm", // Smaller text for nested goals
            isGoalOver && "bg-primary/10" // Highlight when dragging over
          )}
          style={{
            paddingLeft: `${(level * 12) + 8}px`,
            borderLeft: categoryColor ? `4px solid ${categoryColor}` : undefined,
            borderTopLeftRadius: categoryColor ? '0' : undefined,
            borderBottomLeftRadius: categoryColor ? '0' : undefined
          }}
          onClick={() => onSelectFilter(`goal:${goal.id}`)}
        >
          <div className="flex items-center w-full">
            {/* Expand/collapse icon for goals with sub-goals */}
            {hasSubGoals && (
              <div
                onClick={(e) => {
                  e.stopPropagation();
                  // When expanding, we want to make sure the goal remains a valid drop target
                  setIsExpanded(!isExpanded);
                }}
                className="mr-1 p-1 hover:bg-gray-200 rounded-sm cursor-pointer"
              >
                {isExpanded ?
                  <ChevronDown className="h-3 w-3" /> :
                  <ChevronRight className="h-3 w-3" />
                }
              </div>
            )}
            {/* Indent space for goals without sub-goals */}
            {!hasSubGoals && <div className="w-5"></div>}

            <div className="w-2 h-2 rounded-full bg-primary mr-2"></div>
            <span className="truncate">{goal.name}</span>
          </div>
        </Button>
      </div>

      {/* Render sub-goals if expanded */}
      {hasSubGoals && isExpanded && (
        <div>
          {subGoals.map(subGoal => {
            // Find sub-goals of this sub-goal
            const nestedSubGoals = allGoals.filter(g => g.parentGoalId === subGoal.id);

            return (
              <GoalItem
                key={subGoal.id}
                goal={subGoal}
                subGoals={nestedSubGoals}
                allGoals={allGoals}
                activeFilter={activeFilter}
                onSelectFilter={onSelectFilter}
                level={level + 1}
                categoryColor={categoryColor}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}

// Droppable folder component
function DroppableFolder({
  folder,
  activeFilter,
  onSelectFilter,
  isAnimating, // Add prop to receive animation state
  showGoals = false,
  goals = [],
  categoryId = ''
}: {
  folder: Folder,
  activeFilter: string,
  onSelectFilter: (filter: string) => void,
  isAnimating: boolean,
  showGoals?: boolean,
  goals?: any[],
  categoryId?: string
}) {
  // Create two separate droppable areas - one for the folder itself and one for the expanded content
  const { setNodeRef: setFolderRef, isOver: isFolderOver } = useDroppable({
    id: `folder:${folder.id}`,
    data: {
      type: 'folder',
      id: folder.id
    }
  });

  // State for expanded/collapsed folders
  const [isExpanded, setIsExpanded] = useState(false);

  // Create style object for the folder
  const folderStyle: React.CSSProperties = folder.isSystem && folder.color ? {
    // For system folders, use left border with the category color
    borderLeftWidth: '4px',
    borderLeftStyle: 'solid',
    borderLeftColor: folder.color,
    borderTopLeftRadius: '0',
    borderBottomLeftRadius: '0'
  } : {};

  // Get top-level goals for this category (no parentGoalId)
  const topLevelGoals = goals.filter(goal => {
    // Debug logging to help diagnose the issue
    console.log(`Filtering goal: ${goal.id}, category: ${goal.category}, categoryId: ${categoryId}, parentGoalId: ${goal.parentGoalId}`);
    return goal.category === categoryId && !goal.parentGoalId;
  });

  // Toggle expanded state
  const toggleExpanded = (e: React.MouseEvent) => {
    e.stopPropagation();
    // When expanding, we want to make sure the folder remains a valid drop target
    setIsExpanded(!isExpanded);
  };

  console.log(`DroppableFolder rendered: folder:${folder.id}, showGoals:${showGoals}, goals:${topLevelGoals.length}, categoryId:${categoryId}`);

  return (
    <div>
      {/* The folder button itself is droppable */}
      <Button
        ref={setFolderRef}
        variant="ghost"
        style={folderStyle}
        className={cn(
          "w-full justify-start", // No right padding for system folders
          !folder.isSystem && "pr-8", // Add right padding only for user folders with menu button
          activeFilter === `folder:${folder.id}` && "bg-muted font-medium",
          isFolderOver && "bg-primary/10", // Highlight when dragging over
          isAnimating && "animate-pulse-border", // Apply animation class
          folder.isSystem && "font-medium", // Make system folders stand out
          folder.isSystem && "pl-3" // Add left padding for system folders to account for border
        )}
        onClick={() => onSelectFilter(`folder:${folder.id}`)}
      >
        <div className="flex items-center w-full">
          {/* Expand/collapse icon for folders with goals */}
          {showGoals && (
            <div
              onClick={(e) => {
                e.stopPropagation();
                toggleExpanded(e);
              }}
              className="mr-1 p-1 hover:bg-gray-200 rounded-sm cursor-pointer"
            >
              {isExpanded ?
                <ChevronDown className="h-3 w-3" /> :
                <ChevronRight className="h-3 w-3" />
              }
            </div>
          )}

          {/* Only show folder icon for non-system folders */}
          {!folder.isSystem && <FolderIcon className="mr-2 h-4 w-4" />}

          <span className="truncate">{folder.name}</span>
        </div>
      </Button>

      {/* Render goals if this is a category folder and it's expanded */}
      {showGoals && isExpanded && (
        <div className="ml-4 mt-1">
          {topLevelGoals.length > 0 ? (
            topLevelGoals.map(goal => {
              // Find sub-goals for this goal
              const subGoals = goals.filter(g => g.parentGoalId === goal.id);

              return (
                <GoalItem
                  key={goal.id}
                  goal={goal}
                  subGoals={subGoals}
                  allGoals={goals}
                  activeFilter={activeFilter}
                  onSelectFilter={onSelectFilter}
                  level={0}
                  categoryColor={folder.color}
                />
              );
            })
          ) : (
            <div className="text-sm text-muted-foreground pl-2 py-1">
              No goals in this category
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function LeftNavPanel({
  onSelectFilter,
  activeFilter,
  folders,
  onAddFolder,
  onDeleteFolder,
  onRenameFolder,
  animatedFolderId, // Destructure the new prop
  goals = [] // Destructure goals with default empty array
}: LeftNavPanelProps) {
  console.log('[DEBUG] LeftNavPanel received props:', { activeFilter, folders, goals, animatedFolderId }); // Log received props

  const [isAddingFolder, setIsAddingFolder] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [editingFolderId, setEditingFolderId] = useState<string | null>(null);
  const [editedFolderName, setEditedFolderName] = useState('');

  const newFolderInputRef = useRef<HTMLInputElement>(null);

  const handleAddFolder = () => {
    if (newFolderName.trim()) {
      onAddFolder(newFolderName.trim());
      setNewFolderName('');
      setIsAddingFolder(false);
    }
  };

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      handleAddFolder();
    } else if (e.key === 'Escape') {
      setIsAddingFolder(false);
    }
  };

  const handleRenameFolder = (id: string) => {
    if (editedFolderName.trim()) {
      onRenameFolder(id, editedFolderName.trim());
      setEditingFolderId(null);
      setEditedFolderName('');
    }
  };

  const handleEditKeyDown = (e: KeyboardEvent<HTMLInputElement>, id: string) => {
    if (e.key === 'Enter') {
      handleRenameFolder(id);
    } else if (e.key === 'Escape') {
      setEditingFolderId(null);
    }
  };

  const startEditingFolder = (folder: Folder) => {
    setEditingFolderId(folder.id);
    setEditedFolderName(folder.name);
  };

  return (
    <div className="w-64 h-full border-r flex flex-col">

      {/* Navigation links */}
      <div className="flex-1 overflow-y-auto min-h-0">
        <div className="px-3 py-2">
          <h3 className="text-sm font-medium text-muted-foreground mb-1">NAVIGATION</h3>
          <nav className="space-y-1">
            <Button
              variant="ghost"
              className={cn(
                "w-full justify-start",
                activeFilter === 'recent' && "bg-muted font-medium"
              )}
              onClick={() => onSelectFilter('recent')}
            >
              <Clock className="mr-2 h-6 w-6" />
              Recent Files
            </Button>
            <UncategorizedDroppable
              activeFilter={activeFilter}
              onSelectFilter={onSelectFilter}
              isAnimating={animatedFolderId === 'uncategorized'}
            />

            {/* Removed redundant recording button */}
            <FavoritesDroppable
              activeFilter={activeFilter}
              onSelectFilter={onSelectFilter}
              isAnimating={animatedFolderId === 'favorites'}
            />


          </nav>
        </div>

        {/* Always show Folders section */}
        {(() => {
          const isCategorySelected = activeFilter.startsWith('folder:') && activeFilter.includes('cat-folder-');
          const selectedCategoryId = isCategorySelected ? activeFilter.replace('folder:cat-folder-', '') : '';
          console.log(`[DEBUG] LeftNavPanel rendering view with activeFilter: ${activeFilter}, selectedCategoryId: ${selectedCategoryId}`);

          // Always show Folders section
          console.log('[DEBUG] LeftNavPanel rendering Folders. Folders data:', folders);
          return (
              <div className="px-3 py-2">
                <div className="flex items-center justify-between mb-1">
                  <h3 className="text-sm font-medium text-muted-foreground">FOLDERS</h3>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-6 w-6 hover:bg-muted border border-transparent hover:border-muted-foreground/20"
                    onClick={() => {
                      console.log('Add folder button clicked');
                      setIsAddingFolder(true);
                    }}
                    disabled={isAddingFolder}
                    title="Add custom folder"
                  >
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Add folder input */}
                {isAddingFolder && (
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

                {/* Folder list */}
                <nav className="space-y-1">
                  {folders.map((folder) => {
                    // Check if this is a category folder
                    const isCategoryFolder = folder.isSystem && folder.id.startsWith('cat-folder-');
                    const categoryId = isCategoryFolder ? folder.id.replace('cat-folder-', '') : '';
                    const isSelected = activeFilter === `folder:${folder.id}`;

                    return (
                      <div key={folder.id} className="flex items-center group relative">
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
                            <div className="w-full">
                              <DroppableFolder
                                folder={folder}
                                activeFilter={activeFilter}
                                onSelectFilter={onSelectFilter}
                                isAnimating={animatedFolderId === folder.id} // Pass animation state
                                showGoals={isCategoryFolder} // Show goals for all category folders, not just selected ones
                                goals={goals}
                                categoryId={categoryId}
                              />
                            </div>
                            {/* Only show dropdown menu for non-system folders */}
                            {!folder.isSystem && (
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-60 hover:opacity-100 absolute right-0 top-1/2 transform -translate-y-1/2"
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
                                    onClick={() => onDeleteFolder(folder.id)}
                                    className="text-red-500"
                                  >
                                    <Trash2 className="h-3 w-3 mr-2" />
                                    Delete
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            )}
                          </>
                        )}
                      </div>
                    );
                  })}
                </nav>
              </div>
            );
          })()}
      </div>
    </div>
  );
}
// Removed duplicated code block from here down to the end of the file
