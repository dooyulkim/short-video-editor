import logging
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field
from typing import List, Optional
import os

from services.timeline_service import TimelineService
from services.media_service import MediaService
from models.media import MediaResource
from routers.media import media_store

# Configure logger
logger = logging.getLogger("video-editor.timeline")
logger.setLevel(logging.DEBUG)

router = APIRouter()

# Initialize services
timeline_service = TimelineService()
media_service = MediaService(upload_dir="uploads", thumbnail_dir="thumbnails")


# Request/Response models
class CutRequest(BaseModel):
    video_id: str = Field(..., description="ID of the video to cut")
    video_path: str = Field(..., description="Path to the video file")
    cut_time: float = Field(
        ...,
        description="Time in seconds where to cut the video",
        gt=0
    )


class CutResponse(BaseModel):
    segment1_id: str
    segment1_path: str
    segment2_id: str
    segment2_path: str
    message: str


class TrimRequest(BaseModel):
    video_id: str = Field(..., description="ID of the video to trim")
    video_path: str = Field(..., description="Path to the video file")
    start_time: float = Field(
        ...,
        description="Start time in seconds",
        ge=0
    )
    end_time: float = Field(
        ...,
        description="End time in seconds",
        gt=0
    )


class TrimResponse(BaseModel):
    trimmed_id: str
    trimmed_path: str
    duration: float
    message: str


class ClipData(BaseModel):
    video_id: str
    video_path: str
    start_time: Optional[float] = 0.0


class MergeRequest(BaseModel):
    clips: List[ClipData] = Field(
        ...,
        description="List of clips to merge"
    )
    method: str = Field(
        default="concatenate",
        description="Merge method: 'concatenate' or 'compose'"
    )


class MergeResponse(BaseModel):
    merged_id: str
    merged_path: str
    message: str


class TaskStatusResponse(BaseModel):
    task_id: str
    status: str
    progress: int
    result: Optional[dict] = None
    error: Optional[str] = None


# Endpoints
@router.post("/cut", response_model=CutResponse)
async def cut_video(request: CutRequest):
    """
    Cut a video at the specified timestamp into two segments.

    This endpoint splits a video file at a given time point,
    creating two new video files. The operation preserves video
    quality and includes audio if present.

    Args:
        request: CutRequest with video_id, video_path, and cut_time

    Returns:
        CutResponse with IDs and paths of both video segments

    Raises:
        HTTPException: If video file not found or cutting fails
    """
    try:
        # Verify video file exists
        if not os.path.exists(request.video_path):
            raise HTTPException(
                status_code=404,
                detail=f"Video file not found: {request.video_path}"
            )

        # Cut the video
        result = timeline_service.cut_video(
            video_path=request.video_path,
            cut_time=request.cut_time
        )
        segment1_id, segment1_path, segment2_id, segment2_path = result

        # Register segments in media_store with parent_id reference
        for seg_id, seg_path in [(segment1_id, segment1_path), (segment2_id, segment2_path)]:
            try:
                file_size = os.path.getsize(seg_path) if os.path.exists(seg_path) else 0
                video_metadata = media_service.extract_video_metadata(seg_path)
                
                # Generate thumbnail for segment
                thumbnail_path = None
                try:
                    thumbnail_path = media_service.generate_thumbnail(
                        video_path=seg_path,
                        timestamp=0,
                        thumbnail_id=seg_id
                    )
                except Exception as e:
                    logger.warning(f"Failed to generate thumbnail for segment {seg_id}: {e}")
                
                segment_resource = MediaResource(
                    id=seg_id,
                    filename=os.path.basename(seg_path),
                    file_path=seg_path,
                    file_size=file_size,
                    media_type="video",
                    thumbnail_path=thumbnail_path,
                    waveform_path=None,
                    parent_id=request.video_id,
                    video_metadata=video_metadata,
                    audio_metadata=None,
                    image_metadata=None
                )
                media_store[seg_id] = segment_resource
                logger.info(f"   Registered segment {seg_id} with parent {request.video_id}")
            except Exception as e:
                logger.warning(f"Failed to register segment {seg_id}: {e}")

        return CutResponse(
            segment1_id=segment1_id,
            segment1_path=segment1_path,
            segment2_id=segment2_id,
            segment2_path=segment2_path,
            message=f"Video cut successfully at {request.cut_time}s"
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to cut video: {str(e)}"
        )


@router.post("/trim", response_model=TrimResponse)
async def trim_video(request: TrimRequest):
    """
    Trim a video to the specified time range.

    This endpoint extracts a portion of a video between start_time
    and end_time, creating a new video file with only the selected
    segment.

    Args:
        request: TrimRequest with video_id, video_path, start_time,
                 and end_time

    Returns:
        TrimResponse with trimmed video ID and path

    Raises:
        HTTPException: If video file not found or trimming fails
    """
    try:
        # Verify video file exists
        if not os.path.exists(request.video_path):
            raise HTTPException(
                status_code=404,
                detail=f"Video file not found: {request.video_path}"
            )

        # Validate time range
        if request.start_time >= request.end_time:
            raise HTTPException(
                status_code=400,
                detail="start_time must be less than end_time"
            )

        # Trim the video
        trimmed_id, trimmed_path = timeline_service.trim_video(
            video_path=request.video_path,
            start_time=request.start_time,
            end_time=request.end_time
        )

        duration = request.end_time - request.start_time

        # Register trimmed video in media_store with parent_id reference
        try:
            file_size = os.path.getsize(trimmed_path) if os.path.exists(trimmed_path) else 0
            video_metadata = media_service.extract_video_metadata(trimmed_path)
            
            # Generate thumbnail for trimmed video
            thumbnail_path = None
            try:
                thumbnail_path = media_service.generate_thumbnail(
                    video_path=trimmed_path,
                    timestamp=0,
                    thumbnail_id=trimmed_id
                )
            except Exception as e:
                logger.warning(f"Failed to generate thumbnail for trimmed video {trimmed_id}: {e}")
            
            trimmed_resource = MediaResource(
                id=trimmed_id,
                filename=os.path.basename(trimmed_path),
                file_path=trimmed_path,
                file_size=file_size,
                media_type="video",
                thumbnail_path=thumbnail_path,
                waveform_path=None,
                parent_id=request.video_id,
                video_metadata=video_metadata,
                audio_metadata=None,
                image_metadata=None
            )
            media_store[trimmed_id] = trimmed_resource
            logger.info(f"   Registered trimmed video {trimmed_id} with parent {request.video_id}")
        except Exception as e:
            logger.warning(f"Failed to register trimmed video {trimmed_id}: {e}")

        return TrimResponse(
            trimmed_id=trimmed_id,
            trimmed_path=trimmed_path,
            duration=duration,
            message=(
                f"Video trimmed successfully "
                f"({request.start_time}s to {request.end_time}s)"
            )
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to trim video: {str(e)}"
        )


@router.post("/merge", response_model=MergeResponse)
async def merge_videos(request: MergeRequest):
    """
    Merge multiple video clips into a single video.

    This endpoint combines multiple video clips either sequentially
    (concatenate) or as a composite overlay (compose). Videos with
    different resolutions are automatically resized to match the
    first clip.

    Args:
        request: MergeRequest with list of clips and merge method

    Returns:
        MergeResponse with merged video ID and path

    Raises:
        HTTPException: If clips not found or merging fails
    """
    try:
        # Validate clips
        if not request.clips:
            raise HTTPException(
                status_code=400,
                detail="No clips provided"
            )

        # Verify all video files exist
        for clip in request.clips:
            if not os.path.exists(clip.video_path):
                raise HTTPException(
                    status_code=404,
                    detail=f"Video file not found: {clip.video_path}"
                )

        # Validate method
        if request.method not in ["concatenate", "compose"]:
            raise HTTPException(
                status_code=400,
                detail="Method must be 'concatenate' or 'compose'"
            )

        # Convert to dict format for service
        clip_data = [
            {
                'video_id': clip.video_id,
                'video_path': clip.video_path,
                'start_time': clip.start_time
            }
            for clip in request.clips
        ]

        # Merge the videos
        merged_id, merged_path = timeline_service.merge_videos(
            clip_data=clip_data,
            method=request.method
        )

        return MergeResponse(
            merged_id=merged_id,
            merged_path=merged_path,
            message=(
                f"Videos merged successfully using {request.method} method"
            )
        )

    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to merge videos: {str(e)}"
        )


@router.post("/cut-async")
async def cut_video_async(request: CutRequest):
    """
    Cut a video asynchronously in the background.

    Returns a task_id to check the operation status.
    """
    try:
        import uuid
        task_id = str(uuid.uuid4())

        # Verify video file exists
        if not os.path.exists(request.video_path):
            raise HTTPException(
                status_code=404,
                detail=f"Video file not found: {request.video_path}"
            )

        # Start background processing
        timeline_service.process_in_background(
            task_id,
            timeline_service.cut_video,
            request.video_path,
            request.cut_time
        )

        return {
            "task_id": task_id,
            "message": "Video cutting started in background",
            "status_endpoint": f"/timeline/status/{task_id}"
        }

    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/status/{task_id}", response_model=TaskStatusResponse)
async def get_task_status(task_id: str):
    """
    Get the status of a background video processing task.

    Args:
        task_id: The task identifier from an async endpoint

    Returns:
        TaskStatusResponse with status, progress, and results
    """
    status = timeline_service.get_task_status(task_id)

    if not status:
        raise HTTPException(status_code=404, detail="Task not found")

    return TaskStatusResponse(
        task_id=task_id,
        status=status['status'],
        progress=status['progress'],
        result=status.get('result'),
        error=status.get('error')
    )


@router.delete("/cleanup")
async def cleanup_temp_files(max_age_hours: int = 24):
    """
    Clean up temporary video files older than specified hours.

    Args:
        max_age_hours: Maximum age of files (default: 24 hours)

    Returns:
        Message confirming cleanup
    """
    try:
        timeline_service.cleanup_temp_files(max_age_hours)
        return {
            "message": (
                f"Temporary files older than {max_age_hours} hours "
                f"cleaned up successfully"
            )
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Cleanup failed: {str(e)}"
        )
