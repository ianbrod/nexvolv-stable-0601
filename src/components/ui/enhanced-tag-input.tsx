'use client';

import React, { useState, useEffect, KeyboardEvent } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { X } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

interface EnhancedTagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export function EnhancedTagInput({
  value = '',
  onChange,
  placeholder = 'Add tags (press Tab or comma to add)',
  disabled = false,
  label = 'Tags'
}: EnhancedTagInputProps) {
  const [inputValue, setInputValue] = useState('');
  const [tags, setTags] = useState<string[]>([]);

  // Initialize tags from the value prop
  useEffect(() => {
    if (value) {
      const initialTags = value.split(',').map(tag => tag.trim()).filter(Boolean);
      setTags(initialTags);
    } else {
      setTags([]);
    }
  }, [value]);

  // Update the parent component when tags change
  const updateTags = (newTags: string[]) => {
    setTags(newTags);
    onChange(newTags.join(', '));
  };

  // Add a tag when Tab or comma is pressed
  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (disabled) return;
    
    // Add tag on Tab or comma
    if ((e.key === 'Tab' || e.key === ',') && inputValue.trim()) {
      e.preventDefault();
      addTag(inputValue);
    }
  };

  // Add a tag when the input loses focus
  const handleBlur = () => {
    if (inputValue.trim()) {
      addTag(inputValue);
    }
  };

  // Add a tag
  const addTag = (tag: string) => {
    const trimmedTag = tag.trim();
    if (trimmedTag && !tags.includes(trimmedTag)) {
      const newTags = [...tags, trimmedTag];
      updateTags(newTags);
      setInputValue('');
    }
  };

  // Remove a tag
  const removeTag = (index: number) => {
    const newTags = [...tags];
    newTags.splice(index, 1);
    updateTags(newTags);
  };

  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      
      <div className="flex flex-wrap items-center gap-2 p-2 border rounded-md">
        {tags.map((tag, index) => (
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
        
        <Input
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          placeholder={tags.length === 0 ? placeholder : ''}
          disabled={disabled}
          className="flex-1 border-0 p-0 focus-visible:ring-0 focus-visible:ring-offset-0"
        />
      </div>
    </div>
  );
}
