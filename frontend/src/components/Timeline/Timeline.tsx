import React, { useEffect, useRef, useState, useMemo } from "react";
import { Button } from "@/components/ui/button";
import { TimelineRuler } from "./TimelineRuler";
import type { TimelineLayer, Clip, Transition } from "@/types/timeline";
import type { MediaResource } from "@/types/media";
import { calculateContentDuration } from "@/utils/clipOperations";
import {
	Plus,
	Minus,
	Video,
	Music,
	Image as ImageIcon,
	Type,
	Trash2,
	Eye,
	EyeOff,
	SkipBack,
	Volume2,
	VolumeX,
	CircleFadingPlus,
	GitMerge,
	ScanLine,
	ArrowRightToLine,
	Maximize2,
} from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider";
import { Label } from "@/components/ui/label";
import { cn } from "@/lib/utils";
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

const LAYER_HEIGHT = 40;
const MIN_ZOOM = 5; // pixels per second
const MAX_ZOOM = 200; // pixels per second
const DEFAULT_ZOOM = 50; // pixels per second

type WipeDirection = "left" | "right" | "up" | "down";
type ZoomDirection = "in" | "out";

const directionOptions: { value: WipeDirection; label: string }[] = [
	{ value: "left", label: "← Left" },
	{ value: "right", label: "→ Right" },
	{ value: "up", label: "↑ Up" },
	{ value: "down", label: "↓ Down" },
];

const zoomDirectionOptions: { value: ZoomDirection; label: string }[] = [
	{ value: "in", label: "⭐ Zoom In" },
	{ value: "out", label: "⭕ Zoom Out" },
];

/**
 * Timeline component - Canvas-based timeline visualization
 * Displays multiple layers with clips, time ruler, and playhead
 */
export const Timeline: React.FC<TimelineProps> = ({ initialLayers = [], initialDuration = 180 }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const rulerScrollRef = useRef<HTMLDivElement>(null);
	const layerSidebarRef = useRef<HTMLDivElement>(null);
	// Ref to store pending clip when a new layer is created
	const pendingClipRef = useRef<{ clip: Clip; layerType: string } | null>(null);
	// Ref to store current layers for stable access in effects
	const layersRef = useRef<TimelineLayer[]>([]);

	const timeline = useTimeline();
	const [layers, setLayers] = useState<TimelineLayer[]>(initialLayers);
	const [currentTime, setCurrentTime] = useState<number>(0);
	const isPlaying = timeline?.state.isPlaying || false;
	const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);
	const [duration, setDuration] = useState<number>(initialDuration);

	// Derive state from timeline context when available
	const effectiveLayers = timeline?.state.layers.length > 0 ? timeline.state.layers : layers;
	const effectiveDuration = timeline?.state.duration > 0 ? timeline.state.duration : duration;
	const effectiveZoom = timeline?.state.zoom || zoom;
	const effectiveCurrentTime = timeline?.state.currentTime !== undefined ? timeline.state.currentTime : currentTime;

	// Keep ref updated with latest layers (in effect to avoid React warning)
	useEffect(() => {
		layersRef.current = effectiveLayers;
	}, [effectiveLayers]);

	// Calculate the actual content duration (end of last resource placed)
	const contentDuration = useMemo(() => calculateContentDuration(effectiveLayers), [effectiveLayers]);

	/**
	 * Create a stable key for layers that excludes mute state
	 * This prevents Timeline canvas re-renders when only mute changes
	 */
	const layersRenderKey = useMemo(() => {
		return JSON.stringify(
			effectiveLayers.map((layer) => ({
				id: layer.id,
				type: layer.type,
				name: layer.name,
				visible: layer.visible,
				clips: layer.clips,
			}))
		);
	}, [effectiveLayers]);

	const [isDragOver, setIsDragOver] = useState<boolean>(false);
	const [isNewLayerDropZoneActive, setIsNewLayerDropZoneActive] = useState<boolean>(false);
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
	const [resizeStartTrimStart, setResizeStartTrimStart] = useState<number>(0);
	const [resizeStartTrimEnd, setResizeStartTrimEnd] = useState<number>(0);
	const [editingLayerId, setEditingLayerId] = useState<string | null>(null);
	const [editingLayerName, setEditingLayerName] = useState<string>("");
	const [layerSidebarWidth, setLayerSidebarWidth] = useState<number>(150);
	const [isResizingSidebar, setIsResizingSidebar] = useState<boolean>(false);
	const [resizeStartX, setResizeStartX] = useState<number>(0);
	const [resizeStartWidth, setResizeStartWidth] = useState<number>(150);

	// Transition editor state
	const [transitionEditorOpen, setTransitionEditorOpen] = useState<boolean>(false);
	const [editingTransition, setEditingTransition] = useState<{
		clipId: string;
		position: "in" | "out";
		transition: Transition;
	} | null>(null);
	const [transitionDuration, setTransitionDuration] = useState<number>(1.0);
	const [transitionDirection, setTransitionDirection] = useState<WipeDirection | ZoomDirection>("left");

	const timelineWidth = effectiveDuration * effectiveZoom;

	// Handle pending clip addition after layer is created
	useEffect(() => {
		if (pendingClipRef.current && timeline) {
			const { clip, layerType } = pendingClipRef.current;
			// Find the layer that was just created (last layer of this type)
			let targetLayerIndex = -1;
			for (let i = effectiveLayers.length - 1; i >= 0; i--) {
				if (effectiveLayers[i].type === layerType) {
					targetLayerIndex = i;
					break;
				}
			}
			if (targetLayerIndex !== -1) {
				timeline.addClip(clip, targetLayerIndex);
				pendingClipRef.current = null; // Clear the pending clip
				console.log("Added pending clip to layer index:", targetLayerIndex);
			}
		}
	}, [effectiveLayers, timeline]);

	// Handle sidebar resize
	useEffect(() => {
		if (!isResizingSidebar) return;

		const handleMouseMove = (e: MouseEvent) => {
			const delta = e.clientX - resizeStartX;
			const newWidth = Math.max(100, Math.min(300, resizeStartWidth + delta));
			setLayerSidebarWidth(newWidth);
		};

		const handleMouseUp = () => {
			setIsResizingSidebar(false);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isResizingSidebar, resizeStartX, resizeStartWidth]);

	// Sync ruler scroll with canvas scroll (horizontal only)
	useEffect(() => {
		const canvasScroll = scrollContainerRef.current;
		const rulerScroll = rulerScrollRef.current;

		if (!canvasScroll || !rulerScroll) return;

		const handleCanvasScroll = () => {
			rulerScroll.scrollLeft = canvasScroll.scrollLeft;
		};

		canvasScroll.addEventListener("scroll", handleCanvasScroll);

		return () => {
			canvasScroll.removeEventListener("scroll", handleCanvasScroll);
		};
	}, []);

	// Auto-scroll timeline during playback
	useEffect(() => {
		if (!isPlaying) return;

		const canvasScroll = scrollContainerRef.current;
		const rulerScroll = rulerScrollRef.current;

		if (!canvasScroll || !rulerScroll) return;

		// Calculate playhead position in pixels
		const playheadX = effectiveCurrentTime * effectiveZoom;

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
	}, [isPlaying, effectiveCurrentTime, effectiveZoom]);

	// Handle keyboard events for clip deletion
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			// Don't handle Delete key if user is in an input, textarea, or dialog
			const target = e.target as HTMLElement;
			if (
				target.tagName === "INPUT" ||
				target.tagName === "TEXTAREA" ||
				target.isContentEditable ||
				(target.closest && target.closest('[role="dialog"]'))
			) {
				return;
			}

			// Only Delete key (not Backspace) should delete selected clip
			if (e.key === "Delete" && selectedClipId && timeline) {
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

		// Use ref to get current layers (for stability)
		const currentLayers = layersRef.current;

		// Set canvas dimensions
		canvas.width = timelineWidth;
		canvas.height = currentLayers.length * LAYER_HEIGHT || LAYER_HEIGHT;

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
		const drawClip = (clip: Clip, layerY: number, layerType: "video" | "audio" | "text" | "image") => {
			const x = clip.startTime * effectiveZoom;
			const width = clip.duration * effectiveZoom;
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

			// Draw resize handles when selected (only for resizable clips: image and text)
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
			const displayName = clip.resourceName || clip.resourceId;
			const padding = 10; // 5px padding on each side
			const availableWidth = width - padding;

			// Truncate text to fit within clip width
			let clipName = displayName;
			const textWidth = ctx.measureText(clipName).width;

			if (textWidth > availableWidth) {
				const ellipsis = "...";
				const ellipsisWidth = ctx.measureText(ellipsis).width;

				// Binary search for the right length
				let low = 0;
				let high = displayName.length;
				while (low < high) {
					const mid = Math.ceil((low + high) / 2);
					const truncated = displayName.substring(0, mid);
					if (ctx.measureText(truncated).width + ellipsisWidth <= availableWidth) {
						low = mid;
					} else {
						high = mid - 1;
					}
				}
				clipName = low > 0 ? displayName.substring(0, low) + ellipsis : "";
			}

			if (clipName) {
				ctx.fillText(clipName, x + 5, y + height / 2 + 4);
			}

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

			// Draw transition indicators
			if (clip.transitions) {
				const transitionHeight = 6;
				const transitionY = y + height - transitionHeight - 2;

				// Transition in indicator (left side)
				if (clip.transitions.in) {
					const transitionWidth = Math.min(clip.transitions.in.duration * effectiveZoom, width * 0.4);
					const transitionColor = getTransitionColor(clip.transitions.in.type);
					ctx.fillStyle = transitionColor;
					ctx.fillRect(x + 2, transitionY, transitionWidth, transitionHeight);
					// Small icon/label
					ctx.fillStyle = "#fff";
					ctx.font = "8px sans-serif";
					ctx.fillText("▶", x + 4, transitionY + transitionHeight - 1);
				}

				// Transition out indicator (right side)
				if (clip.transitions.out) {
					const transitionWidth = Math.min(clip.transitions.out.duration * effectiveZoom, width * 0.4);
					const transitionColor = getTransitionColor(clip.transitions.out.type);
					ctx.fillStyle = transitionColor;
					ctx.fillRect(x + width - transitionWidth - 2, transitionY, transitionWidth, transitionHeight);
					// Small icon/label
					ctx.fillStyle = "#fff";
					ctx.font = "8px sans-serif";
					ctx.fillText("◀", x + width - transitionWidth, transitionY + transitionHeight - 1);
				}
			}
		};

		/**
		 * Get color for transition type
		 */
		const getTransitionColor = (type: Transition["type"]): string => {
			switch (type) {
				case "fade":
					return "#3b82f6"; // Blue
				case "dissolve":
					return "#a855f7"; // Purple
				case "wipe":
					return "#22c55e"; // Green
				case "slide":
					return "#f97316"; // Orange
				case "zoom":
					return "#eab308"; // Yellow
				default:
					return "#6b7280"; // Gray
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
					drawClip(clip, y, layer.type);
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

		// Draw layers using ref (reversed so top layer in UI is rendered on top)
		[...currentLayers].reverse().forEach((layer, reversedIndex) => {
			drawLayer(layer, reversedIndex);
		});
	}, [layersRenderKey, effectiveCurrentTime, effectiveZoom, effectiveDuration, timelineWidth, selectedClipId]);

	/**
	 * Find clip at a given position
	 */
	const findClipAtPosition = (x: number, y: number): { clip: Clip; layerIndex: number } | null => {
		const reversedLayers = [...effectiveLayers].reverse();
		const layerIndex = Math.floor(y / LAYER_HEIGHT);
		if (layerIndex < 0 || layerIndex >= reversedLayers.length) return null;

		const layer = reversedLayers[layerIndex];
		// Get the actual index in the original array
		const actualLayerIndex = effectiveLayers.length - 1 - layerIndex;
		const time = x / effectiveZoom;

		// Iterate in reverse to find the most recently added (topmost) clip first
		for (let i = layer.clips.length - 1; i >= 0; i--) {
			const clip = layer.clips[i];
			const clipStart = clip.startTime;
			const clipEnd = clip.startTime + clip.duration;

			if (time >= clipStart && time <= clipEnd) {
				return { clip, layerIndex: actualLayerIndex };
			}
		}

		return null;
	};

	/**
	 * Check if dropped data is a transition (not a media resource)
	 */
	const isTransitionData = (data: string): boolean => {
		try {
			const parsed = JSON.parse(data);
			return (
				parsed &&
				typeof parsed.type === "string" &&
				["fade", "dissolve", "wipe", "slide", "zoom"].includes(parsed.type) &&
				typeof parsed.duration === "number" &&
				!parsed.id // Media resources have 'id', transitions don't
			);
		} catch {
			return false;
		}
	};

	/**
	 * Find clip edge at drop position for transition placement
	 * Returns clip and whether drop is closer to start or end edge
	 */
	const findClipEdgeAtPosition = (
		x: number,
		y: number
	): { clip: Clip; position: "in" | "out"; layerIndex: number } | null => {
		const clipInfo = findClipAtPosition(x, y);
		if (!clipInfo) return null;

		const { clip, layerIndex } = clipInfo;
		const clipStartX = clip.startTime * effectiveZoom;
		const clipEndX = (clip.startTime + clip.duration) * effectiveZoom;
		const clipMiddleX = (clipStartX + clipEndX) / 2;

		// Determine if drop is closer to start or end of clip
		const position = x < clipMiddleX ? "in" : "out";

		return { clip, position, layerIndex };
	};

	/**
	 * Apply transition to a clip
	 */
	const applyTransitionToClip = (clipId: string, position: "in" | "out", transition: Transition) => {
		if (!timeline) return;

		// Find the clip to get its current transitions
		let currentClip: Clip | undefined;
		for (const layer of effectiveLayers) {
			currentClip = layer.clips.find((c) => c.id === clipId);
			if (currentClip) break;
		}

		if (!currentClip) return;

		// Merge with existing transitions
		const currentTransitions = currentClip.transitions || {};
		const updatedTransitions = {
			...currentTransitions,
			[position]: transition,
		};

		timeline.updateClip(clipId, { transitions: updatedTransitions });
		console.log(`Applied ${transition.type} transition to clip ${clipId} at ${position}`);
	};

	/**
	 * Check if cursor is near clip edge for resizing
	 * Image, text, video, and audio clips can be resized
	 */
	const getClipEdge = (x: number, y: number): { clip: Clip; edge: "left" | "right"; layerIndex: number } | null => {
		const EDGE_THRESHOLD = 8; // pixels
		const reversedLayers = [...effectiveLayers].reverse();
		const layerIndex = Math.floor(y / LAYER_HEIGHT);
		if (layerIndex < 0 || layerIndex >= reversedLayers.length) return null;

		const layer = reversedLayers[layerIndex];
		const actualLayerIndex = effectiveLayers.length - 1 - layerIndex;

		const time = x / effectiveZoom;

		// Iterate in reverse to find the most recently added (topmost) clip first
		for (let i = layer.clips.length - 1; i >= 0; i--) {
			const clip = layer.clips[i];
			const clipStart = clip.startTime;
			const clipEnd = clip.startTime + clip.duration;
			const clipStartX = clipStart * effectiveZoom;
			const clipEndX = clipEnd * effectiveZoom;

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
	 * Check if click is on a transition indicator
	 */
	const findTransitionAtPosition = (
		x: number,
		y: number
	): { clip: Clip; position: "in" | "out"; transition: Transition } | null => {
		const clipInfo = findClipAtPosition(x, y);
		if (!clipInfo) return null;

		const { clip } = clipInfo;
		if (!clip.transitions) return null;

		const clipStartX = clip.startTime * effectiveZoom;
		const clipEndX = (clip.startTime + clip.duration) * effectiveZoom;
		const transitionClickWidth = 24; // Width of clickable transition area

		// Check if clicking on transition in (left side)
		if (clip.transitions.in && x >= clipStartX && x <= clipStartX + transitionClickWidth) {
			return { clip, position: "in", transition: clip.transitions.in };
		}

		// Check if clicking on transition out (right side)
		if (clip.transitions.out && x >= clipEndX - transitionClickWidth && x <= clipEndX) {
			return { clip, position: "out", transition: clip.transitions.out };
		}

		return null;
	};

	/**
	 * Open transition editor dialog
	 */
	const openTransitionEditor = (clipId: string, position: "in" | "out", transition: Transition) => {
		setEditingTransition({ clipId, position, transition });
		setTransitionDuration(transition.duration);

		// Set default direction based on transition type
		const defaultDirection = transition.type === "zoom" ? "in" : "left";
		setTransitionDirection((transition.properties?.direction as WipeDirection | ZoomDirection) || defaultDirection);
		setTransitionEditorOpen(true);
	};

	/**
	 * Save transition changes
	 */
	const handleTransitionSave = () => {
		if (!editingTransition || !timeline) return;

		const { clipId, position, transition } = editingTransition;

		// Find current clip transitions
		let currentClip: Clip | undefined;
		for (const layer of effectiveLayers) {
			currentClip = layer.clips.find((c) => c.id === clipId);
			if (currentClip) break;
		}
		if (!currentClip) return;

		const currentTransitions = currentClip.transitions || {};
		const hasDirection = transition.type === "wipe" || transition.type === "slide" || transition.type === "zoom";
		const updatedTransition: Transition = {
			...transition,
			duration: transitionDuration,
		};
		if (hasDirection) {
			updatedTransition.properties = { ...transition.properties, direction: transitionDirection };
		}
		const updatedTransitions = {
			...currentTransitions,
			[position]: updatedTransition,
		};

		timeline.updateClip(clipId, { transitions: updatedTransitions });
		setTransitionEditorOpen(false);
		setEditingTransition(null);
	};

	/**
	 * Remove transition
	 */
	const handleTransitionRemove = () => {
		if (!editingTransition || !timeline) return;

		const { clipId, position } = editingTransition;

		// Find current clip transitions
		let currentClip: Clip | undefined;
		for (const layer of effectiveLayers) {
			currentClip = layer.clips.find((c) => c.id === clipId);
			if (currentClip) break;
		}
		if (!currentClip) return;

		const currentTransitions = { ...currentClip.transitions };
		delete currentTransitions[position];

		timeline.updateClip(clipId, {
			transitions: Object.keys(currentTransitions).length > 0 ? currentTransitions : undefined,
		});
		setTransitionEditorOpen(false);
		setEditingTransition(null);
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

		// Check if clicking on a transition indicator FIRST
		const transitionInfo = findTransitionAtPosition(x, y);
		if (transitionInfo) {
			e.stopPropagation();
			openTransitionEditor(transitionInfo.clip.id, transitionInfo.position, transitionInfo.transition);
			return;
		}

		// Check if clicking on clip edge for resizing
		const edgeInfo = getClipEdge(x, y);
		if (edgeInfo) {
			setResizingClip({ clipId: edgeInfo.clip.id, edge: edgeInfo.edge, layerIndex: edgeInfo.layerIndex });
			setSelectedClipId(edgeInfo.clip.id);
			setResizeStartTime(edgeInfo.clip.startTime);
			setResizeStartDuration(edgeInfo.clip.duration);
			setResizeStartTrimStart(edgeInfo.clip.trimStart || 0);
			setResizeStartTrimEnd(edgeInfo.clip.trimEnd || 0);
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
			const deltaTime = deltaX / effectiveZoom;

			// Find the clip being resized to check source duration
			let resizingClipData: Clip | null = null;
			for (const layer of effectiveLayers) {
				const foundClip = layer.clips.find((clip) => clip.id === resizingClip.clipId);
				if (foundClip) {
					resizingClipData = foundClip;
					break;
				}
			}

			// Get source duration for video/audio clips
			const sourceDuration = resizingClipData?.data?.sourceDuration;
			const isVideoOrAudio = resizingClipData?.data?.type === "video" || resizingClipData?.data?.type === "audio";

			if (isVideoOrAudio && sourceDuration) {
				// For video/audio: trim handles slide over the source media
				// trimStart = how much to skip from beginning
				// trimEnd = how much to cut from end
				// duration = sourceDuration - trimStart - trimEnd

				if (resizingClip.edge === "left") {
					// Left handle: adjust trimStart (and startTime on timeline)
					// Dragging right = increase trimStart = start later in video
					// Dragging left = decrease trimStart = start earlier in video
					const originalEndTime = resizeStartTime + resizeStartDuration;
					let newTrimStart = resizeStartTrimStart + deltaTime;
					// Constrain trimStart: min 0, max = sourceDuration - trimEnd - 0.1 (minimum visible duration)
					const maxTrimStart = sourceDuration - resizeStartTrimEnd - 0.1;
					newTrimStart = Math.max(0, Math.min(newTrimStart, maxTrimStart));

					const newDuration = sourceDuration - newTrimStart - resizeStartTrimEnd;
					const newStartTime = originalEndTime - newDuration;

					// Ensure startTime doesn't go negative
					if (newStartTime >= 0 && timeline) {
						timeline.moveClip(resizingClip.clipId, newStartTime);
						timeline.updateClip(resizingClip.clipId, {
							duration: newDuration,
							trimStart: newTrimStart,
						});
					}
				} else {
					// Right handle: adjust trimEnd (startTime stays fixed)
					// Dragging right = decrease trimEnd = end later in video
					// Dragging left = increase trimEnd = end earlier in video
					let newTrimEnd = resizeStartTrimEnd - deltaTime;
					// Constrain trimEnd: min 0, max = sourceDuration - trimStart - 0.1
					const maxTrimEnd = sourceDuration - resizeStartTrimStart - 0.1;
					newTrimEnd = Math.max(0, Math.min(newTrimEnd, maxTrimEnd));

					const newDuration = sourceDuration - resizeStartTrimStart - newTrimEnd;

					if (timeline) {
						timeline.updateClip(resizingClip.clipId, {
							duration: newDuration,
							trimEnd: newTrimEnd,
						});
					}
				}
			} else {
				// For images/text: simple duration resize (no trim concept)
				if (resizingClip.edge === "left") {
					// Keep end time fixed, change start time
					const originalEndTime = resizeStartTime + resizeStartDuration;
					const newStartTime = Math.max(0, resizeStartTime + deltaTime);
					const constrainedStartTime = Math.min(newStartTime, originalEndTime - 0.1);
					const newDuration = originalEndTime - constrainedStartTime;

					if (timeline) {
						timeline.moveClip(resizingClip.clipId, constrainedStartTime);
						timeline.updateClip(resizingClip.clipId, { duration: newDuration });
					}
				} else {
					// Change duration only, start time fixed
					const newDuration = Math.max(0.1, resizeStartDuration + deltaTime);

					if (timeline) {
						timeline.updateClip(resizingClip.clipId, { duration: newDuration });
					}
				}
			}
			setCursorStyle("ew-resize");
		} else if (isDraggingClip && selectedClipId) {
			// Move the selected clip
			const deltaX = x - dragStartX;
			const deltaTime = deltaX / effectiveZoom;
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
	 * Handle double click on canvas to reset trim on video/audio clips
	 */
	const handleCanvasDoubleClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
		const y = e.clientY - rect.top + (scrollContainerRef.current?.scrollTop || 0);

		const clipAtPosition = findClipAtPosition(x, y);
		if (!clipAtPosition) return;

		const clip = clipAtPosition.clip;
		const isVideoOrAudio = clip.data?.type === "video" || clip.data?.type === "audio";
		const sourceDuration = clip.data?.sourceDuration;

		// Only reset trim for video/audio clips that have a source duration
		if (isVideoOrAudio && sourceDuration && timeline) {
			// Reset trim values and restore original duration
			timeline.updateClip(clip.id, {
				trimStart: 0,
				trimEnd: 0,
				duration: sourceDuration,
			});
			console.log(`Reset trim for clip ${clip.id}, restored duration to ${sourceDuration}s`);
		}
	};

	/**
	 * Handle drop on new layer drop zone
	 */
	const handleNewLayerDrop = (e: React.DragEvent, dropTime: number) => {
		try {
			const data = e.dataTransfer.getData("application/json");
			if (!data) return;

			const resource: MediaResource = JSON.parse(data);

			// Create a new layer and add the resource as a clip
			if (timeline) {
				timeline.addLayer(resource.type);

				// Create a clip from the resource
				const fileNameWithoutExtension = resource.name.replace(/\.[^/.]+$/, "");
				const newClip: Clip = {
					id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
					resourceId: resource.id,
					resourceName: fileNameWithoutExtension,
					startTime: dropTime,
					duration: resource.duration || 5,
					trimStart: 0,
					trimEnd: 0,
					opacity: 1,
					scale: 1,
					rotation: 0,
					position: { x: 0, y: 0 },
					data: {
						type: resource.type,
						url: resource.url,
						name: resource.name,
						sourceDuration: resource.duration,
					},
				};

				// Store pending clip to be added when layer is created
				pendingClipRef.current = { clip: newClip, layerType: resource.type };
				console.log("New layer drop zone: created layer and stored pending clip at time:", dropTime);
			}
		} catch (error) {
			console.error("Failed to handle drop on new layer zone:", error);
		}
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
	 * Handle drop of media resource or transition onto timeline
	 */
	const handleDrop = (e: React.DragEvent) => {
		e.preventDefault();
		setIsDragOver(false);

		try {
			const data = e.dataTransfer.getData("application/json");
			if (!data) return;

			// Calculate drop position
			const canvas = canvasRef.current;
			if (!canvas) return;

			const rect = canvas.getBoundingClientRect();
			const x = e.clientX - rect.left + (scrollContainerRef.current?.scrollLeft || 0);
			const y = e.clientY - rect.top + (scrollContainerRef.current?.scrollTop || 0);

			// Check if this is a transition drop
			if (isTransitionData(data)) {
				const transition: Transition = JSON.parse(data);
				const clipEdgeInfo = findClipEdgeAtPosition(x, y);

				if (clipEdgeInfo) {
					applyTransitionToClip(clipEdgeInfo.clip.id, clipEdgeInfo.position, transition);
					console.log(
						`Transition ${transition.type} dropped on clip ${clipEdgeInfo.clip.id} at ${clipEdgeInfo.position}`
					);
				} else {
					console.log("Transition dropped but no clip found at position");
				}
				return;
			}

			// Otherwise, handle as media resource drop
			const resource: MediaResource = JSON.parse(data);
			const dropTime = Math.max(0, x / effectiveZoom);

			// Determine which layer was dropped onto based on Y position
			// Layers are rendered from bottom to top, so we need to reverse the index
			const layerIndexFromTop = Math.floor(y / LAYER_HEIGHT);
			const targetLayerIndex = effectiveLayers.length - 1 - layerIndexFromTop;

			console.log("Drop position:", { x, y, layerIndexFromTop, targetLayerIndex, totalLayers: effectiveLayers.length });

			let finalTargetLayerIndex = targetLayerIndex;
			let newLayerCreated = false;

			// Check if we have a valid layer at the drop position
			if (targetLayerIndex >= 0 && targetLayerIndex < effectiveLayers.length) {
				const targetLayer = effectiveLayers[targetLayerIndex];

				// Check if the target layer type matches the resource type
				if (targetLayer.type === resource.type && !targetLayer.locked) {
					// Use the dropped layer
					finalTargetLayerIndex = targetLayerIndex;
					console.log("Adding to existing layer:", targetLayer.name);
				} else {
					// Layer type doesn't match or is locked, find or create appropriate layer
					let matchingLayerIndex = -1;
					for (let i = effectiveLayers.length - 1; i >= 0; i--) {
						if (effectiveLayers[i].type === resource.type && !effectiveLayers[i].locked) {
							matchingLayerIndex = i;
							break;
						}
					}

					if (matchingLayerIndex !== -1) {
						finalTargetLayerIndex = matchingLayerIndex;
						console.log("Layer type mismatch, using last matching layer");
					} else {
						// No matching layer found, create one
						if (timeline) {
							timeline.addLayer(resource.type);
							finalTargetLayerIndex = effectiveLayers.length;
							newLayerCreated = true;
							console.log("Creating new layer for resource type:", resource.type);
						}
					}
				}
			} else {
				// Drop outside existing layers, create new layer
				if (timeline) {
					timeline.addLayer(resource.type);
					finalTargetLayerIndex = effectiveLayers.length;
					newLayerCreated = true;
					console.log("Drop outside layers, creating new layer");
				} else {
					// Fallback if timeline context is not available
					const newLayer: TimelineLayer = {
						id: `layer-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
						type: resource.type,
						clips: [],
						locked: false,
						visible: true,
						muted: false,
						name: `${resource.type.charAt(0).toUpperCase() + resource.type.slice(1)} Layer ${layers.length + 1}`,
					};
					setLayers([...effectiveLayers, newLayer]);
					finalTargetLayerIndex = effectiveLayers.length;
					newLayerCreated = true;
				}
			}

			// Create a clip from the resource
			// Extract filename without extension for display
			const fileNameWithoutExtension = resource.name.replace(/\.[^/.]+$/, "");
			const newClip: Clip = {
				id: `clip-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
				resourceId: resource.id,
				resourceName: fileNameWithoutExtension,
				startTime: dropTime,
				duration: resource.duration || 5, // Default 5 seconds for images
				trimStart: 0,
				trimEnd: 0,
				opacity: 1,
				scale: 1,
				rotation: 0,
				position: { x: 0, y: 0 },
				data: {
					type: resource.type,
					url: resource.url,
					name: resource.name,
					width: resource.metadata?.width,
					height: resource.metadata?.height,
					sourceDuration: resource.duration,
				},
			};

			console.log("Creating new clip:", {
				id: newClip.id,
				resourceId: newClip.resourceId,
				scale: newClip.scale,
				rotation: newClip.rotation,
				position: newClip.position,
			});

			// Add the clip to the layer
			if (timeline) {
				if (newLayerCreated) {
					// Store the clip in ref to be added when the layer is created
					pendingClipRef.current = { clip: newClip, layerType: resource.type };
					console.log("Stored pending clip for new layer of type:", resource.type);
				} else {
					// Add to existing layer immediately
					console.log("Adding clip to layer index:", finalTargetLayerIndex);
					timeline.addClip(newClip, finalTargetLayerIndex);
				}
			} else {
				// Fallback if timeline context is not available
				const updatedLayers = [...effectiveLayers];
				if (updatedLayers[finalTargetLayerIndex]) {
					updatedLayers[finalTargetLayerIndex] = {
						...updatedLayers[finalTargetLayerIndex],
						clips: [...updatedLayers[finalTargetLayerIndex].clips, newClip],
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
		const currentIndex = effectiveLayers.findIndex((l) => l.id === draggedLayerId);
		const targetIndex = effectiveLayers.findIndex((l) => l.id === targetLayerId);

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
		const newZoom = Math.min(effectiveZoom + 5, MAX_ZOOM);
		setZoom(newZoom);
		if (timeline) {
			timeline.setZoom(newZoom);
		}
	};

	/**
	 * Zoom out (decrease pixels per second)
	 */
	const handleZoomOut = () => {
		const newZoom = Math.max(effectiveZoom - 5, MIN_ZOOM);
		setZoom(newZoom);
		if (timeline) {
			timeline.setZoom(newZoom);
		}
	};

	return (
		<div className="timeline-container bg-gray-950 border-t border-gray-700 flex flex-col flex-1">
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
							disabled={effectiveZoom <= MIN_ZOOM}
							className="size-6">
							<Minus className="size-3" />
						</Button>
						<span className="text-xs text-gray-300 min-w-16 text-center">{effectiveZoom.toFixed(0)} px/s</span>
						<Button
							variant="outline"
							size="icon"
							onClick={handleZoomIn}
							disabled={effectiveZoom >= MAX_ZOOM}
							className="size-6">
							<Plus className="size-3" />
						</Button>
					</div>

					{/* Layer Controls */}
					<div className="flex items-center gap-1.5 border-l border-gray-700 pl-3">
						<span className="text-xs text-gray-400">Layers:</span>
						<DropdownMenu>
							<DropdownMenuTrigger asChild>
								<Button variant="outline" size="sm" className="h-6 text-xs">
									<Plus className="size-3 mr-1" />
									Add Layer
								</Button>
							</DropdownMenuTrigger>
							<DropdownMenuContent>
								<DropdownMenuItem onClick={() => timeline?.addLayer("video")}>
									<Video className="size-4 mr-2" />
									Video Layer
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => timeline?.addLayer("audio")}>
									<Music className="size-4 mr-2" />
									Audio Layer
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => timeline?.addLayer("image")}>
									<ImageIcon className="size-4 mr-2" />
									Image Layer
								</DropdownMenuItem>
								<DropdownMenuItem onClick={() => timeline?.addLayer("text")}>
									<Type className="size-4 mr-2" />
									Text Layer
								</DropdownMenuItem>
							</DropdownMenuContent>
						</DropdownMenu>
						<span className="text-xs text-gray-500">{effectiveLayers.length}</span>
					</div>

					<div className="flex items-center gap-2">
						<div className="text-xs text-gray-400">
							Time: {formatTime(effectiveCurrentTime)} / {formatTime(contentDuration)}
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
							className="size-6"
							title="Go to start">
							<SkipBack className="size-3" />
						</Button>
					</div>
				</div>
			</div>

			{/* Timeline Ruler */}
			<div className="flex">
				{/* Drop Zone to align with layer sidebar */}
				<div
					className={`shrink-0 flex items-center justify-center border-r border-dashed transition-colors ${
						isNewLayerDropZoneActive
							? "bg-blue-500/30 border-blue-400"
							: "bg-gray-800 border-gray-600 hover:bg-gray-700"
					}`}
					style={{ width: `${layerSidebarWidth}px` }}
					onDragOver={(e) => {
						e.preventDefault();
						e.stopPropagation();
						e.dataTransfer.dropEffect = "copy";
						setIsNewLayerDropZoneActive(true);
					}}
					onDragLeave={(e) => {
						e.preventDefault();
						e.stopPropagation();
						setIsNewLayerDropZoneActive(false);
					}}
					onDrop={(e) => {
						e.preventDefault();
						e.stopPropagation();
						setIsNewLayerDropZoneActive(false);
						handleNewLayerDrop(e, 0);
					}}>
					<div className="flex items-center gap-1 text-xs text-gray-400">
						<Plus className="size-3" />
						<span>Drop to add</span>
					</div>
				</div>

				{/* Ruler - Scrollable container */}
				<div
					ref={rulerScrollRef}
					className="flex-1 overflow-x-auto overflow-y-hidden"
					style={{ scrollbarWidth: "none", msOverflowStyle: "none" }}>
					<TimelineRuler
						width={timelineWidth}
						zoom={effectiveZoom}
						duration={effectiveDuration}
						currentTime={effectiveCurrentTime}
						onTimeChange={(time) => {
							setCurrentTime(time);
							if (timeline) {
								timeline.setCurrentTime(time);
							}
						}}
					/>
				</div>
			</div>

			{/* Timeline Canvas Container - Single scrollable parent for layers and tracks */}
			<div
				ref={scrollContainerRef}
				className="flex flex-1 overflow-auto"
				style={{
					scrollbarWidth: "none",
					msOverflowStyle: "none",
				}}>
				{/* Layer Controls Sidebar */}
				<div
					ref={layerSidebarRef}
					className="shrink-0 bg-gray-900 border-r border-gray-700 sticky left-0 z-10"
					style={{ width: `${layerSidebarWidth}px` }}>
					{effectiveLayers.length === 0 ? (
						<div className="p-2 text-xs text-gray-500 text-center">No layers</div>
					) : (
						[...effectiveLayers].reverse().map((layer) => (
							<div
								key={layer.id}
								draggable
								onDragStart={(e) => handleLayerDragStart(e, layer.id)}
								onDragOver={(e) => handleLayerDragOver(e, layer.id)}
								onDrop={(e) => handleLayerDrop(e, layer.id)}
								onDragEnd={handleLayerDragEnd}
								className={`flex items-center justify-between px-2 py-1 border-b border-gray-700 hover:bg-gray-800 transition-colors cursor-move ${
									draggingLayerId === layer.id ? "opacity-50" : ""
								} ${dragOverLayerId === layer.id ? "bg-blue-500/20 border-blue-400" : ""}`}
								style={{ height: `${LAYER_HEIGHT}px`, boxSizing: "border-box" }}>
								<div className="flex items-center gap-1 flex-1 min-w-0">
									<span className="text-sm">
										{layer.type === "video" && "🎬"}
										{layer.type === "audio" && "🎵"}
										{layer.type === "image" && "🖼️"}
										{layer.type === "text" && "📝"}
									</span>
									{editingLayerId === layer.id ? (
										<input
											type="text"
											value={editingLayerName}
											onChange={(e) => setEditingLayerName(e.target.value)}
											onBlur={() => {
												if (editingLayerName.trim() && timeline) {
													timeline.updateLayer(layer.id, { name: editingLayerName.trim() });
												}
												setEditingLayerId(null);
											}}
											onKeyDown={(e) => {
												if (e.key === "Enter") {
													if (editingLayerName.trim() && timeline) {
														timeline.updateLayer(layer.id, { name: editingLayerName.trim() });
													}
													setEditingLayerId(null);
												} else if (e.key === "Escape") {
													setEditingLayerId(null);
												}
											}}
											className="text-xs bg-gray-800 text-gray-300 px-1 py-0.5 rounded border border-blue-500 outline-none flex-1 min-w-0"
											autoFocus
											onClick={(e) => e.stopPropagation()}
										/>
									) : (
										<span
											className="text-xs text-gray-300 truncate cursor-text hover:text-white"
											title={layer.name}
											onDoubleClick={(e) => {
												e.stopPropagation();
												setEditingLayerId(layer.id);
												setEditingLayerName(layer.name);
											}}>
											{layer.name}
										</span>
									)}
								</div>
								<div className="flex items-center gap-1">
									<Button
										variant="ghost"
										size="icon"
										className="size-5 hover:bg-blue-500/20"
										onClick={(e) => {
											e.stopPropagation();
											timeline?.toggleLayerVisibility(layer.id);
										}}
										title={layer.visible ? "Hide layer" : "Show layer"}>
										{layer.visible ? <Eye className="size-3" /> : <EyeOff className="size-3 opacity-50" />}
									</Button>
									{(layer.type === "video" || layer.type === "audio") && (
										<Button
											variant="ghost"
											size="icon"
											className="size-5 hover:bg-blue-500/20"
											onClick={(e) => {
												e.stopPropagation();
												timeline?.toggleLayerMute(layer.id);
											}}
											title={layer.muted ? "Unmute layer" : "Mute layer"}>
											{layer.muted ? <VolumeX className="size-3 text-red-400" /> : <Volume2 className="size-3" />}
										</Button>
									)}
									<Button
										variant="ghost"
										size="icon"
										className="size-5 hover:bg-red-500/20 hover:text-red-400"
										onClick={() => timeline?.removeLayer(layer.id)}
										title="Delete layer">
										<Trash2 className="size-3" />
									</Button>
								</div>
							</div>
						))
					)}
					{/* Resize Handle */}
					<div
						className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-blue-500/50 active:bg-blue-500"
						onMouseDown={(e) => {
							e.preventDefault();
							setResizeStartX(e.clientX);
							setResizeStartWidth(layerSidebarWidth);
							setIsResizingSidebar(true);
						}}
					/>
				</div>

				{/* Timeline Canvas */}
				<div
					className={`flex-1 ${isDragOver ? "ring-2 ring-primary" : ""}`}
					onDragOver={handleDragOver}
					onDragLeave={handleDragLeave}
					onDrop={handleDrop}>
					<canvas
						ref={canvasRef}
						className="timeline-canvas"
						style={{
							cursor: cursorStyle,
							display: "block",
							minHeight: `${LAYER_HEIGHT}px`,
						}}
						onMouseDown={handleCanvasMouseDown}
						onMouseMove={handleCanvasMouseMove}
						onMouseUp={handleCanvasMouseUp}
						onMouseLeave={handleCanvasMouseUp}
						onDoubleClick={handleCanvasDoubleClick}
					/>
				</div>
			</div>

			{/* Transition Editor Dialog */}
			<Dialog open={transitionEditorOpen} onOpenChange={setTransitionEditorOpen}>
				<DialogContent className="sm:max-w-md">
					<DialogHeader>
						<DialogTitle className="flex items-center gap-2">
							{editingTransition && (
								<>
									<div
										className={cn(
											"p-2 rounded-md text-white",
											editingTransition.transition.type === "fade" && "bg-blue-500",
											editingTransition.transition.type === "dissolve" && "bg-purple-500",
											editingTransition.transition.type === "wipe" && "bg-green-500",
											editingTransition.transition.type === "slide" && "bg-orange-500",
											editingTransition.transition.type === "zoom" && "bg-yellow-500"
										)}>
										{editingTransition.transition.type === "fade" && <CircleFadingPlus className="size-4" />}
										{editingTransition.transition.type === "dissolve" && <GitMerge className="size-4" />}
										{editingTransition.transition.type === "wipe" && <ScanLine className="size-4" />}
										{editingTransition.transition.type === "slide" && <ArrowRightToLine className="size-4" />}
										{editingTransition.transition.type === "zoom" && <Maximize2 className="size-4" />}
									</div>
									{editingTransition.transition.type.charAt(0).toUpperCase() +
										editingTransition.transition.type.slice(1)}{" "}
									{editingTransition.position === "in" ? "In" : "Out"}
								</>
							)}
						</DialogTitle>
						<DialogDescription>Edit transition properties</DialogDescription>
					</DialogHeader>

					<div className="space-y-4 py-4">
						{/* Duration Control */}
						<div className="space-y-2">
							<div className="flex items-center justify-between">
								<Label htmlFor="transition-duration">Duration</Label>
								<span className="text-sm text-muted-foreground">{transitionDuration.toFixed(2)}s</span>
							</div>
							<Slider
								id="transition-duration"
								min={0.1}
								max={3}
								step={0.1}
								value={[transitionDuration]}
								onValueChange={(value) => setTransitionDuration(value[0])}
							/>
							<div className="flex justify-between text-xs text-muted-foreground">
								<span>0.1s</span>
								<span>3.0s</span>
							</div>
						</div>

						{/* Direction Control - Only for wipe/slide/zoom */}
						{editingTransition &&
							(editingTransition.transition.type === "wipe" ||
								editingTransition.transition.type === "slide" ||
								editingTransition.transition.type === "zoom") && (
								<div className="space-y-2">
									<Label htmlFor="transition-direction">Direction</Label>
									<Select
										value={transitionDirection as string}
										onValueChange={(value) => setTransitionDirection(value as WipeDirection | ZoomDirection)}>
										<SelectTrigger id="transition-direction" className="w-full">
											<SelectValue placeholder="Select direction" />
										</SelectTrigger>
										<SelectContent>
											{(editingTransition.transition.type === "zoom" ? zoomDirectionOptions : directionOptions).map(
												(opt) => (
													<SelectItem key={opt.value} value={opt.value}>
														{opt.label}
													</SelectItem>
												)
											)}
										</SelectContent>
									</Select>
								</div>
							)}

						{/* Transition Info */}
						{editingTransition && (
							<div
								className={cn(
									"p-3 rounded-md border-2 bg-muted/50",
									editingTransition.transition.type === "fade" && "border-blue-500",
									editingTransition.transition.type === "dissolve" && "border-purple-500",
									editingTransition.transition.type === "wipe" && "border-green-500",
									editingTransition.transition.type === "slide" && "border-orange-500",
									editingTransition.transition.type === "zoom" && "border-yellow-500"
								)}>
								<p className="text-sm">
									<span className="font-medium">Position:</span>{" "}
									{editingTransition.position === "in" ? "Clip Start" : "Clip End"}
								</p>
								<p className="text-sm">
									<span className="font-medium">Type:</span>{" "}
									{editingTransition.transition.type.charAt(0).toUpperCase() +
										editingTransition.transition.type.slice(1)}
								</p>
							</div>
						)}
					</div>

					{/* Actions */}
					<div className="flex justify-between gap-2">
						<Button variant="destructive" onClick={handleTransitionRemove} className="flex-1">
							Remove
						</Button>
						<Button variant="default" onClick={handleTransitionSave} className="flex-1">
							Save
						</Button>
					</div>
				</DialogContent>
			</Dialog>
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
