'use client';

import React from 'react';
import { Button } from '@/components/ui/button';
import { Star, Trash2, X, FolderIcon, MoveVertical } from 'lucide-react';
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
  color?: string;
  isSystem?: boolean;
}

interface Goal {
  id: string;
  name: string;
  categoryId?: string | null;
  parentGoalId?: string | null;
  order?: number;
}

interface CaptainsLogBulkActionBarProps {
  selectedCount: number;
  onClearSelection: () => void;
  onToggleFavorite: () => void;
  onDelete: () => void;
  onAssignToFolder: (folderId: string) => void;
  folders: Folder[];
  isPending?: boolean;
  goals?: Goal[]; // Add goals prop
}

export function CaptainsLogBulkActionBar(props: CaptainsLogBulkActionBarProps) {
  const {
    selectedCount,
    onClearSelection,
    onToggleFavorite,
    onDelete,
    onAssignToFolder,
    folders,
    isPending = false,
    goals = []
  } = props;



  if (selectedCount === 0) return null;

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 bg-background border rounded-lg shadow-lg p-2 z-50 flex items-center gap-2">
      <span className="text-sm font-medium px-2">
        {selectedCount} {selectedCount === 1 ? 'recording' : 'recordings'} selected
      </span>

      <div className="flex items-center gap-1">
        <Button
          variant="outline"
          size="sm"
          onClick={onToggleFavorite}
          disabled={isPending}
          className="text-amber-600"
          title="Toggle favorite status for selected recordings"
        >
          <Star className="h-4 w-4 mr-1" />
          Favorite
        </Button>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              disabled={isPending}
              className="text-blue-600"
              title="Move selected recordings to a folder"
            >
              <MoveVertical className="h-4 w-4 mr-1" />
              Move to Folder
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem
              onClick={() => onAssignToFolder('')}
            >
              <span className="text-muted-foreground">Uncategorized</span>
            </DropdownMenuItem>
            <DropdownMenuSeparator />

            {/* User folders */}
            {folders
              .filter(folder => !folder.isSystem)
              .map((folder) => (
                <DropdownMenuItem
                  key={folder.id}
                  onClick={() => onAssignToFolder(folder.id)}
                >
                  <FolderIcon className="h-4 w-4 mr-2" />
                  {folder.name}
                </DropdownMenuItem>
              ))}

            {/* Add separator if we have both user and system folders */}
            {folders.filter(folder => !folder.isSystem).length > 0 &&
             folders.filter(folder => folder.isSystem && folder.id.startsWith('cat-folder-')).length > 0 &&
             <DropdownMenuSeparator />}

            {/* System folders (categories) with nested goals */}
            {folders
              .filter(folder => folder.isSystem && folder.id.startsWith('cat-folder-'))
              .map((categoryFolder) => {
                // Extract category ID from folder ID
                const categoryId = categoryFolder.id.replace('cat-folder-', '');

                // Find goals that belong to this category
                const categoryGoals = props.goals?.filter(goal => goal.categoryId === categoryId) || [];

                // If this category has goals, render a submenu
                if (categoryGoals.length > 0) {
                  return (
                    <DropdownMenuSub key={categoryFolder.id}>
                      <DropdownMenuSubTrigger>
                        <div
                          className="h-3 w-3 rounded-full mr-2"
                          style={{ backgroundColor: categoryFolder.color || '#808080' }}
                        />
                        {categoryFolder.name}
                      </DropdownMenuSubTrigger>
                      <DropdownMenuPortal>
                        <DropdownMenuSubContent>
                          {/* Category itself as an option */}
                          <DropdownMenuItem
                            onClick={() => onAssignToFolder(categoryFolder.id)}
                          >
                            <div
                              className="h-3 w-3 rounded-full mr-2"
                              style={{ backgroundColor: categoryFolder.color || '#808080' }}
                            />
                            <span className="font-medium">{categoryFolder.name} (Category)</span>
                          </DropdownMenuItem>

                          <DropdownMenuSeparator />

                          {/* Goals in this category */}
                          {categoryGoals
                            .filter(goal => !goal.parentGoalId) // Only show top-level goals
                            .map(goal => {
                              // Find subgoals for this goal
                              const subgoals = categoryGoals.filter(subgoal => subgoal.parentGoalId === goal.id);

                              if (subgoals.length > 0) {
                                // Goal with subgoals - create a nested submenu
                                return (
                                  <DropdownMenuSub key={`goal:${goal.id}`}>
                                    <DropdownMenuSubTrigger>
                                      <div
                                        className="w-2 h-2 rounded-full mr-2"
                                        style={{ backgroundColor: categoryFolder.color || '#808080' }}
                                      ></div>
                                      {goal.name}
                                    </DropdownMenuSubTrigger>
                                    <DropdownMenuPortal>
                                      <DropdownMenuSubContent>
                                        {/* Goal itself as an option */}
                                        <DropdownMenuItem
                                          onClick={() => onAssignToFolder(`goal:${goal.id}`)}
                                        >
                                          <div
                                            className="w-2 h-2 rounded-full mr-2"
                                            style={{ backgroundColor: categoryFolder.color || '#808080' }}
                                          ></div>
                                          <span className="font-medium">{goal.name} (Goal)</span>
                                        </DropdownMenuItem>

                                        <DropdownMenuSeparator />

                                        {/* Subgoals */}
                                        {subgoals.map(subgoal => (
                                          <DropdownMenuItem
                                            key={`subgoal:${subgoal.id}`}
                                            onClick={() => onAssignToFolder(`subgoal:${subgoal.id}`)}
                                          >
                                            <div
                                              className="w-1.5 h-1.5 rounded-full mr-2 ml-1"
                                              style={{ backgroundColor: categoryFolder.color || '#808080' }}
                                            ></div>
                                            {subgoal.name}
                                          </DropdownMenuItem>
                                        ))}
                                      </DropdownMenuSubContent>
                                    </DropdownMenuPortal>
                                  </DropdownMenuSub>
                                );
                              } else {
                                // Goal without subgoals - regular item
                                return (
                                  <DropdownMenuItem
                                    key={`goal:${goal.id}`}
                                    onClick={() => onAssignToFolder(`goal:${goal.id}`)}
                                  >
                                    <div
                                      className="w-2 h-2 rounded-full mr-2"
                                      style={{ backgroundColor: categoryFolder.color || '#808080' }}
                                    ></div>
                                    {goal.name}
                                  </DropdownMenuItem>
                                );
                              }
                            })}
                        </DropdownMenuSubContent>
                      </DropdownMenuPortal>
                    </DropdownMenuSub>
                  );
                } else {
                  // If no goals, just render the category as a regular item
                  return (
                    <DropdownMenuItem
                      key={categoryFolder.id}
                      onClick={() => onAssignToFolder(categoryFolder.id)}
                    >
                      <div
                        className="h-3 w-3 rounded-full mr-2"
                        style={{ backgroundColor: categoryFolder.color || '#808080' }}
                      />
                      {categoryFolder.name}
                    </DropdownMenuItem>
                  );
                }
              })}
          </DropdownMenuContent>
        </DropdownMenu>



        <Button
          variant="outline"
          size="sm"
          onClick={onDelete}
          disabled={isPending}
          className="text-destructive"
          title="Delete selected recordings"
        >
          <Trash2 className="h-4 w-4 mr-1" />
          Delete
        </Button>

        <Button
          variant="ghost"
          size="sm"
          onClick={onClearSelection}
          disabled={isPending}
          title="Clear selection"
        >
          <X className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
