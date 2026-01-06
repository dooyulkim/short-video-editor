# ExportDialog Component

A complete export dialog component for the video editor application with progress tracking and download functionality.

## Features

- **Export Settings Configuration**:
  - Resolution selection (1080p, 720p, 480p)
  - Format selection (MP4, WebM)
  - Quality radio group (High, Medium, Low)
  - Custom filename input

- **Real-time Progress Tracking**:
  - Progress bar with percentage
  - Status updates (pending, processing, completed, failed)
  - Automatic polling every 2 seconds

- **Export Management**:
  - Start export with validation
  - Cancel/close functionality
  - Download completed video with blob URL
  - Error handling with user feedback

## Usage

```tsx
import { useState } from 'react';
import { ExportDialog } from '@/components/Export';
import { Button } from '@/components/ui/button';
import type { Timeline } from '@/types/timeline';

function App() {
  const [isExportDialogOpen, setIsExportDialogOpen] = useState(false);
  const [timeline, setTimeline] = useState<Timeline>({
    // Your timeline data
  });

  return (
    <div>
      <Button onClick={() => setIsExportDialogOpen(true)}>
        Export Video
      </Button>

      <ExportDialog
        open={isExportDialogOpen}
        onOpenChange={setIsExportDialogOpen}
        timeline={timeline}
      />
    </div>
  );
}
```

## Props

| Prop | Type | Description |
|------|------|-------------|
| `open` | `boolean` | Controls dialog open/close state |
| `onOpenChange` | `(open: boolean) => void` | Callback when dialog state changes |
| `timeline` | `Timeline` | Timeline data to export |

## Dependencies

- `@radix-ui/react-dialog` - Dialog component
- `@radix-ui/react-select` - Select dropdowns
- `@radix-ui/react-radio-group` - Radio button group
- `@radix-ui/react-progress` - Progress bar
- `lucide-react` - Icons
- `axios` - HTTP requests

## API Integration

The component expects the following backend endpoints:

1. **POST `/export/start`**
   - Body: `{ timeline, settings }`
   - Returns: `{ task_id, status }`

2. **GET `/export/status/:taskId`**
   - Returns: `{ task_id, status, progress, error?, output_path? }`

3. **GET `/export/download/:taskId`**
   - Returns: Video file as blob

## Error Handling

- Displays user-friendly error messages
- Handles network failures gracefully
- Confirms before closing during active export
- Cleans up blob URLs on unmount

## Features Implemented

✅ Resolution selection (1080p, 720p, 480p)  
✅ Format selection (MP4, WebM)  
✅ Quality radio group (High, Medium, Low)  
✅ Filename input with validation  
✅ Export button to start export  
✅ Progress bar with real-time updates  
✅ Status polling every 2 seconds  
✅ Download button when complete  
✅ Cancel button with confirmation  
✅ Error handling and display  
✅ Loading states and animations  
✅ Clean resource management (blob URLs)
