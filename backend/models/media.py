from pydantic import BaseModel, Field
from typing import Optional, Literal
from datetime import datetime


class VideoMetadata(BaseModel):
    """Metadata for video files"""
    duration: float = Field(..., description="Duration in seconds")
    width: int = Field(..., description="Video width in pixels")
    height: int = Field(..., description="Video height in pixels")
    fps: float = Field(..., description="Frames per second")
    codec: Optional[str] = Field(None, description="Video codec")
    bitrate: Optional[int] = Field(None, description="Bitrate in kbps")
    format: str = Field(..., description="Video format (e.g., mp4, avi)")
    has_audio: bool = Field(default=True, description="Whether video has audio track")


class AudioMetadata(BaseModel):
    """Metadata for audio files"""
    duration: float = Field(..., description="Duration in seconds")
    sample_rate: int = Field(..., description="Sample rate in Hz")
    channels: int = Field(..., description="Number of audio channels")
    bitrate: Optional[int] = Field(None, description="Bitrate in kbps")
    format: str = Field(..., description="Audio format (e.g., mp3, wav)")
    codec: Optional[str] = Field(None, description="Audio codec")


class ImageMetadata(BaseModel):
    """Metadata for image files"""
    width: int = Field(..., description="Image width in pixels")
    height: int = Field(..., description="Image height in pixels")
    format: str = Field(..., description="Image format (e.g., jpg, png)")
    color_mode: Optional[str] = Field(None, description="Color mode (RGB, RGBA, etc.)")


class MediaResource(BaseModel):
    """Represents a media resource (video, audio, or image)"""
    id: str = Field(..., description="Unique identifier for the media resource")
    project_id: str = Field(..., description="Project ID this resource belongs to")
    filename: str = Field(..., description="Original filename")
    file_path: str = Field(..., description="Path to the file on disk")
    file_size: int = Field(..., description="File size in bytes")
    media_type: Literal["video", "audio", "image"] = Field(..., description="Type of media")
    thumbnail_path: Optional[str] = Field(None, description="Path to thumbnail image")
    waveform_path: Optional[str] = Field(None, description="Path to waveform image (for audio)")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Upload timestamp")
    parent_id: Optional[str] = Field(None, description="ID of parent resource (for split/trimmed videos)")
    
    # Type-specific metadata
    video_metadata: Optional[VideoMetadata] = Field(None, description="Video-specific metadata")
    audio_metadata: Optional[AudioMetadata] = Field(None, description="Audio-specific metadata")
    image_metadata: Optional[ImageMetadata] = Field(None, description="Image-specific metadata")

    class Config:
        json_schema_extra = {
            "example": {
                "id": "550e8400-e29b-41d4-a716-446655440000",
                "project_id": "proj-12345678-abcd-1234-efgh-123456789012",
                "filename": "example_video.mp4",
                "file_path": "/uploads/proj-12345678-abcd-1234-efgh-123456789012/550e8400-e29b-41d4-a716-446655440000.mp4",
                "file_size": 10485760,
                "media_type": "video",
                "thumbnail_path": "/uploads/proj-12345678-abcd-1234-efgh-123456789012/thumbnails/550e8400-e29b-41d4-a716-446655440000.jpg",
                "video_metadata": {
                    "duration": 30.5,
                    "width": 1920,
                    "height": 1080,
                    "fps": 30.0,
                    "codec": "h264",
                    "format": "mp4",
                    "has_audio": True
                }
            }
        }


class MediaUploadResponse(BaseModel):
    """Response after successful media upload"""
    success: bool = Field(..., description="Upload success status")
    media: MediaResource = Field(..., description="Uploaded media resource details")
    message: str = Field(..., description="Status message")
