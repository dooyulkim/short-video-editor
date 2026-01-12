// Export Types
export type AspectRatio = "16:9" | "9:16" | "1:1" | "4:3" | "3:4" | "4:5" | "custom";
export type ResolutionPreset = "1080p" | "720p" | "480p" | "custom";

export interface Resolution {
	width: number;
	height: number;
}

export interface ExportSettings {
	resolution: ResolutionPreset;
	customResolution: Resolution;
	aspectRatio: AspectRatio;
	format: "MP4" | "WebM";
	quality: "high" | "medium" | "low";
	filename: string;
}

export interface ExportTask {
	taskId: string;
	status: "pending" | "processing" | "completed" | "failed" | "cancelled";
	progress: number; // 0-100
	error?: string;
	outputPath?: string;
}

export interface ExportResponse {
	task_id: string;
	status: string;
	message?: string;
}

export interface ExportStatusResponse {
	task_id: string;
	status: "pending" | "processing" | "completed" | "failed" | "cancelled";
	progress: number;
	error?: string;
	output_path?: string;
}
