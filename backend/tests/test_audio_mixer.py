"""
Tests for the AudioMixer service.
"""
import pytest
import os
import shutil
from services.audio_mixer import AudioMixer, AudioClipConfig
from moviepy.editor import AudioFileClip
import numpy as np


class TestAudioMixer:
    """Test suite for AudioMixer class."""

    @pytest.fixture
    def temp_dir(self, tmp_path):
        """Create a temporary directory for test files."""
        test_dir = tmp_path / "test_audio_mixer"
        test_dir.mkdir(exist_ok=True)
        return test_dir

    @pytest.fixture
    def audio_mixer(self, temp_dir):
        """Create an AudioMixer instance with temporary directory."""
        mixer = AudioMixer(temp_dir=str(temp_dir))
        yield mixer
        # Cleanup after test
        if temp_dir.exists():
            shutil.rmtree(temp_dir, ignore_errors=True)

    @pytest.fixture
    def sample_audio_file(self, temp_dir):
        """
        Create a sample audio file for testing.
        Returns path to a 2-second audio file with a 440Hz tone.
        """
        from moviepy.editor import AudioClip

        def make_frame(t):
            """Generate a 440Hz sine wave (musical note A)."""
            return [np.sin(440 * 2 * np.pi * t)]

        # Create a 2-second audio clip
        audio = AudioClip(make_frame, duration=2.0, fps=44100)
        audio_path = temp_dir / "sample_audio.mp3"

        audio.write_audiofile(
            str(audio_path),
            fps=44100,
            nbytes=2,
            codec='libmp3lame',
            verbose=False,
            logger=None
        )
        audio.close()

        return str(audio_path)

    @pytest.fixture
    def sample_audio_file_2(self, temp_dir):
        """
        Create a second sample audio file for testing mixing.
        Returns path to a 1.5-second audio file with a 880Hz tone.
        """
        from moviepy.editor import AudioClip

        def make_frame(t):
            """Generate an 880Hz sine wave (one octave above A)."""
            return [np.sin(880 * 2 * np.pi * t)]

        # Create a 1.5-second audio clip
        audio = AudioClip(make_frame, duration=1.5, fps=44100)
        audio_path = temp_dir / "sample_audio_2.mp3"

        audio.write_audiofile(
            str(audio_path),
            fps=44100,
            nbytes=2,
            codec='libmp3lame',
            verbose=False,
            logger=None
        )
        audio.close()

        return str(audio_path)

    @pytest.fixture
    def sample_video_with_audio(self, temp_dir):
        """
        Create a sample video file with audio for testing extraction.
        """
        from moviepy.editor import ColorClip, AudioClip

        def make_frame(t):
            """Generate a 440Hz sine wave."""
            return [np.sin(440 * 2 * np.pi * t)]

        # Create a 2-second video with audio
        video = ColorClip(size=(640, 480), color=(255, 0, 0), duration=2.0)
        audio = AudioClip(make_frame, duration=2.0, fps=44100)
        video = video.set_audio(audio)

        video_path = temp_dir / "sample_video.mp4"
        video.write_videofile(
            str(video_path),
            fps=24,
            codec='libx264',
            audio_codec='aac',
            verbose=False,
            logger=None
        )
        video.close()
        audio.close()

        return str(video_path)

    @pytest.fixture
    def sample_video_no_audio(self, temp_dir):
        """
        Create a sample video file without audio for testing.
        """
        from moviepy.editor import ColorClip

        # Create a 2-second video without audio
        video = ColorClip(size=(640, 480), color=(0, 255, 0), duration=2.0)

        video_path = temp_dir / "sample_video_no_audio.mp4"
        video.write_videofile(
            str(video_path),
            fps=24,
            codec='libx264',
            verbose=False,
            logger=None
        )
        video.close()

        return str(video_path)

    # ==================== Tests for mix_audio_tracks ====================

    def test_mix_single_audio_track(self, audio_mixer, sample_audio_file):
        """Test mixing a single audio track."""
        clip_config = AudioClipConfig(
            audio_path=sample_audio_file,
            start_time=0.0,
            volume=1.0
        )

        result_path = audio_mixer.mix_audio_tracks([clip_config])

        assert os.path.exists(result_path)

        # Verify the output audio file
        audio = AudioFileClip(result_path)
        assert audio.duration > 0
        assert audio.duration >= 1.5  # Should be around 2 seconds
        audio.close()

    def test_mix_multiple_audio_tracks(self, audio_mixer, sample_audio_file, sample_audio_file_2):
        """Test mixing multiple audio tracks at different start times."""
        clip_config_1 = AudioClipConfig(
            audio_path=sample_audio_file,
            start_time=0.0,
            volume=0.8
        )

        clip_config_2 = AudioClipConfig(
            audio_path=sample_audio_file_2,
            start_time=1.0,
            volume=0.6
        )

        result_path = audio_mixer.mix_audio_tracks(
            [clip_config_1, clip_config_2])

        assert os.path.exists(result_path)

        # Verify the output audio file
        audio = AudioFileClip(result_path)
        # Duration should be at least 1.0 (start of second clip) + 1.5 (duration of second clip)
        assert audio.duration >= 2.0
        audio.close()

    def test_mix_with_volume_adjustment(self, audio_mixer, sample_audio_file):
        """Test mixing with volume adjustment."""
        clip_config = AudioClipConfig(
            audio_path=sample_audio_file,
            start_time=0.0,
            volume=0.5
        )

        result_path = audio_mixer.mix_audio_tracks([clip_config])

        assert os.path.exists(result_path)

        # Verify the file was created
        audio = AudioFileClip(result_path)
        assert audio.duration > 0
        audio.close()

    def test_mix_with_trimming(self, audio_mixer, sample_audio_file):
        """Test mixing with trim_start and trim_end."""
        clip_config = AudioClipConfig(
            audio_path=sample_audio_file,
            start_time=0.0,
            volume=1.0,
            trim_start=0.5,
            trim_end=1.5
        )

        result_path = audio_mixer.mix_audio_tracks([clip_config])

        assert os.path.exists(result_path)

        # Verify the duration is approximately 1 second (1.5 - 0.5)
        audio = AudioFileClip(result_path)
        assert 0.8 <= audio.duration <= 1.2  # Allow some tolerance
        audio.close()

    def test_mix_with_fades(self, audio_mixer, sample_audio_file):
        """Test mixing with fade in and fade out."""
        clip_config = AudioClipConfig(
            audio_path=sample_audio_file,
            start_time=0.0,
            volume=1.0,
            fade_in=0.5,
            fade_out=0.5
        )

        result_path = audio_mixer.mix_audio_tracks([clip_config])

        assert os.path.exists(result_path)

        # Verify the file was created with correct duration
        audio = AudioFileClip(result_path)
        assert audio.duration >= 1.5
        audio.close()

    def test_mix_with_custom_output_path(self, audio_mixer, sample_audio_file, temp_dir):
        """Test mixing with a custom output path."""
        custom_output = temp_dir / "custom_mixed.mp3"

        clip_config = AudioClipConfig(
            audio_path=sample_audio_file,
            start_time=0.0,
            volume=1.0
        )

        result_path = audio_mixer.mix_audio_tracks(
            [clip_config], output_path=str(custom_output))

        assert result_path == str(custom_output)
        assert os.path.exists(custom_output)

    def test_mix_with_specified_duration(self, audio_mixer, sample_audio_file, sample_audio_file_2):
        """Test mixing with a specified output duration."""
        # Test with multiple clips where we want to extend the final duration
        clip_config_1 = AudioClipConfig(
            audio_path=sample_audio_file,
            start_time=0.0,
            volume=1.0
        )

        clip_config_2 = AudioClipConfig(
            audio_path=sample_audio_file_2,
            start_time=2.5,
            volume=0.8
        )

        # Set duration to 5 seconds (extends beyond natural end time)
        result_path = audio_mixer.mix_audio_tracks(
            [clip_config_1, clip_config_2], duration=5.0)

        assert os.path.exists(result_path)

        # Verify duration is approximately 5 seconds
        audio = AudioFileClip(result_path)
        assert 4.5 <= audio.duration <= 5.5  # Allow some tolerance
        audio.close()

    def test_mix_empty_clips_list(self, audio_mixer):
        """Test mixing with empty clips list raises ValueError."""
        with pytest.raises(ValueError, match="audio_clips list cannot be empty"):
            audio_mixer.mix_audio_tracks([])

    def test_mix_nonexistent_audio_file(self, audio_mixer):
        """Test mixing with non-existent audio file raises FileNotFoundError."""
        clip_config = AudioClipConfig(
            audio_path="nonexistent_file.mp3",
            start_time=0.0,
            volume=1.0
        )

        with pytest.raises(FileNotFoundError, match="Audio file not found"):
            audio_mixer.mix_audio_tracks([clip_config])

    def test_mix_overlapping_clips(self, audio_mixer, sample_audio_file, sample_audio_file_2):
        """Test mixing overlapping audio clips."""
        clip_config_1 = AudioClipConfig(
            audio_path=sample_audio_file,
            start_time=0.0,
            volume=0.7
        )

        clip_config_2 = AudioClipConfig(
            audio_path=sample_audio_file_2,
            start_time=0.5,  # Overlaps with first clip
            volume=0.7
        )

        result_path = audio_mixer.mix_audio_tracks(
            [clip_config_1, clip_config_2])

        assert os.path.exists(result_path)

        # Verify the output
        audio = AudioFileClip(result_path)
        assert audio.duration >= 1.5  # Should cover both clips
        audio.close()

    # ==================== Tests for extract_audio ====================

    def test_extract_audio_from_video(self, audio_mixer, sample_video_with_audio):
        """Test extracting audio from a video file."""
        result_path = audio_mixer.extract_audio(sample_video_with_audio)

        assert os.path.exists(result_path)
        assert result_path.endswith('.mp3')

        # Verify the extracted audio
        audio = AudioFileClip(result_path)
        assert audio.duration > 0
        assert audio.duration >= 1.5  # Should be around 2 seconds
        audio.close()

    def test_extract_audio_with_custom_output(self, audio_mixer, sample_video_with_audio, temp_dir):
        """Test extracting audio with custom output path."""
        custom_output = temp_dir / "extracted_audio.mp3"

        result_path = audio_mixer.extract_audio(
            sample_video_with_audio, output_path=str(custom_output))

        assert result_path == str(custom_output)
        assert os.path.exists(custom_output)

    def test_extract_audio_nonexistent_video(self, audio_mixer):
        """Test extracting audio from non-existent video raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError, match="Video file not found"):
            audio_mixer.extract_audio("nonexistent_video.mp4")

    def test_extract_audio_no_audio_track(self, audio_mixer, sample_video_no_audio):
        """Test extracting audio from video without audio track raises ValueError."""
        with pytest.raises(ValueError, match="Video file has no audio track"):
            audio_mixer.extract_audio(sample_video_no_audio)

    # ==================== Tests for apply_audio_fade ====================

    def test_apply_fade_in(self, audio_mixer, sample_audio_file):
        """Test applying fade in effect."""
        result_path = audio_mixer.apply_audio_fade(
            sample_audio_file, fade_in=0.5)

        assert os.path.exists(result_path)

        # Verify the output
        audio = AudioFileClip(result_path)
        assert audio.duration > 0
        audio.close()

    def test_apply_fade_out(self, audio_mixer, sample_audio_file):
        """Test applying fade out effect."""
        result_path = audio_mixer.apply_audio_fade(
            sample_audio_file, fade_out=0.5)

        assert os.path.exists(result_path)

        # Verify the output
        audio = AudioFileClip(result_path)
        assert audio.duration > 0
        audio.close()

    def test_apply_both_fades(self, audio_mixer, sample_audio_file):
        """Test applying both fade in and fade out."""
        result_path = audio_mixer.apply_audio_fade(
            sample_audio_file, fade_in=0.3, fade_out=0.3)

        assert os.path.exists(result_path)

        # Verify the output
        audio = AudioFileClip(result_path)
        assert audio.duration > 0
        audio.close()

    def test_apply_no_fades_returns_original(self, audio_mixer, sample_audio_file):
        """Test applying no fades returns the original path."""
        result_path = audio_mixer.apply_audio_fade(
            sample_audio_file, fade_in=0.0, fade_out=0.0)

        assert result_path == sample_audio_file

    def test_apply_fade_with_custom_output(self, audio_mixer, sample_audio_file, temp_dir):
        """Test applying fade with custom output path."""
        custom_output = temp_dir / "faded_audio.mp3"

        result_path = audio_mixer.apply_audio_fade(
            sample_audio_file,
            fade_in=0.5,
            output_path=str(custom_output)
        )

        assert result_path == str(custom_output)
        assert os.path.exists(custom_output)

    def test_apply_fade_nonexistent_file(self, audio_mixer):
        """Test applying fade to non-existent file raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError, match="Audio file not found"):
            audio_mixer.apply_audio_fade("nonexistent.mp3", fade_in=0.5)

    def test_apply_fade_negative_duration(self, audio_mixer, sample_audio_file):
        """Test applying negative fade duration raises ValueError."""
        with pytest.raises(ValueError, match="Fade durations must be non-negative"):
            audio_mixer.apply_audio_fade(sample_audio_file, fade_in=-0.5)

    def test_apply_fade_exceeds_duration(self, audio_mixer, sample_audio_file):
        """Test applying fade that exceeds audio duration raises ValueError."""
        with pytest.raises(ValueError, match="Combined fade durations.*exceed audio duration"):
            audio_mixer.apply_audio_fade(
                sample_audio_file, fade_in=1.5, fade_out=1.5)

    # ==================== Tests for normalize_audio ====================

    def test_normalize_audio_increase_volume(self, audio_mixer, sample_audio_file):
        """Test normalizing audio with increased volume."""
        result_path = audio_mixer.normalize_audio(
            sample_audio_file, target_volume=1.5)

        assert os.path.exists(result_path)

        # Verify the output
        audio = AudioFileClip(result_path)
        assert audio.duration > 0
        audio.close()

    def test_normalize_audio_decrease_volume(self, audio_mixer, sample_audio_file):
        """Test normalizing audio with decreased volume."""
        result_path = audio_mixer.normalize_audio(
            sample_audio_file, target_volume=0.5)

        assert os.path.exists(result_path)

        # Verify the output
        audio = AudioFileClip(result_path)
        assert audio.duration > 0
        audio.close()

    def test_normalize_audio_with_custom_output(self, audio_mixer, sample_audio_file, temp_dir):
        """Test normalizing audio with custom output path."""
        custom_output = temp_dir / "normalized_audio.mp3"

        result_path = audio_mixer.normalize_audio(
            sample_audio_file,
            target_volume=0.8,
            output_path=str(custom_output)
        )

        assert result_path == str(custom_output)
        assert os.path.exists(custom_output)

    def test_normalize_audio_nonexistent_file(self, audio_mixer):
        """Test normalizing non-existent file raises FileNotFoundError."""
        with pytest.raises(FileNotFoundError, match="Audio file not found"):
            audio_mixer.normalize_audio("nonexistent.mp3", target_volume=1.0)

    def test_normalize_audio_invalid_volume(self, audio_mixer, sample_audio_file):
        """Test normalizing with invalid volume raises ValueError."""
        with pytest.raises(ValueError, match="Target volume must be positive"):
            audio_mixer.normalize_audio(sample_audio_file, target_volume=0)

        with pytest.raises(ValueError, match="Target volume must be positive"):
            audio_mixer.normalize_audio(sample_audio_file, target_volume=-0.5)

    # ==================== Tests for AudioClipConfig ====================

    def test_audio_clip_config_default_values(self, sample_audio_file):
        """Test AudioClipConfig with default values."""
        config = AudioClipConfig(audio_path=sample_audio_file)

        assert config.audio_path == sample_audio_file
        assert config.start_time == 0.0
        assert config.volume == 1.0
        assert config.trim_start == 0.0
        assert config.trim_end is None
        assert config.fade_in == 0.0
        assert config.fade_out == 0.0

    def test_audio_clip_config_custom_values(self, sample_audio_file):
        """Test AudioClipConfig with custom values."""
        config = AudioClipConfig(
            audio_path=sample_audio_file,
            start_time=1.5,
            volume=0.8,
            trim_start=0.5,
            trim_end=2.0,
            fade_in=0.3,
            fade_out=0.3
        )

        assert config.audio_path == sample_audio_file
        assert config.start_time == 1.5
        assert config.volume == 0.8
        assert config.trim_start == 0.5
        assert config.trim_end == 2.0
        assert config.fade_in == 0.3
        assert config.fade_out == 0.3
