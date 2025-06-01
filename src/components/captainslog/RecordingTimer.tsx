'use client';

import React from 'react';
import { formatDuration } from '@/lib/utils';

interface RecordingTimerProps {
  duration: number;
}

export function RecordingTimer({ duration }: RecordingTimerProps) {
  return (
    <span className="font-mono">{formatDuration(duration)}</span>
  );
}
