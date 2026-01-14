import type { Clip, TimelineLayer } from "@/types/timeline";

/**
 * Split a clip at a specific time into two separate clips
 * @param clip - The clip to cut
 * @param cutTime - The time (in seconds) at which to cut the clip (relative to the clip's start)
 * @returns Array of two new clips, or original clip if cut time is invalid
 */
export function cutClipAtTime(clip: Clip, cutTime: number): Clip[] {
	// Validate cut time is within the clip's duration
	if (cutTime <= 0 || cutTime >= clip.duration) {
		return [clip];
	}

	// Calculate the actual cut position relative to the source media
	const cutPositionInSource = clip.trimStart + cutTime;

	// First clip: from start to cut point
	const firstClip: Clip = {
		...clip,
		id: `${clip.id}-part1-${Date.now()}`,
		duration: cutTime,
		trimEnd: clip.trimStart + clip.duration - cutPositionInSource, // remaining trim at end
	};

	// Second clip: from cut point to end
	const secondClip: Clip = {
		...clip,
		id: `${clip.id}-part2-${Date.now()}`,
		startTime: clip.startTime + cutTime,
		duration: clip.duration - cutTime,
		trimStart: cutPositionInSource, // start from cut position in source
		transitions: {
			in: undefined, // Remove in transition from second clip
			out: clip.transitions?.out, // Keep out transition only on second clip
		},
	};

	// Keep in transition only on first clip
	firstClip.transitions = {
		in: clip.transitions?.in,
		out: undefined,
	};

	return [firstClip, secondClip];
}

/**
 * Trim a clip by adjusting its start and end times
 * @param clip - The clip to trim
 * @param newStartTime - New start time on the timeline (in seconds)
 * @param newEndTime - New end time on the timeline (in seconds)
 * @returns Updated clip with adjusted trim properties
 */
export function trimClip(clip: Clip, newStartTime: number, newEndTime: number): Clip {
	// Calculate how much time was trimmed from the start and end
	const startDiff = newStartTime - clip.startTime;
	const endDiff = clip.startTime + clip.duration - newEndTime;

	// Calculate new trim values
	const newTrimStart = clip.trimStart + Math.max(0, startDiff);
	const newTrimEnd = clip.trimEnd + Math.max(0, endDiff);
	const newDuration = newEndTime - newStartTime;

	// Validate that the new duration is positive
	if (newDuration <= 0) {
		return clip;
	}

	return {
		...clip,
		startTime: newStartTime,
		duration: newDuration,
		trimStart: newTrimStart,
		trimEnd: newTrimEnd,
	};
}

/**
 * Create a duplicate of a clip with a new ID
 * @param clip - The clip to duplicate
 * @returns New clip with same properties but different ID, placed after the original
 */
export function duplicateClip(clip: Clip): Clip {
	return {
		...clip,
		id: `${clip.id}-copy-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
		startTime: clip.startTime + clip.duration, // Place after original clip
		// Deep copy nested objects to avoid shared references
		position: clip.position ? { ...clip.position } : undefined,
		scale: clip.scale ? (typeof clip.scale === "number" ? clip.scale : { ...clip.scale }) : undefined,
		data: clip.data ? { ...clip.data } : undefined,
		transitions: clip.transitions
			? {
					in: clip.transitions.in ? { ...clip.transitions.in } : undefined,
					out: clip.transitions.out ? { ...clip.transitions.out } : undefined,
			  }
			: undefined,
		effects: clip.effects ? clip.effects.map((effect) => ({ ...effect })) : undefined,
		keyframes: clip.keyframes ? clip.keyframes.map((kf) => ({ ...kf, properties: { ...kf.properties } })) : undefined,
	};
}

/**
 * Remove a clip from the layers
 * @param layers - Array of timeline layers
 * @param clipId - ID of the clip to remove
 * @returns Updated layers array with the clip removed
 */
export function deleteClip(layers: TimelineLayer[], clipId: string): TimelineLayer[] {
	return layers.map((layer) => ({
		...layer,
		clips: layer.clips.filter((clip) => clip.id !== clipId),
	}));
}

/**
 * Find a clip by ID across all layers
 * @param layers - Array of timeline layers
 * @param clipId - ID of the clip to find
 * @returns The clip and its layer index, or null if not found
 */
export function findClipById(layers: TimelineLayer[], clipId: string): { clip: Clip; layerIndex: number } | null {
	for (let i = 0; i < layers.length; i++) {
		const clip = layers[i].clips.find((c) => c.id === clipId);
		if (clip) {
			return { clip, layerIndex: i };
		}
	}
	return null;
}

/**
 * Replace a clip with multiple clips (used for cut operation)
 * @param layers - Array of timeline layers
 * @param clipId - ID of the clip to replace
 * @param newClips - Array of new clips to replace the original
 * @returns Updated layers array
 */
export function replaceClip(layers: TimelineLayer[], clipId: string, newClips: Clip[]): TimelineLayer[] {
	return layers.map((layer) => ({
		...layer,
		clips: layer.clips.flatMap((clip) => (clip.id === clipId ? newClips : [clip])),
	}));
}

/**
 * Calculate the content duration based on the end time of the last resource placed.
 * This represents the actual playable content duration, not the timeline's display duration.
 * @param layers - Array of timeline layers
 * @returns The end time of the last clip, or 0 if no clips exist
 */
export function calculateContentDuration(layers: TimelineLayer[]): number {
	let maxEndTime = 0;

	for (const layer of layers) {
		for (const clip of layer.clips) {
			const clipEndTime = clip.startTime + clip.duration;
			if (clipEndTime > maxEndTime) {
				maxEndTime = clipEndTime;
			}
		}
	}

	return maxEndTime;
}
