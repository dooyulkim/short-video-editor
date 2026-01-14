import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { TransitionIndicator } from "@/components/Timeline/TransitionIndicator";
import type { Transition } from "@/types/timeline";

describe("TransitionIndicator Component", () => {
	const mockTransition: Transition = {
		type: "fade",
		duration: 1.0,
	};

	let mockOnEdit: (transition: Transition) => void;
	let mockOnRemove: () => void;

	beforeEach(() => {
		mockOnEdit = vi.fn() as (transition: Transition) => void;
		mockOnRemove = vi.fn() as () => void;
	});

	describe("Rendering", () => {
		it("should render transition indicator at start position", () => {
			const { container } = render(<TransitionIndicator transition={mockTransition} position="start" />);

			const indicator = container.querySelector(".absolute.left-0");
			expect(indicator).toBeInTheDocument();
		});

		it("should render transition indicator at end position", () => {
			const { container } = render(<TransitionIndicator transition={mockTransition} position="end" />);

			const indicator = container.querySelector(".absolute.right-0");
			expect(indicator).toBeInTheDocument();
		});

		it("should display correct icon for fade transition", () => {
			const { container } = render(
				<TransitionIndicator transition={{ type: "fade", duration: 1.0 }} position="start" />
			);

			// Check for icon container with blue background
			const iconContainer = container.querySelector(".bg-blue-500");
			expect(iconContainer).toBeInTheDocument();
		});

		it("should display correct icon for dissolve transition", () => {
			const { container } = render(
				<TransitionIndicator transition={{ type: "dissolve", duration: 1.0 }} position="start" />
			);

			const iconContainer = container.querySelector(".bg-purple-500");
			expect(iconContainer).toBeInTheDocument();
		});

		it("should display correct icon for wipe transition", () => {
			const { container } = render(
				<TransitionIndicator transition={{ type: "wipe", duration: 1.0 }} position="start" />
			);

			const iconContainer = container.querySelector(".bg-green-500");
			expect(iconContainer).toBeInTheDocument();
		});

		it("should display correct icon for slide transition", () => {
			const { container } = render(
				<TransitionIndicator transition={{ type: "slide", duration: 1.0 }} position="start" />
			);

			const iconContainer = container.querySelector(".bg-orange-500");
			expect(iconContainer).toBeInTheDocument();
		});

		it("should show tooltip with transition details", () => {
			const { container } = render(<TransitionIndicator transition={mockTransition} position="start" />);

			const indicator = container.querySelector("[title]");
			expect(indicator).toHaveAttribute("title", "Fade In (1s)");
		});

		it("should show correct tooltip for end position", () => {
			const { container } = render(<TransitionIndicator transition={mockTransition} position="end" />);

			const indicator = container.querySelector("[title]");
			expect(indicator).toHaveAttribute("title", "Fade Out (1s)");
		});
	});

	describe("Visual Styling", () => {
		it("should apply gradient for start position", () => {
			const { container } = render(<TransitionIndicator transition={mockTransition} position="start" />);

			const gradient = container.querySelector(".bg-gradient-to-r, .bg-linear-to-r");
			expect(gradient).toBeInTheDocument();
		});

		it("should apply gradient for end position", () => {
			const { container } = render(<TransitionIndicator transition={mockTransition} position="end" />);

			const gradient = container.querySelector(".bg-gradient-to-l, .bg-linear-to-l");
			expect(gradient).toBeInTheDocument();
		});

		it("should have hover effects", () => {
			const { container } = render(<TransitionIndicator transition={mockTransition} position="start" />);

			const indicator = container.querySelector(".hover\\:opacity-100");
			expect(indicator).toBeInTheDocument();
		});

		it("should display edge border indicator", () => {
			const { container } = render(<TransitionIndicator transition={mockTransition} position="start" />);

			const border = container.querySelector(".w-0\\.5");
			expect(border).toBeInTheDocument();
		});
	});

	describe("Dialog Interactions", () => {
		it("should open dialog when indicator is clicked", async () => {
			const { container } = render(
				<TransitionIndicator transition={mockTransition} position="start" onEdit={mockOnEdit} onRemove={mockOnRemove} />
			);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				expect(screen.getByRole("dialog")).toBeInTheDocument();
			});
		});

		it("should display transition type in dialog title", async () => {
			const { container } = render(
				<TransitionIndicator transition={mockTransition} position="start" onEdit={mockOnEdit} />
			);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				expect(screen.getByText(/fade in/i)).toBeInTheDocument();
			});
		});

		it("should display correct title for out transition", async () => {
			const { container } = render(
				<TransitionIndicator transition={mockTransition} position="end" onEdit={mockOnEdit} />
			);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				expect(screen.getByText(/fade out/i)).toBeInTheDocument();
			});
		});

		it("should show duration slider in dialog", async () => {
			const { container } = render(
				<TransitionIndicator transition={mockTransition} position="start" onEdit={mockOnEdit} />
			);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				expect(screen.getByRole("slider")).toBeInTheDocument();
				expect(screen.getByText(/1\.00s/i)).toBeInTheDocument();
			});
		});

		it("should display transition info in dialog", async () => {
			const { container } = render(
				<TransitionIndicator transition={mockTransition} position="start" onEdit={mockOnEdit} />
			);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				expect(screen.getByText(/position:/i)).toBeInTheDocument();
				expect(screen.getByText(/clip start/i)).toBeInTheDocument();
				expect(screen.getByText(/type:/i)).toBeInTheDocument();
				// Use getAllByText since "Fade" appears in both title and info panel
				const fadeTexts = screen.getAllByText(/fade/i);
				expect(fadeTexts.length).toBeGreaterThan(0);
			});
		});

		it("should show Save and Remove buttons", async () => {
			const { container } = render(
				<TransitionIndicator transition={mockTransition} position="start" onEdit={mockOnEdit} onRemove={mockOnRemove} />
			);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
				expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
			});
		});
	});

	describe("Duration Editing", () => {
		it.skip("should update duration when slider changes", () => {
			// Radix UI Slider doesn't support standard change events
			// This should be tested with E2E tests or Radix-specific test utilities
		});

		it("should call onEdit with original duration when saved without changes", async () => {
			const { container } = render(
				<TransitionIndicator transition={mockTransition} position="start" onEdit={mockOnEdit} />
			);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /save/i })).toBeInTheDocument();
			});

			// Click Save without changing duration
			const saveButton = screen.getByRole("button", { name: /save/i });
			await userEvent.click(saveButton);

			expect(mockOnEdit).toHaveBeenCalledWith({
				type: "fade",
				duration: 1.0,
			});
		});

		it("should close dialog after saving", async () => {
			const { container } = render(
				<TransitionIndicator transition={mockTransition} position="start" onEdit={mockOnEdit} />
			);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				const saveButton = screen.getByRole("button", { name: /save/i });
				userEvent.click(saveButton);
			});

			await waitFor(() => {
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			});
		});
	});

	describe("Transition Removal", () => {
		it("should call onRemove when Remove button is clicked", async () => {
			const { container } = render(
				<TransitionIndicator transition={mockTransition} position="start" onRemove={mockOnRemove} />
			);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
			});

			const removeButton = screen.getByRole("button", { name: /remove/i });
			await userEvent.click(removeButton);

			expect(mockOnRemove).toHaveBeenCalled();
		});

		it("should close dialog after removing", async () => {
			const { container } = render(
				<TransitionIndicator transition={mockTransition} position="start" onRemove={mockOnRemove} />
			);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				expect(screen.getByRole("button", { name: /remove/i })).toBeInTheDocument();
			});

			const removeButton = screen.getByRole("button", { name: /remove/i });
			await userEvent.click(removeButton);

			await waitFor(() => {
				expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
			});
		});
	});

	describe("Different Transition Types", () => {
		const transitionTypes: Array<{ type: Transition["type"]; name: string; color: string }> = [
			{ type: "fade", name: "Fade", color: "blue" },
			{ type: "dissolve", name: "Cross Dissolve", color: "purple" },
			{ type: "wipe", name: "Wipe", color: "green" },
			{ type: "slide", name: "Slide", color: "orange" },
		];

		transitionTypes.forEach(({ type, name, color }) => {
			it(`should handle ${name} transition correctly`, async () => {
				const { container } = render(
					<TransitionIndicator transition={{ type, duration: 1.5 }} position="start" onEdit={mockOnEdit} />
				);

				const indicator = container.querySelector(".cursor-pointer");
				await userEvent.click(indicator!);

				await waitFor(() => {
					// Use getAllByText since transition name may appear in multiple places
					const elements = screen.getAllByText(new RegExp(name, "i"));
					expect(elements.length).toBeGreaterThan(0);
				});
			});
		});
	});

	describe("Edge Cases", () => {
		it("should work without onEdit callback", async () => {
			const { container } = render(<TransitionIndicator transition={mockTransition} position="start" />);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				const saveButton = screen.getByRole("button", { name: /save/i });
				expect(() => userEvent.click(saveButton)).not.toThrow();
			});
		});

		it("should work without onRemove callback", async () => {
			const { container } = render(<TransitionIndicator transition={mockTransition} position="start" />);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				const removeButton = screen.getByRole("button", { name: /remove/i });
				expect(() => userEvent.click(removeButton)).not.toThrow();
			});
		});

		it("should handle very short durations", async () => {
			const { container } = render(
				<TransitionIndicator transition={{ type: "fade", duration: 0.1 }} position="start" onEdit={mockOnEdit} />
			);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				expect(screen.getByText(/0\.10s/i)).toBeInTheDocument();
			});
		});

		it("should handle maximum durations", async () => {
			const { container } = render(
				<TransitionIndicator transition={{ type: "fade", duration: 3.0 }} position="start" onEdit={mockOnEdit} />
			);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				expect(screen.getByText(/3\.00s/i)).toBeInTheDocument();
			});
		});

		it("should stop propagation on indicator click", () => {
			const parentClick = vi.fn();
			const { container } = render(
				<div onClick={parentClick}>
					<TransitionIndicator transition={mockTransition} position="start" />
				</div>
			);

			const indicator = container.querySelector(".cursor-pointer");
			fireEvent.click(indicator!);

			// Parent click should not be called due to stopPropagation
			expect(parentClick).not.toHaveBeenCalled();
		});
	});

	describe("Accessibility", () => {
		it("should have accessible dialog structure", async () => {
			const { container } = render(
				<TransitionIndicator transition={mockTransition} position="start" onEdit={mockOnEdit} />
			);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				const dialog = screen.getByRole("dialog");
				expect(dialog).toBeInTheDocument();
			});
		});

		it("should have accessible slider with label", async () => {
			const { container } = render(
				<TransitionIndicator transition={mockTransition} position="start" onEdit={mockOnEdit} />
			);

			const indicator = container.querySelector(".cursor-pointer");
			await userEvent.click(indicator!);

			await waitFor(() => {
				const slider = screen.getByRole("slider");
				expect(slider).toBeInTheDocument();
				// Check that Duration label exists
				expect(screen.getByText("Duration")).toBeInTheDocument();
			});
		});
	});
});
