# Testing Examples and Patterns

This document provides examples of the testing patterns used in the Video Editor test suite.

## Table of Contents
1. [Basic Component Testing](#basic-component-testing)
2. [User Interaction Testing](#user-interaction-testing)
3. [Canvas Testing](#canvas-testing)
4. [Utility Function Testing](#utility-function-testing)
5. [Mock Data Patterns](#mock-data-patterns)

---

## Basic Component Testing

### Rendering Tests
```typescript
import { render, screen } from '@testing-library/react';
import { Timeline } from '@/components/Timeline/Timeline';

describe('Timeline Component', () => {
  it('should render timeline canvas', () => {
    render(<Timeline />);
    
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  });

  it('should render with initial layers', () => {
    const mockLayers = [
      createMockLayer({ id: 'layer-1', clips: [createMockClip()] })
    ];

    render(<Timeline initialLayers={mockLayers} />);
    
    const canvas = document.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
    expect(canvas?.height).toBeGreaterThan(0);
  });
});
```

---

## User Interaction Testing

### Mouse Events
```typescript
import { fireEvent } from '@testing-library/react';

it('should update playhead position on canvas click', () => {
  const { container } = render(<Timeline initialDuration={60} />);
  const canvas = container.querySelector('canvas');
  
  expect(canvas).toBeInTheDocument();
  
  // Simulate click on canvas
  if (canvas) {
    fireEvent.mouseDown(canvas, {
      clientX: 250,
      clientY: 50,
    });
  }
});
```

### Drag Operations
```typescript
it('should allow dragging the playhead', () => {
  const { container } = render(<Timeline initialDuration={60} />);
  const canvas = container.querySelector('canvas');
  
  if (canvas) {
    // Start drag
    fireEvent.mouseDown(canvas, { clientX: 100, clientY: 50 });
    
    // Move mouse
    fireEvent.mouseMove(canvas, { clientX: 300, clientY: 50 });
    
    // End drag
    fireEvent.mouseUp(canvas);
  }
});
```

### Button Clicks
```typescript
it('should zoom in when zoom in button is clicked', () => {
  const { container } = render(<Timeline />);
  
  const zoomInButton = screen.getAllByRole('button').find(btn => 
    btn.querySelector('svg')?.classList.contains('lucide-plus')
  );
  
  if (zoomInButton) {
    fireEvent.click(zoomInButton);
    
    // Verify zoom effect
    const canvas = container.querySelector('canvas');
    expect(canvas).toBeInTheDocument();
  }
});
```

---

## Canvas Testing

### Canvas Context Mocking
Canvas operations are mocked in `src/test/setup.ts`:

```typescript
HTMLCanvasElement.prototype.getContext = function (contextId: string) {
  if (contextId === '2d') {
    return {
      fillRect: function () {},
      strokeRect: function () {},
      fillText: function () {},
      clearRect: function () {},
      // ... other canvas methods
    };
  }
  return null;
};
```

### Testing Canvas Rendering
```typescript
it('should render clips with correct visual properties', () => {
  const clip = createMockClip({
    id: 'clip-1',
    startTime: 5,
    duration: 10,
  });
  
  const layer = createMockLayer({ clips: [clip] });
  const { container } = render(<Timeline initialLayers={[layer]} />);
  
  const canvas = container.querySelector('canvas');
  const ctx = canvas?.getContext('2d');
  
  // Verify canvas context exists
  expect(ctx).toBeDefined();
});
```

---

## Utility Function Testing

### Pure Function Tests
```typescript
import { cutClipAtTime } from '@/utils/clipOperations';

describe('cutClipAtTime', () => {
  it('should split clip into two clips at the cut time', () => {
    const clip = createMockClip({
      id: 'clip-1',
      startTime: 5,
      duration: 10,
    });

    const result = cutClipAtTime(clip, 4);

    // Verify the split
    expect(result).toHaveLength(2);
    expect(result[0].duration).toBe(4);
    expect(result[1].duration).toBe(6);
    expect(result[0].startTime).toBe(5);
    expect(result[1].startTime).toBe(9); // 5 + 4
  });

  it('should preserve transitions correctly', () => {
    const clip = createMockClip({
      transitions: {
        in: { type: 'fade', duration: 1 },
        out: { type: 'dissolve', duration: 1 },
      },
    });

    const [firstClip, secondClip] = cutClipAtTime(clip, 5);

    // First clip keeps in transition
    expect(firstClip.transitions?.in).toEqual({ type: 'fade', duration: 1 });
    expect(firstClip.transitions?.out).toBeUndefined();

    // Second clip keeps out transition
    expect(secondClip.transitions?.in).toBeUndefined();
    expect(secondClip.transitions?.out).toEqual({ type: 'dissolve', duration: 1 });
  });
});
```

### Edge Case Testing
```typescript
describe('Edge Cases', () => {
  it('should return original clip if cut time is invalid', () => {
    const clip = createMockClip({ duration: 10 });
    
    // Test various invalid cut times
    expect(cutClipAtTime(clip, 0)).toHaveLength(1);
    expect(cutClipAtTime(clip, -1)).toHaveLength(1);
    expect(cutClipAtTime(clip, 10)).toHaveLength(1);
    expect(cutClipAtTime(clip, 15)).toHaveLength(1);
  });
});
```

---

## Mock Data Patterns

### Creating Mock Clips
```typescript
function createMockClip(overrides?: Partial<Clip>): Clip {
  return {
    id: 'clip-1',
    resourceId: 'resource-1',
    startTime: 0,
    duration: 10,
    trimStart: 0,
    trimEnd: 0,
    transitions: undefined,
    ...overrides,
  };
}

// Usage
const clip = createMockClip({
  id: 'custom-clip',
  startTime: 5,
  duration: 20,
});
```

### Creating Mock Layers
```typescript
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

// Usage
const layer = createMockLayer({
  type: 'audio',
  name: 'Audio Track',
  clips: [createMockClip(), createMockClip({ id: 'clip-2' })],
});
```

### Complex Mock Scenarios
```typescript
it('should handle complex layer setup', () => {
  const layers: TimelineLayer[] = [
    createMockLayer({
      id: 'video-layer',
      type: 'video',
      clips: [
        createMockClip({ id: 'v1', startTime: 0, duration: 10 }),
        createMockClip({ id: 'v2', startTime: 10, duration: 8 }),
      ],
    }),
    createMockLayer({
      id: 'audio-layer',
      type: 'audio',
      clips: [
        createMockClip({ id: 'a1', startTime: 0, duration: 18 }),
      ],
    }),
  ];

  render(<Timeline initialLayers={layers} />);
  // Test complex scenario
});
```

---

## Performance Testing

### Render Performance
```typescript
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
  render(<Timeline initialLayers={[layer]} />);
  const endTime = performance.now();
  
  // Should render within 1 second
  expect(endTime - startTime).toBeLessThan(1000);
});
```

---

## Best Practices

### ✅ DO

1. **Test user behavior, not implementation**
   ```typescript
   // Good: Test what user sees/does
   fireEvent.click(screen.getByRole('button', { name: 'Zoom In' }));
   
   // Avoid: Testing internal state directly
   expect(component.state.zoom).toBe(100);
   ```

2. **Use descriptive test names**
   ```typescript
   // Good
   it('should split clip into two clips at the cut time')
   
   // Avoid
   it('cut test')
   ```

3. **Test one thing per test**
   ```typescript
   // Good: Focused test
   it('should update playhead position on canvas click', () => {
     // Test only playhead positioning
   });
   
   // Avoid: Testing multiple things
   it('should handle everything', () => {
     // Testing playhead, zoom, and clip rendering
   });
   ```

4. **Use proper cleanup**
   ```typescript
   beforeEach(() => {
     // Setup
   });

   afterEach(() => {
     vi.clearAllMocks();
   });
   ```

### ❌ DON'T

1. **Don't test implementation details**
2. **Don't write brittle tests that break with minor changes**
3. **Don't skip edge cases**
4. **Don't forget to test error conditions**

---

## Running Tests

### Run all tests
```bash
npm test
```

### Run specific test file
```bash
npm test src/components/__tests__/Timeline.test.tsx
```

### Run tests in watch mode
```bash
npm run test
```

### Run tests with UI
```bash
npm run test:ui
```

### Run tests and generate coverage
```bash
npm test -- --coverage
```

---

## Resources

- [Vitest Documentation](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/react)
- [Testing Library Best Practices](https://kentcdodds.com/blog/common-mistakes-with-react-testing-library)

---

**Last Updated:** January 6, 2026
