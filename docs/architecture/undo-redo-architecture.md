# Undo/Redo System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    Video Editor Application                      │
└─────────────────────────────────────────────────────────────────┘
                                │
                                ▼
┌─────────────────────────────────────────────────────────────────┐
│                     TimelineProvider                             │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  useReducer(timelineReducer, initialState)               │  │
│  │    - Manages layers, clips, currentTime, zoom, etc.      │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                │                                 │
│                                ▼                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  useUndoRedo(state, restoreState)                        │  │
│  │    - Maintains history: TimelineState[]                  │  │
│  │    - Tracks position: currentPositionRef                 │  │
│  │    - Limits: MAX_HISTORY_SIZE = 50                       │  │
│  │    Returns:                                              │  │
│  │      • undo()                                            │  │
│  │      • redo()                                            │  │
│  │      • canUndo                                           │  │
│  │      • canRedo                                           │  │
│  │      • addToHistory()                                    │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                │                                 │
│                                ▼                                 │
│  ┌───────────────────────────────────────────────────────────┐  │
│  │  useEffect with debounce (300ms)                         │  │
│  │    - Watches: state.layers, state.duration               │  │
│  │    - Calls: addToHistory(state)                          │  │
│  └───────────────────────────────────────────────────────────┘  │
│                                                                  │
│  Context Value Exposed:                                         │
│    { undo, redo, canUndo, canRedo, ...other timeline methods } │
└─────────────────────────────────────────────────────────────────┘
                                │
                ┌───────────────┴───────────────┐
                ▼                               ▼
┌───────────────────────────┐   ┌───────────────────────────┐
│   UndoRedoControls        │   │  useKeyboardShortcuts     │
│   (UI Component)          │   │  (Hook)                   │
│                           │   │                           │
│  ┌─────────────────────┐  │   │  Listens for:            │
│  │ [Undo] [Redo]       │  │   │    Ctrl+Z → undo()       │
│  │  Uses:              │  │   │    Ctrl+Y → redo()       │
│  │  • undo()           │  │   │                           │
│  │  • redo()           │  │   │  Uses:                   │
│  │  • canUndo          │  │   │    const { undo, redo,   │
│  │  • canRedo          │  │   │            canUndo,      │
│  │                     │  │   │            canRedo }     │
│  │  Disabled when      │  │   │           = useTimeline()│
│  │  !canUndo/!canRedo  │  │   │                           │
│  └─────────────────────┘  │   └───────────────────────────┘
└───────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    History Stack (in useUndoRedo)                │
│                                                                  │
│  historyRef.current: [state0, state1, state2, state3, ...]     │
│                             ▲                                    │
│  currentPositionRef.current: 2 (points here)                    │
│                                                                  │
│  Operations:                                                    │
│  • undo():  currentPosition-- → restore previous state         │
│  • redo():  currentPosition++ → restore next state             │
│  • addToHistory(): push state, clear future if not at end      │
│                                                                  │
│  Example Flow:                                                  │
│  1. Initial: []                                                 │
│  2. Add clip: [state1]              position=0                 │
│  3. Move clip: [state1, state2]     position=1                 │
│  4. Undo: [state1, state2]          position=0 → restore state1│
│  5. Add new: [state1, state3]       position=1 (state2 cleared)│
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Timeline Reducer Actions                      │
│                                                                  │
│  User Actions (create history):                                 │
│  • ADD_CLIP                                                     │
│  • REMOVE_CLIP                                                  │
│  • UPDATE_CLIP                                                  │
│  • MOVE_CLIP                                                    │
│  • TRIM_CLIP                                                    │
│  • ADD_LAYER                                                    │
│  • REMOVE_LAYER                                                 │
│                                                                  │
│  Playback Actions (no history):                                 │
│  • SET_CURRENT_TIME                                             │
│  • SET_ZOOM                                                     │
│  • PLAY                                                         │
│  • PAUSE                                                        │
│  • SET_SELECTED_CLIP                                            │
│                                                                  │
│  Undo/Redo Action:                                              │
│  • RESTORE_STATE → replaces entire state with historical state  │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│                    Data Flow Example                             │
│                                                                  │
│  1. User clicks "Add Clip"                                      │
│        ↓                                                         │
│  2. addClip() dispatches ADD_CLIP action                        │
│        ↓                                                         │
│  3. Reducer updates state.layers                                │
│        ↓                                                         │
│  4. useEffect detects state.layers change (debounced 300ms)     │
│        ↓                                                         │
│  5. addToHistory(state) saves current state                     │
│        ↓                                                         │
│  6. canUndo becomes true → Undo button enabled                  │
│        ↓                                                         │
│  7. User presses Ctrl+Z                                         │
│        ↓                                                         │
│  8. undo() retrieves previous state                             │
│        ↓                                                         │
│  9. restoreState() dispatches RESTORE_STATE                     │
│        ↓                                                         │
│  10. Reducer replaces state → clip removed from timeline        │
│        ↓                                                         │
│  11. canRedo becomes true → Redo button enabled                 │
└─────────────────────────────────────────────────────────────────┘
```

## Key Concepts

### 1. Deep Copying
```typescript
// Creates isolated snapshot to prevent mutations
const stateCopy = JSON.parse(JSON.stringify(state));
```

### 2. Debouncing
```typescript
// Groups rapid changes into single history entry
useEffect(() => {
  const timeoutId = setTimeout(() => {
    addToHistory(state);
  }, 300);
  return () => clearTimeout(timeoutId);
}, [state.layers, state.duration]);
```

### 3. History Branching
```
Initial:  [A] → [B] → [C]
                      ↑ position

Undo:     [A] → [B] → [C]
                ↑ position

Add D:    [A] → [B] → [D]  (C is removed)
                      ↑ position
```

### 4. Memory Management
```
MAX_HISTORY_SIZE = 50

If history.length > 50:
  history.shift()  // Remove oldest
  position--       // Adjust position
```

## Performance Characteristics

| Operation | Time Complexity | Space Complexity |
|-----------|-----------------|------------------|
| Add to history | O(n)* | O(n) |
| Undo | O(1) | O(1) |
| Redo | O(1) | O(1) |
| Clear history | O(1) | - |

*O(n) due to JSON serialization where n = size of state

## Testing Strategy

```
useUndoRedo.test.ts
├── ✓ Initial state
├── ✓ Add to history
├── ✓ Undo
├── ✓ Redo
├── ✓ Clear future on new action
├── ✓ History size limit
├── ✓ Edge cases
└── ✓ Deep copy verification
```
