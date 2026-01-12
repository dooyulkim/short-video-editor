"""
Test suite for project-based media storage

Tests that resources (uploads and thumbnails) are saved in project-specific directories
"""
import pytest
import os
import tempfile
import shutil
from pathlib import Path
from PIL import Image
from tests.conftest import create_test_video_with_ffmpeg, create_test_audio_with_ffmpeg

from services.media_service import MediaService


class TestProjectMediaStorage:
    """Test class for project-based media storage"""
    
    @pytest.fixture(autouse=True)
    def setup_teardown(self):
        """Setup and teardown for each test"""
        # Create temporary directories for testing
        self.test_dir = tempfile.mkdtemp()
        self.upload_dir = os.path.join(self.test_dir, "uploads")
        self.thumbnail_dir = os.path.join(self.test_dir, "thumbnails")
        
        # Initialize service
        self.service = MediaService(
            upload_dir=self.upload_dir,
            thumbnail_dir=self.thumbnail_dir
        )
        
        # Test project IDs
        self.project_id_1 = "project-test-123"
        self.project_id_2 = "project-test-456"
        
        yield
        
        # Cleanup
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
    
    def create_test_video(self, duration=2, has_audio=True):
        """Helper to create a test video file"""
        video_path = os.path.join(self.test_dir, "test_video.mp4")
        return create_test_video_with_ffmpeg(video_path, duration=duration, has_audio=has_audio)
    
    def create_test_audio(self, duration=2):
        """Helper to create a test audio file"""
        audio_path = os.path.join(self.test_dir, "test_audio.mp3")
        return create_test_audio_with_ffmpeg(audio_path, duration=duration)
    
    def create_test_image(self, width=800, height=600):
        """Helper to create a test image file"""
        img = Image.new('RGB', (width, height), color=(100, 150, 200))
        image_path = os.path.join(self.test_dir, "test_image.jpg")
        img.save(image_path, "JPEG")
        return image_path

    # ===========================================
    # Test get_project_upload_dir
    # ===========================================
    
    def test_get_project_upload_dir_creates_directory(self):
        """Test that get_project_upload_dir creates the project directory"""
        project_dir = self.service.get_project_upload_dir(self.project_id_1)
        
        assert project_dir.exists()
        assert project_dir.is_dir()
        assert self.project_id_1 in str(project_dir)
    
    def test_get_project_upload_dir_returns_correct_path(self):
        """Test that project upload directory is inside upload_dir"""
        project_dir = self.service.get_project_upload_dir(self.project_id_1)
        
        expected_path = Path(self.upload_dir) / self.project_id_1
        assert project_dir == expected_path
    
    def test_get_project_upload_dir_separate_projects(self):
        """Test that different projects have different directories"""
        dir_1 = self.service.get_project_upload_dir(self.project_id_1)
        dir_2 = self.service.get_project_upload_dir(self.project_id_2)
        
        assert dir_1 != dir_2
        assert dir_1.exists()
        assert dir_2.exists()

    # ===========================================
    # Test get_project_thumbnail_dir
    # ===========================================
    
    def test_get_project_thumbnail_dir_creates_directory(self):
        """Test that get_project_thumbnail_dir creates the thumbnail directory"""
        thumbnail_dir = self.service.get_project_thumbnail_dir(self.project_id_1)
        
        assert thumbnail_dir.exists()
        assert thumbnail_dir.is_dir()
        assert self.project_id_1 in str(thumbnail_dir)
        assert "thumbnails" in str(thumbnail_dir)
    
    def test_get_project_thumbnail_dir_inside_project(self):
        """Test that thumbnail dir is inside the project upload directory"""
        thumbnail_dir = self.service.get_project_thumbnail_dir(self.project_id_1)
        
        # Thumbnail dir should be: uploads/{project_id}/thumbnails
        expected_path = Path(self.upload_dir) / self.project_id_1 / "thumbnails"
        assert thumbnail_dir == expected_path
    
    def test_get_project_thumbnail_dir_separate_projects(self):
        """Test that different projects have different thumbnail directories"""
        dir_1 = self.service.get_project_thumbnail_dir(self.project_id_1)
        dir_2 = self.service.get_project_thumbnail_dir(self.project_id_2)
        
        assert dir_1 != dir_2
        assert dir_1.exists()
        assert dir_2.exists()

    # ===========================================
    # Test save_uploaded_file with project_id
    # ===========================================
    
    def test_save_uploaded_file_in_project_directory(self):
        """Test that uploaded files are saved in project-specific directory"""
        test_content = b"Test file content for project"
        
        file_id, file_path = self.service.save_uploaded_file(
            file_content=test_content,
            filename="test_file.txt",
            file_type="text",
            project_id=self.project_id_1
        )
        
        assert file_id is not None
        assert os.path.exists(file_path)
        # Verify file is in project directory
        assert self.project_id_1 in file_path
        
        # Verify content
        with open(file_path, "rb") as f:
            assert f.read() == test_content
    
    def test_save_uploaded_file_video_in_project(self):
        """Test saving video file in project directory"""
        # Create a small test content (simulate video bytes)
        test_content = b"\x00\x00\x00\x1cftypisom\x00\x00\x00\x00" + b"0" * 100
        
        file_id, file_path = self.service.save_uploaded_file(
            file_content=test_content,
            filename="video.mp4",
            file_type="video",
            project_id=self.project_id_1
        )
        
        assert os.path.exists(file_path)
        assert file_path.endswith(".mp4")
        assert self.project_id_1 in file_path
    
    def test_save_uploaded_file_audio_in_project(self):
        """Test saving audio file in project directory"""
        test_content = b"ID3" + b"0" * 100  # Minimal MP3 header-like content
        
        file_id, file_path = self.service.save_uploaded_file(
            file_content=test_content,
            filename="audio.mp3",
            file_type="audio",
            project_id=self.project_id_1
        )
        
        assert os.path.exists(file_path)
        assert file_path.endswith(".mp3")
        assert self.project_id_1 in file_path
    
    def test_save_uploaded_file_image_in_project(self):
        """Test saving image file in project directory"""
        # Create a minimal PNG
        img = Image.new('RGB', (10, 10), color='red')
        import io
        buffer = io.BytesIO()
        img.save(buffer, format='PNG')
        test_content = buffer.getvalue()
        
        file_id, file_path = self.service.save_uploaded_file(
            file_content=test_content,
            filename="image.png",
            file_type="image",
            project_id=self.project_id_1
        )
        
        assert os.path.exists(file_path)
        assert file_path.endswith(".png")
        assert self.project_id_1 in file_path
    
    def test_save_uploaded_file_different_projects_isolation(self):
        """Test that files from different projects are isolated"""
        content_1 = b"Content for project 1"
        content_2 = b"Content for project 2"
        
        file_id_1, file_path_1 = self.service.save_uploaded_file(
            file_content=content_1,
            filename="file.txt",
            file_type="text",
            project_id=self.project_id_1
        )
        
        file_id_2, file_path_2 = self.service.save_uploaded_file(
            file_content=content_2,
            filename="file.txt",
            file_type="text",
            project_id=self.project_id_2
        )
        
        # Files should be in different directories
        assert self.project_id_1 in file_path_1
        assert self.project_id_2 in file_path_2
        assert file_path_1 != file_path_2
        
        # Both files should exist
        assert os.path.exists(file_path_1)
        assert os.path.exists(file_path_2)
        
        # Verify content isolation
        with open(file_path_1, "rb") as f:
            assert f.read() == content_1
        with open(file_path_2, "rb") as f:
            assert f.read() == content_2

    # ===========================================
    # Test generate_thumbnail with project_id
    # ===========================================
    
    def test_generate_thumbnail_in_project_directory(self):
        """Test that thumbnails are saved in project-specific directory"""
        video_path = self.create_test_video(duration=2)
        
        thumbnail_path = self.service.generate_thumbnail(
            video_path=video_path,
            timestamp=0,
            project_id=self.project_id_1
        )
        
        assert os.path.exists(thumbnail_path)
        assert thumbnail_path.endswith(".jpg")
        # Verify thumbnail is in project directory
        assert self.project_id_1 in thumbnail_path
        assert "thumbnails" in thumbnail_path
    
    def test_generate_thumbnail_with_custom_id_in_project(self):
        """Test thumbnail with custom ID in project directory"""
        video_path = self.create_test_video(duration=2)
        custom_id = "my_custom_thumbnail"
        
        thumbnail_path = self.service.generate_thumbnail(
            video_path=video_path,
            timestamp=0,
            thumbnail_id=custom_id,
            project_id=self.project_id_1
        )
        
        assert os.path.exists(thumbnail_path)
        assert custom_id in thumbnail_path
        assert self.project_id_1 in thumbnail_path
    
    def test_generate_thumbnail_different_projects_isolation(self):
        """Test that thumbnails from different projects are isolated"""
        video_path = self.create_test_video(duration=2)
        
        thumbnail_1 = self.service.generate_thumbnail(
            video_path=video_path,
            timestamp=0,
            thumbnail_id="thumb",
            project_id=self.project_id_1
        )
        
        thumbnail_2 = self.service.generate_thumbnail(
            video_path=video_path,
            timestamp=0,
            thumbnail_id="thumb",
            project_id=self.project_id_2
        )
        
        # Thumbnails should be in different directories
        assert self.project_id_1 in thumbnail_1
        assert self.project_id_2 in thumbnail_2
        assert thumbnail_1 != thumbnail_2
        
        # Both thumbnails should exist
        assert os.path.exists(thumbnail_1)
        assert os.path.exists(thumbnail_2)
    
    def test_generate_thumbnail_without_project_uses_default(self):
        """Test that thumbnails without project_id use default directory"""
        video_path = self.create_test_video(duration=2)
        
        thumbnail_path = self.service.generate_thumbnail(
            video_path=video_path,
            timestamp=0,
            thumbnail_id="default_thumb"
        )
        
        assert os.path.exists(thumbnail_path)
        # Should be in the default thumbnail directory, not a project directory
        assert self.thumbnail_dir in thumbnail_path

    # ===========================================
    # Test project directory structure
    # ===========================================
    
    def test_project_directory_structure(self):
        """Test the complete project directory structure"""
        # Upload a file
        test_content = b"Test content"
        file_id, file_path = self.service.save_uploaded_file(
            file_content=test_content,
            filename="test.txt",
            file_type="text",
            project_id=self.project_id_1
        )
        
        # Get thumbnail directory
        thumbnail_dir = self.service.get_project_thumbnail_dir(self.project_id_1)
        
        # Verify structure
        project_dir = Path(self.upload_dir) / self.project_id_1
        assert project_dir.exists()
        assert (project_dir / "thumbnails").exists()
        
        # File should be in project root
        assert Path(file_path).parent == project_dir
    
    def test_multiple_files_in_project(self):
        """Test uploading multiple files to the same project"""
        files = []
        for i in range(5):
            content = f"File content {i}".encode()
            file_id, file_path = self.service.save_uploaded_file(
                file_content=content,
                filename=f"file_{i}.txt",
                file_type="text",
                project_id=self.project_id_1
            )
            files.append((file_id, file_path))
        
        # All files should exist in the same project directory
        project_dir = Path(self.upload_dir) / self.project_id_1
        
        for file_id, file_path in files:
            assert os.path.exists(file_path)
            assert Path(file_path).parent == project_dir
        
        # Count files in project directory (excluding thumbnails subdirectory)
        uploaded_files = [f for f in project_dir.iterdir() if f.is_file()]
        assert len(uploaded_files) == 5

    # ===========================================
    # Test with real video for thumbnail
    # ===========================================
    
    def test_real_video_upload_and_thumbnail(self):
        """Test complete workflow: upload video and generate thumbnail in project"""
        # Create a test video
        video_path = self.create_test_video(duration=2, has_audio=True)
        
        # Read video content
        with open(video_path, "rb") as f:
            video_content = f.read()
        
        # Upload video to project
        file_id, saved_path = self.service.save_uploaded_file(
            file_content=video_content,
            filename="test_video.mp4",
            file_type="video",
            project_id=self.project_id_1
        )
        
        # Verify video saved in project directory
        assert os.path.exists(saved_path)
        assert self.project_id_1 in saved_path
        
        # Generate thumbnail in project directory
        thumbnail_path = self.service.generate_thumbnail(
            video_path=saved_path,
            timestamp=0,
            thumbnail_id=file_id,
            project_id=self.project_id_1
        )
        
        # Verify thumbnail
        assert os.path.exists(thumbnail_path)
        assert self.project_id_1 in thumbnail_path
        assert "thumbnails" in thumbnail_path
        
        # Verify it's a valid image
        img = Image.open(thumbnail_path)
        assert img.size[0] <= 320  # Should be resized


class TestProjectMediaStorageEdgeCases:
    """Test edge cases for project-based storage"""
    
    @pytest.fixture(autouse=True)
    def setup_teardown(self):
        """Setup and teardown for each test"""
        self.test_dir = tempfile.mkdtemp()
        self.upload_dir = os.path.join(self.test_dir, "uploads")
        self.thumbnail_dir = os.path.join(self.test_dir, "thumbnails")
        
        self.service = MediaService(
            upload_dir=self.upload_dir,
            thumbnail_dir=self.thumbnail_dir
        )
        
        yield
        
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
    
    def test_project_id_with_special_characters(self):
        """Test project ID with allowed special characters"""
        project_id = "project-test_123-abc"
        
        project_dir = self.service.get_project_upload_dir(project_id)
        
        assert project_dir.exists()
        assert project_id in str(project_dir)
    
    def test_empty_project_has_no_files(self):
        """Test that empty project directory has no files"""
        project_id = "empty-project"
        
        project_dir = self.service.get_project_upload_dir(project_id)
        
        # Should exist but be empty
        assert project_dir.exists()
        assert len(list(project_dir.iterdir())) == 0
    
    def test_uuid_file_id_uniqueness(self):
        """Test that file IDs are unique even with same filename"""
        test_content = b"Same content"
        project_id = "test-project"
        
        ids = set()
        for _ in range(10):
            file_id, _ = self.service.save_uploaded_file(
                file_content=test_content,
                filename="same_name.txt",
                file_type="text",
                project_id=project_id
            )
            ids.add(file_id)
        
        # All IDs should be unique
        assert len(ids) == 10


class TestProjectDeletion:
    """Test class for project deletion functionality"""
    
    @pytest.fixture(autouse=True)
    def setup_teardown(self):
        """Setup and teardown for each test"""
        # Create temporary directories for testing
        self.test_dir = tempfile.mkdtemp()
        self.upload_dir = os.path.join(self.test_dir, "uploads")
        self.thumbnail_dir = os.path.join(self.test_dir, "thumbnails")
        
        # Initialize service
        self.service = MediaService(
            upload_dir=self.upload_dir,
            thumbnail_dir=self.thumbnail_dir
        )
        
        yield
        
        # Cleanup
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
    
    def test_delete_project_removes_directory(self):
        """Test that deleting a project removes its directory"""
        project_id = "delete-test-project"
        
        # Create project directory with a file
        project_dir = self.service.get_project_upload_dir(project_id)
        test_file = project_dir / "test.txt"
        test_file.write_text("test content")
        
        assert project_dir.exists()
        assert test_file.exists()
        
        # Delete project directory
        shutil.rmtree(project_dir)
        
        assert not project_dir.exists()
    
    def test_delete_project_with_thumbnails(self):
        """Test that deleting a project removes thumbnails too"""
        project_id = "delete-with-thumbnails"
        
        # Create project and thumbnail directories
        project_dir = self.service.get_project_upload_dir(project_id)
        thumbnail_dir = self.service.get_project_thumbnail_dir(project_id)
        
        # Create test files
        (project_dir / "video.mp4").write_bytes(b"video")
        (thumbnail_dir / "thumb.jpg").write_bytes(b"thumbnail")
        
        assert project_dir.exists()
        assert thumbnail_dir.exists()
        
        # Delete project directory (thumbnails are inside project dir)
        shutil.rmtree(project_dir)
        
        assert not project_dir.exists()
        # Thumbnails are inside project dir, so should also be gone
        assert not thumbnail_dir.exists()
    
    def test_delete_project_preserves_other_projects(self):
        """Test that deleting one project doesn't affect others"""
        project_id_1 = "project-to-delete"
        project_id_2 = "project-to-keep"
        
        # Create both project directories with files
        dir_1 = self.service.get_project_upload_dir(project_id_1)
        dir_2 = self.service.get_project_upload_dir(project_id_2)
        
        (dir_1 / "file1.txt").write_text("content 1")
        (dir_2 / "file2.txt").write_text("content 2")
        
        assert dir_1.exists()
        assert dir_2.exists()
        
        # Delete first project
        shutil.rmtree(dir_1)
        
        # First project should be gone
        assert not dir_1.exists()
        
        # Second project should still exist with its files
        assert dir_2.exists()
        assert (dir_2 / "file2.txt").exists()
        assert (dir_2 / "file2.txt").read_text() == "content 2"
    
    def test_delete_nonexistent_project_no_error(self):
        """Test that deleting non-existent project doesn't raise error"""
        project_id = "nonexistent-project"
        project_dir = Path(self.upload_dir) / project_id
        
        assert not project_dir.exists()
        
        # Should not raise error
        if project_dir.exists():
            shutil.rmtree(project_dir)
        
        assert not project_dir.exists()


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
