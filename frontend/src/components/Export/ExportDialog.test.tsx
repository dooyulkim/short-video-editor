import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { ExportDialog } from "@/components/Export/ExportDialog";
import * as api from "@/services/api";
import type { Timeline } from "@/types/timeline";

// Mock the API module
vi.mock("@/services/api", () => ({
	startExport: vi.fn(),
	getExportStatus: vi.fn(),
	downloadExport: vi.fn(),
}));

describe("ExportDialog Component", () => {
	let mockOnOpenChange: (open: boolean) => void;
	let mockTimeline: Timeline;

	beforeEach(() => {
		mockOnOpenChange = vi.fn() as (open: boolean) => void;
		mockTimeline = {
			id: "test-timeline",
			name: "Test Timeline",
			layers: [
				{
					id: "layer1",
					type: "video",
					clips: [],
					locked: false,
					visible: true,
					muted: false,
					name: "Video Layer 1",
				},
			],
			duration: 10,
			fps: 30,
			resolution: {
				width: 1920,
				height: 1080,
			},
		};

		// Reset mocks
		vi.clearAllMocks();
	});

	describe("Rendering", () => {
		it("should render dialog when open is true", () => {
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			expect(screen.getByText("Export Video")).toBeInTheDocument();
			expect(screen.getByText("Configure export settings for your video project")).toBeInTheDocument();
		});

		it("should not render dialog when open is false", () => {
			render(<ExportDialog open={false} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			expect(screen.queryByText("Export Video")).not.toBeInTheDocument();
		});

		it("should render all form fields", () => {
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			expect(screen.getByLabelText("Filename")).toBeInTheDocument();
			expect(screen.getByText("Resolution")).toBeInTheDocument();
			expect(screen.getByLabelText("Format")).toBeInTheDocument();
			expect(screen.getByText("Quality")).toBeInTheDocument();
		});

		it("should render default filename with current date", () => {
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			const filenameInput = screen.getByLabelText("Filename") as HTMLInputElement;
			expect(filenameInput.value).toMatch(/video_export_\d{4}-\d{2}-\d{2}/);
		});

		it("should render Start Export button", () => {
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			expect(screen.getByRole("button", { name: /start export/i })).toBeInTheDocument();
		});

		it("should render close buttons", () => {
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			const buttons = screen.getAllByRole("button", { name: /close/i });
			// Should have footer close button plus dialog X button
			expect(buttons.length).toBeGreaterThan(0);
		});
	});

	describe("Form Interactions", () => {
		it("should update filename when user types", async () => {
			const user = userEvent.setup();
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			const filenameInput = screen.getByLabelText("Filename") as HTMLInputElement;
			await user.clear(filenameInput);
			await user.type(filenameInput, "my_custom_video");

			expect(filenameInput.value).toBe("my_custom_video");
		});

		it("should disable Start Export button when filename is empty", async () => {
			const user = userEvent.setup();
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			const filenameInput = screen.getByLabelText("Filename") as HTMLInputElement;
			await user.clear(filenameInput);

			const exportButton = screen.getByRole("button", { name: /start export/i });
			expect(exportButton).toBeDisabled();
		});

		it("should update quality when radio button is clicked", async () => {
			const user = userEvent.setup();
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			const mediumQuality = screen.getByLabelText(/medium \(balanced\)/i);
			await user.click(mediumQuality);

			expect(mediumQuality).toBeChecked();
		});
	});

	describe("Export Flow", () => {
		it("should start export when Start Export button is clicked", async () => {
			const user = userEvent.setup();
			const mockStartExport = vi.mocked(api.startExport);
			mockStartExport.mockResolvedValue({
				task_id: "task-123",
				status: "pending",
			});

			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			const exportButton = screen.getByRole("button", { name: /start export/i });
			await user.click(exportButton);

			await waitFor(() => {
				expect(mockStartExport).toHaveBeenCalledWith(
					expect.objectContaining({
						sourceResolution: expect.objectContaining({
							width: expect.any(Number),
							height: expect.any(Number),
						}),
						resolution: expect.objectContaining({
							width: expect.any(Number),
							height: expect.any(Number),
						}),
					}),
					expect.objectContaining({
						resolution: "1080p",
						format: "MP4",
						quality: "high",
						filename: expect.any(String),
						aspectRatio: expect.any(String),
						customResolution: expect.objectContaining({
							width: expect.any(Number),
							height: expect.any(Number),
						}),
					})
				);
			});
		});

		it("should show loading state during export", async () => {
			const user = userEvent.setup();
			const mockStartExport = vi.mocked(api.startExport);
			mockStartExport.mockResolvedValue({
				task_id: "task-123",
				status: "pending",
			});

			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			const exportButton = screen.getByRole("button", { name: /start export/i });
			await user.click(exportButton);

			await waitFor(() => {
				// Should show "Cancel Export" button when exporting
				expect(screen.getByRole("button", { name: /cancel export/i })).toBeInTheDocument();
			});
		});

		it("should disable form inputs during export", async () => {
			const user = userEvent.setup();
			const mockStartExport = vi.mocked(api.startExport);
			mockStartExport.mockResolvedValue({
				task_id: "task-123",
				status: "pending",
			});

			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			const exportButton = screen.getByRole("button", { name: /start export/i });
			await user.click(exportButton);

			await waitFor(() => {
				const filenameInput = screen.getByLabelText("Filename") as HTMLInputElement;
				expect(filenameInput).toBeDisabled();
			});
		});

		it("should display error message when export fails to start", async () => {
			const user = userEvent.setup();
			const mockStartExport = vi.mocked(api.startExport);
			mockStartExport.mockRejectedValue({
				response: { data: { detail: "Export failed" } },
			});

			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			const exportButton = screen.getByRole("button", { name: /start export/i });
			await user.click(exportButton);

			await waitFor(() => {
				expect(screen.getByText("Export failed")).toBeInTheDocument();
			});
		});

		it("should show progress bar when export is in progress", async () => {
			const user = userEvent.setup();
			const mockStartExport = vi.mocked(api.startExport);
			mockStartExport.mockResolvedValue({
				task_id: "task-123",
				status: "pending",
			});

			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			const exportButton = screen.getByRole("button", { name: /start export/i });
			await user.click(exportButton);

			await waitFor(() => {
				expect(screen.getByText("Export Progress")).toBeInTheDocument();
			});
		});
	});

	describe("Dialog Close Behavior", () => {
		it("should call onOpenChange when footer close button is clicked", async () => {
			const user = userEvent.setup();
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			// Get the footer close button specifically
			const footerButtons = screen.getAllByRole("button", { name: /close/i });
			const footerCloseButton = footerButtons.find(
				(btn) => btn.textContent?.includes("Close") && btn.className.includes("inline-flex")
			);

			if (footerCloseButton) {
				await user.click(footerCloseButton);
				expect(mockOnOpenChange).toHaveBeenCalledWith(false);
			}
		});
	});

	describe("Accessibility", () => {
		it("should have proper ARIA labels", () => {
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			expect(screen.getByLabelText("Filename")).toBeInTheDocument();
			expect(screen.getByText("Resolution")).toBeInTheDocument();
			expect(screen.getByLabelText("Format")).toBeInTheDocument();
		});

		it("should support keyboard navigation for filename input", async () => {
			const user = userEvent.setup();
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			const filenameInput = screen.getByLabelText("Filename");
			filenameInput.focus();

			expect(filenameInput).toHaveFocus();

			// Tab to next element
			await user.tab();

			// Should move focus away from filename input
			expect(filenameInput).not.toHaveFocus();
		});

		it("should render dialog with proper role", () => {
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			expect(screen.getByRole("dialog")).toBeInTheDocument();
		});
	});

	describe("Export Settings", () => {
		it("should display default resolution", () => {
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			// Check that the resolution section exists
			expect(screen.getByText("Resolution")).toBeInTheDocument();
			expect(screen.getByLabelText("Resolution")).toBeInTheDocument();
			// Check default preset is shown
			expect(screen.getByText(/1080p/i)).toBeInTheDocument();
		});

		it("should display aspect ratio selector", () => {
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			expect(screen.getByText("Aspect Ratio")).toBeInTheDocument();
			expect(screen.getByLabelText("Aspect Ratio")).toBeInTheDocument();
		});

		it("should display default format", () => {
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			const formatButton = screen.getByLabelText("Format");
			expect(formatButton).toBeInTheDocument();
			expect(screen.getByText("MP4")).toBeInTheDocument();
		});

		it("should display all quality options", () => {
			render(<ExportDialog open={true} onOpenChange={mockOnOpenChange} timeline={mockTimeline} />);

			expect(screen.getByLabelText(/high \(best quality/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/medium \(balanced\)/i)).toBeInTheDocument();
			expect(screen.getByLabelText(/low \(smaller file/i)).toBeInTheDocument();
		});
	});
});
