import { renderHook, act } from '@testing-library/react';
import { useVideoPlayback } from './useVideoPlayback';
import { TimelineProvider } from '@/context/TimelineContext';
import type { ReactNode } from 'react';

// Mock wrapper with TimelineProvider
const wrapper = ({ children }: { children: ReactNode }) => (
  <TimelineProvider initialState={{ duration: 10, currentTime: 0, isPlaying: false }}>
    {children}
  </TimelineProvider>
);

describe('useVideoPlayback', () => {
  beforeEach(() => {
    jest.useFakeTimers();
  });

  afterEach(() => {
    jest.runOnlyPendingTimers();
    jest.useRealTimers();
  });

  it('should initialize with default values', () => {
    const { result } = renderHook(() => useVideoPlayback(), { wrapper });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(0);
  });

  it('should play and update currentTime', () => {
    const { result } = renderHook(() => useVideoPlayback(), { wrapper });

    act(() => {
      result.current.play();
    });

    expect(result.current.isPlaying).toBe(true);

    // Fast-forward time
    act(() => {
      jest.advanceTimersByTime(1000);
    });

    expect(result.current.currentTime).toBeGreaterThan(0);
  });

  it('should pause playback', () => {
    const { result } = renderHook(() => useVideoPlayback(), { wrapper });

    act(() => {
      result.current.play();
    });

    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.pause();
    });

    expect(result.current.isPlaying).toBe(false);
  });

  it('should seek to specific time', () => {
    const { result } = renderHook(() => useVideoPlayback(), { wrapper });

    act(() => {
      result.current.seek(5);
    });

    expect(result.current.currentTime).toBe(5);
  });

  it('should clamp seek time to duration', () => {
    const { result } = renderHook(() => useVideoPlayback(), { wrapper });

    act(() => {
      result.current.seek(100); // Beyond duration
    });

    expect(result.current.currentTime).toBeLessThanOrEqual(10);
  });

  it('should stop and reset to beginning', () => {
    const { result } = renderHook(() => useVideoPlayback(), { wrapper });

    act(() => {
      result.current.play();
      jest.advanceTimersByTime(2000);
      result.current.stop();
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(0);
  });

  it('should toggle play/pause', () => {
    const { result } = renderHook(() => useVideoPlayback(), { wrapper });

    expect(result.current.isPlaying).toBe(false);

    act(() => {
      result.current.togglePlayPause();
    });

    expect(result.current.isPlaying).toBe(true);

    act(() => {
      result.current.togglePlayPause();
    });

    expect(result.current.isPlaying).toBe(false);
  });

  it('should auto-pause at end of timeline', () => {
    const { result } = renderHook(() => useVideoPlayback(), { wrapper });

    act(() => {
      result.current.play();
      // Fast-forward beyond duration
      jest.advanceTimersByTime(15000);
    });

    expect(result.current.isPlaying).toBe(false);
    expect(result.current.currentTime).toBe(10); // Duration
  });

  it('should restart from beginning if play called at end', () => {
    const { result } = renderHook(() => useVideoPlayback(), { wrapper });

    act(() => {
      result.current.seek(10); // Go to end
      result.current.play();
    });

    expect(result.current.currentTime).toBe(0);
    expect(result.current.isPlaying).toBe(true);
  });
});
