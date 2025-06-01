'use client';

import React from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface SimpleTagInputProps {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  label?: string;
}

export function SimpleTagInput({
  value = '',
  onChange,
  placeholder = 'Add tags (comma separated)',
  disabled = false,
  label = 'Tags'
}: SimpleTagInputProps) {
  return (
    <div className="space-y-2">
      {label && <Label>{label}</Label>}
      <Input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full"
      />
      {value && (
        <p className="text-xs text-muted-foreground mt-1">
          Current tags: {value.split(',').map(t => t.trim()).filter(Boolean).join(', ')}
        </p>
      )}
    </div>
  );
}
