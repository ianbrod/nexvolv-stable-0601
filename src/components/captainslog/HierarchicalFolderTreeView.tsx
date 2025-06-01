'use client';

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { ChevronRight, ChevronDown, FolderIcon, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { VirtualFolder } from '@/types/virtual-folder';
import { virtualFolderTreeBuilder } from '@/lib/services/virtual-folder-tree-builder';

interface HierarchicalFolderTreeViewProps {
  onSelectFolder?: (folder: VirtualFolder) => void;
  className?: string;
}

export function HierarchicalFolderTreeView({ onSelectFolder, className }: HierarchicalFolderTreeViewProps) {
  const [treeData, setTreeData] = useState<VirtualFolder[]>([]);
  const [expandedNodes, setExpandedNodes] = useState<Set<string>>(new Set());
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch Prisma data and generate folder tree
  useEffect(() => {
    async function fetchData() {
      try {
        setIsLoading(true);
        setError(null);

        console.log('Building hierarchical folder tree from Prisma data...');

        // Build virtual folder tree from Prisma entities
        const folderTree = await virtualFolderTreeBuilder.buildFolderTree();

        console.log(`Generated hierarchical folder tree with ${folderTree.length} top-level folders`);

        // Log the folder tree structure for debugging
        folderTree.forEach(folder => {
          console.log(`Folder: ${folder.name} (${folder.id}), Type: ${folder.type}, Level: ${folder.level}, Children: ${folder.children.length}`);
          folder.children.forEach(child => {
            console.log(`  Child: ${child.name} (${child.id}), Type: ${child.type}, Level: ${child.level}, Children: ${child.children.length}`);
            child.children.forEach(grandChild => {
              console.log(`    Grandchild: ${grandChild.name} (${grandChild.id}), Type: ${grandChild.type}, Level: ${grandChild.level}`);
            });
          });
        });

        setTreeData(folderTree);

        // Auto-expand categories by default for better UX
        const expandedFolderIds = new Set<string>();
        folderTree.forEach(folder => {
          if (folder.type === 'category') {
            expandedFolderIds.add(folder.id);
          }
        });
        console.log(`Auto-expanded ${expandedFolderIds.size} category folders`);
        setExpandedNodes(expandedFolderIds);
      } catch (error) {
        console.error('Error building hierarchical folder tree:', error);
        setError('Failed to load folder structure. Please try again.');
      } finally {
        setIsLoading(false);
      }
    }

    fetchData();
  }, []);

  // Handle node expansion toggle
  const toggleNodeExpansion = (folderId: string, e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering node selection

    // Check if the node is already expanded
    const isExpanded = expandedNodes.has(folderId);

    if (isExpanded) {
      // Collapse the node
      setExpandedNodes(prev => {
        const newSet = new Set(prev);
        newSet.delete(folderId);
        return newSet;
      });
    } else {
      // Expand the node
      setExpandedNodes(prev => {
        const newSet = new Set(prev);
        newSet.add(folderId);
        return newSet;
      });
    }
  };

  // Handle folder selection
  const handleFolderSelect = (folder: VirtualFolder) => {
    setSelectedFolderId(folder.id);
    if (onSelectFolder) {
      onSelectFolder(folder);
    }
  };

  // Render a folder node with consistent indentation based on level property
  const renderFolderNode = (folder: VirtualFolder) => {
    const isExpanded = expandedNodes.has(folder.id);
    const hasChildren = folder.children && folder.children.length > 0;
    const isSelected = selectedFolderId === folder.id;

    // Calculate indentation based on the folder's level property
    const indentationLevel = folder.level || 0;
    const indentationPx = indentationLevel * 16; // 16px per level for consistent hierarchy

    // Log folder rendering for debugging
    console.log(`Rendering folder: ${folder.name} (${folder.id}), Type: ${folder.type}, Level: ${folder.level}, Expanded: ${isExpanded}, Children: ${folder.children.length}`);

    return (
      <div key={folder.id} className="flex flex-col">
        <Button
          variant="ghost"
          className={cn(
            "w-full justify-start text-left h-auto py-2.5 px-3 group relative",
            "hover:bg-accent/50 transition-all duration-200 ease-in-out",
            "focus-visible:ring-2 focus-visible:ring-primary/20 focus-visible:bg-accent/30",
            isSelected && "bg-accent/70 shadow-sm border-l-2 border-primary",
            // Enhanced type-based styling
            folder.type === 'category' && "font-semibold text-base text-foreground",
            folder.type === 'goal' && "font-medium text-sm text-foreground/90",
            folder.type === 'subgoal' && "font-normal text-sm text-muted-foreground"
          )}
          onClick={() => handleFolderSelect(folder)}
        >
          <div
            className="flex items-center w-full min-h-[28px]"
            style={{ paddingLeft: `${indentationPx}px` }}
          >
            {/* Expand/collapse button for nodes with children */}
            {hasChildren && (
              <div
                onClick={(e) => toggleNodeExpansion(folder.id, e)}
                className={cn(
                  "mr-2 p-1.5 rounded-md cursor-pointer transition-all duration-150",
                  "hover:bg-accent/60 hover:scale-105 active:scale-95",
                  "flex items-center justify-center"
                )}
              >
                {isExpanded ?
                  <ChevronDown className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" /> :
                  <ChevronRight className="h-3.5 w-3.5 text-muted-foreground group-hover:text-foreground transition-colors" />
                }
              </div>
            )}

            {/* Enhanced folder icon with type-specific styling and animations */}
            <div className="relative mr-3 flex items-center">
              <FolderIcon
                className={cn(
                  "h-4 w-4 transition-all duration-200",
                  "group-hover:scale-110",
                  folder.type === 'category' && "text-primary drop-shadow-sm",
                  folder.type === 'goal' && "text-blue-500 drop-shadow-sm",
                  folder.type === 'subgoal' && "text-amber-500 drop-shadow-sm",
                  isSelected && "scale-110"
                )}
              />
              {/* Subtle glow effect for selected items */}
              {isSelected && (
                <div className={cn(
                  "absolute inset-0 rounded-full blur-sm opacity-30",
                  folder.type === 'category' && "bg-primary",
                  folder.type === 'goal' && "bg-blue-500",
                  folder.type === 'subgoal' && "bg-amber-500"
                )} />
              )}
            </div>

            <span className={cn(
              "truncate flex-1 transition-colors duration-200",
              "group-hover:text-foreground",
              isSelected && "font-medium"
            )}>
              {folder.name}
            </span>

            {/* Entry count badge for categories only */}
            {folder.type === 'category' && (
              <div className={cn(
                "ml-2 px-2 py-0.5 rounded-full text-xs font-medium",
                "bg-muted/50 text-muted-foreground",
                "group-hover:bg-accent/60 transition-colors duration-200",
                "opacity-0 group-hover:opacity-100"
              )}>
                {folder.children?.length || 0}
              </div>
            )}
          </div>
        </Button>

        {/* Render children if expanded with enhanced visual hierarchy */}
        {isExpanded && hasChildren && (
          <div className="relative">
            {/* Subtle connecting line for visual hierarchy */}
            <div
              className="absolute left-0 top-0 bottom-0 w-px bg-border/40"
              style={{ left: `${indentationPx + 12}px` }}
            />
            <div className="space-y-0.5">
              {folder.children.map(childFolder => renderFolderNode(childFolder))}
            </div>
          </div>
        )}
      </div>
    );
  };

  if (isLoading) {
    return (
      <div className="p-6 flex flex-col items-center justify-center space-y-3">
        <div className="relative">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
          <div className="absolute inset-0 rounded-full bg-primary/20 animate-pulse" />
        </div>
        <div className="text-center">
          <div className="font-medium text-foreground">Loading folder structure</div>
          <div className="text-sm text-muted-foreground mt-1">Organizing your content...</div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-6 text-center space-y-4">
        <div className="mx-auto w-12 h-12 rounded-full bg-destructive/10 flex items-center justify-center">
          <div className="w-6 h-6 rounded-full bg-destructive/20" />
        </div>
        <div>
          <div className="font-medium text-foreground">Unable to load folders</div>
          <div className="text-sm text-muted-foreground mt-1">{error}</div>
        </div>
        <Button
          variant="outline"
          size="sm"
          className="mt-3 hover:bg-accent/50 transition-colors"
          onClick={() => window.location.reload()}
        >
          Try Again
        </Button>
      </div>
    );
  }

  return (
    <div className={cn("w-full h-full overflow-y-auto scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent", className)}>
      <div className="p-2 space-y-0.5">
        {treeData.length === 0 ? (
          <div className="p-8 text-center space-y-4">
            <div className="mx-auto w-16 h-16 rounded-full bg-muted/30 flex items-center justify-center">
              <FolderIcon className="w-8 h-8 text-muted-foreground/50" />
            </div>
            <div>
              <div className="font-medium text-foreground">No folders found</div>
              <div className="text-sm text-muted-foreground mt-1">
                Create categories and goals to organize your Captain's Log entries
              </div>
            </div>
          </div>
        ) : (
          treeData.map(folder => renderFolderNode(folder))
        )}
      </div>
    </div>
  );
}
