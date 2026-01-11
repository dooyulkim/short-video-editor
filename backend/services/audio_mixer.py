"""
Audio Mixer Service for mixing multiple audio tracks with volume
adjustments and effects using ffmpeg-python.
"""
import subprocess
from pathlib import Path
from typing import List, Optional
import uuid
import os
import ffmpeg


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
    """Service for audio mixing operations using FFmpeg."""
    
    def __init__(self, temp_dir: str = "temp_audio"):
        """
        Initialize AudioMixer.
        
        Args:
            temp_dir: Directory to store temporary audio files
        """
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(exist_ok=True)
    
    def _get_audio_duration(self, audio_path: str) -> float:
        """
        Get the duration of an audio file using ffprobe.
        
        Args:
            audio_path: Path to the audio file
            
        Returns:
            Duration in seconds
        """
        try:
            probe = ffmpeg.probe(audio_path)
            duration = float(probe['format'].get('duration', 0))
            return duration
        except Exception:
            return 0.0
    
    def _has_audio_stream(self, file_path: str) -> bool:
        """
        Check if a file has an audio stream.
        
        Args:
            file_path: Path to the media file
            
        Returns:
            True if the file has an audio stream
        """
        try:
            probe = ffmpeg.probe(file_path)
            audio_streams = [s for s in probe['streams'] if s['codec_type'] == 'audio']
            return len(audio_streams) > 0
        except Exception:
            return False
    
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
            # Generate output path if not provided
            if output_path is None:
                output_filename = f"mixed_audio_{uuid.uuid4()}.mp3"
                output_path = str(self.temp_dir / output_filename)
            
            # Ensure output directory exists
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            # Calculate max end time and process clips
            max_end_time = 0.0
            temp_files = []
            
            try:
                processed_clips = []
                
                for idx, clip_config in enumerate(audio_clips):
                    # Get original duration
                    original_duration = self._get_audio_duration(clip_config.audio_path)
                    
                    # Calculate effective duration after trimming
                    if clip_config.trim_end is not None:
                        effective_duration = clip_config.trim_end - clip_config.trim_start
                    else:
                        effective_duration = original_duration - clip_config.trim_start
                    
                    # Track max end time
                    clip_end_time = clip_config.start_time + effective_duration
                    max_end_time = max(max_end_time, clip_end_time)
                    
                    # Create temp file for processed clip
                    temp_clip = str(self.temp_dir / f"temp_clip_{idx}_{uuid.uuid4()}.mp3")
                    temp_files.append(temp_clip)
                    
                    # Build FFmpeg command for this clip
                    cmd = ['ffmpeg', '-y']
                    
                    # Input with trimming
                    if clip_config.trim_start > 0:
                        cmd.extend(['-ss', str(clip_config.trim_start)])
                    
                    cmd.extend(['-i', clip_config.audio_path])
                    
                    if clip_config.trim_end is not None:
                        trim_duration = clip_config.trim_end - clip_config.trim_start
                        cmd.extend(['-t', str(trim_duration)])
                    
                    # Build audio filter chain
                    filters = []
                    
                    # Volume adjustment
                    if clip_config.volume != 1.0:
                        filters.append(f"volume={clip_config.volume}")
                    
                    # Fade in
                    if clip_config.fade_in > 0:
                        filters.append(f"afade=t=in:st=0:d={clip_config.fade_in}")
                    
                    # Fade out
                    if clip_config.fade_out > 0:
                        fade_out_start = effective_duration - clip_config.fade_out
                        filters.append(f"afade=t=out:st={fade_out_start}:d={clip_config.fade_out}")
                    
                    if filters:
                        cmd.extend(['-af', ','.join(filters)])
                    
                    cmd.extend([
                        '-c:a', 'libmp3lame',
                        '-b:a', '192k',
                        '-ar', '44100',
                        temp_clip
                    ])
                    
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    if result.returncode != 0:
                        raise Exception(f"FFmpeg error processing clip: {result.stderr}")
                    
                    processed_clips.append({
                        'path': temp_clip,
                        'start_time': clip_config.start_time,
                        'duration': effective_duration
                    })
                
                # Determine final duration
                final_duration = duration if duration is not None else max_end_time
                
                # Mix all clips together
                if len(processed_clips) == 1:
                    # Single clip - just apply delay if needed and output
                    clip_info = processed_clips[0]
                    delay_ms = int(clip_info['start_time'] * 1000)
                    
                    cmd = ['ffmpeg', '-y', '-i', clip_info['path']]
                    
                    filters = []
                    if delay_ms > 0:
                        filters.append(f"adelay={delay_ms}|{delay_ms}")
                    
                    # Pad to final duration if specified
                    if duration is not None:
                        filters.append(f"apad=whole_dur={final_duration}")
                    
                    if filters:
                        cmd.extend(['-af', ','.join(filters)])
                    
                    if duration is not None:
                        cmd.extend(['-t', str(final_duration)])
                    
                    cmd.extend([
                        '-c:a', 'libmp3lame',
                        '-b:a', '192k',
                        '-ar', '44100',
                        output_path
                    ])
                    
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    if result.returncode != 0:
                        raise Exception(f"FFmpeg error: {result.stderr}")
                else:
                    # Multiple clips - mix with delays
                    input_args = []
                    filter_parts = []
                    
                    for idx, clip_info in enumerate(processed_clips):
                        input_args.extend(['-i', clip_info['path']])
                        delay_ms = int(clip_info['start_time'] * 1000)
                        filter_parts.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms}[a{idx}]")
                    
                    # Build mix filter
                    mix_inputs = "".join([f"[a{i}]" for i in range(len(processed_clips))])
                    
                    # If duration is specified and longer than longest clip, pad to reach it
                    if duration is not None and duration > max_end_time:
                        filter_parts.append(f"{mix_inputs}amix=inputs={len(processed_clips)}:duration=longest,apad=whole_dur={final_duration}[aout]")
                    else:
                        filter_parts.append(f"{mix_inputs}amix=inputs={len(processed_clips)}:duration=longest[aout]")
                    
                    cmd = ['ffmpeg', '-y']
                    cmd.extend(input_args)
                    cmd.extend(['-filter_complex', ';'.join(filter_parts)])
                    cmd.extend(['-map', '[aout]'])
                    
                    if duration is not None:
                        cmd.extend(['-t', str(final_duration)])
                    
                    cmd.extend([
                        '-c:a', 'libmp3lame',
                        '-b:a', '192k',
                        '-ar', '44100',
                        output_path
                    ])
                    
                    result = subprocess.run(cmd, capture_output=True, text=True)
                    if result.returncode != 0:
                        raise Exception(f"FFmpeg error: {result.stderr}")
                
                return output_path
                
            finally:
                # Cleanup temp files
                for temp_file in temp_files:
                    try:
                        if os.path.exists(temp_file):
                            os.unlink(temp_file)
                    except OSError:
                        pass
            
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
        
        # Check if video has audio
        if not self._has_audio_stream(video_path):
            raise ValueError(f"Video file has no audio track: {video_path}")
        
        try:
            # Generate output path if not provided
            if output_path is None:
                output_filename = f"extracted_audio_{uuid.uuid4()}.mp3"
                output_path = str(self.temp_dir / output_filename)
            
            # Ensure output directory exists
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            # Extract audio using FFmpeg
            cmd = [
                'ffmpeg', '-y',
                '-i', video_path,
                '-vn',  # No video
                '-c:a', 'libmp3lame',
                '-b:a', '192k',
                '-ar', '44100',
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(f"FFmpeg error: {result.stderr}")
            
            return output_path
            
        except ValueError:
            raise
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
        
        # Get audio duration
        audio_duration = self._get_audio_duration(audio_path)
        
        # Validate fade durations don't exceed audio duration
        if fade_in + fade_out > audio_duration:
            raise ValueError(
                f"Combined fade durations ({fade_in + fade_out}s) exceed "
                f"audio duration ({audio_duration}s)"
            )
        
        try:
            # Generate output path if not provided
            if output_path is None:
                output_filename = f"faded_audio_{uuid.uuid4()}.mp3"
                output_path = str(self.temp_dir / output_filename)
            
            # Ensure output directory exists
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            # Build filter chain
            filters = []
            
            if fade_in > 0:
                filters.append(f"afade=t=in:st=0:d={fade_in}")
            
            if fade_out > 0:
                fade_out_start = audio_duration - fade_out
                filters.append(f"afade=t=out:st={fade_out_start}:d={fade_out}")
            
            cmd = [
                'ffmpeg', '-y',
                '-i', audio_path,
                '-af', ','.join(filters),
                '-c:a', 'libmp3lame',
                '-b:a', '192k',
                '-ar', '44100',
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(f"FFmpeg error: {result.stderr}")
            
            return output_path
            
        except ValueError:
            raise
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
            # Generate output path if not provided
            if output_path is None:
                output_filename = f"normalized_audio_{uuid.uuid4()}.mp3"
                output_path = str(self.temp_dir / output_filename)
            
            # Ensure output directory exists
            Path(output_path).parent.mkdir(parents=True, exist_ok=True)
            
            cmd = [
                'ffmpeg', '-y',
                '-i', audio_path,
                '-af', f'volume={target_volume}',
                '-c:a', 'libmp3lame',
                '-b:a', '192k',
                '-ar', '44100',
                output_path
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(f"FFmpeg error: {result.stderr}")
            
            return output_path
            
        except ValueError:
            raise
        except Exception as e:
            raise Exception(f"Failed to normalize audio: {str(e)}")
