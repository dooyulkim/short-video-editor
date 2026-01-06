"""
Audio Mixer Service for mixing multiple audio tracks with volume
adjustments and effects.
"""
from moviepy.editor import (
    VideoFileClip,
    AudioFileClip,
    CompositeAudioClip
)
from moviepy.audio.fx.volumex import volumex
from moviepy.audio.fx.audio_fadein import audio_fadein
from moviepy.audio.fx.audio_fadeout import audio_fadeout
from pathlib import Path
from typing import List, Optional
import uuid
import os


class AudioClipConfig:
    """Configuration for an audio clip in the mix."""
    
    def __init__(
        self,
        audio_path: str,
        start_time: float = 0.0,
        volume: float = 1.0,
        trim_start: float = 0.0,
        trim_end: Optional[float] = None,
        fade_in: float = 0.0,
        fade_out: float = 0.0
    ):
        """
        Initialize audio clip configuration.
        
        Args:
            audio_path: Path to the audio file
            start_time: Start time in the final mix (seconds)
            volume: Volume multiplier (0.0 to 1.0+)
            trim_start: Trim from start of clip (seconds)
            trim_end: Trim from end of clip (seconds), None for full duration
            fade_in: Fade in duration (seconds)
            fade_out: Fade out duration (seconds)
        """
        self.audio_path = audio_path
        self.start_time = start_time
        self.volume = volume
        self.trim_start = trim_start
        self.trim_end = trim_end
        self.fade_in = fade_in
        self.fade_out = fade_out


class AudioMixer:
    """Service for audio mixing operations."""
    
    def __init__(self, temp_dir: str = "temp_audio"):
        """
        Initialize AudioMixer.
        
        Args:
            temp_dir: Directory to store temporary audio files
        """
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(exist_ok=True)
    
    def mix_audio_tracks(
        self,
        audio_clips: List[AudioClipConfig],
        output_path: Optional[str] = None,
        duration: Optional[float] = None
    ) -> str:
        """
        Mix multiple audio tracks into a single output file.
        
        Args:
            audio_clips: List of AudioClipConfig objects defining clips
            output_path: Path for output audio. If None, generates temp
            duration: Total duration (seconds). If None, uses max end time
            
        Returns:
            Path to the mixed audio file
            
        Raises:
            FileNotFoundError: If any audio file doesn't exist
            ValueError: If audio_clips list is empty or invalid parameters
            Exception: If audio processing fails
        """
        if not audio_clips:
            raise ValueError("audio_clips list cannot be empty")
        
        # Validate all audio files exist
        for clip_config in audio_clips:
            if not os.path.exists(clip_config.audio_path):
                raise FileNotFoundError(
                    f"Audio file not found: {clip_config.audio_path}"
                )
        
        try:
            # Process each audio clip
            processed_clips = []
            max_end_time = 0.0
            
            for clip_config in audio_clips:
                # Load the audio clip
                audio_clip = AudioFileClip(clip_config.audio_path)
                
                # Apply trimming
                if clip_config.trim_start > 0:
                    audio_clip = audio_clip.subclip(clip_config.trim_start)
                
                if clip_config.trim_end is not None:
                    end_time = (
                        clip_config.trim_end - clip_config.trim_start
                    )
                    audio_clip = audio_clip.subclip(0, end_time)
                
                # Apply volume adjustment
                if clip_config.volume != 1.0:
                    audio_clip = audio_clip.fx(volumex, clip_config.volume)
                
                # Apply fade in
                if clip_config.fade_in > 0:
                    audio_clip = audio_clip.fx(
                        audio_fadein, clip_config.fade_in
                    )
                
                # Apply fade out
                if clip_config.fade_out > 0:
                    audio_clip = audio_clip.fx(
                        audio_fadeout, clip_config.fade_out
                    )
                
                # Set start time for this clip in the mix
                audio_clip = audio_clip.set_start(clip_config.start_time)
                
                processed_clips.append(audio_clip)
                
                # Track the maximum end time
                clip_end_time = clip_config.start_time + audio_clip.duration
                max_end_time = max(max_end_time, clip_end_time)
            
            # Determine final duration
            final_duration = duration if duration is not None else max_end_time
            
            # Create composite audio clip
            if len(processed_clips) == 1:
                # Single clip case
                composite = processed_clips[0]
                # For single clips, set duration before writing
                if duration is not None:
                    composite = composite.set_duration(final_duration)
            else:
                # Multiple clips - composite them
                composite = CompositeAudioClip(processed_clips)
                # Set duration if specified
                if duration is not None:
                    composite = composite.set_duration(final_duration)
            
            # Generate output path if not provided
            if output_path is None:
                output_filename = f"mixed_audio_{uuid.uuid4()}.mp3"
                output_path = str(self.temp_dir / output_filename)
            
            # Ensure output directory exists
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            # Write the mixed audio to file
            composite.write_audiofile(
                output_path,
                fps=44100,  # Standard audio sample rate
                nbytes=2,   # 16-bit audio
                codec='libmp3lame',
                bitrate='192k',
                verbose=False,
                logger=None
            )
            
            # Close all clips to free resources
            for clip in processed_clips:
                clip.close()
            composite.close()
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Failed to mix audio tracks: {str(e)}")
    
    def extract_audio(
        self, video_path: str, output_path: Optional[str] = None
    ) -> str:
        """
        Extract audio from a video file.
        
        Args:
            video_path: Path to the video file
            output_path: Path for extracted audio. If None, generates temp
            
        Returns:
            Path to the extracted audio file
            
        Raises:
            FileNotFoundError: If video file doesn't exist
            ValueError: If video has no audio track
            Exception: If extraction fails
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        # Load video file
        video_clip = VideoFileClip(video_path)
        
        # Check if video has audio
        if video_clip.audio is None:
            video_clip.close()
            raise ValueError(f"Video file has no audio track: {video_path}")
        
        try:
            
            # Generate output path if not provided
            if output_path is None:
                output_filename = f"extracted_audio_{uuid.uuid4()}.mp3"
                output_path = str(self.temp_dir / output_filename)
            
            # Ensure output directory exists
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            # Extract and write audio
            video_clip.audio.write_audiofile(
                output_path,
                fps=44100,
                nbytes=2,
                codec='libmp3lame',
                bitrate='192k',
                verbose=False,
                logger=None
            )
            
            # Close the video clip to free resources
            video_clip.close()
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Failed to extract audio from video: {str(e)}")
    
    def apply_audio_fade(
        self,
        audio_path: str,
        fade_in: float = 0.0,
        fade_out: float = 0.0,
        output_path: Optional[str] = None
    ) -> str:
        """
        Apply fade in and/or fade out effects to an audio file.
        
        Args:
            audio_path: Path to the audio file
            fade_in: Fade in duration in seconds (0 for no fade in)
            fade_out: Fade out duration in seconds (0 for no fade out)
            output_path: Path for output file. If None, generates temp
            
        Returns:
            Path to the processed audio file
            
        Raises:
            FileNotFoundError: If audio file doesn't exist
            ValueError: If fade durations are invalid
            Exception: If audio processing fails
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        if fade_in < 0 or fade_out < 0:
            raise ValueError("Fade durations must be non-negative")
        
        # If no fades requested, just return the original path
        if fade_in == 0.0 and fade_out == 0.0:
            return audio_path
        
        # Load audio file
        audio_clip = AudioFileClip(audio_path)
        
        # Validate fade durations don't exceed audio duration
        if fade_in + fade_out > audio_clip.duration:
            audio_clip.close()
            raise ValueError(
                f"Combined fade durations ({fade_in + fade_out}s) exceed "
                f"audio duration ({audio_clip.duration}s)"
            )
        
        try:
            
            # Apply fade in
            if fade_in > 0:
                audio_clip = audio_clip.fx(audio_fadein, fade_in)
            
            # Apply fade out
            if fade_out > 0:
                audio_clip = audio_clip.fx(audio_fadeout, fade_out)
            
            # Generate output path if not provided
            if output_path is None:
                output_filename = f"faded_audio_{uuid.uuid4()}.mp3"
                output_path = str(self.temp_dir / output_filename)
            
            # Ensure output directory exists
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            # Write the processed audio
            audio_clip.write_audiofile(
                output_path,
                fps=44100,
                nbytes=2,
                codec='libmp3lame',
                bitrate='192k',
                verbose=False,
                logger=None
            )
            
            # Close clip to free resources
            audio_clip.close()
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Failed to apply audio fade: {str(e)}")
    
    def normalize_audio(
        self,
        audio_path: str,
        target_volume: float = 1.0,
        output_path: Optional[str] = None
    ) -> str:
        """
        Normalize audio volume.
        
        Args:
            audio_path: Path to the audio file
            target_volume: Target volume level (0.0 to 1.0+)
            output_path: Path for the output file. 
            If None, generates a temp file
            
        Returns:
            Path to the normalized audio file
            
        Raises:
            FileNotFoundError: If audio file doesn't exist
            ValueError: If target_volume is invalid
            Exception: If audio processing fails
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        if target_volume <= 0:
            raise ValueError("Target volume must be positive")
        
        try:
            # Load audio file
            audio_clip = AudioFileClip(audio_path)
            
            # Apply volume normalization
            audio_clip = audio_clip.fx(volumex, target_volume)
            
            # Generate output path if not provided
            if output_path is None:
                output_filename = f"normalized_audio_{uuid.uuid4()}.mp3"
                output_path = str(self.temp_dir / output_filename)
            
            # Ensure output directory exists
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            # Write the normalized audio
            audio_clip.write_audiofile(
                output_path,
                fps=44100,
                nbytes=2,
                codec='libmp3lame',
                bitrate='192k',
                verbose=False,
                logger=None
            )
            
            # Close clip to free resources
            audio_clip.close()
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Failed to normalize audio: {str(e)}")
