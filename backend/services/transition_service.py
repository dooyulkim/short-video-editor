import uuid
from pathlib import Path
import ffmpeg
import numpy as np


class TransitionService:
    """Service for applying video transition effects"""
    
    def __init__(self, temp_dir: str = "temp_video"):
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    def _generate_output_path(self, prefix: str = "transition") -> str:
        """Generate unique output file path"""
        filename = f"{prefix}_{uuid.uuid4()}.mp4"
        return str(self.temp_dir / filename)
    
    def apply_fade_in(self, video_path: str, duration: float = 1.0) -> str:
        """
        Apply fade in transition from black using FFmpeg
        
        Args:
            video_path: Path to input video file
            duration: Duration of fade in seconds (default: 1.0)
            
        Returns:
            Path to processed video file
        """
        try:
            # Generate output path
            output_path = self._generate_output_path("fade_in")
            
            # Apply fade in effect using FFmpeg filter
            (
                ffmpeg
                .input(video_path)
                .filter('fade', type='in', duration=duration, start_time=0)
                .output(str(output_path), vcodec='libx264', acodec='aac')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )
            
            return output_path
            
        except ffmpeg.Error as e:
            raise Exception(f"Error applying fade in: {e.stderr.decode() if e.stderr else str(e)}")
        except Exception as e:
            raise Exception(f"Error applying fade in: {str(e)}")
    
    def apply_fade_out(self, video_path: str, duration: float = 1.0) -> str:
        """
        Apply fade out transition to black using FFmpeg
        
        Args:
            video_path: Path to input video file
            duration: Duration of fade in seconds (default: 1.0)
            
        Returns:
            Path to processed video file
        """
        try:
            # Get video duration first to calculate start time for fade out
            probe = ffmpeg.probe(video_path)
            video_duration = float(probe['format']['duration'])
            start_time = max(0, video_duration - duration)
            
            # Generate output path
            output_path = self._generate_output_path("fade_out")
            
            # Apply fade out effect using FFmpeg filter
            (
                ffmpeg
                .input(video_path)
                .filter('fade', type='out', duration=duration, start_time=start_time)
                .output(str(output_path), vcodec='libx264', acodec='aac')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )
            
            return output_path
            
        except ffmpeg.Error as e:
            raise Exception(f"Error applying fade out: {e.stderr.decode() if e.stderr else str(e)}")
        except Exception as e:
            raise Exception(f"Error applying fade out: {str(e)}")
    
    def apply_cross_dissolve(
        self,
        video1_path: str,
        video2_path: str,
        duration: float = 1.0
    ) -> str:
        """
        Apply cross dissolve transition between two videos using FFmpeg xfade filter
        
        Args:
            video1_path: Path to first video file
            video2_path: Path to second video file
            duration: Duration of crossfade in seconds (default: 1.0)
            
        Returns:
            Path to merged video file with transition
        """
        try:
            # Get durations
            probe1 = ffmpeg.probe(video1_path)
            probe2 = ffmpeg.probe(video2_path)
            duration1 = float(probe1['format']['duration'])
            duration2 = float(probe2['format']['duration'])
            
            # Ensure duration doesn't exceed clip lengths
            transition_duration = min(duration, duration1, duration2)
            
            # Calculate offset for second video (when to start the transition)
            offset = duration1 - transition_duration
            
            # Generate output path
            output_path = self._generate_output_path("cross_dissolve")
            
            # Create inputs
            input1 = ffmpeg.input(video1_path)
            input2 = ffmpeg.input(video2_path)
            
            # Apply xfade filter for cross dissolve
            # xfade requires both inputs to be of the same size
            (
                ffmpeg
                .filter([input1, input2], 'xfade', 
                       transition='fade',
                       duration=transition_duration,
                       offset=offset)
                .output(str(output_path), vcodec='libx264', acodec='aac')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )
            
            return output_path
            
        except ffmpeg.Error as e:
            raise Exception(f"Error applying cross dissolve: {e.stderr.decode() if e.stderr else str(e)}")
        except Exception as e:
            raise Exception(f"Error applying cross dissolve: {str(e)}")
    
    def apply_wipe(
        self,
        video1_path: str,
        video2_path: str,
        duration: float = 1.0,
        direction: str = "left"
    ) -> str:
        """
        Apply wipe transition between two videos using FFmpeg xfade filter
        
        Args:
            video1_path: Path to first video file
            video2_path: Path to second video file
            duration: Duration of wipe in seconds (default: 1.0)
            direction: Direction of wipe - 'left', 'right', 'up', 'down'
                (default: 'left')
            
        Returns:
            Path to merged video file with transition
        """
        try:
            # Get durations
            probe1 = ffmpeg.probe(video1_path)
            probe2 = ffmpeg.probe(video2_path)
            duration1 = float(probe1['format']['duration'])
            duration2 = float(probe2['format']['duration'])
            
            # Ensure duration doesn't exceed clip lengths
            transition_duration = min(duration, duration1, duration2)
            
            # Calculate offset for second video
            offset = duration1 - transition_duration
            
            # Map direction to xfade transition type
            transition_map = {
                'left': 'wipeleft',
                'right': 'wiperight',
                'up': 'wipeup',
                'down': 'wipedown'
            }
            
            transition_type = transition_map.get(direction, 'wipeleft')
            
            # Generate output path
            output_path = self._generate_output_path(f"wipe_{direction}")
            
            # Create inputs
            input1 = ffmpeg.input(video1_path)
            input2 = ffmpeg.input(video2_path)
            
            # Apply xfade filter with wipe transition
            (
                ffmpeg
                .filter([input1, input2], 'xfade',
                       transition=transition_type,
                       duration=transition_duration,
                       offset=offset)
                .output(str(output_path), vcodec='libx264', acodec='aac')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )
            
            return output_path
            
        except ffmpeg.Error as e:
            raise Exception(f"Error applying wipe transition: {e.stderr.decode() if e.stderr else str(e)}")
        except Exception as e:
            raise Exception(f"Error applying wipe transition: {str(e)}")
    
    def apply_slide(
        self,
        video1_path: str,
        video2_path: str,
        duration: float = 1.0,
        direction: str = "left"
    ) -> str:
        """
        Apply slide transition between two videos using FFmpeg xfade filter
        
        Args:
            video1_path: Path to first video file
            video2_path: Path to second video file
            duration: Duration of slide in seconds (default: 1.0)
            direction: Direction video2 slides in from - 'left', 'right', 'up', 'down'
                (default: 'left')
            
        Returns:
            Path to merged video file with transition
        """
        try:
            # Get durations
            probe1 = ffmpeg.probe(video1_path)
            probe2 = ffmpeg.probe(video2_path)
            duration1 = float(probe1['format']['duration'])
            duration2 = float(probe2['format']['duration'])
            
            # Ensure duration doesn't exceed clip lengths
            transition_duration = min(duration, duration1, duration2)
            
            # Calculate offset for second video
            offset = duration1 - transition_duration
            
            # Map direction to xfade transition type
            transition_map = {
                'left': 'slideleft',
                'right': 'slideright',
                'up': 'slideup',
                'down': 'slidedown'
            }
            
            transition_type = transition_map.get(direction, 'slideleft')
            
            # Generate output path
            output_path = self._generate_output_path(f"slide_{direction}")
            
            # Create inputs
            input1 = ffmpeg.input(video1_path)
            input2 = ffmpeg.input(video2_path)
            
            # Apply xfade filter with slide transition
            (
                ffmpeg
                .filter([input1, input2], 'xfade',
                       transition=transition_type,
                       duration=transition_duration,
                       offset=offset)
                .output(str(output_path), vcodec='libx264', acodec='aac')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )
            
            return output_path
            
        except ffmpeg.Error as e:
            raise Exception(f"Error applying slide transition: {e.stderr.decode() if e.stderr else str(e)}")
        except Exception as e:
            raise Exception(f"Error applying slide transition: {str(e)}")

    def cleanup_temp_files(self, max_age_hours: int = 24):
        """
        Clean up old temporary files
        
        Args:
            max_age_hours: Maximum age of files to keep in hours
        """
        import time
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600
        
        for file_path in self.temp_dir.glob("*"):
            if file_path.is_file():
                file_age = current_time - file_path.stat().st_mtime
                if file_age > max_age_seconds:
                    try:
                        file_path.unlink()
                    except Exception as e:
                        print(f"Error deleting {file_path}: {str(e)}")
