import { useCallback, useRef, useState } from 'react';
import type { TimelineState } from '@/context/TimelineContext';

interface UndoRedoHook {
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  addToHistory: (state: TimelineState) => void;
  clearHistory: () => void;
}

const MAX_HISTORY_SIZE = 50;

/**
 * Custom hook for managing undo/redo functionality for timeline states
 * Maintains a history stack with a maximum of 50 states
 */
export function useUndoRedo(
  currentState: TimelineState,
  restoreState: (state: TimelineState) => void
): UndoRedoHook {
  // Use refs to store history to avoid unnecessary re-renders
  const historyRef = useRef<TimelineState[]>([]);
  const currentPositionRef = useRef<number>(-1);

  // Use state for can flags to trigger re-renders when they change
  const [canUndo, setCanUndo] = useState(false);
  const [canRedo, setCanRedo] = useState(false);

  // Update can flags based on current position
  const updateCanFlags = useCallback(() => {
    setCanUndo(currentPositionRef.current > 0);
    setCanRedo(currentPositionRef.current < historyRef.current.length - 1);
  }, []);

  /**
   * Add a new state to the history
   * Clears any future states if we're not at the end of the history
   */
  const addToHistory = useCallback(
    (state: TimelineState) => {
      // Create a deep copy of the state to prevent mutations
      const stateCopy = JSON.parse(JSON.stringify(state)) as TimelineState;

      // If we're not at the end of history, remove all future states
      if (currentPositionRef.current < historyRef.current.length - 1) {
        historyRef.current = historyRef.current.slice(0, currentPositionRef.current + 1);
      }

      // Add new state to history
      historyRef.current.push(stateCopy);

      // Limit history size
      if (historyRef.current.length > MAX_HISTORY_SIZE) {
        historyRef.current.shift();
      } else {
        currentPositionRef.current++;
      }

      updateCanFlags();
    },
    [updateCanFlags]
  );

  /**
   * Undo to the previous state in history
   */
  const undo = useCallback(() => {
    if (currentPositionRef.current > 0) {
      // Save current state before moving back if we're at the end
      if (currentPositionRef.current === historyRef.current.length - 1) {
        const currentStateCopy = JSON.parse(JSON.stringify(currentState)) as TimelineState;
        historyRef.current[currentPositionRef.current] = currentStateCopy;
      }

      currentPositionRef.current--;
      const previousState = historyRef.current[currentPositionRef.current];
      restoreState(previousState);
      updateCanFlags();
    }
  }, [currentState, restoreState, updateCanFlags]);

  /**
   * Redo to the next state in history
   */
  const redo = useCallback(() => {
    if (currentPositionRef.current < historyRef.current.length - 1) {
      currentPositionRef.current++;
      const nextState = historyRef.current[currentPositionRef.current];
      restoreState(nextState);
      updateCanFlags();
    }
  }, [restoreState, updateCanFlags]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    historyRef.current = [];
    currentPositionRef.current = -1;
    updateCanFlags();
  }, [updateCanFlags]);

  return {
    undo,
    redo,
    canUndo,
    canRedo,
    addToHistory,
    clearHistory,
  };
}
