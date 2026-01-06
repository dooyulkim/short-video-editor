"""
Audio Service for waveform generation and audio extraction.
"""
import numpy as np
from moviepy.editor import VideoFileClip, AudioFileClip
from pathlib import Path
import uuid
from typing import List
import os


class AudioService:
    """Service for audio processing operations."""
    
    def __init__(self, temp_dir: str = "temp_audio"):
        """
        Initialize AudioService.
        
        Args:
            temp_dir: Directory to store temporary audio files
        """
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(exist_ok=True)
    
    def generate_waveform_data(self, audio_path: str, width: int = 1000) -> List[float]:
        """
        Generate waveform data from audio file.
        
        Args:
            audio_path: Path to audio file
            width: Number of amplitude values to return (controls resolution)
            
        Returns:
            List of amplitude values normalized between -1 and 1
            
        Raises:
            FileNotFoundError: If audio file doesn't exist
            Exception: If audio processing fails
        """
        if not os.path.exists(audio_path):
            raise FileNotFoundError(f"Audio file not found: {audio_path}")
        
        try:
            # Load audio file using moviepy
            audio_clip = AudioFileClip(audio_path)
            
            # Get audio array (samples x channels)
            # fps is the sample rate (e.g., 44100 Hz)
            audio_array = audio_clip.to_soundarray(fps=audio_clip.fps)
            
            # Convert to mono if stereo by averaging channels
            if len(audio_array.shape) > 1 and audio_array.shape[1] > 1:
                audio_array = np.mean(audio_array, axis=1)
            
            # Get total number of samples
            total_samples = len(audio_array)
            
            # Calculate samples per pixel
            samples_per_pixel = max(1, total_samples // width)
            
            # Downsample to match width
            waveform_data = []
            for i in range(width):
                start_idx = i * samples_per_pixel
                end_idx = min(start_idx + samples_per_pixel, total_samples)
                
                if start_idx >= total_samples:
                    # If we've run out of samples, pad with zeros
                    waveform_data.append(0.0)
                else:
                    # Get the chunk of samples
                    chunk = audio_array[start_idx:end_idx]
                    
                    # Use RMS (root mean square) for better visual representation
                    # This gives us the average amplitude in this chunk
                    if len(chunk) > 0:
                        rms = np.sqrt(np.mean(chunk ** 2))
                        waveform_data.append(float(rms))
                    else:
                        waveform_data.append(0.0)
            
            # Normalize to -1 to 1 range
            max_amplitude = max(abs(min(waveform_data)), abs(max(waveform_data)))
            if max_amplitude > 0:
                waveform_data = [val / max_amplitude for val in waveform_data]
            
            # Close the audio clip to free resources
            audio_clip.close()
            
            return waveform_data
            
        except Exception as e:
            raise Exception(f"Failed to generate waveform: {str(e)}")
    
    def extract_audio_from_video(self, video_path: str) -> str:
        """
        Extract audio track from video file.
        
        Args:
            video_path: Path to video file
            
        Returns:
            Path to extracted audio file
            
        Raises:
            FileNotFoundError: If video file doesn't exist
            Exception: If video has no audio track or extraction fails
        """
        if not os.path.exists(video_path):
            raise FileNotFoundError(f"Video file not found: {video_path}")
        
        video_clip = None
        try:
            # Load video file
            video_clip = VideoFileClip(video_path)
            
            # Check if video has audio
            if video_clip.audio is None:
                video_clip.close()
                raise Exception("Video file has no audio track")
            
            # Generate unique filename for extracted audio
            audio_id = str(uuid.uuid4())
            audio_filename = f"{audio_id}.mp3"
            audio_path = self.temp_dir / audio_filename
            
            # Extract and save audio
            video_clip.audio.write_audiofile(
                str(audio_path),
                codec='mp3',
                verbose=False,
                logger=None  # Suppress moviepy logs
            )
            
            # Close the video clip to free resources
            video_clip.close()
            
            return str(audio_path)
            
        except Exception as e:
            if video_clip is not None:
                video_clip.close()
            raise Exception(f"Failed to extract audio: {str(e)}")
    
    def get_audio_duration(self, audio_path: str) -> float:
        """
        Get duration of audio file in seconds.
        
        Args:
            audio_path: Path to audio file
            
        Returns:
            Duration in seconds
        """
        try:
            audio_clip = AudioFileClip(audio_path)
            duration = audio_clip.duration
            audio_clip.close()
            return duration
        except Exception as e:
            raise Exception(f"Failed to get audio duration: {str(e)}")
    
    def cleanup_temp_files(self):
        """Remove all temporary audio files."""
        try:
            for file in self.temp_dir.glob("*"):
                if file.is_file():
                    file.unlink()
        except Exception as e:
            print(f"Warning: Failed to cleanup temp files: {str(e)}")
