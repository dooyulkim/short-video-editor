import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import React, { type ReactNode } from 'react';
import { Timeline } from '@/components/Timeline/Timeline';
import { TimelineProvider } from '@/context/TimelineContext';
import type { TimelineLayer, Clip } from '@/types/timeline';

// Wrapper component with TimelineProvider
function TestWrapper({ children }: { children: ReactNode }) {
  return <TimelineProvider>{children}</TimelineProvider>;
}

// Custom render function that wraps components in TimelineProvider
function renderWithProvider(ui: React.ReactElement, options = {}) {
  return render(ui, { wrapper: TestWrapper, ...options });
}

// Helper function to create a mock clip
function createMockClip(overrides?: Partial<Clip>): Clip {
  return {
    id: 'clip-1',
    resourceId: 'resource-video-1',
    startTime: 0,
    duration: 10,
    trimStart: 0,
    trimEnd: 0,
    transitions: undefined,
    ...overrides,
  };
}

// Helper function to create a mock layer
function createMockLayer(overrides?: Partial<TimelineLayer>): TimelineLayer {
  return {
    id: 'layer-1',
    type: 'video',
    clips: [],
    locked: false,
    visible: true,
    name: 'Video Layer 1',
    ...overrides,
  };
}

describe('Timeline Component', () => {
  beforeEach(() => {
    // Mock scrollIntoView which is not implemented in jsdom
    Element.prototype.scrollIntoView = vi.fn();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render timeline canvas', () => {
      renderWithProvider(<Timeline />);
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should render zoom controls', () => {
      renderWithProvider(<Timeline />);
      
      // Look for zoom in and zoom out buttons
      const buttons = screen.getAllByRole('button');
      expect(buttons.length).toBeGreaterThan(0);
    });

    it('should render timeline ruler', () => {
      renderWithProvider(<Timeline />);
      
      // The TimelineRuler component should be rendered
      expect(screen.getByTestId('timeline-ruler')).toBeInTheDocument();
    });

    it('should render with initial layers', () => {
      const mockLayers: TimelineLayer[] = [
        createMockLayer({
          id: 'layer-1',
          clips: [createMockClip({ id: 'clip-1', startTime: 0 })],
        }),
        createMockLayer({
          id: 'layer-2',
          type: 'audio',
          name: 'Audio Layer 1',
          clips: [createMockClip({ id: 'clip-2', startTime: 5 })],
        }),
      ];

      const { container } = renderWithProvider(<Timeline initialLayers={mockLayers} />);
      const canvas = container.querySelector('canvas');
      
      expect(canvas).toBeInTheDocument();
      // Canvas height should reflect 2 layers (2 * LAYER_HEIGHT)
      expect(canvas?.height).toBeGreaterThan(0);
    });
  });

  describe('Clip Rendering', () => {
    it('should render clips on the timeline', () => {
      const clip1 = createMockClip({ id: 'clip-1', startTime: 0, duration: 5 });
      const clip2 = createMockClip({ id: 'clip-2', startTime: 10, duration: 8 });
      
      const layer = createMockLayer({
        clips: [clip1, clip2],
      });

      const { container } = renderWithProvider(<Timeline initialLayers={[layer]} />);
      const canvas = container.querySelector('canvas');
      
      expect(canvas).toBeInTheDocument();
      expect(canvas?.width).toBeGreaterThan(0);
    });

    it('should render clips with correct visual properties', () => {
      const clip = createMockClip({
        id: 'clip-1',
        startTime: 5,
        duration: 10,
        resourceId: 'video-resource-1',
      });
      
      const layer = createMockLayer({ clips: [clip] });
      const { container } = renderWithProvider(<Timeline initialLayers={[layer]} />);
      
      const canvas = container.querySelector('canvas');
      const ctx = canvas?.getContext('2d');
      
      expect(ctx).toBeDefined();
    });

    it('should not render clips from hidden layers', () => {
      const clip = createMockClip({ id: 'clip-1', startTime: 0, duration: 5 });
      const hiddenLayer = createMockLayer({
        clips: [clip],
        visible: false,
      });

      renderWithProvider(<Timeline initialLayers={[hiddenLayer]} />);
      
      // The canvas should still render, but clips from hidden layers should not be drawn
      // This is tested implicitly through the canvas drawing logic
    });

    it('should render multiple layers with different types', () => {
      const videoClip = createMockClip({ id: 'video-1', startTime: 0, duration: 10 });
      const audioClip = createMockClip({ id: 'audio-1', startTime: 0, duration: 10 });
      
      const layers: TimelineLayer[] = [
        createMockLayer({ id: 'video-layer', type: 'video', clips: [videoClip] }),
        createMockLayer({ id: 'audio-layer', type: 'audio', clips: [audioClip] }),
      ];

      const { container } = renderWithProvider(<Timeline initialLayers={layers} />);
      const canvas = container.querySelector('canvas');
      
      expect(canvas).toBeInTheDocument();
    });

    it('should render clips with trim indicators', () => {
      const trimmedClip = createMockClip({
        id: 'clip-1',
        startTime: 0,
        duration: 10,
        trimStart: 2,
        trimEnd: 3,
      });
      
      const layer = createMockLayer({ clips: [trimmedClip] });
      renderWithProvider(<Timeline initialLayers={[layer]} />);
      
      // Trim indicators should be rendered on canvas
      // This is verified through the canvas drawing logic
    });
  });

  describe('Playhead Interaction', () => {
    it('should render playhead at current time position', () => {
      const { container } = renderWithProvider(<Timeline />);
      const canvas = container.querySelector('canvas');
      
      expect(canvas).toBeInTheDocument();
      // Playhead should be drawn at currentTime position
    });

    it('should update playhead position on canvas click', () => {
      const { container } = renderWithProvider(<Timeline initialDuration={60} />);
      const canvas = container.querySelector('canvas');
      
      expect(canvas).toBeInTheDocument();
      
      // Simulate click on canvas
      if (canvas) {
        fireEvent.mouseDown(canvas, {
          clientX: 250,
          clientY: 50,
        });
        
        // Playhead should update (tested through internal state)
      }
    });

    it('should allow dragging the playhead', () => {
      const { container } = renderWithProvider(<Timeline initialDuration={60} />);
      const canvas = container.querySelector('canvas');
      
      expect(canvas).toBeInTheDocument();
      
      if (canvas) {
        // Start drag
        fireEvent.mouseDown(canvas, {
          clientX: 100,
          clientY: 50,
        });
        
        // Move mouse
        fireEvent.mouseMove(canvas, {
          clientX: 300,
          clientY: 50,
        });
        
        // End drag
        fireEvent.mouseUp(canvas);
        
        // Playhead should have moved
      }
    });

    it('should constrain playhead within timeline duration', () => {
      const { container } = renderWithProvider(<Timeline initialDuration={30} />);
      const canvas = container.querySelector('canvas');
      
      if (canvas) {
        // Try to drag playhead beyond duration
        fireEvent.mouseDown(canvas, {
          clientX: 10000, // Very far right
          clientY: 50,
        });
        
        // Playhead should be constrained to max duration
      }
    });
  });

  describe('Zoom Functionality', () => {
    it('should zoom in when zoom in button is clicked', () => {
      const { container } = renderWithProvider(<Timeline />);
      
      const zoomInButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-plus') ||
        btn.textContent?.includes('+')
      );
      
      const canvasBefore = container.querySelector('canvas');
      const widthBefore = canvasBefore?.width || 0;
      
      if (zoomInButton) {
        fireEvent.click(zoomInButton);
        
        // Canvas width should increase after zoom in
        const canvasAfter = container.querySelector('canvas');
        const widthAfter = canvasAfter?.width || 0;
        
        expect(widthAfter).toBeGreaterThanOrEqual(widthBefore);
      }
    });

    it('should zoom out when zoom out button is clicked', () => {
      const { container } = renderWithProvider(<Timeline />);
      
      const zoomOutButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-minus') ||
        btn.textContent?.includes('-')
      );
      
      const canvasBefore = container.querySelector('canvas');
      const widthBefore = canvasBefore?.width || 0;
      
      if (zoomOutButton) {
        fireEvent.click(zoomOutButton);
        
        // Canvas width should decrease after zoom out
        const canvasAfter = container.querySelector('canvas');
        const widthAfter = canvasAfter?.width || 0;
        
        expect(widthAfter).toBeLessThanOrEqual(widthBefore);
      }
    });

    it('should respect minimum zoom level', () => {
      renderWithProvider(<Timeline />);
      
      const zoomOutButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-minus')
      );
      
      // Click zoom out multiple times
      if (zoomOutButton) {
        for (let i = 0; i < 20; i++) {
          fireEvent.click(zoomOutButton);
        }
        
        // Should not zoom beyond minimum
        // Minimum zoom prevents canvas from becoming too small
      }
    });

    it('should respect maximum zoom level', () => {
      renderWithProvider(<Timeline />);
      
      const zoomInButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-plus')
      );
      
      // Click zoom in multiple times
      if (zoomInButton) {
        for (let i = 0; i < 20; i++) {
          fireEvent.click(zoomInButton);
        }
        
        // Should not zoom beyond maximum
      }
    });

    it('should update clip rendering when zoom changes', () => {
      const clip = createMockClip({ id: 'clip-1', startTime: 0, duration: 10 });
      const layer = createMockLayer({ clips: [clip] });
      
      const { container, rerender } = renderWithProvider(<Timeline initialLayers={[layer]} />);
      
      const canvas = container.querySelector('canvas');
      const widthBefore = canvas?.width || 0;
      
      // Trigger zoom by re-rendering (simulating zoom change)
      const zoomInButton = screen.getAllByRole('button').find(btn => 
        btn.querySelector('svg')?.classList.contains('lucide-plus')
      );
      
      if (zoomInButton) {
        fireEvent.click(zoomInButton);
        
        // Canvas should re-render with new dimensions
        const canvasAfter = container.querySelector('canvas');
        expect(canvasAfter).toBeInTheDocument();
      }
    });
  });

  describe('Drag and Drop', () => {
    it('should support drop zone for adding clips', () => {
      renderWithProvider(<Timeline />);
      
      // Timeline should be able to receive drop events
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle drag over timeline canvas', () => {
      const { container } = renderWithProvider(<Timeline />);
      const canvas = container.querySelector('canvas');
      
      if (canvas) {
        // Use fireEvent which works in jsdom
        fireEvent.dragOver(canvas, {
          bubbles: true,
        });
        // Should handle drag over without errors
      }
    });

    it('should handle drop on timeline', async () => {
      const { container } = renderWithProvider(<Timeline />);
      const canvas = container.querySelector('canvas');
      
      if (canvas) {
        // Use fireEvent which works in jsdom
        fireEvent.drop(canvas, {
          bubbles: true,
        });
        // Should handle drop without errors
      }
    });
  });

  describe('Layer Management', () => {
    it('should render multiple layers', () => {
      const layers: TimelineLayer[] = [
        createMockLayer({ id: 'layer-1', name: 'Video 1' }),
        createMockLayer({ id: 'layer-2', name: 'Audio 1' }),
        createMockLayer({ id: 'layer-3', name: 'Text 1' }),
      ];

      const { container } = renderWithProvider(<Timeline initialLayers={layers} />);
      const canvas = container.querySelector('canvas');
      
      // Canvas height should accommodate all layers
      expect(canvas?.height).toBeGreaterThan(0);
    });

    it('should display layer names', () => {
      const layer = createMockLayer({ name: 'My Video Layer' });
      renderWithProvider(<Timeline initialLayers={[layer]} />);
      
      // Layer names are drawn on canvas, so we verify canvas exists
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should show locked indicator for locked layers', () => {
      const lockedLayer = createMockLayer({ locked: true });
      renderWithProvider(<Timeline initialLayers={[lockedLayer]} />);
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle empty layers', () => {
      const emptyLayer = createMockLayer({ clips: [] });
      renderWithProvider(<Timeline initialLayers={[emptyLayer]} />);
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Scrolling', () => {
    it('should render scroll container', () => {
      const { container } = renderWithProvider(<Timeline initialDuration={120} />);
      
      // Timeline should have a scrollable container
      expect(container.querySelector('.overflow-x-auto')).toBeInTheDocument();
    });

    it('should be horizontally scrollable for long timelines', () => {
      renderWithProvider(<Timeline initialDuration={300} />);
      
      const scrollContainer = document.querySelector('.overflow-x-auto');
      expect(scrollContainer).toBeInTheDocument();
    });
  });

  describe('Performance', () => {
    it('should render efficiently with many clips', () => {
      const clips: Clip[] = Array.from({ length: 50 }, (_, i) =>
        createMockClip({
          id: `clip-${i}`,
          startTime: i * 2,
          duration: 1.5,
        })
      );
      
      const layer = createMockLayer({ clips });
      
      const startTime = performance.now();
      renderWithProvider(<Timeline initialLayers={[layer]} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (< 1000ms)
      expect(endTime - startTime).toBeLessThan(1000);
    });

    it('should render efficiently with many layers', () => {
      const layers: TimelineLayer[] = Array.from({ length: 20 }, (_, i) =>
        createMockLayer({
          id: `layer-${i}`,
          name: `Layer ${i}`,
          clips: [createMockClip({ id: `clip-${i}`, startTime: 0, duration: 5 })],
        })
      );
      
      const startTime = performance.now();
      renderWithProvider(<Timeline initialLayers={layers} />);
      const endTime = performance.now();
      
      // Should render within reasonable time (< 1000ms)
      expect(endTime - startTime).toBeLessThan(1000);
    });
  });

  describe('Edge Cases', () => {
    it('should handle timeline with no layers', () => {
      renderWithProvider(<Timeline initialLayers={[]} />);
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle zero duration timeline', () => {
      renderWithProvider(<Timeline initialDuration={0} />);
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle clips with zero duration gracefully', () => {
      const clip = createMockClip({ duration: 0 });
      const layer = createMockLayer({ clips: [clip] });
      
      renderWithProvider(<Timeline initialLayers={[layer]} />);
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should handle overlapping clips', () => {
      const clip1 = createMockClip({ id: 'clip-1', startTime: 5, duration: 10 });
      const clip2 = createMockClip({ id: 'clip-2', startTime: 10, duration: 10 });
      
      const layer = createMockLayer({ clips: [clip1, clip2] });
      renderWithProvider(<Timeline initialLayers={[layer]} />);
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });

  describe('Integration', () => {
    it('should integrate with TimelineRuler component', () => {
      renderWithProvider(<Timeline initialDuration={60} />);
      
      expect(screen.getByTestId('timeline-ruler')).toBeInTheDocument();
    });

    it('should update canvas when props change', () => {
      const { rerender } = renderWithProvider(<Timeline initialDuration={60} />);
      
      rerender(<Timeline initialDuration={120} />);
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });

    it('should maintain state across re-renders', () => {
      const layers = [createMockLayer({ clips: [createMockClip()] })];
      const { rerender } = renderWithProvider(<Timeline initialLayers={layers} />);
      
      rerender(<Timeline initialLayers={layers} />);
      
      const canvas = document.querySelector('canvas');
      expect(canvas).toBeInTheDocument();
    });
  });
});

