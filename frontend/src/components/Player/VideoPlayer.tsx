import { useEffect, useRef, useState, useCallback } from "react";
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
	const { state, updateClip, setSelectedClip } = useTimeline();
	const { layers, currentTime, isPlaying, selectedClipId } = state;

	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
	const imageElementsRef = useRef<Map<string, HTMLImageElement>>(new Map());
	const animationFrameRef = useRef<number | undefined>(undefined);
	const isFrameScheduledRef = useRef<boolean>(false);
	const layersRef = useRef<TimelineLayer[]>(layers);
	const currentTimeRef = useRef<number>(currentTime);
	const lastRenderTimeRef = useRef<number>(0);
	const isScrubbingRef = useRef<boolean>(false);
	const scrubTimeoutRef = useRef<number | undefined>(undefined);
	const canvasSizeRef = useRef({ width: initialWidth || 1080, height: initialHeight || 1920 });
	const [isReady, setIsReady] = useState(false);
	const [displaySize, setDisplaySize] = useState({ width: 0, height: 0 });
	const [canvasSize, setCanvasSize] = useState({ width: initialWidth || 1080, height: initialHeight || 1920 });
	const [imageDimensions, setImageDimensions] = useState<Map<string, { width: number; height: number }>>(new Map());

	// Update refs when state changes and detect scrubbing
	useEffect(() => {
		layersRef.current = layers;
		canvasSizeRef.current = canvasSize;
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
	}, [layers, currentTime, isPlaying, canvasSize]);

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
	 * Detect canvas size based on the first video's dimensions
	 */
	useEffect(() => {
		const detectCanvasSize = async () => {
			// If dimensions are explicitly provided, use them
			if (initialWidth && initialHeight) {
				setCanvasSize({ width: initialWidth, height: initialHeight });
				return;
			}

			// Find the first video clip
			const firstVideoClip = layers.flatMap((layer) => layer.clips).find((clip) => clip.data?.type === "video");

			if (firstVideoClip && videoElementsRef.current.has(firstVideoClip.resourceId)) {
				const video = videoElementsRef.current.get(firstVideoClip.resourceId);
				if (video && video.videoWidth && video.videoHeight) {
					setCanvasSize({ width: video.videoWidth, height: video.videoHeight });
				}
			}
		};

		if (isReady) {
			detectCanvasSize();
		}
	}, [isReady, layers, initialWidth, initialHeight]);

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
			const aspectRatio = canvasSize.width / canvasSize.height;
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
	}, [canvasSize]);

	/**
	 * Load video and image elements for all clips
	 */
	useEffect(() => {
		const loadMediaElements = async () => {
			const videoClips = layers.flatMap((layer) => layer.clips).filter((clip) => clip.data?.type === "video");
			const imageClips = layers.flatMap((layer) => layer.clips).filter((clip) => clip.data?.type === "image");

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
	}, [layers]);

	/**
	 * Get clips that should be visible at the current time
	 */
	const getVisibleClips = useCallback(
		(currentTime: number): Array<{ clip: Clip; layer: TimelineLayer }> => {
			const visibleClips: Array<{ clip: Clip; layer: TimelineLayer }> = [];

			for (const layer of layers) {
				if (!layer.visible) continue;

				for (const clip of layer.clips) {
					const clipEndTime = clip.startTime + clip.duration;

					// Check if current time falls within clip's time range
					if (currentTime >= clip.startTime && currentTime < clipEndTime) {
						visibleClips.push({ clip, layer });
					}
				}
			}

			// Sort by layer order (bottom to top)
			visibleClips.sort((a, b) => {
				const layerIndexA = layers.indexOf(a.layer);
				const layerIndexB = layers.indexOf(b.layer);
				return layerIndexA - layerIndexB;
			});

			return visibleClips;
		},
		[layers]
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
	 */
	const drawVideoClip = useCallback(
		(ctx: CanvasRenderingContext2D, clip: Clip, localTime: number) => {
			const video = videoElementsRef.current.get(clip.resourceId);
			if (!video || video.readyState < 2) return; // Not ready

			// Calculate video time with trim offset
			const videoTime = localTime + clip.trimStart;

			// Adaptive seeking: tighter tolerance for scrubbing, looser for playback
			const isScrubbing = isScrubbingRef.current;
			const seekThreshold = isScrubbing ? 0.1 : 0.25; // 100ms when scrubbing, 250ms when playing

			const timeDiff = Math.abs(video.currentTime - videoTime);

			// Only seek if out of sync beyond threshold
			if (timeDiff > seekThreshold) {
				video.currentTime = videoTime;
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

			const {
				text = "",
				fontFamily = "Arial",
				fontSize = 48,
				color = "#ffffff",
				textAlign = "center",
				textBaseline = "middle",
			} = clip.data;

			const x = clip.position?.x ?? canvasSizeRef.current.width / 2;
			const y = clip.position?.y ?? canvasSizeRef.current.height / 2;
			// Draw text with optional stroke
			if (clip.data.strokeColor) {
				ctx.strokeStyle = clip.data.strokeColor;
				ctx.lineWidth = clip.data.strokeWidth || 2;
				ctx.strokeText(text, x, y);
			}

			ctx.fillText(text, x, y);
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
	}, [currentTime, isReady, renderFrame, layers]); // Added layers to trigger re-render on clip updates

	/**
	 * Synchronize video playback with timeline
	 * Play/pause video elements based on isPlaying state
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

		// If playing, handle visible clips
		const visibleClips = getVisibleClips(currentTime);
		const videoClips = visibleClips.filter(({ clip, layer }) => layer.type === "video" || clip.data?.type === "video");

		// Play or pause all visible video clips
		videoClips.forEach(({ clip }) => {
			const video = videoElementsRef.current.get(clip.resourceId);
			if (!video || video.readyState < 2) return;

			const localTime = currentTime - clip.startTime;
			const videoTime = localTime + clip.trimStart;

			// Sync video time with timeline position
			// Use moderate threshold during playback to balance accuracy and smoothness
			const timeDiff = Math.abs(video.currentTime - videoTime);
			if (timeDiff > 0.2) {
				video.currentTime = videoTime;
			}

			// Unmute video during playback if it's on a video layer
			// (audio layers would handle audio separately)
			video.muted = false;

			// Only play if video is paused to avoid repeated play() calls
			if (video.paused) {
				video.play().catch((err) => {
					console.warn("Failed to play video:", err);
				});
			}
		});

		// Pause and mute all videos not currently visible
		videoElementsRef.current.forEach((video, resourceId) => {
			const isVisible = videoClips.some(({ clip }) => clip.resourceId === resourceId);
			if (!isVisible) {
				if (!video.paused) {
					video.pause();
				}
				video.muted = true;
			}
		});
	}, [isPlaying, currentTime, isReady, layers, getVisibleClips]);

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
					width={canvasSize.width}
					height={canvasSize.height}
					style={{
						width: displaySize.width ? `${displaySize.width}px` : "100%",
						height: displaySize.height ? `${displaySize.height}px` : "100%",
						display: "block",
					}}
					className="bg-black"
					onClick={(e) => {
						const rect = e.currentTarget.getBoundingClientRect();
						const x = ((e.clientX - rect.left) / rect.width) * canvasSize.width;
						const y = ((e.clientY - rect.top) / rect.height) * canvasSize.height;

						// Find clicked clip
						const visibleClips = getVisibleClips(currentTime);
						for (let i = visibleClips.length - 1; i >= 0; i--) {
							const { clip, layer } = visibleClips[i];
							if (layer.type === "image" || clip.data?.type === "image") {
								const img = imageElementsRef.current.get(clip.resourceId);
								if (img) {
									const imgWidth = img.naturalWidth || canvasSize.width;
									const imgHeight = img.naturalHeight || canvasSize.height;
									const localTime = currentTime - clip.startTime;
									const interpolated = getInterpolatedProperties(clip, localTime);
									const scale = interpolated.scale;
									const position = interpolated.position;

									const clipX = position.x !== 0 ? position.x : (canvasSize.width - imgWidth) / 2;
									const clipY = position.y !== 0 ? position.y : (canvasSize.height - imgHeight) / 2;
									const scaleX = typeof scale === "number" ? scale : scale.x;
									const scaleY = typeof scale === "number" ? scale : scale.y;
									const clipWidth = imgWidth * scaleX;
									const clipHeight = imgHeight * scaleY;

									if (x >= clipX && x <= clipX + clipWidth && y >= clipY && y <= clipY + clipHeight) {
										setSelectedClip(clip.id);
										return;
									}
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
						imageWidth={imageDimensions.get(selectedClip.resourceId)?.width || canvasSize.width}
						imageHeight={imageDimensions.get(selectedClip.resourceId)?.height || canvasSize.height}
						scaleRatio={displaySize.width / canvasSize.width}
						canvasSizeWidth={canvasSize.width}
						canvasSizeHeight={canvasSize.height}
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
