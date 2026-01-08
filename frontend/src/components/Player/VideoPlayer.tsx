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
	const [isReady, setIsReady] = useState(false);
	const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
	const [localCanvasSize, setLocalCanvasSize] = useState({
		width: initialWidth || 1080,
		height: initialHeight || 1920,
	});
	const [imageDimensions, setImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());

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

	// Get selected clip for resize overlay
	const selectedClip = selectedClipId
		? layers.flatMap((layer) => layer.clips).find((clip) => clip.id === selectedClipId)
		: null;

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
	 * Detect canvas size based on the first video's dimensions
	 * Uses mediaClipsKey to avoid re-running when only mute changes
	 */
	useEffect(() => {
		const detectCanvasSize = async () => {
			// If dimensions are explicitly provided, use them
			if (initialWidth && initialHeight) {
				setLocalCanvasSize({ width: initialWidth, height: initialHeight });
				setCanvasSize(initialWidth, initialHeight);
				return;
			}

			// Find the first video clip using ref
			const currentLayers = layersRef.current;
			const firstVideoClip = currentLayers.flatMap((layer) => layer.clips).find((clip) => clip.data?.type === "video");

			if (firstVideoClip && videoElementsRef.current.has(firstVideoClip.resourceId)) {
				const video = videoElementsRef.current.get(firstVideoClip.resourceId);
				if (video && video.videoWidth && video.videoHeight) {
					setLocalCanvasSize({ width: video.videoWidth, height: video.videoHeight });
					setCanvasSize(video.videoWidth, video.videoHeight);
				}
			}
		};

		if (isReady) {
			detectCanvasSize();
		}
	}, [isReady, mediaClipsKey, initialWidth, initialHeight, setCanvasSize]); // Use mediaClipsKey instead of layers

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
	 * Load video and image elements for all clips
	 * Uses mediaClipsKey to avoid re-running when only mute changes
	 */
	useEffect(() => {
		const loadMediaElements = async () => {
			// Use refs to get current layers without dependency issues
			const currentLayers = layersRef.current;
			const videoClips = currentLayers.flatMap((layer) => layer.clips).filter((clip) => clip.data?.type === "video");
			const imageClips = currentLayers.flatMap((layer) => layer.clips).filter((clip) => clip.data?.type === "image");

			// Create video elements for clips that don't have them
			for (const clip of videoClips) {
				if (!videoElementsRef.current.has(clip.resourceId)) {
					const video = document.createElement("video");
					video.crossOrigin = "anonymous";
					video.preload = "auto";
					video.muted = true;

					// Set video source (assuming resourceId is the URL or needs to be fetched)
					// TODO: Replace with actual media URL from resource
					video.src = `/api/media/${clip.resourceId}/file`;

					videoElementsRef.current.set(clip.resourceId, video);

					// Wait for video to be ready
					await new Promise<void>((resolve) => {
						video.addEventListener("loadeddata", () => resolve(), { once: true });
					});
				}
			}

			// Create image elements for clips that don't have them
			for (const clip of imageClips) {
				if (!imageElementsRef.current.has(clip.resourceId)) {
					const img = new Image();
					img.crossOrigin = "anonymous";
					img.src = `/api/media/${clip.resourceId}/file`;

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
	 * Calculate opacity for transition effects
	 */
	const calculateTransitionOpacity = (clip: Clip, localTime: number): number => {
		let opacity = clip.opacity ?? 1.0;

		// Apply fade in transition
		if (clip.transitions?.in) {
			const transition = clip.transitions.in;
			if (localTime < transition.duration) {
				const fadeProgress = localTime / transition.duration;

				if (transition.type === "fade") {
					opacity *= fadeProgress;
				}
			}
		}

		// Apply fade out transition
		if (clip.transitions?.out) {
			const transition = clip.transitions.out;
			const fadeOutStart = clip.duration - transition.duration;

			if (localTime > fadeOutStart) {
				const fadeProgress = (clip.duration - localTime) / transition.duration;

				if (transition.type === "fade") {
					opacity *= fadeProgress;
				}
			}
		}

		return opacity;
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

			// Calculate position (center video if not specified)
			const x = position.x !== 0 ? position.x : (canvasSizeRef.current.width - videoWidth) / 2;
			const y = position.y !== 0 ? position.y : (canvasSizeRef.current.height - videoHeight) / 2;

			// Handle both uniform and non-uniform scaling
			const scaleX = typeof scale === "number" ? scale : scale.x;
			const scaleY = typeof scale === "number" ? scale : scale.y;

			// Calculate transition opacity and combine with keyframe opacity
			const transitionOpacity = calculateTransitionOpacity(clip, localTime);
			const opacity = transitionOpacity * interpolated.opacity;

			// Save canvas state
			ctx.save();

			// Apply transformations
			ctx.globalAlpha = opacity;
			ctx.translate(x + (videoWidth * scaleX) / 2, y + (videoHeight * scaleY) / 2);
			ctx.rotate((rotation * Math.PI) / 180);
			ctx.translate(-(videoWidth * scaleX) / 2, -(videoHeight * scaleY) / 2);

			// Draw video frame using its dimensions with scaling
			ctx.drawImage(video, 0, 0, videoWidth * scaleX, videoHeight * scaleY);

			// Restore canvas state
			ctx.restore();
		},
		[] // Stable callback - uses refs for dynamic values
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

			// Calculate position (center image if not specified)
			const x = position.x !== 0 ? position.x : (canvasSizeRef.current.width - imgWidth) / 2;
			const y = position.y !== 0 ? position.y : (canvasSizeRef.current.height - imgHeight) / 2;
			// Handle both uniform and non-uniform scaling
			const scaleX = typeof scale === "number" ? scale : scale.x;
			const scaleY = typeof scale === "number" ? scale : scale.y;

			// Calculate transition opacity and combine with keyframe opacity
			const transitionOpacity = calculateTransitionOpacity(clip, localTime);
			const opacity = transitionOpacity * interpolated.opacity;

			// Save canvas state
			ctx.save();

			// Apply transformations
			ctx.globalAlpha = opacity;
			ctx.translate(x + (imgWidth * scaleX) / 2, y + (imgHeight * scaleY) / 2);
			ctx.rotate((rotation * Math.PI) / 180);
			ctx.translate(-(imgWidth * scaleX) / 2, -(imgHeight * scaleY) / 2);

			// Draw image frame using its dimensions with scaling
			ctx.drawImage(img, 0, 0, imgWidth * scaleX, imgHeight * scaleY);

			// Restore canvas state
			ctx.restore();
		},
		[] // Use refs for canvas size, no dependencies needed
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

			// Calculate position (center if position is 0,0)
			const x = position.x !== 0 ? position.x : canvasSizeRef.current.width / 2;
			const y = position.y !== 0 ? position.y : canvasSizeRef.current.height / 2;

			// Handle both uniform and non-uniform scaling
			const scaleX = typeof scale === "number" ? scale : scale.x;
			const scaleY = typeof scale === "number" ? scale : scale.y;

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
		[] // Stable callback - uses refs for dynamic values
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
	 * NOTE: Mute state is handled separately by the mute sync effect
	 */
	useEffect(() => {
		if (!isReady) return;

		// If not playing, pause all videos immediately
		if (!isPlaying) {
			videoElementsRef.current.forEach((video) => {
				if (!video.paused) {
					video.pause();
				}
				video.muted = true;
			});
			return;
		}

		// If playing, handle visible clips using refs for stability
		const currentLayers = layersRef.current;
		const time = currentTimeRef.current;
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

		// Play all visible video clips (don't touch mute state - handled by mute sync effect)
		visibleVideoClips.forEach(({ clip, resourceId }) => {
			const video = videoElementsRef.current.get(resourceId);
			if (!video || video.readyState < 2) return;

			const localTime = time - clip.startTime;
			const videoTime = localTime + clip.trimStart;

			// Only seek if video is significantly out of sync (> 0.5s)
			// This prevents constant seeking during normal playback
			// Small drifts are acceptable and less disruptive than seeking
			const timeDiff = Math.abs(video.currentTime - videoTime);
			if (timeDiff > 0.5) {
				video.currentTime = videoTime;
			}

			// Only play if video is paused to avoid repeated play() calls
			if (video.paused) {
				video.play().catch((err) => {
					console.warn("Failed to play video:", err);
				});
			}
		});

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

	return (
		<div
			ref={containerRef}
			className={`relative ${className}`}
			style={{ display: "flex", alignItems: "center", justifyContent: "center", padding: "12px" }}>
			{/* Wrapper for canvas and overlay to ensure they align */}
			<div
				style={{
					position: "relative",
					border: "2px solid rgba(134, 165, 217, 0.4)",
					borderRadius: "4px",
					boxShadow: "0 0 20px rgba(0, 0, 0, 0.5)",
					padding: "8px",
				}}>
				<canvas
					ref={canvasRef}
					width={localCanvasSize.width}
					height={localCanvasSize.height}
					style={{
						width: displaySize.width ? `${displaySize.width}px` : "100%",
						height: displaySize.height ? `${displaySize.height}px` : "100%",
						display: "block",
					}}
					className="bg-black"
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

							if (layer.type === "image" || clip.data?.type === "image") {
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

				{/* Resize overlay for selected image clip */}
				{selectedClip && selectedClip.data?.type === "image" && (
					<ImageResizeOverlay
						clip={selectedClip}
						canvasWidth={displaySize.width}
						canvasHeight={displaySize.height}
						onResize={handleResize}
						imageWidth={imageDimensions.get(selectedClip.resourceId)?.width || localCanvasSize.width}
						imageHeight={imageDimensions.get(selectedClip.resourceId)?.height || localCanvasSize.height}
						scaleRatio={displaySize.width / localCanvasSize.width}
						canvasSizeWidth={localCanvasSize.width}
						canvasSizeHeight={localCanvasSize.height}
					/>
				)}

				{/* Resize overlay for selected text clip */}
				{selectedClip && selectedClip.data?.type === "text" && (
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
