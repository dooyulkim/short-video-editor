import { describe, it, expect } from "vitest";
import { cutClipAtTime, trimClip, duplicateClip, deleteClip, findClipById, replaceClip } from "@/utils/clipOperations";
import type { Clip, TimelineLayer } from "@/types/timeline";

// Helper function to create a mock clip
function createMockClip(overrides?: Partial<Clip>): Clip {
	return {
		id: "clip-1",
		resourceId: "resource-1",
		startTime: 0,
		duration: 10,
		trimStart: 0,
		trimEnd: 0,
		transitions: {
			in: { type: "fade", duration: 1 },
			out: { type: "fade", duration: 1 },
		},
		...overrides,
	};
}

// Helper function to create a mock layer
function createMockLayer(overrides?: Partial<TimelineLayer>): TimelineLayer {
	return {
		id: "layer-1",
		type: "video",
		clips: [],
		locked: false,
		visible: true,
		muted: false,
		name: "Video Layer 1",
		...overrides,
	};
}

describe("clipOperations", () => {
	describe("cutClipAtTime", () => {
		it("should split clip into two clips at the cut time", () => {
			const clip = createMockClip({
				id: "clip-1",
				startTime: 5,
				duration: 10,
				trimStart: 0,
				trimEnd: 0,
			});

			const result = cutClipAtTime(clip, 4); // Cut 4 seconds into the clip

			expect(result).toHaveLength(2);
			expect(result[0].duration).toBe(4);
			expect(result[1].duration).toBe(6);
			expect(result[0].startTime).toBe(5);
			expect(result[1].startTime).toBe(9); // 5 + 4
		});

		it("should preserve transitions correctly on split clips", () => {
			const clip = createMockClip({
				transitions: {
					in: { type: "fade", duration: 1 },
					out: { type: "dissolve", duration: 1 },
				},
			});

			const [firstClip, secondClip] = cutClipAtTime(clip, 5);

			// First clip should keep in transition, remove out transition
			expect(firstClip.transitions?.in).toEqual({ type: "fade", duration: 1 });
			expect(firstClip.transitions?.out).toBeUndefined();

			// Second clip should remove in transition, keep out transition
			expect(secondClip.transitions?.in).toBeUndefined();
			expect(secondClip.transitions?.out).toEqual({ type: "dissolve", duration: 1 });
		});

		it("should handle trim values correctly when cutting", () => {
			const clip = createMockClip({
				duration: 10,
				trimStart: 2,
				trimEnd: 1,
			});

			const [firstClip, secondClip] = cutClipAtTime(clip, 4);

			expect(firstClip.trimStart).toBe(2);
			expect(firstClip.trimEnd).toBe(6); // 2 + 10 - (2 + 4) = 6 remaining
			expect(secondClip.trimStart).toBe(6); // 2 + 4
			expect(secondClip.trimEnd).toBe(1);
		});

		it("should return original clip if cut time is at the start", () => {
			const clip = createMockClip();
			const result = cutClipAtTime(clip, 0);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(clip);
		});

		it("should return original clip if cut time is at the end", () => {
			const clip = createMockClip({ duration: 10 });
			const result = cutClipAtTime(clip, 10);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(clip);
		});

		it("should return original clip if cut time is negative", () => {
			const clip = createMockClip();
			const result = cutClipAtTime(clip, -1);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(clip);
		});

		it("should return original clip if cut time exceeds duration", () => {
			const clip = createMockClip({ duration: 10 });
			const result = cutClipAtTime(clip, 15);

			expect(result).toHaveLength(1);
			expect(result[0]).toEqual(clip);
		});

		it("should generate unique IDs for both clips", () => {
			const clip = createMockClip({ id: "clip-1" });
			const [firstClip, secondClip] = cutClipAtTime(clip, 5);

			expect(firstClip.id).not.toBe(clip.id);
			expect(secondClip.id).not.toBe(clip.id);
			expect(firstClip.id).not.toBe(secondClip.id);
			expect(firstClip.id).toContain("clip-1-part1");
			expect(secondClip.id).toContain("clip-1-part2");
		});
	});

	describe("trimClip", () => {
		it("should adjust clip start time and duration", () => {
			const clip = createMockClip({
				startTime: 5,
				duration: 10,
				trimStart: 0,
				trimEnd: 0,
			});

			const result = trimClip(clip, 7, 13); // Trim from 7 to 13 (6 seconds)

			expect(result.startTime).toBe(7);
			expect(result.duration).toBe(6);
		});

		it("should update trim values when trimming from the start", () => {
			const clip = createMockClip({
				startTime: 5,
				duration: 10,
				trimStart: 0,
				trimEnd: 0,
			});

			const result = trimClip(clip, 8, 15); // Trim 3 seconds from start

			expect(result.trimStart).toBe(3);
			expect(result.trimEnd).toBe(0);
		});

		it("should update trim values when trimming from the end", () => {
			const clip = createMockClip({
				startTime: 5,
				duration: 10,
				trimStart: 0,
				trimEnd: 0,
			});

			const result = trimClip(clip, 5, 12); // Trim 3 seconds from end

			expect(result.trimStart).toBe(0);
			expect(result.trimEnd).toBe(3);
		});

		it("should update trim values when trimming from both sides", () => {
			const clip = createMockClip({
				startTime: 5,
				duration: 10,
				trimStart: 1,
				trimEnd: 1,
			});

			const result = trimClip(clip, 7, 13); // Trim 2 from start, 2 from end

			expect(result.trimStart).toBe(3); // 1 + 2
			expect(result.trimEnd).toBe(3); // 1 + 2
		});

		it("should return original clip if new duration is zero", () => {
			const clip = createMockClip({ startTime: 5, duration: 10 });
			const result = trimClip(clip, 10, 10);

			expect(result).toEqual(clip);
		});

		it("should return original clip if new duration is negative", () => {
			const clip = createMockClip({ startTime: 5, duration: 10 });
			const result = trimClip(clip, 12, 10);

			expect(result).toEqual(clip);
		});

		it("should preserve all other clip properties", () => {
			const clip = createMockClip({
				id: "clip-1",
				resourceId: "resource-1",
				transitions: { in: { type: "fade", duration: 1 } },
				effects: [{ id: "effect-1", type: "blur", name: "Blur", enabled: true, properties: {} }],
			});

			const result = trimClip(clip, 2, 10);

			expect(result.id).toBe("clip-1");
			expect(result.resourceId).toBe("resource-1");
			expect(result.transitions).toEqual(clip.transitions);
			expect(result.effects).toEqual(clip.effects);
		});
	});

	describe("duplicateClip", () => {
		it("should create a copy with a new unique ID", () => {
			const clip = createMockClip({ id: "clip-1" });
			const duplicate = duplicateClip(clip);

			expect(duplicate.id).not.toBe(clip.id);
			expect(duplicate.id).toContain("clip-1-copy");
		});

		it("should place duplicate after original clip", () => {
			const clip = createMockClip({
				startTime: 5,
				duration: 10,
			});
			const duplicate = duplicateClip(clip);

			expect(duplicate.startTime).toBe(15); // 5 + 10
		});

		it("should preserve all clip properties except ID and startTime", () => {
			const clip = createMockClip({
				id: "clip-1",
				resourceId: "resource-1",
				startTime: 5,
				duration: 10,
				trimStart: 2,
				trimEnd: 1,
				transitions: { in: { type: "fade", duration: 1 } },
				effects: [{ id: "effect-1", type: "blur", name: "Blur", enabled: true, properties: {} }],
			});

			const duplicate = duplicateClip(clip);

			expect(duplicate.resourceId).toBe(clip.resourceId);
			expect(duplicate.duration).toBe(clip.duration);
			expect(duplicate.trimStart).toBe(clip.trimStart);
			expect(duplicate.trimEnd).toBe(clip.trimEnd);
			expect(duplicate.transitions).toEqual(clip.transitions);
			expect(duplicate.effects).toEqual(clip.effects);
		});
	});

	describe("deleteClip", () => {
		it("should remove clip from layers", () => {
			const clip1 = createMockClip({ id: "clip-1" });
			const clip2 = createMockClip({ id: "clip-2" });
			const layer = createMockLayer({ clips: [clip1, clip2] });

			const result = deleteClip([layer], "clip-1");

			expect(result[0].clips).toHaveLength(1);
			expect(result[0].clips[0].id).toBe("clip-2");
		});

		it("should handle multiple layers", () => {
			const clip1 = createMockClip({ id: "clip-1" });
			const clip2 = createMockClip({ id: "clip-2" });
			const clip3 = createMockClip({ id: "clip-3" });
			const layer1 = createMockLayer({ id: "layer-1", clips: [clip1, clip2] });
			const layer2 = createMockLayer({ id: "layer-2", clips: [clip3] });

			const result = deleteClip([layer1, layer2], "clip-2");

			expect(result[0].clips).toHaveLength(1);
			expect(result[0].clips[0].id).toBe("clip-1");
			expect(result[1].clips).toHaveLength(1);
			expect(result[1].clips[0].id).toBe("clip-3");
		});

		it("should preserve other layer properties", () => {
			const clip = createMockClip({ id: "clip-1" });
			const layer = createMockLayer({
				id: "layer-1",
				name: "Test Layer",
				locked: true,
				visible: false,
				clips: [clip],
			});

			const result = deleteClip([layer], "clip-1");

			expect(result[0].id).toBe("layer-1");
			expect(result[0].name).toBe("Test Layer");
			expect(result[0].locked).toBe(true);
			expect(result[0].visible).toBe(false);
		});

		it("should return unchanged layers if clip ID not found", () => {
			const clip = createMockClip({ id: "clip-1" });
			const layer = createMockLayer({ clips: [clip] });

			const result = deleteClip([layer], "clip-999");

			expect(result[0].clips).toHaveLength(1);
			expect(result[0].clips[0].id).toBe("clip-1");
		});
	});

	describe("findClipById", () => {
		it("should find clip in the first layer", () => {
			const clip1 = createMockClip({ id: "clip-1" });
			const clip2 = createMockClip({ id: "clip-2" });
			const layer = createMockLayer({ clips: [clip1, clip2] });

			const result = findClipById([layer], "clip-1");

			expect(result).not.toBeNull();
			expect(result?.clip.id).toBe("clip-1");
			expect(result?.layerIndex).toBe(0);
		});

		it("should find clip in subsequent layers", () => {
			const clip1 = createMockClip({ id: "clip-1" });
			const clip2 = createMockClip({ id: "clip-2" });
			const layer1 = createMockLayer({ id: "layer-1", clips: [clip1] });
			const layer2 = createMockLayer({ id: "layer-2", clips: [clip2] });

			const result = findClipById([layer1, layer2], "clip-2");

			expect(result).not.toBeNull();
			expect(result?.clip.id).toBe("clip-2");
			expect(result?.layerIndex).toBe(1);
		});

		it("should return null if clip not found", () => {
			const clip = createMockClip({ id: "clip-1" });
			const layer = createMockLayer({ clips: [clip] });

			const result = findClipById([layer], "clip-999");

			expect(result).toBeNull();
		});

		it("should return null for empty layers", () => {
			const result = findClipById([], "clip-1");
			expect(result).toBeNull();
		});
	});

	describe("replaceClip", () => {
		it("should replace a clip with multiple clips", () => {
			const clip1 = createMockClip({ id: "clip-1" });
			const clip2 = createMockClip({ id: "clip-2" });
			const layer = createMockLayer({ clips: [clip1, clip2] });

			const newClip1 = createMockClip({ id: "new-clip-1" });
			const newClip2 = createMockClip({ id: "new-clip-2" });

			const result = replaceClip([layer], "clip-1", [newClip1, newClip2]);

			expect(result[0].clips).toHaveLength(3);
			expect(result[0].clips[0].id).toBe("new-clip-1");
			expect(result[0].clips[1].id).toBe("new-clip-2");
			expect(result[0].clips[2].id).toBe("clip-2");
		});

		it("should replace a clip with a single clip", () => {
			const clip1 = createMockClip({ id: "clip-1" });
			const clip2 = createMockClip({ id: "clip-2" });
			const layer = createMockLayer({ clips: [clip1, clip2] });

			const newClip = createMockClip({ id: "new-clip" });

			const result = replaceClip([layer], "clip-1", [newClip]);

			expect(result[0].clips).toHaveLength(2);
			expect(result[0].clips[0].id).toBe("new-clip");
			expect(result[0].clips[1].id).toBe("clip-2");
		});

		it("should replace a clip with empty array (effectively deleting it)", () => {
			const clip1 = createMockClip({ id: "clip-1" });
			const clip2 = createMockClip({ id: "clip-2" });
			const layer = createMockLayer({ clips: [clip1, clip2] });

			const result = replaceClip([layer], "clip-1", []);

			expect(result[0].clips).toHaveLength(1);
			expect(result[0].clips[0].id).toBe("clip-2");
		});

		it("should handle multiple layers", () => {
			const clip1 = createMockClip({ id: "clip-1" });
			const clip2 = createMockClip({ id: "clip-2" });
			const layer1 = createMockLayer({ clips: [clip1] });
			const layer2 = createMockLayer({ clips: [clip2] });

			const newClip = createMockClip({ id: "new-clip" });

			const result = replaceClip([layer1, layer2], "clip-2", [newClip]);

			expect(result[0].clips[0].id).toBe("clip-1");
			expect(result[1].clips[0].id).toBe("new-clip");
		});

		it("should not modify layers if clip ID not found", () => {
			const clip1 = createMockClip({ id: "clip-1" });
			const layer = createMockLayer({ clips: [clip1] });

			const newClip = createMockClip({ id: "new-clip" });

			const result = replaceClip([layer], "clip-999", [newClip]);

			expect(result[0].clips).toHaveLength(1);
			expect(result[0].clips[0].id).toBe("clip-1");
		});
	});
});
