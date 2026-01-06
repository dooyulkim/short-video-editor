"""
Test suite for ExportService
"""
import pytest
import os
import tempfile
import shutil
from pathlib import Path
import numpy as np
from moviepy.editor import ColorClip, AudioClip, VideoFileClip

from services.export_service import ExportService


class TestExportService:
    """Test class for ExportService"""
    
    @pytest.fixture(autouse=True)
    def setup_teardown(self):
        """Setup and teardown for each test"""
        # Create temporary directories for testing
        self.test_dir = tempfile.mkdtemp()
        self.uploads_dir = os.path.join(self.test_dir, "uploads")
        self.output_dir = os.path.join(self.test_dir, "exports")
        
        os.makedirs(self.uploads_dir)
        
        # Initialize service
        self.service = ExportService(
            uploads_dir=self.uploads_dir,
            output_dir=self.output_dir
        )
        
        yield
        
        # Cleanup
        if os.path.exists(self.test_dir):
            shutil.rmtree(self.test_dir)
    
    def create_test_video(self, filename, duration=2, has_audio=True):
        """Helper to create a test video file"""
        # Create a simple color clip
        video_clip = ColorClip(
            size=(640, 480), color=(255, 0, 0), duration=duration
        ).set_fps(24)
        
        if has_audio:
            # Create audio
            def make_frame(t):
                return np.sin(2 * np.pi * 440 * t)
            
            audio_clip = AudioClip(make_frame, duration=duration, fps=44100)
            video_clip = video_clip.set_audio(audio_clip)
        
        # Save test video
        video_path = os.path.join(self.uploads_dir, filename)
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
    
    def create_test_audio(self, filename, duration=2):
        """Helper to create a test audio file"""
        # Create audio clip
        def make_frame(t):
            return np.sin(2 * np.pi * 440 * t)
        
        audio_clip = AudioClip(make_frame, duration=duration, fps=44100)
        
        # Save test audio
        audio_path = os.path.join(self.uploads_dir, filename)
        audio_clip.write_audiofile(audio_path, verbose=False, logger=None)
        audio_clip.close()
        
        return audio_path
    
    def test_export_service_initialization(self):
        """Test ExportService initialization"""
        assert self.service is not None
        assert self.service.uploads_dir == Path(self.uploads_dir)
        assert self.service.output_dir == Path(self.output_dir)
        assert os.path.exists(self.output_dir)
    
    def test_resolution_presets(self):
        """Test resolution presets are defined"""
        assert "1080p" in self.service.resolutions
        assert "720p" in self.service.resolutions
        assert "480p" in self.service.resolutions
        assert self.service.resolutions["1080p"] == (1920, 1080)
        assert self.service.resolutions["720p"] == (1280, 720)
        assert self.service.resolutions["480p"] == (854, 480)
    
    def test_export_single_video_clip(self):
        """Test exporting timeline with single video clip"""
        # Create test video (file saved with resource_id as name)
        self.create_test_video("test_video.mp4", duration=2)
        resource_id = "test_video"
        
        # Create timeline data
        timeline_data = {
            "duration": 2.0,
            "layers": [
                {
                    "type": "video",
                    "visible": True,
                    "clips": [
                        {
                            "resourceId": resource_id,
                            "startTime": 0.0,
                            "duration": 2.0,
                            "trimStart": 0.0,
                            "trimEnd": 0.0,
                            "transitions": []
                        }
                    ]
                }
            ]
        }
        
        # Export timeline
        output_path = self.service.export_timeline(
            timeline_data=timeline_data,
            output_path="test_export.mp4",
            resolution="480p",
            fps=24
        )
        
        # Verify output
        assert os.path.exists(output_path)
        
        # Verify video properties
        video = VideoFileClip(output_path)
        assert video.duration > 0
        assert video.w == 854
        assert video.h == 480
        video.close()
    
    def test_export_with_trimmed_clip(self):
        """Test exporting timeline with trimmed video clip"""
        # Create test video (file saved with resource_id as name)
        self.create_test_video("test_video.mp4", duration=5)
        resource_id = "test_video"
        
        # Create timeline data with trimming
        timeline_data = {
            "duration": 2.0,
            "layers": [
                {
                    "type": "video",
                    "visible": True,
                    "clips": [
                        {
                            "resourceId": resource_id,
                            "startTime": 0.0,
                            "duration": 2.0,
                            "trimStart": 1.0,
                            "trimEnd": 2.0,
                            "transitions": []
                        }
                    ]
                }
            ]
        }
        
        # Export timeline
        output_path = self.service.export_timeline(
            timeline_data=timeline_data,
            output_path="test_export_trimmed.mp4",
            resolution="480p",
            fps=24
        )
        
        # Verify output
        assert os.path.exists(output_path)
        
        # Verify video duration
        video = VideoFileClip(output_path)
        assert 1.8 <= video.duration <= 2.2  # Allow small margin
        video.close()
    
    def test_export_with_fade_transitions(self):
        """Test exporting video with fade transitions"""
        # Create test video (file saved with resource_id as name)
        self.create_test_video("test_video.mp4", duration=3)
        resource_id = "test_video"
        
        # Create timeline data with transitions
        timeline_data = {
            "duration": 3.0,
            "layers": [
                {
                    "type": "video",
                    "visible": True,
                    "clips": [
                        {
                            "resourceId": resource_id,
                            "startTime": 0.0,
                            "duration": 3.0,
                            "trimStart": 0.0,
                            "trimEnd": 0.0,
                            "transitions": [
                                {
                                    "type": "fadeIn",
                                    "duration": 0.5,
                                    "position": "start"
                                },
                                {
                                    "type": "fadeOut",
                                    "duration": 0.5,
                                    "position": "end"
                                }
                            ]
                        }
                    ]
                }
            ]
        }
        
        # Export timeline
        output_path = self.service.export_timeline(
            timeline_data=timeline_data,
            output_path="test_export_fade.mp4",
            resolution="480p",
            fps=24
        )
        
        # Verify output
        assert os.path.exists(output_path)
    
    def test_export_multiple_video_clips(self):
        """Test exporting timeline with multiple video clips"""
        # Create test videos (files saved with resource_id as names)
        self.create_test_video("test_video1.mp4", duration=2)
        self.create_test_video("test_video2.mp4", duration=2)
        
        # Create timeline data with multiple clips
        timeline_data = {
            "duration": 4.0,
            "layers": [
                {
                    "type": "video",
                    "visible": True,
                    "clips": [
                        {
                            "resourceId": "test_video1",
                            "startTime": 0.0,
                            "duration": 2.0,
                            "trimStart": 0.0,
                            "trimEnd": 0.0,
                            "transitions": []
                        },
                        {
                            "resourceId": "test_video2",
                            "startTime": 2.0,
                            "duration": 2.0,
                            "trimStart": 0.0,
                            "trimEnd": 0.0,
                            "transitions": []
                        }
                    ]
                }
            ]
        }
        
        # Export timeline
        output_path = self.service.export_timeline(
            timeline_data=timeline_data,
            output_path="test_export_multiple.mp4",
            resolution="480p",
            fps=24
        )
        
        # Verify output
        assert os.path.exists(output_path)
        
        # Verify video duration
        video = VideoFileClip(output_path)
        assert 3.8 <= video.duration <= 4.2  # Allow small margin
        video.close()
    
    def test_export_with_audio_track(self):
        """Test exporting timeline with audio track"""
        # Create test video and audio (files saved with resource_id as names)
        self.create_test_video(
            "test_video.mp4", duration=3, has_audio=False
        )
        self.create_test_audio("test_audio.mp3", duration=3)
        
        # Create timeline data with audio layer
        timeline_data = {
            "duration": 3.0,
            "layers": [
                {
                    "type": "video",
                    "visible": True,
                    "clips": [
                        {
                            "resourceId": "test_video",
                            "startTime": 0.0,
                            "duration": 3.0,
                            "trimStart": 0.0,
                            "trimEnd": 0.0,
                            "transitions": []
                        }
                    ]
                },
                {
                    "type": "audio",
                    "visible": True,
                    "clips": [
                        {
                            "resourceId": "test_audio",
                            "startTime": 0.0,
                            "duration": 3.0,
                            "trimStart": 0.0,
                            "trimEnd": 0.0,
                            "volume": 1.0
                        }
                    ]
                }
            ]
        }
        
        # Export timeline
        output_path = self.service.export_timeline(
            timeline_data=timeline_data,
            output_path="test_export_audio.mp4",
            resolution="480p",
            fps=24
        )
        
        # Verify output
        assert os.path.exists(output_path)
        
        # Verify video has audio
        video = VideoFileClip(output_path)
        assert video.audio is not None
        video.close()
    
    def test_export_with_text_overlay(self):
        """Test exporting timeline with text overlay"""
        # Create test video (file saved with resource_id as name)
        self.create_test_video("test_video.mp4", duration=3)
        
        # Create timeline data with text layer
        timeline_data = {
            "duration": 3.0,
            "layers": [
                {
                    "type": "video",
                    "visible": True,
                    "clips": [
                        {
                            "resourceId": "test_video",
                            "startTime": 0.0,
                            "duration": 3.0,
                            "trimStart": 0.0,
                            "trimEnd": 0.0,
                            "transitions": []
                        }
                    ]
                },
                {
                    "type": "text",
                    "visible": True,
                    "clips": [
                        {
                            "startTime": 0.5,
                            "duration": 2.0,
                            "data": {
                                "text": "Test Text",
                                "fontFamily": "Arial",
                                "fontSize": 40,
                                "color": "white",
                                "position": {"x": 100, "y": 100}
                            }
                        }
                    ]
                }
            ]
        }
        
        # Export timeline
        output_path = self.service.export_timeline(
            timeline_data=timeline_data,
            output_path="test_export_text.mp4",
            resolution="480p",
            fps=24
        )
        
        # Verify output
        assert os.path.exists(output_path)
    
    def test_export_with_progress_callback(self):
        """Test export with progress callback"""
        # Create test video
        video_path = self.create_test_video("test_video.mp4", duration=2)
        
        # Track progress updates
        progress_updates = []
        
        def progress_callback(progress):
            progress_updates.append(progress)
        
        # Create simple timeline data
        timeline_data = {
            "duration": 2.0,
            "layers": [
                {
                    "type": "video",
                    "visible": True,
                    "clips": [
                        {
                            "resourceId": "test_video",
                            "startTime": 0.0,
                            "duration": 2.0,
                            "trimStart": 0.0,
                            "trimEnd": 0.0,
                            "transitions": []
                        }
                    ]
                }
            ]
        }
        
        # Export timeline with callback
        output_path = self.service.export_timeline(
            timeline_data=timeline_data,
            output_path="test_export_progress.mp4",
            resolution="480p",
            fps=24,
            progress_callback=progress_callback
        )
        
        # Verify progress updates were received
        assert len(progress_updates) > 0
        assert 0.0 in progress_updates
        assert 1.0 in progress_updates
        assert all(0.0 <= p <= 1.0 for p in progress_updates)
    
    def test_export_invisible_layer_ignored(self):
        """Test that invisible layers are ignored during export"""
        # Create test videos
        video_path1 = self.create_test_video("test_video1.mp4", duration=2)
        video_path2 = self.create_test_video("test_video2.mp4", duration=2)
        
        # Create timeline data with invisible layer
        timeline_data = {
            "duration": 2.0,
            "layers": [
                {
                    "type": "video",
                    "visible": True,
                    "clips": [
                        {
                            "resourceId": "test_video1",
                            "startTime": 0.0,
                            "duration": 2.0,
                            "trimStart": 0.0,
                            "trimEnd": 0.0,
                            "transitions": []
                        }
                    ]
                },
                {
                    "type": "video",
                    "visible": False,  # Invisible layer
                    "clips": [
                        {
                            "resourceId": "test_video2",
                            "startTime": 0.0,
                            "duration": 2.0,
                            "trimStart": 0.0,
                            "trimEnd": 0.0,
                            "transitions": []
                        }
                    ]
                }
            ]
        }
        
        # Export timeline
        output_path = self.service.export_timeline(
            timeline_data=timeline_data,
            output_path="test_export_invisible.mp4",
            resolution="480p",
            fps=24
        )
        
        # Verify output exists
        assert os.path.exists(output_path)
    
    def test_export_empty_timeline(self):
        """Test exporting empty timeline creates blank video"""
        # Create timeline data with no clips
        timeline_data = {
            "duration": 2.0,
            "layers": []
        }
        
        # Export timeline
        output_path = self.service.export_timeline(
            timeline_data=timeline_data,
            output_path="test_export_empty.mp4",
            resolution="480p",
            fps=24
        )
        
        # Verify output
        assert os.path.exists(output_path)
        
        # Verify blank video was created
        video = VideoFileClip(output_path)
        assert video.duration > 0
        video.close()
    
    def test_find_media_file(self):
        """Test finding media files by resource ID"""
        # Create test video
        video_path = self.create_test_video("test_resource.mp4", duration=1)
        
        # Test finding existing file
        found_path = self.service._find_media_file("test_resource")
        assert found_path is not None
        assert found_path.exists()
        
        # Test finding non-existent file
        not_found = self.service._find_media_file("nonexistent")
        assert not_found is None
    
    def test_cleanup_export(self):
        """Test cleanup of exported files"""
        # Create a temporary file
        test_file = os.path.join(self.output_dir, "test_cleanup.mp4")
        with open(test_file, 'w') as f:
            f.write("test")
        
        assert os.path.exists(test_file)
        
        # Cleanup file
        self.service.cleanup_export(test_file)
        
        # Verify file was deleted
        assert not os.path.exists(test_file)
    
    def test_export_with_different_resolutions(self):
        """Test exporting with different resolution presets"""
        # Create test video
        video_path = self.create_test_video("test_video.mp4", duration=1)
        
        timeline_data = {
            "duration": 1.0,
            "layers": [
                {
                    "type": "video",
                    "visible": True,
                    "clips": [
                        {
                            "resourceId": "test_video",
                            "startTime": 0.0,
                            "duration": 1.0,
                            "trimStart": 0.0,
                            "trimEnd": 0.0,
                            "transitions": []
                        }
                    ]
                }
            ]
        }
        
        # Test different resolutions
        for resolution in ["1080p", "720p", "480p"]:
            output_path = self.service.export_timeline(
                timeline_data=timeline_data,
                output_path=f"test_export_{resolution}.mp4",
                resolution=resolution,
                fps=24
            )
            
            assert os.path.exists(output_path)
            
            # Verify resolution
            video = VideoFileClip(output_path)
            expected_width, expected_height = self.service.resolutions[
                resolution
            ]
            # Video might be smaller if original is smaller
            assert video.h <= expected_height
            video.close()
    
    def test_export_error_handling(self):
        """Test error handling for invalid timeline data"""
        # Invalid timeline data
        timeline_data = {
            "duration": 2.0,
            "layers": [
                {
                    "type": "video",
                    "visible": True,
                    "clips": [
                        {
                            "resourceId": "nonexistent_video",
                            "startTime": 0.0,
                            "duration": 2.0,
                            "trimStart": 0.0,
                            "trimEnd": 0.0,
                            "transitions": []
                        }
                    ]
                }
            ]
        }
        
        # Export should handle missing files gracefully
        output_path = self.service.export_timeline(
            timeline_data=timeline_data,
            output_path="test_export_error.mp4",
            resolution="480p",
            fps=24
        )
        
        # Should still create output (blank video)
        assert os.path.exists(output_path)
