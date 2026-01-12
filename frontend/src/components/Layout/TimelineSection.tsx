import { Separator } from "@/components/ui/separator";
import { EditTools } from "@/components/Toolbar/EditTools";
import { Timeline } from "@/components/Timeline/Timeline";

interface TimelineSectionProps {
	height: number;
	onHeightChange: (height: number) => void;
}

export function TimelineSection({ height, onHeightChange }: TimelineSectionProps) {
	const handleResizeStart = () => {
		const handleMouseMove = (e: MouseEvent) => {
			const newHeight = Math.max(250, Math.min(600, window.innerHeight - e.clientY));
			onHeightChange(newHeight);
		};

		const handleMouseUp = () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
	};

	return (
		<>
			{/* Timeline Resize Handle */}
			<div
				className="h-1 cursor-row-resize hover:bg-primary/50 transition-colors group relative"
				onMouseDown={handleResizeStart}>
				<div className="absolute left-1/2 -translate-x-1/2 top-0 w-12 h-1 bg-primary/30 group-hover:bg-primary rounded-full transition-colors" />
			</div>

			<Separator />

			{/* Timeline Section */}
			<section
				style={{ height: `${height}px` }}
				className="shrink-0 flex flex-col overflow-hidden bg-card border-t border-border">
				{/* Edit Tools Bar */}
				<div className="border-b border-border bg-muted/30 px-4 py-2" data-edit-tools>
					<EditTools />
				</div>

				{/* Timeline */}
				<div className="flex-1 overflow-hidden">
					<Timeline />
				</div>
			</section>
		</>
	);
}
