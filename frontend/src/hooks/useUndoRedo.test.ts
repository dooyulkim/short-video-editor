import { renderHook, act } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import { useUndoRedo } from './useUndoRedo';
import type { TimelineState } from '@/context/TimelineContext';

describe('useUndoRedo', () => {
  const createMockState = (layersCount: number): TimelineState => ({
    layers: Array.from({ length: layersCount }, (_, i) => ({
      id: `layer-${i}`,
      type: 'video' as const,
      clips: [],
      locked: false,
      visible: true,
      name: `Layer ${i}`,
    })),
    currentTime: 0,
    duration: 60,
    zoom: 20,
    selectedClipId: null,
    isPlaying: false,
  });

  it('should initialize with no undo/redo available', () => {
    const mockRestoreState = vi.fn();
    const initialState = createMockState(1);

    const { result } = renderHook(() =>
      useUndoRedo(initialState, mockRestoreState)
    );

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should add states to history', () => {
    const mockRestoreState = vi.fn();
    const initialState = createMockState(1);

    const { result } = renderHook(() =>
      useUndoRedo(initialState, mockRestoreState)
    );

    act(() => {
      result.current.addToHistory(initialState);
    });

    expect(result.current.canUndo).toBe(false); // Position 0, nothing to undo to
    expect(result.current.canRedo).toBe(false);

    const modifiedState = createMockState(2);
    act(() => {
      result.current.addToHistory(modifiedState);
    });

    expect(result.current.canUndo).toBe(true); // Can now undo to previous state
    expect(result.current.canRedo).toBe(false);
  });

  it('should undo to previous state', () => {
    const mockRestoreState = vi.fn();
    const state1 = createMockState(1);
    const state2 = createMockState(2);

    const { result, rerender } = renderHook(
      ({ currentState }) => useUndoRedo(currentState, mockRestoreState),
      { initialProps: { currentState: state1 } }
    );

    act(() => {
      result.current.addToHistory(state1);
    });

    rerender({ currentState: state2 });

    act(() => {
      result.current.addToHistory(state2);
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.undo();
    });

    expect(mockRestoreState).toHaveBeenCalledWith(state1);
    expect(mockRestoreState).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(true);
  });

  it('should redo to next state', () => {
    const mockRestoreState = vi.fn();
    const state1 = createMockState(1);
    const state2 = createMockState(2);

    const { result, rerender } = renderHook(
      ({ currentState }) => useUndoRedo(currentState, mockRestoreState),
      { initialProps: { currentState: state1 } }
    );

    act(() => {
      result.current.addToHistory(state1);
    });

    rerender({ currentState: state2 });

    act(() => {
      result.current.addToHistory(state2);
    });

    act(() => {
      result.current.undo();
    });

    mockRestoreState.mockClear();

    act(() => {
      result.current.redo();
    });

    expect(mockRestoreState).toHaveBeenCalledWith(state2);
    expect(mockRestoreState).toHaveBeenCalledTimes(1);
    expect(result.current.canUndo).toBe(true);
    expect(result.current.canRedo).toBe(false);
  });

  it('should clear future history when adding new state after undo', () => {
    const mockRestoreState = vi.fn();
    const state1 = createMockState(1);
    const state2 = createMockState(2);
    const state3 = createMockState(3);

    const { result, rerender } = renderHook(
      ({ currentState }) => useUndoRedo(currentState, mockRestoreState),
      { initialProps: { currentState: state1 } }
    );

    act(() => {
      result.current.addToHistory(state1);
      result.current.addToHistory(state2);
    });

    // Undo once
    act(() => {
      result.current.undo();
    });

    expect(result.current.canRedo).toBe(true);

    // Add new state - should clear redo history
    rerender({ currentState: state3 });
    act(() => {
      result.current.addToHistory(state3);
    });

    expect(result.current.canRedo).toBe(false);
    expect(result.current.canUndo).toBe(true);
  });

  it('should limit history to maximum size', () => {
    const mockRestoreState = vi.fn();
    const initialState = createMockState(1);

    const { result } = renderHook(() =>
      useUndoRedo(initialState, mockRestoreState)
    );

    // Add 60 states (more than MAX_HISTORY_SIZE of 50)
    for (let i = 0; i < 60; i++) {
      act(() => {
        result.current.addToHistory(createMockState(i + 1));
      });
    }

    // Should still be able to undo
    expect(result.current.canUndo).toBe(true);

    // Count how many times we can undo
    let undoCount = 0;
    while (result.current.canUndo && undoCount < 60) {
      act(() => {
        result.current.undo();
      });
      undoCount++;
    }

    // Should be able to undo at most 49 times (50 states total, starting from last position)
    expect(undoCount).toBeLessThanOrEqual(50);
    expect(undoCount).toBeGreaterThan(0);
  });

  it('should handle undo when at beginning of history', () => {
    const mockRestoreState = vi.fn();
    const initialState = createMockState(1);

    const { result } = renderHook(() =>
      useUndoRedo(initialState, mockRestoreState)
    );

    act(() => {
      result.current.addToHistory(initialState);
    });

    // Try to undo when already at the beginning
    act(() => {
      result.current.undo();
    });

    expect(mockRestoreState).not.toHaveBeenCalled();
    expect(result.current.canUndo).toBe(false);
  });

  it('should handle redo when at end of history', () => {
    const mockRestoreState = vi.fn();
    const state1 = createMockState(1);
    const state2 = createMockState(2);

    const { result, rerender } = renderHook(
      ({ currentState }) => useUndoRedo(currentState, mockRestoreState),
      { initialProps: { currentState: state1 } }
    );

    act(() => {
      result.current.addToHistory(state1);
    });

    rerender({ currentState: state2 });

    act(() => {
      result.current.addToHistory(state2);
    });

    // Try to redo when already at the end
    mockRestoreState.mockClear();
    act(() => {
      result.current.redo();
    });

    expect(mockRestoreState).not.toHaveBeenCalled();
    expect(result.current.canRedo).toBe(false);
  });

  it('should clear history', () => {
    const mockRestoreState = vi.fn();
    const state1 = createMockState(1);
    const state2 = createMockState(2);

    const { result, rerender } = renderHook(
      ({ currentState }) => useUndoRedo(currentState, mockRestoreState),
      { initialProps: { currentState: state1 } }
    );

    act(() => {
      result.current.addToHistory(state1);
    });

    rerender({ currentState: state2 });

    act(() => {
      result.current.addToHistory(state2);
    });

    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.clearHistory();
    });

    expect(result.current.canUndo).toBe(false);
    expect(result.current.canRedo).toBe(false);
  });

  it('should create deep copies of states to prevent mutations', () => {
    const mockRestoreState = vi.fn();
    const state1 = createMockState(1);
    const originalLayerName = state1.layers[0].name;

    const { result } = renderHook(() =>
      useUndoRedo(state1, mockRestoreState)
    );

    act(() => {
      result.current.addToHistory(state1);
    });

    // Mutate the original state
    state1.layers[0].name = 'Modified Name';

    const state2 = createMockState(2);
    act(() => {
      result.current.addToHistory(state2);
    });

    act(() => {
      result.current.undo();
    });

    // The restored state should not have the mutation
    const restoredState = mockRestoreState.mock.calls[0][0];
    expect(restoredState.layers[0].name).toBe(originalLayerName);
    expect(restoredState.layers[0].name).not.toBe('Modified Name');
    // Verify deep copy by checking it's a different object reference
    expect(restoredState).not.toBe(state1);
    expect(restoredState.layers).not.toBe(state1.layers);
    expect(restoredState.layers[0]).not.toBe(state1.layers[0]);
  });
});
