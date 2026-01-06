# Video Editor - Frontend Layout Guide

## Overview
The application now features a professional video editor layout similar to industry-standard editing software.

## Layout Structure

```
┌─────────────────────────────────────────────────────────────┐
│  Top Toolbar - File operations, Tool tabs                    │
├──────────┬──────────────────────────────────────────────────┤
│          │                                                   │
│ Resource │          Video Player Preview                    │
│  Panel   │                                                   │
│          │                                                   │
│          ├──────────────────────────────────────────────────┤
│          │  Edit Tools                                       │
│          ├──────────────────────────────────────────────────┤
│          │  Timeline with Layers & Clips                    │
│          │                                                   │
└──────────┴──────────────────────────────────────────────────┘
```

## Components

### 1. **Top Toolbar** (`TopToolbar.tsx`)
- **Location**: Top of the screen
- **Features**:
  - Logo and branding
  - File operations (Save, Open, Export)
  - Tool tabs (Media, Audio, Text, Transitions, etc.)
  - Active tab highlighting

### 2. **Resource Panel** (`ResourcePanel.tsx`)
- **Location**: Left sidebar (320px width)
- **Features**:
  - Drag-and-drop file upload
  - Media library with thumbnails
  - Filter tabs (All/Video/Audio/Images)
  - Progress indicators for uploads
  - Hover metadata display

### 3. **Video Player** (`VideoPlayer.tsx`)
- **Location**: Center-top area
- **Features**:
  - Real-time preview canvas
  - Composite rendering of all layers
  - Responsive aspect ratio (16:9)
  - Black background with shadow

### 4. **Edit Tools** (`EditTools.tsx`)
- **Location**: Above timeline
- **Features**:
  - Cut, Trim, Delete, Duplicate buttons
  - Context-aware enable/disable states
  - Keyboard shortcuts integration

### 5. **Timeline** (`Timeline.tsx`)
- **Location**: Bottom section (350px height)
- **Features**:
  - Multi-layer track system
  - Time ruler with markers
  - Draggable playhead
  - Zoom controls
  - Horizontal scrolling
  - Clip visualization

## Styling

### Dark Theme
- Applied by default via `class="dark"` on `<html>` element
- Professional dark color scheme
- High contrast for readability

### Color Scheme
- **Background**: Dark zinc/slate tones
- **Timeline**: Darker zinc-900
- **Player area**: Pure black with subtle zinc-950 background
- **Borders**: Subtle borders for separation
- **Accent**: Primary theme color for active states

### Responsive Design
- Fixed height layout (100vh)
- Flexible video player area
- Fixed timeline height
- Scrollable resource panel
- Overflow handling on all panels

## Usage

### Running the Application
```bash
cd frontend
npm install
npm run dev
```

### Adding Media
1. Click on "Media" tab in top toolbar
2. Drag and drop files into the resource panel
3. Or click to browse and select files
4. Uploaded media appears with thumbnails

### Editing Workflow
1. Upload media files
2. Drag clips from Resource Panel to Timeline
3. Use Edit Tools to cut, trim, or arrange clips
4. Preview changes in the Video Player
5. Export final video

## Development Notes

### Key Dependencies
- **React 19** - UI framework
- **shadcn/ui** - Component library
- **Radix UI** - Primitives for accessible components
- **Lucide React** - Icon library
- **Tailwind CSS** - Styling
- **React Dropzone** - File uploads

### Future Enhancements
- Resizable panels with drag handles
- Right sidebar for properties panel
- Minimap for timeline navigation
- Waveform visualization for audio
- Real-time effects preview
- Collaborative editing features

## File Structure

```
src/
├── App.tsx                          # Main app layout
├── App.css                          # Global app styles
├── components/
│   ├── Toolbar/
│   │   ├── TopToolbar.tsx          # Main toolbar
│   │   └── EditTools.tsx           # Editing tools
│   ├── ResourcePanel.tsx           # Media library
│   ├── Player/
│   │   └── VideoPlayer.tsx         # Video preview
│   ├── Timeline/
│   │   ├── Timeline.tsx            # Main timeline
│   │   ├── TimelineLayer.tsx       # Layer component
│   │   ├── TimelineClip.tsx        # Clip component
│   │   └── TimelineRuler.tsx       # Time ruler
│   └── TransitionPanel.tsx         # Transition presets
├── context/
│   └── TimelineContext.tsx         # Global state
└── types/
    ├── timeline.ts                 # Timeline types
    └── media.ts                    # Media types
```

## Tips

1. **Performance**: The canvas-based timeline provides smooth scrolling and rendering
2. **Shortcuts**: Use keyboard shortcuts for faster editing (Space to play/pause, etc.)
3. **Organization**: Use layers to organize different types of content (video, audio, text)
4. **Preview**: Player updates in real-time as you edit the timeline
5. **Export**: Configure export settings before rendering final video
