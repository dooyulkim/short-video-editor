# Text Tool Implementation

This directory contains components for adding and managing text overlays in the video editor.

## Components

### TextEditor
A dialog component that allows users to add text clips to the timeline with customizable properties:
- Text content (multi-line support)
- Font family selection
- Font size with slider control
- Color picker
- Position (X, Y coordinates)
- Duration
- Animation options (none, fade, slide)
- Live preview panel

**Usage:**
```tsx
import { TextEditor } from '@/components/TextTool';

<TextEditor 
  onAddText={(clip) => {
    // Add the text clip to your timeline
    addClipToTimeline(clip);
  }}
/>
```

### TextClip
A component that renders text on a canvas element for the video preview. It handles:
- Text visibility based on current playhead time
- Multi-line text rendering
- Font property application
- Animation effects (fade in/out, slide in)
- Text transformations (scale, rotation)
- Text shadows for better visibility

**Usage:**
```tsx
import { TextClip } from '@/components/Timeline/TextClip';

<TextClip
  clip={textClip}
  currentTime={currentTime}
  canvasContext={canvasContext}
  canvasWidth={1920}
  canvasHeight={1080}
/>
```

### Utility Functions

#### measureText
Measures the dimensions of text with given properties:
```tsx
import { measureText } from '@/components/Timeline/TextClip';

const { width, height } = measureText(
  'Hello World',
  'Arial',
  48,
  canvasContext
);
```

#### renderTextClipThumbnail
Generates a thumbnail image for text clips on the timeline:
```tsx
import { renderTextClipThumbnail } from '@/components/Timeline/TextClip';

const thumbnailDataUrl = renderTextClipThumbnail(textClip, 100, 60);
```

## Data Structure

Text clips use the `Clip` interface with a `data` property containing:
```typescript
{
  type: 'text',
  text: string,
  fontFamily: string,
  fontSize: number,
  color: string,
  animation?: 'none' | 'fade' | 'slide'
}
```

## Features

- ✅ Multi-line text support
- ✅ 10 font family options
- ✅ Font size range: 12px - 200px
- ✅ Color picker with hex input
- ✅ Adjustable position
- ✅ Configurable duration
- ✅ Animation effects (fade, slide)
- ✅ Live preview panel
- ✅ Canvas rendering with proper layering
- ✅ Text shadows for visibility
- ✅ Timeline thumbnail generation
