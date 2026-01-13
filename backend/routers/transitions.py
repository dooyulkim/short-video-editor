"""
Transition Router for video transition effects.
Exposes REST API endpoints for applying fade, dissolve, wipe, and slide transitions.
"""
import logging
from fastapi import APIRouter, HTTPException, Query
from pydantic import BaseModel, Field
from typing import Literal
from pathlib import Path

from services.transition_service import TransitionService

# Configure logger
logger = logging.getLogger("video-editor.transitions")
logger.setLevel(logging.DEBUG)

router = APIRouter()

# Initialize transition service
transition_service = TransitionService(temp_dir="temp_video")


# Request models
class FadeRequest(BaseModel):
    """Request model for fade in/out transition"""
    video_path: str = Field(..., description="Path to input video file")
    duration: float = Field(default=1.0, ge=0.1, le=5.0, description="Fade duration in seconds")
    direction: Literal["in", "out"] = Field(default="in", description="Fade direction")


class CrossDissolveRequest(BaseModel):
    """Request model for cross dissolve transition"""
    video1_path: str = Field(..., description="Path to first video file")
    video2_path: str = Field(..., description="Path to second video file")
    duration: float = Field(default=1.0, ge=0.1, le=5.0, description="Dissolve duration in seconds")


class WipeRequest(BaseModel):
    """Request model for wipe transition"""
    video1_path: str = Field(..., description="Path to first video file")
    video2_path: str = Field(..., description="Path to second video file")
    duration: float = Field(default=1.0, ge=0.1, le=5.0, description="Wipe duration in seconds")
    direction: Literal["left", "right", "up", "down"] = Field(
        default="left", description="Wipe direction"
    )


class SlideRequest(BaseModel):
    """Request model for slide transition"""
    video1_path: str = Field(..., description="Path to first video file")
    video2_path: str = Field(..., description="Path to second video file")
    duration: float = Field(default=1.0, ge=0.1, le=5.0, description="Slide duration in seconds")
    direction: Literal["left", "right", "up", "down"] = Field(
        default="left", description="Slide direction (direction video2 enters from)"
    )


class ZoomRequest(BaseModel):
    """Request model for zoom in/out transition"""
    video_path: str = Field(..., description="Path to input video file")
    duration: float = Field(default=1.0, ge=0.1, le=5.0, description="Zoom duration in seconds")
    direction: Literal["in", "out"] = Field(default="in", description="Zoom direction")


# Response models
class TransitionResponse(BaseModel):
    """Response model for transition operations"""
    success: bool
    output_path: str
    message: str


def _validate_video_path(video_path: str) -> Path:
    """Validate that video path exists and return Path object"""
    path = Path(video_path)
    if not path.exists():
        raise HTTPException(status_code=404, detail=f"Video file not found: {video_path}")
    if not path.is_file():
        raise HTTPException(status_code=400, detail=f"Path is not a file: {video_path}")
    return path


@router.post("/fade", response_model=TransitionResponse)
async def apply_fade(request: FadeRequest):
    """
    Apply fade in or fade out transition to a video.
    
    - **video_path**: Path to the input video file
    - **duration**: Duration of the fade effect (0.1 to 5.0 seconds)
    - **direction**: "in" for fade from black, "out" for fade to black
    """
    logger.info(f"🎬 Fade {request.direction} request: {request.video_path}")
    
    try:
        _validate_video_path(request.video_path)
        
        if request.direction == "in":
            output_path = transition_service.apply_fade_in(
                request.video_path,
                request.duration
            )
        else:
            output_path = transition_service.apply_fade_out(
                request.video_path,
                request.duration
            )
        
        logger.info(f"✅ Fade {request.direction} complete: {output_path}")
        return TransitionResponse(
            success=True,
            output_path=output_path,
            message=f"Fade {request.direction} applied successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Fade error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error applying fade: {str(e)}")


@router.post("/dissolve", response_model=TransitionResponse)
async def apply_cross_dissolve(request: CrossDissolveRequest):
    """
    Apply cross dissolve transition between two videos.
    
    Creates a smooth blend where video1 fades out while video2 fades in.
    
    - **video1_path**: Path to the first video file
    - **video2_path**: Path to the second video file
    - **duration**: Duration of the dissolve overlap (0.1 to 5.0 seconds)
    """
    logger.info(f"🎬 Cross dissolve request: {request.video1_path} -> {request.video2_path}")
    
    try:
        _validate_video_path(request.video1_path)
        _validate_video_path(request.video2_path)
        
        output_path = transition_service.apply_cross_dissolve(
            request.video1_path,
            request.video2_path,
            request.duration
        )
        
        logger.info(f"✅ Cross dissolve complete: {output_path}")
        return TransitionResponse(
            success=True,
            output_path=output_path,
            message="Cross dissolve applied successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Cross dissolve error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error applying cross dissolve: {str(e)}")


@router.post("/wipe", response_model=TransitionResponse)
async def apply_wipe(request: WipeRequest):
    """
    Apply wipe transition between two videos.
    
    Video2 reveals progressively over video1 in the specified direction.
    
    - **video1_path**: Path to the first video file
    - **video2_path**: Path to the second video file
    - **duration**: Duration of the wipe (0.1 to 5.0 seconds)
    - **direction**: Wipe direction - left, right, up, or down
    """
    logger.info(f"🎬 Wipe {request.direction} request: {request.video1_path} -> {request.video2_path}")
    
    try:
        _validate_video_path(request.video1_path)
        _validate_video_path(request.video2_path)
        
        output_path = transition_service.apply_wipe(
            request.video1_path,
            request.video2_path,
            request.duration,
            request.direction
        )
        
        logger.info(f"✅ Wipe {request.direction} complete: {output_path}")
        return TransitionResponse(
            success=True,
            output_path=output_path,
            message=f"Wipe {request.direction} applied successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Wipe error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error applying wipe: {str(e)}")


@router.post("/slide", response_model=TransitionResponse)
async def apply_slide(request: SlideRequest):
    """
    Apply slide/push transition between two videos.
    
    Both videos move together - video1 slides out while video2 slides in,
    creating a "push" effect. Unlike wipe which reveals video2 over video1,
    slide shows both videos moving simultaneously.
    
    - **video1_path**: Path to the first video file
    - **video2_path**: Path to the second video file
    - **duration**: Duration of the slide (0.1 to 5.0 seconds)
    - **direction**: Direction of movement:
        - left: video1 exits left, video2 enters from right
        - right: video1 exits right, video2 enters from left
        - up: video1 exits top, video2 enters from bottom
        - down: video1 exits bottom, video2 enters from top
    """
    logger.info(f"🎬 Slide {request.direction} request: {request.video1_path} -> {request.video2_path}")
    
    try:
        _validate_video_path(request.video1_path)
        _validate_video_path(request.video2_path)
        
        output_path = transition_service.apply_slide(
            request.video1_path,
            request.video2_path,
            request.duration,
            request.direction
        )
        
        logger.info(f"✅ Slide {request.direction} complete: {output_path}")
        return TransitionResponse(
            success=True,
            output_path=output_path,
            message=f"Slide {request.direction} applied successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Slide error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error applying slide: {str(e)}")


@router.post("/zoom", response_model=TransitionResponse)
async def apply_zoom(request: ZoomRequest):
    """
    Apply zoom in or zoom out transition to a video.
    
    - **video_path**: Path to the input video file
    - **duration**: Duration of the zoom effect (0.1 to 5.0 seconds)
    - **direction**: "in" for zoom in (starts zoomed out), "out" for zoom out (ends zoomed out)
    """
    logger.info(f"🎬 Zoom {request.direction} request: {request.video_path}")
    
    try:
        _validate_video_path(request.video_path)
        
        if request.direction == "in":
            output_path = transition_service.apply_zoom_in(
                request.video_path,
                request.duration
            )
        else:
            output_path = transition_service.apply_zoom_out(
                request.video_path,
                request.duration
            )
        
        logger.info(f"✅ Zoom {request.direction} complete: {output_path}")
        return TransitionResponse(
            success=True,
            output_path=output_path,
            message=f"Zoom {request.direction} applied successfully"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"❌ Zoom error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error applying zoom: {str(e)}")


@router.get("/types")
async def get_transition_types():
    """
    Get available transition types and their properties.
    
    Returns a list of all supported transitions with their configurable options.
    """
    return {
        "transitions": [
            {
                "type": "fade",
                "name": "Fade",
                "description": "Smooth fade in/out from/to black",
                "icon": "circle-dot",
                "color": "#3B82F6",
                "properties": {
                    "direction": {
                        "type": "select",
                        "options": ["in", "out"],
                        "default": "in"
                    },
                    "duration": {
                        "type": "slider",
                        "min": 0.1,
                        "max": 5.0,
                        "default": 1.0,
                        "step": 0.1
                    }
                }
            },
            {
                "type": "dissolve",
                "name": "Cross Dissolve",
                "description": "Crossfade between two clips",
                "icon": "blend",
                "color": "#A855F7",
                "properties": {
                    "duration": {
                        "type": "slider",
                        "min": 0.1,
                        "max": 5.0,
                        "default": 1.0,
                        "step": 0.1
                    }
                }
            },
            {
                "type": "wipe",
                "name": "Wipe",
                "description": "Directional wipe transition",
                "icon": "move-horizontal",
                "color": "#22C55E",
                "properties": {
                    "direction": {
                        "type": "select",
                        "options": ["left", "right", "up", "down"],
                        "default": "left"
                    },
                    "duration": {
                        "type": "slider",
                        "min": 0.1,
                        "max": 5.0,
                        "default": 1.0,
                        "step": 0.1
                    }
                }
            },
            {
                "type": "slide",
                "name": "Slide",
                "description": "Push transition where video2 slides in and pushes video1 off screen",
                "icon": "arrow-right-to-line",
                "color": "#F97316",
                "properties": {
                    "direction": {
                        "type": "select",
                        "options": ["left", "right", "up", "down"],
                        "default": "left"
                    },
                    "duration": {
                        "type": "slider",
                        "min": 0.1,
                        "max": 5.0,
                        "default": 1.0,
                        "step": 0.1
                    }
                }
            },
            {
                "type": "zoom",
                "name": "Zoom",
                "description": "Zoom in or zoom out effect",
                "icon": "maximize",
                "color": "#EAB308",
                "properties": {
                    "direction": {
                        "type": "select",
                        "options": ["in", "out"],
                        "default": "in"
                    },
                    "duration": {
                        "type": "slider",
                        "min": 0.1,
                        "max": 5.0,
                        "default": 1.0,
                        "step": 0.1
                    }
                }
            }
        ]
    }


@router.delete("/cleanup")
async def cleanup_temp_files(max_age_hours: int = Query(default=24, ge=1, le=168)):
    """
    Clean up old temporary transition files.
    
    - **max_age_hours**: Delete files older than this many hours (1-168)
    """
    logger.info(f"🧹 Cleanup request: files older than {max_age_hours} hours")
    
    try:
        transition_service.cleanup_temp_files(max_age_hours)
        return {
            "success": True,
            "message": f"Cleaned up files older than {max_age_hours} hours"
        }
    except Exception as e:
        logger.error(f"❌ Cleanup error: {str(e)}")
        raise HTTPException(status_code=500, detail=f"Error during cleanup: {str(e)}")
