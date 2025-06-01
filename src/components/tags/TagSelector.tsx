'use client';

import React, { useState } from 'react';
import { X, Plus, Tag as TagIcon } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog';
import { TagManager } from './TagManager';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagSelectorProps {
  availableTags: Tag[];
  selectedTags: Tag[];
  onTagSelect: (tag: Tag) => void;
  onTagRemove: (tagId: string) => void;
  disabled?: boolean;
}

export function TagSelector({
  availableTags,
  selectedTags,
  onTagSelect,
  onTagRemove,
  disabled = false
}: TagSelectorProps) {
  const [isTagManagerOpen, setIsTagManagerOpen] = useState(false);
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  
  // Filter out already selected tags
  const unselectedTags = availableTags.filter(
    tag => !selectedTags.some(selectedTag => selectedTag.id === tag.id)
  );

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-sm font-medium">Tags</label>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={() => setIsTagManagerOpen(true)}
          disabled={disabled}
          className="h-8 px-2 text-xs"
        >
          <Plus className="h-3.5 w-3.5 mr-1" />
          Manage Tags
        </Button>
      </div>
      
      {/* Selected tags */}
      <div className="flex flex-wrap gap-2 mb-2">
        {selectedTags.map(tag => (
          <div
            key={tag.id}
            className="flex items-center gap-1 px-2 py-1 text-xs rounded-full"
            style={{ 
              backgroundColor: `${tag.color}20`, // 20% opacity
              borderColor: tag.color,
              color: tag.color,
              borderWidth: '1px'
            }}
          >
            <span>{tag.name}</span>
            {!disabled && (
              <button
                type="button"
                onClick={() => onTagRemove(tag.id)}
                className="rounded-full hover:bg-black/10 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </div>
        ))}
        
        {selectedTags.length === 0 && (
          <div className="text-sm text-muted-foreground">No tags selected</div>
        )}
      </div>
      
      {/* Tag dropdown */}
      {!disabled && unselectedTags.length > 0 && (
        <div className="relative">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => setIsDropdownOpen(!isDropdownOpen)}
            className="w-full justify-start"
          >
            <TagIcon className="h-4 w-4 mr-2" />
            Add Tag
          </Button>
          
          {isDropdownOpen && (
            <div className="absolute z-10 mt-1 w-full bg-background border rounded-md shadow-lg">
              <div className="p-1 max-h-60 overflow-auto">
                {unselectedTags.map(tag => (
                  <button
                    key={tag.id}
                    type="button"
                    onClick={() => {
                      onTagSelect(tag);
                      setIsDropdownOpen(false);
                    }}
                    className="flex items-center w-full px-3 py-2 text-sm hover:bg-muted rounded-sm"
                  >
                    <div 
                      className="w-3 h-3 rounded-full mr-2"
                      style={{ backgroundColor: tag.color }}
                    ></div>
                    {tag.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
      
      {/* Tag Manager Dialog */}
      <Dialog open={isTagManagerOpen} onOpenChange={setIsTagManagerOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogTitle>Manage Tags</DialogTitle>
          <TagManager 
            tags={availableTags} 
            onClose={() => setIsTagManagerOpen(false)} 
          />
        </DialogContent>
      </Dialog>
    </div>
  );
}
