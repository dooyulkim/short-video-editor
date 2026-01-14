"""Generate synthetic test fixtures using FFmpeg.

This script creates sample media files for E2E testing.
Requires FFmpeg to be installed and available in PATH.
"""
from pathlib import Path
import subprocess
import sys


FIXTURES_DIR = Path(__file__).parent / "fixtures"


def check_ffmpeg() -> bool:
    """Check if FFmpeg is available."""
    try:
        subprocess.run(["ffmpeg", "-version"], capture_output=True, check=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False


def generate_video(output_path: Path, duration: int = 10, width: int = 1920, height: int = 1080) -> None:
    """Generate a test video file.
    
    Args:
        output_path: Path to output file
        duration: Video duration in seconds
        width: Video width in pixels
        height: Video height in pixels
    """
    print(f"Generating {output_path.name} ({width}x{height}, {duration}s)...")
    
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"testsrc=duration={duration}:size={width}x{height}:rate=30",
        "-f", "lavfi", "-i", f"sine=frequency=1000:duration={duration}",
        "-c:v", "libx264", "-pix_fmt", "yuv420p",
        "-c:a", "aac",
        str(output_path)
    ]
    
    subprocess.run(cmd, capture_output=True, check=True)
    print(f"  ✓ Created: {output_path.name} ({output_path.stat().st_size // 1024} KB)")


def generate_audio(output_path: Path, duration: int = 10, frequency: int = 440) -> None:
    """Generate a test audio file.
    
    Args:
        output_path: Path to output file
        duration: Audio duration in seconds
        frequency: Tone frequency in Hz
    """
    print(f"Generating {output_path.name} ({duration}s, {frequency}Hz)...")
    
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"sine=frequency={frequency}:duration={duration}",
        "-c:a", "libmp3lame", "-b:a", "192k",
        str(output_path)
    ]
    
    subprocess.run(cmd, capture_output=True, check=True)
    print(f"  ✓ Created: {output_path.name} ({output_path.stat().st_size // 1024} KB)")


def generate_image(output_path: Path, width: int = 1920, height: int = 1080, color: str = "blue") -> None:
    """Generate a test image file.
    
    Args:
        output_path: Path to output file
        width: Image width in pixels
        height: Image height in pixels
        color: Background color
    """
    print(f"Generating {output_path.name} ({width}x{height}, {color})...")
    
    cmd = [
        "ffmpeg", "-y",
        "-f", "lavfi", "-i", f"color=c={color}:s={width}x{height}:d=1",
        "-frames:v", "1",
        str(output_path)
    ]
    
    subprocess.run(cmd, capture_output=True, check=True)
    print(f"  ✓ Created: {output_path.name} ({output_path.stat().st_size // 1024} KB)")


def main() -> None:
    """Generate all test fixtures."""
    print("=" * 60)
    print("GENERATING TEST FIXTURES")
    print("=" * 60)
    
    # Check FFmpeg availability
    if not check_ffmpeg():
        print("\n❌ Error: FFmpeg not found!")
        print("Please install FFmpeg and ensure it's in your PATH.")
        print("\nInstallation:")
        print("  - Windows: Download from https://ffmpeg.org/download.html")
        print("  - macOS: brew install ffmpeg")
        print("  - Linux: sudo apt-get install ffmpeg")
        sys.exit(1)
    
    print("✓ FFmpeg is available\n")
    
    # Create fixtures directory
    FIXTURES_DIR.mkdir(exist_ok=True)
    
    try:
        # Generate video files
        generate_video(FIXTURES_DIR / "video.mp4", duration=10, width=1920, height=1080)
        generate_video(FIXTURES_DIR / "video_portrait.mp4", duration=10, width=1080, height=1920)
        
        # Generate audio files
        generate_audio(FIXTURES_DIR / "audio.mp3", duration=10, frequency=440)
        generate_audio(FIXTURES_DIR / "audio_long.mp3", duration=30, frequency=440)
        
        # Generate image files
        generate_image(FIXTURES_DIR / "image.jpg", width=1920, height=1080, color="blue")
        generate_image(FIXTURES_DIR / "image_transparent.png", width=1920, height=1080, color="0x00000000")
        
        print("\n" + "=" * 60)
        print("✅ All fixtures generated successfully!")
        print("=" * 60)
        print(f"\nFixtures location: {FIXTURES_DIR}")
        
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Error generating fixtures: {e}")
        sys.exit(1)
    except Exception as e:
        print(f"\n❌ Unexpected error: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()
