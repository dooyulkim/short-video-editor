# API Integration Documentation

This document describes the frontend-backend API integration for the Video Editor application.

## Overview

The API service layer provides a centralized interface for all HTTP communications between the React frontend and the FastAPI backend. It uses axios for HTTP requests with comprehensive error handling, request/response interceptors, and TypeScript type safety.

## Architecture

```
Frontend (React + TypeScript)
    ↓
API Service Layer (src/services/api.ts)
    ↓
Axios Instance (with interceptors)
    ↓
Backend API (FastAPI)
```

## Configuration

### Environment Variables

Create a `.env.local` file in the frontend root directory:

```env
VITE_API_URL=http://localhost:8000
VITE_ENV=development
```

Available environment files:

- `.env.development` - Development settings (auto-loaded in dev mode)
- `.env.production` - Production settings (auto-loaded in build)
- `.env.local` - Local overrides (gitignored, highest priority)
- `.env.example` - Template file for reference

### Axios Configuration

The API service creates a configured axios instance with:

- Base URL from environment variable
- 30-second default timeout
- JSON content-type headers
- Request/response interceptors
- Error handling

## API Methods

### Media API

#### `uploadMedia(file: File, onProgress?: callback)`

Upload a media file (video, audio, or image).

**Parameters:**

- `file` - The file to upload
- `onProgress` - Optional callback for upload progress tracking

**Returns:** `Promise<UploadMediaResponse>`

**Example:**

```typescript
import { uploadMedia } from "@/services/api";

const handleUpload = async (file: File) => {
	try {
		const result = await uploadMedia(file, (progress) => {
			console.log(`Upload progress: ${progress.progress}%`);
		});
		console.log("Media uploaded:", result);
	} catch (error) {
		console.error("Upload failed:", error);
	}
};
```

#### `getMediaMetadata(id: string)`

Get metadata for a media resource.

**Returns:** `Promise<MediaMetadataResponse>`

#### `getWaveform(id: string, width?: number)`

Get waveform data for audio/video visualization.

**Parameters:**

- `id` - Media resource ID
- `width` - Optional width for waveform sampling (default: 1000)

**Returns:** `Promise<WaveformResponse>`

#### `getThumbnail(id: string, timestamp?: number)`

Get thumbnail image for video.

**Parameters:**

- `id` - Media resource ID
- `timestamp` - Optional timestamp in seconds (default: 0)

**Returns:** `Promise<Blob>`

#### `deleteMedia(id: string)`

Delete a media resource.

**Returns:** `Promise<void>`

---

### Timeline/Video Editing API

#### `cutVideo(id: string, cutTime: number)`

Cut a video at a specific timestamp into two segments.

**Parameters:**

- `id` - Video ID
- `cutTime` - Time in seconds to cut the video

**Returns:** `Promise<CutVideoResponse>`

**Example:**

```typescript
import { cutVideo } from "@/services/api";

const result = await cutVideo("video-123", 30.5);
console.log("Segments:", result.segment1_id, result.segment2_id);
```

#### `trimVideo(id: string, startTime: number, endTime: number)`

Trim video to a specific time range.

**Returns:** `Promise<TrimVideoResponse>`

#### `mergeVideos(clipIds: string[], startTimes: number[])`

Merge multiple video clips into one.

**Returns:** `Promise<MergeVideosResponse>`

---

### Export API

#### `startExport(timelineData: Timeline, settings: ExportSettings)`

Start exporting the timeline to a video file.

**Parameters:**

- `timelineData` - Complete timeline data with all clips and layers
- `settings` - Export settings (resolution, format, quality, filename)

**Returns:** `Promise<ExportResponse>`

**Example:**

```typescript
import { startExport, getExportStatus, downloadExport, downloadBlob } from "@/services/api";

// Start export
const exportResponse = await startExport(timeline, {
	resolution: "1080p",
	format: "MP4",
	quality: "high",
	filename: "my-video.mp4",
});

const taskId = exportResponse.task_id;

// Poll for status
const checkStatus = setInterval(async () => {
	const status = await getExportStatus(taskId);
	console.log(`Progress: ${status.progress}%`);

	if (status.status === "completed") {
		clearInterval(checkStatus);

		// Download the file
		const blob = await downloadExport(taskId);
		downloadBlob(blob, "my-video.mp4");
	} else if (status.status === "failed") {
		clearInterval(checkStatus);
		console.error("Export failed:", status.error);
	}
}, 2000);
```

#### `getExportStatus(taskId: string)`

Get the status of an export task.

**Returns:** `Promise<ExportStatusResponse>`

#### `downloadExport(taskId: string)`

Download the exported video file.

**Returns:** `Promise<Blob>`

#### `cancelExport(taskId: string)`

Cancel an ongoing export task.

**Returns:** `Promise<void>`

---

### Audio API

#### `extractAudio(videoId: string)`

Extract audio track from a video.

**Returns:** `Promise<{ id: string; audio_path: string }>`

#### `mixAudio(tracks: Array<{id, startTime, volume}>)`

Mix multiple audio tracks into one.

**Returns:** `Promise<{ id: string; output_path: string }>`

---

### Transition API

#### `applyTransition(clip1Id, clip2Id, transitionType, duration)`

Apply a transition effect between two clips.

**Parameters:**

- `clip1Id` - First clip ID
- `clip2Id` - Second clip ID
- `transitionType` - 'fade' | 'dissolve' | 'wipe' | 'slide'
- `duration` - Duration in seconds

**Returns:** `Promise<{ id: string; output_path: string }>`

---

## Request/Response Interceptors

### Request Interceptor

Automatically applied to all requests:

- Adds authentication token from localStorage
- Adds request timestamp for duration tracking
- Logs requests in development mode

### Response Interceptor

Automatically applied to all responses:

- Calculates and logs request duration
- Formats error messages consistently
- Handles common HTTP error codes:
  - **401 Unauthorized** - Clears auth token
  - **403 Forbidden** - Permission denied message
  - **404 Not Found** - Resource not found message
  - **500 Server Error** - Internal server error message
  - **Timeout** - Request timeout message
  - **Network Error** - Connection error message

## Error Handling

All API methods return typed `ApiError` objects on failure:

```typescript
interface ApiError {
	message: string;
	code?: string;
	details?: any;
	timestamp?: string;
}
```

**Example error handling:**

```typescript
import { uploadMedia } from "@/services/api";
import type { ApiError } from "@/types/api";

try {
	const result = await uploadMedia(file);
	// Success
} catch (error) {
	const apiError = error as ApiError;
	console.error("Error:", apiError.message);

	// Show user-friendly message
	showToast({
		title: "Upload Failed",
		description: apiError.message,
		variant: "destructive",
	});
}
```

## Type Safety

All API methods are fully typed with TypeScript interfaces:

```typescript
// Request types from timeline/media/export types
import type { Timeline } from "@/types/timeline";
import type { ExportSettings } from "@/types/export";

// Response types from api types
import type {
	UploadMediaResponse,
	MediaMetadataResponse,
	WaveformResponse,
	CutVideoResponse,
	TrimVideoResponse,
	ApiError,
} from "@/types/api";
```

## Usage Examples

### Complete Upload Flow

```typescript
import { uploadMedia, getMediaMetadata } from "@/services/api";
import { useState } from "react";

function UploadComponent() {
	const [progress, setProgress] = useState(0);

	const handleFileSelect = async (file: File) => {
		try {
			// Upload with progress tracking
			const media = await uploadMedia(file, (progressEvent) => {
				setProgress(progressEvent.progress);
			});

			// Get additional metadata
			const metadata = await getMediaMetadata(media.id);

			// Add to timeline or resource panel
			addToResources(media);

			setProgress(0);
		} catch (error) {
			console.error("Upload failed:", error);
		}
	};

	return (
		<div>
			<input type="file" onChange={(e) => handleFileSelect(e.target.files[0])} />
			{progress > 0 && <progress value={progress} max={100} />}
		</div>
	);
}
```

### Complete Export Flow

```typescript
import { startExport, getExportStatus, downloadExport, downloadBlob } from "@/services/api";
import { useTimeline } from "@/context/TimelineContext";
import { useState } from "react";

function ExportComponent() {
	const { state } = useTimeline();
	const [exportProgress, setExportProgress] = useState(0);
	const [exportStatus, setExportStatus] = useState<string>("idle");

	const handleExport = async () => {
		try {
			setExportStatus("starting");

			// Start export
			const response = await startExport(
				{ layers: state.layers, duration: state.duration },
				{
					resolution: "1080p",
					format: "MP4",
					quality: "high",
					filename: "exported-video.mp4",
				}
			);

			const taskId = response.task_id;
			setExportStatus("processing");

			// Poll for status
			const interval = setInterval(async () => {
				const status = await getExportStatus(taskId);
				setExportProgress(status.progress);

				if (status.status === "completed") {
					clearInterval(interval);
					setExportStatus("downloading");

					// Download
					const blob = await downloadExport(taskId);
					downloadBlob(blob, "exported-video.mp4");

					setExportStatus("complete");
					setExportProgress(0);
				} else if (status.status === "failed") {
					clearInterval(interval);
					setExportStatus("error");
					console.error("Export failed:", status.error);
				}
			}, 2000);
		} catch (error) {
			setExportStatus("error");
			console.error("Export error:", error);
		}
	};

	return (
		<div>
			<button onClick={handleExport} disabled={exportStatus !== "idle"}>
				Export Video
			</button>
			{exportProgress > 0 && (
				<div>
					<progress value={exportProgress} max={100} />
					<span>{exportProgress}%</span>
				</div>
			)}
			<p>Status: {exportStatus}</p>
		</div>
	);
}
```

### Video Editing Operations

```typescript
import { cutVideo, trimVideo, mergeVideos } from "@/services/api";

// Cut video at 30 seconds
const cutResult = await cutVideo("video-123", 30);
console.log("Created segments:", cutResult.segment1_id, cutResult.segment2_id);

// Trim video from 10s to 50s
const trimResult = await trimVideo("video-123", 10, 50);
console.log("Trimmed video:", trimResult.id);

// Merge three clips
const mergeResult = await mergeVideos(["clip-1", "clip-2", "clip-3"], [0, 10, 25]);
console.log("Merged video:", mergeResult.id);
```

## Testing

### Testing API Calls

```typescript
import { describe, it, expect, vi } from "vitest";
import { uploadMedia, getMediaMetadata } from "@/services/api";

describe("API Service", () => {
	it("should upload media file", async () => {
		const file = new File(["content"], "test.mp4", { type: "video/mp4" });
		const result = await uploadMedia(file);

		expect(result).toHaveProperty("id");
		expect(result.type).toBe("video");
	});

	it("should handle upload progress", async () => {
		const file = new File(["content"], "test.mp4", { type: "video/mp4" });
		const progressCallback = vi.fn();

		await uploadMedia(file, progressCallback);

		expect(progressCallback).toHaveBeenCalled();
	});

	it("should get media metadata", async () => {
		const metadata = await getMediaMetadata("media-123");

		expect(metadata).toHaveProperty("duration");
		expect(metadata).toHaveProperty("metadata");
	});
});
```

## Best Practices

1. **Always handle errors** - Use try-catch blocks and show user-friendly messages
2. **Track progress** - Use progress callbacks for long operations (uploads, exports)
3. **Cancel operations** - Implement cancellation for long-running tasks
4. **Cache responses** - Cache metadata and waveform data to reduce API calls
5. **Debounce requests** - Avoid making too many requests in quick succession
6. **Use TypeScript** - Leverage types for compile-time safety
7. **Log in development** - Use the built-in logging (disabled in production)

## Troubleshooting

### CORS Issues

If you encounter CORS errors, ensure the backend has proper CORS configuration:

```python
# backend/main.py
from fastapi.middleware.cors import CORSMiddleware

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],  # Vite dev server
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

### Connection Refused

- Ensure backend is running on `http://localhost:8000`
- Check `.env.local` has correct `VITE_API_URL`
- Verify no firewall is blocking the connection

### Timeout Errors

- Increase timeout for large file operations
- Check network connectivity
- Verify backend is responding

### Authentication Errors

- Clear localStorage auth token: `localStorage.removeItem('auth_token')`
- Re-authenticate with backend
- Check token expiration

## API Endpoint Reference

| Method | Endpoint                   | Description         |
| ------ | -------------------------- | ------------------- |
| POST   | `/media/upload`            | Upload media file   |
| GET    | `/media/:id/metadata`      | Get media metadata  |
| GET    | `/media/:id/waveform`      | Get audio waveform  |
| GET    | `/media/:id/thumbnail`     | Get video thumbnail |
| DELETE | `/media/:id`               | Delete media        |
| POST   | `/timeline/cut`            | Cut video           |
| POST   | `/timeline/trim`           | Trim video          |
| POST   | `/timeline/merge`          | Merge videos        |
| POST   | `/export/start`            | Start export        |
| GET    | `/export/status/:taskId`   | Get export status   |
| GET    | `/export/download/:taskId` | Download export     |
| POST   | `/export/cancel/:taskId`   | Cancel export       |
| POST   | `/audio/extract/:videoId`  | Extract audio       |
| POST   | `/audio/mix`               | Mix audio tracks    |
| POST   | `/transitions/apply`       | Apply transition    |
| GET    | `/health`                  | Health check        |

## Future Enhancements

- [ ] WebSocket support for real-time updates
- [ ] Request caching with service workers
- [ ] Retry logic for failed requests
- [ ] Request queuing for rate limiting
- [ ] GraphQL support
- [ ] Batch operations
- [ ] Offline support with IndexedDB
- [ ] Request deduplication
