'use client';

import React from 'react';
import { Badge } from '@/components/ui/badge';
import { X } from 'lucide-react';

interface FilterTagProps {
  label: string;
  value: string;
  color?: string;
  onRemove: () => void;
}

export function FilterTag({ label, value, color, onRemove }: FilterTagProps) {
  return (
    <Badge
      variant="outline"
      className="flex items-center gap-1 px-2 py-1 text-xs"
      style={color ? { borderColor: color, color: color } : {}}
    >
      <span className="font-medium">{label}:</span>
      <span>{value}</span>
      <button
        type="button"
        onClick={onRemove}
        className="rounded-full hover:bg-black/10 p-0.5 ml-1"
      >
        <X className="h-3 w-3" />
      </button>
    </Badge>
  );
}
