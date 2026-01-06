import React, { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { TimelineRuler } from './TimelineRuler';
import type { TimelineLayer, Clip } from '@/types/timeline';
import { Plus, Minus } from 'lucide-react';

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

	const [layers, setLayers] = useState<TimelineLayer[]>(initialLayers);
	const [currentTime, setCurrentTime] = useState<number>(0);
	const [zoom, setZoom] = useState<number>(DEFAULT_ZOOM);
	const [duration, setDuration] = useState<number>(initialDuration);
	const [isDraggingPlayhead, setIsDraggingPlayhead] = useState<boolean>(false);

	const timelineWidth = duration * zoom;

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

			// Draw clip background
			const clipColor = getClipColor();
			ctx.fillStyle = clipColor;
			ctx.fillRect(x, y, width, height);

			// Draw clip border
			ctx.strokeStyle = "#555";
			ctx.lineWidth = 2;
			ctx.strokeRect(x, y, width, height);

			// Draw clip name
			ctx.fillStyle = "#fff";
			ctx.font = "11px sans-serif";
			ctx.textAlign = "left";
			const clipName = clip.resourceId.substring(0, 15) + "...";
			ctx.fillText(clipName, x + 5, y + 15);

			// Draw duration
			ctx.fillStyle = "#ccc";
			ctx.font = "10px sans-serif";
			ctx.fillText(`${clip.duration.toFixed(2)}s`, x + 5, y + 30);

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

			// Draw layer label area (fixed on left)
			ctx.fillStyle = "#333";
			ctx.fillRect(0, y, 120, LAYER_HEIGHT);

			ctx.fillStyle = "#fff";
			ctx.font = "12px sans-serif";
			ctx.textAlign = "left";
			ctx.fillText(layer.name || `${layer.type} Layer`, 10, y + 20);

			// Draw locked/hidden indicators
			if (layer.locked) {
				ctx.fillStyle = "#f59e0b";
				ctx.fillText("🔒 Locked", 10, y + 40);
			}
			if (!layer.visible) {
				ctx.fillStyle = "#6b7280";
				ctx.fillText("👁️ Hidden", 10, y + 60);
			}
		};

		/**
		 * Draw the playhead (vertical line at current time)
		 */
		const drawPlayhead = () => {
			const x = currentTime * zoom;

			// Draw playhead line
			ctx.strokeStyle = "#ef4444";
			ctx.lineWidth = 2;
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x, ctx.canvas.height);
			ctx.stroke();

			// Draw playhead handle (triangle at top)
			ctx.fillStyle = "#ef4444";
			ctx.beginPath();
			ctx.moveTo(x, 0);
			ctx.lineTo(x - 8, 15);
			ctx.lineTo(x + 8, 15);
			ctx.closePath();
			ctx.fill();
		};

		// Draw layers
		layers.forEach((layer, layerIndex) => {
			drawLayer(layer, layerIndex);
		});

		// Draw playhead
		drawPlayhead();
	}, [layers, currentTime, zoom, duration, timelineWidth]);

	/**
	 * Handle mouse down on canvas for playhead dragging
	 */
	const handleCanvasMouseDown = (e: React.MouseEvent<HTMLCanvasElement>) => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const time = x / zoom;

		setCurrentTime(Math.max(0, Math.min(time, duration)));
		setIsDraggingPlayhead(true);
	};

	/**
	 * Handle mouse move for playhead dragging
	 */
	const handleCanvasMouseMove = (e: React.MouseEvent<HTMLCanvasElement>) => {
		if (!isDraggingPlayhead) return;

		const canvas = canvasRef.current;
		if (!canvas) return;

		const rect = canvas.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const time = x / zoom;

		setCurrentTime(Math.max(0, Math.min(time, duration)));
	};

	/**
	 * Handle mouse up to stop playhead dragging
	 */
	const handleCanvasMouseUp = () => {
		setIsDraggingPlayhead(false);
	};

	/**
	 * Zoom in (increase pixels per second)
	 */
	const handleZoomIn = () => {
		setZoom((prev) => Math.min(prev * 1.5, MAX_ZOOM));
	};

	/**
	 * Zoom out (decrease pixels per second)
	 */
	const handleZoomOut = () => {
		setZoom((prev) => Math.max(prev / 1.5, MIN_ZOOM));
	};

	return (
		<div className="timeline-container bg-gray-950 border-t border-gray-700">
			{/* Timeline Controls */}
			<div className="timeline-controls flex items-center gap-1.5 p-1.5 bg-gray-900 border-b border-gray-700">
				<div className="flex items-center gap-1.5">
					<span className="text-xs text-gray-400">Zoom:</span>
					<Button variant="outline" size="icon" onClick={handleZoomOut} disabled={zoom <= MIN_ZOOM} className="h-6 w-6">
						<Minus className="h-3 w-3" />
					</Button>
					<span className="text-xs text-gray-300 min-w-16 text-center">{zoom.toFixed(0)} px/s</span>
					<Button variant="outline" size="icon" onClick={handleZoomIn} disabled={zoom >= MAX_ZOOM} className="h-6 w-6">
						<Plus className="h-3 w-3" />
					</Button>
				</div>

				<div className="ml-3 text-xs text-gray-400">
					Time: {formatTime(currentTime)} / {formatTime(duration)}
				</div>
			</div>

			{/* Timeline Ruler */}
			<TimelineRuler width={timelineWidth} zoom={zoom} duration={duration} />

			{/* Timeline Canvas Container - Horizontally scrollable */}
			<div
				ref={scrollContainerRef}
				className="timeline-scroll-container overflow-x-auto overflow-y-auto"
				style={{
					maxHeight: `${TIMELINE_HEIGHT}px`,
					maxWidth: "100%",
				}}>
				<canvas
					ref={canvasRef}
					className="timeline-canvas cursor-crosshair"
					onMouseDown={handleCanvasMouseDown}
					onMouseMove={handleCanvasMouseMove}
					onMouseUp={handleCanvasMouseUp}
					onMouseLeave={handleCanvasMouseUp}
				/>
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
  return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
};

export default Timeline;
