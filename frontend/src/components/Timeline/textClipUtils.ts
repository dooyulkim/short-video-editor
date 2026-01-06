import type { Clip } from "@/types/timeline";

interface TextData {
	type: "text";
	text: string;
	fontFamily: string;
	fontSize: number;
	color: string;
	animation?: "none" | "fade" | "slide";
}

// Utility function to measure text dimensions
export function measureText(
	text: string,
	fontFamily: string,
	fontSize: number,
	canvasContext?: CanvasRenderingContext2D
): { width: number; height: number } {
	let ctx = canvasContext;
	
	if (!ctx) {
		// Create temporary canvas for measurement
		const tempCanvas = document.createElement("canvas");
		ctx = tempCanvas.getContext("2d")!;
	}

	ctx.font = `${fontSize}px ${fontFamily}`;
	const lines = text.split("\n");
	const lineHeight = fontSize * 1.2;

	let maxWidth = 0;
	lines.forEach((line) => {
		const metrics = ctx.measureText(line);
		maxWidth = Math.max(maxWidth, metrics.width);
	});

	return {
		width: maxWidth,
		height: lines.length * lineHeight,
	};
}

// Utility function to render text clip thumbnail for timeline
export function renderTextClipThumbnail(clip: Clip, width: number, height: number): string {
	if (!clip.data || clip.data.type !== "text") {
		return "";
	}

	const canvas = document.createElement("canvas");
	canvas.width = width;
	canvas.height = height;
	const ctx = canvas.getContext("2d");

	if (!ctx) {
		return "";
	}

	const textData = clip.data as TextData;

	// Fill background
	ctx.fillStyle = "#1a1a1a";
	ctx.fillRect(0, 0, width, height);

	// Scale font size to fit thumbnail
	const scaleFactor = Math.min(width / 300, height / 100);
	const thumbnailFontSize = Math.min(textData.fontSize * scaleFactor, height * 0.6);

	// Draw text centered
	ctx.font = `${thumbnailFontSize}px ${textData.fontFamily}`;
	ctx.fillStyle = textData.color;
	ctx.textAlign = "center";
	ctx.textBaseline = "middle";

	// Truncate text if too long
	let displayText = textData.text.split("\n")[0]; // First line only
	if (displayText.length > 20) {
		displayText = displayText.substring(0, 20) + "...";
	}

	ctx.fillText(displayText, width / 2, height / 2);

	return canvas.toDataURL();
}
