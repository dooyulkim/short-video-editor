import { useVideoPlayback } from "@/hooks/useVideoPlayback";
import { VideoPlayer } from "@/components/Player";
import { Button } from "@/components/ui/button";
import { Play, Pause, SkipBack } from "lucide-react";

/**
 * Example usage component showing how to integrate VideoPlayer and useVideoPlayback
 */
export function VideoPlayerExample() {
	const { isPlaying, currentTime, stop, togglePlayPause } = useVideoPlayback();

	return (
		<div className="flex flex-col gap-4">
			{/* Video Preview */}
			<div className="relative aspect-video bg-black rounded-lg overflow-hidden">
				<VideoPlayer width={1920} height={1080} className="w-full h-full" />

				{/* Playback Controls Overlay */}
				<div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 flex gap-2">
					<Button variant="secondary" size="icon" onClick={stop} title="Stop">
						<SkipBack className="size-4" />
					</Button>

					<Button variant="secondary" size="icon" onClick={togglePlayPause} title={isPlaying ? "Pause" : "Play"}>
						{isPlaying ? <Pause className="size-4" /> : <Play className="size-4" />}
					</Button>
				</div>

				{/* Time Display */}
				<div className="absolute top-4 right-4 bg-black bg-opacity-75 px-3 py-1 rounded text-white text-sm font-mono">
					{formatTime(currentTime)}
				</div>
			</div>
		</div>
	);
}

/**
 * Format seconds to MM:SS or HH:MM:SS
 */
function formatTime(seconds: number): string {
	const hours = Math.floor(seconds / 3600);
	const minutes = Math.floor((seconds % 3600) / 60);
	const secs = Math.floor(seconds % 60);

	if (hours > 0) {
		return `${hours.toString().padStart(2, "0")}:${minutes.toString().padStart(2, "0")}:${secs
			.toString()
			.padStart(2, "0")}`;
	}

	return `${minutes.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`;
}
