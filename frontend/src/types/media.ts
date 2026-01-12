// Media Types
export interface MediaResource {
	id: string;
	projectId: string; // Project ID this resource belongs to
	type: "video" | "audio" | "image";
	name: string;
	url: string;
	thumbnail?: string;
	duration?: number; // in seconds, for video and audio
	metadata: MediaMetadata;
	createdAt: Date;
	fileSize: number; // in bytes
}

export interface MediaMetadata {
	width?: number;
	height?: number;
	fps?: number;
	bitrate?: number;
	codec?: string;
	format?: string;
	channels?: number; // for audio
	sampleRate?: number; // for audio
}

export interface MediaLibrary {
	resources: MediaResource[];
}

export interface UploadProgress {
	resourceId: string;
	progress: number; // 0-100
	status: "pending" | "uploading" | "processing" | "complete" | "error";
	error?: string;
}
