import { useKeyboardShortcuts } from '@/hooks';
import { Button } from '@/components/ui/button';
import { 
  Undo, 
  Redo, 
  Clipboard,
  Keyboard
} from 'lucide-react';

/**
 * Example component demonstrating keyboard shortcuts integration
 * This shows how to use the useKeyboardShortcuts hook and display UI indicators
 * Note: Tooltip component would need to be installed via shadcn/ui
 */
export function KeyboardShortcutsExample() {
  const { hasClipboardContent, canUndo, canRedo } = useKeyboardShortcuts();

  return (
    <div className="flex items-center gap-2 p-2 border rounded-md bg-background">
      {/* Undo Button */}
      <Button
        variant="ghost"
        size="sm"
        disabled={!canUndo}
        aria-label="Undo"
        title="Undo (Ctrl+Z)"
      >
        <Undo className="w-4 h-4" />
      </Button>

      {/* Redo Button */}
      <Button
        variant="ghost"
        size="sm"
        disabled={!canRedo}
        aria-label="Redo"
        title="Redo (Ctrl+Y)"
      >
        <Redo className="w-4 h-4" />
      </Button>

      {/* Clipboard Indicator */}
      {hasClipboardContent && (
        <div 
          className="flex items-center gap-1.5 px-2 py-1 text-sm text-muted-foreground bg-muted rounded"
          title="Press Ctrl+V to paste"
        >
          <Clipboard className="w-3.5 h-3.5" />
          <span>Clip copied</span>
        </div>
      )}

      {/* Keyboard Shortcuts Help */}
      <Button
        variant="ghost"
        size="sm"
        aria-label="Keyboard shortcuts"
        title="View keyboard shortcuts"
      >
        <Keyboard className="w-4 h-4" />
      </Button>
    </div>
  );
}

/**
 * Minimal integration example - just enable shortcuts without UI
 */
export function MinimalKeyboardShortcuts() {
  useKeyboardShortcuts();
  return null;
}

/**
 * Conditional keyboard shortcuts - can be toggled on/off
 */
export function ConditionalKeyboardShortcuts({ enabled }: { enabled: boolean }) {
  useKeyboardShortcuts({ enabled });
  return null;
}
