import { renderHook, waitFor } from '@testing-library/react';
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { useKeyboardShortcuts } from './useKeyboardShortcuts';
import type { ReactNode } from 'react';
import type { Clip } from '../types/timeline';

// Mock timeline actions
const mockPlay = vi.fn();
const mockPause = vi.fn();
const mockRemoveClip = vi.fn();
const mockSetCurrentTime = vi.fn();
const mockSetZoom = vi.fn();
const mockAddClip = vi.fn();
const mockSetSelectedClip = vi.fn();

// Mock the useTimeline hook
vi.mock('../context/TimelineContext', () => ({
  useTimeline: () => ({
    state: {
      isPlaying: false,
      selectedClipId: 'clip-1',
      currentTime: 10,
      duration: 60,
      zoom: 20,
      layers: [
        {
          id: 'layer-1',
          type: 'video' as const,
          clips: [
            {
              id: 'clip-1',
              resourceId: 'resource-1',
              startTime: 5,
              duration: 10,
              trimStart: 0,
              trimEnd: 0,
              data: {
                type: 'video' as const,
              },
            } as Clip,
          ],
          locked: false,
          visible: true,
          name: 'Video Layer 1',
        },
      ],
    },
    play: mockPlay,
    pause: mockPause,
    removeClip: mockRemoveClip,
    setCurrentTime: mockSetCurrentTime,
    setZoom: mockSetZoom,
    addClip: mockAddClip,
    setSelectedClip: mockSetSelectedClip,
  }),
}));

describe('useKeyboardShortcuts', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

  it('should toggle play/pause on Space key', async () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    window.dispatchEvent(spaceEvent);

    await waitFor(() => {
      expect(mockPlay).toHaveBeenCalledTimes(1);
    });
  });

  it('should delete selected clip on Delete key', async () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const deleteEvent = new KeyboardEvent('keydown', { key: 'Delete' });
    window.dispatchEvent(deleteEvent);

    await waitFor(() => {
      expect(mockRemoveClip).toHaveBeenCalledWith('clip-1');
    });
  });

  it('should move playhead backward on Left Arrow', async () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const leftArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowLeft' });
    window.dispatchEvent(leftArrowEvent);

    await waitFor(() => {
      expect(mockSetCurrentTime).toHaveBeenCalledWith(9); // 10 - 1
    });
  });

  it('should move playhead forward on Right Arrow', async () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const rightArrowEvent = new KeyboardEvent('keydown', { key: 'ArrowRight' });
    window.dispatchEvent(rightArrowEvent);

    await waitFor(() => {
      expect(mockSetCurrentTime).toHaveBeenCalledWith(11); // 10 + 1
    });
  });

  it('should move playhead by 5 seconds with Shift + Arrow keys', async () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const shiftLeftEvent = new KeyboardEvent('keydown', {
      key: 'ArrowLeft',
      shiftKey: true,
    });
    window.dispatchEvent(shiftLeftEvent);

    await waitFor(() => {
      expect(mockSetCurrentTime).toHaveBeenCalledWith(5); // 10 - 5
    });
  });

  it('should zoom in on + key', async () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const plusEvent = new KeyboardEvent('keydown', { key: '+' });
    window.dispatchEvent(plusEvent);

    await waitFor(() => {
      expect(mockSetZoom).toHaveBeenCalledWith(25); // 20 + 5
    });
  });

  it('should zoom out on - key', async () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const minusEvent = new KeyboardEvent('keydown', { key: '-' });
    window.dispatchEvent(minusEvent);

    await waitFor(() => {
      expect(mockSetZoom).toHaveBeenCalledWith(15); // 20 - 5
    });
  });

  it('should deselect clip on Escape key', async () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const escapeEvent = new KeyboardEvent('keydown', { key: 'Escape' });
    window.dispatchEvent(escapeEvent);

    await waitFor(() => {
      expect(mockSetSelectedClip).toHaveBeenCalledWith(null);
    });
  });

  it('should jump to start on Home key', async () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const homeEvent = new KeyboardEvent('keydown', { key: 'Home' });
    window.dispatchEvent(homeEvent);

    await waitFor(() => {
      expect(mockSetCurrentTime).toHaveBeenCalledWith(0);
    });
  });

  it('should jump to end on End key', async () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const endEvent = new KeyboardEvent('keydown', { key: 'End' });
    window.dispatchEvent(endEvent);

    await waitFor(() => {
      expect(mockSetCurrentTime).toHaveBeenCalledWith(60); // duration
    });
  });

  it('should not trigger shortcuts when typing in input fields', async () => {
    renderHook(() => useKeyboardShortcuts(), { wrapper });

    const input = document.createElement('input');
    document.body.appendChild(input);

    const spaceEvent = new KeyboardEvent('keydown', {
      key: ' ',
      bubbles: true,
    });
    Object.defineProperty(spaceEvent, 'target', { value: input, enumerable: true });

    input.dispatchEvent(spaceEvent);

    await waitFor(() => {
      expect(mockPlay).not.toHaveBeenCalled();
      expect(mockPause).not.toHaveBeenCalled();
    });

    document.body.removeChild(input);
  });

  it('should support Ctrl+C to copy clip', async () => {
    const { result } = renderHook(() => useKeyboardShortcuts(), { wrapper });

    const copyEvent = new KeyboardEvent('keydown', {
      key: 'c',
      ctrlKey: true,
    });
    window.dispatchEvent(copyEvent);

    await waitFor(() => {
      expect(result.current.hasClipboardContent).toBe(true);
    });
  });

  it('should be disabled when enabled option is false', async () => {
    renderHook(() => useKeyboardShortcuts({ enabled: false }), { wrapper });

    const spaceEvent = new KeyboardEvent('keydown', { key: ' ' });
    window.dispatchEvent(spaceEvent);

    // Wait a bit to ensure no action is triggered
    await new Promise(resolve => setTimeout(resolve, 100));

    expect(mockPlay).not.toHaveBeenCalled();
    expect(mockPause).not.toHaveBeenCalled();
  });
});
