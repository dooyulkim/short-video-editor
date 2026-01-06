import React, { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import { TimelineRuler } from "./TimelineRuler";
import type { TimelineLayer, Clip } from "@/types/timeline";
import type { MediaResource } from "@/types/media";
import { Plus, Minus, Video, Music, Image as ImageIcon, Type, Trash2, Eye, EyeOff, RotateCcw } from "lucide-react";
import { useTimeline } from "@/context/TimelineContext";
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface TimelineProps {
	initialLayers?: TimelineLayer[];
	initialDuration?: number;
}

const TIMELINE_HEIGHT = 400;
const LAYER_HEIGHT = 60;
const MIN_ZOOM = 5; // pixels per second
const MAX_ZOOM = 200; // pixels per second
const DEFAULT_ZOOM = 50; // pixels per second

/**
 * Timeline component - Canvas-based timeline visualization
 * Displays multiple layers with clips, time ruler, and playhead
 */
export const Timeline: React.FC<TimelineProps> = ({ initialLayers = [], initialDuration = 120 }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const rulerScrollRef = useRef<HTMLDivElement>(null);

	const timeline = useTimeline();
	const [layers, setLayers] = useState<TimelineLayer[]>(initialLayers);
	const [currentTime, setCurrentTime] = useState<number>(0);
	const isPlaying = timeline?.state.isPlaying || false;
	const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);
	const [duration, setDuration] = useState<number>(initialDuration);
	const [isDragOver, setIsDragOver] = useState<boolean>(false);
	const [selectedClipId, setSelectedClipId] = useState<string | null>(null);
	const [isDraggingClip, setIsDraggingClip] = useState<boolean>(false);
	const [dragStartX, setDragStartX] = useState<number>(0);
	const [clipDragStartTime, setClipDragStartTime] = useState<number>(0);
	const [cursorStyle, setCursorStyle] = useState<string>("default");
	const [draggingLayerId, setDraggingLayerId] = useState<string | null>(null);
	const [dragOverLayerId, setDragOverLayerId] = useState<string | null>(null);
	const [resizingClip, setResizingClip] = useState<{
		clipId: string;
		edge: "left" | "right";
		layerIndex: number;
	} | null>(null);
	const [resizeStartTime, setResizeStartTime] = useState<number>(0);
	const [resizeStartDuration, setResizeStartDuration] = useState<number>(0);

	const timelineWidth = duration * zoom;

	// Sync with timeline context if available
	useEffect(() => {
		if (timeline?.state.layers.length > 0) {
			setLayers(timeline.state.layers);
		}
	}, [timeline?.state.layers]);

	useEffect(() => {
		if (timeline?.state.duration > 0) {
			setDuration(timeline.state.duration);
		}
	}, [timeline?.state.duration]);

	// Sync zoom with timeline context
	useEffect(() => {
		if (timeline?.state.zoom) {
			setZoom(timeline.state.zoom);
		}
	}, [timeline?.state.zoom]);

	// Sync currentTime with timeline context
	useEffect(() => {
		if (timeline?.state.currentTime !== undefined) {
			setCurrentTime(timeline.state.currentTime);
		}
	}, [timeline?.state.currentTime]);

	// Sync ruler scroll with canvas scroll
	useEffect(() => {
		const canvasScroll = scrollContainerRef.current;
		const rulerScroll = rulerScrollRef.current;

		if (!canvasScroll || !rulerScroll) return;

		const handleCanvasScroll = () => {
			rulerScroll.scrollLeft = canvasScroll.scrollLeft;
		};

		canvasScroll.addEventListener("scroll", handleCanvasScroll);
		return () => canvasScroll.removeEventListener("scroll", handleCanvasScroll);
	}, []);

	// Auto-scroll timeline during playback
	useEffect(() => {
		if (!isPlaying) return;

		const canvasScroll = scrollContainerRef.current;
		const rulerScroll = rulerScrollRef.current;

		if (!canvasScroll || !rulerScroll) return;

		// Calculate playhead position in pixels
		const playheadX = currentTime * zoom;

		// Get container width
		const containerWidth = canvasScroll.clientWidth;
		const scrollLeft = canvasScroll.scrollLeft;

		// Check if playhead is near the right edge (within 20% of container width)
		const scrollThreshold = containerWidth * 0.8;

		// Auto-scroll if playhead is beyond the threshold
		if (playheadX > scrollLeft + scrollThreshold) {
			const newScrollLeft = playheadX - containerWidth * 0.3; // Keep playhead at 30% from left
			canvasScroll.scrollLeft = newScrollLeft;
			rulerScroll.scrollLeft = newScrollLeft;
		}
		// Also scroll if playhead goes off the left edge
		else if (playheadX < scrollLeft) {
			canvasScroll.scrollLeft = playheadX - containerWidth * 0.3;
			rulerScroll.scrollLeft = playheadX - containerWidth * 0.3;
		}
	}, [isPlaying, currentTime, zoom]);

	// Playback loop - update currentTime during playback
	useEffect(() => {
		if (!isPlaying) return;

		let animationFrameId: number;
		let lastTimestamp: number | null = null;
		let currentPlaybackTime = currentTime;
		let lastUpdateTime = currentTime;
		const playbackSpeed = 1.0; // Playback speed multiplier (1.0 = normal speed)
		const updateInterval = 1 / 60; // Update at 60fps for smooth playback (~16ms)

		const animate = (timestamp: number) => {
			if (lastTimestamp === null) {
				lastTimestamp = timestamp;
				animationFrameId = requestAnimationFrame(animate);
				return;
			}

			// Calculate elapsed time in seconds with playback speed
			const deltaTime = ((timestamp - lastTimestamp) / 1000) * playbackSpeed;
			lastTimestamp = timestamp;

			// Update current time
			currentPlaybackTime += deltaTime;

			// Check if reached end of timeline
			if (currentPlaybackTime >= duration) {
				setCurrentTime(duration);
				if (timeline) {
					timeline.setCurrentTime(duration);
					timeline.pause();
				}
				return;
			}

			// Only update state at defined intervals to reduce re-renders
			if (currentPlaybackTime - lastUpdateTime >= updateInterval) {
				setCurrentTime(currentPlaybackTime);
				if (timeline) {
					timeline.setCurrentTime(currentPlaybackTime);
				}
				lastUpdateTime = currentPlaybackTime;
			}

			// Continue animation loop
			animationFrameId = requestAnimationFrame(animate);
		};

		// Start animation loop
		animationFrameId = requestAnimationFrame(animate);

		// Cleanup
		return () => {
			if (animationFrameId) {
				cancelAnimationFrame(animationFrameId);
			}
		};
		// eslint-disable-next-line react-hooks/exhaustive-deps
	}, [isPlaying, duration, timeline]);

	// Handle keyboard events for clip deletion
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Delete key pressed and a clip is selected
			if ((e.key === "Delete" || e.key === "Backspace") && selectedClipId && timeline) {
				e.preventDefault();
				timeline.removeClip(selectedClipId);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [selectedClipId, timeline]);

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Set canvas dimensions
		canvas.width = timelineWidth;
		canvas.height = layers.length * LAYER_HEIGHT || LAYER_HEIGHT;

		// Clear canvas
		ctx.clearRect(0, 0, canvas.width, canvas.height);

		// Draw background
		ctx.fillStyle = "#1a1a1a";
		ctx.fillRect(0, 0, canvas.width, canvas.height);

		/**
		 * Get color for clip
		 */
		const getClipColor = (): string => {
			return "#3b82f6"; // Default blue
		};

		/**
		 * Draw a single clip as a rectangle
		 */
		const drawClip = (clip: Clip, layerY: number) => {
			const x = clip.startTime * zoom;
			const width = clip.duration * zoom;
			const height = LAYER_HEIGHT - 10;
			const y = layerY + 5;

			const isSelected = clip.id === selectedClipId;

			// Draw clip background
			const clipColor = getClipColor();
			ctx.fillStyle = isSelected ? "#4f46e5" : clipColor; // Darker blue when selected
			ctx.fillRect(x, y, width, height);

			// Draw clip border
			ctx.strokeStyle = isSelected ? "#818cf8" : "#555"; // Brighter border when selected
			ctx.lineWidth = isSelected ? 3 : 2;
			ctx.strokeRect(x, y, width, height);

			// Draw resize handles when selected
			if (isSelected) {
				const handleWidth = 6;
				ctx.fillStyle = "#818cf8";
				// Left handle
				ctx.fillRect(x, y, handleWidth, height);
				// Right handle
				ctx.fillRect(x + width - handleWidth, y, handleWidth, height);
			}

			// Draw clip name
			ctx.fillStyle = "#fff";
			ctx.font = "12px sans-serif";
			ctx.textAlign = "left";
			const clipName = clip.resourceId.substring(0, 20) + "...";
			ctx.fillText(clipName, x + 5, y + height / 2 + 4);

			// Draw trim indicators if clip is trimmed
			if (clip.trimStart > 0 || clip.trimEnd > 0) {
				ctx.fillStyle = "rgba(255, 255, 0, 0.3)";
				if (clip.trimStart > 0) {
					ctx.fillRect(x, y, 5, height);
				}
				if (clip.trimEnd > 0) {
					ctx.fillRect(x + width - 5, y, 5, height);
				}
			}
		};

		/**
		 * Draw a single layer with its clips
		 */
		const drawLayer = (layer: TimelineLayer, layerIndex: number) => {
			const y = layerIndex * LAYER_HEIGHT;

			// Draw layer background
			ctx.fillStyle = layerIndex % 2 === 0 ? "#222" : "#2a2a2a";
			ctx.fillRect(0, y, timelineWidth, LAYER_HEIGHT);

			// Draw layer border
			ctx.strokeStyle = "#444";
			ctx.lineWidth = 1;
			ctx.strokeRect(0, y, timelineWidth, LAYER_HEIGHT);

			// Draw clips in this layer
			if (layer.visible) {
				layer.clips.forEach((clip) => {
					drawClip(clip, y);
				});
			}

			// Draw empty state message if no clips
			if (layer.clips.length === 0) {
				ctx.fillStyle = "#666";
				ctx.font = "11px sans-serif";
				ctx.textAlign = "center";
				ctx.fillText("Drop media here", timelineWidth / 2, y + LAYER_HEIGHT / 2);
			}
		};

		// Draw layers (reversed so top layer in UI is rendered on top)
		[...layers].reverse().forEach((layer, reversedIndex) => {
			drawLayer(layer, reversedIndex);
		});
	}, [layers, currentTime, zoom, duration, timelineWidth, selectedClipId]);

	/**
	 * Find clip at a given position
	 */
	const findClipAtPosition = (x: number, y: number): { clip: Clip; layerIndex: number } | null => {
		const reversedLayers = [...layers].reverse();
		const layerIndex = Math.floor(y / LAYER_HEIGHT);
		if (layerIndex < 0 || layerIndex >= reversedLayers.length) return null;

		const layer = reversedLayers[layerIndex];
		// Get the actual index in the original array
		const actualLayerIndex = layers.length - 1 - layerIndex;
		const time = x / zoom;

		for (const clip of layer.clips) {
			const clipStart = clip.startTime;
			const clipEnd = clip.startTime + clip.duration;

			if (time >= clipStart && time <= clipEnd) {
				return { clip, layerIndex: actualLayerIndex };
			}
		}

		return null;
	};

	/**
	 * Check if cursor is near clip edge for resizing
	 */
	const getClipEdge = (x: number, y: number): { clip: Clip; edge: "left" | "right"; layerIndex: number } | null => {
		const EDGE_THRESHOLD = 8; // pixels
		const reversedLayers = [...layers].reverse();
		const layerIndex = Math.floor(y / LAYER_HEIGHT);
		if (layerIndex < 0 || layerIndex >= reversedLayers.length) return null;

		const layer = reversedLayers[layerIndex];
		const actualLayerIndex = layers.length - 1 - layerIndex;
		const time = x / zoom;

		for (const clip of layer.clips) {
			const clipStart = clip.startTime;
			const clipEnd = clip.startTime + clip.duration;
			const clipStartX = clipStart * zoom;
			const clipEndX = clipEnd * zoom;

			// Check left edge
			if (Math.abs(x - clipStartX) < EDGE_THRESHOLD && time >= clipStart - 0.1 && time <= clipEnd) {
				return { clip, edge: "left", layerIndex: actualLayerIndex };
			}
			// Check right edge
			if (Math.abs(x - clipEndX) < EDGE_THRESHOLD && time >= clipStart && time <= clipEnd + 0.1) {
				return { clip, edge: "right", layerIndex: actualLayerIndex };
			}
		}

		return null;
	};

	/**
	 * Handle mouse down on canvas for clip selection
	 */
	const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
		const y = e.clientY - rect.top + (scrollContainerRef.current?.scrollTop || 0);

		// Check if clicking on clip edge for resizing
		const edgeInfo = getClipEdge(x, y);
		if (edgeInfo) {
			setResizingClip({ clipId: edgeInfo.clip.id, edge: edgeInfo.edge, layerIndex: edgeInfo.layerIndex });
			setSelectedClipId(edgeInfo.clip.id);
			setResizeStartTime(edgeInfo.clip.startTime);
			setResizeStartDuration(edgeInfo.clip.duration);
			setDragStartX(x);
			if (timeline) {
				timeline.setSelectedClip(edgeInfo.clip.id);
			}
			return;
		}

		// Check if clicking on a clip
		const clipAtPosition = findClipAtPosition(x, y);

		if (clipAtPosition) {
			// Select and start dragging the clip
			setSelectedClipId(clipAtPosition.clip.id);
			setIsDraggingClip(true);
			setDragStartX(x);
			setClipDragStartTime(clipAtPosition.clip.startTime);
			if (timeline) {
				timeline.setSelectedClip(clipAtPosition.clip.id);
			}
		} else {
			// Deselect clip
			setSelectedClipId(null);
			if (timeline) {
				timeline.setSelectedClip(null);
			}
		}
	};

	/**
	 * Handle mouse move for clip dragging and resizing
	 */
	const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
		const y = e.clientY - rect.top + (scrollContainerRef.current?.scrollTop || 0);

		if (resizingClip) {
			// Resize the clip
			const deltaX = x - dragStartX;
			const deltaTime = deltaX / zoom;

			if (resizingClip.edge === "left") {
				// Resize from left edge (change startTime and duration)
				const newStartTime = Math.max(0, resizeStartTime + deltaTime);
				const deltaStart = newStartTime - resizeStartTime;
				const newDuration = Math.max(0.1, resizeStartDuration - deltaStart);

				if (timeline) {
					const layerIndex = layers.findIndex((layer) => layer.clips.some((clip) => clip.id === resizingClip.clipId));
					if (layerIndex !== -1) {
						timeline.moveClip(resizingClip.clipId, newStartTime);
						timeline.updateClip(resizingClip.clipId, { duration: newDuration });
					}
				}
			} else {
				// Resize from right edge (change duration only)
				const newDuration = Math.max(0.1, resizeStartDuration + deltaTime);

				if (timeline) {
					timeline.updateClip(resizingClip.clipId, { duration: newDuration });
				}
			}
			setCursorStyle("ew-resize");
		} else if (isDraggingClip && selectedClipId) {
			// Move the selected clip
			const deltaX = x - dragStartX;
			const deltaTime = deltaX / zoom;
			const newStartTime = Math.max(0, clipDragStartTime + deltaTime);

			// Update clip position
			if (timeline) {
				timeline.moveClip(selectedClipId, newStartTime);
			} else {
				// Fallback if timeline context is not available
				setLayers((prevLayers) => {
					return prevLayers.map((layer) => ({
						...layer,
						clips: layer.clips.map((clip) =>
							clip.id === selectedClipId ? { ...clip, startTime: newStartTime } : clip
						),
					}));
				});
			}
			setCursorStyle("grabbing");
		} else {
			// Update cursor based on hover
			const edgeInfo = getClipEdge(x, y);
			if (edgeInfo) {
				setCursorStyle("ew-resize");
			} else {
				const clipAtPosition = findClipAtPosition(x, y);
				setCursorStyle(clipAtPosition ? "grab" : "default");
			}
		}
	};

	/**
	 * Handle mouse up to stop dragging and resizing
	 */
	const handleCanvasMouseUp = () => {
		setIsDraggingClip(false);
		setResizingClip(null);
		setCursorStyle("default");
	};

	/**
	 * Handle drag over to allow drop
	 */
	const handleDragOver = (e: React.DragEvent) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "copy";
		setIsDragOver(true);
	};

	/**
	 * Handle drag leave
	 */
	const handleDragLeave = () => {
		setIsDragOver(false);
	};

	/**
	 * Handle drop of media resource onto timeline
	 */
	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);

		try {
			const data = e.dataTransfer.getData("application/json");
			if (!data) return;

			const resource: MediaResource = JSON.parse(data);

			// Calculate drop time based on position
			const canvas = canvasRef.current;
			if (!canvas) return;

			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
			const dropTime = Math.max(0, x / zoom);

			// Find or create a layer for this resource type
			let targetLayerIndex = layers.findIndex((layer) => layer.type === resource.type);

			// If no layer of this type exists, create one
			if (targetLayerIndex === -1 && timeline) {
				timeline.addLayer(resource.type);
				// The new layer will be at the end
				targetLayerIndex = layers.length;
			} else if (targetLayerIndex === -1) {
				// Fallback if timeline context is not available
				const newLayer: TimelineLayer = {
					id: `layer-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
					type: resource.type,
					clips: [],
					locked: false,
					visible: true,
					name: `${resource.type.charAt(0).toUpperCase() + resource.type.slice(1)} Layer ${layers.length + 1}`,
				};
				setLayers([...layers, newLayer]);
				targetLayerIndex = layers.length;
			}

			// Create a clip from the resource
			const newClip: Clip = {
				id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
				resourceId: resource.id,
				startTime: dropTime,
				duration: resource.duration || 5, // Default 5 seconds for images
				trimStart: 0,
				trimEnd: 0,
				data: {
					type: resource.type,
					url: resource.url,
					name: resource.name,
				},
			};

			// Add the clip to the layer
			if (timeline) {
				// Wait for the layer to be created if it was just added
				setTimeout(() => {
					const updatedLayerIndex = timeline.state.layers.findIndex((layer) => layer.type === resource.type);
					if (updatedLayerIndex !== -1) {
						timeline.addClip(newClip, updatedLayerIndex);
					}
				}, 100);
			} else {
				// Fallback if timeline context is not available
				const updatedLayers = [...layers];
				if (updatedLayers[targetLayerIndex]) {
					updatedLayers[targetLayerIndex] = {
						...updatedLayers[targetLayerIndex],
						clips: [...updatedLayers[targetLayerIndex].clips, newClip],
					};
					setLayers(updatedLayers);
				}
			}
		} catch (error) {
			console.error("Failed to handle drop:", error);
		}
	};

	/**
	 * Handle layer drag start
	 */
	const handleLayerDragStart = (e: React.DragEvent<HTMLDivElement>, layerId: string) => {
		e.dataTransfer.effectAllowed = "move";
		e.dataTransfer.setData("layerId", layerId);
		setDraggingLayerId(layerId);
	};

	/**
	 * Handle layer drag over
	 */
	const handleLayerDragOver = (e: React.DragEvent<HTMLDivElement>, layerId: string) => {
		e.preventDefault();
		e.dataTransfer.dropEffect = "move";
		setDragOverLayerId(layerId);
	};

	/**
	 * Handle layer drop
	 */
	const handleLayerDrop = (e: React.DragEvent<HTMLDivElement>, targetLayerId: string) => {
		e.preventDefault();
		const draggedLayerId = e.dataTransfer.getData("layerId");

		if (!draggedLayerId || draggedLayerId === targetLayerId || !timeline) {
			setDraggingLayerId(null);
			setDragOverLayerId(null);
			return;
		}

		// Find indices
		const currentIndex = layers.findIndex((l) => l.id === draggedLayerId);
		const targetIndex = layers.findIndex((l) => l.id === targetLayerId);

		if (currentIndex !== -1 && targetIndex !== -1) {
			timeline.reorderLayer(draggedLayerId, targetIndex);
		}

		setDraggingLayerId(null);
		setDragOverLayerId(null);
	};

	/**
	 * Handle layer drag end
	 */
	const handleLayerDragEnd = () => {
		setDraggingLayerId(null);
		setDragOverLayerId(null);
	};

	/**
	 * Zoom in (increase pixels per second)
	 */
	const handleZoomIn = () => {
		const newZoom = Math.min(zoom * 1.5, MAX_ZOOM);
		setZoom(newZoom);
		if (timeline) {
			timeline.setZoom(newZoom);
		}
	};

	/**
	 * Zoom out (decrease pixels per second)
	 */
	const handleZoomOut = () => {
		const newZoom = Math.max(zoom / 1.5, MIN_ZOOM);
		setZoom(newZoom);
		if (timeline) {
			timeline.setZoom(newZoom);
		}
	};

	return (
		<div className="timeline-container bg-gray-950 border-t border-gray-700">
			{/* Timeline Controls */}
			<div className="timeline-controls flex items-center justify-between gap-1.5 p-1.5 bg-gray-900 border-b border-gray-700">
				<div className="flex items-center gap-3">
					{/* Zoom Controls */}
					<div className="flex items-center gap-1.5">
						<span className="text-xs text-gray-400">Zoom:</span>
						<Button
							variant="outline"
							size="icon"
							onClick={handleZoomOut}
							disabled={zoom <= MIN_ZOOM}
							className="h-6 w-6">
							<Minus className="h-3 w-3" />
						</Button>
						<span className="text-xs text-gray-300 min-w-16 text-center">{zoom.toFixed(0)} px/s</span>
						<Button
							variant="outline"
							size="icon"
							onClick={handleZoomIn}
							disabled={zoom >= MAX_ZOOM}
							className="h-6 w-6">
							<Plus className="h-3 w-3" />
						</Button>
					</div>

					{/* Layer Controls */}
					<div className="flex items-center gap-1.5 border-l border-gray-700 pl-3">
						<span className="text-xs text-gray-400">Layers:</span>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" className="h-6 text-xs">
									<Plus className="h-3 w-3 mr-1" />
									Add Layer
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuItem onClick={() => timeline?.addLayer("video")}>
									<Video className="h-4 w-4 mr-2" />
									Video Layer
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => timeline?.addLayer("audio")}>
									<Music className="h-4 w-4 mr-2" />
									Audio Layer
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => timeline?.addLayer("image")}>
									<ImageIcon className="h-4 w-4 mr-2" />
									Image Layer
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => timeline?.addLayer("text")}>
									<Type className="h-4 w-4 mr-2" />
									Text Layer
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<span className="text-xs text-gray-500">{layers.length}</span>
					</div>

					<div className="flex items-center gap-2">
						<div className="text-xs text-gray-400">
							Time: {formatTime(currentTime)} / {formatTime(duration)}
						</div>
						<Button
							variant="outline"
							size="icon"
							onClick={() => {
								setCurrentTime(0);
								if (timeline) {
									timeline.setCurrentTime(0);
								}
							}}
							className="h-6 w-6"
							title="Reset to start">
							<RotateCcw className="h-3 w-3" />
						</Button>
					</div>
				</div>
			</div>

			{/* Timeline Ruler */}
			<div className="flex">
				{/* Spacer to align with layer sidebar */}
				<div className="w-32 shrink-0 bg-gray-900 border-r border-gray-700" />

				{/* Ruler - Scrollable container */}
				<div
					ref={rulerScrollRef}
					className="flex-1 overflow-x-auto overflow-y-hidden"
					style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
					<TimelineRuler
						width={timelineWidth}
						zoom={zoom}
						duration={duration}
						currentTime={currentTime}
						onTimeChange={(time) => {
							setCurrentTime(time);
							if (timeline) {
								timeline.setCurrentTime(time);
							}
						}}
					/>
				</div>
			</div>

			{/* Timeline Canvas Container - Horizontally scrollable */}
			<div className="flex overflow-hidden" style={{ maxHeight: `${TIMELINE_HEIGHT}px` }}>
				{/* Layer Controls Sidebar */}
				<div className="w-32 shrink-0 bg-gray-900 border-r border-gray-700 overflow-y-auto">
					{layers.length === 0 ? (
						<div className="p-2 text-xs text-gray-500 text-center">No layers</div>
					) : (
						[...layers].reverse().map((layer) => (
							<div
								key={layer.id}
								draggable
								onDragStart={(e) => handleLayerDragStart(e, layer.id)}
								onDragOver={(e) => handleLayerDragOver(e, layer.id)}
								onDrop={(e) => handleLayerDrop(e, layer.id)}
								onDragEnd={handleLayerDragEnd}
								className={`flex items-center justify-between px-2 py-3 border-b border-gray-700 hover:bg-gray-800 transition-colors cursor-move ${
									draggingLayerId === layer.id ? "opacity-50" : ""
								} ${dragOverLayerId === layer.id ? "bg-blue-500/20 border-blue-400" : ""}`}
								style={{ height: `${LAYER_HEIGHT}px` }}>
								<div className="flex items-center gap-1 flex-1 min-w-0">
									<span className="text-sm">
										{layer.type === "video" && "🎬"}
										{layer.type === "audio" && "🎵"}
										{layer.type === "image" && "🖼️"}
										{layer.type === "text" && "📝"}
									</span>
									<span className="text-xs text-gray-300 truncate" title={layer.name}>
										{layer.name?.split(" ")[0]}
									</span>
								</div>
								<div className="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon"
										className="h-5 w-5 hover:bg-blue-500/20"
										onClick={(e) => {
											e.stopPropagation();
											timeline?.toggleLayerVisibility(layer.id);
										}}
										title={layer.visible ? "Hide layer" : "Show layer"}>
										{layer.visible ? <Eye className="h-3 w-3" /> : <EyeOff className="h-3 w-3 opacity-50" />}
									</Button>
									<Button
										variant="ghost"
										size="icon"
										className="h-5 w-5 hover:bg-red-500/20 hover:text-red-400"
										onClick={() => timeline?.removeLayer(layer.id)}
										title="Delete layer">
										<Trash2 className="h-3 w-3" />
									</Button>
								</div>
							</div>
						))
					)}
				</div>

				{/* Timeline Canvas */}
				<div
					ref={scrollContainerRef}
					className={`flex-1 overflow-x-auto overflow-y-auto ${isDragOver ? "ring-2 ring-primary" : ""}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}>
					<canvas
						ref={canvasRef}
						className="timeline-canvas"
						style={{ cursor: cursorStyle }}
						onMouseDown={handleCanvasMouseDown}
						onMouseMove={handleCanvasMouseMove}
						onMouseUp={handleCanvasMouseUp}
						onMouseLeave={handleCanvasMouseUp}
					/>
				</div>
			</div>
		</div>
	);
};

/**
 * Format time in seconds to MM:SS format
 */
const formatTime = (seconds: number): string => {
	const mins = Math.floor(seconds / 60);
	const secs = Math.floor(seconds % 60);
	return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
};

export default Timeline;
