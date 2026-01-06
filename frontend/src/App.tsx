import { useState, useEffect } from "react";
import "./App.css";
import { TopToolbar } from "./components/Toolbar/TopToolbar";
import { ResourcePanel } from "./components/ResourcePanel";
import { VideoPlayer } from "./components/Player/VideoPlayer";
import { Timeline } from "./components/Timeline/Timeline";
import { TransitionPanel } from "./components/TransitionPanel";
import { EditTools } from "./components/Toolbar/EditTools";
import { TimelineProvider, useTimeline } from "./context/TimelineContext";
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
import { cn } from "./lib/utils";

function AppContent() {
	const [activeTab, setActiveTab] = useState("media");
	const [, setResources] = useState<MediaResource[]>([]);
	const [selectedResource, setSelectedResource] = useState<MediaResource | null>(null);
	const timeline = useTimeline();
	const isPlaying = timeline?.state.isPlaying || false;
	const [leftSidebarWidth, setLeftSidebarWidth] = useState(280);
	const [rightSidebarWidth, setRightSidebarWidth] = useState(280);
	const [timelineHeight, setTimelineHeight] = useState(350);
	const [isLeftSidebarOpen, setIsLeftSidebarOpen] = useState(true);
	const [isRightSidebarOpen, setIsRightSidebarOpen] = useState(false);
	const [isPropertiesPanelOpen, setIsPropertiesPanelOpen] = useState(true);
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

	const handleResourceSelect = (resource: MediaResource) => {
		setSelectedResource(resource);
		setIsRightSidebarOpen(true);
	};

	return (
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
							"relative shrink-0 flex flex-col bg-card border-r border-border overflow-hidden transition-all",
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
							{activeTab === "media" && (
								<ResourcePanel
									onResourcesChange={setResources}
									onResourceSelect={handleResourceSelect}
									selectedResource={selectedResource}
									onSelectedResourceClear={() => setSelectedResource(null)}
								/>
							)}
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

						{/* Resize Handle - Only show for media/resources tab */}
						{!isMobile && activeTab === "media" && (
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

				{/* Center Area - Preview, Properties and Timeline */}
				<main className="flex-1 flex flex-col overflow-hidden bg-background">
					{/* Top Section - Preview and Properties side by side */}
					<div className="flex-1 flex overflow-hidden">
						{/* Preview Section - Left */}
						<div className="flex-1 flex flex-col overflow-hidden bg-gradient-to-b from-zinc-950 to-zinc-900 border-r border-border">
							<div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
								<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Preview</h2>{" "}
								{!isPropertiesPanelOpen && (
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6"
										onClick={() => setIsPropertiesPanelOpen(true)}
										title="Show Properties">
										<ChevronLeft className="h-3 w-3" />
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
											className="h-12 w-12 rounded-full shadow-lg hover:scale-110 transition-transform"
											title="Restart preview">
											<RotateCcw className="h-5 w-5" />
										</Button>
										{!isPlaying ? (
											<Button
												variant="secondary"
												size="icon"
												onClick={() => timeline?.play()}
												className="h-12 w-12 rounded-full shadow-lg hover:scale-110 transition-transform"
												title="Play preview">
												<Play className="h-5 w-5" />
											</Button>
										) : (
											<Button
												variant="secondary"
												size="icon"
												onClick={() => timeline?.pause()}
												className="h-12 w-12 rounded-full shadow-lg hover:scale-110 transition-transform"
												title="Pause preview">
												<Pause className="h-5 w-5" />
											</Button>
										)}
									</div>
								</div>
							</div>
						</div>

						{/* Properties Section - Right */}
						{isPropertiesPanelOpen && (
							<div className="w-80 flex flex-col overflow-hidden bg-card border-l border-border">
								<div className="flex items-center justify-between px-4 py-2 border-b border-border bg-muted/30">
									<h2 className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Properties</h2>
									<Button
										variant="ghost"
										size="icon"
										className="h-6 w-6"
										onClick={() => setIsPropertiesPanelOpen(false)}
										title="Hide Properties">
										<PanelRightClose className="h-3 w-3" />
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
														<Music className="w-12 h-12 text-primary" />
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
						<div className="border-b border-border bg-muted/30 px-4 py-2">
							<EditTools />
						</div>

						{/* Timeline */}
						<div className="flex-1 overflow-hidden">
							<Timeline />
						</div>
					</section>
				</main>
			</div>
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
