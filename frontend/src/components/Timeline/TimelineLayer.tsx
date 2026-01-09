import React from "react";
import type { TimelineLayer as TimelineLayerType, Clip, Transition } from "@/types/timeline";
import { TimelineClip } from "./TimelineClip";
import { cn } from "@/lib/utils";
import { Lock, Unlock, Eye, EyeOff, Volume2, VolumeX } from "lucide-react";

interface TimelineLayerProps {
	layer: TimelineLayerType;
	zoom: number; // pixels per second
	selectedClipId: string | null;
	onClipSelect: (clipId: string) => void;
	onClipMove: (clipId: string, newStartTime: number) => void;
	onClipTrim: (clipId: string, newDuration: number, newTrimStart: number) => void;
	onToggleLock: (layerId: string) => void;
	onToggleVisible: (layerId: string) => void;
	onToggleMute: (layerId: string) => void;
	onUpdateClip?: (clipId: string, updates: Partial<Clip>) => void;
	onTransitionAdd?: (clipId: string, position: "in" | "out", transition: Transition) => void;
	onTransitionEdit?: (clipId: string, position: "in" | "out", transition: Transition) => void;
	onTransitionRemove?: (clipId: string, position: "in" | "out") => void;
	currentTime: number;
}

export const TimelineLayer: React.FC<TimelineLayerProps> = ({
	layer,
	zoom,
	selectedClipId,
	onClipSelect,
	onClipMove,
	onClipTrim,
	onToggleLock,
	onToggleVisible,
	onToggleMute,
	onUpdateClip,
	onTransitionAdd,
	onTransitionEdit,
	onTransitionRemove,
	currentTime,
}) => {
	// Get layer color based on type
	const getLayerColor = () => {
		switch (layer.type) {
			case "video":
				return "bg-slate-700";
			case "audio":
				return "bg-emerald-700";
			case "text":
				return "bg-purple-700";
			case "image":
				return "bg-orange-700";
			default:
				return "bg-slate-700";
		}
	};

	// Get layer icon text
	const getLayerIcon = () => {
		switch (layer.type) {
			case "video":
				return "🎬";
			case "audio":
				return "🎵";
			case "text":
				return "📝";
			case "image":
				return "🖼️";
			default:
				return "📄";
		}
	};

	return (
		<div className="flex border-b border-slate-600">
			{/* Layer header - left side controls */}
			<div
				className={cn(
					"w-48 flex items-center justify-between px-3 py-2",
					"border-r border-slate-600",
					getLayerColor(),
					!layer.visible && "opacity-50"
				)}>
				<div className="flex items-center gap-2 flex-1 min-w-0">
					<span className="text-lg" title={layer.type}>
						{getLayerIcon()}
					</span>
					<span className="text-white text-sm font-medium truncate">{layer.name || `${layer.type} Layer`}</span>
				</div>

				{/* Layer controls */}
				<div className="flex gap-1">
					{/* Lock/Unlock button */}
					<button
						className={cn(
							"p-1 rounded hover:bg-white/10 transition-colors",
							layer.locked ? "text-yellow-400" : "text-white/70"
						)}
						onClick={() => onToggleLock(layer.id)}
						title={layer.locked ? "Unlock layer" : "Lock layer"}>
						{layer.locked ? <Lock size={16} /> : <Unlock size={16} />}
					</button>

					{/* Show/Hide button */}
					<button
						className={cn(
							"p-1 rounded hover:bg-white/10 transition-colors",
							!layer.visible ? "text-red-400" : "text-white/70"
						)}
						onClick={() => onToggleVisible(layer.id)}
						title={layer.visible ? "Hide layer" : "Show layer"}>
						{layer.visible ? <Eye size={16} /> : <EyeOff size={16} />}
					</button>

					{/* Mute/Unmute button - only show for video and audio layers */}
					{(layer.type === "video" || layer.type === "audio") && (
						<button
							className={cn(
								"p-1 rounded hover:bg-white/10 transition-colors",
								layer.muted ? "text-red-400" : "text-white/70"
							)}
							onClick={() => onToggleMute(layer.id)}
							title={layer.muted ? "Unmute layer" : "Mute layer"}>
							{layer.muted ? <VolumeX size={16} /> : <Volume2 size={16} />}
						</button>
					)}
				</div>
			</div>

			{/* Layer timeline - clips area */}
			<div
				className={cn(
					"flex-1 relative bg-slate-800 min-h-15",
					layer.locked && "pointer-events-none opacity-60",
					!layer.visible && "opacity-40"
				)}>
				{/* Render all clips in this layer */}
				{layer.clips.map((clip) => (
					<TimelineClip
						key={clip.id}
						clip={clip}
						zoom={zoom}
						isSelected={selectedClipId === clip.id}
						onSelect={onClipSelect}
						onMove={onClipMove}
						onTrim={onClipTrim}
						onUpdateClip={onUpdateClip}
						onTransitionAdd={onTransitionAdd}
						onTransitionEdit={onTransitionEdit}
						onTransitionRemove={onTransitionRemove}
						currentTime={currentTime}
					/>
				))}

				{/* Empty state */}
				{layer.clips.length === 0 && (
					<div className="absolute inset-0 flex items-center justify-center">
						<span className="text-slate-500 text-xs">Drop clips here or drag from resources</span>
					</div>
				)}

				{/* Waveform placeholder for audio layers */}
				{layer.type === "audio" && layer.clips.length > 0 && (
					<div className="absolute inset-0 pointer-events-none opacity-20">
						{/* Waveform visualization will be implemented later */}
					</div>
				)}
			</div>
		</div>
	);
};
