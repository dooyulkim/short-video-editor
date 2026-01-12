import { useState, useEffect, useCallback, useTransition, useMemo } from "react";
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { startExport, getExportStatus, downloadExport, cancelExport } from "@/services/api";
import type { ExportSettings, ExportTask, AspectRatio, ResolutionPreset, Resolution } from "@/types/export";
import type { Timeline } from "@/types/timeline";
import { FileVideo, Loader2, X, StopCircle } from "lucide-react";

interface ExportDialogProps {
	open: boolean;
	onOpenChange: (open: boolean) => void;
	timeline: Timeline;
}

// Resolution presets - defines the larger dimension
const RESOLUTION_VALUES: Record<Exclude<ResolutionPreset, "custom">, number> = {
	"1080p": 1080,
	"720p": 720,
	"480p": 480,
};

// Aspect ratio definitions
const ASPECT_RATIOS: Record<Exclude<AspectRatio, "custom">, { ratio: number; label: string }> = {
	"16:9": { ratio: 16 / 9, label: "Landscape (16:9)" },
	"9:16": { ratio: 9 / 16, label: "Portrait (9:16)" },
	"1:1": { ratio: 1, label: "Square (1:1)" },
	"4:3": { ratio: 4 / 3, label: "Standard (4:3)" },
	"3:4": { ratio: 3 / 4, label: "Portrait (3:4)" },
	"4:5": { ratio: 4 / 5, label: "Instagram (4:5)" },
};

// Calculate resolution based on preset and aspect ratio
const calculateResolution = (preset: ResolutionPreset, aspectRatio: AspectRatio): Resolution => {
	if (preset === "custom" || aspectRatio === "custom") {
		return { width: 1920, height: 1080 };
	}

	const baseSize = RESOLUTION_VALUES[preset];
	const ratio = ASPECT_RATIOS[aspectRatio].ratio;

	// For landscape ratios (ratio > 1), width is larger
	// For portrait ratios (ratio < 1), height is larger
	if (ratio >= 1) {
		// Landscape or square: height is the base, width is calculated
		const height = baseSize;
		const width = Math.round(height * ratio);
		return { width, height };
	} else {
		// Portrait: width is the base, height is calculated
		const width = baseSize;
		const height = Math.round(width / ratio);
		return { width, height };
	}
};

// Find matching aspect ratio from timeline resolution
const findMatchingAspectRatio = (width: number, height: number): AspectRatio => {
	const timelineRatio = width / height;
	const tolerance = 0.01; // Allow small floating point differences

	const ratioKeys = Object.keys(ASPECT_RATIOS) as Exclude<AspectRatio, "custom">[];

	for (const key of ratioKeys) {
		const { ratio } = ASPECT_RATIOS[key];
		if (Math.abs(timelineRatio - ratio) < tolerance) {
			return key;
		}
	}

	// No match found, return the first option
	return ratioKeys[0];
};

export function ExportDialog({ open, onOpenChange, timeline }: ExportDialogProps) {
	const [settings, setSettings] = useState<ExportSettings>({
		resolution: "1080p",
		customResolution: { width: 1920, height: 1080 },
		aspectRatio: "16:9",
		format: "MP4",
		quality: "high",
		filename: `video_export_${new Date().toISOString().slice(0, 10)}`,
	});

	const [exportTask, setExportTask] = useState<ExportTask | null>(null);
	const [error, setError] = useState<string | null>(null);
	const [downloadUrl, setDownloadUrl] = useState<string | null>(null);
	const [isCancelling, setIsCancelling] = useState(false);

	// React 19: useTransition for async state updates
	const [isPending, startTransition] = useTransition();
	const isExporting =
		!!exportTask &&
		exportTask.status !== "completed" &&
		exportTask.status !== "failed" &&
		exportTask.status !== "cancelled";

	// Set aspect ratio based on timeline resolution when dialog opens
	useEffect(() => {
		if (open && timeline?.resolution) {
			const matchedRatio = findMatchingAspectRatio(timeline.resolution.width, timeline.resolution.height);
			setSettings((prev) => ({
				...prev,
				aspectRatio: matchedRatio,
			}));
		}
	}, [open, timeline?.resolution?.width, timeline?.resolution?.height]);

	// Poll export status every 2 seconds
	useEffect(() => {
		if (
			!exportTask ||
			exportTask.status === "completed" ||
			exportTask.status === "failed" ||
			exportTask.status === "cancelled"
		) {
			return;
		}

		const pollInterval = setInterval(async () => {
			try {
				const status = await getExportStatus(exportTask.taskId);
				setExportTask({
					taskId: status.task_id,
					status: status.status,
					progress: status.progress,
					error: status.error,
					outputPath: status.output_path,
				});

				if (status.status === "completed" || status.status === "failed" || status.status === "cancelled") {
					clearInterval(pollInterval);
					if (status.status === "failed") {
						setError(status.error || "Export failed");
					} else if (status.status === "cancelled") {
						setError("Export was cancelled");
					}
				}
			} catch (err) {
				console.error("Error polling export status:", err);
				setError("Failed to check export status");
				clearInterval(pollInterval);
			}
		}, 2000);

		return () => clearInterval(pollInterval);
	}, [exportTask]);

	// Auto-download when export completes
	useEffect(() => {
		if (exportTask?.status === "completed" && exportTask?.taskId) {
			const autoDownload = async () => {
				try {
					const blob = await downloadExport(exportTask.taskId);
					const url = window.URL.createObjectURL(blob);

					// Create download link and trigger download
					const link = document.createElement("a");
					link.href = url;
					link.download = `${settings.filename}.${settings.format.toLowerCase()}`;
					document.body.appendChild(link);
					link.click();
					document.body.removeChild(link);

					// Cleanup, reset state, and close dialog
					window.URL.revokeObjectURL(url);
					setExportTask(null);
					setError(null);
					setDownloadUrl(null);
					onOpenChange(false);
				} catch (err) {
					console.error("Error auto-downloading export:", err);
					setError("Failed to download video");
				}
			};
			autoDownload();
		}
	}, [exportTask?.status, exportTask?.taskId, settings.filename, settings.format, onOpenChange]);

	// Calculate the effective resolution based on resolution preset and aspect ratio
	const effectiveResolution = useMemo((): Resolution => {
		return calculateResolution(settings.resolution, settings.aspectRatio);
	}, [settings.resolution, settings.aspectRatio]);

	// React 19: Use startTransition for non-blocking async updates
	const handleStartExport = () => {
		setError(null);
		setExportTask(null);
		setDownloadUrl(null);

		// Create export settings with effective resolution
		const exportSettings: ExportSettings = {
			...settings,
			customResolution: effectiveResolution,
		};

		// Create a copy of the timeline with export resolution
		// Include both the original canvas size (for scaling calculations) and export resolution
		const timelineForExport = {
			...timeline,
			// Store original canvas size for position/scale calculations
			sourceResolution: {
				width: timeline.resolution.width,
				height: timeline.resolution.height,
			},
			// Set the target export resolution
			resolution: {
				width: effectiveResolution.width,
				height: effectiveResolution.height,
			},
		};

		startTransition(async () => {
			try {
				const response = await startExport(timelineForExport, exportSettings);
				setExportTask({
					taskId: response.task_id,
					status: "pending",
					progress: 0,
				});
			} catch (err) {
				console.error("Error starting export:", err);
				const error = err as { response?: { data?: { detail?: string } } };
				setError(error.response?.data?.detail || "Failed to start export");
			}
		});
	};

	const handleCancelExport = async () => {
		if (!exportTask?.taskId || !isExporting) return;

		setIsCancelling(true);
		try {
			await cancelExport(exportTask.taskId);
			setExportTask((prev) => (prev ? { ...prev, status: "cancelled" } : null));
			setError("Export was cancelled");
		} catch (err) {
			console.error("Error cancelling export:", err);
			setError("Failed to cancel export");
		} finally {
			setIsCancelling(false);
		}
	};

	const handleClose = useCallback(
		(open: boolean) => {
			if (!open) {
				if (isExporting && exportTask?.status === "processing") {
					if (!confirm("Export is in progress. Are you sure you want to close?")) {
						return;
					}
				}

				// Cleanup
				if (downloadUrl) {
					window.URL.revokeObjectURL(downloadUrl);
				}

				setExportTask(null);
				setError(null);
				setDownloadUrl(null);
				setIsCancelling(false);
			}
			onOpenChange(open);
		},
		[isExporting, exportTask, downloadUrl, onOpenChange]
	);

	const canStartExport = !isExporting && settings.filename.trim().length > 0;

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileVideo className="size-5" />
						Export Video
					</DialogTitle>
					<DialogDescription>Configure export settings for your video project</DialogDescription>
				</DialogHeader>

				<div className="space-y-6 py-4">
					{/* Filename Input */}
					<div className="space-y-2">
						<Label htmlFor="filename">Filename</Label>
						<Input
							id="filename"
							value={settings.filename}
							onChange={(e) => setSettings({ ...settings, filename: e.target.value })}
							placeholder="Enter filename"
							disabled={isExporting}
						/>
					</div>

					{/* Resolution Select */}
					<div className="space-y-2">
						<Label htmlFor="resolution">Resolution</Label>
						<Select
							value={settings.resolution}
							onValueChange={(value: ResolutionPreset) => setSettings((prev) => ({ ...prev, resolution: value }))}
							disabled={isExporting}>
							<SelectTrigger id="resolution">
								<SelectValue placeholder="Select resolution" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="1080p">1080p (Full HD)</SelectItem>
								<SelectItem value="720p">720p (HD)</SelectItem>
								<SelectItem value="480p">480p (SD)</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Aspect Ratio Select */}
					<div className="space-y-2">
						<Label htmlFor="aspectRatio">Aspect Ratio</Label>
						<Select
							value={settings.aspectRatio}
							onValueChange={(value: AspectRatio) => setSettings((prev) => ({ ...prev, aspectRatio: value }))}
							disabled={isExporting}>
							<SelectTrigger id="aspectRatio">
								<SelectValue placeholder="Select aspect ratio" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="16:9">16:9 - Landscape (YouTube, TV)</SelectItem>
								<SelectItem value="9:16">9:16 - Portrait (TikTok, Reels)</SelectItem>
								<SelectItem value="1:1">1:1 - Square (Instagram)</SelectItem>
								<SelectItem value="4:3">4:3 - Standard</SelectItem>
								<SelectItem value="3:4">3:4 - Portrait Standard</SelectItem>
								<SelectItem value="4:5">4:5 - Instagram Portrait</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Final Resolution Display */}
					<div className="rounded-md bg-muted p-2 text-center text-sm">
						Export Resolution:{" "}
						<span className="font-medium">
							{effectiveResolution.width} × {effectiveResolution.height}
						</span>
					</div>

					{/* Format Select */}
					<div className="space-y-2">
						<Label htmlFor="format">Format</Label>
						<Select
							value={settings.format}
							onValueChange={(value: "MP4" | "WebM") => setSettings({ ...settings, format: value })}
							disabled={isExporting}>
							<SelectTrigger id="format">
								<SelectValue placeholder="Select format" />
							</SelectTrigger>
							<SelectContent>
								<SelectItem value="MP4">MP4</SelectItem>
								<SelectItem value="WebM">WebM</SelectItem>
							</SelectContent>
						</Select>
					</div>

					{/* Quality Radio Group */}
					<div className="space-y-3">
						<Label>Quality</Label>
						<RadioGroup
							value={settings.quality}
							onValueChange={(value: "high" | "medium" | "low") => setSettings({ ...settings, quality: value })}
							disabled={isExporting}>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="high" id="high" />
								<Label htmlFor="high" className="font-normal cursor-pointer">
									High (Best quality, larger file)
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="medium" id="medium" />
								<Label htmlFor="medium" className="font-normal cursor-pointer">
									Medium (Balanced)
								</Label>
							</div>
							<div className="flex items-center space-x-2">
								<RadioGroupItem value="low" id="low" />
								<Label htmlFor="low" className="font-normal cursor-pointer">
									Low (Smaller file, faster export)
								</Label>
							</div>
						</RadioGroup>
					</div>

					{/* Progress Section */}
					{exportTask && (
						<div className="space-y-3">
							<div className="flex items-center justify-between">
								<Label>Export Progress</Label>
								<span className="text-sm text-muted-foreground">{exportTask.progress}%</span>
							</div>
							<Progress value={exportTask.progress} className="h-2" />
							<p className="text-sm text-muted-foreground capitalize">Status: {exportTask.status}</p>
						</div>
					)}

					{/* Error Message */}
					{error && <div className="rounded-md bg-destructive/10 p-3 text-sm text-destructive">{error}</div>}
				</div>

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={() => handleClose(false)} disabled={isExporting || isCancelling}>
						<X className="size-4 mr-2" />
						Close
					</Button>

					{/* Cancel Export button - shown when exporting */}
					{isExporting && (
						<Button variant="destructive" onClick={handleCancelExport} disabled={isCancelling}>
							{isCancelling ? (
								<>
									<Loader2 className="size-4 mr-2 animate-spin" />
									Cancelling...
								</>
							) : (
								<>
									<StopCircle className="size-4 mr-2" />
									Cancel Export
								</>
							)}
						</Button>
					)}

					{/* Start Export button - shown when not exporting */}
					{!isExporting && (
						<Button onClick={handleStartExport} disabled={!canStartExport || isPending}>
							{isPending ? (
								<>
									<Loader2 className="size-4 mr-2 animate-spin" />
									Starting...
								</>
							) : (
								<>
									<FileVideo className="size-4 mr-2" />
									Start Export
								</>
							)}
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
