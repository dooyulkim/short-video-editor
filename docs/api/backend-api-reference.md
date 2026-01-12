# API Documentation

## Overview

The Video Editor backend provides a RESTful API built with FastAPI for video processing, media management, and export functionality.

**Base URL**: `http://localhost:8000`
**API Docs**: `http://localhost:8000/docs` (Swagger UI)
**Alternative Docs**: `http://localhost:8000/redoc` (ReDoc)

## Authentication

Currently, the API does not require authentication. This should be implemented for production use.

## Endpoints

### Media Management

#### Upload Media

```http
POST /media/upload
Content-Type: multipart/form-data

Parameters:
  file: File (video, audio, or image)

Response: 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "filename": "video.mp4",
  "type": "video",
  "size": 15728640,
  "duration": 30.5,
  "metadata": {
    "width": 1920,
    "height": 1080,
    "fps": 30,
    "codec": "h264"
  },
  "thumbnail_url": "/media/550e8400.../thumbnail"
}
```

#### Get Thumbnail

```http
GET /media/{media_id}/thumbnail

Response: 200 OK
Content-Type: image/jpeg
[Binary image data]
```

#### Get Metadata

```http
GET /media/{media_id}/metadata

Response: 200 OK
{
  "id": "550e8400-e29b-41d4-a716-446655440000",
  "duration": 30.5,
  "dimensions": [1920, 1080],
  "fps": 30,
  "format": "mp4",
  "codec": "h264",
  "bitrate": 4000000
}
```

#### Delete Media

```http
DELETE /media/project/{project_id}/{media_id}

Response: 200 OK
{
  "message": "Media deleted successfully",
  "media_id": "550e8400-e29b-41d4-a716-446655440000",
  "deleted_ids": ["550e8400-e29b-41d4-a716-446655440000"]
}
```

#### Delete Project

```http
DELETE /media/project/{project_id}

Description: Delete all media resources for a specific project

Response: 200 OK
{
  "message": "Project media deleted",
  "project_id": "project-123",
  "deleted_count": 5,
  "deleted_ids": ["media-1", "media-2", ...],
  "errors": null
}

Error Response: 404 Not Found
{
  "detail": "Project not found: project-123"
}
```

### Audio Processing

#### Generate Waveform

```http
GET /audio/{media_id}/waveform?width=1000

Parameters:
  width: int (default: 1000) - Number of samples

Response: 200 OK
{
  "waveform": [-0.5, 0.3, 0.7, ...],
  "duration": 30.5,
  "sample_rate": 44100
}
```

#### Extract Audio from Video

```http
POST /audio/extract
Content-Type: application/json

Body:
{
  "video_id": "550e8400-e29b-41d4-a716-446655440000"
}

Response: 200 OK
{
  "audio_id": "660e8400-e29b-41d4-a716-446655440001",
  "duration": 30.5,
  "format": "mp3"
}
```

### Timeline Operations

#### Cut Video

```http
POST /timeline/cut
Content-Type: application/json

Body:
{
  "video_id": "550e8400-e29b-41d4-a716-446655440000",
  "cut_time": 15.5
}

Response: 200 OK
{
  "clip1_id": "770e8400-e29b-41d4-a716-446655440002",
  "clip2_id": "880e8400-e29b-41d4-a716-446655440003",
  "duration1": 15.5,
  "duration2": 15.0
}
```

#### Trim Video

```http
POST /timeline/trim
Content-Type: application/json

Body:
{
  "video_id": "550e8400-e29b-41d4-a716-446655440000",
  "start_time": 5.0,
  "end_time": 25.0
}

Response: 200 OK
{
  "trimmed_id": "990e8400-e29b-41d4-a716-446655440004",
  "duration": 20.0
}
```

#### Merge Clips

```http
POST /timeline/merge
Content-Type: application/json

Body:
{
  "clips": [
    {"id": "clip1_id", "start_time": 0},
    {"id": "clip2_id", "start_time": 30},
    {"id": "clip3_id", "start_time": 60}
  ]
}

Response: 200 OK
{
  "merged_id": "aa0e8400-e29b-41d4-a716-446655440005",
  "duration": 90.0
}
```

### Transitions

#### Apply Transition

```http
POST /transitions/apply
Content-Type: application/json

Body:
{
  "video_id": "550e8400-e29b-41d4-a716-446655440000",
  "transition_type": "fade_in|fade_out|cross_dissolve|wipe",
  "duration": 1.0,
  "direction": "left|right|up|down" // for wipe only
}

Response: 200 OK
{
  "result_id": "bb0e8400-e29b-41d4-a716-446655440006",
  "duration": 31.0
}
```

### Export

#### Start Export

```http
POST /export/start
Content-Type: application/json

Body:
{
  "timeline_data": {
    "layers": [
      {
        "id": "layer1",
        "type": "video",
        "clips": [
          {
            "id": "clip1",
            "resourceId": "550e8400...",
            "startTime": 0,
            "duration": 30,
            "trimStart": 0,
            "trimEnd": 30,
            "transitions": {
              "in": {"type": "fade", "duration": 1},
              "out": {"type": "fade", "duration": 1}
            }
          }
        ]
      }
    ],
    "duration": 30
  },
  "resolution": "1080p|720p|480p",
  "fps": 30,
  "output_filename": "my_video.mp4"
}

Response: 202 Accepted
{
  "task_id": "cc0e8400-e29b-41d4-a716-446655440007",
  "status": "pending",
  "created_at": "2026-01-06T10:30:00Z"
}
```

#### Get Export Status

```http
GET /export/status/{task_id}

Response: 200 OK
{
  "task_id": "cc0e8400-e29b-41d4-a716-446655440007",
  "status": "processing|completed|failed",
  "progress": 0.75,
  "message": "Rendering video...",
  "output_path": "/exports/my_video.mp4",
  "created_at": "2026-01-06T10:30:00Z",
  "completed_at": "2026-01-06T10:32:00Z"
}
```

#### Download Export

```http
GET /export/download/{task_id}

Response: 200 OK
Content-Type: video/mp4
Content-Disposition: attachment; filename="my_video.mp4"
[Binary video data]
```

#### Cancel Export

```http
DELETE /export/cancel/{task_id}

Response: 200 OK
{
  "task_id": "cc0e8400-e29b-41d4-a716-446655440007",
  "status": "cancelled"
}
```

## Error Responses

All endpoints may return the following error responses:

### 400 Bad Request

```json
{
	"detail": "Invalid request parameters"
}
```

### 404 Not Found

```json
{
	"detail": "Resource not found"
}
```

### 422 Unprocessable Entity

```json
{
	"detail": [
		{
			"loc": ["body", "resolution"],
			"msg": "field required",
			"type": "value_error.missing"
		}
	]
}
```

### 500 Internal Server Error

```json
{
	"detail": "Internal server error occurred"
}
```

## Rate Limiting

Currently no rate limiting is implemented. For production, consider:

- 100 requests per minute per IP for media upload
- 10 concurrent export jobs per user
- 1000 requests per minute for other endpoints

## Data Models

### MediaResource

```typescript
interface MediaResource {
	id: string;
	filename: string;
	type: "video" | "audio" | "image";
	size: number;
	duration?: number;
	metadata: VideoMetadata | AudioMetadata | ImageMetadata;
	thumbnail_url?: string;
	created_at: string;
}
```

### TimelineData

```typescript
interface TimelineData {
	layers: TimelineLayer[];
	duration: number;
}

interface TimelineLayer {
	id: string;
	type: "video" | "audio" | "text";
	clips: Clip[];
	visible: boolean;
	locked: boolean;
}

interface Clip {
	id: string;
	resourceId: string;
	startTime: number;
	duration: number;
	trimStart: number;
	trimEnd: number;
	position?: { x: number; y: number };
	scale?: number;
	rotation?: number;
	opacity?: number;
	transitions?: {
		in?: Transition;
		out?: Transition;
	};
	data?: any;
}

interface Transition {
	type: "fade" | "cross_dissolve" | "wipe";
	duration: number;
	direction?: "left" | "right" | "up" | "down";
}
```

## WebSocket Support (Future)

Real-time export progress updates via WebSocket:

```javascript
const ws = new WebSocket("ws://localhost:8000/ws/export/{task_id}");

ws.onmessage = (event) => {
	const data = JSON.parse(event.data);
	console.log(`Progress: ${data.progress * 100}%`);
};
```

## SDK / Client Library

### JavaScript/TypeScript

```typescript
import { VideoEditorAPI } from "./services/api";

const api = new VideoEditorAPI("http://localhost:8000");

// Upload media
const media = await api.uploadMedia(file);

// Start export
const task = await api.startExport(timelineData, {
	resolution: "1080p",
	fps: 30,
});

// Poll for completion
const result = await api.pollExportStatus(task.task_id);
```

## Best Practices

1. **File Size**: Keep uploads under 500MB for best performance
2. **Concurrent Exports**: Limit to 3 simultaneous exports
3. **Progress Polling**: Poll export status every 2 seconds
4. **Error Handling**: Always handle 500 errors gracefully
5. **Timeouts**: Set reasonable timeouts (60s for upload, 5m for export)
6. **Cleanup**: Delete temporary media after export completion

## Development

### Running API Locally

```bash
cd backend
uvicorn main:app --reload --port 8000
```

### Interactive API Docs

Visit `http://localhost:8000/docs` for Swagger UI with:

- Interactive endpoint testing
- Request/response examples
- Schema definitions
- Authentication testing

### Testing API

```bash
# Using curl
curl -X POST "http://localhost:8000/media/upload" \
  -F "file=@video.mp4"

# Using Python
import requests
response = requests.post(
    'http://localhost:8000/media/upload',
    files={'file': open('video.mp4', 'rb')}
)
print(response.json())
```

---

**Version**: 1.0.0  
**Last Updated**: January 6, 2026  
**Maintainer**: Video Editor Team
