# Export Service and Router Tests Documentation

## Overview
Comprehensive test suite for the video export functionality including the ExportService class and Export API endpoints.

## Test Files

### 1. test_export_service.py
Tests for the ExportService class that handles video rendering and export operations.

#### Test Coverage

**Initialization Tests:**
- `test_export_service_initialization` - Verifies service initialization with correct directories
- `test_resolution_presets` - Validates resolution presets (1080p, 720p, 480p)

**Single Clip Export Tests:**
- `test_export_single_video_clip` - Basic export with one video clip
- `test_export_with_trimmed_clip` - Export with trimmed video (trimStart/trimEnd)
- `test_export_with_fade_transitions` - Export with fade in/out transitions

**Multiple Clips Tests:**
- `test_export_multiple_video_clips` - Export timeline with sequential video clips
- `test_export_with_audio_track` - Export with separate audio layer
- `test_export_with_text_overlay` - Export with text layer overlays

**Progress and Callbacks:**
- `test_export_with_progress_callback` - Verifies progress updates during export

**Layer Management:**
- `test_export_invisible_layer_ignored` - Confirms invisible layers are skipped
- `test_export_empty_timeline` - Handles empty timeline by creating blank video

**Utility Functions:**
- `test_find_media_file` - Tests media file lookup by resource ID
- `test_cleanup_export` - Verifies file cleanup functionality

**Resolution Tests:**
- `test_export_with_different_resolutions` - Tests all resolution presets

**Error Handling:**
- `test_export_error_handling` - Tests handling of missing/invalid media files

#### Helper Methods
- `create_test_video()` - Creates test video files with optional audio
- `create_test_audio()` - Creates test audio files

### 2. test_export_router.py
Tests for the FastAPI export router endpoints.

#### Test Coverage

**Export Start Endpoint (POST /export/start):**
- `test_start_export_endpoint` - Basic export task creation
- `test_start_export_with_default_filename` - Auto-generated filename handling
- `test_export_request_validation` - Request validation
- `test_export_with_custom_fps` - Custom FPS settings
- `test_concurrent_export_tasks` - Multiple simultaneous exports

**Export Status Endpoint (GET /export/status/{task_id}):**
- `test_get_export_status_pending` - Status for pending tasks
- `test_get_export_status_processing` - Status during processing
- `test_get_export_status_completed` - Status for completed tasks
- `test_get_export_status_failed` - Status for failed tasks
- `test_get_export_status_not_found` - Non-existent task handling

**Export Download Endpoint (GET /export/download/{task_id}):**
- `test_download_export_success` - Successful file download
- `test_download_export_not_completed` - Download before completion fails
- `test_download_export_not_found` - Non-existent task handling
- `test_download_export_file_not_found` - Missing output file handling

**Export Cancel Endpoint (DELETE /export/cancel/{task_id}):**
- `test_cancel_export` - Cancelling active task
- `test_cancel_completed_export` - Cannot cancel completed task
- `test_cancel_nonexistent_export` - Non-existent task handling

**Task Management Endpoints:**
- `test_list_export_tasks` - Lists all export tasks (GET /export/tasks)
- `test_list_export_tasks_empty` - Empty task list handling
- `test_cleanup_completed_tasks` - Cleanup completed/failed tasks (DELETE /export/cleanup)
- `test_cleanup_with_no_completed_tasks` - Cleanup with no tasks to remove

#### Fixtures
- `client` - FastAPI TestClient for API requests
- `cleanup_tasks` - Clears export_tasks before/after each test
- `setup_test_dirs` - Creates temporary test directories and test video

## Running the Tests

### Run All Export Tests
```bash
cd backend
pytest tests/test_export_service.py tests/test_export_router.py -v
```

### Run Service Tests Only
```bash
pytest tests/test_export_service.py -v
```

### Run Router Tests Only
```bash
pytest tests/test_export_router.py -v
```

### Run Specific Test
```bash
pytest tests/test_export_service.py::TestExportService::test_export_single_video_clip -v
```

### Run with Coverage
```bash
pytest tests/test_export_service.py tests/test_export_router.py --cov=services.export_service --cov=routers.export --cov-report=html
```

## Test Dependencies

Required packages (should be in requirements.txt):
- pytest
- pytest-cov
- fastapi
- moviepy
- numpy
- pillow

## Test Data

Tests create temporary:
- Video files (MP4 format, H.264 codec)
- Audio files (MP3 format)
- Output directories
- Export files

All test data is automatically cleaned up after test execution.

## Key Test Scenarios

### 1. Basic Export Flow
```python
timeline_data = {
    "duration": 2.0,
    "layers": [{
        "type": "video",
        "visible": True,
        "clips": [{
            "resourceId": "test_video",
            "startTime": 0.0,
            "duration": 2.0,
            "transitions": []
        }]
    }]
}
```

### 2. Export with Transitions
```python
"transitions": [
    {"type": "fadeIn", "duration": 0.5, "position": "start"},
    {"type": "fadeOut", "duration": 0.5, "position": "end"}
]
```

### 3. Export with Multiple Layers
```python
"layers": [
    {"type": "video", "clips": [...]},
    {"type": "audio", "clips": [...]},
    {"type": "text", "clips": [...]}
]
```

### 4. API Request Flow
```python
# Start export
response = client.post("/export/start", json={...})
task_id = response.json()["task_id"]

# Check status
response = client.get(f"/export/status/{task_id}")

# Download when complete
response = client.get(f"/export/download/{task_id}")
```

## Expected Test Results

All tests should pass with:
- Export service correctly processes timeline data
- Video clips are trimmed, resized, and composited
- Transitions are applied properly
- Audio tracks are mixed correctly
- Text overlays are rendered
- API endpoints return correct status codes
- Task management works as expected
- File cleanup happens automatically

## Troubleshooting

### Common Issues

**1. MoviePy Errors:**
- Ensure FFmpeg is installed and in PATH
- Check video codec support (H.264 recommended)

**2. Temporary File Cleanup:**
- Tests automatically clean up temporary files
- If tests fail, check for leftover files in system temp directory

**3. Slow Tests:**
- Video processing can be slow
- Consider using shorter durations for test videos
- Use pytest-xdist for parallel execution

**4. Memory Issues:**
- Large video files can consume significant memory
- Tests use small resolutions (480p) to minimize memory usage

## Coverage Goals

Target coverage:
- ExportService: >90%
- Export Router: >95%
- Error handling paths: 100%

## Future Test Additions

Potential additional tests:
- Large file handling (>1GB)
- Very long duration videos (>1 hour)
- Complex transition sequences
- Performance benchmarking
- Concurrent export limits
- Memory usage profiling
- Network interruption during download
- Disk space handling
