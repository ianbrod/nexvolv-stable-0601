'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { logAudioPlayer } from '@/lib/debug';

interface ProgressBarProps {
  currentTime: number;
  duration: number;
  onSeek?: (time: number) => void;
  className?: string;
  ariaLabel?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  currentTime,
  duration,
  onSeek,
  className,
  ariaLabel = 'Audio progress'
}) => {
  // Generate a unique ID for ARIA attributes
  const progressId = React.useId();

  // Calculate progress percentage (0-100)
  const calculateProgressPercentage = (): number => {
    // Handle edge cases
    if (!duration || duration <= 0 || isNaN(duration) || isNaN(currentTime) || currentTime < 0) {
      return 0;
    }

    // Ensure currentTime doesn't exceed duration
    const safeCurrentTime = Math.min(currentTime, duration);

    // Calculate percentage and clamp between 0-100
    const percentage = (safeCurrentTime / duration) * 100;
    return Math.max(0, Math.min(100, percentage));
  };

  // Get progress width as a string with % for styling
  const calculateProgressWidth = (): string => {
    return `${calculateProgressPercentage()}%`;
  };

  const handleProgressBarClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!onSeek || !duration) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const clickPositionX = e.clientX - rect.left;
    const percentage = clickPositionX / rect.width;
    const seekTime = percentage * duration;

    // Ensure we don't seek beyond duration
    const clampedSeekTime = Math.max(0, Math.min(duration, seekTime));
    onSeek(clampedSeekTime);
  };

  // Log progress for debugging only in development
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      logAudioPlayer(`ProgressBar: currentTime=${currentTime}, duration=${duration}, width=${calculateProgressWidth()}`);
    }
  }, [currentTime, duration]);

  const progressPercentage = calculateProgressPercentage();

  return (
    <div
      role="progressbar"
      aria-label={ariaLabel}
      aria-valuenow={progressPercentage}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-labelledby={progressId}
      className={cn("relative h-3 bg-muted-foreground/20 rounded-full overflow-hidden cursor-pointer hover:h-4 transition-all", className)}
      onClick={handleProgressBarClick}
    >
      <span id={progressId} className="sr-only">
        {`${Math.round(progressPercentage)}% complete`}
      </span>
      <div
        className="absolute top-0 left-0 h-full bg-primary transition-all duration-300 shadow-sm"
        style={{ width: calculateProgressWidth() }}
      />
    </div>
  );
};
