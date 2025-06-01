'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface TranscriptSegmentProps {
  text: string;
  startTime: number;
  endTime: number;
  isActive: boolean;
  onClick: () => void;
  index: number;
}

export const TranscriptSegment: React.FC<TranscriptSegmentProps> = ({
  text,
  startTime,
  endTime,
  isActive,
  onClick,
  index
}) => {
  // Format time as MM:SS or H:MM:SS
  const formatTime = (time: number): string => {
    if (isNaN(time) || !isFinite(time)) return '0:00';
    const hours = Math.floor(time / 3600);
    const minutes = Math.floor((time % 3600) / 60);
    const seconds = Math.floor(time % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${seconds.toString().padStart(2, '0')}`;
    }
  };

  return (
    <span
      className={cn(
        "transition-colors duration-200",
        isActive
          ? "bg-blue-200/60 rounded px-1 py-0.5 shadow-sm"
          : "hover:bg-blue-100/30 hover:rounded hover:px-1 hover:py-0.5"
      )}
      onClick={onClick}
      data-start-time={startTime}
      data-end-time={endTime}
      data-segment-index={index}
      title={`${formatTime(startTime)} - ${formatTime(endTime)}`}
    >
      {text}
    </span>
  );
};
