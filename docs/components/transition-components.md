# Transition UI Components

## Overview
Step 13 implementation includes two main components for handling video transitions:

1. **TransitionPanel** - A panel displaying transition presets that can be dragged onto clips
2. **TransitionIndicator** - Visual indicators on timeline clips showing active transitions

## Components

### TransitionPanel
Located at: `src/components/TransitionPanel.tsx`

**Features:**
- Grid display of 4 transition types: Fade, Cross Dissolve, Wipe, Slide
- Each preset shows an animated preview
- Drag-and-drop functionality to apply transitions to clips
- Duration slider (0.1s to 3.0s) to adjust transition length
- Color-coded cards for each transition type
- Instructions panel

**Usage:**
```tsx
import { TransitionPanel } from '@/components/TransitionPanel';

<TransitionPanel 
  onTransitionSelect={(transition) => {
    // Handle transition selection
    console.log('Selected transition:', transition);
  }}
/>
```

**Transition Types:**
- **Fade** (Blue) - Smooth fade in/out effect
- **Cross Dissolve** (Purple) - Crossfade between clips
- **Wipe** (Green) - Directional wipe transition
- **Slide** (Orange) - Slide in/out transition

### TransitionIndicator
Located at: `src/components/Timeline/TransitionIndicator.tsx`

**Features:**
- Displays small icon overlay on clip edges
- Shows transition type with color-coded icons
- Click to open editor dialog
- Edit transition duration
- Remove transition
- Tooltip with transition details on hover

**Usage:**
```tsx
import { TransitionIndicator } from '@/components/Timeline/TransitionIndicator';

<TransitionIndicator
  transition={{
    type: 'fade',
    duration: 1.0
  }}
  position="start" // or "end"
  onEdit={(transition) => {
    // Handle transition edit
    console.log('Edited transition:', transition);
  }}
  onRemove={() => {
    // Handle transition removal
    console.log('Removed transition');
  }}
/>
```

**Props:**
- `transition: Transition` - The transition object with type and duration
- `position: 'start' | 'end'` - Whether this is at clip start or end
- `onEdit?: (transition: Transition) => void` - Callback when transition is edited
- `onRemove?: () => void` - Callback when transition is removed

## TimelineClip Integration

The `TimelineClip` component has been updated to support transitions:

**New Props:**
- `onTransitionEdit?: (clipId: string, position: 'in' | 'out', transition: Transition) => void`
- `onTransitionRemove?: (clipId: string, position: 'in' | 'out') => void`

**Usage:**
```tsx
import { TimelineClip } from '@/components/Timeline';

<TimelineClip
  clip={clip}
  zoom={zoom}
  isSelected={isSelected}
  onSelect={handleSelect}
  onMove={handleMove}
  onTrim={handleTrim}
  onTransitionEdit={(clipId, position, transition) => {
    // Update clip transitions
    updateClipTransition(clipId, position, transition);
  }}
  onTransitionRemove={(clipId, position) => {
    // Remove clip transition
    removeClipTransition(clipId, position);
  }}
/>
```

## Data Structure

Transitions are stored in the `Clip` type (from `types/timeline.ts`):

```typescript
interface Clip {
  id: string;
  resourceId: string;
  startTime: number;
  duration: number;
  trimStart: number;
  trimEnd: number;
  transitions?: {
    in?: Transition;
    out?: Transition;
  };
  // ... other properties
}

interface Transition {
  type: 'fade' | 'dissolve' | 'wipe' | 'slide';
  duration: number; // in seconds
  properties?: Record<string, any>;
}
```

## Drag and Drop Flow

1. User drags transition preset from TransitionPanel
2. Transition data is stored in drag event as JSON
3. User drops on timeline clip edge
4. Drop handler parses transition data
5. Transition is attached to clip's `transitions.in` or `transitions.out`
6. TransitionIndicator appears on clip edge

## Visual Design

- **Color Scheme:**
  - Fade: Blue (#3B82F6)
  - Cross Dissolve: Purple (#A855F7)
  - Wipe: Green (#22C55E)
  - Slide: Orange (#F97316)

- **Icon Library:** Lucide React
- **UI Components:** shadcn/ui (Card, Dialog, Slider, Button)
- **Styling:** Tailwind CSS with animations

## Next Steps

To fully integrate transitions into the application:

1. **Timeline Context**: Add transition management actions
2. **Drop Handler**: Implement drop zone detection on clip edges
3. **Backend Integration**: Connect to transition service for rendering
4. **Preview**: Show transition effects in video player preview
5. **Export**: Include transitions in final video export

## Testing

Test the components by:
1. Adding TransitionPanel to your app layout
2. Creating clips with transitions in your test data
3. Verifying drag-and-drop functionality
4. Testing the transition editor dialog
5. Checking visual indicators on timeline

Example test clip:
```typescript
const testClip: Clip = {
  id: 'clip-1',
  resourceId: 'resource-1',
  startTime: 0,
  duration: 5,
  trimStart: 0,
  trimEnd: 0,
  transitions: {
    in: {
      type: 'fade',
      duration: 1.0
    },
    out: {
      type: 'dissolve',
      duration: 1.5
    }
  }
};
```
