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
import { startExport, getExportStatus, downloadExport } from "@/services/api";
import type { ExportSettings, ExportTask, AspectRatio, ResolutionPreset, Resolution } from "@/types/export";
import type { Timeline } from "@/types/timeline";
import { Download, FileVideo, Loader2, X } from "lucide-react";

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

	// React 19: useTransition for async state updates
	const [isPending, startTransition] = useTransition();
	const isExporting = !!exportTask && exportTask.status !== "completed" && exportTask.status !== "failed";

	// Poll export status every 2 seconds
	useEffect(() => {
		if (!exportTask || exportTask.status === "completed" || exportTask.status === "failed") {
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

				if (status.status === "completed" || status.status === "failed") {
					clearInterval(pollInterval);
					if (status.status === "failed") {
						setError(status.error || "Export failed");
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

		startTransition(async () => {
			try {
				const response = await startExport(timeline, exportSettings);
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

	const handleDownload = async () => {
		if (!exportTask?.taskId) return;

		try {
			const blob = await downloadExport(exportTask.taskId);
			const url = window.URL.createObjectURL(blob);
			setDownloadUrl(url);

			// Create download link and trigger download
			const link = document.createElement("a");
			link.href = url;
			link.download = `${settings.filename}.${settings.format.toLowerCase()}`;
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);

			// Close the dialog after download
			window.URL.revokeObjectURL(url);
			setExportTask(null);
			setError(null);
			setDownloadUrl(null);
			onOpenChange(false);
		} catch (err) {
			console.error("Error downloading export:", err);
			setError("Failed to download video");
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
			}
			onOpenChange(open);
		},
		[isExporting, exportTask, downloadUrl, onOpenChange]
	);

	const canStartExport = !isExporting && settings.filename.trim().length > 0;
	const isCompleted = exportTask?.status === "completed";
	const isFailed = exportTask?.status === "failed";

	return (
		<Dialog open={open} onOpenChange={handleClose}>
			<DialogContent className="sm:max-w-[500px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<FileVideo className="h-5 w-5" />
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

					{/* Success Message */}
					{isCompleted && (
						<div className="rounded-md bg-green-500/10 p-3 text-sm text-green-600 dark:text-green-400">
							Export completed successfully! Click download to save your video.
						</div>
					)}
				</div>

				<DialogFooter className="gap-2">
					<Button variant="outline" onClick={() => handleClose(false)} disabled={isExporting && !isFailed}>
						<X className="h-4 w-4 mr-2" />
						{isExporting && !isFailed ? "Cancel" : "Close"}
					</Button>

					{!isCompleted && !isFailed && (
						<Button onClick={handleStartExport} disabled={!canStartExport || isPending}>
							{isExporting || isPending ? (
								<>
									<Loader2 className="h-4 w-4 mr-2 animate-spin" />
									Exporting...
								</>
							) : (
								<>
									<FileVideo className="h-4 w-4 mr-2" />
									Start Export
								</>
							)}
						</Button>
					)}

					{isCompleted && (
						<Button onClick={handleDownload}>
							<Download className="h-4 w-4 mr-2" />
							Download
						</Button>
					)}
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
