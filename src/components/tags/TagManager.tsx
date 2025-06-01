'use client';

import React, { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Trash, Plus, X, Check } from 'lucide-react';
import { createTag, updateTag, deleteTag, TagInput } from '@/actions/tags';

interface Tag {
  id: string;
  name: string;
  color: string;
}

interface TagManagerProps {
  tags: Tag[];
  onClose: () => void;
}

export function TagManager({ tags, onClose }: TagManagerProps) {
  const router = useRouter();
  const [newTagName, setNewTagName] = useState('');
  const [newTagColor, setNewTagColor] = useState('#3b82f6'); // Default blue
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [tagToDelete, setTagToDelete] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Create a new tag
  const handleCreateTag = () => {
    if (!newTagName.trim()) {
      console.error('Tag name cannot be empty');
      return;
    }

    startTransition(async () => {
      try {
        const result = await createTag({ name: newTagName, color: newTagColor }, 'user_placeholder');

        if (result.success) {
          console.log('Tag created successfully!');

          // Reset form
          setNewTagName('');
          setNewTagColor('#3b82f6');

          // Refresh the page
          router.refresh();
        } else {
          console.error(`Failed to create tag: ${result.message}`);
        }
      } catch (error) {
        console.error('An error occurred while creating the tag.');
      }
    });
  };

  // Update an existing tag
  const handleUpdateTag = () => {
    if (!editingTag) return;

    if (!editingTag.name.trim()) {
      console.error('Tag name cannot be empty');
      return;
    }

    startTransition(async () => {
      try {
        const result = await updateTag(editingTag as TagInput, 'user_placeholder');

        if (result.success) {
          console.log('Tag updated successfully!');

          // Reset form
          setEditingTag(null);

          // Refresh the page
          router.refresh();
        } else {
          console.error(`Failed to update tag: ${result.message}`);
        }
      } catch (error) {
        console.error('An error occurred while updating the tag.');
      }
    });
  };

  // Delete a tag
  const handleDeleteTag = (id: string) => {
    setTagToDelete(id);

    startTransition(async () => {
      try {
        const result = await deleteTag(id, 'user_placeholder');

        if (result.success) {
          console.log('Tag deleted successfully!');

          // Reset form
          setTagToDelete(null);

          // Refresh the page
          router.refresh();
        } else {
          console.error(`Failed to delete tag: ${result.message}`);
        }
      } catch (error) {
        console.error('An error occurred while deleting the tag.');
      }
    });
  };

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-lg font-semibold mb-4">Manage Tags</h2>

        {/* Create new tag form */}
        <div className="space-y-4 mb-6 p-4 border rounded-md">
          <h3 className="text-md font-medium">Create New Tag</h3>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="col-span-2">
              <Label htmlFor="new-tag-name">Tag Name</Label>
              <Input
                id="new-tag-name"
                value={newTagName}
                onChange={(e) => setNewTagName(e.target.value)}
                placeholder="Enter tag name..."
                disabled={isPending}
              />
            </div>
            <div>
              <Label htmlFor="new-tag-color">Color</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="new-tag-color"
                  type="color"
                  value={newTagColor}
                  onChange={(e) => setNewTagColor(e.target.value)}
                  className="w-12 h-10 p-1"
                  disabled={isPending}
                />
                <div
                  className="w-8 h-8 rounded-full border"
                  style={{ backgroundColor: newTagColor }}
                ></div>
              </div>
            </div>
          </div>
          <Button
            onClick={handleCreateTag}
            disabled={isPending || !newTagName.trim()}
            className="mt-2"
          >
            <Plus className="mr-2 h-4 w-4" /> Create Tag
          </Button>
        </div>

        {/* Existing tags list */}
        <div className="space-y-2">
          <h3 className="text-md font-medium mb-2">Existing Tags</h3>
          {tags.length === 0 ? (
            <p className="text-muted-foreground">No tags created yet.</p>
          ) : (
            <div className="space-y-2">
              {tags.map((tag) => (
                <div
                  key={tag.id}
                  className="flex items-center justify-between p-3 border rounded-md"
                >
                  {editingTag && editingTag.id === tag.id ? (
                    // Edit mode
                    <div className="flex-1 grid grid-cols-1 gap-4 sm:grid-cols-3">
                      <div className="col-span-2">
                        <Input
                          value={editingTag.name}
                          onChange={(e) => setEditingTag({...editingTag, name: e.target.value})}
                          placeholder="Tag name"
                          disabled={isPending}
                        />
                      </div>
                      <div className="flex items-center space-x-2">
                        <Input
                          type="color"
                          value={editingTag.color}
                          onChange={(e) => setEditingTag({...editingTag, color: e.target.value})}
                          className="w-12 h-10 p-1"
                          disabled={isPending}
                        />
                        <div
                          className="w-8 h-8 rounded-full border"
                          style={{ backgroundColor: editingTag.color }}
                        ></div>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={handleUpdateTag}
                          disabled={isPending || !editingTag.name.trim()}
                        >
                          <Check className="h-4 w-4" />
                        </Button>
                        <Button
                          size="icon"
                          variant="ghost"
                          onClick={() => setEditingTag(null)}
                          disabled={isPending}
                        >
                          <X className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : (
                    // View mode
                    <>
                      <div className="flex items-center space-x-2">
                        <div
                          className="w-4 h-4 rounded-full"
                          style={{ backgroundColor: tag.color }}
                        ></div>
                        <span>{tag.name}</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setEditingTag(tag)}
                          disabled={isPending || tagToDelete === tag.id}
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-destructive hover:text-destructive"
                          onClick={() => handleDeleteTag(tag.id)}
                          disabled={isPending || tagToDelete === tag.id}
                        >
                          <Trash className="h-4 w-4" />
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="flex justify-end">
        <Button onClick={onClose}>Close</Button>
      </div>
    </div>
  );
}
