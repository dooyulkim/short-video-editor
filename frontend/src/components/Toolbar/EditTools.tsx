import { Scissors, Trash2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useTimeline } from "@/context/TimelineContext";
import { cutClipAtTime, duplicateClip, findClipById } from "@/utils/clipOperations";

interface EditToolsProps {
	className?: string;
}

export function EditTools({ className }: EditToolsProps) {
	const { state, removeClip, addClip } = useTimeline();

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
		<div className={`flex items-center gap-1.5 ${className}`}>
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
				<Scissors className="size-3 mr-1.5" />
				Cut
			</Button>

			<Button
				variant="outline"
				size="sm"
				onClick={handleDelete}
				disabled={!hasSelection}
				className="h-7 px-2 text-xs"
				title={!hasSelection ? "Select a clip first" : "Delete selected clip"}>
				<Trash2 className="size-3 mr-1.5" />
				Delete
			</Button>

			<Button
				variant="outline"
				size="sm"
				onClick={handleDuplicate}
				disabled={!hasSelection}
				className="h-7 px-2 text-xs"
				title={!hasSelection ? "Select a clip first" : "Duplicate clip (places copy after original)"}>
				<Copy className="size-3 mr-1.5" />
				Duplicate
			</Button>
		</div>
	);
}
