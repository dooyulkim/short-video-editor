"""
Tests for the AudioMixer service using ffmpeg-python.
"""
import pytest
import os
import shutil
import subprocess
from services.audio_mixer import AudioMixer, AudioClipConfig
import ffmpeg


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
        Create a sample audio file for testing using FFmpeg.
        Returns path to a 2-second audio file with a 440Hz tone.
        """
        audio_path = str(temp_dir / "sample_audio.mp3")
        
        # Generate 2-second 440Hz sine wave using FFmpeg
        cmd = [
            'ffmpeg', '-y',
            '-f', 'lavfi',
            '-i', 'sine=frequency=440:duration=2',
            '-c:a', 'libmp3lame',
            '-b:a', '192k',
            '-ar', '44100',
            audio_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            pytest.skip(f"FFmpeg not available or error: {result.stderr}")
        
        return audio_path

    @pytest.fixture
    def sample_audio_file_2(self, temp_dir):
        """
        Create a second sample audio file for testing mixing.
        Returns path to a 1.5-second audio file with an 880Hz tone.
        """
        audio_path = str(temp_dir / "sample_audio_2.mp3")
        
        # Generate 1.5-second 880Hz sine wave using FFmpeg
        cmd = [
            'ffmpeg', '-y',
            '-f', 'lavfi',
            '-i', 'sine=frequency=880:duration=1.5',
            '-c:a', 'libmp3lame',
            '-b:a', '192k',
            '-ar', '44100',
            audio_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            pytest.skip(f"FFmpeg not available or error: {result.stderr}")
        
        return audio_path

    @pytest.fixture
    def sample_video_with_audio(self, temp_dir):
        """
        Create a sample video file with audio for testing extraction.
        """
        video_path = str(temp_dir / "sample_video.mp4")
        
        # Generate 2-second video with audio using FFmpeg
        cmd = [
            'ffmpeg', '-y',
            '-f', 'lavfi', '-i', 'color=c=red:s=640x480:d=2:r=24',
            '-f', 'lavfi', '-i', 'sine=frequency=440:duration=2',
            '-c:v', 'libx264', '-preset', 'ultrafast',
            '-c:a', 'aac', '-b:a', '192k',
            '-shortest',
            video_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            pytest.skip(f"FFmpeg not available or error: {result.stderr}")
        
        return video_path

    @pytest.fixture
    def sample_video_no_audio(self, temp_dir):
        """
        Create a sample video file without audio for testing.
        """
        video_path = str(temp_dir / "sample_video_no_audio.mp4")
        
        # Generate 2-second video without audio using FFmpeg
        cmd = [
            'ffmpeg', '-y',
            '-f', 'lavfi', '-i', 'color=c=green:s=640x480:d=2:r=24',
            '-c:v', 'libx264', '-preset', 'ultrafast',
            '-an',  # No audio
            video_path
        ]
        
        result = subprocess.run(cmd, capture_output=True, text=True)
        if result.returncode != 0:
            pytest.skip(f"FFmpeg not available or error: {result.stderr}")
        
        return video_path

    def _get_audio_duration(self, audio_path):
        """Helper to get audio duration using ffprobe."""
        try:
            probe = ffmpeg.probe(audio_path)
            return float(probe['format'].get('duration', 0))
        except Exception:
            return 0.0

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
        duration = self._get_audio_duration(result_path)
        assert duration > 0
        assert duration >= 1.5  # Should be around 2 seconds

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
        duration = self._get_audio_duration(result_path)
        # Duration should be at least 1.0 (start of second clip) + 1.5 (duration of second clip)
        assert duration >= 2.0

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
        duration = self._get_audio_duration(result_path)
        assert duration > 0

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
        duration = self._get_audio_duration(result_path)
        assert 0.8 <= duration <= 1.2  # Allow some tolerance

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
        duration = self._get_audio_duration(result_path)
        assert duration >= 1.5

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
        duration = self._get_audio_duration(result_path)
        assert 4.5 <= duration <= 5.5  # Allow some tolerance

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
        duration = self._get_audio_duration(result_path)
        assert duration >= 1.5  # Should cover both clips

    # ==================== Tests for extract_audio ====================

    def test_extract_audio_from_video(self, audio_mixer, sample_video_with_audio):
        """Test extracting audio from a video file."""
        result_path = audio_mixer.extract_audio(sample_video_with_audio)

        assert os.path.exists(result_path)
        assert result_path.endswith('.mp3')

        # Verify the extracted audio
        duration = self._get_audio_duration(result_path)
        assert duration > 0
        assert duration >= 1.5  # Should be around 2 seconds

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
        duration = self._get_audio_duration(result_path)
        assert duration > 0

    def test_apply_fade_out(self, audio_mixer, sample_audio_file):
        """Test applying fade out effect."""
        result_path = audio_mixer.apply_audio_fade(
            sample_audio_file, fade_out=0.5)

        assert os.path.exists(result_path)

        # Verify the output
        duration = self._get_audio_duration(result_path)
        assert duration > 0

    def test_apply_both_fades(self, audio_mixer, sample_audio_file):
        """Test applying both fade in and fade out."""
        result_path = audio_mixer.apply_audio_fade(
            sample_audio_file, fade_in=0.3, fade_out=0.3)

        assert os.path.exists(result_path)

        # Verify the output
        duration = self._get_audio_duration(result_path)
        assert duration > 0

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
        duration = self._get_audio_duration(result_path)
        assert duration > 0

    def test_normalize_audio_decrease_volume(self, audio_mixer, sample_audio_file):
        """Test normalizing audio with decreased volume."""
        result_path = audio_mixer.normalize_audio(
            sample_audio_file, target_volume=0.5)

        assert os.path.exists(result_path)

        # Verify the output
        duration = self._get_audio_duration(result_path)
        assert duration > 0

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
