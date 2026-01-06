import { useState, useEffect } from "react";
import "./App.css";
import { TopToolbar } from "./components/Toolbar/TopToolbar";
import { ResourcePanel } from "./components/ResourcePanel";
import { VideoPlayer } from "./components/Player/VideoPlayer";
import { Timeline } from "./components/Timeline/Timeline";
import { TransitionPanel } from "./components/TransitionPanel";
import { EditTools } from "./components/Toolbar/EditTools";
import { TimelineProvider } from "./context/TimelineContext";
import { Separator } from "./components/ui/separator";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/toaster";
import { ChevronLeft, ChevronRight, PanelLeftClose, PanelRightClose } from "lucide-react";
import type { MediaResource } from "./types/media";
import { cn } from "./lib/utils";

function App() {
	const [activeTab, setActiveTab] = useState("media");
	const [, setResources] = useState<MediaResource[]>([]);
	const [leftSidebarWidth, setLeftSidebarWidth] = useState(320);
	const [rightSidebarWidth, setRightSidebarWidth] = useState(280);
	const [timelineHeight, setTimelineHeight] = useState(350);
	const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
	const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
	const [isResizingLeft, setIsResizingLeft] = useState(false);
	const [isResizingRight, setIsResizingRight] = useState(false);
	const [isResizingTimeline, setIsResizingTimeline] = useState(false);
	const [isMobile, setIsMobile] = useState(false);

	// Set dark mode by default
	useEffect(() => {
		document.documentElement.classList.add("dark");
	}, []);

	// Responsive behavior - detect screen size
	useEffect(() => {
		const checkMobile = () => {
			const mobile = window.innerWidth < 768;
			setIsMobile(mobile);
			if (mobile) {
				setIsLeftSidebarOpen(false);
				setIsRightSidebarOpen(false);
			}
		};

		checkMobile();
		window.addEventListener("resize", checkMobile);
		return () => window.removeEventListener("resize", checkMobile);
	}, []);

	// Handle left sidebar resize
	useEffect(() => {
		if (!isResizingLeft) return;

		const handleMouseMove = (e: MouseEvent) => {
			const newWidth = Math.max(200, Math.min(500, e.clientX));
			setLeftSidebarWidth(newWidth);
		};

		const handleMouseUp = () => {
			setIsResizingLeft(false);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isResizingLeft]);

	// Handle right sidebar resize
	useEffect(() => {
		if (!isResizingRight) return;

		const handleMouseMove = (e: MouseEvent) => {
			const newWidth = Math.max(200, Math.min(500, window.innerWidth - e.clientX));
			setRightSidebarWidth(newWidth);
		};

		const handleMouseUp = () => {
			setIsResizingRight(false);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isResizingRight]);

	// Handle timeline resize
	useEffect(() => {
		if (!isResizingTimeline) return;

		const handleMouseMove = (e: MouseEvent) => {
			const newHeight = Math.max(250, Math.min(600, window.innerHeight - e.clientY));
			setTimelineHeight(newHeight);
		};

		const handleMouseUp = () => {
			setIsResizingTimeline(false);
		};

		document.addEventListener("mousemove", handleMouseMove);
		document.addEventListener("mouseup", handleMouseUp);

		return () => {
			document.removeEventListener("mousemove", handleMouseMove);
			document.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isResizingTimeline]);

	const handleSave = () => {
		console.log("Save project");
		// TODO: Implement project save
	};

	const handleLoad = () => {
		console.log("Load project");
		// TODO: Implement project load
	};

	const handleExport = () => {
		console.log("Export video");
		// TODO: Implement video export
	};

	return (
		<TimelineProvider>
			<div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
				{/* Top Toolbar with Logo and Project Controls */}
				<TopToolbar
					activeTab={activeTab}
					onTabChange={setActiveTab}
					onSave={handleSave}
					onLoad={handleLoad}
					onExport={handleExport}
				/>

				<Separator />

				{/* Main Content Grid */}
				<div className="flex-1 flex overflow-hidden relative">
					{/* Left Sidebar - Resource Panel */}
					{isLeftSidebarOpen && (
						<aside
							style={{ width: isMobile ? "100%" : `${leftSidebarWidth}px` }}
							className={cn(
								"shrink-0 flex flex-col bg-card border-r border-border overflow-hidden transition-all",
								isMobile && "absolute inset-y-0 left-0 z-30 shadow-xl"
							)}>
							{/* Sidebar Header */}
							<div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
								<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
									{activeTab === "media"
										? "Resources"
										: activeTab === "transitions"
										? "Transitions"
										: activeTab === "text"
										? "Text Tools"
										: activeTab}
								</h2>
								<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsLeftSidebarOpen(false)}>
									<PanelLeftClose className="h-4 w-4" />
								</Button>
							</div>

							{/* Sidebar Content */}
							<div className="flex-1 overflow-y-auto">
								{activeTab === "media" && <ResourcePanel onResourcesChange={setResources} />}
								{activeTab === "transitions" && <TransitionPanel />}
								{activeTab === "text" && (
									<div className="p-4">
										<p className="text-sm text-muted-foreground">Text tools coming soon...</p>
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
									onMouseDown={() => setIsResizingLeft(true)}>
									<div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary/30 group-hover:bg-primary rounded-full transition-colors" />
								</div>
							)}
						</aside>
					)}

					{/* Toggle Left Sidebar Button */}
					{!isLeftSidebarOpen && (
						<Button
							variant="outline"
							size="icon"
							className="absolute left-2 top-4 z-20 h-8 w-8 shadow-md"
							onClick={() => setIsLeftSidebarOpen(true)}>
							<ChevronRight className="h-4 w-4" />
						</Button>
					)}

					{/* Center Area - Video Player and Timeline */}
					<main className="flex-1 flex flex-col overflow-hidden bg-background">
						{/* Video Player Area */}
						<div className="flex-1 flex flex-col overflow-hidden bg-linear-to-b from-zinc-950 to-zinc-900">
							<div className="flex-1 flex items-center justify-center p-6">
								<div className="w-full max-w-6xl aspect-video bg-black rounded-lg overflow-hidden shadow-2xl border border-border/50">
									<VideoPlayer className="w-full h-full" />
								</div>
							</div>
						</div>

						{/* Timeline Resize Handle */}
						<div
							className="h-1 cursor-row-resize hover:bg-primary/50 transition-colors group relative"
							onMouseDown={() => setIsResizingTimeline(true)}>
							<div className="absolute left-1/2 -translate-x-1/2 top-0 w-12 h-1 bg-primary/30 group-hover:bg-primary rounded-full transition-colors" />
						</div>

						<Separator />

						{/* Bottom - Timeline Section */}
						<section
							style={{ height: `${timelineHeight}px` }}
							className="shrink-0 flex flex-col overflow-hidden bg-card border-t border-border">
							{/* Edit Tools Bar */}
							<div className="border-b border-border bg-muted/30 px-4 py-2">
								<EditTools />
							</div>

							{/* Timeline */}
							<div className="flex-1 overflow-hidden">
								<Timeline />
							</div>
						</section>
					</main>

					{/* Right Sidebar - Properties Panel (Optional) */}
					{isRightSidebarOpen && (
						<aside
							style={{ width: isMobile ? "100%" : `${rightSidebarWidth}px` }}
							className={cn(
								"shrink-0 flex flex-col bg-card border-l border-border overflow-hidden transition-all",
								isMobile && "absolute inset-y-0 right-0 z-30 shadow-xl"
							)}>
							{/* Sidebar Header */}
							<div className="flex items-center justify-between p-3 border-b border-border bg-muted/30">
								<h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">Properties</h2>
								<Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setIsRightSidebarOpen(false)}>
									<PanelRightClose className="h-4 w-4" />
								</Button>
							</div>

							{/* Properties Content */}
							<div className="flex-1 overflow-y-auto p-4">
								<div className="space-y-4">
									<div className="text-sm text-muted-foreground">
										<p className="mb-2 font-medium text-foreground">Clip Properties</p>
										<p>Select a clip to view and edit its properties.</p>
									</div>
								</div>
							</div>

							{/* Resize Handle */}
							{!isMobile && (
								<div
									className="absolute left-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors group"
									onMouseDown={() => setIsResizingRight(true)}>
									<div className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary/30 group-hover:bg-primary rounded-full transition-colors" />
								</div>
							)}
						</aside>
					)}

					{/* Toggle Right Sidebar Button */}
					{!isRightSidebarOpen && !isMobile && (
						<Button
							variant="outline"
							size="icon"
							className="absolute right-2 top-4 z-20 h-8 w-8 shadow-md"
							onClick={() => setIsRightSidebarOpen(true)}>
							<ChevronLeft className="h-4 w-4" />
						</Button>
					)}
				</div>
			</div>
			<Toaster />
		</TimelineProvider>
	);
}

export default App;
