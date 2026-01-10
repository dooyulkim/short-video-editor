"""
Test suite for MediaService
"""
import pytest
import os
import tempfile
import shutil
from pathlib import Path
import numpy as np
from PIL import Image
from conftest import create_test_video_with_ffmpeg, create_test_audio_with_ffmpeg

from services.media_service import MediaService
from models.media import VideoMetadata, AudioMetadata, ImageMetadata


class TestMediaService:
    """Test class for MediaService"""
    
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
        # Create a test image
        img = Image.new('RGB', (width, height), color=(100, 150, 200))
        
        # Save test image
        image_path = os.path.join(self.test_dir, "test_image.jpg")
        img.save(image_path, "JPEG")
        
        return image_path
    
    # Test save_uploaded_file
    def test_save_uploaded_file_success(self):
        """Test successful file upload"""
        test_content = b"Test file content"
        file_id, file_path = self.service.save_uploaded_file(
            test_content,
            "test.txt",
            "text"
        )
        
        assert file_id is not None
        assert os.path.exists(file_path)
        
        # Verify content
        with open(file_path, "rb") as f:
            assert f.read() == test_content
    
    def test_save_uploaded_file_preserves_extension(self):
        """Test that file extension is preserved"""
        test_content = b"Test content"
        file_id, file_path = self.service.save_uploaded_file(
            test_content,
            "video.mp4",
            "video"
        )
        
        assert file_path.endswith(".mp4")
    
    # Test extract_video_metadata
    def test_extract_video_metadata_with_audio(self):
        """Test extracting metadata from video with audio"""
        video_path = self.create_test_video(duration=2, has_audio=True)
        
        metadata = self.service.extract_video_metadata(video_path)
        
        assert isinstance(metadata, VideoMetadata)
        assert metadata.width == 640
        assert metadata.height == 480
        assert metadata.fps > 0
        assert 1.5 <= metadata.duration <= 2.5
        assert metadata.has_audio is True
        assert metadata.format == "mp4"
    
    def test_extract_video_metadata_without_audio(self):
        """Test extracting metadata from video without audio"""
        video_path = self.create_test_video(duration=1, has_audio=False)
        
        metadata = self.service.extract_video_metadata(video_path)
        
        assert isinstance(metadata, VideoMetadata)
        assert metadata.width == 640
        assert metadata.height == 480
        assert metadata.has_audio is False
    
    def test_extract_video_metadata_invalid_file(self):
        """Test error handling for invalid video file"""
        with pytest.raises(ValueError, match="Error extracting video metadata"):
            self.service.extract_video_metadata("nonexistent.mp4")
    
    # Test extract_audio_metadata
    def test_extract_audio_metadata_success(self):
        """Test extracting metadata from audio file"""
        audio_path = self.create_test_audio(duration=2)
        
        metadata = self.service.extract_audio_metadata(audio_path)
        
        assert isinstance(metadata, AudioMetadata)
        assert 1.5 <= metadata.duration <= 2.5
        assert metadata.sample_rate > 0
        assert metadata.channels > 0
        assert metadata.format == "mp3"
    
    def test_extract_audio_metadata_invalid_file(self):
        """Test error handling for invalid audio file"""
        with pytest.raises(ValueError, match="Error extracting audio metadata"):
            self.service.extract_audio_metadata("nonexistent.mp3")
    
    # Test extract_image_metadata
    def test_extract_image_metadata_success(self):
        """Test extracting metadata from image file"""
        image_path = self.create_test_image(width=800, height=600)
        
        metadata = self.service.extract_image_metadata(image_path)
        
        assert isinstance(metadata, ImageMetadata)
        assert metadata.width == 800
        assert metadata.height == 600
        assert metadata.format == "jpg"
        assert metadata.color_mode == "RGB"
    
    def test_extract_image_metadata_invalid_file(self):
        """Test error handling for invalid image file"""
        with pytest.raises(ValueError, match="Error extracting image metadata"):
            self.service.extract_image_metadata("nonexistent.jpg")
    
    # Test generate_thumbnail
    def test_generate_thumbnail_success(self):
        """Test successful thumbnail generation"""
        video_path = self.create_test_video(duration=2)
        
        thumbnail_path = self.service.generate_thumbnail(video_path, timestamp=0)
        
        assert os.path.exists(thumbnail_path)
        assert thumbnail_path.endswith(".jpg")
        
        # Verify it's a valid image
        img = Image.open(thumbnail_path)
        assert img.size[0] <= 320  # Width should be resized
    
    def test_generate_thumbnail_with_custom_id(self):
        """Test thumbnail generation with custom ID"""
        video_path = self.create_test_video(duration=2)
        custom_id = "custom_thumbnail_id"
        
        thumbnail_path = self.service.generate_thumbnail(
            video_path,
            thumbnail_id=custom_id
        )
        
        assert custom_id in thumbnail_path
        assert os.path.exists(thumbnail_path)
    
    def test_generate_thumbnail_at_timestamp(self):
        """Test thumbnail generation at specific timestamp"""
        video_path = self.create_test_video(duration=2)
        
        # Should not raise error for valid timestamp
        thumbnail_path = self.service.generate_thumbnail(video_path, timestamp=1.0)
        assert os.path.exists(thumbnail_path)
    
    def test_generate_thumbnail_invalid_video(self):
        """Test error handling for invalid video"""
        with pytest.raises(ValueError, match="Error generating thumbnail"):
            self.service.generate_thumbnail("nonexistent.mp4")
    
    # Test generate_waveform
    def test_generate_waveform_success(self):
        """Test waveform generation"""
        audio_path = self.create_test_audio(duration=2)
        
        waveform_base64 = self.service.generate_waveform(audio_path, width=100, height=50)
        
        assert waveform_base64.startswith("data:image/png;base64,")
        assert len(waveform_base64) > 100  # Should have substantial data
    
    def test_generate_waveform_custom_dimensions(self):
        """Test waveform with custom dimensions"""
        audio_path = self.create_test_audio(duration=2)
        
        waveform_small = self.service.generate_waveform(audio_path, width=50, height=25)
        waveform_large = self.service.generate_waveform(audio_path, width=500, height=100)
        
        # Both should be valid base64 strings
        assert waveform_small.startswith("data:image/png;base64,")
        assert waveform_large.startswith("data:image/png;base64,")
        # Larger waveform should have more data
        assert len(waveform_large) > len(waveform_small)
    
    def test_generate_waveform_invalid_audio(self):
        """Test error handling for invalid audio file"""
        with pytest.raises(ValueError, match="Error generating waveform"):
            self.service.generate_waveform("nonexistent.mp3")
    
    # Test delete_media
    def test_delete_media_file_only(self):
        """Test deleting media file"""
        # Create a test file
        test_file = os.path.join(self.upload_dir, "test.txt")
        os.makedirs(self.upload_dir, exist_ok=True)
        with open(test_file, "w") as f:
            f.write("test")
        
        assert os.path.exists(test_file)
        
        result = self.service.delete_media(test_file)
        
        assert result is True
        assert not os.path.exists(test_file)
    
    def test_delete_media_with_thumbnail(self):
        """Test deleting media file and thumbnail"""
        # Create test files
        os.makedirs(self.upload_dir, exist_ok=True)
        os.makedirs(self.thumbnail_dir, exist_ok=True)
        
        media_file = os.path.join(self.upload_dir, "video.mp4")
        thumbnail_file = os.path.join(self.thumbnail_dir, "thumb.jpg")
        
        with open(media_file, "w") as f:
            f.write("video")
        with open(thumbnail_file, "w") as f:
            f.write("thumb")
        
        assert os.path.exists(media_file)
        assert os.path.exists(thumbnail_file)
        
        result = self.service.delete_media(media_file, thumbnail_file)
        
        assert result is True
        assert not os.path.exists(media_file)
        assert not os.path.exists(thumbnail_file)
    
    def test_delete_media_nonexistent_file(self):
        """Test deleting nonexistent file (should not raise error)"""
        result = self.service.delete_media("nonexistent.mp4")
        assert result is True
    
    # Test directory creation
    def test_directories_created_on_init(self):
        """Test that directories are created on service initialization"""
        assert os.path.exists(self.upload_dir)
        assert os.path.exists(self.thumbnail_dir)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
