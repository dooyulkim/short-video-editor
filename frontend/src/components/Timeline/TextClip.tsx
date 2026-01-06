import { useEffect, useRef } from "react";
import type { Clip } from "@/types/timeline";

interface TextClipProps {
	clip: Clip;
	currentTime: number;
	canvasContext: CanvasRenderingContext2D | null;
	canvasWidth?: number;
	canvasHeight?: number;
}

interface TextData {
	type: "text";
	text: string;
	fontFamily: string;
	fontSize: number;
	color: string;
	animation?: "none" | "fade" | "slide";
}

// Helper function to render text on canvas
function renderTextOnCanvas(
	ctx: CanvasRenderingContext2D,
	textData: TextData,
	position: { x: number; y: number },
	relativeTime: number,
	clip: Clip,
	canvasWidth: number,
	// eslint-disable-next-line @typescript-eslint/no-unused-vars
	_canvasHeight: number
) {
	const { text, fontFamily, fontSize, color, animation } = textData;

	// Save canvas state
	ctx.save();

	// Apply animations
	let opacity = clip.opacity || 1;
	let xOffset = 0;
	const yOffset = 0;

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
			xOffset = -(1 - relativeTime / 0.2) * canvasWidth * 0.3;
		}
	}

	// Apply opacity
	ctx.globalAlpha = opacity;

	// Set font properties
	ctx.font = `${fontSize}px ${fontFamily}`;
	ctx.fillStyle = color;
	ctx.textBaseline = "top";

	// Apply transformations if specified
	if (clip.rotation) {
		const centerX = position.x + xOffset;
		const centerY = position.y + yOffset;
		ctx.translate(centerX, centerY);
		ctx.rotate((clip.rotation * Math.PI) / 180);
		ctx.translate(-centerX, -centerY);
	}

	if (clip.scale) {
		const centerX = position.x + xOffset;
		const centerY = position.y + yOffset;
		ctx.translate(centerX, centerY);
		ctx.scale(clip.scale, clip.scale);
		ctx.translate(-centerX, -centerY);
	}

	// Handle multi-line text
	const lines = text.split("\n");
	const lineHeight = fontSize * 1.2;

	// Draw text shadow for better visibility
	ctx.shadowColor = "rgba(0, 0, 0, 0.7)";
	ctx.shadowBlur = 4;
	ctx.shadowOffsetX = 2;
	ctx.shadowOffsetY = 2;

	// Draw each line of text
	lines.forEach((line, index) => {
		const x = position.x + xOffset;
		const y = position.y + yOffset + index * lineHeight;
		ctx.fillText(line, x, y);
	});

	// Restore canvas state
	ctx.restore();
}

export function TextClip({ clip, currentTime, canvasContext, canvasWidth = 1920, canvasHeight = 1080 }: TextClipProps) {
	const prevTimeRef = useRef<number>(currentTime);

	useEffect(() => {
		if (!canvasContext || !clip.data || clip.data.type !== "text") {
			return;
		}

		// Check if clip should be visible at current time
		const clipStartTime = clip.startTime;
		const clipEndTime = clip.startTime + clip.duration;
		const isVisible = currentTime >= clipStartTime && currentTime < clipEndTime;

		if (!isVisible) {
			return;
		}

		// Parse text properties from clip.data
		const textData = clip.data as TextData;
		const position = clip.position || { x: 100, y: 100 };

		// Calculate relative time within the clip (0 to 1)
		const relativeTime = (currentTime - clipStartTime) / clip.duration;

		// Render text on canvas
		renderTextOnCanvas(canvasContext, textData, position, relativeTime, clip, canvasWidth, canvasHeight);

		prevTimeRef.current = currentTime;
	}, [clip, currentTime, canvasContext, canvasWidth, canvasHeight]);

	// This component doesn't render DOM elements, it only draws on canvas
	return null;
}
