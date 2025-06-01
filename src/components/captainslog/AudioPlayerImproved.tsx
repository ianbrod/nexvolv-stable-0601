'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';
import { formatDuration } from '@/lib/utils';

interface AudioPlayerProps {
  audioUrl: string;
  onTimeUpdate: (currentTime: number) => void;
  onDurationChange: (duration: number) => void;
  onReady: () => void;
  seekTo: number | null;
}

export const AudioPlayerImproved: React.FC<AudioPlayerProps> = ({
  audioUrl,
  onTimeUpdate,
  onDurationChange,
  onReady,
  seekTo
}) => {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);

  // Initialize audio element and set up event listeners
  useEffect(() => {
    if (typeof window === 'undefined') return; // Check for SSR

    // Create a new audio element if it doesn't exist
    if (!audioRef.current) {
      audioRef.current = new Audio();
      console.log('Created new Audio element');
    }

    const audio = audioRef.current;

    // Set up event listeners
    const handleCanPlayThrough = () => {
      console.log('Audio can play through');
      setIsLoaded(true);
      onReady();

      // Get accurate duration once fully loaded
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        const accurateDuration = audio.duration;
        setDuration(accurateDuration);
        onDurationChange(accurateDuration);
        console.log('Audio fully loaded, accurate duration:', accurateDuration);
      }
    };

    const handleLoadedMetadata = () => {
      console.log('Audio metadata loaded');
      // Initial duration update (may not be 100% accurate yet)
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        const initialDuration = audio.duration;
        setDuration(initialDuration);
        onDurationChange(initialDuration);
        console.log('Initial duration:', initialDuration);
      }
    };

    const handleDurationChange = () => {
      // Update duration when it changes (more accurate)
      if (!isNaN(audio.duration) && isFinite(audio.duration)) {
        const newDuration = audio.duration;
        setDuration(newDuration);
        onDurationChange(newDuration);
        console.log('Duration changed to:', newDuration);
      }
    };

    // Add event listeners
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('durationchange', handleDurationChange);

    // Set source and load if URL is provided
    if (audioUrl && audioUrl.length > 0) {
      console.log('Setting audio source:', audioUrl.substring(0, 50) + '...');
      audio.src = audioUrl;
      audio.preload = 'auto';
      audio.load();
    }

    // Cleanup function
    return () => {
      audio.pause();
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('durationchange', handleDurationChange);
    };
  }, [audioUrl, onDurationChange, onReady]);

  // Handle time updates with high precision
  useEffect(() => {
    if (typeof window === 'undefined') return; // Check for SSR

    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      try {
        // Use precise time with 3 decimal places
        const preciseTime = parseFloat(audio.currentTime.toFixed(3));
        setCurrentTime(preciseTime);

        // Calculate progress
        if (duration > 0) {
          const calculatedProgress = Math.min(100, (preciseTime / duration) * 100);
          setProgress(calculatedProgress);
        }

        // Notify parent component
        onTimeUpdate(preciseTime);
      } catch (error) {
        console.error('Error in time update handler:', error);
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setIsLoaded(false);
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('error', handleError);
    };
  }, [onTimeUpdate, duration]);

  // Handle seeking when a text segment is clicked
  useEffect(() => {
    if (typeof window === 'undefined') return; // Check for SSR

    const audio = audioRef.current;
    if (!audio || seekTo === null) return;

    console.log('Seeking to precise time:', seekTo);

    try {
      // Ensure precise seeking with validation
      if (isNaN(seekTo) || !isFinite(seekTo) || seekTo < 0) {
        console.error('Invalid seek time:', seekTo);
        return;
      }

      // Ensure time is within valid range
      const safeTime = Math.max(0, Math.min(seekTo, duration || 0));
      console.log(`Setting currentTime to ${safeTime}s`);

      // Set the current time
      audio.currentTime = safeTime;

      // Play after seeking
      const playPromise = audio.play();
      if (playPromise !== undefined) {
        playPromise
          .then(() => {
            console.log('Audio playback started successfully');
            setIsPlaying(true);
          })
          .catch(err => {
            console.error("Playback failed:", err);
            // Try again with user interaction
            console.log('Attempting to play on next user interaction');
          });
      }
    } catch (error) {
      console.error('Error during seek operation:', error);
    }
  }, [seekTo, duration]);

  // Toggle play/pause
  const togglePlayback = () => {
    const audio = audioRef.current;
    if (!audio) {
      console.error('Cannot toggle playback: Audio element not found');
      return;
    }

    try {
      if (isPlaying) {
        console.log('Pausing audio');
        audio.pause();
        setIsPlaying(false);
      } else {
        console.log('Starting audio playback');
        const playPromise = audio.play();
        if (playPromise !== undefined) {
          playPromise
            .then(() => {
              console.log('Audio playback started successfully');
              setIsPlaying(true);
            })
            .catch(err => {
              console.error("Playback failed:", err);
              // Provide user feedback
              alert('Audio playback failed. This may be due to browser autoplay restrictions. Please try clicking the play button again.');
            });
        }
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  return (
    <div className="flex flex-col space-y-2 w-full">
      {/* Audio element is created programmatically */}

      {!audioUrl ? (
        <div className="flex items-center justify-center w-full p-2 text-sm text-muted-foreground">
          Audio not available
        </div>
      ) : (
        <div className="flex items-center justify-between w-full">
          <Button
            variant="outline"
            size="icon"
            className="h-10 w-10"
            onClick={togglePlayback}
            disabled={!isLoaded}
          >
            {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
          </Button>
          <div className="w-full mx-4 h-2 bg-muted-foreground/20 rounded-full">
            <div
              className="h-full bg-primary rounded-full transition-all duration-300"
              style={{ width: `${progress}%` }}
            ></div>
          </div>
          <span className="text-sm text-muted-foreground">
            {formatTime(currentTime)}/{formatTime(duration)}
          </span>
        </div>
      )}
    </div>
  );
};
