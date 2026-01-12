import { Button } from "@/components/ui/button";
import { ResourcePanel } from "@/components/ResourcePanel";
import { TransitionPanel } from "@/components/TransitionPanel";
import { TextEditor } from "@/components/TextTool";
import { ChevronRight, PanelLeftClose } from "lucide-react";
import { cn } from "@/lib/utils";
import type { MediaResource } from "@/types/media";
import type { Clip } from "@/types/timeline";

interface LeftSidebarProps {
	isOpen: boolean;
	onOpenChange: (open: boolean) => void;
	width: number;
	onWidthChange: (width: number) => void;
	isMobile: boolean;
	activeTab: string;
	projectId: string;
	onResourcesChange: (resources: MediaResource[]) => void;
	onResourceSelect: (resource: MediaResource) => void;
	selectedResource: MediaResource | null;
	onSelectedResourceClear: () => void;
	onAddText: (clip: Clip) => void;
}

export function LeftSidebar({
	isOpen,
	onOpenChange,
	width,
	onWidthChange,
	isMobile,
	activeTab,
	projectId,
	onResourcesChange,
	onResourceSelect,
	selectedResource,
	onSelectedResourceClear,
	onAddText,
}: LeftSidebarProps) {
	const getTabLabel = () => {
		switch (activeTab) {
			case "media":
				return "Resources";
			case "transitions":
				return "Transitions";
			case "text":
				return "Text Tools";
			default:
				return activeTab;
		}
	};

	const getCollapsedLabel = () => {
		switch (activeTab) {
			case "media":
				return "Resources";
			case "transitions":
				return "Transitions";
			case "text":
				return "Text";
			default:
				return activeTab;
		}
	};

	const handleResizeStart = () => {
		const handleMouseMove = (e: MouseEvent) => {
			const newWidth = Math.max(200, Math.min(500, e.clientX));
			onWidthChange(newWidth);
		};

		const handleMouseUp = () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);
	};

	if (!isOpen) {
		return (
			<aside className="shrink-0 flex flex-col bg-card border-r border-border w-10">
				<div className="flex items-center justify-center py-1 border-b border-border bg-muted/30">
					<Button
						variant="ghost"
						size="icon"
						className="size-6"
						onClick={() => onOpenChange(true)}
						title="Show Resources">
						<ChevronRight className="size-4" />
					</Button>
				</div>
				<div className="flex-1 flex items-start justify-center pt-4">
					<span
						className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
						style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
						{getCollapsedLabel()}
					</span>
				</div>
			</aside>
		);
	}

	return (
		<aside
			style={{ width: isMobile ? "100%" : `${width}px` }}
			className={cn(
				"relative shrink-0 flex flex-col bg-card border-r border-border overflow-hidden transition-all",
				isMobile && "absolute inset-y-0 left-0 z-30 shadow-xl"
			)}>
			{/* Sidebar Header */}
			<div className="flex items-center justify-between px-3 py-1 border-b border-border bg-muted/30">
				<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{getTabLabel()}</h2>
				<Button variant="ghost" size="icon" className="size-6" onClick={() => onOpenChange(false)}>
					<PanelLeftClose className="size-4" />
				</Button>
			</div>

			{/* Sidebar Content */}
			<div className="flex-1 overflow-y-auto">
				{activeTab === "media" && (
					<ResourcePanel
						projectId={projectId}
						onResourcesChange={onResourcesChange}
						onResourceSelect={onResourceSelect}
						selectedResource={selectedResource}
						onSelectedResourceClear={onSelectedResourceClear}
					/>
				)}
				{activeTab === "transitions" && <TransitionPanel />}
				{activeTab === "text" && (
					<div className="p-4 space-y-4">
						<TextEditor onAddText={onAddText} />
						<p className="text-xs text-muted-foreground">Click the button above to add text overlays to your video.</p>
					</div>
				)}
				{!["media", "transitions", "text"].includes(activeTab) && (
					<div className="p-4">
						<p className="text-sm text-muted-foreground">
							{activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} tools coming soon...
						</p>
					</div>
				)}
			</div>

			{/* Resize Handle */}
			{!isMobile && (
				<div
					className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors group"
					onMouseDown={handleResizeStart}>
					<div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary/30 group-hover:bg-primary rounded-full transition-colors" />
				</div>
			)}
		</aside>
	);
}
