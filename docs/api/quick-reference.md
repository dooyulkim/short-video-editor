# API Quick Reference

## Quick Start

```typescript
// 1. Import what you need
import { uploadMedia, startExport } from '@/services/api';
import { useApi, useProgress } from '@/hooks/useApi';

// 2. Use in component
const { execute, loading, error } = useApi();
const { progress, updateProgress } = useProgress();

// 3. Make API calls
const result = await execute(() => uploadMedia(file));
```

## Common Patterns

### Upload File
```typescript
import { uploadMedia } from '@/services/api';

const file = new File(['content'], 'video.mp4');
const result = await uploadMedia(file, (progress) => {
  console.log(`${progress.progress}%`);
});
```

### Get Metadata
```typescript
import { getMediaMetadata } from '@/services/api';

const metadata = await getMediaMetadata('media-id-123');
console.log(metadata.duration, metadata.metadata.width);
```

### Export Timeline
```typescript
import { startExport, getExportStatus, downloadExport } from '@/services/api';

// Start
const response = await startExport(timeline, settings);

// Poll status
const interval = setInterval(async () => {
  const status = await getExportStatus(response.task_id);
  if (status.status === 'completed') {
    clearInterval(interval);
    const blob = await downloadExport(response.task_id);
    // Download blob
  }
}, 2000);
```

### Error Handling
```typescript
import type { ApiError } from '@/types/api';

try {
  const result = await uploadMedia(file);
} catch (error) {
  const apiError = error as ApiError;
  console.error(apiError.message);
}
```

## All API Methods

| Category | Method | Parameters |
|----------|--------|------------|
| **Media** | `uploadMedia` | `(file, onProgress?)` |
| | `getMediaMetadata` | `(id)` |
| | `getWaveform` | `(id, width?)` |
| | `getThumbnail` | `(id, timestamp?)` |
| | `deleteMedia` | `(id)` |
| **Timeline** | `cutVideo` | `(id, cutTime)` |
| | `trimVideo` | `(id, start, end)` |
| | `mergeVideos` | `(ids[], times[])` |
| **Export** | `startExport` | `(timeline, settings)` |
| | `getExportStatus` | `(taskId)` |
| | `downloadExport` | `(taskId)` |
| | `cancelExport` | `(taskId)` |
| **Audio** | `extractAudio` | `(videoId)` |
| | `mixAudio` | `(tracks[])` |
| **Transitions** | `applyTransition` | `(clip1, clip2, type, duration)` |
| **Utils** | `healthCheck` | `()` |

## Environment

```bash
# .env.local
VITE_API_URL=http://localhost:8000
```

## Custom Hooks

```typescript
// useApi - Loading & Error states
const { data, loading, error, execute, reset } = useApi<ResponseType>();

// useProgress - Track progress
const { progress, status, updateProgress } = useProgress();
```

## TypeScript Types

```typescript
import type {
  UploadMediaResponse,
  MediaMetadataResponse,
  WaveformResponse,
  ApiError
} from '@/types/api';
```

## Backend URLs

- Dev: `http://localhost:8000`
- Docs: `http://localhost:8000/docs`
- Health: `http://localhost:8000/health`
