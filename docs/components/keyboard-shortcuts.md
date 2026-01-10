# Keyboard Shortcuts Hook

## Overview

The `useKeyboardShortcuts` hook provides comprehensive keyboard shortcut support for the video editor application. It enables users to efficiently navigate and control the timeline using familiar keyboard commands.

## Installation

```typescript
import { useKeyboardShortcuts } from "@/hooks";
```

## Usage

### Basic Usage

Simply call the hook in your main Timeline or App component:

```typescript
function Timeline() {
	const { hasClipboardContent, canUndo, canRedo } = useKeyboardShortcuts();

	return (
		<div>
			{/* Your timeline UI */}
			{hasClipboardContent && <div>Clip in clipboard</div>}
		</div>
	);
}
```

### With Options

You can enable/disable the shortcuts dynamically:

```typescript
function Timeline() {
	const [shortcutsEnabled, setShortcutsEnabled] = useState(true);

	useKeyboardShortcuts({ enabled: shortcutsEnabled });

	return (
		<div>
			<button onClick={() => setShortcutsEnabled(!shortcutsEnabled)}>Toggle Shortcuts</button>
			{/* Your timeline UI */}
		</div>
	);
}
```

## Supported Shortcuts

### Playback Controls

- **Space**: Play/Pause the timeline
- **Home**: Jump to the beginning (0:00)
- **End**: Jump to the end of the timeline

### Navigation

- **Arrow Left**: Move playhead backward by 1 second
- **Arrow Right**: Move playhead forward by 1 second
- **Shift + Arrow Left**: Move playhead backward by 5 seconds
- **Shift + Arrow Right**: Move playhead forward by 5 seconds

### Zoom Controls

- **+ or =**: Zoom in (increase pixels per second)
- **-**: Zoom out (decrease pixels per second)

### Clip Operations

- **Delete**: Delete the currently selected clip
- **Ctrl/Cmd + C**: Copy the selected clip to clipboard
- **Ctrl/Cmd + V**: Paste clip from clipboard at current playhead position
- **Escape**: Deselect the currently selected clip

### Undo/Redo (Planned)

- **Ctrl/Cmd + Z**: Undo last action
- **Ctrl/Cmd + Y** or **Ctrl/Cmd + Shift + Z**: Redo last undone action

> **Note**: Undo/Redo functionality requires additional TimelineContext methods to fully implement state restoration. Currently logs actions to console.

## Return Values

The hook returns an object with the following properties:

```typescript
interface UseKeyboardShortcutsReturn {
	hasClipboardContent: boolean; // True if a clip is copied to clipboard
	canUndo: boolean; // True if undo is available
	canRedo: boolean; // True if redo is available
}
```

### Use Cases for Return Values

- **hasClipboardContent**: Show a "Paste" button or indicator in the UI
- **canUndo/canRedo**: Enable/disable undo/redo buttons in the toolbar

## Features

### Input Field Detection

The hook automatically detects when the user is typing in an input field, textarea, or contentEditable element, and disables shortcuts in those contexts to prevent interference.

### Dialog Detection

The hook also detects when focus is within a dialog (elements with `role="dialog"`), and disables shortcuts to prevent accidental clip deletion or other unintended actions while editing text or interacting with modal dialogs.

### Cross-Platform Support

Supports both:

- **Ctrl** key on Windows/Linux
- **Cmd (⌘)** key on macOS

### History Management

- Maintains up to 50 undo/redo states
- Automatically manages history stack
- Preserves complete timeline state including layers, clips, and playhead position

### Copy/Paste System

- Clips are deep-cloned when copied to prevent reference issues
- Pasted clips get new unique IDs
- Pasted clips are placed at the current playhead position
- Automatically selects the pasted clip

## Integration with TimelineContext

The hook relies on the following actions from `TimelineContext`:

- `play()` - Start playback
- `pause()` - Pause playback
- `removeClip(clipId)` - Delete a clip
- `setCurrentTime(time)` - Move playhead
- `setZoom(zoom)` - Adjust timeline zoom
- `addClip(clip, layerIndex)` - Add a clip to the timeline
- `setSelectedClip(clipId)` - Select/deselect clips

## Future Enhancements

1. **Full Undo/Redo Implementation**

   - Add `setState` or batch update method to TimelineContext
   - Restore complete timeline state from history

2. **Additional Shortcuts**

   - Ctrl+A: Select all clips
   - Ctrl+D: Duplicate selected clip
   - Ctrl+X: Cut clip
   - J/K/L: Playback speed control
   - I/O: Set in/out points

3. **Customizable Shortcuts**

   - Allow users to customize keyboard shortcuts
   - Preferences/settings panel

4. **Visual Feedback**
   - Toast notifications for actions
   - Keyboard shortcut overlay/cheatsheet

## Testing

Run tests with:

```bash
npm test useKeyboardShortcuts.test.ts
```

The test suite covers:

- All individual keyboard shortcuts
- Modifier key combinations
- Input field detection
- Dialog detection (prevents shortcuts when focus is within dialogs)
- Enable/disable functionality
- Copy/paste clipboard operations

## Example Implementation

```typescript
import React from "react";
import { useKeyboardShortcuts } from "@/hooks";
import { Button } from "@/components/ui/button";
import { Undo, Redo, Clipboard } from "lucide-react";

function Toolbar() {
	const { hasClipboardContent, canUndo, canRedo } = useKeyboardShortcuts();

	return (
		<div className="flex gap-2">
			<Button disabled={!canUndo} title="Undo (Ctrl+Z)">
				<Undo className="w-4 h-4" />
			</Button>

			<Button disabled={!canRedo} title="Redo (Ctrl+Y)">
				<Redo className="w-4 h-4" />
			</Button>

			{hasClipboardContent && (
				<div className="flex items-center gap-1 text-sm text-muted-foreground">
					<Clipboard className="w-4 h-4" />
					<span>Clip in clipboard</span>
				</div>
			)}
		</div>
	);
}
```

## Browser Compatibility

The hook uses standard Web APIs that are supported in all modern browsers:

- Chrome/Edge 90+
- Firefox 88+
- Safari 14+

## Performance Considerations

- Event listeners are properly cleaned up on unmount
- Uses `useCallback` and `useRef` to avoid unnecessary re-renders
- History is capped at 50 states to prevent memory issues
- Deep cloning uses `JSON.parse(JSON.stringify())` for simplicity (consider alternatives for large datasets)

## Troubleshooting

### Shortcuts not working

1. Check that the hook is being called in a component wrapped by `TimelineProvider`
2. Verify that `enabled` option is not set to `false`
3. Ensure focus is not in an input field
4. Check browser console for any errors

### Paste not working

1. Ensure a clip has been copied first (Ctrl+C)
2. Verify that a suitable layer exists for the clip type
3. Check that the target layer is not locked

### Undo/Redo not working

Currently, undo/redo requires additional implementation in `TimelineContext`. Check console logs to verify that history is being tracked.
