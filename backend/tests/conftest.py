"""
Test configuration for pytest
"""
import sys
import os
import subprocess
import json
from pathlib import Path

# Add parent directory to path to import backend modules
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

# Add local FFmpeg binaries to PATH if available
ffmpeg_bin_dir = backend_dir / "bin"
if ffmpeg_bin_dir.exists():
    os.environ["PATH"] = str(ffmpeg_bin_dir) + os.pathsep + os.environ.get("PATH", "")


def create_test_video_with_ffmpeg(output_path: str, duration: float = 2, 
                                   width: int = 640, height: int = 480, 
                                   has_audio: bool = True, fps: int = 24) -> str:
    """
    Helper function to create test videos using FFmpeg subprocess.
    
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
    if has_audio:
        cmd = [
            'ffmpeg', '-y',
            '-f', 'lavfi', '-i', f'color=c=red:s={width}x{height}:d={duration}:r={fps}',
            '-f', 'lavfi', '-i', f'sine=frequency=440:duration={duration}',
            '-c:v', 'libx264', '-preset', 'ultrafast',
            '-c:a', 'aac', '-b:a', '128k',
            '-pix_fmt', 'yuv420p',
            '-shortest',
            output_path
        ]
    else:
        cmd = [
            'ffmpeg', '-y',
            '-f', 'lavfi', '-i', f'color=c=red:s={width}x{height}:d={duration}:r={fps}',
            '-c:v', 'libx264', '-preset', 'ultrafast',
            '-pix_fmt', 'yuv420p',
            '-an',
            output_path
        ]
    
    subprocess.run(cmd, capture_output=True, check=True)
    return output_path


def create_test_audio_with_ffmpeg(output_path: str, duration: float = 2, 
                                   frequency: int = 440) -> str:
    """
    Helper function to create test audio files using FFmpeg subprocess.
    
    Args:
        output_path: Path where to save the audio
        duration: Duration in seconds
        frequency: Audio frequency in Hz
    
    Returns:
        Path to the created audio file
    """
    cmd = [
        'ffmpeg', '-y',
        '-f', 'lavfi', '-i', f'sine=frequency={frequency}:duration={duration}',
        '-c:a', 'libmp3lame', '-b:a', '128k',
        output_path
    ]
    
    subprocess.run(cmd, capture_output=True, check=True)
    return output_path


def get_video_info(video_path: str) -> dict:
    """Get video information using ffprobe."""
    cmd = [
        'ffprobe', '-v', 'quiet',
        '-print_format', 'json',
        '-show_format', '-show_streams',
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        return {}
    return json.loads(result.stdout)


# Test fixtures and configuration can be added here
