# Project Manager Component

This document describes the Project Save/Load functionality implemented for the Video Editor.

## Overview

The ProjectControls component provides functionality to:

- **Save projects** as JSON files to disk
- **Load projects** from JSON files
- **Create new projects** (with confirmation dialog)
- **Rename projects** - Change the current project name
- **Manage projects** - View and delete non-current projects
- **Track recent projects** in localStorage
- Display current project name

## Files Created

### 1. `/src/types/project.ts`

Defines TypeScript interfaces for project data:

- `ProjectData` - Complete project structure with timeline data
- `RecentProject` - Metadata for recent projects list
- `ProjectMetadata` - Basic project information

### 2. `/src/utils/projectUtils.ts`

Utility functions for project management:

- `serializeProject()` - Convert timeline state to JSON
- `validateProject()` - Validate loaded JSON structure
- `saveProjectToFile()` - Save project as downloadable JSON file
- `loadProjectFromFile()` - Load project from user-selected file
- `getRecentProjects()` - Get recent projects from localStorage
- `addToRecentProjects()` - Add project to recent list
- `removeFromRecentProjects()` - Remove project from recent list
- `formatProjectDate()` - Format date for display

### 3. `/src/components/Project/ProjectControls.tsx`

Main component that provides the UI for project management:

- Save button with dialog for naming projects
- Load button to select and open project files
- New button to create fresh project (with confirmation)
- Rename button to change current project name
- Manage Projects dialog to view/delete other projects
- Recent projects tracking
- Toast notifications for user feedback

### 4. `/src/services/api.ts`

API functions for backend integration:

- `deleteProject(projectId)` - Delete all media for a project from backend

## Usage

### Basic Integration

```tsx
import { ProjectManager } from "@/components/Project/ProjectManager";
import { TimelineProvider } from "@/context/TimelineContext";

function App() {
	return (
		<TimelineProvider>
			<div className="app-header">
				<ProjectManager />
			</div>
			{/* Rest of your app */}
		</TimelineProvider>
	);
}
```

### Project JSON Structure

```json
{
  "id": "uuid-v4",
  "name": "My Video Project",
  "version": "1.0.0",
  "createdAt": "2024-01-05T10:30:00.000Z",
  "updatedAt": "2024-01-05T11:45:00.000Z",
  "timeline": {
    "layers": [
      {
        "id": "layer-1",
        "type": "video",
        "clips": [...],
        "locked": false,
        "visible": true,
        "name": "Video Layer 1"
      }
    ],
    "duration": 120.5,
    "zoom": 20
  }
}
```

## Features

### 1. Save Project

- Opens dialog to enter/edit project name
- Serializes entire timeline state to JSON
- Downloads JSON file to user's computer
- Adds project to recent projects list
- Shows success toast notification

### 2. Load Project

- Opens file picker for .json files
- Validates project file structure
- Restores timeline state from JSON
- Updates project name and ID
- Adds to recent projects
- Shows success/error toast notification

### 3. New Project

- Shows confirmation dialog (prevents accidental data loss)
- Resets timeline to initial state
- Clears project name and ID
- Shows confirmation toast

### 4. Recent Projects

- Stores up to 10 recent projects in localStorage
- Displays project name and last opened time
- Allows removal from recent list
- Automatically updates when projects are saved/loaded

### 5. Rename Project

- Opens dialog to change current project name
- Updates project name instantly
- Shows confirmation toast

### 6. Manage Projects

- Opens dialog showing all recent projects
- Displays project name and last opened date
- Shows "Current" badge on active project
- Allows deleting non-current projects
- Deletion includes:
  - Removes all media files from backend
  - Removes thumbnail directory
  - Removes from recent projects list
- Shows confirmation dialog before deletion
- Current project cannot be deleted (protected)

## Updates to TimelineContext

Added two new methods to the TimelineContext:

### `restoreState(state: TimelineState)`

Restores the timeline to a specific state (used when loading projects)

### `resetTimeline()`

Resets the timeline to initial empty state (used for new projects)

## Dependencies

The component uses these shadcn/ui components:

- `Button` - Action buttons
- `Dialog` - Modal dialogs for save/new project
- `Input` - Project name input
- `Card` - Recent projects display
- `ScrollArea` - Scrollable recent projects list
- `Separator` - Visual separators
- `useToast` - Toast notifications

Icons from `lucide-react`:

- `Save`, `FolderOpen`, `FileText`, `Trash2`, `Download`, `Upload`, `Clock`

## Error Handling

The implementation includes comprehensive error handling:

- Invalid JSON format detection
- File read errors
- localStorage errors (gracefully degraded)
- User cancellation handling
- Toast notifications for all error states

## LocalStorage Structure

Recent projects are stored in localStorage with the key `videoEditor_recentProjects`:

```json
[
	{
		"id": "uuid-v4",
		"name": "My Video Project",
		"lastOpened": "2024-01-05T11:45:00.000Z"
	}
]
```

## Future Enhancements

Potential improvements:

1. Auto-save functionality with intervals
2. Cloud storage integration (Google Drive, Dropbox)
3. Project thumbnails in recent list
4. Project templates
5. Version history/snapshots
6. Collaborative editing support
7. Project export to different formats
8. Import from other video editing software

## Testing

To test the ProjectControls:

1. **Save a project:**

   - Add some clips to timeline
   - Click "Save" button
   - Enter project name
   - Verify JSON file downloads

2. **Load a project:**

   - Click "Load" button
   - Select previously saved JSON file
   - Verify timeline is restored correctly

3. **New project:**

   - Click "New" button
   - Enter project name
   - Confirm in dialog
   - Verify timeline is cleared

4. **Recent projects:**

   - Save/load multiple projects
   - Verify they appear in recent list
   - Test removing from recent list

5. **Rename project:**

   - Click project name dropdown
   - Select "Rename Project"
   - Enter new name
   - Verify name is updated

6. **Manage/Delete projects:**
   - Click project name dropdown
   - Select "Manage Projects"
   - Verify list shows all recent projects
   - Verify current project shows "Current" badge
   - Click delete (trash) icon on non-current project
   - Confirm deletion in dialog
   - Verify project is removed from list
   - Verify backend media is deleted
