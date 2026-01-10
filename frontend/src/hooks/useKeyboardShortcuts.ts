import { useEffect, useRef, useState } from "react";
import { useTimeline } from "@/context/TimelineContext";
import type { Clip } from "@/types/timeline";

interface KeyboardShortcutsOptions {
	enabled?: boolean;
}

/**
 * Custom hook for managing keyboard shortcuts in the video editor
 * Implements shortcuts for play/pause, delete, copy/paste, undo/redo, navigation, and zoom
 */
export function useKeyboardShortcuts(options: KeyboardShortcutsOptions = {}) {
	const { enabled = true } = options;
	const {
		state,
		play,
		pause,
		removeClip,
		setCurrentTime,
		setZoom,
		addClip,
		setSelectedClip,
		undo,
		redo,
		canUndo,
		canRedo,
	} = useTimeline();

	// Store clipboard - use refs for data, state for UI indicators
	const clipboardRef = useRef<Clip | null>(null);
	const [hasClipboardContent, setHasClipboardContent] = useState(false);

	useEffect(() => {
		if (!enabled) return;

		const handleKeyDown = (event: KeyboardEvent) => {
			// Don't trigger shortcuts if user is typing in an input/textarea
			const target = event.target as HTMLElement;
			if (target.tagName === "INPUT" || target.tagName === "TEXTAREA" || target.isContentEditable) {
				return;
			}

			// Don't trigger shortcuts if focus is within a dialog
			if (target.closest && target.closest('[role="dialog"]')) {
				return;
			}

			const { key, ctrlKey, metaKey, shiftKey } = event;
			const isModifierPressed = ctrlKey || metaKey; // Support both Ctrl (Windows/Linux) and Cmd (Mac)

			// Space: Play/Pause
			if (key === " ") {
				event.preventDefault();
				if (state.isPlaying) {
					pause();
				} else {
					play();
				}
				return;
			}

			// Delete: Delete selected clip (only Delete key, not Backspace)
			if (key === "Delete") {
				if (state.selectedClipId) {
					event.preventDefault();
					removeClip(state.selectedClipId);
				}
				return;
			}

			// Ctrl+C: Copy clip
			if (isModifierPressed && key === "c") {
				if (state.selectedClipId) {
					event.preventDefault();
					// Find the selected clip
					for (const layer of state.layers) {
						const clip = layer.clips.find((c) => c.id === state.selectedClipId);
						if (clip) {
							clipboardRef.current = JSON.parse(JSON.stringify(clip));
							setHasClipboardContent(true);
							console.log("Clip copied to clipboard");
							break;
						}
					}
				}
				return;
			}

			// Ctrl+V: Paste clip
			if (isModifierPressed && key === "v") {
				if (clipboardRef.current) {
					event.preventDefault();

					// Create a new clip with a new ID and offset start time
					const newClip: Clip = {
						...clipboardRef.current,
						id: `clip-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
						startTime: state.currentTime,
					};

					// Find the appropriate layer based on clip data type or resource type
					const clipType = clipboardRef.current.data?.type;
					const targetLayerIndex = state.layers.findIndex((layer) => (clipType ? layer.type === clipType : true));

					if (targetLayerIndex !== -1) {
						addClip(newClip, targetLayerIndex);
						setSelectedClip(newClip.id);
						console.log("Clip pasted");
					} else {
						console.warn("No suitable layer found for pasted clip");
					}
				}
				return;
			}

			// Ctrl+Z: Undo
			if (isModifierPressed && !shiftKey && key === "z") {
				event.preventDefault();
				undo();
				return;
			}

			// Ctrl+Y or Ctrl+Shift+Z: Redo
			if (isModifierPressed && (key === "y" || (shiftKey && key === "z"))) {
				event.preventDefault();
				redo();
				return;
			}

			// Left Arrow: Move playhead backward (1 second, or 5 seconds with Shift)
			if (key === "ArrowLeft") {
				event.preventDefault();
				const step = shiftKey ? 5 : 1;
				setCurrentTime(Math.max(0, state.currentTime - step));
				return;
			}

			// Right Arrow: Move playhead forward (1 second, or 5 seconds with Shift)
			if (key === "ArrowRight") {
				event.preventDefault();
				const step = shiftKey ? 5 : 1;
				setCurrentTime(Math.min(state.duration, state.currentTime + step));
				return;
			}

			// +/=: Zoom in
			if (key === "+" || key === "=") {
				event.preventDefault();
				const zoomStep = 5;
				setZoom(state.zoom + zoomStep);
				return;
			}

			// -: Zoom out
			if (key === "-") {
				event.preventDefault();
				const zoomStep = 5;
				setZoom(state.zoom - zoomStep);
				return;
			}

			// Escape: Deselect clip
			if (key === "Escape") {
				if (state.selectedClipId) {
					event.preventDefault();
					setSelectedClip(null);
				}
				return;
			}

			// Home: Jump to start
			if (key === "Home") {
				event.preventDefault();
				setCurrentTime(0);
				return;
			}

			// End: Jump to end
			if (key === "End") {
				event.preventDefault();
				setCurrentTime(state.duration);
				return;
			}
		};

		window.addEventListener("keydown", handleKeyDown);

		return () => {
			window.removeEventListener("keydown", handleKeyDown);
		};
	}, [
		enabled,
		state.isPlaying,
		state.selectedClipId,
		state.currentTime,
		state.duration,
		state.zoom,
		state.layers,
		play,
		pause,
		removeClip,
		setCurrentTime,
		setZoom,
		addClip,
		setSelectedClip,
		undo,
		redo,
	]);

	return {
		// Expose clipboard status for UI indicators
		hasClipboardContent,
		// Expose history status for undo/redo button states
		canUndo,
		canRedo,
	};
}
