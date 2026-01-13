import { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { useTimeline } from "@/context/TimelineContext";
import type { Clip, TimelineLayer } from "@/types/timeline";
import { getInterpolatedProperties } from "@/utils/keyframeInterpolation";
import { ImageResizeOverlay } from "./ImageResizeOverlay";

interface VideoPlayerProps {
	width?: number;
	height?: number;
	className?: string;
}

/**
 * VideoPlayer component for rendering composite video preview
 * Renders all visible clips at current time with proper layering
 */
export function VideoPlayer({ width: initialWidth, height: initialHeight, className = "" }: VideoPlayerProps) {
	const { state, updateClip, setSelectedClip, setCanvasSize } = useTimeline();
	const { layers, currentTime, isPlaying, selectedClipId } = state;

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
	const audioElementsRef = useRef<Map<string, HTMLAudioElement>>(new Map());
	const imageElementsRef = useRef<Map<string, HTMLImageElement>>(new Map());
	const textDimensionsRef = useRef<Map<string, { width: number; height: number }>>(new Map());
	const [textDimensions, setTextDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());
	const animationFrameRef = useRef<number | undefined>(undefined);
	const isFrameScheduledRef = useRef<boolean>(false);
	const layersRef = useRef<TimelineLayer[]>(layers);
	const currentTimeRef = useRef<number>(currentTime);
	const isPlayingRef = useRef<boolean>(isPlaying);
	const lastRenderTimeRef = useRef<number>(0);
	const isScrubbingRef = useRef<boolean>(false);
	const scrubTimeoutRef = useRef<number | undefined>(undefined);
	const canvasSizeRef = useRef({ width: initialWidth || 1080, height: initialHeight || 1920 });
	// Track which clips are currently active to detect transitions
	const activeClipsRef = useRef<Set<string>>(new Set());
	const [isReady, setIsReady] = useState(false);
	const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
	const [localCanvasSize, setLocalCanvasSize] = useState({
		width: initialWidth || 1080,
		height: initialHeight || 1920,
	});
	const [imageDimensions, setImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());
	const [videoDimensions, setVideoDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());

	// Cleanup video and audio elements from DOM when component unmounts
	useEffect(() => {
		return () => {
			videoElementsRef.current.forEach((video) => {
				video.pause();
				video.src = "";
				if (video.parentNode) {
					video.parentNode.removeChild(video);
				}
			});
			videoElementsRef.current.clear();
			audioElementsRef.current.forEach((audio) => {
				audio.pause();
				audio.src = "";
				if (audio.parentNode) {
					audio.parentNode.removeChild(audio);
				}
			});
			audioElementsRef.current.clear();
		};
	}, []);

	// Update refs when state changes and detect scrubbing
	useEffect(() => {
		layersRef.current = layers;
		canvasSizeRef.current = localCanvasSize;
		isPlayingRef.current = isPlaying;
		const timeDiff = Math.abs(currentTime - currentTimeRef.current);
		currentTimeRef.current = currentTime;

		// Detect scrubbing: large time jump or rapid successive changes while not playing
		if (!isPlaying && timeDiff > 0) {
			isScrubbingRef.current = true;

			// Clear existing timeout
			if (scrubTimeoutRef.current) {
				clearTimeout(scrubTimeoutRef.current);
			}

			// Reset scrubbing flag after 150ms of no changes
			scrubTimeoutRef.current = window.setTimeout(() => {
				isScrubbingRef.current = false;
			}, 150);
		}
	}, [layers, currentTime, isPlaying, localCanvasSize]);

	/**
	 * Create a stable reference for layers that only changes when visual content changes
	 * This prevents re-renders when only mute/non-visual properties change
	 */
	const layersRenderKey = useMemo(() => {
		return layers.map((layer) => ({
			id: layer.id,
			type: layer.type,
			visible: layer.visible,
			clips: layer.clips.map((clip) => ({
				id: clip.id,
				resourceId: clip.resourceId,
				startTime: clip.startTime,
				duration: clip.duration,
				trimStart: clip.trimStart,
				position: clip.position,
				scale: clip.scale,
				rotation: clip.rotation,
				opacity: clip.opacity,
				transitions: clip.transitions,
				keyframes: clip.keyframes,
				data: clip.data,
			})),
		}));
	}, [layers]);

	// Stringify for dependency comparison - only changes when visual properties change
	const layersRenderKeyString = useMemo(() => JSON.stringify(layersRenderKey), [layersRenderKey]);

	/**
	 * Create a stable key for playback sync that only changes when clips are added/removed
	 * This prevents re-syncing playback when visibility/mute changes
	 * Visibility and mute don't require re-seeking videos
	 */
	const playbackSyncKey = useMemo(() => {
		return layers
			.flatMap((layer) =>
				layer.clips.map((clip) => `${clip.id}:${clip.resourceId}:${clip.startTime}:${clip.duration}:${clip.trimStart}`)
			)
			.join("|");
	}, [layers]);

	// Handler for resizing images
	const handleResize = useCallback(
		(clipId: string, scale: { x: number; y: number }, position?: { x: number; y: number }, rotation?: number) => {
			console.log("handleResize called:", { clipId, scale, position, rotation });
			const updates: Partial<Clip> = { scale };
			if (position) {
				updates.position = position;
			}
			if (rotation !== undefined) {
				updates.rotation = rotation;
			}
			console.log("Calling updateClip with:", clipId, updates);
			updateClip(clipId, updates);
		},
		[updateClip]
	);

	// Get selected clip for resize overlay, along with its layer type
	let selectedClipInfo = null;
	if (selectedClipId) {
		for (const layer of layers) {
			const clip = layer.clips.find((c) => c.id === selectedClipId);
			if (clip) {
				selectedClipInfo = { clip, layerType: layer.type };
				break;
			}
		}
	}

	const selectedClip = selectedClipInfo?.clip ?? null;
	const selectedClipLayerType = selectedClipInfo?.layerType;

	/**
	 * Create a stable key for media loading that only changes when clips are added/removed
	 * This prevents re-loading when only mute state changes
	 */
	const mediaClipsKey = useMemo(() => {
		return layers
			.flatMap((layer) => layer.clips)
			.map((clip) => `${clip.resourceId}:${clip.data?.type}`)
			.join(",");
	}, [layers]);

	/**
	 * Detect canvas size based on the largest video's dimensions
	 * Prioritizes clip.data dimensions (from resource metadata) for immediate detection
	 * Falls back to video element dimensions after loading
	 */
	useEffect(() => {
		const detectCanvasSize = async () => {
			// If dimensions are explicitly provided, use them
			if (initialWidth && initialHeight) {
				setLocalCanvasSize({ width: initialWidth, height: initialHeight });
				setCanvasSize(initialWidth, initialHeight);
				return;
			}

			// Find all video clips (check both layer type and clip data type)
			const videoClips = layers.flatMap((layer) =>
				layer.clips.filter((clip) => layer.type === "video" || clip.data?.type === "video")
			);

			if (videoClips.length > 0) {
				let maxWidth = 0;
				let maxHeight = 0;

				// Find the largest video dimensions
				for (const clip of videoClips) {
					// First try to get dimensions from clip data (set when clip is created from resource)
					let clipWidth = clip.data?.width;
					let clipHeight = clip.data?.height;

					// Fall back to video element dimensions if available
					if ((!clipWidth || !clipHeight) && videoElementsRef.current.has(clip.resourceId)) {
						const video = videoElementsRef.current.get(clip.resourceId);
						if (video && video.videoWidth && video.videoHeight) {
							clipWidth = video.videoWidth;
							clipHeight = video.videoHeight;
						}
					}

					if (clipWidth && clipHeight) {
						// Use the largest area to determine the canvas size
						const currentArea = clipWidth * clipHeight;
						const maxArea = maxWidth * maxHeight;
						if (currentArea > maxArea) {
							maxWidth = clipWidth;
							maxHeight = clipHeight;
						}
					}
				}

				if (maxWidth > 0 && maxHeight > 0) {
					setLocalCanvasSize({ width: maxWidth, height: maxHeight });
					setCanvasSize(maxWidth, maxHeight);
				}
			}
		};

		detectCanvasSize();
	}, [layers, initialWidth, initialHeight, setCanvasSize, isReady]); // Run whenever layers change

	/**
	 * Update display size based on container dimensions while maintaining aspect ratio
	 */
	useEffect(() => {
		const updateDisplaySize = () => {
			if (!containerRef.current) return;

			// Account for border (2px * 2), padding (8px * 2), and outer padding (12px * 2)
			const borderAndPadding = (2 + 8 + 12) * 2; // Total: 44px on each axis

			const containerWidth = containerRef.current.clientWidth - borderAndPadding;
			const containerHeight = containerRef.current.clientHeight - borderAndPadding;
			const aspectRatio = localCanvasSize.width / localCanvasSize.height;
			const containerAspectRatio = containerWidth / containerHeight;

			let displayWidth, displayHeight;

			if (containerAspectRatio > aspectRatio) {
				// Container is wider than video aspect ratio
				displayHeight = containerHeight;
				displayWidth = displayHeight * aspectRatio;
			} else {
				// Container is taller than video aspect ratio
				displayWidth = containerWidth;
				displayHeight = displayWidth / aspectRatio;
			}

			setDisplaySize({ width: displayWidth, height: displayHeight });
		};

		updateDisplaySize();
		window.addEventListener("resize", updateDisplaySize);
		return () => window.removeEventListener("resize", updateDisplaySize);
	}, [localCanvasSize]);

	/**
	 * Deselect clip when clicking outside the preview panel
	 * But not when clicking on timeline, toolbar, or other areas that handle their own selection
	 */
	useEffect(() => {
		const handleClickOutside = (e: MouseEvent) => {
			if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
				// Check if clicked on timeline area or other interactive areas - don't deselect in those cases
				const target = e.target as HTMLElement;

				// Don't deselect when clicking on:
				// - Timeline canvas or container
				// - Resource panel
				// - Toolbar buttons (edit tools, etc.)
				// - Any area that handles clip selection
				const isInteractiveArea =
					target.closest("[data-timeline]") ||
					target.closest("[data-edit-tools]") ||
					target.closest(".timeline-container") ||
					target.closest('[class*="timeline"]') ||
					target.closest('[class*="Timeline"]') ||
					target.closest('[class*="toolbar"]') ||
					target.closest('[class*="Toolbar"]') ||
					target.closest("button") ||
					target.closest('[role="button"]') ||
					(target.tagName === "CANVAS" && !containerRef.current?.contains(target));

				if (!isInteractiveArea) {
					// Click was outside the preview panel and interactive areas, deselect
					setSelectedClip(null);
				}
			}
		};

		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, [setSelectedClip]);

	/**
	 * Load video and image elements for all clips
	 * Uses mediaClipsKey to avoid re-running when only mute changes
	 */
	useEffect(() => {
		const loadMediaElements = async () => {
			// Use refs to get current layers without dependency issues
			const currentLayers = layersRef.current;
			// Check both layer type and clip data type for proper media detection
			const videoClips = currentLayers.flatMap((layer) =>
				layer.clips.filter((clip) => layer.type === "video" || clip.data?.type === "video")
			);
			const audioClips = currentLayers.flatMap((layer) =>
				layer.clips.filter((clip) => layer.type === "audio" || clip.data?.type === "audio")
			);
			const imageClips = currentLayers.flatMap((layer) =>
				layer.clips.filter((clip) => layer.type === "image" || clip.data?.type === "image")
			);

			// Create video elements for clips that don't have them
			for (const clip of videoClips) {
				if (!videoElementsRef.current.has(clip.resourceId)) {
					const video = document.createElement("video");
					video.crossOrigin = "anonymous";
					video.preload = "auto";
					video.muted = true;
					// Add playsinline attribute for mobile compatibility
					video.playsInline = true;
					// Append video to DOM (hidden) to enable audio playback in some browsers
					video.style.position = "absolute";
					video.style.width = "1px";
					video.style.height = "1px";
					video.style.opacity = "0";
					video.style.pointerEvents = "none";
					video.style.zIndex = "-1000";
					document.body.appendChild(video);

					// Set video source from clip data URL
					video.src = clip.data?.url || `/api/media/${clip.resourceId}/file`;

					videoElementsRef.current.set(clip.resourceId, video);

					// Wait for video to be ready
					await new Promise<void>((resolve) => {
						video.addEventListener(
							"loadeddata",
							() => {
								// Store video dimensions in state
								if (video.videoWidth && video.videoHeight) {
									setVideoDimensions((prev) =>
										new Map(prev).set(clip.resourceId, {
											width: video.videoWidth,
											height: video.videoHeight,
										})
									);
								}
								resolve();
							},
							{ once: true }
						);
					});
				}
			}

			// Create audio elements for clips that don't have them
			for (const clip of audioClips) {
				if (!audioElementsRef.current.has(clip.resourceId)) {
					const audio = document.createElement("audio");
					audio.crossOrigin = "anonymous";
					audio.preload = "auto";
					audio.muted = true;
					// Append audio to DOM (hidden) to enable playback
					audio.style.position = "absolute";
					audio.style.width = "1px";
					audio.style.height = "1px";
					audio.style.opacity = "0";
					audio.style.pointerEvents = "none";
					audio.style.zIndex = "-1000";
					document.body.appendChild(audio);

					// Set audio source from clip data URL
					audio.src = clip.data?.url || `/api/media/${clip.resourceId}/file`;
					audioElementsRef.current.set(clip.resourceId, audio);

					// Wait for audio to be ready
					await new Promise<void>((resolve) => {
						audio.addEventListener(
							"loadeddata",
							() => {
								console.log(`🔊 Audio element loaded for resource: ${clip.resourceId}`);
								resolve();
							},
							{ once: true }
						);
						audio.addEventListener(
							"error",
							() => {
								console.error(`Failed to load audio for resource: ${clip.resourceId}`);
								resolve();
							},
							{ once: true }
						);
					});
				}
			}

			// Create image elements for clips that don't have them
			for (const clip of imageClips) {
				if (!imageElementsRef.current.has(clip.resourceId)) {
					const img = new Image();
					img.crossOrigin = "anonymous";
					// Set image source from clip data URL
					img.src = clip.data?.url || `/api/media/${clip.resourceId}/file`;

					imageElementsRef.current.set(clip.resourceId, img);

					// Wait for image to load
					await new Promise<void>((resolve, reject) => {
						img.addEventListener(
							"load",
							() => {
								// Store image dimensions in state
								setImageDimensions((prev) =>
									new Map(prev).set(clip.resourceId, {
										width: img.naturalWidth,
										height: img.naturalHeight,
									})
								);
								resolve();
							},
							{ once: true }
						);
						img.addEventListener("error", () => reject(new Error("Failed to load image")), { once: true });
					}).catch((err) => console.error("Image load error:", err));
				} else {
					// Image already loaded, ensure dimensions are in state
					const img = imageElementsRef.current.get(clip.resourceId);
					if (img && img.complete && img.naturalWidth > 0) {
						setImageDimensions((prev) => {
							if (!prev.has(clip.resourceId)) {
								return new Map(prev).set(clip.resourceId, {
									width: img.naturalWidth,
									height: img.naturalHeight,
								});
							}
							return prev;
						});
					}
				}
			}

			// Clean up video/image elements for resources that are no longer in any clip
			const currentResourceIds = new Set(currentLayers.flatMap((layer) => layer.clips.map((clip) => clip.resourceId)));

			// Remove unused video elements
			videoElementsRef.current.forEach((video, resourceId) => {
				if (!currentResourceIds.has(resourceId)) {
					video.pause();
					video.src = "";
					video.load(); // Reset the video element
					// Remove from DOM if it was appended
					if (video.parentNode) {
						video.parentNode.removeChild(video);
					}
					videoElementsRef.current.delete(resourceId);
					setVideoDimensions((prev) => {
						const newMap = new Map(prev);
						newMap.delete(resourceId);
						return newMap;
					});
					console.log(`🗑️ Cleaned up video element for resource: ${resourceId}`);
				}
			});

			// Remove unused image elements
			imageElementsRef.current.forEach((_, resourceId) => {
				if (!currentResourceIds.has(resourceId)) {
					imageElementsRef.current.delete(resourceId);
					setImageDimensions((prev) => {
						const newMap = new Map(prev);
						newMap.delete(resourceId);
						return newMap;
					});
					console.log(`🗑️ Cleaned up image element for resource: ${resourceId}`);
				}
			});

			// Remove unused audio elements
			audioElementsRef.current.forEach((audio, resourceId) => {
				if (!currentResourceIds.has(resourceId)) {
					audio.pause();
					audio.src = "";
					audio.load();
					if (audio.parentNode) {
						audio.parentNode.removeChild(audio);
					}
					audioElementsRef.current.delete(resourceId);
					console.log(`🗑️ Cleaned up audio element for resource: ${resourceId}`);
				}
			});

			setIsReady(true);
		};

		loadMediaElements();
	}, [mediaClipsKey]); // Only depend on mediaClipsKey, not full layers

	/**
	 * Get clips that should be visible at the current time
	 * Uses ref to avoid recreating callback when mute-only changes happen
	 */
	const getVisibleClips = useCallback(
		(time: number): Array<{ clip: Clip; layer: TimelineLayer }> => {
			const visibleClips: Array<{ clip: Clip; layer: TimelineLayer }> = [];
			const currentLayers = layersRef.current;

			for (const layer of currentLayers) {
				if (!layer.visible) continue;

				for (const clip of layer.clips) {
					const clipEndTime = clip.startTime + clip.duration;

					// Check if current time falls within clip's time range
					if (time >= clip.startTime && time < clipEndTime) {
						visibleClips.push({ clip, layer });
					}
				}
			}

			// Sort by layer order (bottom to top)
			visibleClips.sort((a, b) => {
				const layerIndexA = currentLayers.indexOf(a.layer);
				const layerIndexB = currentLayers.indexOf(b.layer);
				return layerIndexA - layerIndexB;
			});

			return visibleClips;
		},
		[] // Stable callback - uses ref for layers
	);

	/**
	 * Calculate opacity for transition effects (fade and dissolve)
	 */
	const calculateTransitionOpacity = (clip: Clip, localTime: number): number => {
		let opacity = clip.opacity ?? 1.0;

		// Apply fade/dissolve in transition
		if (clip.transitions?.in) {
			const transition = clip.transitions.in;
			if (localTime < transition.duration) {
				const fadeProgress = localTime / transition.duration;

				if (transition.type === "fade" || transition.type === "dissolve") {
					opacity *= fadeProgress;
				}
			}
		}

		// Apply fade/dissolve out transition
		if (clip.transitions?.out) {
			const transition = clip.transitions.out;
			const fadeOutStart = clip.duration - transition.duration;

			if (localTime > fadeOutStart) {
				const fadeProgress = (clip.duration - localTime) / transition.duration;

				if (transition.type === "fade" || transition.type === "dissolve") {
					opacity *= fadeProgress;
				}
			}
		}

		return opacity;
	};

	/**
	 * Calculate scale multiplier for zoom transitions
	 */
	const calculateZoomScale = (clip: Clip, localTime: number): number => {
		let zoomScale = 1.0;

		// Apply zoom transition at clip start
		if (clip.transitions?.in?.type === "zoom") {
			const transition = clip.transitions.in;
			const direction = transition.properties?.direction || "in"; // Default to "in" if not specified

			if (localTime < transition.duration) {
				const progress = localTime / transition.duration;
				if (direction === "in") {
					// Zoom in: content gets bigger - goes from 0.5x (small) to 1.0x (normal view)
					zoomScale = 0.5 + progress * 0.5;
				} else {
					// Zoom out: content gets smaller - goes from 2.0x (large) to 1.0x (normal view)
					zoomScale = 2.0 - progress;
				}
			}
			// After transition completes, scale returns to 1.0 (normal)
		}

		// Apply zoom transition at clip end
		if (clip.transitions?.out?.type === "zoom") {
			const transition = clip.transitions.out;
			const direction = transition.properties?.direction || "out"; // Default to "out" if not specified
			const fadeOutStart = clip.duration - transition.duration;

			if (localTime > fadeOutStart) {
				const progress = (localTime - fadeOutStart) / transition.duration;
				if (direction === "in") {
					// Zoom in: content gets bigger - goes from 1.0x (normal) to 2.0x (large)
					zoomScale = 1.0 + progress;
				} else {
					// Zoom out: content gets smaller - goes from 1.0x (normal) to 0.5x (small)
					zoomScale = 1.0 - progress * 0.5;
				}
			}
		}

		return zoomScale;
	};

	/**
	 * Apply clipping path for wipe/slide transitions
	 */
	const applyClipPath = useCallback(
		(
			ctx: CanvasRenderingContext2D,
			direction: string,
			progress: number,
			canvasWidth: number,
			canvasHeight: number,
			transitionMode: "in" | "out"
		): void => {
			ctx.beginPath();

			// For "in" transitions: clip area grows (progress 0 -> 1 means visible area 0 -> full)
			// For "out" transitions: clip area shrinks (progress 0 -> 1 means visible area full -> 0)
			const effectiveProgress = transitionMode === "in" ? progress : 1 - progress;

			switch (direction) {
				case "left":
					// Wipe from left to right
					ctx.rect(0, 0, canvasWidth * effectiveProgress, canvasHeight);
					break;
				case "right": {
					// Wipe from right to left
					const rightStartX = canvasWidth * (1 - effectiveProgress);
					ctx.rect(rightStartX, 0, canvasWidth * effectiveProgress, canvasHeight);
					break;
				}
				case "up":
					// Wipe from top to bottom
					ctx.rect(0, 0, canvasWidth, canvasHeight * effectiveProgress);
					break;
				case "down": {
					// Wipe from bottom to top
					const downStartY = canvasHeight * (1 - effectiveProgress);
					ctx.rect(0, downStartY, canvasWidth, canvasHeight * effectiveProgress);
					break;
				}
				default:
					// Default to left wipe
					ctx.rect(0, 0, canvasWidth * effectiveProgress, canvasHeight);
			}

			ctx.clip();
		},
		[]
	);

	/**
	 * Apply wipe transition clipping to canvas context
	 * Returns true if clipping was applied and needs to be restored
	 */
	const applyTransitionClipping = useCallback(
		(
			ctx: CanvasRenderingContext2D,
			clip: Clip,
			localTime: number,
			canvasWidth: number,
			canvasHeight: number
		): boolean => {
			const transitionIn = clip.transitions?.in;
			const transitionOut = clip.transitions?.out;

			// Check if we're in the "in" transition period (wipe only)
			if (transitionIn && transitionIn.type === "wipe") {
				if (localTime < transitionIn.duration) {
					const progress = localTime / transitionIn.duration;
					const direction = (transitionIn.properties?.direction as string) || "left";

					applyClipPath(ctx, direction, progress, canvasWidth, canvasHeight, "in");
					return true;
				}
			}

			// Check if we're in the "out" transition period (wipe only)
			if (transitionOut && transitionOut.type === "wipe") {
				const outStart = clip.duration - transitionOut.duration;
				if (localTime > outStart) {
					const progress = (localTime - outStart) / transitionOut.duration;
					const direction = (transitionOut.properties?.direction as string) || "left";

					applyClipPath(ctx, direction, progress, canvasWidth, canvasHeight, "out");
					return true;
				}
			}

			return false;
		},
		[applyClipPath]
	);

	/**
	 * Calculate slide transition offset for position-based animation
	 * Returns {x, y} offset to apply to the clip position
	 */
	const calculateSlideOffset = (
		clip: Clip,
		localTime: number,
		canvasWidth: number,
		canvasHeight: number,
		clipWidth: number,
		clipHeight: number
	): { x: number; y: number } => {
		let offsetX = 0;
		let offsetY = 0;

		const transitionIn = clip.transitions?.in;
		const transitionOut = clip.transitions?.out;

		// Check if we're in the "in" transition period (slide)
		if (transitionIn && transitionIn.type === "slide") {
			if (localTime < transitionIn.duration) {
				const progress = localTime / transitionIn.duration;
				const direction = (transitionIn.properties?.direction as string) || "left";

				// Calculate starting position (off-screen) and animate to final position
				// progress 0 = fully off-screen, progress 1 = at final position
				switch (direction) {
					case "left":
						// Enter from right side: start at canvasWidth, end at 0
						offsetX = canvasWidth * (1 - progress);
						break;
					case "right":
						// Enter from left side: start at -clipWidth, end at 0
						offsetX = -clipWidth - (canvasWidth - clipWidth) * (1 - progress);
						break;
					case "up":
						// Enter from bottom: start at canvasHeight, end at 0
						offsetY = canvasHeight * (1 - progress);
						break;
					case "down":
						// Enter from top: start at -clipHeight, end at 0
						offsetY = -clipHeight - (canvasHeight - clipHeight) * (1 - progress);
						break;
				}
			}
		}

		// Check if we're in the "out" transition period (slide)
		if (transitionOut && transitionOut.type === "slide") {
			const outStart = clip.duration - transitionOut.duration;
			if (localTime > outStart) {
				const progress = (localTime - outStart) / transitionOut.duration;
				const direction = (transitionOut.properties?.direction as string) || "left";

				// Calculate ending position (off-screen) - animate from current to off-screen
				// progress 0 = at current position, progress 1 = fully off-screen
				switch (direction) {
					case "left":
						// Exit to left: end at -clipWidth
						offsetX = -(clipWidth + canvasWidth) * progress;
						break;
					case "right":
						// Exit to right: end at canvasWidth
						offsetX = canvasWidth * progress;
						break;
					case "up":
						// Exit to top: end at -clipHeight
						offsetY = -(clipHeight + canvasHeight) * progress;
						break;
					case "down":
						// Exit to bottom: end at canvasHeight
						offsetY = canvasHeight * progress;
						break;
				}
			}
		}

		return { x: offsetX, y: offsetY };
	};

	/**
	 * Draw video frame to canvas
	 * IMPORTANT: During playback, do NOT seek - let the video play naturally.
	 * Only seek when scrubbing/paused to sync with timeline position.
	 */
	const drawVideoClip = useCallback(
		(ctx: CanvasRenderingContext2D, clip: Clip, localTime: number) => {
			const video = videoElementsRef.current.get(clip.resourceId);
			if (!video || video.readyState < 2) return; // Not ready

			// Calculate video time with trim offset
			const videoTime = localTime + clip.trimStart;

			// Only seek when NOT playing (scrubbing/paused mode)
			// During playback, the playback sync effect handles seeking if needed
			const isCurrentlyPlaying = isPlayingRef.current;
			if (!isCurrentlyPlaying) {
				const timeDiff = Math.abs(video.currentTime - videoTime);
				// Tighter tolerance when scrubbing for accurate preview
				const seekThreshold = isScrubbingRef.current ? 0.05 : 0.15;
				if (timeDiff > seekThreshold) {
					video.currentTime = videoTime;
				}
			}

			// Use video's original dimensions
			const videoWidth = video.videoWidth || canvasSizeRef.current.width;
			const videoHeight = video.videoHeight || canvasSizeRef.current.height;

			// Get interpolated properties (supports keyframe animation)
			const interpolated = getInterpolatedProperties(clip, localTime);
			const scale = interpolated.scale;
			const position = interpolated.position;
			const rotation = interpolated.rotation;

			// Calculate zoom transition scale
			const zoomScale = calculateZoomScale(clip, localTime);

			// Handle both uniform and non-uniform scaling
			const scaleX = (typeof scale === "number" ? scale : scale.x) * zoomScale;
			const scaleY = (typeof scale === "number" ? scale : scale.y) * zoomScale;

			// Calculate scaled dimensions
			const scaledWidth = videoWidth * scaleX;
			const scaledHeight = videoHeight * scaleY;

			// Calculate position (center video if not specified)
			let x = position.x !== 0 ? position.x : (canvasSizeRef.current.width - videoWidth) / 2;
			let y = position.y !== 0 ? position.y : (canvasSizeRef.current.height - videoHeight) / 2;

			// Adjust position for zoom to keep centered (zoom from center, not top-left)
			if (zoomScale !== 1.0) {
				const baseWidth = videoWidth * (typeof scale === "number" ? scale : scale.x);
				const baseHeight = videoHeight * (typeof scale === "number" ? scale : scale.y);
				x -= (scaledWidth - baseWidth) / 2;
				y -= (scaledHeight - baseHeight) / 2;
			}

			// Apply slide transition offset (push effect)
			const slideOffset = calculateSlideOffset(
				clip,
				localTime,
				canvasSizeRef.current.width,
				canvasSizeRef.current.height,
				scaledWidth,
				scaledHeight
			);
			x += slideOffset.x;
			y += slideOffset.y;

			// Calculate transition opacity and combine with keyframe opacity
			const transitionOpacity = calculateTransitionOpacity(clip, localTime);
			const opacity = transitionOpacity * interpolated.opacity;

			// Save canvas state
			ctx.save();

			// Apply wipe transition clipping if needed (slide uses position offset instead)
			applyTransitionClipping(ctx, clip, localTime, canvasSizeRef.current.width, canvasSizeRef.current.height);

			// Apply transformations
			ctx.globalAlpha = opacity;
			ctx.translate(x + scaledWidth / 2, y + scaledHeight / 2);
			ctx.rotate((rotation * Math.PI) / 180);
			ctx.translate(-scaledWidth / 2, -scaledHeight / 2);

			// Draw video frame using its dimensions with scaling
			ctx.drawImage(video, 0, 0, scaledWidth, scaledHeight);

			// Restore canvas state
			ctx.restore();
		},
		[applyTransitionClipping]
	);

	/**
	 * Draw image clip to canvas
	 */
	const drawImageClip = useCallback(
		(ctx: CanvasRenderingContext2D, clip: Clip, localTime: number) => {
			const img = imageElementsRef.current.get(clip.resourceId);
			if (!img || !img.complete) return; // Not ready or not loaded

			// Use image's original dimensions
			const imgWidth = img.naturalWidth || canvasSizeRef.current.width;
			const imgHeight = img.naturalHeight || canvasSizeRef.current.height;

			// Get interpolated properties (supports keyframe animation)
			const interpolated = getInterpolatedProperties(clip, localTime);
			const scale = interpolated.scale;
			const position = interpolated.position;
			const rotation = interpolated.rotation;

			console.log(`Drawing clip ${clip.id}:`, {
				resourceId: clip.resourceId,
				clipScale: clip.scale,
				clipPosition: clip.position,
				clipRotation: clip.rotation,
				interpolatedScale: scale,
				interpolatedPosition: position,
				interpolatedRotation: rotation,
			});

			// Calculate zoom transition scale
			const zoomScale = calculateZoomScale(clip, localTime);

			// Handle both uniform and non-uniform scaling
			const scaleX = (typeof scale === "number" ? scale : scale.x) * zoomScale;
			const scaleY = (typeof scale === "number" ? scale : scale.y) * zoomScale;

			// Calculate scaled dimensions
			const scaledWidth = imgWidth * scaleX;
			const scaledHeight = imgHeight * scaleY;

			// Calculate position (center image if not specified)
			let x = position.x !== 0 ? position.x : (canvasSizeRef.current.width - imgWidth) / 2;
			let y = position.y !== 0 ? position.y : (canvasSizeRef.current.height - imgHeight) / 2;

			// Adjust position for zoom to keep centered (zoom from center, not top-left)
			if (zoomScale !== 1.0) {
				const baseWidth = imgWidth * (typeof scale === "number" ? scale : scale.x);
				const baseHeight = imgHeight * (typeof scale === "number" ? scale : scale.y);
				x -= (scaledWidth - baseWidth) / 2;
				y -= (scaledHeight - baseHeight) / 2;
			}

			// Apply slide transition offset (push effect)
			const slideOffset = calculateSlideOffset(
				clip,
				localTime,
				canvasSizeRef.current.width,
				canvasSizeRef.current.height,
				scaledWidth,
				scaledHeight
			);
			x += slideOffset.x;
			y += slideOffset.y;

			// Calculate transition opacity and combine with keyframe opacity
			const transitionOpacity = calculateTransitionOpacity(clip, localTime);
			const opacity = transitionOpacity * interpolated.opacity;

			// Save canvas state
			ctx.save();

			// Apply wipe transition clipping if needed (slide uses position offset instead)
			applyTransitionClipping(ctx, clip, localTime, canvasSizeRef.current.width, canvasSizeRef.current.height);

			// Apply transformations
			ctx.globalAlpha = opacity;
			ctx.translate(x + scaledWidth / 2, y + scaledHeight / 2);
			ctx.rotate((rotation * Math.PI) / 180);
			ctx.translate(-scaledWidth / 2, -scaledHeight / 2);

			// Draw image frame using its dimensions with scaling
			ctx.drawImage(img, 0, 0, scaledWidth, scaledHeight);

			// Restore canvas state
			ctx.restore();
		},
		[applyTransitionClipping]
	);

	/**
	 * Draw text clip to canvas
	 */
	const drawTextClip = useCallback(
		(ctx: CanvasRenderingContext2D, clip: Clip, localTime: number) => {
			if (!clip.data) return;

			const { text = "", fontFamily = "Arial", fontSize = 48, color = "#ffffff", animation = "none" } = clip.data;

			// Get interpolated properties (supports keyframe animation)
			const interpolated = getInterpolatedProperties(clip, localTime);
			const scale = interpolated.scale;
			const position = interpolated.position;
			const rotation = interpolated.rotation;

			// Calculate zoom transition scale
			const zoomScale = calculateZoomScale(clip, localTime);

			// Handle both uniform and non-uniform scaling
			const scaleX = (typeof scale === "number" ? scale : scale.x) * zoomScale;
			const scaleY = (typeof scale === "number" ? scale : scale.y) * zoomScale;

			// Calculate position (center if position is 0,0)
			let x = position.x !== 0 ? position.x : canvasSizeRef.current.width / 2;
			let y = position.y !== 0 ? position.y : canvasSizeRef.current.height / 2;

			// Apply slide transition offset (push effect) - estimate text size for offset calc
			const estimatedWidth = fontSize * text.length * 0.6 * scaleX;
			const estimatedHeight = fontSize * scaleY;
			const slideOffset = calculateSlideOffset(
				clip,
				localTime,
				canvasSizeRef.current.width,
				canvasSizeRef.current.height,
				estimatedWidth,
				estimatedHeight
			);
			x += slideOffset.x;
			y += slideOffset.y;

			// Calculate base opacity from interpolated value
			let opacity = interpolated.opacity;

			// Apply animation effects
			const relativeTime = localTime / clip.duration;
			let xOffset = 0;

			if (animation === "fade") {
				// Fade in for first 10% and fade out for last 10%
				if (relativeTime < 0.1) {
					opacity *= relativeTime / 0.1;
				} else if (relativeTime > 0.9) {
					opacity *= (1 - relativeTime) / 0.1;
				}
			} else if (animation === "slide") {
				// Slide in from left for first 20%
				if (relativeTime < 0.2) {
					xOffset = -(1 - relativeTime / 0.2) * canvasSizeRef.current.width * 0.3;
				}
			}

			// Calculate transition opacity
			const transitionOpacity = calculateTransitionOpacity(clip, localTime);
			opacity *= transitionOpacity;

			// Save canvas state
			ctx.save();

			// Apply wipe transition clipping if needed (slide uses position offset instead)
			applyTransitionClipping(ctx, clip, localTime, canvasSizeRef.current.width, canvasSizeRef.current.height);

			// Set font properties
			const scaledFontSize = fontSize * scaleY;
			ctx.font = `${scaledFontSize}px ${fontFamily}`;
			ctx.fillStyle = color;
			ctx.textAlign = "left";
			ctx.textBaseline = "top";

			// Calculate text dimensions for transforms
			const lines = text.split("\n");
			const lineHeight = scaledFontSize * 1.2;
			let maxWidth = 0;
			lines.forEach((line: string) => {
				const metrics = ctx.measureText(line);
				maxWidth = Math.max(maxWidth, metrics.width);
			});
			const textHeight = lines.length * lineHeight;

			// Store text dimensions for resize overlay
			const textDimKey = `text-${clip.id}`;
			const storedDims = textDimensionsRef.current.get(textDimKey);
			const newWidth = maxWidth / scaleX;
			const newHeight = textHeight / scaleY;
			if (!storedDims || storedDims.width !== newWidth || storedDims.height !== newHeight) {
				textDimensionsRef.current.set(textDimKey, {
					width: newWidth,
					height: newHeight,
				});
				// Sync to state for re-render (but not during animation frame)
				setTextDimensions(new Map(textDimensionsRef.current));
			}

			// Apply transformations - centered on the text
			ctx.globalAlpha = opacity;
			ctx.translate(x + xOffset, y);
			ctx.rotate((rotation * Math.PI) / 180);

			// Draw text shadow for better visibility
			ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
			ctx.shadowBlur = 4;
			ctx.shadowOffsetX = 2;
			ctx.shadowOffsetY = 2;

			// Draw text with optional stroke
			if (clip.data?.strokeColor) {
				ctx.strokeStyle = clip.data.strokeColor;
				ctx.lineWidth = clip.data.strokeWidth || 2;
			}

			// Draw each line of text
			lines.forEach((line: string, index: number) => {
				const lineY = index * lineHeight;
				if (clip.data?.strokeColor) {
					ctx.strokeText(line, 0, lineY);
				}
				ctx.fillText(line, 0, lineY);
			});

			// Restore canvas state
			ctx.restore();
		},
		[applyTransitionClipping]
	);

	/**
	 * Render all visible clips to canvas
	 */
	const renderFrame = useCallback(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Clear canvas using canvas dimensions (always current)
		ctx.fillStyle = "#000000";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		// Get all visible clips at current time - use refs for latest state
		const currentLayers = layersRef.current;
		const currentTimeValue = currentTimeRef.current;
		const visibleClips: Array<{ clip: Clip; layer: TimelineLayer }> = [];

		for (const layer of currentLayers) {
			if (!layer.visible) continue;

			for (const clip of layer.clips) {
				const clipEndTime = clip.startTime + clip.duration;

				// Check if current time falls within clip's time range
				if (currentTimeValue >= clip.startTime && currentTimeValue < clipEndTime) {
					visibleClips.push({ clip, layer });
				}
			}
		}

		// Sort by layer order (bottom to top)
		visibleClips.sort((a, b) => {
			const layerIndexA = currentLayers.indexOf(a.layer);
			const layerIndexB = currentLayers.indexOf(b.layer);
			return layerIndexA - layerIndexB;
		});

		// Render clips from bottom to top
		for (const { clip, layer } of visibleClips) {
			const localTime = currentTimeValue - clip.startTime;

			// Skip if outside clip duration (shouldn't happen due to filter above)
			if (localTime < 0 || localTime > clip.duration) continue;

			// Render based on clip type
			if (layer.type === "video" || clip.data?.type === "video") {
				drawVideoClip(ctx, clip, localTime);
			} else if (layer.type === "image" || clip.data?.type === "image") {
				drawImageClip(ctx, clip, localTime);
			} else if (layer.type === "text" || clip.data?.type === "text") {
				drawTextClip(ctx, clip, localTime);
			}
		}
	}, [drawVideoClip, drawImageClip, drawTextClip]);

	/**
	 * Redraw canvas when currentTime changes (using requestAnimationFrame for smooth rendering)
	 * Only schedule one frame at a time to prevent overlaps
	 * Uses layersRenderKeyString to avoid re-renders when only mute state changes
	 */
	useEffect(() => {
		if (!isReady) return;

		// If a frame is already scheduled, don't schedule another one
		if (isFrameScheduledRef.current) return;

		isFrameScheduledRef.current = true;

		// Use requestAnimationFrame for smooth, non-flickering rendering
		animationFrameRef.current = requestAnimationFrame(() => {
			renderFrame();
			isFrameScheduledRef.current = false;
		});

		return () => {
			if (animationFrameRef.current) {
				cancelAnimationFrame(animationFrameRef.current);
				isFrameScheduledRef.current = false;
			}
			if (scrubTimeoutRef.current) {
				clearTimeout(scrubTimeoutRef.current);
			}
		};
	}, [currentTime, isReady, renderFrame, layersRenderKeyString]); // Use layersRenderKeyString to avoid mute-triggered re-renders

	/**
	 * Create a stable key that changes when mute OR visibility properties change
	 * This allows the mute sync effect to run when either changes
	 * (visibility changes need to restore correct mute state for newly visible layers)
	 */
	const layersMuteVisibilityKey = useMemo(() => {
		return layers.map((layer) => `${layer.id}:${layer.muted}:${layer.visible}`).join(",");
	}, [layers]);

	/**
	 * Synchronize video mute state with layer mute/visibility state
	 * This runs separately from playback sync to avoid triggering video seek/play on mute changes
	 * Uses refs to avoid triggering re-renders on other layer changes
	 */
	useEffect(() => {
		if (!isReady || !isPlaying) return;

		// Use ref to get current layers without creating dependencies
		const currentLayers = layersRef.current;
		const time = currentTimeRef.current;

		// Find visible video clips using refs (no dependency on getVisibleClips)
		for (const layer of currentLayers) {
			if (!layer.visible) continue;

			for (const clip of layer.clips) {
				const clipEndTime = clip.startTime + clip.duration;

				// Check if current time falls within clip's time range
				if (time >= clip.startTime && time < clipEndTime) {
					if (layer.type === "video" || clip.data?.type === "video") {
						const video = videoElementsRef.current.get(clip.resourceId);
						if (video) {
							// Restore correct mute state (important when layer becomes visible again)
							video.muted = layer.muted || false;
							// Also ensure the video is playing if it was paused when hidden
							if (video.paused && video.readyState >= 2) {
								video.play().catch((err) => {
									console.warn("Failed to resume video after visibility change:", err);
								});
							}
						}
					}
				}
			}
		}
	}, [layersMuteVisibilityKey, isReady, isPlaying]); // Depend on mute+visibility key

	/**
	 * Synchronize video playback with timeline
	 * Play/pause video elements based on isPlaying state
	 * Uses layersRenderKeyString to avoid re-triggering on mute changes
	 */
	useEffect(() => {
		if (!isReady) return;

		// If not playing, pause all videos immediately and clear active clips
		if (!isPlaying) {
			videoElementsRef.current.forEach((video) => {
				if (!video.paused) {
					video.pause();
				}
				video.muted = true;
			});
			activeClipsRef.current.clear();
			return;
		}

		// If playing, handle visible clips - use currentTime directly from dependency
		const currentLayers = layersRef.current;
		const time = currentTime; // Use currentTime from state, not ref
		const visibleVideoClips: Array<{ clip: Clip; layer: TimelineLayer; resourceId: string }> = [];

		for (const layer of currentLayers) {
			if (!layer.visible) continue;

			for (const clip of layer.clips) {
				const clipEndTime = clip.startTime + clip.duration;

				if (time >= clip.startTime && time < clipEndTime) {
					if (layer.type === "video" || clip.data?.type === "video") {
						visibleVideoClips.push({ clip, layer, resourceId: clip.resourceId });
					}
				}
			}
		}

		// Track current visible clip IDs to detect transitions
		const currentVisibleClipIds = new Set(visibleVideoClips.map(({ clip }) => clip.id));

		// Play all visible video clips and set correct mute state
		visibleVideoClips.forEach(({ clip, layer, resourceId }) => {
			const video = videoElementsRef.current.get(resourceId);
			if (!video || video.readyState < 2) return;

			const localTime = time - clip.startTime;
			const videoTime = localTime + clip.trimStart;

			// Check if this clip just became visible (transitioning into view)
			const isNewlyVisible = !activeClipsRef.current.has(clip.id);

			// Calculate time difference
			const timeDiff = Math.abs(video.currentTime - videoTime);

			// Always seek if:
			// 1. Clip just became visible (transitioning from another clip) - need exact sync
			// 2. Video is significantly out of sync (> 0.3s) - prevents drift
			// Use tighter threshold (0.3s) for better sync during transitions
			if (isNewlyVisible || timeDiff > 0.3) {
				video.currentTime = videoTime;
			}

			// Determine desired mute state based on layer property
			const shouldBeMuted = layer.muted || false;

			// Only play if video is paused to avoid repeated play() calls
			if (video.paused) {
				// Try to play with audio (unmuted) first
				video.muted = shouldBeMuted;
				video.play().catch((err) => {
					// If play fails due to autoplay policy, try muted playback
					console.warn("Failed to play video with audio, trying muted:", err);
					video.muted = true;
					video.play().catch((err2) => {
						console.warn("Failed to play video even muted:", err2);
					});
				});
			} else {
				// Video is already playing, just update mute state
				video.muted = shouldBeMuted;
			}
		});

		// Update active clips reference for next frame
		activeClipsRef.current = currentVisibleClipIds;

		// Pause and mute all videos not currently visible
		videoElementsRef.current.forEach((video, resourceId) => {
			const isVisible = visibleVideoClips.some((v) => v.resourceId === resourceId);
			if (!isVisible) {
				if (!video.paused) {
					video.pause();
				}
				video.muted = true;
			}
		});
	}, [isPlaying, currentTime, isReady, playbackSyncKey]); // Use playbackSyncKey to avoid visibility/mute triggered re-syncs

	/**
	 * Synchronize audio-only clip playback with timeline
	 * Play/pause audio elements based on isPlaying state
	 */
	useEffect(() => {
		if (!isReady) return;

		// If not playing, pause all audio immediately
		if (!isPlaying) {
			audioElementsRef.current.forEach((audio) => {
				if (!audio.paused) {
					audio.pause();
				}
				audio.muted = true;
			});
			return;
		}

		// If playing, handle visible audio clips
		const currentLayers = layersRef.current;
		const time = currentTime;
		const visibleAudioClips: Array<{ clip: Clip; layer: TimelineLayer; resourceId: string }> = [];

		for (const layer of currentLayers) {
			if (!layer.visible) continue;

			for (const clip of layer.clips) {
				const clipEndTime = clip.startTime + clip.duration;

				if (time >= clip.startTime && time < clipEndTime) {
					if (layer.type === "audio" || clip.data?.type === "audio") {
						visibleAudioClips.push({ clip, layer, resourceId: clip.resourceId });
					}
				}
			}
		}

		// Play all visible audio clips
		visibleAudioClips.forEach(({ clip, layer, resourceId }) => {
			const audio = audioElementsRef.current.get(resourceId);
			if (!audio || audio.readyState < 2) return;

			const localTime = time - clip.startTime;
			const audioTime = localTime + (clip.trimStart || 0);

			// Calculate time difference
			const timeDiff = Math.abs(audio.currentTime - audioTime);

			// Seek if out of sync
			if (timeDiff > 0.3) {
				audio.currentTime = audioTime;
			}

			// Determine desired mute state based on layer property
			const shouldBeMuted = layer.muted || false;

			// Only play if audio is paused
			if (audio.paused) {
				audio.muted = shouldBeMuted;
				audio.play().catch((err) => {
					console.warn("Failed to play audio, trying muted:", err);
					audio.muted = true;
					audio.play().catch((err2) => {
						console.warn("Failed to play audio even muted:", err2);
					});
				});
			} else {
				audio.muted = shouldBeMuted;
			}
		});

		// Pause and mute all audio not currently visible
		audioElementsRef.current.forEach((audio, resourceId) => {
			const isVisible = visibleAudioClips.some((v) => v.resourceId === resourceId);
			if (!isVisible) {
				if (!audio.paused) {
					audio.pause();
				}
				audio.muted = true;
			}
		});
	}, [isPlaying, currentTime, isReady, playbackSyncKey]);

	return (
		<div ref={containerRef} className={`relative flex items-center justify-center p-3 ${className}`}>
			{/* Wrapper for canvas and overlay to ensure they align */}
			<div className="relative border-2 border-blue-300/40 rounded shadow-[0_0_20px_rgba(0,0,0,0.5)]">
				<canvas
					ref={canvasRef}
					width={localCanvasSize.width}
					height={localCanvasSize.height}
					style={{
						width: displaySize.width ? `${displaySize.width}px` : "100%",
						height: displaySize.height ? `${displaySize.height}px` : "100%",
					}}
					className="block bg-black"
					onClick={(e) => {
						const rect = e.currentTarget.getBoundingClientRect();
						const x = ((e.clientX - rect.left) / rect.width) * localCanvasSize.width;
						const y = ((e.clientY - rect.top) / rect.height) * localCanvasSize.height;

						// Find clicked clip (check from top to bottom - reverse order)
						const visibleClips = getVisibleClips(currentTime);
						for (let i = visibleClips.length - 1; i >= 0; i--) {
							const { clip, layer } = visibleClips[i];
							const localTime = currentTime - clip.startTime;
							const interpolated = getInterpolatedProperties(clip, localTime);
							const scale = interpolated.scale;
							const position = interpolated.position;
							const scaleX = typeof scale === "number" ? scale : scale.x;
							const scaleY = typeof scale === "number" ? scale : scale.y;

							if (layer.type === "video" || clip.data?.type === "video") {
								const video = videoElementsRef.current.get(clip.resourceId);
								if (video) {
									const videoWidth = video.videoWidth || localCanvasSize.width;
									const videoHeight = video.videoHeight || localCanvasSize.height;

									const clipX = position.x !== 0 ? position.x : (localCanvasSize.width - videoWidth) / 2;
									const clipY = position.y !== 0 ? position.y : (localCanvasSize.height - videoHeight) / 2;
									const clipWidth = videoWidth * scaleX;
									const clipHeight = videoHeight * scaleY;

									if (x >= clipX && x <= clipX + clipWidth && y >= clipY && y <= clipY + clipHeight) {
										setSelectedClip(clip.id);
										return;
									}
								}
							} else if (layer.type === "image" || clip.data?.type === "image") {
								const img = imageElementsRef.current.get(clip.resourceId);
								if (img) {
									const imgWidth = img.naturalWidth || localCanvasSize.width;
									const imgHeight = img.naturalHeight || localCanvasSize.height;

									const clipX = position.x !== 0 ? position.x : (localCanvasSize.width - imgWidth) / 2;
									const clipY = position.y !== 0 ? position.y : (localCanvasSize.height - imgHeight) / 2;
									const clipWidth = imgWidth * scaleX;
									const clipHeight = imgHeight * scaleY;

									if (x >= clipX && x <= clipX + clipWidth && y >= clipY && y <= clipY + clipHeight) {
										setSelectedClip(clip.id);
										return;
									}
								}
							} else if (layer.type === "text" || clip.data?.type === "text") {
								// Check text clip bounds
								const textDims = textDimensionsRef.current.get(`text-${clip.id}`);

								// Calculate fallback dimensions if not yet rendered
								let estimatedWidth = 200;
								let estimatedHeight = 60;

								if (textDims) {
									estimatedWidth = textDims.width;
									estimatedHeight = textDims.height;
								} else if (clip.data?.text && clip.data?.fontSize) {
									// Estimate dimensions based on text content
									const text = String(clip.data.text);
									const fontSize = Number(clip.data.fontSize) || 48;
									const lines = text.split("\n");
									estimatedHeight = lines.length * fontSize * 1.2;
									// Rough estimation: average character width is ~0.6 of font size
									const maxLineLength = Math.max(...lines.map((l: string) => l.length));
									estimatedWidth = maxLineLength * fontSize * 0.6;
								}

								const clipX = position.x !== 0 ? position.x : localCanvasSize.width / 2;
								const clipY = position.y !== 0 ? position.y : localCanvasSize.height / 2;
								const clipWidth = estimatedWidth * scaleX;
								const clipHeight = estimatedHeight * scaleY;

								// Add some padding for easier clicking
								const padding = 10;
								if (
									x >= clipX - padding &&
									x <= clipX + clipWidth + padding &&
									y >= clipY - padding &&
									y <= clipY + clipHeight + padding
								) {
									setSelectedClip(clip.id);
									return;
								}
							}
						}
						// Click on empty area - deselect
						setSelectedClip(null);
					}}
				/>

				{/* Resize overlay for selected video clip */}
				{selectedClip && (selectedClipLayerType === "video" || selectedClip.data?.type === "video") && (
					<ImageResizeOverlay
						clip={selectedClip}
						canvasWidth={displaySize.width}
						canvasHeight={displaySize.height}
						onResize={handleResize}
						imageWidth={
							videoDimensions.get(selectedClip.resourceId)?.width || selectedClip.data?.width || localCanvasSize.width
						}
						imageHeight={
							videoDimensions.get(selectedClip.resourceId)?.height ||
							selectedClip.data?.height ||
							localCanvasSize.height
						}
						scaleRatio={displaySize.width / localCanvasSize.width}
						canvasSizeWidth={localCanvasSize.width}
						canvasSizeHeight={localCanvasSize.height}
					/>
				)}

				{/* Resize overlay for selected image clip */}
				{selectedClip && (selectedClipLayerType === "image" || selectedClip.data?.type === "image") && (
					<ImageResizeOverlay
						clip={selectedClip}
						canvasWidth={displaySize.width}
						canvasHeight={displaySize.height}
						onResize={handleResize}
						imageWidth={
							imageDimensions.get(selectedClip.resourceId)?.width || selectedClip.data?.width || localCanvasSize.width
						}
						imageHeight={
							imageDimensions.get(selectedClip.resourceId)?.height ||
							selectedClip.data?.height ||
							localCanvasSize.height
						}
						scaleRatio={displaySize.width / localCanvasSize.width}
						canvasSizeWidth={localCanvasSize.width}
						canvasSizeHeight={localCanvasSize.height}
					/>
				)}

				{/* Resize overlay for selected text clip */}
				{selectedClip && (selectedClipLayerType === "text" || selectedClip.data?.type === "text") && (
					<ImageResizeOverlay
						clip={selectedClip}
						canvasWidth={displaySize.width}
						canvasHeight={displaySize.height}
						onResize={handleResize}
						onUpdateClip={updateClip}
						imageWidth={textDimensions.get(`text-${selectedClip.id}`)?.width || 200}
						imageHeight={textDimensions.get(`text-${selectedClip.id}`)?.height || 60}
						scaleRatio={displaySize.width / localCanvasSize.width}
						canvasSizeWidth={localCanvasSize.width}
						canvasSizeHeight={localCanvasSize.height}
						centerAtPoint={true}
					/>
				)}
			</div>

			{!isReady && (
				<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
					<div className="text-white text-sm">Loading preview...</div>
				</div>
			)}
			{isReady && layers.length === 0 && (
				<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
					<div className="text-center text-gray-400 space-y-2 p-4">
						<p className="text-sm font-medium">Timeline Preview</p>
						<p className="text-xs">Drag resources to the timeline to see them here</p>
					</div>
				</div>
			)}
			{isReady && layers.length > 0 && layers.every((layer) => layer.clips.length === 0) && (
				<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
					<div className="text-center text-gray-400 space-y-2 p-4">
						<p className="text-sm font-medium">Timeline Preview</p>
						<p className="text-xs">No clips on timeline yet</p>
					</div>
				</div>
			)}
		</div>
	);
}
