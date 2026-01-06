/**
 * API Integration Usage Examples
 *
 * This file demonstrates how to use the API service in React components
 */

import React, { useState } from "react";
import { useApi, useProgress } from "@/hooks/useApi";
import type { UploadMediaResponse } from "@/types/api";
import {
	uploadMedia,
	getMediaMetadata,
	cutVideo,
	startExport,
	getExportStatus,
	downloadExport,
	downloadBlob,
} from "@/services/api";
import { useTimeline } from "@/context/TimelineContext";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";

// ============================================
// Example 1: Media Upload with Progress
// ============================================
export function MediaUploadExample() {
	const { execute, loading, error } = useApi();
	const { progress, updateProgress, resetProgress } = useProgress();

	const handleFileSelect = async (event: React.ChangeEvent<HTMLInputElement>) => {
		const file = event.target.files?.[0];
		if (!file) return;

		resetProgress();

		const result = await execute(() =>
			uploadMedia(file, (progressEvent) => {
				updateProgress(progressEvent.progress);
			})
		);

		if (result) {
			console.log("Upload successful:", result);
			console.log("Uploaded media:", result);
		} else if (error) {
			console.error("Upload failed:", error.message);
		}
	};

	return (
		<div className="space-y-4">
			<input type="file" accept="video/*,audio/*,image/*" onChange={handleFileSelect} disabled={loading} />
			{loading && (
				<div className="space-y-2">
					<Progress value={progress} />
					<p className="text-sm text-muted-foreground">{progress}% uploaded</p>
				</div>
			)}
			{error && <p className="text-sm text-destructive">Error: {error.message}</p>}
		</div>
	);
}

// ============================================
// Example 2: Get Media Metadata
// ============================================
export function MediaMetadataExample({ mediaId }: { mediaId: string }) {
	const { data, loading, error, execute } = useApi();

	const fetchMetadata = async () => {
		await execute(() => getMediaMetadata(mediaId));
	};

	return (
		<div className="space-y-4">
			<Button onClick={fetchMetadata} disabled={loading}>
				{loading ? "Loading..." : "Get Metadata"}
			</Button>

			{data && (
				<div className="space-y-2">
					<h3 className="font-semibold">Metadata:</h3>
					<pre className="bg-muted p-4 rounded-md text-sm overflow-auto">{JSON.stringify(data, null, 2)}</pre>
				</div>
			)}

			{error && <p className="text-sm text-destructive">Error: {error.message}</p>}
		</div>
	);
}

// ============================================
// Example 3: Cut Video
// ============================================
export function CutVideoExample({ videoId }: { videoId: string }) {
	const { execute, loading, error } = useApi();
	const [cutTime, setCutTime] = useState(30);

	const handleCutVideo = async () => {
		const result = await execute(() => cutVideo(videoId, cutTime));

		if (result) {
			console.log("Video cut successfully:", result);
			console.log(`Created two segments: ${result.segment1_id}, ${result.segment2_id}`);
		} else if (error) {
			console.error("Cut failed:", error.message);
		}
	};

	return (
		<div className="space-y-4">
			<div className="flex items-center gap-4">
				<label>Cut at (seconds):</label>
				<input
					type="number"
					value={cutTime}
					onChange={(e) => setCutTime(Number(e.target.value))}
					className="border rounded px-2 py-1"
				/>
			</div>

			<Button onClick={handleCutVideo} disabled={loading}>
				{loading ? "Cutting..." : "Cut Video"}
			</Button>
		</div>
	);
}

// ============================================
// Example 4: Export Timeline with Progress Polling
// ============================================
export function ExportTimelineExample() {
	const { state } = useTimeline();
	const { execute, loading, error } = useApi();
	const { progress, updateProgress, resetProgress } = useProgress();
	const [exportStatus, setExportStatus] = useState<string>("idle");

	const handleExport = async () => {
		resetProgress();
		setExportStatus("starting");

		// Start export
		const exportResponse = await execute(() =>
			startExport(
				{
					id: "temp-timeline-id",
					name: "Export Timeline",
					layers: state.layers,
					duration: state.duration,
					fps: 30,
					resolution: { width: 1920, height: 1080 },
				},
				{
					resolution: "1080p",
					format: "MP4",
					quality: "high",
					filename: "exported-video.mp4",
				}
			)
		);

		if (!exportResponse) {
			setExportStatus("error");
			console.error("Export failed:", error?.message || "Failed to start export");
			return;
		}

		const taskId = exportResponse.task_id;
		setExportStatus("processing");

		// Poll for status
		const pollInterval = setInterval(async () => {
			try {
				const status = await getExportStatus(taskId);
				updateProgress(status.progress);

				if (status.status === "completed") {
					clearInterval(pollInterval);
					setExportStatus("downloading");

					// Download the file
					const blob = await downloadExport(taskId);
					downloadBlob(blob, "exported-video.mp4");

					setExportStatus("completed");
					console.log("Export completed - video downloaded");
				} else if (status.status === "failed") {
					clearInterval(pollInterval);
					setExportStatus("error");
					console.error("Export failed:", status.error || "Export processing failed");
				}
			} catch (err) {
				clearInterval(pollInterval);
				setExportStatus("error");
				console.error("Error polling export status:", err);
			}
		}, 2000); // Poll every 2 seconds
	};

	return (
		<div className="space-y-4">
			<Button onClick={handleExport} disabled={loading || exportStatus !== "idle"}>
				Export Video
			</Button>

			{exportStatus !== "idle" && (
				<div className="space-y-2">
					<div className="flex justify-between text-sm">
						<span>Status: {exportStatus}</span>
						<span>{progress}%</span>
					</div>
					<Progress value={progress} />
				</div>
			)}
		</div>
	);
}

// ============================================
// Example 5: Complete Upload Flow with Resource Panel
// ============================================
export function CompleteUploadFlow() {
	const { execute, loading } = useApi();
	const { progress, updateProgress, resetProgress } = useProgress();
	const [resources, setResources] = useState<UploadMediaResponse[]>([]);

	const handleUpload = async (file: File) => {
		resetProgress();

		const result = await execute(() =>
			uploadMedia(file, (progressEvent) => {
				updateProgress(progressEvent.progress);
			})
		);

		if (result) {
			// Add to resources
			setResources((prev) => [...prev, result]);

			// Fetch additional metadata if needed
			const metadata = await getMediaMetadata(result.id);
			console.log("Additional metadata:", metadata);
			console.log("Media added:", result.name);
		}
	};

	return (
		<div className="space-y-4">
			<div className="border-2 border-dashed rounded-lg p-8 text-center">
				<input
					type="file"
					accept="video/*,audio/*,image/*"
					onChange={(e) => e.target.files?.[0] && handleUpload(e.target.files[0])}
					disabled={loading}
					className="hidden"
					id="file-upload"
				/>
				<label htmlFor="file-upload" className="cursor-pointer">
					<div className="text-muted-foreground">{loading ? "Uploading..." : "Click or drag files to upload"}</div>
				</label>

				{loading && (
					<div className="mt-4">
						<Progress value={progress} />
						<p className="text-sm text-muted-foreground mt-2">{progress}%</p>
					</div>
				)}
			</div>

			{/* Resources Grid */}
			<div className="grid grid-cols-4 gap-4">
				{resources.map((resource) => (
					<div key={resource.id} className="border rounded-lg p-4">
						{resource.thumbnail && (
							<img src={resource.thumbnail} alt={resource.name} className="w-full h-24 object-cover rounded" />
						)}
						<p className="text-sm mt-2 truncate">{resource.name}</p>
						<p className="text-xs text-muted-foreground">{resource.duration?.toFixed(2)}s</p>
					</div>
				))}
			</div>
		</div>
	);
}

// ============================================
// Example 6: Error Handling Best Practices
// ============================================
export function ErrorHandlingExample() {
	const { execute, loading, error } = useApi();

	const performAction = async () => {
		const result = await execute(() => getMediaMetadata("non-existent-id"));

		if (result) {
			// Success case
			console.log("Success:", result);
		} else if (error) {
			// Error case - log error message
			console.error("Error:", error.message);

			// Log detailed error for debugging
			console.error("API Error:", {
				message: error.message,
				code: error.code,
				details: error.details,
				timestamp: error.timestamp,
			});
		}
	};

	return (
		<div>
			<Button onClick={performAction} disabled={loading}>
				Test Error Handling
			</Button>
		</div>
	);
}
