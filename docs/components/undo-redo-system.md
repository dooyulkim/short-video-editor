# Undo/Redo System Documentation

## Overview

The Video Editor implements a robust undo/redo system that tracks timeline state changes and allows users to revert or reapply changes. The system is fully integrated with keyboard shortcuts (Ctrl+Z for undo, Ctrl+Y for redo).

## Architecture

### Core Components

1. **`useUndoRedo` Hook** (`src/hooks/useUndoRedo.ts`)
   - Manages history stack of timeline states
   - Provides undo/redo functionality
   - Limits history to 50 states to prevent memory issues
   - Creates deep copies of states to prevent mutations

2. **TimelineContext Integration** (`src/context/TimelineContext.tsx`)
   - Integrates undo/redo into the global timeline context
   - Automatically tracks structural changes (layers, clips)
   - Debounces history saves to avoid excessive entries
   - Exposes `undo`, `redo`, `canUndo`, `canRedo` methods

3. **UndoRedoControls Component** (`src/components/Toolbar/UndoRedoControls.tsx`)
   - Provides UI buttons for undo/redo
   - Shows tooltips with keyboard shortcuts
   - Disables buttons when no undo/redo available

4. **Keyboard Shortcuts** (`src/hooks/useKeyboardShortcuts.ts`)
   - Ctrl+Z (Windows/Linux) or Cmd+Z (Mac) for undo
   - Ctrl+Y or Ctrl+Shift+Z for redo
   - Integrated with the centralized undo/redo system

## Usage

### Using Undo/Redo in Components

```tsx
import { useTimeline } from '@/context/TimelineContext';

function MyComponent() {
  const { undo, redo, canUndo, canRedo } = useTimeline();

  return (
    <div>
      <button onClick={undo} disabled={!canUndo}>
        Undo
      </button>
      <button onClick={redo} disabled={!canRedo}>
        Redo
      </button>
    </div>
  );
}
```

### Adding the UndoRedoControls to Your Toolbar

```tsx
import { UndoRedoControls } from '@/components/Toolbar/UndoRedoControls';

function Toolbar() {
  return (
    <div className="toolbar">
      {/* Other toolbar items */}
      <UndoRedoControls />
      {/* More toolbar items */}
    </div>
  );
}
```

## What Gets Tracked

The undo/redo system automatically tracks all structural changes to the timeline:

### Clip Operations
- **Adding clips**: Dragging media from library to timeline
- **Removing clips**: Deleting clips via Delete key or toolbar
- **Moving clips**: Dragging clips to new positions
- **Trimming clips**: Resizing clips by dragging edges
- **Updating clip properties**: Transitions, effects, opacity, volume, etc.

### Layer Operations
- **Adding layers**: Creating new video, audio, image, or text layers
- **Removing layers**: Deleting existing layers
- **Reordering layers**: Drag-and-drop layer reordering
- **Renaming layers**: Changing layer names
- **Toggling layer visibility**: Show/hide layers
- **Toggling layer lock**: Lock/unlock layers for editing

### Timeline Operations
- **Duration changes**: Timeline extension when clips are added beyond current duration

The system **does NOT** track:

- Playback state (play/pause)
- Current time position
- Zoom level
- Selected clip (UI state)

This design ensures that undo/redo focuses on content changes rather than UI interactions.

## Technical Details

### History Management

- **Maximum history size**: 50 states
- **Storage method**: Deep cloning using JSON serialization
- **Debounce delay**: 300ms to group rapid changes
- **Memory management**: Automatically removes oldest states when limit reached

### State Restoration

When undo/redo is triggered:
1. The current position in history is moved
2. The state at that position is retrieved
3. A `RESTORE_STATE` action is dispatched
4. The entire timeline state is replaced with the historical state

### Performance Considerations

- **Deep cloning**: Uses `JSON.parse(JSON.stringify())` for simplicity
  - Fast enough for typical timeline states
  - Consider alternative methods for very large timelines (>100 clips)
- **Debouncing**: Prevents creating too many history entries during rapid edits
- **Selective tracking**: Only tracks structural changes, not playback state

## Testing

The undo/redo system includes comprehensive tests covering:

- ✅ Initial state (no undo/redo available)
- ✅ Adding states to history
- ✅ Undoing to previous state
- ✅ Redoing to next state
- ✅ Clearing future history after undo + new action
- ✅ History size limiting
- ✅ Edge cases (undo at beginning, redo at end)
- ✅ Deep copying to prevent mutations

Run tests with:
```bash
npm test useUndoRedo
```

## Future Enhancements

Potential improvements for the undo/redo system:

1. **Compressed History**: Use diff-based storage to reduce memory usage
2. **Selective Undo**: Allow undoing specific actions without reverting everything
3. **History Browser**: UI to visualize and jump to any point in history
4. **Persistent History**: Save history to localStorage for session recovery
5. **Action Labels**: Show descriptive labels for each history entry ("Added clip", "Moved clip", etc.)

## API Reference

### `useUndoRedo` Hook

```typescript
function useUndoRedo(
  currentState: TimelineState,
  restoreState: (state: TimelineState) => void
): {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  addToHistory: (state: TimelineState) => void;
  clearHistory: () => void;
}
```

**Parameters:**
- `currentState`: Current timeline state to track
- `restoreState`: Callback to restore a historical state

**Returns:**
- `undo()`: Move back one state in history
- `redo()`: Move forward one state in history
- `canUndo`: Whether undo is available
- `canRedo`: Whether redo is available
- `addToHistory()`: Manually add a state to history
- `clearHistory()`: Clear all history

### TimelineContext Methods

```typescript
const { undo, redo, canUndo, canRedo } = useTimeline();
```

- `undo()`: Undo the last change
- `redo()`: Redo the last undone change
- `canUndo`: Boolean indicating if undo is possible
- `canRedo`: Boolean indicating if redo is possible

## Troubleshooting

### Undo/Redo not working

1. **Check if changes are being tracked**: Only structural changes to `layers` and `duration` are tracked
2. **Verify TimelineProvider**: Ensure your component is wrapped in `TimelineProvider`
3. **Check debounce timing**: Changes may take 300ms to be added to history

### History not clearing after undo

This is expected behavior. The redo history is only cleared when you make a new change after undoing.

### Memory issues with large timelines

If you notice performance issues:
1. Reduce `MAX_HISTORY_SIZE` in `useUndoRedo.ts`
2. Increase the debounce delay in `TimelineContext.tsx`
3. Consider implementing diff-based storage for large projects

## Examples

### Example 1: Custom Undo/Redo UI

```tsx
import { useTimeline } from '@/context/TimelineContext';
import { RotateCcw, RotateCw } from 'lucide-react';

function CustomUndoRedo() {
  const { undo, redo, canUndo, canRedo } = useTimeline();

  return (
    <div className="flex gap-2">
      <button
        onClick={undo}
        disabled={!canUndo}
        className="p-2 hover:bg-gray-100 disabled:opacity-50"
        title="Undo (Ctrl+Z)"
      >
        <RotateCcw size={18} />
      </button>
      <button
        onClick={redo}
        disabled={!canRedo}
        className="p-2 hover:bg-gray-100 disabled:opacity-50"
        title="Redo (Ctrl+Y)"
      >
        <RotateCw size={18} />
      </button>
    </div>
  );
}
```

### Example 2: Undo/Redo with Status Display

```tsx
import { useTimeline } from '@/context/TimelineContext';

function UndoRedoStatus() {
  const { canUndo, canRedo } = useTimeline();

  return (
    <div className="text-sm text-gray-600">
      {canUndo && <span>Undo available</span>}
      {!canUndo && canRedo && <span>At start of history</span>}
      {canRedo && <span> | Redo available</span>}
      {!canUndo && !canRedo && <span>No history</span>}
    </div>
  );
}
```

### Example 3: Manual History Management

```tsx
import { useTimeline } from '@/context/TimelineContext';

function BatchOperations() {
  const timeline = useTimeline();

  const performBatchEdit = () => {
    // Perform multiple operations
    // History is automatically tracked via debouncing
    timeline.addClip(clip1, 0);
    timeline.addClip(clip2, 0);
    timeline.addClip(clip3, 1);
    
    // All these changes will be grouped into one history entry
    // due to the 300ms debounce
  };

  return (
    <button onClick={performBatchEdit}>
      Add Multiple Clips
    </button>
  );
}
```
