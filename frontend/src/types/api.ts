 
// API Response Types

// Media API Responses
export interface UploadMediaResponse {
	id: string;
	type: "video" | "audio" | "image";
	name: string;
	url: string;
	thumbnail?: string;
	duration?: number;
	metadata: {
		width?: number;
		height?: number;
		fps?: number;
		bitrate?: number;
		codec?: string;
		format?: string;
		channels?: number;
		sampleRate?: number;
	};
	fileSize: number;
	createdAt: string;
}

export interface ListMediaResponse {
	project_id?: string;
	count: number;
	media: BackendMediaResource[];
}

// Backend media resource structure (as returned by backend)
export interface BackendMediaResource {
	id: string;
	project_id: string; // Project ID this resource belongs to
	filename: string;
	file_path: string;
	file_size: number;
	media_type: "video" | "audio" | "image";
	thumbnail_path?: string | null;
	created_at: string;
	video_metadata?: {
		duration?: number;
		width?: number;
		height?: number;
		fps?: number;
		codec?: string;
		format?: string;
		bitrate?: number;
	} | null;
	audio_metadata?: {
		duration?: number;
		sample_rate?: number;
		channels?: number;
		format?: string;
	} | null;
	image_metadata?: {
		width?: number;
		height?: number;
		format?: string;
		color_mode?: string;
	} | null;
}

export interface MediaMetadataResponse {
	id: string;
	type: string;
	duration?: number;
	metadata: {
		width?: number;
		height?: number;
		fps?: number;
		bitrate?: number;
		codec?: string;
		format?: string;
		channels?: number;
		sampleRate?: number;
	};
}

export interface WaveformResponse {
	id: string;
	waveform: number[];
	duration: number;
	sampleRate: number;
}

export interface ThumbnailResponse {
	id: string;
	thumbnail: string; // Base64 or URL
}

// Timeline API Responses
export interface CutVideoResponse {
	segment1_id: string;
	segment2_id: string;
	segment1_duration: number;
	segment2_duration: number;
}

export interface TrimVideoResponse {
	id: string;
	duration: number;
	trimmed_path: string;
}

export interface MergeVideosResponse {
	id: string;
	duration: number;
	merged_path: string;
}

// Audio API Responses
export interface MixAudioResponse {
	id: string;
	duration: number;
	output_path: string;
}

// Transition API Responses
export interface ApplyTransitionResponse {
	id: string;
	transition_type: string;
	duration: number;
	output_path: string;
}

// Generic API Error
export interface ApiError {
	message: string;
	code?: string;
	details?: any;
	timestamp?: string;
}

// Upload Progress Event
export interface UploadProgressEvent {
	loaded: number;
	total: number;
	progress: number; // 0-100
}
