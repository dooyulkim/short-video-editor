"""
README for Backend Tests

## Running Tests

### Install pytest
```bash
pip install pytest pytest-cov
```

### Run all tests
```bash
# From backend directory
pytest tests/ -v

# Or using python
python -m pytest tests/ -v
```

### Run specific test file
```bash
pytest tests/test_media_service.py -v
pytest tests/test_audio_service.py -v
```

### Run tests with coverage
```bash
pytest tests/ --cov=services --cov-report=html
```

### Run specific test
```bash
pytest tests/test_media_service.py::TestMediaService::test_extract_video_metadata_with_audio -v
```

## Test Structure

- `conftest.py` - pytest configuration and shared fixtures
- `test_media_service.py` - Tests for MediaService class
- `test_audio_service.py` - Tests for AudioService class

## Test Coverage

### MediaService Tests
- File upload and storage
- Video metadata extraction (with/without audio)
- Audio metadata extraction
- Image metadata extraction
- Thumbnail generation
- Waveform visualization
- Media deletion

### AudioService Tests
- Waveform data generation (various widths)
- Audio extraction from video
- Audio duration retrieval
- Temporary file cleanup
- Error handling for invalid files
- Full workflow integration tests

## Requirements

All tests use the same dependencies as the main application:
- moviepy
- opencv-python
- pillow
- numpy
- pytest

## Notes

- Tests create temporary directories and files
- All test artifacts are cleaned up automatically
- Tests use realistic audio/video generation
- Error cases are thoroughly tested
