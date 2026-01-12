import { useState, useEffect, useMemo } from "react";
import "./App.css";
import { TopToolbar } from "./components/Toolbar/TopToolbar";
import { ResourcePanel } from "./components/ResourcePanel";
import { VideoPlayer } from "./components/Player/VideoPlayer";
import { Timeline } from "./components/Timeline/Timeline";
import { TransitionPanel } from "./components/TransitionPanel";
import { EditTools } from "./components/Toolbar/EditTools";
import { ExportDialog } from "./components/Export";
import { TextEditor } from "./components/TextTool";
import { TimelineProvider, useTimeline } from "./context/TimelineContext";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import type { Clip } from "./types/timeline";
import { Separator } from "./components/ui/separator";
import { Button } from "./components/ui/button";
import { Toaster } from "./components/ui/toaster";
import {
	ChevronLeft,
	ChevronRight,
	PanelLeftClose,
	PanelRightClose,
	Music,
	Play,
	Pause,
	RotateCcw,
} from "lucide-react";
import type { MediaResource } from "./types/media";
import type { Timeline as TimelineType } from "./types/timeline";
import { cn } from "./lib/utils";

// Generate a unique project ID
const generateProjectId = () => `project-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

function AppContent() {
	const [activeTab, setActiveTab] = useState("media");
	const [, setResources] = useState<MediaResource[]>([]);
	const [selectedResource, setSelectedResource] = useState<MediaResource | null>(null);
	const timeline = useTimeline();
	const isPlaying = timeline?.state.isPlaying || false;
	const [leftSidebarWidth, setLeftSidebarWidth] = useState(280);
	const [timelineHeight, setTimelineHeight] = useState(250);
	const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
	const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(true);
	const [isResizingLeft, setIsResizingLeft] = useState(false);
	const [isResizingTimeline, setIsResizingTimeline] = useState(false);
	const [isMobile, setIsMobile] = useState(false);
	const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
	// Project state - initialize with a unique project ID
	const [currentProjectId, setCurrentProjectId] = useState<string>(() => generateProjectId());

	// Enable keyboard shortcuts (Ctrl+Z for undo, Ctrl+Y for redo, etc.)
	useKeyboardShortcuts();

	// Create timeline data object for export
	const timelineData: TimelineType = useMemo(
		() => ({
			id: "main-timeline",
			name: "Main Timeline",
			layers: timeline?.state.layers || [],
			duration: timeline?.state.duration || 0,
			fps: 30,
			resolution: {
				width: timeline?.state.canvasSize?.width || 1080,
				height: timeline?.state.canvasSize?.height || 1920,
			},
		}),
		[timeline?.state.layers, timeline?.state.duration, timeline?.state.canvasSize]
	);

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
				setIsPropertiesPanelOpen(false);
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

	const handleExport = () => {
		setIsExportDialogOpen(true);
	};

	const handleResourceSelect = (resource: MediaResource) => {
		setSelectedResource(resource);
		setIsPropertiesPanelOpen(true);
	};

	// Handle adding text clips to the timeline
	const handleAddText = (textClip: Clip) => {
		if (!timeline) return;

		// Set the start time to the current playhead position
		const clipWithStartTime = {
			...textClip,
			startTime: timeline.state.currentTime,
		};

		// Find or create a text layer
		const textLayerIndex = timeline.state.layers.findIndex((layer) => layer.type === "text");

		if (textLayerIndex >= 0) {
			// Add to existing text layer
			timeline.addClip(clipWithStartTime, textLayerIndex);
		} else {
			// Create a new text layer and add the clip
			timeline.addLayer("text");
			// The layer will be added at the end, so we add the clip to the last layer
			setTimeout(() => {
				const newLayerIndex = timeline.state.layers.length;
				timeline.addClip(clipWithStartTime, newLayerIndex);
			}, 0);
		}
	};

	// Handle project change from ProjectControls
	const handleProjectChange = (projectId: string, _projectName: string) => {
		setCurrentProjectId(projectId);
	};

	return (
		<div className="h-screen flex flex-col bg-background text-foreground overflow-hidden">
			{/* Top Toolbar with Logo and Project Controls */}
			<TopToolbar
				activeTab={activeTab}
				onTabChange={setActiveTab}
				onExport={handleExport}
				onProjectChange={handleProjectChange}
			/>

			<Separator />

			{/* Main Content Grid */}
			<div className="flex-1 flex overflow-hidden relative">
				{/* Left Sidebar - Resource Panel */}
				{isLeftSidebarOpen ? (
					<aside
						style={{ width: isMobile ? "100%" : `${leftSidebarWidth}px` }}
						className={cn(
							"relative shrink-0 flex flex-col bg-card border-r border-border overflow-hidden transition-all",
							isMobile && "absolute inset-y-0 left-0 z-30 shadow-xl"
						)}>
						{/* Sidebar Header */}
						<div className="flex items-center justify-between px-3 py-1 border-b border-border bg-muted/30">
							<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">
								{activeTab === "media"
									? "Resources"
									: activeTab === "transitions"
									? "Transitions"
									: activeTab === "text"
									? "Text Tools"
									: activeTab}
							</h2>
							<Button variant="ghost" size="icon" className="size-6" onClick={() => setIsLeftSidebarOpen(false)}>
								<PanelLeftClose className="size-4" />
							</Button>
						</div>

						{/* Sidebar Content */}
						<div className="flex-1 overflow-y-auto">
							{activeTab === "media" && (
								<ResourcePanel
									projectId={currentProjectId}
									onResourcesChange={setResources}
									onResourceSelect={handleResourceSelect}
									selectedResource={selectedResource}
									onSelectedResourceClear={() => setSelectedResource(null)}
								/>
							)}
							{activeTab === "transitions" && <TransitionPanel />}
							{activeTab === "text" && (
								<div className="p-4 space-y-4">
									<TextEditor onAddText={handleAddText} />
									<p className="text-xs text-muted-foreground">
										Click the button above to add text overlays to your video.
									</p>
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

						{/* Resize Handle - Show for all tabs */}
						{!isMobile && (
							<div
								className="absolute right-0 top-0 bottom-0 w-1 cursor-col-resize hover:bg-primary/50 transition-colors group"
								onMouseDown={() => setIsResizingLeft(true)}>
								<div className="absolute right-0 top-1/2 -translate-y-1/2 w-1 h-12 bg-primary/30 group-hover:bg-primary rounded-full transition-colors" />
							</div>
						)}
					</aside>
				) : (
					/* Collapsed Left Sidebar - Narrow strip with expand button */
					<aside className="shrink-0 flex flex-col bg-card border-r border-border w-10">
						<div className="flex items-center justify-center py-1 border-b border-border bg-muted/30">
							<Button
								variant="ghost"
								size="icon"
								className="size-6"
								onClick={() => setIsLeftSidebarOpen(true)}
								title="Show Resources">
								<ChevronRight className="size-4" />
							</Button>
						</div>
						{/* Vertical label */}
						<div className="flex-1 flex items-start justify-center pt-4">
							<span
								className="text-xs font-semibold uppercase tracking-wide text-muted-foreground"
								style={{ writingMode: "vertical-rl", textOrientation: "mixed" }}>
								{activeTab === "media"
									? "Resources"
									: activeTab === "transitions"
									? "Transitions"
									: activeTab === "text"
									? "Text"
									: activeTab}
							</span>
						</div>
					</aside>
				)}

				{/* Center Area - Preview, Properties and Timeline */}
				<main className="flex-1 flex flex-col overflow-hidden bg-background">
					{/* Top Section - Preview and Properties side by side */}
					<div className="flex-1 flex overflow-hidden">
						{/* Preview Section - Left */}
						<div className="flex-1 flex flex-col overflow-hidden bg-linear-to-b from-zinc-950 to-zinc-900 border-r border-border">
							<div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
								<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</h2>{" "}
								{!isPropertiesPanelOpen && (
									<Button
										variant="ghost"
										size="icon"
										className="size-6"
										onClick={() => setIsPropertiesPanelOpen(true)}
										title="Show Properties">
										<ChevronLeft className="size-3" />
									</Button>
								)}{" "}
							</div>
							<div className="flex-1 flex items-center justify-center p-4 overflow-hidden">
								<div className="relative w-full h-full max-w-5xl bg-black rounded-lg overflow-hidden shadow-2xl border border-border/50 flex items-center justify-center">
									<VideoPlayer className="w-full h-full" />
									{/* Play/Pause and Restart Buttons - Bottom Right */}
									<div className="absolute bottom-4 right-4 z-10 flex gap-2">
										<Button
											variant="secondary"
											size="icon"
											onClick={() => {
												timeline?.pause();
												setTimeout(() => {
													timeline?.setCurrentTime(0);
													setTimeout(() => {
														timeline?.play();
													}, 50);
												}, 50);
											}}
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

						{/* Properties Section - Right */}
						{isPropertiesPanelOpen && (
							<div className="w-80 flex flex-col overflow-hidden bg-card border-l border-border">
								<div className="flex items-center justify-between px-4 py-1 border-b border-border bg-muted/30">
									<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Properties</h2>
									<Button
										variant="ghost"
										size="icon"
										className="size-6"
										onClick={() => setIsPropertiesPanelOpen(false)}
										title="Hide Properties">
										<PanelRightClose className="size-3" />
									</Button>
								</div>
								<div className="flex-1 overflow-y-auto px-4 py-3">
									{selectedResource ? (
										<div className="space-y-3">
											{/* Resource Preview */}
											<div className="bg-black rounded-md overflow-hidden aspect-video flex items-center justify-center relative">
												{selectedResource.type === "video" ? (
													<>
														<video
															key={selectedResource.id}
															src={selectedResource.url}
															controls
															preload="metadata"
															className="w-full h-full object-contain"
															onError={(e) => {
																const videoElement = e.currentTarget;
																console.error("Video load error:", {
																	url: selectedResource.url,
																	error: videoElement.error,
																	errorCode: videoElement.error?.code,
																	errorMessage: videoElement.error?.message,
																	networkState: videoElement.networkState,
																	readyState: videoElement.readyState,
																});
																// Show error overlay
																const errorDiv = document.createElement("div");
																errorDiv.className =
																	"absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 text-red-400 text-xs p-4 text-center";
																errorDiv.innerHTML = `<div><p class="font-medium mb-1">Cannot play video</p><p class="text-xs text-gray-400">Format may not be supported by browser.<br/>Try converting to MP4 (H.264)</p></div>`;
																videoElement.parentElement?.appendChild(errorDiv);
															}}
															onLoadStart={() => console.log("Video load started:", selectedResource.url)}
															onLoadedMetadata={() => console.log("Video metadata loaded")}
														/>
													</>
												) : selectedResource.type === "audio" ? (
													<div className="w-full h-full flex flex-col items-center justify-center space-y-3 p-4">
														<Music className="size-12 text-primary" />
														<audio
															key={selectedResource.id}
															src={selectedResource.url}
															controls
															preload="metadata"
															className="w-full"
															onError={(e) => {
																const audioElement = e.currentTarget;
																console.error("Audio load error:", {
																	url: selectedResource.url,
																	error: audioElement.error,
																	errorCode: audioElement.error?.code,
																});
															}}
														/>
													</div>
												) : selectedResource.type === "image" ? (
													<img
														key={selectedResource.id}
														src={selectedResource.url}
														alt={selectedResource.name}
														className="w-full h-full object-contain"
														onError={(e) => {
															console.error("Image load error:", {
																url: selectedResource.url,
																error: e,
															});
														}}
													/>
												) : null}
											</div>

											{/* Resource Details */}
											<div className="grid grid-cols-1 gap-y-2">
												<div>
													<h3 className="font-medium text-xs mb-0.5">Name</h3>
													<p className="text-xs text-muted-foreground truncate">{selectedResource.name}</p>
												</div>

												<div>
													<h3 className="font-medium text-xs mb-0.5">Type</h3>
													<p className="text-xs text-muted-foreground capitalize">{selectedResource.type}</p>
												</div>

												{selectedResource.duration && (
													<div>
														<h3 className="font-medium text-xs mb-0.5">Duration</h3>
														<p className="text-xs text-muted-foreground">
															{Math.floor(selectedResource.duration / 60)}:
															{String(Math.floor(selectedResource.duration % 60)).padStart(2, "0")}
														</p>
													</div>
												)}

												{(selectedResource.metadata.width || selectedResource.metadata.height) && (
													<div>
														<h3 className="font-medium text-xs mb-0.5">Dimensions</h3>
														<p className="text-xs text-muted-foreground">
															{selectedResource.metadata.width} × {selectedResource.metadata.height}
														</p>
													</div>
												)}

												<div>
													<h3 className="font-medium text-xs mb-0.5">File Size</h3>
													<p className="text-xs text-muted-foreground">
														{(selectedResource.fileSize / (1024 * 1024)).toFixed(2)} MB
													</p>
												</div>

												{selectedResource.metadata.fps && (
													<div>
														<h3 className="font-medium text-xs mb-0.5">FPS</h3>
														<p className="text-xs text-muted-foreground">{selectedResource.metadata.fps}</p>
													</div>
												)}

												{selectedResource.metadata.codec && (
													<div>
														<h3 className="font-medium text-xs mb-0.5">Codec</h3>
														<p className="text-xs text-muted-foreground truncate">{selectedResource.metadata.codec}</p>
													</div>
												)}

												{selectedResource.metadata.format && (
													<div>
														<h3 className="font-medium text-xs mb-0.5">Format</h3>
														<p className="text-xs text-muted-foreground">{selectedResource.metadata.format}</p>
													</div>
												)}

												{selectedResource.metadata.sampleRate && (
													<div>
														<h3 className="font-medium text-xs mb-0.5">Sample Rate</h3>
														<p className="text-xs text-muted-foreground">{selectedResource.metadata.sampleRate} Hz</p>
													</div>
												)}

												{selectedResource.metadata.channels && (
													<div>
														<h3 className="font-medium text-xs mb-0.5">Channels</h3>
														<p className="text-xs text-muted-foreground">{selectedResource.metadata.channels}</p>
													</div>
												)}

												<div>
													<h3 className="font-medium text-xs mb-0.5">Created At</h3>
													<p className="text-xs text-muted-foreground">
														{new Date(selectedResource.createdAt).toLocaleString()}
													</p>
												</div>
											</div>
										</div>
									) : (
										<div className="flex items-center justify-center h-full">
											<div className="text-center space-y-2">
												<p className="text-xs font-medium text-muted-foreground">No Resource Selected</p>
												<p className="text-xs text-muted-foreground">Select a resource to view its properties</p>
											</div>
										</div>
									)}
								</div>
							</div>
						)}
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
						<div className="border-b border-border bg-muted/30 px-4 py-2" data-edit-tools>
							<EditTools />
						</div>

						{/* Timeline */}
						<div className="flex-1 overflow-hidden">
							<Timeline />
						</div>
					</section>
				</main>
			</div>
			<ExportDialog open={isExportDialogOpen} onOpenChange={setIsExportDialogOpen} timeline={timelineData} />

			<Toaster />
		</div>
	);
}

function App() {
	return (
		<TimelineProvider>
			<AppContent />
		</TimelineProvider>
	);
}

export default App;
