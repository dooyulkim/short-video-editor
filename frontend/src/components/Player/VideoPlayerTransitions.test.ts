/**
 * Tests for VideoPlayer transition functions
 * These test the wipe/slide transition clipping logic extracted from VideoPlayer
 */

import { describe, it, expect, vi, beforeEach } from "vitest";

// Define the transition interfaces matching the actual types
interface Transition {
	type: "fade" | "dissolve" | "wipe" | "slide";
	duration: number;
	properties?: Record<string, any>;
}

interface Clip {
	id: string;
	duration: number;
	opacity?: number;
	transitions?: {
		in?: Transition;
		out?: Transition;
	};
}

// Extract the transition calculation logic for testing
const calculateTransitionOpacity = (clip: Clip, localTime: number): number => {
	let opacity = clip.opacity ?? 1.0;

	// Apply fade/dissolve in transition
	if (clip.transitions?.in) {
		const transition = clip.transitions.in;
		if (localTime < transition.duration) {
			const fadeProgress = localTime / transition.duration;

			if (transition.type === "fade" || transition.type === "dissolve") {
				opacity *= fadeProgress;
			}
		}
	}

	// Apply fade/dissolve out transition
	if (clip.transitions?.out) {
		const transition = clip.transitions.out;
		const fadeOutStart = clip.duration - transition.duration;

		if (localTime > fadeOutStart) {
			const fadeProgress = (clip.duration - localTime) / transition.duration;

			if (transition.type === "fade" || transition.type === "dissolve") {
				opacity *= fadeProgress;
			}
		}
	}

	return opacity;
};

// Extract clip path calculation for testing
const calculateClipRect = (
	direction: string,
	progress: number,
	canvasWidth: number,
	canvasHeight: number,
	transitionMode: "in" | "out"
): { x: number; y: number; width: number; height: number } => {
	const effectiveProgress = transitionMode === "in" ? progress : 1 - progress;

	switch (direction) {
		case "left":
			return { x: 0, y: 0, width: canvasWidth * effectiveProgress, height: canvasHeight };
		case "right": {
			const rightStartX = canvasWidth * (1 - effectiveProgress);
			return { x: rightStartX, y: 0, width: canvasWidth * effectiveProgress, height: canvasHeight };
		}
		case "up":
			return { x: 0, y: 0, width: canvasWidth, height: canvasHeight * effectiveProgress };
		case "down": {
			const downStartY = canvasHeight * (1 - effectiveProgress);
			return { x: 0, y: downStartY, width: canvasWidth, height: canvasHeight * effectiveProgress };
		}
		default:
			return { x: 0, y: 0, width: canvasWidth * effectiveProgress, height: canvasHeight };
	}
};

describe("VideoPlayer Transitions", () => {
	describe("calculateTransitionOpacity", () => {
		it("should return full opacity for clip without transitions", () => {
			const clip: Clip = { id: "1", duration: 5 };
			expect(calculateTransitionOpacity(clip, 2.5)).toBe(1.0);
		});

		it("should respect clip opacity when no transitions", () => {
			const clip: Clip = { id: "1", duration: 5, opacity: 0.5 };
			expect(calculateTransitionOpacity(clip, 2.5)).toBe(0.5);
		});

		it("should apply fade in transition at start", () => {
			const clip: Clip = {
				id: "1",
				duration: 5,
				transitions: { in: { type: "fade", duration: 1 } },
			};
			// At 0.5s into a 1s fade in, should be 50% progress
			expect(calculateTransitionOpacity(clip, 0.5)).toBe(0.5);
		});

		it("should apply fade out transition at end", () => {
			const clip: Clip = {
				id: "1",
				duration: 5,
				transitions: { out: { type: "fade", duration: 1 } },
			};
			// At 4.5s (0.5s from end) into a 5s clip with 1s fade out
			expect(calculateTransitionOpacity(clip, 4.5)).toBe(0.5);
		});

		it("should apply dissolve in transition like fade", () => {
			const clip: Clip = {
				id: "1",
				duration: 5,
				transitions: { in: { type: "dissolve", duration: 1 } },
			};
			expect(calculateTransitionOpacity(clip, 0.5)).toBe(0.5);
		});

		it("should NOT apply wipe transition to opacity", () => {
			const clip: Clip = {
				id: "1",
				duration: 5,
				transitions: { in: { type: "wipe", duration: 1, properties: { direction: "left" } } },
			};
			// Wipe doesn't affect opacity
			expect(calculateTransitionOpacity(clip, 0.5)).toBe(1.0);
		});

		it("should NOT apply slide transition to opacity", () => {
			const clip: Clip = {
				id: "1",
				duration: 5,
				transitions: { in: { type: "slide", duration: 1, properties: { direction: "right" } } },
			};
			// Slide doesn't affect opacity
			expect(calculateTransitionOpacity(clip, 0.5)).toBe(1.0);
		});
	});

	describe("calculateClipRect for wipe/slide transitions", () => {
		const canvasWidth = 1920;
		const canvasHeight = 1080;

		describe("wipe left direction", () => {
			it("should show nothing at progress 0 for wipe in", () => {
				const rect = calculateClipRect("left", 0, canvasWidth, canvasHeight, "in");
				expect(rect.width).toBe(0);
			});

			it("should show half at progress 0.5 for wipe in", () => {
				const rect = calculateClipRect("left", 0.5, canvasWidth, canvasHeight, "in");
				expect(rect.x).toBe(0);
				expect(rect.width).toBe(canvasWidth * 0.5);
			});

			it("should show full at progress 1 for wipe in", () => {
				const rect = calculateClipRect("left", 1, canvasWidth, canvasHeight, "in");
				expect(rect.width).toBe(canvasWidth);
			});

			it("should show full at progress 0 for wipe out", () => {
				const rect = calculateClipRect("left", 0, canvasWidth, canvasHeight, "out");
				expect(rect.width).toBe(canvasWidth);
			});

			it("should show nothing at progress 1 for wipe out", () => {
				const rect = calculateClipRect("left", 1, canvasWidth, canvasHeight, "out");
				expect(rect.width).toBe(0);
			});
		});

		describe("wipe right direction", () => {
			it("should start from right edge for wipe in", () => {
				const rect = calculateClipRect("right", 0.5, canvasWidth, canvasHeight, "in");
				expect(rect.x).toBe(canvasWidth * 0.5);
				expect(rect.width).toBe(canvasWidth * 0.5);
			});
		});

		describe("wipe up direction", () => {
			it("should wipe from top to bottom for wipe in", () => {
				const rect = calculateClipRect("up", 0.5, canvasWidth, canvasHeight, "in");
				expect(rect.y).toBe(0);
				expect(rect.height).toBe(canvasHeight * 0.5);
			});
		});

		describe("wipe down direction", () => {
			it("should wipe from bottom to top for wipe in", () => {
				const rect = calculateClipRect("down", 0.5, canvasWidth, canvasHeight, "in");
				expect(rect.y).toBe(canvasHeight * 0.5);
				expect(rect.height).toBe(canvasHeight * 0.5);
			});
		});

		describe("default direction", () => {
			it("should default to left wipe for unknown direction", () => {
				const rect = calculateClipRect("unknown", 0.5, canvasWidth, canvasHeight, "in");
				expect(rect.x).toBe(0);
				expect(rect.width).toBe(canvasWidth * 0.5);
			});
		});
	});
});
