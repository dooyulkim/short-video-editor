import React, { useEffect, useRef } from 'react';

interface TimelineRulerProps {
	width: number; // Total width in pixels
	zoom: number; // Pixels per second
	duration: number; // Total duration in seconds
	currentTime: number; // Current playhead position in seconds
	onTimeChange: (time: number) => void; // Callback when time changes
}

/**
 * TimelineRuler component renders time markers and labels
 * Adjusts marker density based on zoom level for optimal readability
 */
export const TimelineRuler: React.FC<TimelineRulerProps> = ({ width, zoom, duration, currentTime, onTimeChange }) => {
	const canvasRef = useRef<HTMLCanvasElement>(null);
	const containerRef = useRef<HTMLDivElement>(null);
	const [isDragging, setIsDragging] = React.useState(false);

	/**
	 * Format time in seconds to MM:SS or HH:MM:SS format
	 */
	const formatTime = (seconds: number): string => {
		const hrs = Math.floor(seconds / 3600);
		const mins = Math.floor((seconds % 3600) / 60);
		const secs = Math.floor(seconds % 60);

		if (hrs > 0) {
			return `${hrs.toString().padStart(2, "0")}:${mins.toString().padStart(2, "0")}:${secs
				.toString()
				.padStart(2, "0")}`;
		} else {
			return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
		}
	};

	useEffect(() => {
		const canvas = canvasRef.current;
		if (!canvas) return;

		const ctx = canvas.getContext("2d");
		if (!ctx) return;

		// Set canvas size
		canvas.width = width;
		canvas.height = 30;

		// Clear canvas
		ctx.clearRect(0, 0, width, canvas.height);

		// Determine marker interval based on zoom level
		let majorInterval: number; // seconds
		let minorInterval: number; // seconds

		if (zoom >= 100) {
			// High zoom: show every second with 0.5s minor markers
			majorInterval = 1;
			minorInterval = 0.5;
		} else if (zoom >= 50) {
			// Medium-high zoom: show every 5 seconds with 1s minor markers
			majorInterval = 5;
			minorInterval = 1;
		} else if (zoom >= 20) {
			// Medium zoom: show every 10 seconds with 5s minor markers
			majorInterval = 10;
			minorInterval = 5;
		} else if (zoom >= 10) {
			// Medium-low zoom: show every 30 seconds with 10s minor markers
			majorInterval = 30;
			minorInterval = 10;
		} else {
			// Low zoom: show every 60 seconds with 30s minor markers
			majorInterval = 60;
			minorInterval = 30;
		}

		// Draw minor markers
		ctx.strokeStyle = "#444";
		ctx.lineWidth = 1;
		for (let time = 0; time <= duration; time += minorInterval) {
			const x = time * zoom;
			if (x > width) break;

			ctx.beginPath();
			ctx.moveTo(x, canvas.height - 5);
			ctx.lineTo(x, canvas.height);
			ctx.stroke();
		}

		// Draw major markers and labels
		ctx.strokeStyle = "#888";
		ctx.lineWidth = 2;
		ctx.fillStyle = "#ddd";
		ctx.font = "10px sans-serif";
		ctx.textAlign = "center";

		for (let time = 0; time <= duration; time += majorInterval) {
			const x = time * zoom;
			if (x > width) break;

			// Draw marker line
			ctx.beginPath();
			ctx.moveTo(x, canvas.height - 10);
			ctx.lineTo(x, canvas.height);
			ctx.stroke();

			// Draw time label
			const label = formatTime(time);
			ctx.fillText(label, x, 12);
		}

		// Draw playhead line
		const playheadX = currentTime * zoom;
		ctx.strokeStyle = "#ef4444";
		ctx.lineWidth = 2;
		ctx.beginPath();
		ctx.moveTo(playheadX, 0);
		ctx.lineTo(playheadX, canvas.height);
		ctx.stroke();

		// Draw playhead handle (triangle at bottom)
		ctx.fillStyle = "#ef4444";
		ctx.beginPath();
		ctx.moveTo(playheadX, canvas.height);
		ctx.lineTo(playheadX - 6, canvas.height - 10);
		ctx.lineTo(playheadX + 6, canvas.height - 10);
		ctx.closePath();
		ctx.fill();
	}, [width, zoom, duration, formatTime, currentTime]);

	// Handle mouse interactions for playhead dragging
	const handleMouseDown = (e: React.MouseEvent) => {
		setIsDragging(true);
		updateTimeFromEvent(e);
	};

	const handleMouseMove = (e: React.MouseEvent) => {
		if (isDragging) {
			updateTimeFromEvent(e);
		}
	};

	const handleMouseUp = () => {
		setIsDragging(false);
	};

	const updateTimeFromEvent = (e: React.MouseEvent) => {
		if (!containerRef.current) return;
		const rect = containerRef.current.getBoundingClientRect();
		const x = e.clientX - rect.left;
		const time = Math.max(0, Math.min(x / zoom, duration));
		onTimeChange(time);
	};

	React.useEffect(() => {
		const handleGlobalMouseUp = () => setIsDragging(false);
		if (isDragging) {
			document.addEventListener("mouseup", handleGlobalMouseUp);
			return () => document.removeEventListener("mouseup", handleGlobalMouseUp);
		}
	}, [isDragging]);

	return (
		<div
			ref={containerRef}
			className="timeline-ruler bg-gray-900 border-b border-gray-700 cursor-pointer"
			data-testid="timeline-ruler"
			onMouseDown={handleMouseDown}
			onMouseMove={handleMouseMove}
			onMouseUp={handleMouseUp}>
			<canvas ref={canvasRef} className="block pointer-events-none" style={{ width: `${width}px`, height: "30px" }} />
		</div>
	);
};
