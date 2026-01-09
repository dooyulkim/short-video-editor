import os
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException
from fastapi.responses import FileResponse, JSONResponse
from typing import Dict, Any, Literal
from pathlib import Path

from models.media import MediaResource
from services.media_service import MediaService

# Configure logger to output to stdout
logger = logging.getLogger("video-editor.media")
logger.setLevel(logging.DEBUG)

router = APIRouter()

# Initialize media service
media_service = MediaService(upload_dir="uploads", thumbnail_dir="thumbnails")

# In-memory storage for media resources (replace with database in production)
media_store: Dict[str, MediaResource] = {}


def determine_media_type(filename: str) -> Literal["video", "audio", "image"]:
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
    logger.info(f"📤 Upload request: {file.filename}")
    try:
        # Read file content
        file_content = await file.read()
        file_size = len(file_content)
        logger.debug(f"   File size: {file_size} bytes")

        # Check if filename exists
        if not file.filename:
            logger.error("No filename provided")
            raise HTTPException(status_code=400, detail="No filename provided")

        # Determine media type
        try:
            media_type = determine_media_type(file.filename)
            logger.debug(f"   Media type: {media_type}")
        except ValueError as e:
            logger.error(f"   Unsupported file type: {file.filename}")
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
            media_type=media_type,
            thumbnail_path=None,
            waveform_path=None,
            parent_id=None,
            video_metadata=None,
            audio_metadata=None,
            image_metadata=None
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
            logger.error(f"   Error processing media file: {str(e)}")
            if os.path.exists(file_path):
                os.remove(file_path)
            raise HTTPException(
                status_code=500,
                detail=f"Error processing media file: {str(e)}"
            )

        # Store in memory (replace with database in production)
        media_store[file_id] = media_resource

        logger.info(f"✅ Upload complete: {file_id}")
        return media_resource

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error uploading file: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading file: {str(e)}"
        )


@router.get("/{media_id}/file")
async def get_media_file(media_id: str):
    """
    Get media file for playback/download

    Returns the actual media file
    """
    logger.debug(f"📁 GET media file: {media_id}")
    
    # Check if media exists
    if media_id not in media_store:
        logger.warning(f"   Media not found: {media_id}")
        raise HTTPException(status_code=404, detail="Media not found")

    media = media_store[media_id]

    # Check if file exists
    if not os.path.exists(media.file_path):
        logger.error(f"   Media file not found on disk: {media.file_path}")
        raise HTTPException(status_code=404, detail="Media file not found")

    # Determine media type based on file extension
    ext = Path(media.file_path).suffix.lower()

    # Map file extensions to MIME types
    mime_type_map = {
        # Video formats
        '.mp4': 'video/mp4',
        '.webm': 'video/webm',
        '.ogv': 'video/ogg',
        '.mov': 'video/quicktime',
        '.avi': 'video/x-msvideo',
        '.mkv': 'video/x-matroska',
        '.flv': 'video/x-flv',
        '.wmv': 'video/x-ms-wmv',
        # Audio formats
        '.mp3': 'audio/mpeg',
        '.wav': 'audio/wav',
        '.ogg': 'audio/ogg',
        '.m4a': 'audio/mp4',
        '.aac': 'audio/aac',
        '.flac': 'audio/flac',
        # Image formats
        '.jpg': 'image/jpeg',
        '.jpeg': 'image/jpeg',
        '.png': 'image/png',
        '.gif': 'image/gif',
        '.webp': 'image/webp',
        '.bmp': 'image/bmp',
        '.svg': 'image/svg+xml',
    }

    media_type = mime_type_map.get(ext, "application/octet-stream")

    # Return media file
    return FileResponse(
        media.file_path,
        media_type=media_type,
        filename=media.filename
    )


@router.get("/{media_id}/thumbnail")
async def get_thumbnail(media_id: str):
    """
    Get thumbnail image for media resource

    Returns thumbnail image file
    """
    logger.debug(f"🖼️  GET thumbnail: {media_id}")
    
    # Check if media exists
    if media_id not in media_store:
        logger.warning(f"   Media not found: {media_id}")
        raise HTTPException(status_code=404, detail="Media not found")

    media = media_store[media_id]

    # Check if thumbnail exists
    if not media.thumbnail_path or not os.path.exists(media.thumbnail_path):
        logger.warning(f"   Thumbnail not found: {media.thumbnail_path}")
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
    logger.debug(f"📋 GET metadata: {media_id}")
    
    # Check if media exists
    if media_id not in media_store:
        logger.warning(f"   Media not found: {media_id}")
        raise HTTPException(status_code=404, detail="Media not found")

    media = media_store[media_id]

    return media.model_dump()


@router.get("/{media_id}/waveform")
async def get_waveform(media_id: str, width: int = 1000, height: int = 100):
    """
    Get waveform visualization for audio file

    Returns base64 encoded waveform image
    """
    logger.debug(f"🌊 GET waveform: {media_id} ({width}x{height})")
    
    # Check if media exists
    if media_id not in media_store:
        logger.warning(f"   Media not found: {media_id}")
        raise HTTPException(status_code=404, detail="Media not found")

    media = media_store[media_id]

    # Check if media is audio or video with audio
    if media.media_type not in ["audio", "video"]:
        logger.warning(f"   Invalid media type for waveform: {media.media_type}")
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
        
        logger.debug("   Waveform generated successfully")

        return JSONResponse(content={
            "waveform": waveform_base64,
            "width": width,
            "height": height
        })

    except Exception as e:
        logger.error(f"   Error generating waveform: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error generating waveform: {str(e)}"
        )


@router.delete("/{media_id}")
async def delete_media(media_id: str):
    """
    Delete media file and associated resources

    Removes file from disk, cleans up thumbnails, and deletes all child resources
    (e.g., split/trimmed videos derived from this resource)
    """
    logger.info(f"🗑️  DELETE media: {media_id}")
    
    # Check if media exists
    if media_id not in media_store:
        logger.warning(f"   Media not found: {media_id}")
        raise HTTPException(status_code=404, detail="Media not found")

    media = media_store[media_id]
    deleted_ids = [media_id]

    try:
        # First, find and delete all child resources (split/trimmed videos)
        child_ids = [
            child_id for child_id, child_media in media_store.items()
            if child_media.parent_id == media_id
        ]
        
        for child_id in child_ids:
            child_media = media_store[child_id]
            logger.info(f"   Deleting child resource: {child_id}")
            try:
                media_service.delete_media(
                    file_path=child_media.file_path,
                    thumbnail_path=child_media.thumbnail_path
                )
                del media_store[child_id]
                deleted_ids.append(child_id)
            except Exception as e:
                logger.warning(f"   Failed to delete child resource {child_id}: {str(e)}")

        # Delete main files
        success = media_service.delete_media(
            file_path=media.file_path,
            thumbnail_path=media.thumbnail_path
        )

        if success:
            # Remove from store
            del media_store[media_id]
            logger.info(f"   ✅ Media deleted successfully: {media_id} (and {len(child_ids)} child resources)")

            return JSONResponse(content={
                "message": "Media deleted successfully",
                "media_id": media_id,
                "deleted_ids": deleted_ids
            })
        else:
            logger.error(f"   Failed to delete media files: {media_id}")
            raise HTTPException(
                status_code=500,
                detail="Failed to delete media files"
            )

    except Exception as e:
        logger.error(f"   Error deleting media: {str(e)}", exc_info=True)
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
    logger.debug(f"📃 LIST media: {len(media_store)} items")
    return {
        "count": len(media_store),
        "media": list(media_store.values())
    }
