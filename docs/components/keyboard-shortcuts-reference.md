# Keyboard Shortcuts - Quick Reference

## 🚀 Quick Start

```typescript
import { useKeyboardShortcuts } from '@/hooks';

function Timeline() {
  useKeyboardShortcuts();
  return <div>Your timeline</div>;
}
```

## ⌨️ Shortcuts

| Key | Action | Modifier |
|-----|--------|----------|
| `Space` | Play/Pause | - |
| `Delete` / `Backspace` | Delete selected clip | - |
| `Escape` | Deselect clip | - |
| `Home` | Jump to start | - |
| `End` | Jump to end | - |
| `←` | Move playhead back 1s | Add `Shift` for 5s |
| `→` | Move playhead forward 1s | Add `Shift` for 5s |
| `+` / `=` | Zoom in | - |
| `-` | Zoom out | - |
| `C` | Copy selected clip | `Ctrl/Cmd` |
| `V` | Paste clip at playhead | `Ctrl/Cmd` |
| `Z` | Undo | `Ctrl/Cmd` |
| `Y` / `Shift+Z` | Redo | `Ctrl/Cmd` |

## 🎯 Return Values

```typescript
const {
  hasClipboardContent, // boolean - clip in clipboard?
  canUndo,             // boolean - undo available?
  canRedo,             // boolean - redo available?
} = useKeyboardShortcuts();
```

## 📋 Example: UI Integration

```typescript
function Toolbar() {
  const { canUndo, canRedo, hasClipboardContent } = useKeyboardShortcuts();
  
  return (
    <>
      <Button disabled={!canUndo}>Undo</Button>
      <Button disabled={!canRedo}>Redo</Button>
      {hasClipboardContent && <Badge>Clip Copied</Badge>}
    </>
  );
}
```

## 🔧 Options

```typescript
useKeyboardShortcuts({ enabled: boolean }); // default: true
```

## ✅ Tests

Run: `npm test -- useKeyboardShortcuts.test.tsx`

**Result:** 13/13 tests passing ✓

## 📚 Full Documentation

See [`KEYBOARD_SHORTCUTS_README.md`](./KEYBOARD_SHORTCUTS_README.md)
