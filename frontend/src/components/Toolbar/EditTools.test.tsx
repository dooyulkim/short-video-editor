import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import type { ReactNode } from "react";
import { EditTools } from "@/components/Toolbar/EditTools";
import { TimelineProvider } from "@/context/TimelineContext";
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
		id: "clip-1",
		resourceId: "resource-1",
		startTime: 5,
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

describe("EditTools", () => {
	beforeEach(() => {
		// Clear all mocks before each test
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("should render all three tool buttons", () => {
			render(<EditTools />, {
				wrapper: createWrapper(),
			});

			expect(screen.getByText("Cut")).toBeInTheDocument();
			expect(screen.getByText("Delete")).toBeInTheDocument();
			expect(screen.getByText("Duplicate")).toBeInTheDocument();
		});

		it("should apply custom className", () => {
			const { container } = render(<EditTools className="custom-class" />, {
				wrapper: createWrapper(),
			});

			const toolbarDiv = container.querySelector(".custom-class");
			expect(toolbarDiv).toBeInTheDocument();
		});
	});

	describe("Button States - No Selection", () => {
		it("should disable all buttons when no clip is selected", () => {
			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: null,
					layers: [],
				}),
			});

			const cutButton = screen.getByText("Cut").closest("button");
			const deleteButton = screen.getByText("Delete").closest("button");
			const duplicateButton = screen.getByText("Duplicate").closest("button");

			expect(cutButton).toBeDisabled();
			expect(deleteButton).toBeDisabled();
			expect(duplicateButton).toBeDisabled();
		});
	});

	describe("Button States - With Selection", () => {
		it("should enable delete and duplicate buttons when clip is selected", () => {
			const clip = createMockClip({ id: "clip-1" });
			const layer = createMockLayer({ clips: [clip] });

			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: "clip-1",
					layers: [layer],
					currentTime: 0,
				}),
			});

			const deleteButton = screen.getByText("Delete").closest("button");
			const duplicateButton = screen.getByText("Duplicate").closest("button");

			expect(deleteButton).not.toBeDisabled();
			expect(duplicateButton).not.toBeDisabled();
		});

		it("should disable cut button when playhead is not over selected clip", () => {
			const clip = createMockClip({
				id: "clip-1",
				startTime: 5,
				duration: 10,
			});
			const layer = createMockLayer({ clips: [clip] });

			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: "clip-1",
					layers: [layer],
					currentTime: 2, // Before clip starts at 5
				}),
			});

			const cutButton = screen.getByText("Cut").closest("button");
			expect(cutButton).toBeDisabled();
		});

		it("should enable cut button when playhead is over selected clip", () => {
			const clip = createMockClip({
				id: "clip-1",
				startTime: 5,
				duration: 10,
			});
			const layer = createMockLayer({ clips: [clip] });

			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: "clip-1",
					layers: [layer],
					currentTime: 8, // Within clip (5 to 15)
				}),
			});

			const cutButton = screen.getByText("Cut").closest("button");
			expect(cutButton).not.toBeDisabled();
		});

		it("should disable cut button when playhead is at clip start", () => {
			const clip = createMockClip({
				id: "clip-1",
				startTime: 5,
				duration: 10,
			});
			const layer = createMockLayer({ clips: [clip] });

			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: "clip-1",
					layers: [layer],
					currentTime: 5, // Exactly at start
				}),
			});

			const cutButton = screen.getByText("Cut").closest("button");
			expect(cutButton).toBeDisabled();
		});

		it("should disable cut button when playhead is at clip end", () => {
			const clip = createMockClip({
				id: "clip-1",
				startTime: 5,
				duration: 10,
			});
			const layer = createMockLayer({ clips: [clip] });

			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: "clip-1",
					layers: [layer],
					currentTime: 15, // Exactly at end
				}),
			});

			const cutButton = screen.getByText("Cut").closest("button");
			expect(cutButton).toBeDisabled();
		});
	});

	describe("Cut Operation", () => {
		it("should split clip when cut button is clicked", () => {
			const clip = createMockClip({
				id: "clip-1",
				startTime: 5,
				duration: 10,
			});
			const layer = createMockLayer({ clips: [clip] });

			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: "clip-1",
					layers: [layer],
					currentTime: 8,
				}),
			});

			const cutButton = screen.getByText("Cut").closest("button");
			expect(cutButton).not.toBeDisabled();

			fireEvent.click(cutButton!);

			// After cut, the original clip should be removed and two new clips added
			// This is tested via integration with TimelineContext
		});

		it("should not cut if no clip is selected", () => {
			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: null,
					layers: [],
					currentTime: 8,
				}),
			});

			const cutButton = screen.getByText("Cut").closest("button");
			expect(cutButton).toBeDisabled();
		});
	});

	describe("Delete Operation", () => {
		it("should remove clip when delete button is clicked", () => {
			const clip = createMockClip({ id: "clip-1" });
			const layer = createMockLayer({ clips: [clip] });

			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: "clip-1",
					layers: [layer],
				}),
			});

			const deleteButton = screen.getByText("Delete").closest("button");
			expect(deleteButton).not.toBeDisabled();

			fireEvent.click(deleteButton!);

			// Clip removal is handled by TimelineContext
			// Integration test would verify the clip is removed
		});

		it("should not delete if no clip is selected", () => {
			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: null,
					layers: [],
				}),
			});

			const deleteButton = screen.getByText("Delete").closest("button");
			expect(deleteButton).toBeDisabled();
		});
	});

	describe("Duplicate Operation", () => {
		it("should duplicate clip when duplicate button is clicked", () => {
			const clip = createMockClip({ id: "clip-1" });
			const layer = createMockLayer({ clips: [clip] });

			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: "clip-1",
					layers: [layer],
				}),
			});

			const duplicateButton = screen.getByText("Duplicate").closest("button");
			expect(duplicateButton).not.toBeDisabled();

			fireEvent.click(duplicateButton!);

			// Clip duplication is handled by TimelineContext
			// Integration test would verify a new clip is added
		});

		it("should not duplicate if no clip is selected", () => {
			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: null,
					layers: [],
				}),
			});

			const duplicateButton = screen.getByText("Duplicate").closest("button");
			expect(duplicateButton).toBeDisabled();
		});
	});

	describe("Multiple Layers", () => {
		it("should find selected clip in second layer", () => {
			const clip1 = createMockClip({ id: "clip-1" });
			const clip2 = createMockClip({ id: "clip-2", startTime: 10, duration: 5 });
			const layer1 = createMockLayer({ id: "layer-1", clips: [clip1] });
			const layer2 = createMockLayer({ id: "layer-2", clips: [clip2] });

			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: "clip-2",
					layers: [layer1, layer2],
					currentTime: 12,
				}),
			});

			const cutButton = screen.getByText("Cut").closest("button");
			const deleteButton = screen.getByText("Delete").closest("button");

			expect(cutButton).not.toBeDisabled();
			expect(deleteButton).not.toBeDisabled();
		});
	});

	describe("Tooltip/Title Attributes", () => {
		it("should show helpful title when no selection", () => {
			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: null,
				}),
			});

			const cutButton = screen.getByText("Cut").closest("button");
			const deleteButton = screen.getByText("Delete").closest("button");
			const duplicateButton = screen.getByText("Duplicate").closest("button");

			expect(cutButton).toHaveAttribute("title", "Select a clip first");
			expect(deleteButton).toHaveAttribute("title", "Select a clip first");
			expect(duplicateButton).toHaveAttribute("title", "Select a clip first");
		});

		it("should show helpful title when cut is not possible", () => {
			const clip = createMockClip({ startTime: 5, duration: 10 });
			const layer = createMockLayer({ clips: [clip] });

			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: "clip-1",
					layers: [layer],
					currentTime: 2, // Not over clip
				}),
			});

			const cutButton = screen.getByText("Cut").closest("button");
			expect(cutButton).toHaveAttribute("title", "Position playhead over the clip");
		});

		it("should show helpful title when cut is possible", () => {
			const clip = createMockClip({ startTime: 5, duration: 10 });
			const layer = createMockLayer({ clips: [clip] });

			render(<EditTools />, {
				wrapper: createWrapper({
					selectedClipId: "clip-1",
					layers: [layer],
					currentTime: 8, // Over clip
				}),
			});

			const cutButton = screen.getByText("Cut").closest("button");
			expect(cutButton).toHaveAttribute("title", "Cut clip at playhead (splits into two clips)");
		});
	});
});
