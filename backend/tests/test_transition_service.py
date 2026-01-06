"""
Test suite for TransitionService
"""
import pytest
import os
import tempfile
import shutil
from pathlib import Path
import numpy as np
from moviepy.editor import ColorClip, AudioClip

from services.transition_service import TransitionService


class TestTransitionService:
    """Test class for TransitionService"""
    
    @pytest.fixture(autouse=True)
    def setup_teardown(self):
        """Setup and teardown for each test"""
        # Create temporary directories for testing
        self.test_dir = tempfile.mkdtemp()
        self.temp_video_dir = os.path.join(self.test_dir, "temp_video")
        
        # Initialize service
        self.service = TransitionService(temp_dir=self.temp_video_dir)
        
        # Create test video files
        self.video1_path = self.create_test_video(
            "video1.mp4", duration=3, color=(255, 0, 0)
        )
        self.video2_path = self.create_test_video(
            "video2.mp4", duration=3, color=(0, 255, 0)
        )
        
        yield
        
        # Cleanup with retry for Windows file locking
        import time
        import gc
        
        # Force garbage collection to release any remaining file handles
        gc.collect()
        time.sleep(0.1)
        
        if os.path.exists(self.test_dir):
            max_retries = 3
            for attempt in range(max_retries):
                try:
                    shutil.rmtree(self.test_dir)
                    break
                except PermissionError:
                    if attempt < max_retries - 1:
                        time.sleep(0.5)
                        gc.collect()
                    else:
                        # On final attempt, try to remove what we can
                        try:
                            shutil.rmtree(self.test_dir, ignore_errors=True)
                        except Exception:
                            pass
    
    def create_test_video(
        self, filename, duration=2, color=(255, 0, 0), has_audio=True
    ):
        """Helper to create a test video file"""
        # Create a simple color clip
        video_clip = ColorClip(size=(640, 480), color=color, duration=duration)
        video_clip = video_clip.set_fps(24)
        
        if has_audio:
            # Create audio - simple sine wave
            def make_frame(t):
                return np.sin(2 * np.pi * 440 * t)
            
            audio_clip = AudioClip(make_frame, duration=duration, fps=44100)
            video_clip = video_clip.set_audio(audio_clip)
        
        # Save video
        output_path = os.path.join(self.test_dir, filename)
        video_clip.write_videofile(
            output_path,
            codec='libx264',
            audio_codec='aac',
            logger=None
        )
        
        video_clip.close()
        
        return output_path
    
    def test_initialization(self):
        """Test TransitionService initialization"""
        assert self.service is not None
        assert self.service.temp_dir.exists()
        assert self.service.temp_dir == Path(self.temp_video_dir)
    
    def test_generate_output_path(self):
        """Test output path generation"""
        path1 = self.service._generate_output_path("test")
        path2 = self.service._generate_output_path("test")
        
        # Paths should be different (unique UUIDs)
        assert path1 != path2
        
        # Paths should contain the prefix
        assert "test_" in path1
        assert path1.endswith(".mp4")
        
        # Paths should be in temp directory
        assert str(self.service.temp_dir) in path1
    
    def test_apply_fade_in(self):
        """Test fade in transition"""
        # Apply fade in
        output_path = self.service.apply_fade_in(
            video_path=self.video1_path,
            duration=0.5
        )
        
        # Check output file exists
        assert os.path.exists(output_path)
        
        # Verify output is a valid video
        from moviepy.editor import VideoFileClip
        output_clip = VideoFileClip(output_path)
        
        # Check duration is approximately the same (within 0.1 seconds)
        assert abs(output_clip.duration - 3.0) < 0.1
        
        # Check dimensions
        assert tuple(output_clip.size) == (640, 480)
        
        # Check has audio
        assert output_clip.audio is not None
        
        output_clip.close()
        del output_clip
    
    def test_apply_fade_in_invalid_video(self):
        """Test fade in with invalid video path"""
        with pytest.raises(Exception) as exc_info:
            self.service.apply_fade_in(
                video_path="nonexistent_video.mp4",
                duration=1.0
            )
        
        assert "Error applying fade in" in str(exc_info.value)
    
    def test_apply_fade_out(self):
        """Test fade out transition"""
        # Apply fade out
        output_path = self.service.apply_fade_out(
            video_path=self.video1_path,
            duration=0.5
        )
        
        # Check output file exists
        assert os.path.exists(output_path)
        
        # Verify output is a valid video
        from moviepy.editor import VideoFileClip
        output_clip = VideoFileClip(output_path)
        
        # Check duration is approximately the same
        assert abs(output_clip.duration - 3.0) < 0.1
        
        # Check dimensions
        assert tuple(output_clip.size) == (640, 480)
        
        # Check has audio
        assert output_clip.audio is not None
        
        output_clip.close()
        del output_clip
    
    def test_apply_fade_out_invalid_video(self):
        """Test fade out with invalid video path"""
        with pytest.raises(Exception) as exc_info:
            self.service.apply_fade_out(
                video_path="nonexistent_video.mp4",
                duration=1.0
            )
        
        assert "Error applying fade out" in str(exc_info.value)
    
    def test_apply_cross_dissolve(self):
        """Test cross dissolve transition"""
        # Apply cross dissolve
        output_path = self.service.apply_cross_dissolve(
            video1_path=self.video1_path,
            video2_path=self.video2_path,
            duration=1.0
        )
        
        # Check output file exists
        assert os.path.exists(output_path)
        
        # Verify output is a valid video
        from moviepy.editor import VideoFileClip
        output_clip = VideoFileClip(output_path)
        
        # Check duration is approximately video1 + video2 - overlap
        # 3 + 3 - 1 = 5 seconds
        expected_duration = 5.0
        assert abs(output_clip.duration - expected_duration) < 0.2
        
        # Check dimensions match first video
        assert tuple(output_clip.size) == (640, 480)
        
        # Check has audio
        assert output_clip.audio is not None
        
        output_clip.close()
        del output_clip
    
    def test_apply_cross_dissolve_different_sizes(self):
        """Test cross dissolve with videos of different sizes"""
        # Create a video with different dimensions
        video3_path = self.create_test_video(
            "video3.mp4",
            duration=2,
            color=(0, 0, 255),
            has_audio=True
        )
        
        # Resize video3 to different dimensions
        from moviepy.editor import VideoFileClip
        clip3 = VideoFileClip(video3_path)
        resized_clip3 = clip3.resize((320, 240))
        video3_resized_path = os.path.join(self.test_dir, "video3_resized.mp4")
        resized_clip3.write_videofile(video3_resized_path, logger=None)
        clip3.close()
        resized_clip3.close()
        
        # Apply cross dissolve
        output_path = self.service.apply_cross_dissolve(
            video1_path=self.video1_path,
            video2_path=video3_resized_path,
            duration=0.5
        )
        
        # Check output file exists
        assert os.path.exists(output_path)
        
        # Verify output dimensions match first video
        from moviepy.editor import VideoFileClip
        output_clip = VideoFileClip(output_path)
        assert tuple(output_clip.size) == (640, 480)
        output_clip.close()
        del output_clip
    
    def test_apply_cross_dissolve_invalid_videos(self):
        """Test cross dissolve with invalid video paths"""
        with pytest.raises(Exception) as exc_info:
            self.service.apply_cross_dissolve(
                video1_path="nonexistent1.mp4",
                video2_path="nonexistent2.mp4",
                duration=1.0
            )
        
        assert "Error applying cross dissolve" in str(exc_info.value)
    
    def test_apply_wipe_left(self):
        """Test wipe transition from right to left"""
        output_path = self.service.apply_wipe(
            video1_path=self.video1_path,
            video2_path=self.video2_path,
            duration=0.5,
            direction="left"
        )
        
        # Check output file exists
        assert os.path.exists(output_path)
        
        # Verify output is a valid video
        from moviepy.editor import VideoFileClip
        output_clip = VideoFileClip(output_path)
        
        # Check duration is approximately video1 + video2 - overlap
        expected_duration = 5.5  # 3 + 3 - 0.5
        assert abs(output_clip.duration - expected_duration) < 0.2
        
        # Check dimensions
        assert tuple(output_clip.size) == (640, 480)
        
        output_clip.close()
        del output_clip
    
    def test_apply_wipe_right(self):
        """Test wipe transition from left to right"""
        output_path = self.service.apply_wipe(
            video1_path=self.video1_path,
            video2_path=self.video2_path,
            duration=0.5,
            direction="right"
        )
        
        # Check output file exists
        assert os.path.exists(output_path)
        
        # Verify output is a valid video
        from moviepy.editor import VideoFileClip
        output_clip = VideoFileClip(output_path)
        
        # Check basic properties
        assert tuple(output_clip.size) == (640, 480)
        assert abs(output_clip.duration - 5.5) < 0.2
        
        output_clip.close()
        del output_clip
    
    def test_apply_wipe_up(self):
        """Test wipe transition from bottom to top"""
        output_path = self.service.apply_wipe(
            video1_path=self.video1_path,
            video2_path=self.video2_path,
            duration=0.5,
            direction="up"
        )
        
        # Check output file exists
        assert os.path.exists(output_path)
        
        # Verify output is a valid video
        from moviepy.editor import VideoFileClip
        output_clip = VideoFileClip(output_path)
        
        # Check basic properties
        assert tuple(output_clip.size) == (640, 480)
        assert abs(output_clip.duration - 5.5) < 0.2
        
        output_clip.close()
        del output_clip
    
    def test_apply_wipe_down(self):
        """Test wipe transition from top to bottom"""
        output_path = self.service.apply_wipe(
            video1_path=self.video1_path,
            video2_path=self.video2_path,
            duration=0.5,
            direction="down"
        )
        
        # Check output file exists
        assert os.path.exists(output_path)
        
        # Verify output is a valid video
        from moviepy.editor import VideoFileClip
        output_clip = VideoFileClip(output_path)
        
        # Check basic properties
        assert tuple(output_clip.size) == (640, 480)
        assert abs(output_clip.duration - 5.5) < 0.2
        
        output_clip.close()
        del output_clip
    
    def test_apply_wipe_invalid_direction(self):
        """Test wipe with invalid direction"""
        with pytest.raises(Exception) as exc_info:
            self.service.apply_wipe(
                video1_path=self.video1_path,
                video2_path=self.video2_path,
                duration=0.5,
                direction="diagonal"
            )
        
        assert "Error applying wipe transition" in str(exc_info.value)
    
    def test_apply_wipe_different_sizes(self):
        """Test wipe with videos of different sizes"""
        # Create a video with different dimensions
        video3_path = self.create_test_video(
            "video3_small.mp4",
            duration=2,
            color=(0, 0, 255),
            has_audio=True
        )
        
        # Resize video3 to different dimensions
        from moviepy.editor import VideoFileClip
        clip3 = VideoFileClip(video3_path)
        resized_clip3 = clip3.resize((320, 240))
        video3_resized_path = os.path.join(self.test_dir, "video3_wipe_resized.mp4")
        resized_clip3.write_videofile(video3_resized_path, logger=None)
        clip3.close()
        resized_clip3.close()
        
        # Apply wipe
        output_path = self.service.apply_wipe(
            video1_path=self.video1_path,
            video2_path=video3_resized_path,
            duration=0.5,
            direction="left"
        )
        
        # Check output file exists
        assert os.path.exists(output_path)
        
        # Verify output dimensions match first video
        from moviepy.editor import VideoFileClip
        output_clip = VideoFileClip(output_path)
        assert tuple(output_clip.size) == (640, 480)
        output_clip.close()
        del output_clip
    
    def test_cleanup_temp_files(self):
        """Test cleanup of old temporary files"""
        # Create some test files in temp directory
        test_file1 = self.service.temp_dir / "old_file.mp4"
        test_file2 = self.service.temp_dir / "new_file.mp4"
        
        test_file1.touch()
        test_file2.touch()
        
        # Make file1 old by modifying its timestamp
        import time
        old_time = time.time() - (25 * 3600)  # 25 hours ago
        os.utime(test_file1, (old_time, old_time))
        
        # Run cleanup with 24 hour threshold
        self.service.cleanup_temp_files(max_age_hours=24)
        
        # Old file should be deleted, new file should remain
        assert not test_file1.exists()
        assert test_file2.exists()
    
    def test_fade_in_custom_duration(self):
        """Test fade in with custom duration"""
        output_path = self.service.apply_fade_in(
            video_path=self.video1_path,
            duration=1.5
        )
        
        assert os.path.exists(output_path)
        
        from moviepy.editor import VideoFileClip
        output_clip = VideoFileClip(output_path)
        assert abs(output_clip.duration - 3.0) < 0.1
        output_clip.close()
        del output_clip
    
    def test_fade_out_custom_duration(self):
        """Test fade out with custom duration"""
        output_path = self.service.apply_fade_out(
            video_path=self.video1_path,
            duration=2.0
        )
        
        assert os.path.exists(output_path)
        
        from moviepy.editor import VideoFileClip
        output_clip = VideoFileClip(output_path)
        assert abs(output_clip.duration - 3.0) < 0.1
        output_clip.close()
        del output_clip
    
    def test_cross_dissolve_short_duration(self):
        """Test cross dissolve with very short duration"""
        output_path = self.service.apply_cross_dissolve(
            video1_path=self.video1_path,
            video2_path=self.video2_path,
            duration=0.2
        )
        
        assert os.path.exists(output_path)
        
        from moviepy.editor import VideoFileClip
        output_clip = VideoFileClip(output_path)
        # Duration should be approximately 3 + 3 - 0.2 = 5.8
        assert abs(output_clip.duration - 5.8) < 0.2
        output_clip.close()
        del output_clip
    
    def test_multiple_transitions_in_sequence(self):
        """Test applying multiple transitions in sequence"""
        # Apply fade in
        fade_in_output = self.service.apply_fade_in(
            video_path=self.video1_path,
            duration=0.5
        )
        
        # Apply fade out to the result
        fade_out_output = self.service.apply_fade_out(
            video_path=fade_in_output,
            duration=0.5
        )
        
        assert os.path.exists(fade_in_output)
        assert os.path.exists(fade_out_output)
        
        from moviepy.editor import VideoFileClip
        final_clip = VideoFileClip(fade_out_output)
        assert abs(final_clip.duration - 3.0) < 0.1
        final_clip.close()
        del final_clip
