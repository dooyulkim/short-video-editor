"""
Test suite for AudioService
"""
import pytest
import os
import tempfile
import shutil
import numpy as np
from pathlib import Path
from moviepy.editor import ColorClip, AudioClip, VideoFileClip

from services.audio_service import AudioService


class TestAudioService:
    """Test class for AudioService"""
    
    @pytest.fixture(autouse=True)
    def setup_teardown(self):
        """Setup and teardown for each test"""
        # Create temporary directory for testing
        self.test_dir = tempfile.mkdtemp()
        self.temp_audio_dir = os.path.join(self.test_dir, "temp_audio")
        
        # Initialize service
        self.service = AudioService(temp_dir=self.temp_audio_dir)
        
        yield
        
        # Cleanup
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
    
    def create_test_audio(self, duration=2, frequency=440):
        """Helper to create a test audio file"""
        def make_frame(t):
            return np.sin(2 * np.pi * frequency * t)
        
        audio_clip = AudioClip(make_frame, duration=duration, fps=44100)
        
        audio_path = os.path.join(self.test_dir, "test_audio.mp3")
        audio_clip.write_audiofile(audio_path, verbose=False, logger=None)
        audio_clip.close()
        
        return audio_path
    
    def create_test_video(self, duration=2, has_audio=True):
        """Helper to create a test video file"""
        video_clip = ColorClip(size=(640, 480), color=(255, 0, 0), duration=duration)
        
        if has_audio:
            def make_frame(t):
                return np.sin(2 * np.pi * 440 * t)
            
            audio_clip = AudioClip(make_frame, duration=duration, fps=44100)
            video_clip = video_clip.set_audio(audio_clip)
        
        video_path = os.path.join(self.test_dir, "test_video.mp4")
        video_clip.write_videofile(
            video_path,
            fps=24,
            codec='libx264',
            audio_codec='aac' if has_audio else None,
            verbose=False,
            logger=None
        )
        video_clip.close()
        
        return video_path
    
    # Test generate_waveform_data
    def test_generate_waveform_data_default_width(self):
        """Test waveform generation with default width"""
        audio_path = self.create_test_audio(duration=2)
        
        waveform = self.service.generate_waveform_data(audio_path)
        
        assert len(waveform) == 1000  # Default width
        assert all(-1 <= val <= 1 for val in waveform), "Values should be normalized"
        assert any(val != 0 for val in waveform), "Waveform should have non-zero values"
    
    def test_generate_waveform_data_custom_width(self):
        """Test waveform generation with custom widths"""
        audio_path = self.create_test_audio(duration=2)
        
        widths = [50, 100, 500, 1000, 2000]
        
        for width in widths:
            waveform = self.service.generate_waveform_data(audio_path, width=width)
            assert len(waveform) == width, f"Should generate exactly {width} points"
            assert all(-1 <= val <= 1 for val in waveform)
    
    def test_generate_waveform_data_normalization(self):
        """Test that waveform data is properly normalized"""
        audio_path = self.create_test_audio(duration=2, frequency=440)
        
        waveform = self.service.generate_waveform_data(audio_path, width=100)
        
        # Should have values close to -1 or 1 for a sine wave
        max_val = max(waveform)
        min_val = min(waveform)
        
        assert max_val <= 1.0
        assert min_val >= -1.0
        # For RMS calculation, max should be reasonably high
        assert max_val > 0.5
    
    def test_generate_waveform_data_file_not_found(self):
        """Test error handling for non-existent file"""
        with pytest.raises(FileNotFoundError, match="Audio file not found"):
            self.service.generate_waveform_data("nonexistent.mp3")
    
    def test_generate_waveform_data_invalid_audio(self):
        """Test error handling for invalid audio file"""
        # Create a text file instead of audio
        fake_audio = os.path.join(self.test_dir, "fake.mp3")
        with open(fake_audio, "w") as f:
            f.write("This is not audio")
        
        with pytest.raises(Exception, match="Failed to generate waveform"):
            self.service.generate_waveform_data(fake_audio)
    
    def test_generate_waveform_data_different_frequencies(self):
        """Test waveform generation with different audio frequencies"""
        # Low frequency
        low_freq_audio = self.create_test_audio(duration=1, frequency=100)
        low_waveform = self.service.generate_waveform_data(low_freq_audio, width=100)
        
        # High frequency
        high_freq_audio = self.create_test_audio(duration=1, frequency=2000)
        high_waveform = self.service.generate_waveform_data(high_freq_audio, width=100)
        
        # Both should be valid
        assert len(low_waveform) == 100
        assert len(high_waveform) == 100
        assert all(-1 <= val <= 1 for val in low_waveform)
        assert all(-1 <= val <= 1 for val in high_waveform)
    
    # Test extract_audio_from_video
    def test_extract_audio_from_video_success(self):
        """Test successful audio extraction from video"""
        video_path = self.create_test_video(duration=2, has_audio=True)
        
        audio_path = self.service.extract_audio_from_video(video_path)
        
        assert os.path.exists(audio_path)
        assert audio_path.endswith(".mp3")
        assert self.temp_audio_dir in audio_path
        
        # Verify it's a valid audio file by checking duration
        duration = self.service.get_audio_duration(audio_path)
        assert 1.5 <= duration <= 2.5
    
    def test_extract_audio_from_video_no_audio(self):
        """Test error when video has no audio track"""
        video_path = self.create_test_video(duration=1, has_audio=False)
        
        with pytest.raises(Exception, match="Video file has no audio track"):
            self.service.extract_audio_from_video(video_path)
    
    def test_extract_audio_from_video_file_not_found(self):
        """Test error handling for non-existent video"""
        with pytest.raises(FileNotFoundError, match="Video file not found"):
            self.service.extract_audio_from_video("nonexistent.mp4")
    
    def test_extract_audio_from_video_invalid_file(self):
        """Test error handling for invalid video file"""
        fake_video = os.path.join(self.test_dir, "fake.mp4")
        with open(fake_video, "w") as f:
            f.write("Not a video")
        
        with pytest.raises(Exception, match="Failed to extract audio"):
            self.service.extract_audio_from_video(fake_video)
    
    def test_extract_audio_creates_unique_files(self):
        """Test that multiple extractions create unique files"""
        video_path = self.create_test_video(duration=1, has_audio=True)
        
        audio_path1 = self.service.extract_audio_from_video(video_path)
        audio_path2 = self.service.extract_audio_from_video(video_path)
        
        assert audio_path1 != audio_path2
        assert os.path.exists(audio_path1)
        assert os.path.exists(audio_path2)
    
    # Test get_audio_duration
    def test_get_audio_duration_success(self):
        """Test getting audio duration"""
        audio_path = self.create_test_audio(duration=2)
        
        duration = self.service.get_audio_duration(audio_path)
        
        assert isinstance(duration, float)
        assert 1.5 <= duration <= 2.5  # Allow some tolerance
    
    def test_get_audio_duration_invalid_file(self):
        """Test error handling for invalid audio file"""
        with pytest.raises(Exception, match="Failed to get audio duration"):
            self.service.get_audio_duration("nonexistent.mp3")
    
    # Test cleanup_temp_files
    def test_cleanup_temp_files(self):
        """Test cleanup of temporary files"""
        # Create some temp audio files
        video_path = self.create_test_video(duration=1, has_audio=True)
        
        audio_path1 = self.service.extract_audio_from_video(video_path)
        audio_path2 = self.service.extract_audio_from_video(video_path)
        
        assert os.path.exists(audio_path1)
        assert os.path.exists(audio_path2)
        
        # Cleanup
        self.service.cleanup_temp_files()
        
        # Files should be deleted
        assert not os.path.exists(audio_path1)
        assert not os.path.exists(audio_path2)
    
    def test_cleanup_temp_files_empty_directory(self):
        """Test cleanup when directory is empty"""
        # Should not raise error
        self.service.cleanup_temp_files()
    
    # Test temp directory creation
    def test_temp_directory_created_on_init(self):
        """Test that temp directory is created on initialization"""
        assert os.path.exists(self.temp_audio_dir)
    
    # Integration tests
    def test_full_workflow_video_to_waveform(self):
        """Test complete workflow: extract audio from video and generate waveform"""
        # Create video with audio
        video_path = self.create_test_video(duration=2, has_audio=True)
        
        # Extract audio
        audio_path = self.service.extract_audio_from_video(video_path)
        assert os.path.exists(audio_path)
        
        # Generate waveform from extracted audio
        waveform = self.service.generate_waveform_data(audio_path, width=100)
        
        assert len(waveform) == 100
        assert all(-1 <= val <= 1 for val in waveform)
        assert any(val > 0.1 for val in waveform), "Should have significant amplitude"
    
    def test_waveform_consistency(self):
        """Test that waveform generation is consistent"""
        audio_path = self.create_test_audio(duration=1, frequency=440)
        
        waveform1 = self.service.generate_waveform_data(audio_path, width=100)
        waveform2 = self.service.generate_waveform_data(audio_path, width=100)
        
        # Should generate same waveform for same input
        assert waveform1 == waveform2


if __name__ == "__main__":
    pytest.main([__file__, "-v"])
