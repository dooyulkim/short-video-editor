import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from '@testing-library/react';
import AudioWaveform from './AudioWaveform';

describe('AudioWaveform', () => {
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // Mock canvas context
    mockContext = {
      clearRect: vi.fn(),
      fillRect: vi.fn(),
      strokeRect: vi.fn(),
      beginPath: vi.fn(),
      moveTo: vi.fn(),
      lineTo: vi.fn(),
      stroke: vi.fn(),
      fill: vi.fn(),
      closePath: vi.fn(),
      fillStyle: '',
      strokeStyle: '',
      lineWidth: 1,
    } as unknown as CanvasRenderingContext2D;

    // Mock getContext
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockContext) as any;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render canvas element', () => {
    const audioData = [0.5, -0.3, 0.8, -0.2];
    render(<AudioWaveform audioData={audioData} width={400} height={100} />);
    
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('should set canvas dimensions correctly', () => {
    const audioData = [0.5, -0.3, 0.8];
    const width = 400;
    const height = 100;
    
    render(<AudioWaveform audioData={audioData} width={width} height={height} />);
    
    const canvas = document.querySelector('canvas') as HTMLCanvasElement;
    expect(canvas.width).toBe(width);
    expect(canvas.height).toBe(height);
  });

  it('should clear canvas before drawing', () => {
    const audioData = [0.5, -0.3];
    render(<AudioWaveform audioData={audioData} width={400} height={100} />);
    
    expect(mockContext.clearRect).toHaveBeenCalledWith(0, 0, 400, 100);
  });

  it('should draw bars for each audio data point', () => {
    const audioData = [0.5, -0.3, 0.8, -0.2];
    render(<AudioWaveform audioData={audioData} width={400} height={100} />);
    
    // Should call fillRect for each data point
    expect(mockContext.fillRect).toHaveBeenCalledTimes(audioData.length);
  });

  it('should normalize amplitude values exceeding -1 to 1 range', () => {
    const audioData = [1.5, -2.0, 0.5]; // Values outside range
    render(<AudioWaveform audioData={audioData} width={300} height={100} />);
    
    // Should still render without errors
    expect(mockContext.fillRect).toHaveBeenCalled();
  });

  it('should use custom color when provided', () => {
    const audioData = [0.5];
    const customColor = 'rgb(255, 0, 0)';
    
    render(<AudioWaveform audioData={audioData} width={100} height={100} color={customColor} />);
    
    expect(mockContext.fillStyle).toBe(customColor);
  });

  it('should use default color when not provided', () => {
    const audioData = [0.5];
    render(<AudioWaveform audioData={audioData} width={100} height={100} />);
    
    expect(mockContext.fillStyle).toBe('hsl(var(--primary))');
  });

  it('should handle empty audio data gracefully', () => {
    const audioData: number[] = [];
    render(<AudioWaveform audioData={audioData} width={400} height={100} />);
    
    // Should not crash and clear rect should still be called
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeTruthy();
  });

  it('should draw center line', () => {
    const audioData = [0.5, -0.3];
    render(<AudioWaveform audioData={audioData} width={400} height={100} />);
    
    // Check that stroke methods were called for center line
    expect(mockContext.beginPath).toHaveBeenCalled();
    expect(mockContext.moveTo).toHaveBeenCalledWith(0, 50); // Center Y
    expect(mockContext.lineTo).toHaveBeenCalledWith(400, 50);
    expect(mockContext.stroke).toHaveBeenCalled();
  });

  it('should calculate correct bar width based on data length', () => {
    const audioData = [0.5, -0.3, 0.8, -0.2]; // 4 data points
    const width = 400;
    
    render(<AudioWaveform audioData={audioData} width={width} height={100} />);
    
    const expectedBarWidth = width / audioData.length; // 100
    
    // Check that fillRect was called with correct x positions
    const calls = (mockContext.fillRect as any).mock.calls;
    expect(calls[0][0]).toBe(0); // First bar at x=0
    expect(calls[1][0]).toBe(expectedBarWidth); // Second bar at x=100
  });

  it('should redraw when audioData changes', () => {
    const { rerender } = render(
      <AudioWaveform audioData={[0.5]} width={100} height={100} />
    );
    
    const initialCalls = (mockContext.fillRect as any).mock.calls.length;
    
    // Change audio data
    rerender(<AudioWaveform audioData={[0.5, 0.3, 0.8]} width={100} height={100} />);
    
    // Should have drawn more bars
    expect((mockContext.fillRect as any).mock.calls.length).toBeGreaterThan(initialCalls);
  });

  it('should redraw when width changes', () => {
    const { rerender } = render(
      <AudioWaveform audioData={[0.5, 0.3]} width={100} height={100} />
    );
    
    vi.clearAllMocks();
    
    // Change width
    rerender(<AudioWaveform audioData={[0.5, 0.3]} width={200} height={100} />);
    
    // Should have redrawn
    expect(mockContext.clearRect).toHaveBeenCalled();
    expect(mockContext.fillRect).toHaveBeenCalled();
  });

  it('should redraw when height changes', () => {
    const { rerender } = render(
      <AudioWaveform audioData={[0.5, 0.3]} width={100} height={100} />
    );
    
    vi.clearAllMocks();
    
    // Change height
    rerender(<AudioWaveform audioData={[0.5, 0.3]} width={100} height={200} />);
    
    // Should have redrawn
    expect(mockContext.clearRect).toHaveBeenCalled();
    expect(mockContext.fillRect).toHaveBeenCalled();
  });

  it('should handle positive amplitude values correctly', () => {
    const audioData = [0.5];
    const height = 100;
    
    render(<AudioWaveform audioData={audioData} width={100} height={height} />);
    
    const calls = (mockContext.fillRect as any).mock.calls;
    const centerY = height / 2;
    
    // For positive amplitude, bar should be drawn upward from center
    // fillRect(x, y, width, height) where y < centerY for upward bars
    const yPosition = calls[0][1];
    expect(yPosition).toBeLessThanOrEqual(centerY);
  });

  it('should handle negative amplitude values correctly', () => {
    const audioData = [-0.5];
    const height = 100;
    
    render(<AudioWaveform audioData={audioData} width={100} height={height} />);
    
    const calls = (mockContext.fillRect as any).mock.calls;
    const centerY = height / 2;
    
    // For negative amplitude, bar should be drawn downward from center
    // fillRect(x, y, width, height) where y = centerY for downward bars
    const yPosition = calls[0][1];
    expect(yPosition).toBe(centerY);
  });

  it('should apply className to canvas', () => {
    const audioData = [0.5];
    render(<AudioWaveform audioData={audioData} width={100} height={100} />);
    
    const canvas = document.querySelector('canvas');
    expect(canvas?.className).toContain('audio-waveform');
  });
});
