import { useState, useEffect, useRef, useCallback, useMemo } from "react";
import { useTimeline } from "@/context/TimelineContext";
import { calculateContentDuration } from "@/utils/clipOperations";

export interface UseVideoPlaybackReturn {
	isPlaying: boolean;
	currentTime: number;
	contentDuration: number;
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
	const { currentTime, isPlaying, layers } = state;

	// Calculate the actual content duration based on the end of the last resource placed
	const contentDuration = useMemo(() => calculateContentDuration(layers), [layers]);

	// Use content duration for playback, but ensure at least 0 (no content case)
	const playbackDuration = contentDuration > 0 ? contentDuration : 0;

	// Use ref to always have the latest playback duration in animation callback
	const playbackDurationRef = useRef(playbackDuration);
	useEffect(() => {
		playbackDurationRef.current = playbackDuration;
	}, [playbackDuration]);

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
		// Don't play if there's no content
		if (playbackDurationRef.current <= 0) {
			return;
		}

		if (localCurrentTime >= playbackDurationRef.current) {
			// If at end, restart from beginning
			setLocalCurrentTime(0);
			setCurrentTime(0);
		}

		contextPlay();
	}, [localCurrentTime, setCurrentTime, contextPlay]);

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
	 * Seek to specific time - clamp to content duration
	 */
	const seek = useCallback(
		(time: number) => {
			const maxTime = playbackDurationRef.current > 0 ? playbackDurationRef.current : state.duration;
			const clampedTime = Math.max(0, Math.min(time, maxTime));
			setLocalCurrentTime(clampedTime);
			setCurrentTime(clampedTime);
			lastFrameTimeRef.current = 0;
		},
		[state.duration, setCurrentTime]
	);

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
	 * Uses content duration (end of last resource) as the maximum playback time
	 */
	useEffect(() => {
		if (!isPlaying) {
			if (animationFrameRef.current !== null) {
				cancelAnimationFrame(animationFrameRef.current);
				animationFrameRef.current = null;
			}
			return;
		}

		// Don't run animation if there's no content
		if (playbackDurationRef.current <= 0) {
			contextPause();
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
					const newTime = prevTime + deltaTime / 1000; // Convert ms to seconds

					// Get the current content duration from ref (always up to date)
					const currentPlaybackDuration = playbackDurationRef.current;

					// Auto-pause at end of content (end of last resource)
					if (newTime >= currentPlaybackDuration) {
						contextPause();
						setCurrentTime(currentPlaybackDuration);
						return currentPlaybackDuration;
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
	}, [isPlaying, frameInterval, setCurrentTime, contextPause]);

	return {
		isPlaying,
		currentTime: localCurrentTime,
		contentDuration: playbackDuration,
		play,
		pause,
		seek,
		stop,
		togglePlayPause,
	};
}
