'use client';

import React from 'react';
import Link from 'next/link';
import { Button } from '@/components/ui/button';

interface SimpleGoalCardProps {
  id: string;
  name: string;
  description?: string | null;
  categoryColor?: string;
}

export function SimpleGoalCard({ id, name, description, categoryColor = '#808080' }: SimpleGoalCardProps) {
  return (
    <Link href={`/goals/${id}`} className="block w-full">
      <div
        className="border rounded-lg p-4 mb-4 goal-card-hover-effect goal-card-mobile-padding goal-card-print"
        style={{ borderLeft: `4px solid ${categoryColor}` }}
      >
        <h3 className="text-lg font-semibold leading-tight">{name}</h3>
        {description && (
          <p className="text-sm text-muted-foreground mt-2">{description}</p>
        )}
        <div className="mt-3">
          <Button size="sm" variant="outline" className="font-medium">
            View Details
          </Button>
        </div>
      </div>
    </Link>
  );
}
