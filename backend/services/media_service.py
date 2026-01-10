import os
import uuid
import cv2
import numpy as np
import logging
from pathlib import Path
from typing import Tuple, Optional
from PIL import Image
import ffmpeg
import base64
from io import BytesIO

from models.media import VideoMetadata, AudioMetadata, ImageMetadata

logger = logging.getLogger(__name__)


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
        
        logger.info(f"📁 Saved uploaded file: {filename} -> {file_id} ({file_type})")
        
        return file_id, str(file_path)
    
    def extract_video_metadata(self, file_path: str) -> VideoMetadata:
        """
        Extract metadata from video file using ffmpeg.probe()
        
        Args:
            file_path: Path to video file
        
        Returns:
            VideoMetadata object with extracted information
        """
        try:
            # Use ffmpeg.probe() to get video metadata
            probe = ffmpeg.probe(file_path)
            
            # Extract format information
            format_info = probe.get('format', {})
            duration = float(format_info.get('duration', 0))
            file_format = Path(file_path).suffix[1:].lower()
            
            # Find video and audio streams
            video_stream = None
            has_audio = False
            
            for stream in probe.get('streams', []):
                if stream.get('codec_type') == 'video' and video_stream is None:
                    video_stream = stream
                elif stream.get('codec_type') == 'audio':
                    has_audio = True
            
            if not video_stream:
                raise ValueError(f"No video stream found in {file_path}")
            
            # Extract video metadata from stream
            width = int(video_stream.get('width', 0))
            height = int(video_stream.get('height', 0))
            codec = video_stream.get('codec_name', 'unknown')
            
            # Calculate FPS from r_frame_rate or avg_frame_rate
            fps_str = video_stream.get('r_frame_rate', video_stream.get('avg_frame_rate', '0/1'))
            if '/' in fps_str:
                num, den = fps_str.split('/')
                fps = float(num) / float(den) if float(den) > 0 else 0
            else:
                fps = float(fps_str)
            
            return VideoMetadata(
                duration=duration,
                width=width,
                height=height,
                fps=fps,
                codec=codec,
                format=file_format,
                has_audio=has_audio
            )
        
        except Exception as e:
            raise ValueError(f"Error extracting video metadata: {str(e)}")
    
    def extract_audio_metadata(self, file_path: str) -> AudioMetadata:
        """
        Extract metadata from audio file using ffmpeg.probe()
        
        Args:
            file_path: Path to audio file
        
        Returns:
            AudioMetadata object with extracted information
        """
        try:
            # Use ffmpeg.probe() to get audio metadata
            probe = ffmpeg.probe(file_path)
            
            # Extract format information
            format_info = probe.get('format', {})
            duration = float(format_info.get('duration', 0))
            file_format = Path(file_path).suffix[1:].lower()
            
            # Find audio stream
            audio_stream = None
            for stream in probe.get('streams', []):
                if stream.get('codec_type') == 'audio':
                    audio_stream = stream
                    break
            
            if not audio_stream:
                raise ValueError(f"No audio stream found in {file_path}")
            
            # Extract audio metadata
            sample_rate = int(audio_stream.get('sample_rate', 0))
            channels = int(audio_stream.get('channels', 0))
            
            return AudioMetadata(
                duration=duration,
                sample_rate=sample_rate,
                channels=channels,
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
            # Use ffmpeg to extract audio samples
            # Get audio info first
            probe = ffmpeg.probe(audio_path)
            audio_stream = None
            for stream in probe.get('streams', []):
                if stream.get('codec_type') == 'audio':
                    audio_stream = stream
                    break
            
            if not audio_stream:
                raise ValueError("No audio stream found")
            
            # Extract raw audio data using ffmpeg
            # Output as 16-bit PCM at 22050 Hz mono
            out, _ = (
                ffmpeg
                .input(audio_path)
                .output('pipe:', format='s16le', acodec='pcm_s16le', ac=1, ar='22050')
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )
            
            # Convert bytes to numpy array
            audio_array = np.frombuffer(out, np.int16).astype(np.float32) / 32768.0
            
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
        import time
        max_retries = 5
        retry_delay = 0.5  # seconds

        def delete_with_retry(path: str) -> bool:
            """Attempt to delete a file with retries for Windows file locking."""
            if not os.path.exists(path):
                return True
            
            for attempt in range(max_retries):
                try:
                    os.remove(path)
                    return True
                except PermissionError as e:
                    if attempt < max_retries - 1:
                        logger.warning(
                            f"File locked, retrying in {retry_delay}s "
                            f"(attempt {attempt + 1}/{max_retries}): {path}"
                        )
                        time.sleep(retry_delay)
                    else:
                        raise e
            return False

        try:
            # Delete main file
            delete_with_retry(file_path)
            
            # Delete thumbnail if provided
            if thumbnail_path:
                delete_with_retry(thumbnail_path)
            
            return True
        
        except Exception as e:
            raise ValueError(f"Error deleting media: {str(e)}")
