"""
Export router for video timeline export functionality.
"""
import uuid
import logging
from typing import Dict, Optional
from fastapi import APIRouter, HTTPException, BackgroundTasks
from fastapi.responses import FileResponse, JSONResponse
from pydantic import BaseModel
from datetime import datetime
from pathlib import Path
import threading

from services.export_service import ExportService

# Configure logger
logger = logging.getLogger("video-editor.export")

router = APIRouter(tags=["export"])

# In-memory storage for export tasks
# In production, use Redis or a database
export_tasks: Dict[str, Dict] = {}

# Lock for thread-safe access to export_tasks
tasks_lock = threading.Lock()

# Initialize export service
export_service = ExportService()


class ExportSettings(BaseModel):
    """Export settings from frontend."""
    resolution: str = "1080p"
    format: str = "mp4"
    quality: str = "high"
    filename: str = "export"


class ExportRequest(BaseModel):
    """Request model for starting an export."""
    timeline: Dict  # Timeline data from frontend
    settings: Optional[ExportSettings] = None
    # Legacy support
    timeline_data: Optional[Dict] = None
    resolution: str = "1080p"
    fps: int = 30
    output_filename: Optional[str] = None


class ExportStatusResponse(BaseModel):
    """Response model for export status."""
    task_id: str
    status: str  # pending, processing, completed, failed
    progress: float  # 0-100 percentage
    message: Optional[str] = None
    output_path: Optional[str] = None
    created_at: str
    completed_at: Optional[str] = None


class ExportStartResponse(BaseModel):
    """Response model for export start."""
    task_id: str
    status: str
    message: str


def update_task_progress(task_id: str, progress: float):
    """
    Update task progress.
    
    Args:
        task_id: Task ID
        progress: Progress value (0.0 to 1.0)
    """
    with tasks_lock:
        if task_id in export_tasks:
            export_tasks[task_id]["progress"] = progress
            export_tasks[task_id]["status"] = "processing"


def process_export(
    task_id: str,
    timeline_data: Dict,
    resolution: str,
    fps: int,
    output_filename: str
):
    """
    Background task to process video export.
    
    Args:
        task_id: Unique task ID
        timeline_data: Timeline JSON data
        resolution: Output resolution preset (fallback)
        fps: Output frames per second
        output_filename: Output filename
    """
    logger.info(f"🎬 Starting export task {task_id}")
    
    # Extract resolution from timeline data if available
    timeline_resolution = timeline_data.get("resolution", {})
    width = timeline_resolution.get("width")
    height = timeline_resolution.get("height")
    
    if width and height:
        logger.info(f"   Using timeline resolution: {width}x{height}, FPS: {fps}, Output: {output_filename}")
    else:
        logger.info(f"   Using preset resolution: {resolution}, FPS: {fps}, Output: {output_filename}")
    
    # Log timeline info
    layers = timeline_data.get("layers", [])
    logger.info(f"   Timeline has {len(layers)} layers")
    for i, layer in enumerate(layers):
        clips = layer.get("clips", [])
        logger.info(f"   Layer {i} ({layer.get('type', 'unknown')}): {len(clips)} clips, visible={layer.get('visible', True)}, muted={layer.get('muted', False)}")
    
    try:
        # Update status to processing
        with tasks_lock:
            export_tasks[task_id]["status"] = "processing"
            export_tasks[task_id]["progress"] = 0.0
        
        # Progress callback
        def progress_callback(progress: float):
            update_task_progress(task_id, progress)
            logger.debug(f"   Export {task_id} progress: {progress*100:.1f}%")
        
        # Perform export with explicit dimensions if available
        logger.info("📹 Calling export_service.export_timeline...")
        output_path = export_service.export_timeline(
            timeline_data=timeline_data,
            output_path=output_filename,
            resolution=resolution,
            fps=fps,
            progress_callback=progress_callback,
            width=width,
            height=height
        )
        
        # Update task as completed
        with tasks_lock:
            export_tasks[task_id]["status"] = "completed"
            export_tasks[task_id]["progress"] = 1.0
            export_tasks[task_id]["output_path"] = output_path
            export_tasks[task_id]["completed_at"] = datetime.now().isoformat()
            export_tasks[task_id]["message"] = "Export completed successfully"
        
        logger.info(f"✅ Export task {task_id} completed successfully")
        logger.info(f"   Output saved to: {output_path}")
        
    except Exception as e:
        # Update task as failed
        logger.error(f"❌ Export task {task_id} failed: {str(e)}", exc_info=True)
        with tasks_lock:
            export_tasks[task_id]["status"] = "failed"
            export_tasks[task_id]["message"] = f"Export failed: {str(e)}"
            export_tasks[task_id]["completed_at"] = datetime.now().isoformat()


@router.post("/start", response_model=ExportStartResponse)
async def start_export(
    request: ExportRequest,
    background_tasks: BackgroundTasks
):
    """
    Start a new video export task.
    
    Args:
        request: Export request with timeline data
        background_tasks: FastAPI background tasks
        
    Returns:
        Task ID and status
    """
    logger.info("📥 Received export start request")
    
    try:
        # Generate unique task ID
        task_id = str(uuid.uuid4())
        logger.info(f"   Generated task ID: {task_id}")
        
        # Handle both new frontend format (timeline + settings) and legacy format (timeline_data)
        timeline_data = request.timeline if request.timeline else request.timeline_data
        
        if not timeline_data:
            logger.error("   No timeline data provided in request")
            raise HTTPException(status_code=400, detail="Timeline data is required")
        
        # Extract settings from new format or use defaults
        if request.settings:
            resolution = request.settings.resolution
            output_filename = f"{request.settings.filename}.{request.settings.format}"
            # Map quality to fps
            fps_map = {"high": 30, "medium": 24, "low": 15}
            fps = fps_map.get(request.settings.quality, 30)
            logger.info(f"   Settings: resolution={resolution}, format={request.settings.format}, quality={request.settings.quality}, fps={fps}")
        else:
            resolution = request.resolution
            fps = request.fps
            if request.output_filename:
                output_filename = request.output_filename
            else:
                timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
                output_filename = f"export_{timestamp}.mp4"
            logger.info(f"   Legacy settings: resolution={resolution}, fps={fps}")
        
        logger.info(f"   Output filename: {output_filename}")
        
        # Log detailed timeline information
        layers = timeline_data.get("layers", [])
        logger.info(f"   Timeline has {len(layers)} layers:")
        for i, layer in enumerate(layers):
            layer_type = layer.get("type", "unknown")
            clips = layer.get("clips", [])
            logger.info(f"      Layer {i}: type='{layer_type}', clips={len(clips)}")
            for j, clip in enumerate(clips):
                clip_id = clip.get("id", "unknown")
                clip_data = clip.get("data", {})
                clip_data_type = clip_data.get("type", "none")
                logger.info(f"         Clip {j}: id={clip_id}, data.type='{clip_data_type}'")
                if layer_type == "text" or clip_data_type == "text":
                    logger.info(f"            Text content: '{clip_data.get('text', 'NO TEXT')}'")
                    logger.info(f"            Position: {clip.get('position', 'NO POSITION')}")
        
        # Create task entry
        with tasks_lock:
            export_tasks[task_id] = {
                "task_id": task_id,
                "status": "pending",
                "progress": 0.0,
                "message": "Export task created",
                "output_path": None,
                "created_at": datetime.now().isoformat(),
                "completed_at": None,
                "output_filename": output_filename
            }
        
        # Add background task
        background_tasks.add_task(
            process_export,
            task_id,
            timeline_data,
            resolution,
            fps,
            output_filename
        )
        
        logger.info(f"   Export task {task_id} queued for processing")
        
        return ExportStartResponse(
            task_id=task_id,
            status="pending",
            message="Export task started"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to start export: {str(e)}")


@router.get("/status/{task_id}", response_model=ExportStatusResponse)
async def get_export_status(task_id: str):
    """
    Get the status of an export task.
    
    Args:
        task_id: Task ID
        
    Returns:
        Export status and progress
    """
    with tasks_lock:
        if task_id not in export_tasks:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task = export_tasks[task_id]
        
        # Convert progress from 0-1 to 0-100 for frontend
        progress_percent = task["progress"] * 100
        
        return ExportStatusResponse(
            task_id=task["task_id"],
            status=task["status"],
            progress=progress_percent,
            message=task.get("message"),
            output_path=task.get("output_path"),
            created_at=task["created_at"],
            completed_at=task.get("completed_at")
        )


@router.get("/download/{task_id}")
async def download_export(task_id: str, background_tasks: BackgroundTasks):
    """
    Download the exported video file.
    
    Args:
        task_id: Task ID
        background_tasks: FastAPI background tasks for cleanup
        
    Returns:
        Video file as streaming response
    """
    with tasks_lock:
        if task_id not in export_tasks:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task = export_tasks[task_id]
        
        if task["status"] != "completed":
            raise HTTPException(
                status_code=400,
                detail=f"Export not completed. Current status: {task['status']}"
            )
        
        output_path = task.get("output_path")
        if not output_path or not Path(output_path).exists():
            raise HTTPException(status_code=404, detail="Export file not found")
        
        output_filename = task.get("output_filename", "export.mp4")
    
    # Schedule cleanup after download
    def cleanup():
        try:
            # Wait a bit to ensure download completes
            import time
            time.sleep(5)
            export_service.cleanup_export(output_path)
            with tasks_lock:
                if task_id in export_tasks:
                    del export_tasks[task_id]
        except Exception as e:
            print(f"Error during cleanup: {str(e)}")
    
    background_tasks.add_task(cleanup)
    
    # Return file response
    return FileResponse(
        path=output_path,
        media_type="video/mp4",
        filename=output_filename,
        headers={
            "Content-Disposition": f"attachment; filename={output_filename}"
        }
    )


@router.delete("/cancel/{task_id}")
async def cancel_export(task_id: str):
    """
    Cancel an export task.
    
    Args:
        task_id: Task ID
        
    Returns:
        Success message
    """
    with tasks_lock:
        if task_id not in export_tasks:
            raise HTTPException(status_code=404, detail="Task not found")
        
        task = export_tasks[task_id]
        
        if task["status"] in ["completed", "failed"]:
            raise HTTPException(
                status_code=400,
                detail=f"Cannot cancel task with status: {task['status']}"
            )
        
        # Mark as cancelled (note: actual processing might continue)
        export_tasks[task_id]["status"] = "cancelled"
        export_tasks[task_id]["message"] = "Task cancelled by user"
        export_tasks[task_id]["completed_at"] = datetime.now().isoformat()
    
    return JSONResponse(
        content={"message": "Export task cancelled", "task_id": task_id}
    )


@router.get("/tasks")
async def list_export_tasks():
    """
    List all export tasks.
    
    Returns:
        List of all export tasks
    """
    with tasks_lock:
        tasks_list = list(export_tasks.values())
    
    return JSONResponse(content={"tasks": tasks_list, "count": len(tasks_list)})


@router.delete("/cleanup")
async def cleanup_completed_tasks():
    """
    Clean up completed export tasks.
    
    Returns:
        Number of tasks cleaned up
    """
    cleaned_count = 0
    
    with tasks_lock:
        tasks_to_remove = []
        
        for task_id, task in export_tasks.items():
            if task["status"] in ["completed", "failed", "cancelled"]:
                output_path = task.get("output_path")
                if output_path:
                    export_service.cleanup_export(output_path)
                tasks_to_remove.append(task_id)
        
        for task_id in tasks_to_remove:
            del export_tasks[task_id]
            cleaned_count += 1
    
    return JSONResponse(
        content={
            "message": f"Cleaned up {cleaned_count} tasks",
            "count": cleaned_count
        }
    )
