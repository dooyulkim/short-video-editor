import React, { useState, useRef, useEffect } from "react";
import type { Clip, Transition } from "@/types/timeline";
import { cn } from "@/lib/utils";
import { TransitionIndicator } from "./TransitionIndicator";
import { KeyframeTrack } from "./KeyframeTrack";

interface TimelineClipProps {
	clip: Clip;
	zoom: number; // pixels per second
	isSelected: boolean;
	onSelect: (clipId: string) => void;
	onMove: (clipId: string, newStartTime: number) => void;
	onTrim: (clipId: string, newDuration: number, newTrimStart: number) => void;
	onTransitionEdit?: (clipId: string, position: "in" | "out", transition: Transition) => void;
	onTransitionRemove?: (clipId: string, position: "in" | "out") => void;
	onTransitionAdd?: (clipId: string, position: "in" | "out", transition: Transition) => void;
	onUpdateClip?: (clipId: string, updates: Partial<Clip>) => void;
	currentTime: number;
	showKeyframes?: boolean;
}

export const TimelineClip: React.FC<TimelineClipProps> = ({
	clip,
	zoom,
	isSelected,
	onSelect,
	onMove,
	onTrim,
	onTransitionEdit,
	onTransitionRemove,
	onTransitionAdd,
	onUpdateClip,
	currentTime,
	showKeyframes = true,
}) => {
	const [isDragging, setIsDragging] = useState(false);
	const [isTrimmingLeft, setIsTrimmingLeft] = useState(false);
	const [isTrimmingRight, setIsTrimmingRight] = useState(false);
	const [dragStartX, setDragStartX] = useState(0);
	const [dragStartTime, setDragStartTime] = useState(0);
	const [transitionDropZone, setTransitionDropZone] = useState<"in" | "out" | null>(null);
	const clipRef = useRef<HTMLDivElement>(null);

	// Calculate clip width based on duration and zoom
	const clipWidth = clip.duration * zoom;
	const clipLeft = clip.startTime * zoom;

	// Handle clip selection
	const handleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		onSelect(clip.id);
	};

	// Handle drag start for moving clip
	const handleDragStart = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsDragging(true);
		setDragStartX(e.clientX);
		setDragStartTime(clip.startTime);
		onSelect(clip.id);
	};

	// Handle trim start (left edge)
	const handleTrimLeftStart = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsTrimmingLeft(true);
		setDragStartX(e.clientX);
		setDragStartTime(clip.startTime);
		onSelect(clip.id);
	};

	// Handle trim start (right edge)
	const handleTrimRightStart = (e: React.MouseEvent) => {
		e.stopPropagation();
		setIsTrimmingRight(true);
		setDragStartX(e.clientX);
		onSelect(clip.id);
	};

	// Handle mouse move for dragging and trimming
	useEffect(() => {
		const handleMouseMove = (e: MouseEvent) => {
			if (isDragging) {
				const deltaX = e.clientX - dragStartX;
				const deltaTime = deltaX / zoom;
				let newStartTime = dragStartTime + deltaTime;

				// Snap to seconds
				newStartTime = Math.round(newStartTime);
				newStartTime = Math.max(0, newStartTime); // Prevent negative time

				onMove(clip.id, newStartTime);
			} else if (isTrimmingLeft) {
				const deltaX = e.clientX - dragStartX;
				const deltaTime = deltaX / zoom;
				let newStartTime = dragStartTime + deltaTime;
				const newTrimStart = clip.trimStart - deltaTime;
				const newDuration = clip.duration - deltaTime;

				// Snap to seconds
				newStartTime = Math.round(newStartTime);
				const snappedDelta = newStartTime - dragStartTime;

				if (newDuration > 0.1 && newTrimStart >= 0) {
					onMove(clip.id, newStartTime);
					onTrim(clip.id, clip.duration - snappedDelta, clip.trimStart + snappedDelta);
				}
			} else if (isTrimmingRight) {
				const deltaX = e.clientX - dragStartX;
				const deltaTime = deltaX / zoom;
				let newDuration = clip.duration + deltaTime;

				// Snap to seconds
				newDuration = Math.round(newDuration);
				newDuration = Math.max(0.1, newDuration); // Minimum duration

				onTrim(clip.id, newDuration, clip.trimStart);
			}
		};

		const handleMouseUp = () => {
			setIsDragging(false);
			setIsTrimmingLeft(false);
			setIsTrimmingRight(false);
		};

		if (isDragging || isTrimmingLeft || isTrimmingRight) {
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);
		}

		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDragging, isTrimmingLeft, isTrimmingRight, dragStartX, dragStartTime, clip, zoom, onMove, onTrim]);

	// Determine cursor style
	const getCursorClass = () => {
		if (isDragging) return "cursor-grabbing";
		if (isTrimmingLeft || isTrimmingRight) return "cursor-ew-resize";
		return "cursor-grab";
	};

	// Handle transition edit
	const handleTransitionEdit = (position: "in" | "out", transition: Transition) => {
		if (onTransitionEdit) {
			onTransitionEdit(clip.id, position, transition);
		}
	};

	// Handle transition remove
	const handleTransitionRemove = (position: "in" | "out") => {
		if (onTransitionRemove) {
			onTransitionRemove(clip.id, position);
		}
	};

	// Check if dropped data is a transition
	const isTransitionData = (data: string): boolean => {
		try {
			const parsed = JSON.parse(data);
			// Transitions have a 'type' that is one of the transition types and a 'duration'
			return (
				parsed &&
				typeof parsed.type === "string" &&
				["fade", "dissolve", "wipe", "slide"].includes(parsed.type) &&
				typeof parsed.duration === "number"
			);
		} catch {
			return false;
		}
	};

	// Handle transition drop on clip edge
	const handleTransitionDrop = (e: React.DragEvent, position: "in" | "out") => {
		e.preventDefault();
		e.stopPropagation();
		setTransitionDropZone(null);

		const data = e.dataTransfer.getData("application/json");
		if (!data || !isTransitionData(data)) return;

		try {
			const transition: Transition = JSON.parse(data);
			if (onTransitionAdd) {
				onTransitionAdd(clip.id, position, transition);
			}
		} catch (error) {
			console.error("Failed to parse transition data:", error);
		}
	};

	// Handle drag over for transition drop zones
	const handleTransitionDragOver = (e: React.DragEvent, position: "in" | "out") => {
		const data = e.dataTransfer.getData("application/json");
		// Check types array for transition data
		const hasTransitionData = e.dataTransfer.types.includes("application/json");
		if (hasTransitionData) {
			e.preventDefault();
			e.stopPropagation();
			setTransitionDropZone(position);
		}
	};

	// Handle drag leave for transition drop zones
	const handleTransitionDragLeave = (e: React.DragEvent) => {
		e.stopPropagation();
		setTransitionDropZone(null);
	};

	return (
		<div className="relative">
			{/* Transition drop zone - LEFT (in) */}
			<div
				className={cn(
					"absolute top-0 bottom-0 w-6 z-20",
					"transition-all duration-150",
					transitionDropZone === "in"
						? "bg-blue-500/50 border-2 border-blue-400 border-dashed"
						: "bg-transparent hover:bg-blue-500/20"
				)}
				style={{
					left: `${clipLeft - 12}px`,
				}}
				onDragOver={(e) => handleTransitionDragOver(e, "in")}
				onDragLeave={handleTransitionDragLeave}
				onDrop={(e) => handleTransitionDrop(e, "in")}
			/>

			{/* Transition drop zone - RIGHT (out) */}
			<div
				className={cn(
					"absolute top-0 bottom-0 w-6 z-20",
					"transition-all duration-150",
					transitionDropZone === "out"
						? "bg-orange-500/50 border-2 border-orange-400 border-dashed"
						: "bg-transparent hover:bg-orange-500/20"
				)}
				style={{
					left: `${clipLeft + clipWidth - 12}px`,
				}}
				onDragOver={(e) => handleTransitionDragOver(e, "out")}
				onDragLeave={handleTransitionDragLeave}
				onDrop={(e) => handleTransitionDrop(e, "out")}
			/>

			<div
				ref={clipRef}
				className={cn(
					"absolute top-1 bottom-1 rounded overflow-hidden",
					"bg-blue-500 hover:bg-blue-600 transition-colors",
					"flex items-center justify-between px-1",
					getCursorClass(),
					isSelected && "ring-2 ring-yellow-400 ring-inset"
				)}
				style={{
					left: `${clipLeft}px`,
					width: `${clipWidth}px`,
				}}
				onClick={handleClick}
				onMouseDown={handleDragStart}
				title={`Duration: ${clip.duration.toFixed(2)}s`}>
				{/* Left trim handle */}
				<div
					className={cn(
						"absolute left-0 top-0 bottom-0 w-1.5",
						"bg-yellow-400 opacity-0 hover:opacity-100",
						"cursor-ew-resize transition-opacity",
						isTrimmingLeft && "opacity-100"
					)}
					onMouseDown={handleTrimLeftStart}
					onClick={(e) => e.stopPropagation()}
				/>

				{/* Transition in indicator */}
				{clip.transitions?.in && (
					<TransitionIndicator
						transition={clip.transitions.in}
						position="start"
						onEdit={(transition) => handleTransitionEdit("in", transition)}
						onRemove={() => handleTransitionRemove("in")}
					/>
				)}

				{/* Clip content */}
				<div className="flex-1 flex items-center justify-center text-white text-xs font-medium truncate px-2 select-none">
					<span className="truncate">{clip.resourceId.substring(0, 8)}</span>
				</div>

				{/* Transition out indicator */}
				{clip.transitions?.out && (
					<TransitionIndicator
						transition={clip.transitions.out}
						position="end"
						onEdit={(transition) => handleTransitionEdit("out", transition)}
						onRemove={() => handleTransitionRemove("out")}
					/>
				)}

				{/* Right trim handle */}
				<div
					className={cn(
						"absolute right-0 top-0 bottom-0 w-1.5",
						"bg-yellow-400 opacity-0 hover:opacity-100",
						"cursor-ew-resize transition-opacity",
						isTrimmingRight && "opacity-100"
					)}
					onMouseDown={handleTrimRightStart}
					onClick={(e) => e.stopPropagation()}
				/>
			</div>

			{/* Keyframe track - shown when clip is selected and has keyframes capability */}
			{isSelected && showKeyframes && onUpdateClip && (clip.data?.type === "image" || clip.data?.type === "video") && (
				<div
					className="absolute"
					style={{
						left: `${clipLeft}px`,
						width: `${clipWidth}px`,
						top: "100%",
					}}>
					<KeyframeTrack clip={clip} zoom={zoom} onUpdateClip={onUpdateClip} currentTime={currentTime} />
				</div>
			)}
		</div>
	);
};
