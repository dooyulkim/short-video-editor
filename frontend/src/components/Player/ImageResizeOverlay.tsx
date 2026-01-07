import React, { useState, useCallback, useEffect, useRef, useMemo } from "react";
import type { Clip } from "@/types/timeline";

interface ImageResizeOverlayProps {
	clip: Clip;
	canvasWidth: number;
	canvasHeight: number;
	onResize: (
		clipId: string,
		scale: { x: number; y: number },
		position?: { x: number; y: number },
		rotation?: number
	) => void;
	imageWidth: number;
	imageHeight: number;
	scaleRatio: number; // Ratio of display size to canvas size
	canvasSizeWidth: number; // Actual canvas width (not display)
	canvasSizeHeight: number; // Actual canvas height (not display)
}

type ResizeHandle = "top-left" | "top-right" | "bottom-left" | "bottom-right" | "top" | "bottom" | "left" | "right";

export const ImageResizeOverlay: React.FC<ImageResizeOverlayProps> = ({
	clip,
	canvasWidth,
	canvasHeight,
	onResize,
	imageWidth,
	imageHeight,
	scaleRatio,
	canvasSizeWidth,
	canvasSizeHeight,
}) => {
	const [isDragging, setIsDragging] = useState(false);
	const [activeHandle, setActiveHandle] = useState<ResizeHandle | null>(null);
	const [maintainAspectRatio, setMaintainAspectRatio] = useState(true);
	const [isDraggingMove, setIsDraggingMove] = useState(false);
	const [isRotating, setIsRotating] = useState(false);

	const dragStartRef = useRef<{
		mouseX: number;
		mouseY: number;
		scale: { x: number; y: number };
		position: { x: number; y: number };
		width: number;
		height: number;
	} | null>(null);

	const rotationStartRef = useRef<{
		mouseX: number;
		mouseY: number;
		rotation: number;
		centerX: number;
		centerY: number;
	} | null>(null);

	// Get current scale (handle both number and object)
	const currentScale = clip.scale ?? 1;
	const scaleX = typeof currentScale === "number" ? currentScale : currentScale.x;
	const scaleY = typeof currentScale === "number" ? currentScale : currentScale.y;
	const currentPosition = useMemo(() => clip.position ?? { x: 0, y: 0 }, [clip.position]);
	const currentRotation = clip.rotation ?? 0;

	// Calculate current dimensions in canvas coordinates
	const currentWidth = imageWidth * scaleX;
	const currentHeight = imageHeight * scaleY;

	// Calculate actual position in canvas coordinates (matching VideoPlayer's rendering logic exactly)
	// Center image if position is not explicitly set (0, 0)
	const actualCanvasPosition = useMemo(() => {
		// Match VideoPlayer's logic: center if position.x or position.y is 0
		const x = currentPosition.x !== 0 ? currentPosition.x : (canvasSizeWidth - imageWidth) / 2;
		const y = currentPosition.y !== 0 ? currentPosition.y : (canvasSizeHeight - imageHeight) / 2;
		return { x, y };
	}, [
		currentPosition.x,
		currentPosition.y,
		canvasSizeWidth,
		canvasSizeHeight,
		imageWidth,
		imageHeight,
		scaleX,
		scaleY,
	]);

	// Calculate bounding box position in display coordinates
	const boxX = actualCanvasPosition.x * scaleRatio;
	const boxY = actualCanvasPosition.y * scaleRatio;

	// Calculate display dimensions
	const displayWidth = currentWidth * scaleRatio;
	const displayHeight = currentHeight * scaleRatio;

	const handleMouseDown = useCallback(
		(e: React.MouseEvent, handle: ResizeHandle) => {
			e.preventDefault();
			e.stopPropagation();

			setIsDragging(true);
			setActiveHandle(handle);

			dragStartRef.current = {
				mouseX: e.clientX,
				mouseY: e.clientY,
				scale: { x: scaleX, y: scaleY },
				position: { ...actualCanvasPosition },
				width: currentWidth,
				height: currentHeight,
			};

			// Check if shift is pressed for aspect ratio toggle
			setMaintainAspectRatio(!e.shiftKey);
		},
		[scaleX, scaleY, actualCanvasPosition, currentWidth, currentHeight]
	);

	const handleMouseMove = useCallback(
		(e: MouseEvent) => {
			if (!isDragging || !activeHandle || !dragStartRef.current) return;

			// Convert mouse deltas from display coordinates to canvas coordinates
			const deltaX = (e.clientX - dragStartRef.current.mouseX) / scaleRatio;
			const deltaY = (e.clientY - dragStartRef.current.mouseY) / scaleRatio;

			let newWidth = dragStartRef.current.width;
			let newHeight = dragStartRef.current.height;
			let newX = dragStartRef.current.position.x;
			let newY = dragStartRef.current.position.y;

			const aspectRatio = imageWidth / imageHeight;

			// Calculate size changes based on handle
			switch (activeHandle) {
				case "top-left":
					newWidth = dragStartRef.current.width - deltaX;
					newHeight = dragStartRef.current.height - deltaY;
					newX = dragStartRef.current.position.x + deltaX;
					newY = dragStartRef.current.position.y + deltaY;
					break;
				case "top-right":
					newWidth = dragStartRef.current.width + deltaX;
					newHeight = dragStartRef.current.height - deltaY;
					newY = dragStartRef.current.position.y + deltaY;
					break;
				case "bottom-left":
					newWidth = dragStartRef.current.width - deltaX;
					newHeight = dragStartRef.current.height + deltaY;
					newX = dragStartRef.current.position.x + deltaX;
					break;
				case "bottom-right":
					newWidth = dragStartRef.current.width + deltaX;
					newHeight = dragStartRef.current.height + deltaY;
					break;
				case "top":
					newHeight = dragStartRef.current.height - deltaY;
					newY = dragStartRef.current.position.y + deltaY;
					if (maintainAspectRatio) {
						newWidth = newHeight * aspectRatio;
						newX = dragStartRef.current.position.x - (newWidth - dragStartRef.current.width) / 2;
					}
					break;
				case "bottom":
					newHeight = dragStartRef.current.height + deltaY;
					if (maintainAspectRatio) {
						newWidth = newHeight * aspectRatio;
						newX = dragStartRef.current.position.x - (newWidth - dragStartRef.current.width) / 2;
					}
					break;
				case "left":
					newWidth = dragStartRef.current.width - deltaX;
					newX = dragStartRef.current.position.x + deltaX;
					if (maintainAspectRatio) {
						newHeight = newWidth / aspectRatio;
						newY = dragStartRef.current.position.y - (newHeight - dragStartRef.current.height) / 2;
					}
					break;
				case "right":
					newWidth = dragStartRef.current.width + deltaX;
					if (maintainAspectRatio) {
						newHeight = newWidth / aspectRatio;
						newY = dragStartRef.current.position.y - (newHeight - dragStartRef.current.height) / 2;
					}
					break;
			}

			// Maintain aspect ratio for corner handles if needed
			if (maintainAspectRatio && ["top-left", "top-right", "bottom-left", "bottom-right"].includes(activeHandle)) {
				// Use the larger dimension change to maintain aspect ratio
				const widthChange = Math.abs(newWidth - dragStartRef.current.width);
				const heightChange = Math.abs(newHeight - dragStartRef.current.height);

				if (widthChange > heightChange) {
					newHeight = newWidth / aspectRatio;

					// Adjust position for top handles
					if (activeHandle.includes("top")) {
						newY = dragStartRef.current.position.y + dragStartRef.current.height - newHeight;
					}
				} else {
					newWidth = newHeight * aspectRatio;

					// Adjust position for left handles
					if (activeHandle.includes("left")) {
						newX = dragStartRef.current.position.x + dragStartRef.current.width - newWidth;
					}
				}
			}

			// Prevent negative dimensions
			if (newWidth < 10) newWidth = 10;
			if (newHeight < 10) newHeight = 10;

			// Calculate new scale
			const newScaleX = newWidth / imageWidth;
			const newScaleY = newHeight / imageHeight;

			onResize(clip.id, { x: newScaleX, y: newScaleY }, { x: newX, y: newY });
		},
		[isDragging, activeHandle, imageWidth, imageHeight, maintainAspectRatio, clip.id, onResize, scaleRatio]
	);

	const handleMouseUp = useCallback(() => {
		setIsDragging(false);
		setActiveHandle(null);
		setIsDraggingMove(false);
		setIsRotating(false);
		dragStartRef.current = null;
		rotationStartRef.current = null;
	}, []);

	const handleMoveStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();

			setIsDraggingMove(true);

			dragStartRef.current = {
				mouseX: e.clientX,
				mouseY: e.clientY,
				scale: { x: scaleX, y: scaleY },
				position: { ...actualCanvasPosition },
				width: currentWidth,
				height: currentHeight,
			};
		},
		[scaleX, scaleY, actualCanvasPosition, currentWidth, currentHeight]
	);

	const handleRotateStart = useCallback(
		(e: React.MouseEvent) => {
			e.preventDefault();
			e.stopPropagation();

			setIsRotating(true);

			// Calculate center of the image in screen coordinates
			const centerX = boxX + displayWidth / 2;
			const centerY = boxY + displayHeight / 2;

			rotationStartRef.current = {
				mouseX: e.clientX,
				mouseY: e.clientY,
				rotation: currentRotation,
				centerX,
				centerY,
			};
		},
		[boxX, boxY, displayWidth, displayHeight, currentRotation]
	);

	const handleMove = useCallback(
		(e: MouseEvent) => {
			if (!isDraggingMove || !dragStartRef.current) return;

			// Convert mouse deltas from display coordinates to canvas coordinates
			const deltaX = (e.clientX - dragStartRef.current.mouseX) / scaleRatio;
			const deltaY = (e.clientY - dragStartRef.current.mouseY) / scaleRatio;

			const newX = dragStartRef.current.position.x + deltaX;
			const newY = dragStartRef.current.position.y + deltaY;

			// Update position without changing scale
			onResize(clip.id, { x: scaleX, y: scaleY }, { x: newX, y: newY });
		},
		[isDraggingMove, scaleRatio, clip.id, onResize, scaleX, scaleY]
	);

	const handleRotate = useCallback(
		(e: MouseEvent) => {
			if (!isRotating || !rotationStartRef.current) return;

			const { centerX, centerY, rotation: startRotation } = rotationStartRef.current;

			// Calculate angle from center to current mouse position
			const currentAngle = Math.atan2(e.clientY - centerY, e.clientX - centerX);

			// Calculate angle from center to start mouse position
			const startAngle = Math.atan2(
				rotationStartRef.current.mouseY - centerY,
				rotationStartRef.current.mouseX - centerX
			);

			// Calculate rotation delta in degrees
			const deltaAngle = ((currentAngle - startAngle) * 180) / Math.PI;
			const newRotation = startRotation + deltaAngle;

			// Update rotation
			onResize(clip.id, { x: scaleX, y: scaleY }, actualCanvasPosition, newRotation);
		},
		[isRotating, clip.id, onResize, scaleX, scaleY, actualCanvasPosition]
	);

	// Add/remove event listeners
	useEffect(() => {
		if (isDragging) {
			window.addEventListener("mousemove", handleMouseMove);
			window.addEventListener("mouseup", handleMouseUp);

			return () => {
				window.removeEventListener("mousemove", handleMouseMove);
				window.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isDragging, handleMouseMove, handleMouseUp]);

	useEffect(() => {
		if (isDraggingMove) {
			window.addEventListener("mousemove", handleMove);
			window.addEventListener("mouseup", handleMouseUp);

			return () => {
				window.removeEventListener("mousemove", handleMove);
				window.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isDraggingMove, handleMove, handleMouseUp]);

	useEffect(() => {
		if (isRotating) {
			window.addEventListener("mousemove", handleRotate);
			window.addEventListener("mouseup", handleMouseUp);

			return () => {
				window.removeEventListener("mousemove", handleRotate);
				window.removeEventListener("mouseup", handleMouseUp);
			};
		}
	}, [isRotating, handleRotate, handleMouseUp]);

	// Handle positions for the resize handles (in display coordinates)
	const handleSize = 10;
	const handles = [
		{ type: "top-left" as ResizeHandle, x: boxX - handleSize / 2, y: boxY - handleSize / 2, cursor: "nw-resize" },
		{
			type: "top-right" as ResizeHandle,
			x: boxX + displayWidth - handleSize / 2,
			y: boxY - handleSize / 2,
			cursor: "ne-resize",
		},
		{
			type: "bottom-left" as ResizeHandle,
			x: boxX - handleSize / 2,
			y: boxY + displayHeight - handleSize / 2,
			cursor: "sw-resize",
		},
		{
			type: "bottom-right" as ResizeHandle,
			x: boxX + displayWidth - handleSize / 2,
			y: boxY + displayHeight - handleSize / 2,
			cursor: "se-resize",
		},
		{
			type: "top" as ResizeHandle,
			x: boxX + displayWidth / 2 - handleSize / 2,
			y: boxY - handleSize / 2,
			cursor: "n-resize",
		},
		{
			type: "bottom" as ResizeHandle,
			x: boxX + displayWidth / 2 - handleSize / 2,
			y: boxY + displayHeight - handleSize / 2,
			cursor: "s-resize",
		},
		{
			type: "left" as ResizeHandle,
			x: boxX - handleSize / 2,
			y: boxY + displayHeight / 2 - handleSize / 2,
			cursor: "w-resize",
		},
		{
			type: "right" as ResizeHandle,
			x: boxX + displayWidth - handleSize / 2,
			y: boxY + displayHeight / 2 - handleSize / 2,
			cursor: "e-resize",
		},
	];

	return (
		<div
			style={{
				position: "absolute",
				top: 0,
				left: 0,
				width: canvasWidth,
				height: canvasHeight,
				pointerEvents: "none",
			}}>
			{/* Bounding box - draggable to move image */}
			<div
				onMouseDown={handleMoveStart}
				style={{
					position: "absolute",
					left: boxX,
					top: boxY,
					width: displayWidth,
					height: displayHeight,
					border: "2px solid #3b82f6",
					pointerEvents: "auto",
					boxSizing: "border-box",
					cursor: isDraggingMove ? "grabbing" : "move",
				}}
			/>

			{/* Resize handles */}
			{handles.map((handle) => (
				<div
					key={handle.type}
					onMouseDown={(e) => handleMouseDown(e, handle.type)}
					style={{
						position: "absolute",
						left: handle.x,
						top: handle.y,
						width: handleSize,
						height: handleSize,
						backgroundColor: "#3b82f6",
						border: "2px solid white",
						borderRadius: "50%",
						cursor: handle.cursor,
						pointerEvents: "auto",
						zIndex: 1000,
					}}
				/>
			))}

			{/* Rotation handle - positioned at top center with line connecting to box */}
			<div
				onMouseDown={handleRotateStart}
				style={{
					position: "absolute",
					left: boxX + displayWidth / 2 - handleSize / 2,
					top: boxY + 40 - handleSize / 2,
					width: handleSize,
					height: handleSize,
					backgroundColor: "#10b981",
					border: "2px solid white",
					borderRadius: "50%",
					cursor: "crosshair",
					pointerEvents: "auto",
					zIndex: 1000,
				}}
			/>
			{/* Line connecting rotation handle to box */}
			<div
				style={{
					position: "absolute",
					left: boxX + displayWidth / 2 - 1,
					top: boxY,
					width: 2,
					height: 40,
					backgroundColor: "#10b981",
					pointerEvents: "none",
				}}
			/>

			{/* Rotation controls - next to rotation handle */}
			<div
				style={{
					position: "absolute",
					left: boxX + displayWidth / 2 + handleSize / 2 + 8,
					top: boxY + 20 - handleSize / 2 - 4,
					backgroundColor: "rgba(0, 0, 0, 0.8)",
					color: "white",
					padding: "4px 8px",
					borderRadius: "4px",
					fontSize: "12px",
					pointerEvents: "auto",
					display: "flex",
					alignItems: "center",
					gap: "6px",
					border: "1px solid rgba(16, 185, 129, 0.5)",
				}}>
				<input
					type="number"
					value={Math.round(currentRotation)}
					onChange={(e) => {
						const value = parseFloat(e.target.value) || 0;
						onResize(clip.id, { x: scaleX, y: scaleY }, actualCanvasPosition, value);
					}}
					style={{
						width: "50px",
						padding: "2px 4px",
						backgroundColor: "rgba(255, 255, 255, 0.1)",
						border: "1px solid rgba(255, 255, 255, 0.2)",
						borderRadius: "3px",
						color: "white",
						fontSize: "11px",
						textAlign: "center",
					}}
					onFocus={(e) => e.target.select()}
				/>
				<span style={{ fontSize: "11px", color: "#9ca3af" }}>°</span>
				<button
					onClick={() => onResize(clip.id, { x: scaleX, y: scaleY }, actualCanvasPosition, 0)}
					style={{
						padding: "2px 6px",
						backgroundColor: "rgba(239, 68, 68, 0.2)",
						border: "1px solid rgba(239, 68, 68, 0.5)",
						borderRadius: "3px",
						color: "#ef4444",
						fontSize: "9px",
						cursor: "pointer",
						fontWeight: "600",
					}}
					onMouseEnter={(e) => {
						e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.3)";
					}}
					onMouseLeave={(e) => {
						e.currentTarget.style.backgroundColor = "rgba(239, 68, 68, 0.2)";
					}}>
					RESET
				</button>
			</div>

			{/* Hint text */}
			<div
				style={{
					position: "absolute",
					left: boxX,
					top: boxY - 25,
					backgroundColor: "rgba(0, 0, 0, 0.7)",
					color: "white",
					padding: "4px 8px",
					borderRadius: "4px",
					fontSize: "12px",
					pointerEvents: "none",
					whiteSpace: "nowrap",
				}}>
				{isRotating
					? `🔄 Rotation: ${Math.round(currentRotation)}°`
					: maintainAspectRatio
					? "🔒 Aspect Ratio Locked (Hold Shift to unlock)"
					: "🔓 Free Resize (Hold Shift to lock)"}
			</div>
		</div>
	);
};
