import os
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from typing import Dict, Any
from pathlib import Path

from models.media import MediaResource, VideoMetadata, AudioMetadata, ImageMetadata
from services.media_service import MediaService

router = APIRouter()

# Initialize media service
media_service = MediaService(upload_dir="uploads", thumbnail_dir="thumbnails")

# In-memory storage for media resources (replace with database in production)
media_store: Dict[str, MediaResource] = {}


def determine_media_type(filename: str) -> str:
    """Determine media type from file extension"""
    ext = Path(filename).suffix.lower()
    
    video_extensions = {'.mp4', '.avi', '.mov', '.mkv', '.wmv', '.flv', '.webm'}
    audio_extensions = {'.mp3', '.wav', '.aac', '.ogg', '.flac', '.m4a'}
    image_extensions = {'.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'}
    
    if ext in video_extensions:
        return "video"
    elif ext in audio_extensions:
        return "audio"
    elif ext in image_extensions:
        return "image"
    else:
        raise ValueError(f"Unsupported file type: {ext}")


@router.post("/upload")
async def upload_media(file: UploadFile = File(...)) -> MediaResource:
    """
    Upload media file (video, audio, or image)
    
    - Saves file to disk with unique ID
    - Extracts metadata (duration, dimensions, format, fps)
    - Generates thumbnail for videos
    - Returns media resource object with metadata
    """
    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        
        # Determine media type
        try:
            media_type = determine_media_type(file.filename)
        except ValueError as e:
            raise HTTPException(status_code=400, detail=str(e))
        
        # Save file with unique ID
        file_id, file_path = media_service.save_uploaded_file(
            file_content=file_content,
            filename=file.filename,
            file_type=media_type
        )
        
        # Initialize media resource
        media_resource = MediaResource(
            id=file_id,
            filename=file.filename,
            file_path=file_path,
            file_size=file_size,
            media_type=media_type
        )
        
        # Extract metadata based on media type
        try:
            if media_type == "video":
                # Extract video metadata
                video_metadata = media_service.extract_video_metadata(file_path)
                media_resource.video_metadata = video_metadata
                
                # Generate thumbnail
                thumbnail_path = media_service.generate_thumbnail(
                    video_path=file_path,
                    timestamp=0,
                    thumbnail_id=file_id
                )
                media_resource.thumbnail_path = thumbnail_path
            
            elif media_type == "audio":
                # Extract audio metadata
                audio_metadata = media_service.extract_audio_metadata(file_path)
                media_resource.audio_metadata = audio_metadata
                
                # Generate waveform
                # Note: Waveform generation can be slow, consider making it async/background task
                # For now, we'll skip it during upload and generate on-demand
            
            elif media_type == "image":
                # Extract image metadata
                image_metadata = media_service.extract_image_metadata(file_path)
                media_resource.image_metadata = image_metadata
                
                # For images, the file itself can serve as thumbnail
                media_resource.thumbnail_path = file_path
        
        except Exception as e:
            # Clean up uploaded file if metadata extraction fails
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=500,
                detail=f"Error processing media file: {str(e)}"
            )
        
        # Store in memory (replace with database in production)
        media_store[file_id] = media_resource
        
        return media_resource
    
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading file: {str(e)}"
        )


@router.get("/{media_id}/thumbnail")
async def get_thumbnail(media_id: str):
    """
    Get thumbnail image for media resource
    
    Returns thumbnail image file
    """
    # Check if media exists
    if media_id not in media_store:
        raise HTTPException(status_code=404, detail="Media not found")
    
    media = media_store[media_id]
    
    # Check if thumbnail exists
    if not media.thumbnail_path or not os.path.exists(media.thumbnail_path):
        raise HTTPException(status_code=404, detail="Thumbnail not found")
    
    # Return thumbnail file
    return FileResponse(
        media.thumbnail_path,
        media_type="image/jpeg",
        filename=f"{media_id}_thumbnail.jpg"
    )


@router.get("/{media_id}/metadata")
async def get_metadata(media_id: str) -> Dict[str, Any]:
    """
    Get full metadata for media resource
    
    Returns complete media resource object with all metadata
    """
    # Check if media exists
    if media_id not in media_store:
        raise HTTPException(status_code=404, detail="Media not found")
    
    media = media_store[media_id]
    
    return media.model_dump()


@router.get("/{media_id}/waveform")
async def get_waveform(media_id: str, width: int = 1000, height: int = 100):
    """
    Get waveform visualization for audio file
    
    Returns base64 encoded waveform image
    """
    # Check if media exists
    if media_id not in media_store:
        raise HTTPException(status_code=404, detail="Media not found")
    
    media = media_store[media_id]
    
    # Check if media is audio or video with audio
    if media.media_type not in ["audio", "video"]:
        raise HTTPException(
            status_code=400,
            detail="Waveform can only be generated for audio or video files"
        )
    
    try:
        # Generate waveform
        waveform_base64 = media_service.generate_waveform(
            audio_path=media.file_path,
            width=width,
            height=height
        )
        
        return JSONResponse(content={
            "waveform": waveform_base64,
            "width": width,
            "height": height
        })
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error generating waveform: {str(e)}"
        )


@router.delete("/{media_id}")
async def delete_media(media_id: str):
    """
    Delete media file and associated resources
    
    Removes file from disk and cleans up thumbnails
    """
    # Check if media exists
    if media_id not in media_store:
        raise HTTPException(status_code=404, detail="Media not found")
    
    media = media_store[media_id]
    
    try:
        # Delete files
        success = media_service.delete_media(
            file_path=media.file_path,
            thumbnail_path=media.thumbnail_path
        )
        
        if success:
            # Remove from store
            del media_store[media_id]
            
            return JSONResponse(content={
                "message": "Media deleted successfully",
                "media_id": media_id
            })
        else:
            raise HTTPException(
                status_code=500,
                detail="Failed to delete media files"
            )
    
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting media: {str(e)}"
        )


@router.get("/")
async def list_media():
    """
    List all uploaded media resources
    
    Returns list of all media in store
    """
    return {
        "count": len(media_store),
        "media": list(media_store.values())
    }
