import pytest
from services.timeline_service import TimelineService


class TestTimelineService:
    """Test suite for TimelineService"""

    @pytest.fixture
    def timeline_service(self, tmp_path):
        """Create a timeline service with temporary directories"""
        upload_dir = tmp_path / "uploads"
        temp_dir = tmp_path / "temp_video"
        upload_dir.mkdir()
        temp_dir.mkdir()
        return TimelineService(str(upload_dir), str(temp_dir))

    @pytest.fixture
    def sample_video_path(self, tmp_path):
        """Create a sample video file for testing"""
        # This would normally create a real video file
        # For testing, we'll skip actual video operations
        video_path = tmp_path / "test_video.mp4"
        video_path.touch()
        return str(video_path)

    def test_timeline_service_initialization(self, timeline_service):
        """Test that timeline service initializes correctly"""
        assert timeline_service is not None
        assert timeline_service.upload_dir.exists()
        assert timeline_service.temp_dir.exists()
        assert timeline_service.executor is not None

    def test_directories_created(self, tmp_path):
        """Test that directories are created if they don't exist"""
        upload_dir = tmp_path / "new_uploads"
        temp_dir = tmp_path / "new_temp"
        
        TimelineService(str(upload_dir), str(temp_dir))
        
        assert upload_dir.exists()
        assert temp_dir.exists()

    def test_processing_status_initialization(self, timeline_service):
        """Test that processing status dict is initialized"""
        assert hasattr(timeline_service, 'processing_status')
        assert isinstance(timeline_service.processing_status, dict)
        assert len(timeline_service.processing_status) == 0

    def test_get_task_status_nonexistent(self, timeline_service):
        """Test getting status of non-existent task"""
        status = timeline_service.get_task_status("nonexistent-task-id")
        assert status is None

    def test_cleanup_temp_files_empty_directory(self, timeline_service):
        """Test cleanup when temp directory is empty"""
        # Should not raise any errors
        timeline_service.cleanup_temp_files(max_age_hours=24)
        assert timeline_service.temp_dir.exists()

    def test_thread_pool_executor_config(self, timeline_service):
        """Test that ThreadPoolExecutor is configured correctly"""
        assert timeline_service.executor is not None
        assert timeline_service.executor._max_workers == 3
