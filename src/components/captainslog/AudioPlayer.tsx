'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause } from 'lucide-react';

interface AudioPlayerProps {
  audioUrl: string;
  duration: number;
  onTimeUpdate?: (currentTime: number) => void;
  ref?: React.RefObject<{
    seekTo: (time: number) => void;
  }>;
}

export const AudioPlayer = React.forwardRef<{ seekTo: (time: number) => void }, AudioPlayerProps>(({ audioUrl, duration, onTimeUpdate }, ref) => {
  const [isPlaying, setIsPlaying] = useState(false);
  const [progress, setProgress] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioLoaded, setAudioLoaded] = useState(false);
  const [displayDuration, setDisplayDuration] = useState(duration > 0 ? duration : 60); // Default to 60s if duration is 0
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioElementId = useRef(`audio-${Math.random().toString(36).substring(2, 9)}`);

  // Update display duration when prop changes
  useEffect(() => {
    if (duration > 0 && isFinite(duration)) {
      console.log('Setting initial display duration from prop:', duration);
      setDisplayDuration(duration);
    }
  }, [duration]);

  // Log the current display duration whenever it changes
  useEffect(() => {
    console.log('Display duration updated to:', displayDuration);
  }, [displayDuration]);

  // Create and set up audio element
  useEffect(() => {
    // Create audio element in the DOM
    const audioElement = document.createElement('audio');
    audioElement.id = audioElementId.current;
    audioElement.style.display = 'none';
    audioElement.preload = 'metadata'; // Ensure metadata is loaded
    document.body.appendChild(audioElement);
    audioRef.current = audioElement;

    console.log('Audio element created with ID:', audioElementId.current);

    // Set up event listeners
    const handleLoadedMetadata = () => {
      console.log('Audio metadata loaded');
      setAudioLoaded(true);

      // Update duration from the audio element if available
      if (!isNaN(audioElement.duration) && isFinite(audioElement.duration) && audioElement.duration > 0) {
        const actualDuration = Math.ceil(audioElement.duration);
        console.log('Setting display duration from audio element:', audioElement.duration, 'rounded to:', actualDuration);
        // Force the duration update with a slight delay to ensure it takes effect
        setTimeout(() => {
          setDisplayDuration(actualDuration);
        }, 100);
      }
    };

    // Add a durationchange event listener as a backup
    const handleDurationChange = () => {
      if (!isNaN(audioElement.duration) && isFinite(audioElement.duration) && audioElement.duration > 0) {
        const actualDuration = Math.ceil(audioElement.duration);
        console.log('Duration changed event:', audioElement.duration, 'rounded to:', actualDuration);
        setDisplayDuration(actualDuration);
      }
    };

    const handleTimeUpdate = () => {
      if (audioElement) {
        const time = audioElement.currentTime;
        setCurrentTime(time);

        // Calculate progress safely
        const audioDuration = audioElement.duration;
        if (!isNaN(audioDuration) && audioDuration > 0 && isFinite(audioDuration)) {
          // Ensure progress never exceeds 100%
          const calculatedProgress = Math.min(100, (time / audioDuration) * 100);
          setProgress(calculatedProgress);

          // Update display duration if it changed significantly
          if (Math.abs(audioDuration - displayDuration) > 1) {
            const actualDuration = Math.ceil(audioDuration);
            console.log('Updating duration during playback:', audioDuration, 'rounded to:', actualDuration);
            setDisplayDuration(actualDuration);
          }
        } else {
          // Use display duration as fallback
          const calculatedProgress = Math.min(100, (time / (displayDuration || 1)) * 100);
          setProgress(calculatedProgress);
        }

        // Call the onTimeUpdate callback
        if (onTimeUpdate) {
          onTimeUpdate(time);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      setProgress(0);
    };

    const handleError = (e: Event) => {
      console.error('Audio error:', e);
      setAudioLoaded(false);
      setIsPlaying(false);
    };

    // Add event listeners
    audioElement.addEventListener('loadedmetadata', handleLoadedMetadata);
    audioElement.addEventListener('durationchange', handleDurationChange);
    audioElement.addEventListener('timeupdate', handleTimeUpdate);
    audioElement.addEventListener('ended', handleEnded);
    audioElement.addEventListener('error', handleError);

    // Set source if available
    if (audioUrl && audioUrl.length > 0) {
      audioElement.src = audioUrl;
      audioElement.load();
    }

    // Cleanup function
    return () => {
      audioElement.pause();
      audioElement.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audioElement.removeEventListener('durationchange', handleDurationChange);
      audioElement.removeEventListener('timeupdate', handleTimeUpdate);
      audioElement.removeEventListener('ended', handleEnded);
      audioElement.removeEventListener('error', handleError);
      document.body.removeChild(audioElement);
    };
  }, []); // Empty dependency array - only run once on mount

  // Update audio source when audioUrl changes
  useEffect(() => {
    if (audioRef.current && audioUrl) {
      audioRef.current.src = audioUrl;
      audioRef.current.load();
    }
  }, [audioUrl]);

  // Expose seekTo method via ref
  React.useImperativeHandle(ref, () => ({
    seekTo: (time: number) => {
      if (!audioRef.current) {
        console.error('Cannot seek: Audio element not found');
        return;
      }

      try {
        // Ensure time is a valid number
        if (typeof time !== 'number' || isNaN(time) || !isFinite(time)) {
          console.error('Invalid seek time:', time);
          return;
        }

        // Ensure time is within valid range
        const audioDuration = audioRef.current.duration || duration || 0;
        const safeTime = Math.max(0, Math.min(time, audioDuration));

        console.log(`Seeking to ${safeTime}s (original request: ${time}s)`);
        audioRef.current.currentTime = safeTime;
        setCurrentTime(safeTime);

        // Start playing
        if (audioRef.current.paused) {
          audioRef.current.play()
            .then(() => {
              setIsPlaying(true);
            })
            .catch(error => {
              console.error('Error playing after seek:', error);
            });
        }
      } catch (error) {
        console.error('Error seeking:', error);
      }
    }
  }));

  // Toggle play/pause
  const togglePlayback = () => {
    if (!audioRef.current) {
      console.error('Cannot play/pause: Audio element not found');
      return;
    }

    try {
      if (isPlaying) {
        audioRef.current.pause();
        setIsPlaying(false);
      } else {
        audioRef.current.play()
          .then(() => {
            setIsPlaying(true);
          })
          .catch(error => {
            console.error('Error playing audio:', error);
          });
      }
    } catch (error) {
      console.error('Error toggling playback:', error);
    }
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  // Format the display duration
  const getFormattedDuration = (): string => {
    // Always use our tracked displayDuration state
    return formatTime(displayDuration);
  };

  return (
    <div className="flex flex-col space-y-2 w-full">
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
            disabled={!audioLoaded}
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
            {formatTime(currentTime)}/{getFormattedDuration()}
          </span>
        </div>
      )}
    </div>
  );
});

AudioPlayer.displayName = 'AudioPlayer';