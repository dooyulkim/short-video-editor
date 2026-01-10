# Video Editor Development Plan - Step by Step Guide

## Stack: React + shadcn/ui + TypeScript (Frontend) | Python (Backend)

---

## Project Setup Phase

### Step 1: Initialize Frontend Project

```bash
# Create React + TypeScript project with Vite
npm create vite@latest frontend -- --template react-ts
cd frontend
npm install

# Install Tailwind CSS
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# Install shadcn/ui
npx shadcn-ui@latest init

# Install core dependencies
npm install @radix-ui/react-slider @radix-ui/react-dropdown-menu
npm install react-dropzone axios
npm install date-fns uuid
npm install @types/uuid --save-dev

# Install video processing libraries
npm install @ffmpeg/ffmpeg @ffmpeg/util
```

**Configure Tailwind CSS in `tailwind.config.js`:**

```javascript
/** @type {import('tailwindcss').Config} */
export default {
	darkMode: ["class"],
	content: ["./pages/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./app/**/*.{ts,tsx}", "./src/**/*.{ts,tsx}"],
	theme: {
		extend: {},
	},
	plugins: [require("tailwindcss-animate")],
};
```

**Add to `src/index.css`:**

```css
@tailwind base;
@tailwind components;
@tailwind utilities;
```

**Files to create:**

- `src/types/timeline.ts` - TypeScript interfaces for timeline data
- `src/types/media.ts` - TypeScript interfaces for media resources
- `src/lib/utils.ts` - Utility functions
- `src/components/ui/` - shadcn components (button, card, slider, etc.)
- `vite.config.ts` - Vite configuration with path aliases

**Prompt for Copilot:**

```
Create a React + TypeScript + Vite project structure for a video editor application.

1. Update vite.config.ts to add path alias:
import path from "path"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
})

2. Create TypeScript interfaces in src/types/timeline.ts:
- TimelineLayer (with id, type, clips[], locked, visible)
- Clip (with id, resourceId, startTime, duration, trimStart, trimEnd, transitions)
- Transition (with type, duration, properties)

3. Create folder structure: components/, hooks/, utils/, services/, types/

4. Update tsconfig.json to add path mapping:
{
  "compilerOptions": {
    "baseUrl": ".",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

---

### Step 2: Initialize Backend Project

```bash
# Create Python backend
mkdir backend
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate

# Install dependencies
pip install fastapi uvicorn python-multipart
pip install opencv-python pillow ffmpeg-python
pip install numpy pydantic
pip freeze > requirements.txt
```

**Files to create:**

- `main.py` - FastAPI application entry point
- `routers/` - API route handlers
- `services/` - Business logic
- `models/` - Pydantic models
- `utils/` - Helper functions

**Prompt for Copilot:**

```
Create a FastAPI backend structure for a video editor application.
Include the following in main.py:
- FastAPI app initialization with CORS middleware
- Router inclusions for /media, /timeline, /export endpoints
Create folder structure: routers/, services/, models/, utils/
Create Pydantic models in models/media.py for MediaResource, VideoMetadata, AudioMetadata
```

---

## Development Steps

### Step 3: Backend - Media Upload & Processing API

**File: `routers/media.py`**

**Prompt for Copilot:**

```
Create a FastAPI router in routers/media.py with the following endpoints:

1. POST /media/upload - Accept video/audio/image files
   - Save file to disk with unique ID
   - Extract metadata (duration, dimensions, format, fps)
   - Generate thumbnail for videos (first frame)
   - Return media resource object with metadata

2. GET /media/{media_id}/thumbnail - Return thumbnail image

3. GET /media/{media_id}/metadata - Return full metadata

4. DELETE /media/{media_id} - Delete media file

Use python-multipart for file uploads.
Use opencv-python to extract video metadata and generate thumbnails.
Store files in uploads/ directory with UUID filenames.
```

**File: `services/media_service.py`**

**Prompt for Copilot:**

```
Create a MediaService class in services/media_service.py with methods:

1. extract_video_metadata(file_path) - Use opencv to get duration, fps, dimensions, codec
2. extract_audio_metadata(file_path) - Use ffmpeg-python to get duration, sample rate, channels
3. generate_thumbnail(video_path, timestamp=0) - Extract frame at timestamp, save as JPEG
4. generate_waveform(audio_path) - Generate waveform visualization, return as base64 image
5. save_uploaded_file(file, file_type) - Save file with UUID, return file path and ID

Handle errors gracefully and return proper status codes.
```

---

### Step 4: Backend - Audio Waveform Generation

**File: `services/audio_service.py`**

**Prompt for Copilot:**

```
Create an AudioService class in services/audio_service.py:

1. generate_waveform_data(audio_path, width=1000) -
   - Load audio file with ffmpeg-python
   - Extract audio samples
   - Downsample to match width
   - Return array of amplitude values for visualization

2. extract_audio_from_video(video_path) -
   - Extract audio track from video
   - Save as separate file
   - Return audio file path

Use numpy for audio processing.
Return waveform as JSON array of float values between -1 and 1.
```

---

### Step 5: Frontend - Resource Upload Component

**File: `src/components/ResourcePanel.tsx`**

**Prompt for Copilot:**

```
Create a ResourcePanel component using React + TypeScript + shadcn/ui:

1. Use react-dropzone for drag-and-drop file upload
2. Display uploaded resources in a grid with thumbnails
3. Show upload progress with shadcn Progress component
4. Display metadata (duration, dimensions) on hover
5. Allow drag from resource panel to timeline
6. Use shadcn Card component for each resource
7. Include filter tabs for All/Video/Audio/Images

Make it responsive and include TypeScript types for all props and state.
Use axios to POST files to /media/upload endpoint.
Store resources in React state with Resource interface.
```

**File: `src/hooks/useMediaUpload.ts`**

**Prompt for Copilot:**

```
Create a custom React hook useMediaUpload in src/hooks/useMediaUpload.ts:

1. Handle file upload with progress tracking
2. Make POST request to backend /media/upload
3. Handle success/error states
4. Return: uploadFile function, progress, isUploading, error

Use axios with onUploadProgress for progress tracking.
Return TypeScript typed hook with proper return type.
```

---

### Step 6: Frontend - Timeline Component Foundation

**File: `src/components/Timeline/Timeline.tsx`**

**Prompt for Copilot:**

```
Create a Timeline component with the following features:

1. Canvas-based timeline visualization using HTML5 Canvas
2. Show time ruler with second markers
3. Display multiple layers (video, audio, text tracks)
4. Render clips as rectangles on each layer
5. Playhead that can be dragged
6. Zoom controls (+/- buttons) that adjust pixels per second
7. Use shadcn Button for controls

State management:
- layers: TimelineLayer[]
- currentTime: number
- zoom: number (pixels per second)
- duration: number

Use useRef for canvas element.
Implement canvas drawing in useEffect.
Make timeline scrollable horizontally.
```

**File: `src/components/Timeline/TimelineRuler.tsx`**

**Prompt for Copilot:**

```
Create a TimelineRuler component that renders time markers:

1. Props: width (pixels), zoom (pixels per second), duration
2. Draw second/minute markers based on zoom level
3. Show time labels (00:00, 00:01, etc.)
4. Adjust marker density based on zoom:
   - High zoom: show every second
   - Medium zoom: show every 5 seconds
   - Low zoom: show every 10-30 seconds

Use canvas or SVG for rendering.
Format time as MM:SS or HH:MM:SS.
```

---

### Step 7: Frontend - Timeline Layer Management

**File: `src/components/Timeline/TimelineLayer.tsx`**

**Prompt for Copilot:**

```
Create a TimelineLayer component:

1. Props: layer (TimelineLayer), zoom, onClipSelect, onClipMove
2. Render all clips in the layer as draggable rectangles
3. Show clip thumbnails if video
4. Show waveform if audio
5. Allow horizontal dragging to change clip start time
6. Show clip duration on hover
7. Highlight selected clip with border
8. Include lock/unlock and show/hide buttons for layer

Use CSS for clip styling.
Implement drag handlers with mouse events.
Snap clips to grid when dragging (snap to seconds).
```

**File: `src/components/Timeline/TimelineClip.tsx`**

**Prompt for Copilot:**

```
Create a TimelineClip component:

1. Props: clip (Clip), zoom, isSelected, onSelect, onMove, onTrim
2. Render clip as a rectangle with width based on duration and zoom
3. Show trim handles on left and right edges
4. Display clip name or thumbnail
5. Handle click to select
6. Handle drag to move
7. Handle edge drag to trim
8. Show transition indicators if clip has transitions

Use styled-components or Tailwind for styling.
Implement resize handles that change cursor on hover.
Emit events: onMove(clipId, newStartTime), onTrim(clipId, newDuration)
```

---

### Step 8: Frontend - Drag and Drop from Resources to Timeline

**File: `src/hooks/useTimelineDragDrop.ts`**

**Prompt for Copilot:**

```
Create a custom hook useTimelineDragDrop for handling drag and drop:

1. Accept parameters: resources, layers, setLayers, zoom
2. Handle drag start from ResourcePanel
3. Calculate drop position on timeline based on mouse X position
4. Convert mouse position to timeline time using zoom
5. Create new clip from dropped resource
6. Add clip to appropriate layer (auto-create if needed)
7. Return drag handlers: onDragStart, onDragOver, onDrop

Use HTML5 drag and drop API.
Calculate: time = (mouseX - timelineOffsetX) / zoom
Generate unique clip ID with uuid.
```

---

### Step 9: Frontend - Timeline State Management

**File: `src/context/TimelineContext.tsx`**

**Prompt for Copilot:**

```
Create a React Context for timeline state management:

1. State:
   - layers: TimelineLayer[]
   - currentTime: number
   - duration: number
   - zoom: number
   - selectedClipId: string | null
   - isPlaying: boolean

2. Actions:
   - addClip(clip, layerIndex)
   - removeClip(clipId)
   - updateClip(clipId, updates)
   - moveClip(clipId, newStartTime)
   - trimClip(clipId, newDuration)
   - addLayer(layerType)
   - removeLayer(layerId)
   - setCurrentTime(time)
   - setZoom(zoom)
   - play() / pause()

Use useReducer for state management.
Export TimelineProvider and useTimeline hook.
Include TypeScript types for all actions.
```

---

### Step 10: Backend - Video Processing Endpoints

**File: `routers/timeline.py`**

**Prompt for Copilot:**

```
Create FastAPI router in routers/timeline.py with endpoints:

1. POST /timeline/cut - Cut video at timestamp
   - Accept: video_id, cut_time
   - Use ffmpeg-python to split video at timestamp
   - Save two new video files
   - Return IDs of both segments

2. POST /timeline/trim - Trim video
   - Accept: video_id, start_time, end_time
   - Use ffmpeg-python to extract subclip
   - Save trimmed video
   - Return new video ID

3. POST /timeline/merge - Merge video clips
   - Accept: list of clip IDs with start times
   - Concatenate videos using ffmpeg-python
   - Return merged video ID

Use ffmpeg-python for video processing.
Handle different resolutions by resizing to match first clip.
Run processing in background thread to avoid blocking.
```

---

### Step 11: Backend - Transition Effects Service

**File: `services/transition_service.py`**

**Prompt for Copilot:**

```
Create TransitionService class with methods:

1. apply_fade_in(video_path, duration) - Fade from black
2. apply_fade_out(video_path, duration) - Fade to black
3. apply_cross_dissolve(video1_path, video2_path, duration) - Crossfade between videos
4. apply_wipe(video1_path, video2_path, duration, direction) - Wipe transition

Use ffmpeg-python with filter_complex for transitions.
For cross dissolve: overlap last X seconds of video1 with first X seconds of video2.
Return path to new video file with transition applied.
Save processed videos in temp directory.
```

---

### Step 12: Frontend - Text Tool Implementation

**File: `src/components/TextTool/TextEditor.tsx`**

**Prompt for Copilot:**

```
Create a TextEditor component for adding text to timeline:

1. shadcn Dialog that opens when "Add Text" button clicked
2. Input fields:
   - Text content (textarea)
   - Font family (select)
   - Font size (slider)
   - Color (color picker)
   - Position (X, Y inputs)
   - Duration (number input)
3. Preview panel showing text appearance
4. OK button to add text clip to timeline
5. Cancel button to close

Use shadcn Dialog, Input, Select, Slider components.
Store text properties in clip.data object.
Create text clip with type: 'text'.
```

**File: `src/components/Timeline/TextClip.tsx`**

**Prompt for Copilot:**

```
Create TextClip component to render text on preview canvas:

1. Props: clip (with text data), currentTime, canvasContext
2. Check if clip should be visible at currentTime
3. Draw text on canvas at specified position
4. Apply font properties (family, size, color)
5. Handle text animations if specified (fade, slide)

Use canvas.fillText() to render text.
Parse text properties from clip.data.
Apply transformations based on animation type.
```

---

### Step 13: Frontend - Transition UI

**File: `src/components/TransitionPanel.tsx`**

**Prompt for Copilot:**

```
Create TransitionPanel component:

1. Grid of transition presets (Fade In, Fade Out, Cross Dissolve, Wipe)
2. Each preset shows animated preview icon
3. Drag transition to drop between clips on timeline
4. When dropped, attach transition to clip
5. Duration slider to adjust transition length
6. Use shadcn Card for each transition type

Transitions should be represented as objects with type and duration.
Store in clip.transitions array.
Show transition indicator on timeline clip edges.
```

**File: `src/components/Timeline/TransitionIndicator.tsx`**

**Prompt for Copilot:**

```
Create TransitionIndicator component:

1. Props: transition type, position (start/end)
2. Render small icon overlay on clip edge
3. Show transition type icon (fade, dissolve, wipe)
4. Different colors for different transition types
5. Click to open transition editor dialog

Use Lucide React icons for transition types.
Position absolutely on clip edge.
Show tooltip with transition details on hover.
```

---

### Step 14: Backend - Audio Mixing Service

**File: `services/audio_mixer.py`**

**Prompt for Copilot:**

```
Create AudioMixer class for audio mixing:

1. mix_audio_tracks(audio_clips, output_path)
   - Accept list of audio clips with start times and volumes
   - Mix multiple audio tracks into single output
   - Apply volume adjustments per clip
   - Handle overlapping audio

2. extract_audio(video_path)
   - Extract audio from video file
   - Return audio file path

3. apply_audio_fade(audio_path, fade_in, fade_out)
   - Apply fade in/out to audio
   - Return processed audio path

Use ffmpeg-python for audio processing.
Combine audio with amix filter.
Handle different sample rates by resampling.
```

---

### Step 15: Frontend - Audio Waveform Visualization

**File: `src/components/Timeline/AudioWaveform.tsx`**

**Prompt for Copilot:**

```
Create AudioWaveform component:

1. Props: audioData (array of amplitude values), width, height
2. Draw waveform on canvas as bars or filled area
3. Scale amplitude values to fit height
4. Color: use theme color from shadcn
5. Responsive to width changes (zoom)

Use canvas fillRect or path for drawing waveform.
Normalize amplitude data to -1 to 1 range.
Draw from center line (height/2).
Use requestAnimationFrame if animating playhead.
```

**File: `src/hooks/useAudioWaveform.ts`**

**Prompt for Copilot:**

```
Create custom hook to fetch and manage audio waveform data:

1. Accept audioId parameter
2. Fetch waveform data from backend on mount
3. Cache waveform data in state
4. Return: waveformData, isLoading, error

Make GET request to /media/{audioId}/waveform endpoint.
Store in Map for caching multiple waveforms.
Use useEffect with audioId dependency.
```

---

### Step 16: Frontend - Video Preview Player

**File: `src/components/Player/VideoPlayer.tsx`**

**Prompt for Copilot:**

```
Create VideoPlayer component for preview:

1. Canvas element for rendering composite video
2. Render all visible clips at current time
3. Layer clips from bottom to top
4. Apply transitions if clip has them
5. Render text overlays from text clips
6. Sync with timeline currentTime

Use refs for canvas and video elements.
Use useEffect to redraw when currentTime changes.
Draw video frames to canvas using drawImage().
Composite multiple layers on single canvas.
```

**File: `src/hooks/useVideoPlayback.ts`**

**Prompt for Copilot:**

```
Create useVideoPlayback hook for playback control:

1. State: isPlaying, currentTime
2. Use requestAnimationFrame for smooth playback
3. Update currentTime at 30fps when playing
4. Methods: play(), pause(), seek(time), stop()
5. Auto-pause at end of timeline

Calculate deltaTime between frames.
Update timeline currentTime in context.
Handle play/pause state changes.
Clean up animation frame on unmount.
```

---

### Step 17: Frontend - Cut/Trim Tools

**File: `src/components/Toolbar/EditTools.tsx`**

**Prompt for Copilot:**

```
Create EditTools component with buttons:

1. Cut tool - Split clip at playhead position
2. Trim tool - Enable trim mode for selected clip
3. Delete - Remove selected clip
4. Duplicate - Copy selected clip

Use shadcn Button and Tooltip components.
Icons from Lucide React: Scissors, Minimize2, Trash2, Copy.
Enable/disable based on selection state.
Implement click handlers that update timeline state.
```

**File: `src/utils/clipOperations.ts`**

**Prompt for Copilot:**

```
Create utility functions for clip operations:

1. cutClipAtTime(clip, cutTime)
   - Split clip into two clips
   - Return array of two new clips

2. trimClip(clip, newStartTime, newEndTime)
   - Update clip start/end
   - Adjust trimStart/trimEnd properties

3. duplicateClip(clip)
   - Create copy with new ID
   - Place after original clip

4. deleteClip(layers, clipId)
   - Remove clip from layers
   - Return updated layers

Include proper TypeScript types.
Preserve clip properties like transitions.
```

---

### Step 18: Backend - Video Export Service

**File: `services/export_service.py`**

**Prompt for Copilot:**

```
Create ExportService class for final video rendering:

1. export_timeline(timeline_data, output_path, resolution, fps)
   - Accept timeline JSON with all clips
   - Process each clip with start time
   - Apply all transitions
   - Mix audio tracks
   - Composite all layers
   - Render text overlays
   - Export final video

2. Process in steps:
   - Load all video clips
   - Trim clips based on trimStart/trimEnd
   - Apply transitions at boundaries
   - Composite video layers
   - Mix audio layers
   - Render text at specified times
   - Write final video file

Use ffmpeg-python with filter_complex for compositing.
Support resolution options: 1080p, 720p, 480p.
Show progress with callback function.
```

**File: `routers/export.py`**

**Prompt for Copilot:**

```
Create FastAPI router for export:

1. POST /export/start
   - Accept timeline JSON data
   - Start background export task
   - Return task_id

2. GET /export/status/{task_id}
   - Return export progress (0-100%)
   - Return status: pending, processing, completed, failed

3. GET /export/download/{task_id}
   - Download completed video file
   - Return video file as streaming response

Use BackgroundTasks or Celery for async processing.
Store task status in dictionary or Redis.
Clean up exported files after download.
```

---

### Step 19: Frontend - Export Dialog

**File: `src/components/Export/ExportDialog.tsx`**

**Prompt for Copilot:**

```
Create ExportDialog component:

1. shadcn Dialog with export settings:
   - Resolution (1080p, 720p, 480p) - Select
   - Format (MP4, WebM) - Select
   - Quality (High, Medium, Low) - RadioGroup
   - Filename - Input

2. Export button to start export
3. Progress bar showing export progress
4. Download button when complete
5. Cancel button to close

Poll /export/status endpoint every 2 seconds.
Show shadcn Progress component.
Use axios to POST timeline data to /export/start.
Download file when complete using blob URL.
```

---

### Step 20: Frontend - Keyboard Shortcuts

**File: `src/hooks/useKeyboardShortcuts.ts`**

**Prompt for Copilot:**

```
Create useKeyboardShortcuts hook:

1. Listen for keyboard events
2. Implement shortcuts:
   - Space: Play/Pause
   - Delete: Delete selected clip
   - Ctrl+C: Copy clip
   - Ctrl+V: Paste clip
   - Ctrl+Z: Undo
   - Ctrl+Y: Redo
   - Left/Right arrows: Move playhead
   - +/-: Zoom in/out

Use useEffect with keydown event listener.
Prevent default browser behavior.
Check for modifier keys (Ctrl, Shift).
Call appropriate timeline actions.
```

---

### Step 21: Frontend - Undo/Redo System

**File: `src/hooks/useUndoRedo.ts`**

**Prompt for Copilot:**

```
Create useUndoRedo hook for timeline history:

1. Maintain history stack of timeline states
2. Methods: undo(), redo(), addToHistory(state)
3. Limit history to last 50 states
4. Track current history position

Store timeline snapshots in array.
Use useCallback for memoization.
Return: undo, redo, canUndo, canRedo, addToHistory.
Integrate with TimelineContext.
```

---

### Step 22: Frontend - Project Save/Load

**File: `src/components/Project/ProjectManager.tsx`**

**Prompt for Copilot:**

```
Create ProjectManager component:

1. Save Project button - Export timeline as JSON file
2. Load Project button - Import JSON and restore state
3. New Project button - Clear timeline
4. Recent projects list

Serialize timeline state to JSON.
Use File API to save/load JSON files.
Store recent projects in localStorage.
Validate JSON structure on load.
```

---

### Step 23: Integration - Connect Frontend and Backend

**File: `src/services/api.ts`**

**Prompt for Copilot:**

```
Create API service layer with axios:

1. Configure base URL and interceptors
2. API methods:
   - uploadMedia(file)
   - getMediaMetadata(id)
   - getWaveform(id)
   - cutVideo(id, cutTime)
   - trimVideo(id, startTime, endTime)
   - startExport(timelineData)
   - getExportStatus(taskId)
   - downloadExport(taskId)

Set axios.defaults.baseURL to backend URL.
Add interceptors for error handling.
Return typed responses with TypeScript interfaces.
Handle file uploads with FormData.
```

---

### Step 24: UI Polish - Theme and Styling

**File: `src/App.tsx`**

**Prompt for Copilot:**

```
Create main App layout:

1. Top toolbar with logo and project controls
2. Left sidebar with ResourcePanel
3. Center area with VideoPlayer
4. Bottom timeline section
5. Right sidebar with properties panel (optional)

Use CSS Grid or Flexbox for layout.
Make resizable panels with drag handles.
Apply shadcn theme (dark mode by default).
Use shadcn Separator for panel dividers.
Responsive: collapse sidebars on small screens.
```

---

### Step 25: Testing and Optimization

**Prompt for Copilot:**

```
Create test files for critical components:

1. src/components/__tests__/Timeline.test.tsx
   - Test clip rendering
   - Test drag and drop
   - Test zoom functionality

2. src/utils/__tests__/clipOperations.test.ts
   - Test cut operation
   - Test trim operation
   - Test duplicate operation

Use React Testing Library and Jest.
Mock timeline context.
Test user interactions with fireEvent.
```

---

## Deployment Steps

### Step 26: Frontend Deployment Setup

**Prompt for Copilot:**

```
Create production build configuration for Vite:

1. Update vite.config.ts with build optimizations:
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "./src"),
    },
  },
  build: {
    outDir: 'dist',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          'react-vendor': ['react', 'react-dom'],
          'video-libs': ['@ffmpeg/ffmpeg', '@ffmpeg/util'],
        },
      },
    },
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true,
      },
    },
  },
})

2. Create .env files:
- .env.development (VITE_API_URL=http://localhost:8000)
- .env.production (VITE_API_URL=https://your-api.com)

3. Update src/services/api.ts to use environment variable:
const API_URL = import.meta.env.VITE_API_URL

4. Create Dockerfile:
FROM node:18-alpine as build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=build /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/conf.d/default.conf
EXPOSE 80

5. Create nginx.conf for serving React app with client-side routing
```

### Step 27: Backend Deployment Setup

**Prompt for Copilot:**

```
Create production deployment files:

1. Dockerfile for Python backend
2. requirements.txt with all dependencies
3. .env for environment variables:
   - DATABASE_URL (if using database)
   - UPLOAD_DIR
   - SECRET_KEY
4. docker-compose.yml to run both frontend and backend

Use gunicorn or uvicorn for production server.
Configure CORS for frontend URL.
Add health check endpoint.
Set up volume mounts for uploaded files.
```

---

## Final Checklist

- [x] Media upload and thumbnail generation working
- [x] Timeline renders clips correctly
- [x] Drag and drop from resources to timeline functional
- [x] Playback works smoothly
- [x] Cut and trim operations working
- [x] Text tool adds text overlays
- [x] Transitions apply correctly
- [x] Audio mixing working
- [x] Export generates final video
- [x] Keyboard shortcuts implemented
- [x] Undo/redo functional
- [x] Project save/load working
- [x] Responsive UI on different screen sizes
- [x] Error handling throughout app
- [x] Documentation complete

---

## Tips for Using with GitHub Copilot

1. **Copy each step's prompt into your code editor** as a comment above where you want the code
2. **Let Copilot generate** the initial implementation
3. **Review and refine** the generated code
4. **Test incrementally** after each step
5. **Use TypeScript types** to help Copilot understand your data structures
6. **Add detailed comments** to guide Copilot's suggestions

Example workflow:

```typescript
// Create a TimelineLayer component:
// 1. Props: layer (TimelineLayer), zoom, onClipSelect, onClipMove
// 2. Render all clips in the layer as draggable rectangles
// ... [rest of prompt]

// Let Copilot generate the component here
```
