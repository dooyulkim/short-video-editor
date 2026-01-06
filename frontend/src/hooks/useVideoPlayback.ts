import { useState, useEffect, useRef, useCallback } from 'react';
import { useTimeline } from '@/context/TimelineContext';

export interface UseVideoPlaybackReturn {
  isPlaying: boolean;
  currentTime: number;
  play: () => void;
  pause: () => void;
  seek: (time: number) => void;
  stop: () => void;
  togglePlayPause: () => void;
}

/**
 * Custom hook for video playback control with requestAnimationFrame
 * Manages playback state and updates timeline currentTime at 30fps
 */
export function useVideoPlayback(): UseVideoPlaybackReturn {
  const { state, setCurrentTime, play: contextPlay, pause: contextPause } = useTimeline();
  const { currentTime, duration, isPlaying } = state;
  
  const [localCurrentTime, setLocalCurrentTime] = useState(currentTime);
  const animationFrameRef = useRef<number | null>(null);
  const lastFrameTimeRef = useRef<number>(0);
  const targetFPS = 30;
  const frameInterval = 1000 / targetFPS; // ~33ms for 30fps

  // Sync local time with context time
  useEffect(() => {
    setLocalCurrentTime(currentTime);
  }, [currentTime]);

  /**
   * Start playback
   */
  const play = useCallback(() => {
    if (localCurrentTime >= duration) {
      // If at end, restart from beginning
      setLocalCurrentTime(0);
      setCurrentTime(0);
    }
    
    contextPlay();
  }, [localCurrentTime, duration, setCurrentTime, contextPlay]);

  /**
   * Pause playback
   */
  const pause = useCallback(() => {
    contextPause();
    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    lastFrameTimeRef.current = 0;
  }, [contextPause]);

  /**
   * Seek to specific time
   */
  const seek = useCallback((time: number) => {
    const clampedTime = Math.max(0, Math.min(time, duration));
    setLocalCurrentTime(clampedTime);
    setCurrentTime(clampedTime);
    lastFrameTimeRef.current = 0;
  }, [duration, setCurrentTime]);

  /**
   * Stop playback and reset to beginning
   */
  const stop = useCallback(() => {
    pause();
    seek(0);
  }, [pause, seek]);

  /**
   * Toggle between play and pause
   */
  const togglePlayPause = useCallback(() => {
    if (isPlaying) {
      pause();
    } else {
      play();
    }
  }, [isPlaying, play, pause]);

  /**
   * Animation loop for smooth playback
   */
  useEffect(() => {
    if (!isPlaying) {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
        animationFrameRef.current = null;
      }
      return;
    }

    const animate = (timestamp: number) => {
      if (!lastFrameTimeRef.current) {
        lastFrameTimeRef.current = timestamp;
      }

      const deltaTime = timestamp - lastFrameTimeRef.current;

      // Only update if enough time has passed (30fps throttling)
      if (deltaTime >= frameInterval) {
        setLocalCurrentTime((prevTime) => {
          const newTime = prevTime + (deltaTime / 1000); // Convert ms to seconds
          
          // Auto-pause at end of timeline
          if (newTime >= duration) {
            contextPause();
            setCurrentTime(duration);
            return duration;
          }

          // Update timeline context
          setCurrentTime(newTime);
          return newTime;
        });

        lastFrameTimeRef.current = timestamp;
      }

      // Continue animation loop
      animationFrameRef.current = requestAnimationFrame(animate);
    };

    lastFrameTimeRef.current = 0;
    animationFrameRef.current = requestAnimationFrame(animate);

    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [isPlaying, duration, frameInterval, setCurrentTime, contextPause]);

  return {
    isPlaying,
    currentTime: localCurrentTime,
    play,
    pause,
    seek,
    stop,
    togglePlayPause,
  };
}
