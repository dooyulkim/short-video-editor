import React, { useCallback, useMemo } from "react";
import type { Clip } from "@/types/timeline";
import { addOrUpdateKeyframe, removeKeyframe } from "@/utils/keyframeInterpolation";

interface KeyframeTrackProps {
	clip: Clip;
	zoom: number; // pixels per second
	onUpdateClip: (clipId: string, updates: Partial<Clip>) => void;
	currentTime: number;
}

export const KeyframeTrack: React.FC<KeyframeTrackProps> = ({ clip, zoom, onUpdateClip, currentTime }) => {
	const keyframes = useMemo(() => clip.keyframes || [], [clip.keyframes]);
	const trackWidth = clip.duration * zoom;

	// Calculate local time within the clip
	const localTime = Math.max(0, Math.min(currentTime - clip.startTime, clip.duration));

	const handleAddKeyframe = useCallback(
		(time: number) => {
			// Get current properties at this time to create a keyframe
			const newClip = addOrUpdateKeyframe(
				clip,
				time,
				{
					scale: clip.scale,
					position: clip.position,
					rotation: clip.rotation,
					opacity: clip.opacity,
				},
				"linear"
			);
			onUpdateClip(clip.id, { keyframes: newClip.keyframes });
		},
		[clip, onUpdateClip]
	);

	const handleRemoveKeyframe = useCallback(
		(time: number) => {
			const newClip = removeKeyframe(clip, time);
			onUpdateClip(clip.id, { keyframes: newClip.keyframes });
		},
		[clip, onUpdateClip]
	);

	const handleKeyframeClick = useCallback(
		(e: React.MouseEvent, keyframeTime: number) => {
			e.stopPropagation();

			// Right-click or Ctrl+Click to remove
			if (e.button === 2 || e.ctrlKey) {
				e.preventDefault();
				handleRemoveKeyframe(keyframeTime);
			}
		},
		[handleRemoveKeyframe]
	);

	const handleTrackClick = useCallback(
		(e: React.MouseEvent) => {
			const rect = e.currentTarget.getBoundingClientRect();
			const clickX = e.clientX - rect.left;
			const time = (clickX / trackWidth) * clip.duration;

			// Check if clicking near an existing keyframe
			const nearbyKeyframe = keyframes.find((kf) => Math.abs(kf.time * zoom - clickX) < 5);

			if (nearbyKeyframe) {
				// If near a keyframe and Ctrl/Cmd is pressed, remove it
				if (e.ctrlKey || e.metaKey) {
					handleRemoveKeyframe(nearbyKeyframe.time);
				}
			} else {
				// Add new keyframe at clicked position
				handleAddKeyframe(time);
			}
		},
		[trackWidth, clip.duration, keyframes, zoom, handleAddKeyframe, handleRemoveKeyframe]
	);

	return (
		<div className="relative w-full h-6 bg-gray-800 border-t border-gray-700">
			{/* Track area - clickable to add keyframes */}
			<div
				className="absolute inset-0 cursor-pointer hover:bg-gray-750"
				onClick={handleTrackClick}
				onContextMenu={(e) => e.preventDefault()}
				title="Click to add keyframe, Ctrl+Click to remove">
				{/* Keyframe markers */}
				{keyframes.map((keyframe, index) => {
					const x = (keyframe.time / clip.duration) * trackWidth;

					return (
						<div
							key={index}
							className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 cursor-pointer group"
							style={{ left: `${x}px` }}
							onClick={(e) => handleKeyframeClick(e, keyframe.time)}
							onContextMenu={(e) => {
								e.preventDefault();
								handleRemoveKeyframe(keyframe.time);
							}}
							title={`Keyframe at ${keyframe.time.toFixed(2)}s\nRight-click or Ctrl+Click to remove`}>
							{/* Diamond shape for keyframe */}
							<div className="relative">
								<svg width="12" height="12" viewBox="0 0 12 12" className="drop-shadow-lg">
									<path
										d="M 6 1 L 11 6 L 6 11 L 1 6 Z"
										fill="#3b82f6"
										stroke="white"
										strokeWidth="1"
										className="group-hover:fill-blue-400 transition-colors"
									/>
								</svg>

								{/* Property indicators */}
								<div className="absolute -top-1 -right-1 flex gap-0.5">
									{keyframe.properties.scale !== undefined && (
										<div className="w-1.5 h-1.5 rounded-full bg-green-400" title="Scale keyframe" />
									)}
									{keyframe.properties.position !== undefined && (
										<div className="w-1.5 h-1.5 rounded-full bg-purple-400" title="Position keyframe" />
									)}
									{keyframe.properties.rotation !== undefined && (
										<div className="w-1.5 h-1.5 rounded-full bg-yellow-400" title="Rotation keyframe" />
									)}
									{keyframe.properties.opacity !== undefined && (
										<div className="w-1.5 h-1.5 rounded-full bg-pink-400" title="Opacity keyframe" />
									)}
								</div>
							</div>
						</div>
					);
				})}

				{/* Current time indicator on keyframe track */}
				{currentTime >= clip.startTime && currentTime <= clip.startTime + clip.duration && (
					<div
						className="absolute top-0 bottom-0 w-0.5 bg-red-500 pointer-events-none"
						style={{ left: `${(localTime / clip.duration) * trackWidth}px` }}
					/>
				)}
			</div>

			{/* Legend/Help text */}
			{keyframes.length === 0 && (
				<div className="absolute inset-0 flex items-center justify-center pointer-events-none">
					<span className="text-xs text-gray-500">Click to add keyframes</span>
				</div>
			)}
		</div>
	);
};
