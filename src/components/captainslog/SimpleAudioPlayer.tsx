'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Play, Pause, Gauge, Volume2 } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Slider } from '@/components/ui/slider';
import { ProgressBar } from './ProgressBar';
import { ExportMenu } from './ExportMenu';
import { LogEntry } from '@/types';

/**
 * SimpleAudioPlayer Props
 *
 * @property audioUrl - URL or data URL of the audio to play
 * @property onTimeUpdate - Optional callback that fires when the playback time updates
 * @property seekTo - Optional time in seconds to seek to
 * @property initialDuration - Optional initial duration in seconds (from LogEntry)
 * @property entry - Optional LogEntry for export functionality
 */
interface SimpleAudioPlayerProps {
  audioUrl: string;
  onTimeUpdate?: (time: number) => void;
  seekTo?: number | null;
  initialDuration?: number;
  entry?: LogEntry;
}

/**
 * A simple audio player component with progress bar and time display
 *
 * Features:
 * - Play/pause controls
 * - Progress bar with seek functionality
 * - Time display (current/total)
 * - Bidirectional synchronization with transcript segments
 * - Accurate duration handling
 */
export function SimpleAudioPlayer({ audioUrl, onTimeUpdate, seekTo, initialDuration, entry }: SimpleAudioPlayerProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(initialDuration || 0);
  const [playbackSpeed, setPlaybackSpeed] = useState(1);
  const [volume, setVolume] = useState(1);

  // Log the initial duration for debugging
  useEffect(() => {
    console.log('SimpleAudioPlayer initialDuration:', initialDuration);
  }, [initialDuration]);

  // Create a direct reference to the audio element
  const audioRef = useRef<HTMLAudioElement>(null);

  // Toggle play/pause
  const togglePlayback = () => {
    if (!audioRef.current || !audioUrl || audioUrl.trim() === '') return;

    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(err => {
          console.error("Playback failed:", err);
          alert("Playback failed. Please try again.");
        });
    }
  };

  // Update time display
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const handleTimeUpdate = () => {
      const currentTime = audio.currentTime;
      setCurrentTime(currentTime);

      // Call the onTimeUpdate callback if provided
      if (onTimeUpdate) {
        onTimeUpdate(currentTime);
      }

      // If we're at the end of the audio, update the duration to match the current time
      // This helps fix cases where the metadata duration is incorrect
      if (Math.abs(currentTime - audio.duration) < 0.5 && currentTime > 0) {
        // Update duration to match current time at the end of playback
        setDuration(currentTime);
      }
    };

    // Interval logic removed for simplification - relying on native timeupdate

    // Start/stop frequent updates based on play/pause
    const handlePlay = () => {
      // startFrequentUpdates(); // Removed
      // When playback starts, check if we need to update the duration from initialDuration
      if (initialDuration && (!duration || Math.abs(duration - initialDuration) > 1)) {
        setDuration(initialDuration);
      }
    };
    const handlePause = () => { /* stopFrequentUpdates(); */ }; // Removed

    const handleDurationChange = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        // Only update if the new duration is significantly different and not the default 1 minute value
        const newDuration = audio.duration;
        const shouldUpdate = (
          !duration ||
          Math.abs(newDuration - duration) > 1 &&
          Math.abs(newDuration - 60) > 1 // Avoid the default 1-minute value
        );

        if (shouldUpdate) {
          setDuration(newDuration);
        }
      }
    };

    const handleLoadedMetadata = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        // Only update if the new duration is significantly different and not the default 1 minute value
        const newDuration = audio.duration;
        const shouldUpdate = (
          !duration ||
          Math.abs(newDuration - duration) > 1 &&
          Math.abs(newDuration - 60) > 1 // Avoid the default 1-minute value
        );

        if (shouldUpdate) {
          setDuration(newDuration);
        }
      }
    };

    const handleCanPlayThrough = () => {
      if (!isNaN(audio.duration) && isFinite(audio.duration) && audio.duration > 0) {
        // Only update if the new duration is significantly different and not the default 1 minute value
        const newDuration = audio.duration;
        const shouldUpdate = (
          !duration ||
          Math.abs(newDuration - duration) > 1 &&
          Math.abs(newDuration - 60) > 1 // Avoid the default 1-minute value
        );

        if (shouldUpdate) {
          setDuration(newDuration);
        }
      }
    };

    const handleEnded = () => {
      setIsPlaying(false);
      // When playback ends, update the duration to match the current time
      // This ensures the duration is accurate
      if (currentTime > 0 && (!duration || Math.abs(duration - currentTime) > 1)) {
        // Update duration when playback ends
        setDuration(currentTime);
      }
      setCurrentTime(0);
      if (onTimeUpdate) {
        onTimeUpdate(0);
      }
    };

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('durationchange', handleDurationChange);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('canplaythrough', handleCanPlayThrough);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);

    // Start frequent updates if already playing
    // if (!audio.paused) { // Removed
    //   startFrequentUpdates(); // Removed
    // } // Removed

    // Always prioritize initialDuration if it's provided and valid
    // This ensures we use the duration from the LogEntry which should be accurate
    if (initialDuration && initialDuration > 0) {
      // Only log if we're changing the duration
      if (!duration || Math.abs(duration - initialDuration) > 0.5) {
        setDuration(initialDuration);
      }
    }

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('durationchange', handleDurationChange);
      audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
      audio.removeEventListener('canplaythrough', handleCanPlayThrough);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('play', handlePlay);
      audio.removeEventListener('pause', handlePause);

      // Clean up interval on unmount
      // stopFrequentUpdates(); // Removed
    };
  }, [onTimeUpdate, initialDuration]);

  // Handle seeking when seekTo changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio || seekTo === null || seekTo === undefined || !audioUrl || audioUrl.trim() === '') return;

    try {
      // Validate seek time
      if (isNaN(seekTo) || !isFinite(seekTo) || seekTo < 0) {
        console.error('Invalid seek time:', seekTo);
        return;
      }

      // Set current time
      audio.currentTime = seekTo;

      // Start playback
      audio.play()
        .then(() => {
          setIsPlaying(true);
        })
        .catch(err => {
          console.error('Error playing after seek:', err);
        });
    } catch (error) {
      console.error('Error seeking:', error);
    }
  }, [seekTo, audioUrl]);

  // Handle playback speed changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.playbackRate = playbackSpeed;
  }, [playbackSpeed]);

  // Handle volume changes
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    audio.volume = volume;
  }, [volume]);

  // Format time display
  const formatTime = (seconds: number) => {
    if (isNaN(seconds) || !isFinite(seconds)) return '0:00';
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs.toString().padStart(2, '0')}`;
  };

  return (
    <div className="flex flex-col gap-y-1 w-full">
      {/* Hidden audio element for programmatic control */}
      <audio
        ref={audioRef}
        src={audioUrl && audioUrl.trim() !== '' ? audioUrl : null}
        preload="auto"
        className="hidden"
      />

      {/* Custom controls */}
      <div className="flex items-center justify-between w-full">
        <Button
          variant="outline"
          size="icon"
          className="h-10 w-10"
          onClick={togglePlayback}
          disabled={!audioUrl || audioUrl.trim() === ''}
        >
          {isPlaying ? <Pause className="h-5 w-5" /> : <Play className="h-5 w-5" />}
        </Button>
        <div className="w-full mx-4">
          {/* Flex spacer approach for progress bar positioning */}
          <div className="flex flex-col">
            {/* Spacer 1: Takes up slightly less space (45%) */}
            <div className="flex-1 flex-basis-[45%]"></div>

            <ProgressBar
              currentTime={currentTime}
              duration={duration}
              onSeek={(time) => {
                if (audioRef.current && audioUrl && audioUrl.trim() !== '') {
                  audioRef.current.currentTime = time;
                  if (!isPlaying) {
                    audioRef.current.play()
                      .then(() => setIsPlaying(true))
                      .catch(err => console.error('Error playing after seek:', err));
                  }
                }
              }}
            />

            {/* Spacer 2: Takes up slightly more space (55%) */}
            <div className="flex-1 flex-basis-[55%]"></div>
          </div>
        </div>
        <span className="text-sm text-muted-foreground mr-2">
          {formatTime(currentTime)}/{formatTime(duration)}
        </span>

        {/* Volume control */}
        <div className="flex items-center mr-2 relative">
          <div className="flex items-center gap-2 w-32">
            <Volume2 className="h-4 w-4 flex-shrink-0" />
            <Slider
              value={[volume * 100]}
              min={0}
              max={100}
              step={1}
              onValueChange={(value) => setVolume(value[0] / 100)}
              className="w-full"
            />
          </div>
        </div>

        {/* Playback speed control */}
        <div className="flex items-center mr-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                <Gauge className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setPlaybackSpeed(0.5)} className={playbackSpeed === 0.5 ? "bg-muted" : ""}>
                0.5x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlaybackSpeed(0.75)} className={playbackSpeed === 0.75 ? "bg-muted" : ""}>
                0.75x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlaybackSpeed(1)} className={playbackSpeed === 1 ? "bg-muted" : ""}>
                Normal (1x)
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlaybackSpeed(1.25)} className={playbackSpeed === 1.25 ? "bg-muted" : ""}>
                1.25x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlaybackSpeed(1.5)} className={playbackSpeed === 1.5 ? "bg-muted" : ""}>
                1.5x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlaybackSpeed(1.75)} className={playbackSpeed === 1.75 ? "bg-muted" : ""}>
                1.75x
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setPlaybackSpeed(2)} className={playbackSpeed === 2 ? "bg-muted" : ""}>
                2x
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Spacer to push export button to far right */}
        <div className="flex-1"></div>

        {/* Export button - positioned at far right */}
        {entry && (
          <div className="flex items-center">
            <ExportMenu entry={entry} />
          </div>
        )}
      </div>
    </div>
  );
}
