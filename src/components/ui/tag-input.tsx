'use client';

import React, { useState, useEffect, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export function TagInput({
  value = [],
  onChange,
  placeholder = 'Add tags (press Tab or comma to add)',
  disabled = false,
  label = 'Tags'
}: TagInputProps) {
  const [inputValue, setInputValue] = useState('');

  // Add a tag when Tab or comma is pressed
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;

    // Add tag on Tab or comma
    if ((e.key === 'Tab' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    }

    // Remove the last tag on Backspace if input is empty
    if (e.key === 'Backspace' && !inputValue && value.length > 0) {
      removeTag(value.length - 1);
    }
  };

  // Add a tag when the input loses focus
  const handleBlur = () => {
    // Only add tag if there's actual input to prevent unnecessary state updates
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  // Add a tag
  const addTag = (tag: string) => {
    // Split by commas in case user typed multiple tags with commas
    const tagsToAdd = tag
      .split(',')
      .map(t => t.trim())
      .filter(t => t && !value.includes(t));

    if (tagsToAdd.length > 0) {
      // Only update if we actually have tags to add
      onChange([...value, ...tagsToAdd]);
      // Clear input value after adding tags
      setInputValue('');
    }
  };

  // Remove a tag
  const removeTag = (index: number) => {
    const newTags = [...value];
    newTags.splice(index, 1);
    onChange(newTags);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}

      <div className="flex flex-wrap gap-2 mb-2">
        {value.map((tag, index) => (
          <Badge
            key={index}
            variant="secondary"
            className="flex items-center gap-1 px-2 py-1 text-xs"
          >
            {tag}
            {!disabled && (
              <button
                type="button"
                onClick={() => removeTag(index)}
                className="rounded-full hover:bg-black/10 p-0.5"
              >
                <X className="h-3 w-3" />
              </button>
            )}
          </Badge>
        ))}
      </div>

      <Input
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full"
      />
    </div>
  );
}
