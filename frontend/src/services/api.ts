import axios, { AxiosError, type AxiosRequestConfig, type AxiosResponse } from "axios";
import type { ExportSettings, ExportResponse, ExportStatusResponse } from "@/types/export";
import type { Timeline } from "@/types/timeline";
import type { MediaResource } from "@/types/media";
import type {
	MediaMetadataResponse,
	WaveformResponse,
	CutVideoResponse,
	TrimVideoResponse,
	MergeVideosResponse,
	ApiError,
	UploadProgressEvent,
	ListMediaResponse,
	BackendMediaResource,
} from "@/types/api";

// API Configuration
const API_BASE_URL = "/api";
const API_TIMEOUT = 30000; // 30 seconds default timeout

// Create axios instance with default config
const api = axios.create({
	baseURL: API_BASE_URL,
	timeout: API_TIMEOUT,
	headers: {
		"Content-Type": "application/json",
	},
});

// Request Interceptor - Add auth tokens, logging, etc.
api.interceptors.request.use(
	(config) => {
		// Add timestamp for request tracking
		config.metadata = { startTime: new Date().getTime() };

		// Add auth token if available
		const token = localStorage.getItem("auth_token");
		if (token) {
			config.headers.Authorization = `Bearer ${token}`;
		}

		// Log request in development
		if (import.meta.env.DEV) {
			console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, config.data);
		}

		return config;
	},
	(error) => {
		console.error("[API Request Error]", error);
		return Promise.reject(error);
	}
);

// Response Interceptor - Handle errors, logging, etc.
api.interceptors.response.use(
	(response: AxiosResponse) => {
		// Calculate request duration
		const duration = new Date().getTime() - (response.config.metadata?.startTime || 0);

		// Log response in development
		if (import.meta.env.DEV) {
			console.log(
				`[API Response] ${response.config.method?.toUpperCase()} ${response.config.url} (${duration}ms)`,
				response.data
			);
		}

		return response;
	},
	(error: AxiosError<ApiError>) => {
		// Format error message
		const apiError: ApiError = {
			message: error.response?.data?.message || error.message || "An unexpected error occurred",
			code: error.code,
			details: error.response?.data?.details,
			timestamp: new Date().toISOString(),
		};

		// Log error
		console.error("[API Error]", {
			url: error.config?.url,
			method: error.config?.method,
			status: error.response?.status,
			error: apiError,
		});

		// Handle specific error codes
		if (error.response?.status === 401) {
			// Unauthorized - clear auth and redirect to login
			localStorage.removeItem("auth_token");
			// You can dispatch a global auth action here
		} else if (error.response?.status === 403) {
			// Forbidden
			apiError.message = "You do not have permission to perform this action";
		} else if (error.response?.status === 404) {
			// Not found
			apiError.message = "The requested resource was not found";
		} else if (error.response?.status === 500) {
			// Server error
			apiError.message = "An internal server error occurred. Please try again later.";
		} else if (error.code === "ECONNABORTED") {
			// Timeout
			apiError.message = "The request timed out. Please try again.";
		} else if (!error.response) {
			// Network error
			apiError.message = "Unable to connect to the server. Please check your internet connection.";
		}

		return Promise.reject(apiError);
	}
);

// ===========================
// MEDIA API METHODS
// ===========================

/**
 * Transform backend media resource to frontend format
 */
const transformMediaResource = (backend: BackendMediaResource): MediaResource => {
	const baseUrl = API_BASE_URL;

	// Flatten metadata from nested structure
	const metadata: MediaResource["metadata"] = {};

	if (backend.video_metadata) {
		metadata.width = backend.video_metadata.width;
		metadata.height = backend.video_metadata.height;
		metadata.fps = backend.video_metadata.fps;
		metadata.codec = backend.video_metadata.codec;
		metadata.format = backend.video_metadata.format;
		metadata.bitrate = backend.video_metadata.bitrate;
	} else if (backend.audio_metadata) {
		metadata.sampleRate = backend.audio_metadata.sample_rate;
		metadata.channels = backend.audio_metadata.channels;
		metadata.format = backend.audio_metadata.format;
	} else if (backend.image_metadata) {
		metadata.width = backend.image_metadata.width;
		metadata.height = backend.image_metadata.height;
		metadata.format = backend.image_metadata.format;
	}

	// Extract duration from metadata
	const duration = backend.video_metadata?.duration || backend.audio_metadata?.duration;

	return {
		id: backend.id,
		type: backend.media_type,
		name: backend.filename,
		url: `${baseUrl}/media/${backend.id}/file`,
		thumbnail: backend.thumbnail_path ? `${baseUrl}/media/${backend.id}/thumbnail` : undefined,
		duration,
		metadata,
		createdAt: new Date(backend.created_at),
		fileSize: backend.file_size,
	};
};

/**
 * Upload media file (video, audio, or image)
 * @param file - The file to upload
 * @param onProgress - Optional callback for upload progress
 */
export const uploadMedia = async (
	file: File,
	onProgress?: (progress: UploadProgressEvent) => void
): Promise<{ media: MediaResource }> => {
	const formData = new FormData();
	formData.append("file", file);

	const config: AxiosRequestConfig = {
		headers: {
			"Content-Type": "multipart/form-data",
		},
		timeout: 300000, // 5 minutes for large files
	};

	// Add progress tracking if callback provided
	if (onProgress) {
		config.onUploadProgress = (progressEvent) => {
			if (progressEvent.total) {
				const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
				onProgress({
					loaded: progressEvent.loaded,
					total: progressEvent.total,
					progress,
				});
			}
		};
	}

	const response = await api.post<BackendMediaResource>("/media/upload", formData, config);
	return { media: transformMediaResource(response.data) };
};

/**
 * List all uploaded media resources
 */
export const listMedia = async (): Promise<MediaResource[]> => {
	const response = await api.get<ListMediaResponse>("/media/");
	return response.data.media.map(transformMediaResource);
};

/**
 * Get metadata for a media resource
 * @param id - The media resource ID
 */
export const getMediaMetadata = async (id: string): Promise<MediaMetadataResponse> => {
	const response = await api.get<MediaMetadataResponse>(`/media/${id}/metadata`);
	return response.data;
};

/**
 * Get waveform data for audio/video
 * @param id - The media resource ID
 * @param width - Optional width for waveform sampling (default: 1000)
 */
export const getWaveform = async (id: string, width: number = 1000): Promise<WaveformResponse> => {
	const response = await api.get<WaveformResponse>(`/media/${id}/waveform`, {
		params: { width },
	});
	return response.data;
};

/**
 * Get thumbnail for video
 * @param id - The media resource ID
 * @param timestamp - Optional timestamp for thumbnail (default: 0)
 */
export const getThumbnail = async (id: string, timestamp: number = 0): Promise<Blob> => {
	const response = await api.get(`/media/${id}/thumbnail`, {
		params: { timestamp },
		responseType: "blob",
	});
	return response.data;
};

/**
 * Delete media resource and all related artifacts (split/trimmed videos)
 * @param id - The media resource ID
 * @returns Object containing message and array of all deleted IDs
 */
export const deleteMedia = async (
	id: string
): Promise<{ message: string; media_id: string; deleted_ids: string[] }> => {
	const response = await api.delete<{ message: string; media_id: string; deleted_ids: string[] }>(`/media/${id}`);
	return response.data;
};

// ===========================
// TIMELINE/VIDEO EDITING API METHODS
// ===========================

/**
 * Cut video at a specific timestamp
 * @param id - The video ID
 * @param cutTime - Time in seconds to cut the video
 */
export const cutVideo = async (id: string, cutTime: number): Promise<CutVideoResponse> => {
	const response = await api.post<CutVideoResponse>("/timeline/cut", {
		video_id: id,
		cut_time: cutTime,
	});
	return response.data;
};

/**
 * Trim video to a specific time range
 * @param id - The video ID
 * @param startTime - Start time in seconds
 * @param endTime - End time in seconds
 */
export const trimVideo = async (id: string, startTime: number, endTime: number): Promise<TrimVideoResponse> => {
	const response = await api.post<TrimVideoResponse>("/timeline/trim", {
		video_id: id,
		start_time: startTime,
		end_time: endTime,
	});
	return response.data;
};

/**
 * Merge multiple video clips
 * @param clipIds - Array of clip IDs to merge
 * @param startTimes - Array of start times for each clip
 */
export const mergeVideos = async (clipIds: string[], startTimes: number[]): Promise<MergeVideosResponse> => {
	const response = await api.post<MergeVideosResponse>("/timeline/merge", {
		clip_ids: clipIds,
		start_times: startTimes,
	});
	return response.data;
};

// ===========================
// EXPORT API METHODS
// ===========================

/**
 * Start video export with timeline data
 * @param timelineData - The complete timeline data
 * @param settings - Export settings (resolution, format, quality, filename)
 */
export const startExport = async (timelineData: Timeline, settings: ExportSettings): Promise<ExportResponse> => {
	const response = await api.post<ExportResponse>("/export/start", {
		timeline: timelineData,
		settings: {
			resolution: settings.resolution,
			width: settings.customResolution.width,
			height: settings.customResolution.height,
			format: settings.format.toLowerCase(),
			quality: settings.quality,
			filename: settings.filename,
		},
	});
	return response.data;
};

/**
 * Get export task status
 * @param taskId - The export task ID
 */
export const getExportStatus = async (taskId: string): Promise<ExportStatusResponse> => {
	const response = await api.get<ExportStatusResponse>(`/export/status/${taskId}`);
	return response.data;
};

/**
 * Download exported video
 * @param taskId - The export task ID
 */
export const downloadExport = async (taskId: string): Promise<Blob> => {
	const response = await api.get(`/export/download/${taskId}`, {
		responseType: "blob",
		timeout: 600000, // 10 minutes for large downloads
	});
	return response.data;
};

/**
 * Cancel an ongoing export task
 * @param taskId - The export task ID
 */
export const cancelExport = async (taskId: string): Promise<{ message: string; task_id: string }> => {
	const response = await api.delete<{ message: string; task_id: string }>(`/export/cancel/${taskId}`);
	return response.data;
};

// ===========================
// AUDIO API METHODS
// ===========================

/**
 * Extract audio from video
 * @param videoId - The video ID
 */
export const extractAudio = async (videoId: string): Promise<{ id: string; audio_path: string }> => {
	const response = await api.post(`/audio/extract/${videoId}`);
	return response.data;
};

/**
 * Mix multiple audio tracks
 * @param tracks - Array of audio track data with IDs, start times, and volumes
 */
export const mixAudio = async (
	tracks: Array<{ id: string; startTime: number; volume: number }>
): Promise<{ id: string; output_path: string }> => {
	const response = await api.post("/audio/mix", { tracks });
	return response.data;
};

// ===========================
// TRANSITION API METHODS
// ===========================

/**
 * Apply transition effect between clips
 * @param clip1Id - First clip ID
 * @param clip2Id - Second clip ID
 * @param transitionType - Type of transition (fade, dissolve, wipe, slide)
 * @param duration - Duration of transition in seconds
 */
export const applyTransition = async (
	clip1Id: string,
	clip2Id: string,
	transitionType: "fade" | "dissolve" | "wipe" | "slide",
	duration: number
): Promise<{ id: string; output_path: string }> => {
	const response = await api.post("/transitions/apply", {
		clip1_id: clip1Id,
		clip2_id: clip2Id,
		transition_type: transitionType,
		duration,
	});
	return response.data;
};

// ===========================
// UTILITY METHODS
// ===========================

/**
 * Check API health status
 */
export const healthCheck = async (): Promise<{ status: string; version: string }> => {
	const response = await api.get("/health");
	return response.data;
};

/**
 * Download file from URL
 * @param url - The file URL
 * @param filename - The filename to save as
 */
export const downloadFile = (url: string, filename: string): void => {
	const link = document.createElement("a");
	link.href = url;
	link.download = filename;
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
};

/**
 * Download blob as file
 * @param blob - The blob data
 * @param filename - The filename to save as
 */
export const downloadBlob = (blob: Blob, filename: string): void => {
	const url = URL.createObjectURL(blob);
	downloadFile(url, filename);
	URL.revokeObjectURL(url);
};

// Export axios instance for custom requests
export default api;
