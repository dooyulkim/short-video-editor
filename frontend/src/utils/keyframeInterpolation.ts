import type { Clip, Keyframe } from "@/types/timeline";

/**
 * Easing functions for keyframe interpolation
 */
const easingFunctions = {
	linear: (t: number) => t,
	"ease-in": (t: number) => t * t,
	"ease-out": (t: number) => t * (2 - t),
	"ease-in-out": (t: number) => (t < 0.5 ? 2 * t * t : -1 + (4 - 2 * t) * t),
};

/**
 * Interpolate a numeric value between two points with easing
 */
function interpolateValue(start: number, end: number, progress: number, easing: Keyframe["easing"] = "linear"): number {
	const easedProgress = easingFunctions[easing](progress);
	return start + (end - start) * easedProgress;
}

/**
 * Interpolate scale value which can be number or {x, y}
 */
function interpolateScale(
	start: number | { x: number; y: number } | undefined,
	end: number | { x: number; y: number } | undefined,
	progress: number,
	easing: Keyframe["easing"] = "linear"
): number | { x: number; y: number } {
	// Handle undefined cases
	const startScale = start ?? 1;
	const endScale = end ?? 1;

	// If both are numbers
	if (typeof startScale === "number" && typeof endScale === "number") {
		return interpolateValue(startScale, endScale, progress, easing);
	}

	// If either is an object, treat as object
	const startObj = typeof startScale === "number" ? { x: startScale, y: startScale } : startScale;
	const endObj = typeof endScale === "number" ? { x: endScale, y: endScale } : endScale;

	return {
		x: interpolateValue(startObj.x, endObj.x, progress, easing),
		y: interpolateValue(startObj.y, endObj.y, progress, easing),
	};
}

/**
 * Interpolate position value
 */
function interpolatePosition(
	start: { x: number; y: number } | undefined,
	end: { x: number; y: number } | undefined,
	progress: number,
	easing: Keyframe["easing"] = "linear"
): { x: number; y: number } {
	const startPos = start ?? { x: 0, y: 0 };
	const endPos = end ?? { x: 0, y: 0 };

	return {
		x: interpolateValue(startPos.x, endPos.x, progress, easing),
		y: interpolateValue(startPos.y, endPos.y, progress, easing),
	};
}

/**
 * Find the two keyframes that surround the given time
 */
function findSurroundingKeyframes(
	keyframes: Keyframe[],
	time: number
): { prev: Keyframe | null; next: Keyframe | null } {
	if (!keyframes || keyframes.length === 0) {
		return { prev: null, next: null };
	}

	// Sort keyframes by time
	const sorted = [...keyframes].sort((a, b) => a.time - b.time);

	// Find the keyframes before and after the current time
	let prev: Keyframe | null = null;
	let next: Keyframe | null = null;

	for (let i = 0; i < sorted.length; i++) {
		if (sorted[i].time <= time) {
			prev = sorted[i];
		}
		if (sorted[i].time > time && !next) {
			next = sorted[i];
			break;
		}
	}

	return { prev, next };
}

/**
 * Get interpolated property value at a specific time within a clip
 */
export function getInterpolatedProperty<K extends keyof Keyframe["properties"]>(
	clip: Clip,
	localTime: number,
	property: K
): Keyframe["properties"][K] | undefined {
	// If no keyframes, return the clip's base property
	if (!clip.keyframes || clip.keyframes.length === 0) {
		return clip[property] as Keyframe["properties"][K];
	}

	// Find surrounding keyframes
	const { prev, next } = findSurroundingKeyframes(clip.keyframes, localTime);

	// If before first keyframe or no keyframes have this property, use base clip property
	if (!prev && !next) {
		return clip[property] as Keyframe["properties"][K];
	}

	// If only one keyframe exists or we're before the first keyframe
	if (!prev && next) {
		// Interpolate from base clip property to first keyframe
		const baseValue = clip[property];
		const keyframeValue = next.properties[property];

		if (baseValue === undefined && keyframeValue === undefined) {
			return undefined;
		}

		const progress = next.time > 0 ? localTime / next.time : 1;
		return interpolatePropertyValue(baseValue, keyframeValue, progress, next.easing) as Keyframe["properties"][K];
	}

	// If after last keyframe
	if (prev && !next) {
		return prev.properties[property];
	}

	// Between two keyframes - interpolate
	if (prev && next) {
		const startValue = prev.properties[property];
		const endValue = next.properties[property];

		if (startValue === undefined && endValue === undefined) {
			return clip[property] as Keyframe["properties"][K];
		}

		const timeDiff = next.time - prev.time;
		const progress = timeDiff > 0 ? (localTime - prev.time) / timeDiff : 1;

		return interpolatePropertyValue(startValue, endValue, progress, next.easing) as Keyframe["properties"][K];
	}

	return clip[property] as Keyframe["properties"][K];
}

/**
 * Helper to interpolate any property value based on its type
 */
function interpolatePropertyValue(
	start: number | { x: number; y: number } | undefined,
	end: number | { x: number; y: number } | undefined,
	progress: number,
	easing: Keyframe["easing"] = "linear"
): number | { x: number; y: number } | undefined {
	// Handle undefined
	if (start === undefined) start = end;
	if (end === undefined) end = start;
	if (start === undefined && end === undefined) return undefined;

	// Determine type and interpolate accordingly
	if (typeof start === "number" && typeof end === "number") {
		return interpolateValue(start, end, progress, easing);
	}

	// Handle scale (can be number or object)
	if (
		(typeof start === "number" || (start && typeof start === "object" && "x" in start)) &&
		(typeof end === "number" || (end && typeof end === "object" && "x" in end))
	) {
		return interpolateScale(start, end, progress, easing);
	}

	// Handle position objects
	if (
		start &&
		typeof start === "object" &&
		"x" in start &&
		"y" in start &&
		end &&
		typeof end === "object" &&
		"x" in end &&
		"y" in end
	) {
		return interpolatePosition(start, end, progress, easing);
	}

	// Default: return end value (no interpolation)
	return end;
}

/**
 * Get all interpolated properties for a clip at a specific time
 */
export function getInterpolatedProperties(
	clip: Clip,
	localTime: number
): {
	scale: number | { x: number; y: number };
	position: { x: number; y: number };
	rotation: number;
	opacity: number;
} {
	return {
		scale:
			(getInterpolatedProperty(clip, localTime, "scale") as number | { x: number; y: number } | undefined) ??
			clip.scale ??
			1,
		position: (getInterpolatedProperty(clip, localTime, "position") as { x: number; y: number } | undefined) ??
			clip.position ?? { x: 0, y: 0 },
		rotation: (getInterpolatedProperty(clip, localTime, "rotation") as number | undefined) ?? clip.rotation ?? 0,
		opacity: (getInterpolatedProperty(clip, localTime, "opacity") as number | undefined) ?? clip.opacity ?? 1,
	};
}

/**
 * Add or update a keyframe at a specific time
 */
export function addOrUpdateKeyframe(
	clip: Clip,
	time: number,
	properties: Partial<Keyframe["properties"]>,
	easing: Keyframe["easing"] = "linear"
): Clip {
	const keyframes = clip.keyframes ? [...clip.keyframes] : [];

	// Check if keyframe already exists at this time
	const existingIndex = keyframes.findIndex((kf) => Math.abs(kf.time - time) < 0.01);

	if (existingIndex >= 0) {
		// Update existing keyframe
		keyframes[existingIndex] = {
			...keyframes[existingIndex],
			properties: {
				...keyframes[existingIndex].properties,
				...properties,
			},
			easing,
		};
	} else {
		// Add new keyframe
		keyframes.push({
			time,
			properties,
			easing,
		});
	}

	// Sort keyframes by time
	keyframes.sort((a, b) => a.time - b.time);

	return {
		...clip,
		keyframes,
	};
}

/**
 * Remove keyframe at specific time
 */
export function removeKeyframe(clip: Clip, time: number): Clip {
	if (!clip.keyframes) return clip;

	const keyframes = clip.keyframes.filter((kf) => Math.abs(kf.time - time) > 0.01);

	return {
		...clip,
		keyframes: keyframes.length > 0 ? keyframes : undefined,
	};
}

/**
 * Remove all keyframes for a clip
 */
export function clearKeyframes(clip: Clip): Clip {
	return {
		...clip,
		keyframes: undefined,
	};
}
