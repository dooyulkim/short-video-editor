# Test Fixtures

This directory contains sample media files used for E2E testing with Playwright.

## Required Fixtures

To run the full E2E test suite, you need the following media files:

### Video Files

- **video.mp4** - Short sample video (5-10 seconds, 1920x1080, H.264)
- **video_portrait.mp4** - Portrait video (9:16 aspect ratio, 1080x1920)

### Audio Files

- **audio.mp3** - Short audio clip (5-10 seconds, stereo)
- **audio_long.mp3** - Longer audio for mixing tests (30 seconds, stereo)

### Image Files

- **image.jpg** - Still image (1920x1080, landscape)
- **image_transparent.png** - PNG with transparency (1920x1080)

## Generating Test Fixtures

You can generate synthetic test media using FFmpeg:

### Generate Test Video (10 seconds, 1920x1080)

```bash
ffmpeg -f lavfi -i testsrc=duration=10:size=1920x1080:rate=30 -f lavfi -i sine=frequency=1000:duration=10 -c:v libx264 -pix_fmt yuv420p -c:a aac fixtures/video.mp4
```

### Generate Portrait Video (10 seconds, 1080x1920)

```bash
ffmpeg -f lavfi -i testsrc=duration=10:size=1080x1920:rate=30 -f lavfi -i sine=frequency=1000:duration=10 -c:v libx264 -pix_fmt yuv420p -c:a aac fixtures/video_portrait.mp4
```

### Generate Audio File (10 seconds)

```bash
ffmpeg -f lavfi -i sine=frequency=440:duration=10 -c:a libmp3lame -b:a 192k fixtures/audio.mp3
```

### Generate Long Audio File (30 seconds)

```bash
ffmpeg -f lavfi -i sine=frequency=440:duration=30 -c:a libmp3lame -b:a 192k fixtures/audio_long.mp3
```

### Generate Image (1920x1080)

```bash
ffmpeg -f lavfi -i color=c=blue:s=1920x1080:d=1 -frames:v 1 fixtures/image.jpg
```

### Generate Transparent PNG (1920x1080)

```bash
ffmpeg -f lavfi -i color=c=0x00000000:s=1920x1080:d=1 -frames:v 1 fixtures/image_transparent.png
```

## Alternative: Download from Public Domain

You can also download free test media from:

- [Pexels](https://www.pexels.com/videos/) - Free stock videos
- [Pixabay](https://pixabay.com/videos/) - Free videos and images
- [Free Music Archive](https://freemusicarchive.org/) - Free audio

## Usage in Tests

```python
from pathlib import Path

FIXTURES_DIR = Path(__file__).parent / "fixtures"

def test_video_upload():
    video_path = str(FIXTURES_DIR / "video.mp4")
    helper.upload_file(video_path)
```

## Size Guidelines

Keep fixture files small to minimize repository size and test execution time:

- Videos: 5-10 seconds, <5MB each
- Audio: 5-30 seconds, <2MB each
- Images: 1920x1080 or smaller, <500KB each

## .gitignore

Fixture files may be excluded from git if they're large. In that case, they should be generated during CI/CD setup or downloaded from a CDN.
