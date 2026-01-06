"""
Example usage of AudioService in API endpoints
"""
from fastapi import APIRouter, HTTPException, Path as PathParam
from services.audio_service import AudioService
from typing import List
import os

router = APIRouter(prefix="/audio", tags=["audio"])
audio_service = AudioService()


@router.get("/waveform/{media_id}", response_model=dict)
async def get_waveform(
    media_id: str = PathParam(..., description="Media ID"),
    width: int = 1000
):
    """
    Get waveform data for an audio or video file.
    
    Args:
        media_id: ID of the media file
        width: Number of data points to return (default: 1000)
        
    Returns:
        JSON with waveform data array and metadata
    """
    # Construct file path (adjust based on your upload structure)
    audio_path = f"uploads/{media_id}"
    
    # Check if file exists
    if not os.path.exists(audio_path):
        raise HTTPException(status_code=404, detail="Media file not found")
    
    try:
        # Generate waveform data
        waveform_data = audio_service.generate_waveform_data(audio_path, width=width)
        
        # Get audio duration
        duration = audio_service.get_audio_duration(audio_path)
        
        return {
            "media_id": media_id,
            "waveform": waveform_data,
            "width": len(waveform_data),
            "duration": duration,
            "min_amplitude": min(waveform_data),
            "max_amplitude": max(waveform_data)
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to generate waveform: {str(e)}")


@router.post("/extract-audio/{video_id}", response_model=dict)
async def extract_audio(video_id: str = PathParam(..., description="Video ID")):
    """
    Extract audio track from a video file.
    
    Args:
        video_id: ID of the video file
        
    Returns:
        JSON with extracted audio file path and metadata
    """
    # Construct video file path
    video_path = f"uploads/{video_id}"
    
    # Check if file exists
    if not os.path.exists(video_path):
        raise HTTPException(status_code=404, detail="Video file not found")
    
    try:
        # Extract audio from video
        audio_path = audio_service.extract_audio_from_video(video_path)
        
        # Get audio duration
        duration = audio_service.get_audio_duration(audio_path)
        
        # Get just the filename
        audio_filename = os.path.basename(audio_path)
        
        return {
            "video_id": video_id,
            "audio_path": audio_path,
            "audio_filename": audio_filename,
            "duration": duration,
            "message": "Audio extracted successfully"
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
