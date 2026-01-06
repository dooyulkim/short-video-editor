import os
import uuid
import cv2
import numpy as np
from pathlib import Path
from typing import Tuple, Optional
from PIL import Image
from moviepy.editor import VideoFileClip, AudioFileClip
import base64
from io import BytesIO

from models.media import VideoMetadata, AudioMetadata, ImageMetadata


class MediaService:
    """Service for handling media file operations"""
    
    def __init__(self, upload_dir: str = "uploads", thumbnail_dir: str = "thumbnails"):
        self.upload_dir = Path(upload_dir)
        self.thumbnail_dir = Path(thumbnail_dir)
        
        # Create directories if they don't exist
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.thumbnail_dir.mkdir(parents=True, exist_ok=True)
    
    def save_uploaded_file(self, file_content: bytes, filename: str, file_type: str) -> Tuple[str, str]:
        """
        Save uploaded file with a unique UUID filename
        
        Args:
            file_content: Raw file bytes
            filename: Original filename
            file_type: Type of media (video, audio, image)
        
        Returns:
            Tuple of (file_id, file_path)
        """
        # Generate unique ID
        file_id = str(uuid.uuid4())
        
        # Get file extension from original filename
        file_extension = Path(filename).suffix
        
        # Create new filename with UUID
        new_filename = f"{file_id}{file_extension}"
        file_path = self.upload_dir / new_filename
        
        # Save file to disk
        with open(file_path, "wb") as f:
            f.write(file_content)
        
        return file_id, str(file_path)
    
    def extract_video_metadata(self, file_path: str) -> VideoMetadata:
        """
        Extract metadata from video file using OpenCV and MoviePy
        
        Args:
            file_path: Path to video file
        
        Returns:
            VideoMetadata object with extracted information
        """
        try:
            # Open video with OpenCV for quick metadata
            cap = cv2.VideoCapture(file_path)
            
            if not cap.isOpened():
                raise ValueError(f"Could not open video file: {file_path}")
            
            # Extract metadata
            width = int(cap.get(cv2.CAP_PROP_FRAME_WIDTH))
            height = int(cap.get(cv2.CAP_PROP_FRAME_HEIGHT))
            fps = cap.get(cv2.CAP_PROP_FPS)
            frame_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
            duration = frame_count / fps if fps > 0 else 0
            
            # Get codec information
            fourcc = int(cap.get(cv2.CAP_PROP_FOURCC))
            codec = "".join([chr((fourcc >> 8 * i) & 0xFF) for i in range(4)])
            
            cap.release()
            
            # Use MoviePy to check for audio
            has_audio = False
            try:
                with VideoFileClip(file_path) as video:
                    has_audio = video.audio is not None
                    # More accurate duration from MoviePy
                    if video.duration:
                        duration = video.duration
            except Exception as e:
                print(f"Warning: Could not check audio track: {e}")
            
            # Get file format from extension
            file_format = Path(file_path).suffix[1:].lower()
            
            return VideoMetadata(
                duration=duration,
                width=width,
                height=height,
                fps=fps,
                codec=codec.strip(),
                format=file_format,
                has_audio=has_audio
            )
        
        except Exception as e:
            raise ValueError(f"Error extracting video metadata: {str(e)}")
    
    def extract_audio_metadata(self, file_path: str) -> AudioMetadata:
        """
        Extract metadata from audio file using MoviePy
        
        Args:
            file_path: Path to audio file
        
        Returns:
            AudioMetadata object with extracted information
        """
        try:
            with AudioFileClip(file_path) as audio:
                duration = audio.duration
                fps = audio.fps  # Sample rate
                nchannels = audio.nchannels
                
                # Get file format from extension
                file_format = Path(file_path).suffix[1:].lower()
                
                return AudioMetadata(
                    duration=duration,
                    sample_rate=fps,
                    channels=nchannels,
                    format=file_format
                )
        
        except Exception as e:
            raise ValueError(f"Error extracting audio metadata: {str(e)}")
    
    def extract_image_metadata(self, file_path: str) -> ImageMetadata:
        """
        Extract metadata from image file using PIL
        
        Args:
            file_path: Path to image file
        
        Returns:
            ImageMetadata object with extracted information
        """
        try:
            with Image.open(file_path) as img:
                width, height = img.size
                color_mode = img.mode
                file_format = Path(file_path).suffix[1:].lower()
                
                return ImageMetadata(
                    width=width,
                    height=height,
                    format=file_format,
                    color_mode=color_mode
                )
        
        except Exception as e:
            raise ValueError(f"Error extracting image metadata: {str(e)}")
    
    def generate_thumbnail(self, video_path: str, timestamp: float = 0, thumbnail_id: Optional[str] = None) -> str:
        """
        Generate thumbnail from video at specified timestamp
        
        Args:
            video_path: Path to video file
            timestamp: Time in seconds to capture frame (default: 0)
            thumbnail_id: Optional ID for thumbnail, otherwise uses UUID
        
        Returns:
            Path to saved thumbnail image
        """
        try:
            # Open video
            cap = cv2.VideoCapture(video_path)
            
            if not cap.isOpened():
                raise ValueError(f"Could not open video file: {video_path}")
            
            # Set video position to timestamp
            cap.set(cv2.CAP_PROP_POS_MSEC, timestamp * 1000)
            
            # Read frame
            ret, frame = cap.read()
            cap.release()
            
            if not ret or frame is None:
                raise ValueError("Could not extract frame from video")
            
            # Convert BGR to RGB (OpenCV uses BGR by default)
            frame_rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
            
            # Convert to PIL Image
            img = Image.fromarray(frame_rgb)
            
            # Resize thumbnail to reasonable size (maintain aspect ratio)
            max_width = 320
            aspect_ratio = img.height / img.width
            new_height = int(max_width * aspect_ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            
            # Generate thumbnail filename
            if thumbnail_id is None:
                thumbnail_id = str(uuid.uuid4())
            
            thumbnail_filename = f"{thumbnail_id}.jpg"
            thumbnail_path = self.thumbnail_dir / thumbnail_filename
            
            # Save thumbnail
            img.save(thumbnail_path, "JPEG", quality=85)
            
            return str(thumbnail_path)
        
        except Exception as e:
            raise ValueError(f"Error generating thumbnail: {str(e)}")
    
    def generate_waveform(self, audio_path: str, width: int = 1000, height: int = 100) -> str:
        """
        Generate waveform visualization for audio file
        
        Args:
            audio_path: Path to audio file
            width: Width of waveform image in pixels
            height: Height of waveform image in pixels
        
        Returns:
            Base64 encoded image string
        """
        try:
            # Load audio file
            with AudioFileClip(audio_path) as audio:
                # Get audio samples
                audio_array = audio.to_soundarray(fps=22050)
                
                # If stereo, convert to mono by averaging channels
                if len(audio_array.shape) > 1 and audio_array.shape[1] > 1:
                    audio_array = np.mean(audio_array, axis=1)
                
                # Downsample to match desired width
                samples_per_pixel = len(audio_array) // width
                if samples_per_pixel < 1:
                    samples_per_pixel = 1
                
                # Calculate RMS (root mean square) for each pixel width
                waveform_data = []
                for i in range(0, len(audio_array), samples_per_pixel):
                    chunk = audio_array[i:i + samples_per_pixel]
                    if len(chunk) > 0:
                        rms = np.sqrt(np.mean(chunk ** 2))
                        waveform_data.append(rms)
                
                # Normalize to 0-1 range
                if len(waveform_data) > 0:
                    max_val = max(waveform_data) if max(waveform_data) > 0 else 1
                    waveform_data = [val / max_val for val in waveform_data]
                
                # Create image
                img = Image.new('RGB', (width, height), color='white')
                pixels = img.load()
                
                # Draw waveform
                center_y = height // 2
                for x, amplitude in enumerate(waveform_data):
                    if x >= width:
                        break
                    
                    # Calculate bar height
                    bar_height = int(amplitude * center_y)
                    
                    # Draw vertical line from center
                    for y in range(center_y - bar_height, center_y + bar_height):
                        if 0 <= y < height:
                            pixels[x, y] = (59, 130, 246)  # Blue color
                
                # Convert to base64
                buffer = BytesIO()
                img.save(buffer, format="PNG")
                img_base64 = base64.b64encode(buffer.getvalue()).decode()
                
                return f"data:image/png;base64,{img_base64}"
        
        except Exception as e:
            raise ValueError(f"Error generating waveform: {str(e)}")
    
    def delete_media(self, file_path: str, thumbnail_path: Optional[str] = None) -> bool:
        """
        Delete media file and associated thumbnail
        
        Args:
            file_path: Path to media file
            thumbnail_path: Optional path to thumbnail file
        
        Returns:
            True if deletion was successful
        """
        try:
            # Delete main file
            if os.path.exists(file_path):
                os.remove(file_path)
            
            # Delete thumbnail if provided
            if thumbnail_path and os.path.exists(thumbnail_path):
                os.remove(thumbnail_path)
            
            return True
        
        except Exception as e:
            raise ValueError(f"Error deleting media: {str(e)}")
