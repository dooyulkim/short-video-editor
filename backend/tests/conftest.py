"""
Test configuration for pytest
"""
import sys
import os
import tempfile
import ffmpeg
from pathlib import Path

# Add parent directory to path to import backend modules
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))


def create_test_video_with_ffmpeg(output_path: str, duration: float = 2, 
                                   width: int = 640, height: int = 480, 
                                   has_audio: bool = True, fps: int = 24) -> str:
    """
    Helper function to create test videos using FFmpeg instead of MoviePy.
    
    Args:
        output_path: Path where to save the video
        duration: Duration in seconds
        width: Video width
        height: Video height
        has_audio: Whether to include audio
        fps: Frames per second
    
    Returns:
        Path to the created video
    """
    # Create video source
    video = ffmpeg.input(f'testsrc=duration={duration}:size={width}x{height}:rate={fps}', f='lavfi')
    
    if has_audio:
        # Create audio source (440 Hz sine wave)
        audio = ffmpeg.input(f'sine=frequency=440:duration={duration}', f='lavfi')
        (
            ffmpeg
            .output(video, audio, output_path, vcodec='libx264', acodec='aac', t=duration)
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True, quiet=True)
        )
    else:
        (
            ffmpeg
            .output(video, output_path, vcodec='libx264', t=duration, an=None)
            .overwrite_output()
            .run(capture_stdout=True, capture_stderr=True, quiet=True)
        )
    
    return output_path


def create_test_audio_with_ffmpeg(output_path: str, duration: float = 2, 
                                   frequency: int = 440) -> str:
    """
    Helper function to create test audio files using FFmpeg instead of MoviePy.
    
    Args:
        output_path: Path where to save the audio
        duration: Duration in seconds
        frequency: Audio frequency in Hz
    
    Returns:
        Path to the created audio file
    """
    (
        ffmpeg
        .input(f'sine=frequency={frequency}:duration={duration}', f='lavfi')
        .output(output_path, acodec='mp3', t=duration)
        .overwrite_output()
        .run(capture_stdout=True, capture_stderr=True, quiet=True)
    )
    
    return output_path


# Test fixtures and configuration can be added here
