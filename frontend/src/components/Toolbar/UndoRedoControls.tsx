import { Button } from "@/components/ui/button";
import { useTimeline } from "@/context/TimelineContext";
import { Undo2, Redo2 } from "lucide-react";

/**
 * UndoRedoControls component provides UI buttons for undo/redo functionality
 * 
 * Features:
 * - Undo button with keyboard shortcut display (Ctrl+Z)
 * - Redo button with keyboard shortcut display (Ctrl+Y)
 * - Buttons disabled when no undo/redo available
 * 
 * Usage:
 * ```tsx
 * <UndoRedoControls />
 * ```
 */
export function UndoRedoControls() {
  const { undo, redo, canUndo, canRedo } = useTimeline();

  return (
    <div className="flex gap-1">
      <Button
        variant="ghost"
        size="icon"
        onClick={undo}
        disabled={!canUndo}
        aria-label="Undo (Ctrl+Z)"
        title="Undo (Ctrl+Z)"
      >
        <Undo2 className="h-4 w-4" />
      </Button>

      <Button
        variant="ghost"
        size="icon"
        onClick={redo}
        disabled={!canRedo}
        aria-label="Redo (Ctrl+Y)"
        title="Redo (Ctrl+Y)"
      >
        <Redo2 className="h-4 w-4" />
      </Button>
    </div>
  );
}
