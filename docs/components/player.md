# Video Preview Player - Step 16 Implementation

This implementation provides a complete video preview system with playback controls for the video editor.

## Components Created

### 1. `useVideoPlayback.ts` Hook
**Location:** `src/hooks/useVideoPlayback.ts`

A custom React hook for managing video playback control with smooth animation using `requestAnimationFrame`.

**Features:**
- **State Management:** `isPlaying`, `currentTime`
- **30 FPS Playback:** Uses `requestAnimationFrame` with frame throttling for smooth playback
- **Playback Methods:**
  - `play()` - Start playback
  - `pause()` - Pause playback
  - `seek(time)` - Jump to specific time
  - `stop()` - Stop and reset to beginning
  - `togglePlayPause()` - Toggle play/pause state
- **Auto-pause:** Automatically pauses when reaching the end of the timeline
- **Frame Synchronization:** Calculates deltaTime between frames for accurate time updates
- **Cleanup:** Properly cancels animation frames on unmount

**Usage:**
```typescript
const { isPlaying, currentTime, play, pause, seek, stop, togglePlayPause } = useVideoPlayback();
```

### 2. `VideoPlayer.tsx` Component
**Location:** `src/components/Player/VideoPlayer.tsx`

A canvas-based video preview player that renders composite video with multiple layers.

**Features:**
- **Canvas Rendering:** Uses HTML5 Canvas for compositing multiple video layers
- **Multi-layer Support:** Renders video, image, and text clips from all visible layers
- **Layer Ordering:** Renders clips from bottom to top based on layer order
- **Transition Effects:** Applies fade in/out transitions to clips
- **Text Overlays:** Renders text clips with customizable fonts, colors, and positioning
- **Transformations:** Supports position, scale, rotation, and opacity
- **Video Synchronization:** Syncs video playback with timeline currentTime
- **Trim Support:** Respects clip trim start/end times
- **Lazy Loading:** Loads video elements on demand

**Props:**
```typescript
interface VideoPlayerProps {
  width?: number;      // Canvas width (default: 1920)
  height?: number;     // Canvas height (default: 1080)
  className?: string;  // Additional CSS classes
}
```

**Rendering Pipeline:**
1. Load video elements for all video clips
2. Get visible clips at current time
3. Sort clips by layer order (bottom to top)
4. Clear canvas with black background
5. For each visible clip:
   - Calculate local time within clip
   - Apply transformations (position, scale, rotation)
   - Calculate transition opacity
   - Draw video frame, image, or text
6. Redraw on currentTime changes

### 3. `VideoPlayerExample.tsx`
**Location:** `src/components/Player/VideoPlayerExample.tsx`

Example component demonstrating how to integrate the VideoPlayer with playback controls.

**Features:**
- Video preview display
- Playback control buttons (Play, Pause, Stop)
- Time display overlay
- Responsive aspect ratio container

## Integration with Timeline

The VideoPlayer integrates with the Timeline system through the `TimelineContext`:

1. **State Sync:** Reads `currentTime`, `layers`, and `isPlaying` from context
2. **Playback Control:** Uses context methods `play()` and `pause()`
3. **Time Updates:** Updates context `currentTime` during playback

## Technical Details

### Video Element Management
- Video elements are cached in a Map keyed by `resourceId`
- Videos are preloaded with `preload='auto'`
- Cross-origin enabled for external media sources
- Muted by default (audio handled separately by AudioMixer)

### Canvas Rendering
- Renders at full HD (1920x1080) by default
- Scales to fit container using CSS `object-contain`
- Uses `requestAnimationFrame` for smooth updates
- Efficient redrawing only when `currentTime` changes

### Transition Support
Currently supports:
- **Fade In:** Gradual opacity increase at clip start
- **Fade Out:** Gradual opacity decrease at clip end

Extensible to support:
- Cross Dissolve
- Wipe transitions
- Slide transitions

### Text Rendering
Text clips support:
- Custom fonts and sizes
- Color and stroke
- Text alignment and baseline
- Position and opacity
- Fade transitions

## Performance Considerations

1. **Frame Throttling:** Playback limited to 30 FPS to reduce CPU usage
2. **Video Caching:** Video elements reused across renders
3. **Conditional Rendering:** Only visible clips are processed
4. **Canvas Optimization:** State save/restore used efficiently
5. **RequestAnimationFrame:** Native browser optimization for smooth animation

## Dependencies

- React hooks (`useState`, `useEffect`, `useRef`, `useCallback`)
- TimelineContext for state management
- Canvas API for rendering
- HTML5 Video elements

## Future Enhancements

1. **WebGL Rendering:** For better performance with many layers
2. **Hardware Acceleration:** Use GPU for video decoding and compositing
3. **Advanced Transitions:** Implement wipe, slide, and custom transitions
4. **Effects Pipeline:** Support for filters, color grading, and effects
5. **Audio Visualization:** Waveform overlay during playback
6. **Thumbnail Preview:** Show frame preview on hover in timeline
7. **Quality Settings:** Allow preview quality adjustment for performance

## Testing

To test the implementation:

1. Add clips to the timeline
2. Click play button
3. Verify smooth playback at 30 FPS
4. Test pause, stop, and seek functionality
5. Add text clips and verify rendering
6. Test transitions on clips
7. Verify auto-pause at end of timeline

## API Endpoints Required

The VideoPlayer expects the following backend endpoints:

- `GET /api/media/{resourceId}/file` - Returns the media file for playback
- `GET /api/media/{resourceId}/metadata` - Returns media metadata (duration, dimensions, etc.)

## Notes

- Video playback requires proper CORS headers from backend
- Large video files may take time to load; consider showing loading state
- For production, consider implementing video streaming instead of full file loading
- Text rendering uses Canvas API which may have font rendering differences across browsers
