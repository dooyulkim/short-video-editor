import { describe, it, expect, beforeEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import type { ReactNode } from "react";
import { TimelineProvider, useTimeline } from "@/context/TimelineContext";
import type { TimelineState } from "@/context/TimelineContext";
import type { Clip, TimelineLayer } from "@/types/timeline";

// Helper function to create a wrapper with TimelineProvider
function createWrapper(initialState?: Partial<TimelineState>) {
	return ({ children }: { children: ReactNode }) => (
		<TimelineProvider initialState={initialState}>{children}</TimelineProvider>
	);
}

// Helper function to create a mock clip
function createMockClip(overrides?: Partial<Clip>): Clip {
	return {
		id: `clip-${Math.random().toString(36).substr(2, 9)}`,
		resourceId: "resource-1",
		startTime: 0,
		duration: 5,
		trimStart: 0,
		trimEnd: 0,
		...overrides,
	};
}

// Helper function to create a mock layer
function createMockLayer(overrides?: Partial<TimelineLayer>): TimelineLayer {
	return {
		id: `layer-${Math.random().toString(36).substr(2, 9)}`,
		type: "video",
		clips: [],
		locked: false,
		visible: true,
		muted: false,
		name: "Video Layer 1",
		...overrides,
	};
}

describe("TimelineContext", () => {
	describe("Initial State", () => {
		it("should have correct default initial state", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper(),
			});

			expect(result.current.state.layers).toEqual([]);
			expect(result.current.state.currentTime).toBe(0);
			expect(result.current.state.duration).toBe(180); // Default minimum duration
			expect(result.current.state.zoom).toBe(20);
			expect(result.current.state.selectedClipId).toBeNull();
			expect(result.current.state.isPlaying).toBe(false);
		});

		it("should accept custom initial state", () => {
			const customInitialState: Partial<TimelineState> = {
				zoom: 50,
				currentTime: 10,
				duration: 100,
			};

			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper(customInitialState),
			});

			expect(result.current.state.zoom).toBe(50);
			expect(result.current.state.currentTime).toBe(10);
			expect(result.current.state.duration).toBe(100);
		});
	});

	describe("Layer Management", () => {
		it("should add a layer", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.addLayer("video");
			});

			expect(result.current.state.layers).toHaveLength(1);
			expect(result.current.state.layers[0].type).toBe("video");
			expect(result.current.state.layers[0].clips).toEqual([]);
			expect(result.current.state.layers[0].locked).toBe(false);
			expect(result.current.state.layers[0].visible).toBe(true);
			expect(result.current.state.layers[0].name).toContain("Video Layer");
		});

		it("should add multiple layers of different types", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.addLayer("video");
				result.current.addLayer("audio");
				result.current.addLayer("text");
			});

			expect(result.current.state.layers).toHaveLength(3);
			expect(result.current.state.layers[0].type).toBe("video");
			expect(result.current.state.layers[1].type).toBe("audio");
			expect(result.current.state.layers[2].type).toBe("text");
		});

		it("should remove a layer", () => {
			const layer = createMockLayer();
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ layers: [layer] }),
			});

			expect(result.current.state.layers).toHaveLength(1);

			act(() => {
				result.current.removeLayer(layer.id);
			});

			expect(result.current.state.layers).toHaveLength(0);
		});

		it("should not remove non-existent layer", () => {
			const layer = createMockLayer();
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ layers: [layer] }),
			});

			act(() => {
				result.current.removeLayer("non-existent-id");
			});

			expect(result.current.state.layers).toHaveLength(1);
		});
	});

	describe("Clip Management", () => {
		let mockLayer: TimelineLayer;

		beforeEach(() => {
			mockLayer = createMockLayer();
		});

		it("should add a clip to a layer", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ layers: [mockLayer] }),
			});

			const clip = createMockClip({ startTime: 0, duration: 5 });

			act(() => {
				result.current.addClip(clip, 0);
			});

			expect(result.current.state.layers[0].clips).toHaveLength(1);
			expect(result.current.state.layers[0].clips[0]).toEqual(clip);
		});

		it("should update duration when adding clip that extends beyond current duration", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ layers: [mockLayer], duration: 100 }),
			});

			const clip = createMockClip({ startTime: 105, duration: 10 });

			act(() => {
				result.current.addClip(clip, 0);
			});

			expect(result.current.state.duration).toBe(180); // Max of 180 minimum and 115 (105 + 10)
		});

		it("should not update duration when clip does not extend beyond current duration", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ layers: [mockLayer], duration: 180 }),
			});

			const clip = createMockClip({ startTime: 50, duration: 10 });

			act(() => {
				result.current.addClip(clip, 0);
			});

			expect(result.current.state.duration).toBe(180);
		});

		it("should remove a clip", () => {
			const clip = createMockClip({ id: "clip-1" });
			const layerWithClip = { ...mockLayer, clips: [clip] };

			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ layers: [layerWithClip] }),
			});

			expect(result.current.state.layers[0].clips).toHaveLength(1);

			act(() => {
				result.current.removeClip("clip-1");
			});

			expect(result.current.state.layers[0].clips).toHaveLength(0);
		});

		it("should clear selected clip when removing it", () => {
			const clip = createMockClip({ id: "clip-1" });
			const layerWithClip = { ...mockLayer, clips: [clip] };

			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({
					layers: [layerWithClip],
					selectedClipId: "clip-1",
				}),
			});

			expect(result.current.state.selectedClipId).toBe("clip-1");

			act(() => {
				result.current.removeClip("clip-1");
			});

			expect(result.current.state.selectedClipId).toBeNull();
		});

		it("should update a clip", () => {
			const clip = createMockClip({ id: "clip-1", duration: 5 });
			const layerWithClip = { ...mockLayer, clips: [clip] };

			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ layers: [layerWithClip] }),
			});

			act(() => {
				result.current.updateClip("clip-1", { duration: 10, opacity: 0.5 });
			});

			expect(result.current.state.layers[0].clips[0].duration).toBe(10);
			expect(result.current.state.layers[0].clips[0].opacity).toBe(0.5);
		});

		it("should move a clip", () => {
			const clip = createMockClip({ id: "clip-1", startTime: 0 });
			const layerWithClip = { ...mockLayer, clips: [clip] };

			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ layers: [layerWithClip] }),
			});

			act(() => {
				result.current.moveClip("clip-1", 10);
			});

			expect(result.current.state.layers[0].clips[0].startTime).toBe(10);
		});

		it("should not allow negative start time when moving clip", () => {
			const clip = createMockClip({ id: "clip-1", startTime: 5 });
			const layerWithClip = { ...mockLayer, clips: [clip] };

			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ layers: [layerWithClip] }),
			});

			act(() => {
				result.current.moveClip("clip-1", -5);
			});

			expect(result.current.state.layers[0].clips[0].startTime).toBe(0);
		});

		it("should trim a clip", () => {
			const clip = createMockClip({ id: "clip-1", duration: 10 });
			const layerWithClip = { ...mockLayer, clips: [clip] };

			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ layers: [layerWithClip] }),
			});

			act(() => {
				result.current.trimClip("clip-1", 5);
			});

			expect(result.current.state.layers[0].clips[0].duration).toBe(5);
		});

		it("should not allow negative duration when trimming clip", () => {
			const clip = createMockClip({ id: "clip-1", duration: 10 });
			const layerWithClip = { ...mockLayer, clips: [clip] };

			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ layers: [layerWithClip] }),
			});

			act(() => {
				result.current.trimClip("clip-1", -5);
			});

			expect(result.current.state.layers[0].clips[0].duration).toBe(0);
		});
	});

	describe("Playback Control", () => {
		it("should set current time", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ duration: 100 }),
			});

			act(() => {
				result.current.setCurrentTime(50);
			});

			expect(result.current.state.currentTime).toBe(50);
		});

		it("should clamp current time to duration", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ duration: 100 }),
			});

			act(() => {
				result.current.setCurrentTime(150);
			});

			expect(result.current.state.currentTime).toBe(100);
		});

		it("should not allow negative current time", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ duration: 100 }),
			});

			act(() => {
				result.current.setCurrentTime(-10);
			});

			expect(result.current.state.currentTime).toBe(0);
		});

		it("should play", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper(),
			});

			expect(result.current.state.isPlaying).toBe(false);

			act(() => {
				result.current.play();
			});

			expect(result.current.state.isPlaying).toBe(true);
		});

		it("should pause", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ isPlaying: true }),
			});

			expect(result.current.state.isPlaying).toBe(true);

			act(() => {
				result.current.pause();
			});

			expect(result.current.state.isPlaying).toBe(false);
		});

		it("should set duration", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setDuration(180);
			});

			expect(result.current.state.duration).toBe(180);
		});

		it("should not allow negative duration", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setDuration(-10);
			});

			expect(result.current.state.duration).toBe(180); // Minimum duration is 180
		});

		it("should not allow duration greater than 300 seconds (5 minutes)", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setDuration(400);
			});

			expect(result.current.state.duration).toBe(300); // Maximum duration is 300
		});
	});

	describe("Zoom Control", () => {
		it("should set zoom", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setZoom(50);
			});

			expect(result.current.state.zoom).toBe(50);
		});

		it("should clamp zoom to minimum value", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setZoom(0.5);
			});

			expect(result.current.state.zoom).toBe(1);
		});

		it("should clamp zoom to maximum value", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setZoom(300);
			});

			expect(result.current.state.zoom).toBe(200);
		});
	});

	describe("Selection Management", () => {
		it("should select a clip", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.setSelectedClip("clip-1");
			});

			expect(result.current.state.selectedClipId).toBe("clip-1");
		});

		it("should deselect a clip", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ selectedClipId: "clip-1" }),
			});

			expect(result.current.state.selectedClipId).toBe("clip-1");

			act(() => {
				result.current.setSelectedClip(null);
			});

			expect(result.current.state.selectedClipId).toBeNull();
		});
	});

	describe("Error Handling", () => {
		it("should throw error when useTimeline is used outside provider", () => {
			// Suppress console.error for this test
			const originalError = console.error;
			console.error = () => {};

			expect(() => {
				renderHook(() => useTimeline());
			}).toThrow("useTimeline must be used within a TimelineProvider");

			console.error = originalError;
		});

		it("should handle adding clip to non-existent layer", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper({ layers: [] }),
			});

			const clip = createMockClip();

			act(() => {
				result.current.addClip(clip, 0);
			});

			// Should not crash, state should remain unchanged
			expect(result.current.state.layers).toHaveLength(0);
		});
	});

	describe("Complex Scenarios", () => {
		it("should handle multiple clips across multiple layers", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.addLayer("video");
				result.current.addLayer("audio");
			});

			const videoClip1 = createMockClip({ id: "video-1", startTime: 0, duration: 5 });
			const videoClip2 = createMockClip({ id: "video-2", startTime: 5, duration: 5 });
			const audioClip = createMockClip({ id: "audio-1", startTime: 0, duration: 10 });

			act(() => {
				result.current.addClip(videoClip1, 0);
				result.current.addClip(videoClip2, 0);
				result.current.addClip(audioClip, 1);
			});

			expect(result.current.state.layers[0].clips).toHaveLength(2);
			expect(result.current.state.layers[1].clips).toHaveLength(1);
			expect(result.current.state.duration).toBe(180); // Minimum duration is 180
		});

		it("should maintain consistency when performing multiple operations", () => {
			const { result } = renderHook(() => useTimeline(), {
				wrapper: createWrapper(),
			});

			act(() => {
				result.current.addLayer("video");
			});

			const clip = createMockClip({ id: "clip-1", startTime: 0, duration: 10 });

			act(() => {
				result.current.addClip(clip, 0);
				result.current.setSelectedClip("clip-1");
				result.current.moveClip("clip-1", 5);
				result.current.trimClip("clip-1", 8);
				result.current.play();
				result.current.setCurrentTime(7);
				result.current.setZoom(40);
			});

			const state = result.current.state;
			expect(state.layers[0].clips[0].startTime).toBe(5);
			expect(state.layers[0].clips[0].duration).toBe(8);
			expect(state.selectedClipId).toBe("clip-1");
			expect(state.isPlaying).toBe(true);
			expect(state.currentTime).toBe(7);
			expect(state.zoom).toBe(40);
			// Duration was initially set to 180 (minimum) when clip was added
			// Moving and trimming doesn't auto-recalculate duration (this is correct behavior)
			expect(state.duration).toBe(180);
		});
	});
});
