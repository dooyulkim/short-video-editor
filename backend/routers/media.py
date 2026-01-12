import os
import logging
from fastapi import APIRouter, UploadFile, File, HTTPException, Query
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

# In-memory storage for media resources organized by project
# Structure: { project_id: { media_id: MediaResource } }
media_store: Dict[str, Dict[str, MediaResource]] = {}


def get_media_from_store(project_id: str, media_id: str) -> MediaResource:
    """Helper function to get media from the store"""
    if project_id not in media_store:
        raise HTTPException(status_code=404, detail=f"Project not found: {project_id}")
    if media_id not in media_store[project_id]:
        raise HTTPException(status_code=404, detail=f"Media not found: {media_id}")
    return media_store[project_id][media_id]


def get_all_media_flat() -> Dict[str, MediaResource]:
    """Get all media as a flat dictionary (for backward compatibility)"""
    flat_store = {}
    for project_id, project_media in media_store.items():
        for media_id, media in project_media.items():
            flat_store[media_id] = media
    return flat_store


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
async def upload_media(
    file: UploadFile = File(...),
    project_id: str = Query(..., description="Project ID to associate the media with")
) -> MediaResource:
    """
    Upload media file (video, audio, or image) to a specific project

    - Saves file to disk with unique ID in project directory
    - Extracts metadata (duration, dimensions, format, fps)
    - Generates thumbnail for videos
    - Returns media resource object with metadata
    """
    logger.info(f"📤 Upload request: {file.filename} for project {project_id}")
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

        # Save file with unique ID in project directory
        file_id, file_path = media_service.save_uploaded_file(
            file_content=file_content,
            filename=file.filename,
            file_type=media_type,
            project_id=project_id
        )

        # Initialize media resource
        media_resource = MediaResource(
            id=file_id,
            project_id=project_id,
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

                # Generate thumbnail in project directory
                thumbnail_path = media_service.generate_thumbnail(
                    video_path=file_path,
                    timestamp=0,
                    thumbnail_id=file_id,
                    project_id=project_id
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

        # Store in memory organized by project
        if project_id not in media_store:
            media_store[project_id] = {}
        media_store[project_id][file_id] = media_resource

        logger.info(f"✅ Upload complete: {file_id} for project {project_id}")
        return media_resource

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Error uploading file: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading file: {str(e)}"
        )


@router.get("/project/{project_id}/{media_id}/file")
async def get_media_file(project_id: str, media_id: str):
    """
    Get media file for playback/download

    Returns the actual media file
    """
    logger.debug(f"📁 GET media file: {media_id} (project: {project_id})")
    
    media = get_media_from_store(project_id, media_id)

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


@router.get("/project/{project_id}/{media_id}/thumbnail")
async def get_thumbnail(project_id: str, media_id: str):
    """
    Get thumbnail image for media resource

    Returns thumbnail image file
    """
    logger.debug(f"🖼️  GET thumbnail: {media_id} (project: {project_id})")
    
    media = get_media_from_store(project_id, media_id)

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


@router.get("/project/{project_id}/{media_id}/metadata")
async def get_metadata(project_id: str, media_id: str) -> Dict[str, Any]:
    """
    Get full metadata for media resource

    Returns complete media resource object with all metadata
    """
    logger.debug(f"📋 GET metadata: {media_id} (project: {project_id})")
    
    media = get_media_from_store(project_id, media_id)

    return media.model_dump()


@router.get("/project/{project_id}/{media_id}/waveform")
async def get_waveform(project_id: str, media_id: str, width: int = 1000, height: int = 100):
    """
    Get waveform visualization for audio file

    Returns base64 encoded waveform image
    """
    logger.debug(f"🌊 GET waveform: {media_id} ({width}x{height}) (project: {project_id})")
    
    media = get_media_from_store(project_id, media_id)
    media = get_media_from_store(project_id, media_id)

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


@router.delete("/project/{project_id}/{media_id}")
async def delete_media(project_id: str, media_id: str):
    """
    Delete media file and associated resources from a project

    Removes file from disk, cleans up thumbnails, and deletes all child resources
    (e.g., split/trimmed videos derived from this resource)
    """
    logger.info(f"🗑️  DELETE media: {media_id} (project: {project_id})")
    
    media = get_media_from_store(project_id, media_id)
    deleted_ids = [media_id]

    try:
        # First, find and delete all child resources (split/trimmed videos)
        child_ids = [
            child_id for child_id, child_media in media_store.get(project_id, {}).items()
            if child_media.parent_id == media_id
        ]
        
        for child_id in child_ids:
            child_media = media_store[project_id][child_id]
            logger.info(f"   Deleting child resource: {child_id}")
            try:
                media_service.delete_media(
                    file_path=child_media.file_path,
                    thumbnail_path=child_media.thumbnail_path
                )
                del media_store[project_id][child_id]
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
            del media_store[project_id][media_id]
            logger.info(f"   ✅ Media deleted successfully: {media_id} (and {len(child_ids)} child resources)")

            return JSONResponse(content={
                "message": "Media deleted successfully",
                "media_id": media_id,
                "project_id": project_id,
                "deleted_ids": deleted_ids
            })
        else:
            logger.error(f"   Failed to delete media files: {media_id}")
            raise HTTPException(
                status_code=500,
                detail="Failed to delete media files"
            )

    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"   Error deleting media: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=500,
            detail=f"Error deleting media: {str(e)}"
        )


@router.get("/project/{project_id}")
async def list_project_media(project_id: str):
    """
    List all uploaded media resources for a specific project

    Returns list of all media in the project
    """
    project_media = media_store.get(project_id, {})
    logger.debug(f"📃 LIST media for project {project_id}: {len(project_media)} items")
    return {
        "project_id": project_id,
        "count": len(project_media),
        "media": list(project_media.values())
    }


@router.get("/")
async def list_all_media():
    """
    List all uploaded media resources across all projects

    Returns list of all media organized by project
    """
    total_count = sum(len(project_media) for project_media in media_store.values())
    logger.debug(f"📃 LIST all media: {total_count} items across {len(media_store)} projects")
    return {
        "total_count": total_count,
        "projects_count": len(media_store),
        "projects": {
            project_id: {
                "count": len(project_media),
                "media": list(project_media.values())
            }
            for project_id, project_media in media_store.items()
        }
    }


@router.delete("/project/{project_id}")
async def delete_project_media(project_id: str):
    """
    Delete all media resources for a specific project

    Removes all files from disk and clears the project from the store
    """
    logger.info(f"🗑️  DELETE all media for project: {project_id}")
    
    if project_id not in media_store:
        raise HTTPException(status_code=404, detail=f"Project not found: {project_id}")
    
    project_media = media_store[project_id]
    deleted_ids = []
    errors = []

    for media_id, media in list(project_media.items()):
        try:
            media_service.delete_media(
                file_path=media.file_path,
                thumbnail_path=media.thumbnail_path
            )
            deleted_ids.append(media_id)
        except Exception as e:
            logger.warning(f"   Failed to delete media {media_id}: {str(e)}")
            errors.append({"media_id": media_id, "error": str(e)})

    # Remove project from store
    del media_store[project_id]
    
    # Also try to remove the project directory
    try:
        project_dir = media_service.get_project_upload_dir(project_id)
        if project_dir.exists():
            import shutil
            shutil.rmtree(project_dir)
    except Exception as e:
        logger.warning(f"   Could not remove project directory: {str(e)}")

    logger.info(f"   ✅ Project media deleted: {len(deleted_ids)} files")

    return JSONResponse(content={
        "message": "Project media deleted",
        "project_id": project_id,
        "deleted_count": len(deleted_ids),
        "deleted_ids": deleted_ids,
        "errors": errors if errors else None
    })
