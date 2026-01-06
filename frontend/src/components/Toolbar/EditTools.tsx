import { Scissors, Minimize2, Trash2, Copy, Undo2, Redo2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { useTimeline } from "@/context/TimelineContext";
import { cutClipAtTime, duplicateClip, findClipById } from "@/utils/clipOperations";

interface EditToolsProps {
	className?: string;
}

export function EditTools({ className }: EditToolsProps) {
	const { state, removeClip, addClip, undo, redo, canUndo, canRedo } = useTimeline();

	const { selectedClipId, currentTime, layers } = state;

	// Check if a clip is selected
	const hasSelection = selectedClipId !== null;

	// Find the selected clip
	const selectedClipData = selectedClipId ? findClipById(layers, selectedClipId) : null;

	// Check if playhead is over the selected clip (for cut operation)
	const canCut =
		hasSelection &&
		selectedClipData &&
		currentTime > selectedClipData.clip.startTime &&
		currentTime < selectedClipData.clip.startTime + selectedClipData.clip.duration;

	/**
	 * Handle cut operation - Split clip at playhead position
	 */
	const handleCut = () => {
		if (!selectedClipId || !selectedClipData) return;

		const { clip, layerIndex } = selectedClipData;

		// Calculate cut time relative to clip start
		const cutTime = currentTime - clip.startTime;

		// Cut the clip
		const [firstClip, secondClip] = cutClipAtTime(clip, cutTime);

		// Only proceed if we got two clips back (cut was valid)
		if (firstClip && secondClip) {
			// Update state by removing old and adding new clips
			removeClip(selectedClipId);
			addClip(firstClip, layerIndex);
			addClip(secondClip, layerIndex);
		}
	};

	/**
	 * Handle trim operation - Enable trim mode for selected clip
	 * Note: This would typically open a trim panel or enable trim handles
	 * For now, we'll just log that trim mode should be enabled
	 */
	const handleTrim = () => {
		if (!selectedClipId || !selectedClipData) return;

		// In a full implementation, this would:
		// 1. Enable trim mode in the UI
		// 2. Show trim handles on the selected clip
		// 3. Allow user to drag handles to adjust trim
		console.log("Trim mode enabled for clip:", selectedClipId);

		// For now, we could add a visual indicator or dispatch an action
		// that components can listen to for showing trim handles
	};

	/**
	 * Handle delete operation - Remove selected clip
	 */
	const handleDelete = () => {
		if (!selectedClipId) return;
		removeClip(selectedClipId);
	};

	/**
	 * Handle duplicate operation - Copy selected clip
	 */
	const handleDuplicate = () => {
		if (!selectedClipId || !selectedClipData) return;

		const { clip, layerIndex } = selectedClipData;

		// Create duplicate clip
		const duplicatedClip = duplicateClip(clip);

		// Add to timeline
		addClip(duplicatedClip, layerIndex);
	};

	return (
		<div className={`flex items-center justify-between gap-1.5 ${className}`}>
			{/* Left side - Edit actions */}
			<div className="flex gap-1.5">
				<Button
					variant="outline"
					size="sm"
					onClick={handleCut}
					disabled={!canCut}
					className="h-7 px-2 text-xs"
					title={
						!hasSelection
							? "Select a clip first"
							: !canCut
							? "Position playhead over the clip"
							: "Cut clip at playhead (splits into two clips)"
					}>
					<Scissors className="h-3 w-3 mr-1.5" />
					Cut
				</Button>

				<Button
					variant="outline"
					size="sm"
					onClick={handleTrim}
					disabled={!hasSelection}
					className="h-7 px-2 text-xs"
					title={!hasSelection ? "Select a clip first" : "Enable trim mode to adjust clip start/end"}>
					<Minimize2 className="h-3 w-3 mr-1.5" />
					Trim
				</Button>

				<Button
					variant="outline"
					size="sm"
					onClick={handleDelete}
					disabled={!hasSelection}
					className="h-7 px-2 text-xs"
					title={!hasSelection ? "Select a clip first" : "Delete selected clip"}>
					<Trash2 className="h-3 w-3 mr-1.5" />
					Delete
				</Button>

				<Button
					variant="outline"
					size="sm"
					onClick={handleDuplicate}
					disabled={!hasSelection}
					className="h-7 px-2 text-xs"
					title={!hasSelection ? "Select a clip first" : "Duplicate clip (places copy after original)"}>
					<Copy className="h-3 w-3 mr-1.5" />
					Duplicate
				</Button>
			</div>

			{/* Right side - Undo/Redo actions */}
			<div className="flex items-center gap-1.5">
				<Separator orientation="vertical" className="h-6" />
				<Button
					variant="outline"
					size="sm"
					onClick={undo}
					disabled={!canUndo}
					className="h-7 px-2 text-xs"
					title={canUndo ? "Undo last action (Ctrl+Z)" : "Nothing to undo"}>
					<Undo2 className="h-3 w-3 mr-1.5" />
					Undo
				</Button>

				<Button
					variant="outline"
					size="sm"
					onClick={redo}
					disabled={!canRedo}
					className="h-7 px-2 text-xs"
					title={canRedo ? "Redo action (Ctrl+Y)" : "Nothing to redo"}>
					<Redo2 className="h-3 w-3 mr-1.5" />
					Redo
				</Button>
			</div>
		</div>
	);
}
