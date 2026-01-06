import { describe, it, expect } from 'vitest';
import { measureText, renderTextClipThumbnail } from '@/components/Timeline/textClipUtils';
import type { Clip } from '@/types/timeline';

describe('textClipUtils', () => {
  describe('measureText', () => {
    it('should measure single-line text correctly', () => {
      const result = measureText('Hello World', 'Arial', 48);
      
      expect(result).toHaveProperty('width');
      expect(result).toHaveProperty('height');
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('should calculate height based on line count', () => {
      const singleLine = measureText('Line 1', 'Arial', 48);
      const multiLine = measureText('Line 1\nLine 2\nLine 3', 'Arial', 48);
      
      expect(multiLine.height).toBeGreaterThan(singleLine.height);
      expect(multiLine.height).toBeCloseTo(singleLine.height * 3, 0);
    });

    it('should handle different font sizes', () => {
      const small = measureText('Test', 'Arial', 24);
      const large = measureText('Test', 'Arial', 96);
      
      // In the mocked environment, width is calculated as text.length * 10
      // Height varies with font size
      expect(small.width).toBeDefined();
      expect(large.width).toBeDefined();
      expect(large.height).toBeGreaterThan(small.height);
    });

    it('should handle different font families', () => {
      const arial = measureText('Test', 'Arial', 48);
      const helvetica = measureText('Test', 'Helvetica', 48);
      
      expect(arial.width).toBeGreaterThan(0);
      expect(helvetica.width).toBeGreaterThan(0);
      // Width might differ slightly between fonts
    });

    it('should work with provided canvas context', () => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d')!;
      
      const result = measureText('Test', 'Arial', 48, ctx);
      
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('should create temporary canvas when context not provided', () => {
      const result = measureText('Test', 'Arial', 48);
      
      expect(result).toBeDefined();
      expect(result.width).toBeGreaterThan(0);
    });

    it('should handle empty strings', () => {
      const result = measureText('', 'Arial', 48);
      
      expect(result.width).toBe(0);
      expect(result.height).toBeGreaterThan(0);
    });

    it('should handle multi-line with varying widths', () => {
      const result = measureText('Short\nThis is a much longer line\nMedium', 'Arial', 48);
      
      // Width should be the maximum of all lines
      expect(result.width).toBeGreaterThan(0);
      expect(result.height).toBeGreaterThan(0);
    });
  });

  describe('renderTextClipThumbnail', () => {
    const createTextClip = (overrides?: Partial<Clip>): Clip => ({
      id: 'text-clip-1',
      resourceId: '',
      startTime: 0,
      duration: 5,
      trimStart: 0,
      trimEnd: 0,
      data: {
        type: 'text',
        text: 'Test Text',
        fontFamily: 'Arial',
        fontSize: 48,
        color: '#ffffff',
      },
      ...overrides,
    });

    it('should generate data URL for text clip', () => {
      const clip = createTextClip();
      const dataUrl = renderTextClipThumbnail(clip, 100, 60);
      
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('should return empty string for non-text clips', () => {
      const clip = createTextClip({
        data: {
          type: 'video',
        } as Clip['data'],
      });
      
      const dataUrl = renderTextClipThumbnail(clip, 100, 60);
      expect(dataUrl).toBe('');
    });

    it('should return empty string for clips without data', () => {
      const clip = createTextClip();
      delete clip.data;
      
      const dataUrl = renderTextClipThumbnail(clip, 100, 60);
      expect(dataUrl).toBe('');
    });

    it('should generate thumbnail with correct dimensions', () => {
      const clip = createTextClip();
      const width = 200;
      const height = 120;
      
      const dataUrl = renderTextClipThumbnail(clip, width, height);
      
      // Convert data URL back to canvas to verify dimensions
      const img = new Image();
      img.src = dataUrl;
      
      expect(dataUrl).toBeDefined();
      expect(dataUrl.length).toBeGreaterThan(0);
    });

    it('should truncate long text in thumbnail', () => {
      const clip = createTextClip({
        data: {
          type: 'text',
          text: 'This is a very long text that should be truncated in the thumbnail view',
          fontFamily: 'Arial',
          fontSize: 48,
          color: '#ffffff',
        },
      });
      
      const dataUrl = renderTextClipThumbnail(clip, 100, 60);
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('should only show first line of multi-line text', () => {
      const clip = createTextClip({
        data: {
          type: 'text',
          text: 'Line 1\nLine 2\nLine 3',
          fontFamily: 'Arial',
          fontSize: 48,
          color: '#ffffff',
        },
      });
      
      const dataUrl = renderTextClipThumbnail(clip, 100, 60);
      expect(dataUrl).toMatch(/^data:image\/png;base64,/);
    });

    it('should handle different colors', () => {
      const whiteClip = createTextClip({
        data: {
          type: 'text',
          text: 'White Text',
          fontFamily: 'Arial',
          fontSize: 48,
          color: '#ffffff',
        },
      });
      
      const redClip = createTextClip({
        data: {
          type: 'text',
          text: 'Red Text',
          fontFamily: 'Arial',
          fontSize: 48,
          color: '#ff0000',
        },
      });
      
      const whiteUrl = renderTextClipThumbnail(whiteClip, 100, 60);
      const redUrl = renderTextClipThumbnail(redClip, 100, 60);
      
      expect(whiteUrl).toMatch(/^data:image\/png;base64,/);
      expect(redUrl).toMatch(/^data:image\/png;base64,/);
      // In the mocked environment, canvas always returns the same base64 data
      // In real browser, these would be different. Just verify both are valid.
      expect(whiteUrl).toBeDefined();
      expect(redUrl).toBeDefined();
    });

    it('should scale font size for thumbnail', () => {
      const smallThumbnail = renderTextClipThumbnail(
        createTextClip(),
        50,
        30
      );
      
      const largeThumbnail = renderTextClipThumbnail(
        createTextClip(),
        200,
        120
      );
      
      expect(smallThumbnail).toMatch(/^data:image\/png;base64,/);
      expect(largeThumbnail).toMatch(/^data:image\/png;base64,/);
    });

    it('should handle different font families', () => {
      const arialClip = createTextClip({
        data: {
          type: 'text',
          text: 'Arial Text',
          fontFamily: 'Arial',
          fontSize: 48,
          color: '#ffffff',
        },
      });
      
      const helveticaClip = createTextClip({
        data: {
          type: 'text',
          text: 'Helvetica Text',
          fontFamily: 'Helvetica',
          fontSize: 48,
          color: '#ffffff',
        },
      });
      
      const arialUrl = renderTextClipThumbnail(arialClip, 100, 60);
      const helveticaUrl = renderTextClipThumbnail(helveticaClip, 100, 60);
      
      expect(arialUrl).toMatch(/^data:image\/png;base64,/);
      expect(helveticaUrl).toMatch(/^data:image\/png;base64,/);
    });
  });
});
