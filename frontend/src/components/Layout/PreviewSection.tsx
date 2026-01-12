import { Button } from "@/components/ui/button";
import { VideoPlayer } from "@/components/Player/VideoPlayer";
import { useTimeline } from "@/context/TimelineContext";
import { ChevronLeft, Play, Pause, RotateCcw } from "lucide-react";

interface PreviewSectionProps {
	isPropertiesPanelOpen: boolean;
	onShowProperties: () => void;
}

export function PreviewSection({ isPropertiesPanelOpen, onShowProperties }: PreviewSectionProps) {
	const timeline = useTimeline();
	const isPlaying = timeline?.state.isPlaying || false;

	const handleRestart = () => {
		timeline?.pause();
		setTimeout(() => {
			timeline?.setCurrentTime(0);
			setTimeout(() => {
				timeline?.play();
			}, 50);
		}, 50);
	};

	return (
		<div className="flex-1 flex flex-col overflow-hidden bg-linear-to-b from-zinc-950 to-zinc-900 border-r border-border">
			{/* Header */}
			<div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</h2>
				{!isPropertiesPanelOpen && (
					<Button variant="ghost" size="icon" className="size-6" onClick={onShowProperties} title="Show Properties">
						<ChevronLeft className="size-3" />
					</Button>
				)}
			</div>

			{/* Video Player Container */}
			<div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
				<div className="relative w-full h-full max-w-5xl bg-black rounded-lg overflow-hidden shadow-2xl border border-border/50 flex items-center justify-center">
					<VideoPlayer className="w-full h-full" />

					{/* Play/Pause and Restart Buttons - Bottom Right */}
					<div className="absolute bottom-4 right-4 z-10 flex gap-2">
						<Button
							variant="secondary"
							size="icon"
							onClick={handleRestart}
							className="size-12 rounded-full shadow-lg hover:scale-110 transition-transform"
							title="Restart preview">
							<RotateCcw className="size-5" />
						</Button>
						{!isPlaying ? (
							<Button
								variant="secondary"
								size="icon"
								onClick={() => timeline?.play()}
								className="size-12 rounded-full shadow-lg hover:scale-110 transition-transform"
								title="Play preview">
								<Play className="size-5" />
							</Button>
						) : (
							<Button
								variant="secondary"
								size="icon"
								onClick={() => timeline?.pause()}
								className="size-12 rounded-full shadow-lg hover:scale-110 transition-transform"
								title="Pause preview">
								<Pause className="size-5" />
							</Button>
						)}
					</div>
				</div>
			</div>
		</div>
	);
}
