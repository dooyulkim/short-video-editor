/* eslint-disable @typescript-eslint/no-explicit-any */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render } from '@testing-library/react';
import { TextClip } from '@/components/Timeline/TextClip';
import type { Clip } from '@/types/timeline';

describe('TextClip Component', () => {
  let mockCanvas: HTMLCanvasElement;
  let mockContext: CanvasRenderingContext2D;

  beforeEach(() => {
    // Create a mock canvas and context
    mockCanvas = document.createElement('canvas');
    mockCanvas.width = 1920;
    mockCanvas.height = 1080;
    mockContext = mockCanvas.getContext('2d')!;

    // Mock canvas context methods
    vi.spyOn(mockContext, 'save');
    vi.spyOn(mockContext, 'restore');
    vi.spyOn(mockContext, 'fillText');
    vi.spyOn(mockContext, 'translate');
    vi.spyOn(mockContext, 'rotate');
    vi.spyOn(mockContext, 'scale');
  });

  const createTextClip = (overrides?: Partial<Clip>): Clip => ({
    id: 'text-clip-1',
    resourceId: '',
    startTime: 0,
    duration: 5,
    trimStart: 0,
    trimEnd: 0,
    position: { x: 100, y: 100 },
    data: {
      type: 'text',
      text: 'Test Text',
      fontFamily: 'Arial',
      fontSize: 48,
      color: '#ffffff',
      animation: 'none',
    },
    ...overrides,
  });

  describe('Rendering', () => {
    it('should render without crashing', () => {
      const clip = createTextClip();
      
      const { container } = render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      expect(container).toBeDefined();
    });

    it('should return null (no DOM elements)', () => {
      const clip = createTextClip();
      
      const { container } = render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      expect(container.firstChild).toBeNull();
    });
  });

  describe('Visibility Logic', () => {
    it('should render text when currentTime is within clip duration', () => {
      const clip = createTextClip();
      
      render(
        <TextClip
          clip={clip}
          currentTime={2.5}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.fillText).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('should not render when currentTime is before clip start', () => {
      const clip = createTextClip({ startTime: 5 });
      
      render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.fillText).not.toHaveBeenCalled();
    });

    it('should not render when currentTime is after clip end', () => {
      const clip = createTextClip({ startTime: 0, duration: 5 });
      
      render(
        <TextClip
          clip={clip}
          currentTime={6}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.fillText).not.toHaveBeenCalled();
    });

    it('should render at clip start time', () => {
      const clip = createTextClip({ startTime: 3 });
      
      render(
        <TextClip
          clip={clip}
          currentTime={3}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.fillText).toHaveBeenCalled();
    });

    it('should not render at exact clip end time', () => {
      const clip = createTextClip({ startTime: 0, duration: 5 });
      
      render(
        <TextClip
          clip={clip}
          currentTime={5}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.fillText).not.toHaveBeenCalled();
    });
  });

  describe('Text Properties', () => {
    it('should apply correct font properties', () => {
      const clip = createTextClip({
        data: {
          type: 'text',
          text: 'Custom Font',
          fontFamily: 'Helvetica',
          fontSize: 72,
          color: '#ff0000',
          animation: 'none',
        },
      });
      
      render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.font).toBe('72px Helvetica');
      expect(mockContext.fillStyle).toBe('#ff0000');
    });

    it('should render text at correct position', () => {
      const clip = createTextClip({
        position: { x: 200, y: 300 },
      });
      
      render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.fillText).toHaveBeenCalledWith('Test Text', 200, 300);
    });

    it('should handle multi-line text', () => {
      const clip = createTextClip({
        data: {
          type: 'text',
          text: 'Line 1\nLine 2\nLine 3',
          fontFamily: 'Arial',
          fontSize: 48,
          color: '#ffffff',
          animation: 'none',
        },
        position: { x: 100, y: 100 },
      });
      
      render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      // Should be called 3 times for 3 lines
      expect(mockContext.fillText).toHaveBeenCalledTimes(3);
      
      // Check each line is rendered at correct Y position
      const lineHeight = 48 * 1.2; // fontSize * 1.2
      expect(mockContext.fillText).toHaveBeenCalledWith('Line 1', 100, 100);
      expect(mockContext.fillText).toHaveBeenCalledWith('Line 2', 100, 100 + lineHeight);
      expect(mockContext.fillText).toHaveBeenCalledWith('Line 3', 100, 100 + lineHeight * 2);
    });
  });

  describe('Animations', () => {
    it('should apply fade-in animation at start', () => {
      const clip = createTextClip({
        duration: 10,
        data: {
          type: 'text',
          text: 'Fading Text',
          fontFamily: 'Arial',
          fontSize: 48,
          color: '#ffffff',
          animation: 'fade',
        },
      });
      
      // Time is 0.5 seconds into a 10-second clip (5% through)
      render(
        <TextClip
          clip={clip}
          currentTime={0.5}
          canvasContext={mockContext}
        />
      );

      // At 5% through clip, opacity should be 0.5 (5% / 10%)
      expect(mockContext.globalAlpha).toBeCloseTo(0.5, 1);
    });

    it('should apply fade-out animation at end', () => {
      const clip = createTextClip({
        startTime: 0,
        duration: 10,
        data: {
          type: 'text',
          text: 'Fading Text',
          fontFamily: 'Arial',
          fontSize: 48,
          color: '#ffffff',
          animation: 'fade',
        },
      });
      
      // Time is 9.5 seconds into a 10-second clip (95% through)
      render(
        <TextClip
          clip={clip}
          currentTime={9.5}
          canvasContext={mockContext}
        />
      );

      // At 95% through clip, opacity should be 0.5 ((1 - 0.95) / 0.1)
      expect(mockContext.globalAlpha).toBeCloseTo(0.5, 1);
    });

    it('should have full opacity in middle with fade animation', () => {
      const clip = createTextClip({
        duration: 10,
        data: {
          type: 'text',
          text: 'Fading Text',
          fontFamily: 'Arial',
          fontSize: 48,
          color: '#ffffff',
          animation: 'fade',
        },
      });
      
      // Time is 5 seconds into a 10-second clip (50% through)
      render(
        <TextClip
          clip={clip}
          currentTime={5}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.globalAlpha).toBe(1);
    });

    it('should apply slide animation at start', () => {
      const clip = createTextClip({
        duration: 10,
        position: { x: 500, y: 300 },
        data: {
          type: 'text',
          text: 'Sliding Text',
          fontFamily: 'Arial',
          fontSize: 48,
          color: '#ffffff',
          animation: 'slide',
        },
      });
      
      // Time is 1 second into a 10-second clip (10% through)
      render(
        <TextClip
          clip={clip}
          currentTime={1}
          canvasContext={mockContext}
          canvasWidth={1920}
        />
      );

      // Text should be offset to the left during slide-in
      const expectedOffset = -(1 - 0.1 / 0.2) * 1920 * 0.3; // Negative offset
      const expectedX = 500 + expectedOffset;
      expect(mockContext.fillText).toHaveBeenCalledWith('Sliding Text', expectedX, 300);
    });
  });

  describe('Transformations', () => {
    it('should apply rotation transformation', () => {
      const clip = createTextClip({
        rotation: 45,
        position: { x: 100, y: 100 },
      });
      
      render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.translate).toHaveBeenCalled();
      expect(mockContext.rotate).toHaveBeenCalledWith((45 * Math.PI) / 180);
    });

    it('should apply scale transformation', () => {
      const clip = createTextClip({
        scale: 1.5,
        position: { x: 100, y: 100 },
      });
      
      render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.scale).toHaveBeenCalledWith(1.5, 1.5);
    });

    it('should apply custom opacity', () => {
      const clip = createTextClip({
        opacity: 0.7,
      });
      
      render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.globalAlpha).toBe(0.7);
    });
  });

  describe('Edge Cases', () => {
    it('should handle null canvas context gracefully', () => {
      const clip = createTextClip();
      
      expect(() => {
        render(
          <TextClip
            clip={clip}
            currentTime={2}
            canvasContext={null}
          />
        );
      }).not.toThrow();
    });

    it('should handle missing clip data', () => {
      const clip = createTextClip();
      delete clip.data;
      
      render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.fillText).not.toHaveBeenCalled();
    });

    it('should handle wrong clip data type', () => {
      const clip = createTextClip({
        data: {
          type: 'video' as any,
        },
      });
      
      render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.fillText).not.toHaveBeenCalled();
    });

    it('should use default position when not provided', () => {
      const clip = createTextClip();
      delete clip.position;
      
      render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.fillText).toHaveBeenCalledWith('Test Text', 100, 100);
    });
  });

  describe('Canvas State Management', () => {
    it('should save and restore canvas state', () => {
      const clip = createTextClip();
      
      render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      expect(mockContext.save).toHaveBeenCalled();
      expect(mockContext.restore).toHaveBeenCalled();
    });

    it('should call save before any modifications', () => {
      const clip = createTextClip();
      const calls: string[] = [];
      
      mockContext.save = vi.fn(() => calls.push('save'));
      mockContext.fillText = vi.fn(() => calls.push('fillText')) as any;
      
      render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      expect(calls.indexOf('save')).toBeLessThan(calls.indexOf('fillText'));
    });

    it('should call restore after all modifications', () => {
      const clip = createTextClip();
      const calls: string[] = [];
      
      mockContext.fillText = vi.fn(() => calls.push('fillText')) as any;
      mockContext.restore = vi.fn(() => calls.push('restore'));
      
      render(
        <TextClip
          clip={clip}
          currentTime={2}
          canvasContext={mockContext}
        />
      );

      expect(calls.indexOf('fillText')).toBeLessThan(calls.indexOf('restore'));
    });
  });
});
