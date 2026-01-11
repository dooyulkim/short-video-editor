"""
Test suite for Export Router
"""
import pytest
import os
import tempfile
import shutil
import subprocess
from fastapi.testclient import TestClient

# Import app
from main import app
from routers.export import export_tasks, tasks_lock


@pytest.fixture
def client():
    """Create test client"""
    return TestClient(app)


@pytest.fixture(autouse=True)
def cleanup_tasks():
    """Clean up export tasks before and after each test"""
    with tasks_lock:
        export_tasks.clear()
    yield
    with tasks_lock:
        export_tasks.clear()


@pytest.fixture
def setup_test_dirs():
    """Setup and teardown test directories"""
    test_dir = tempfile.mkdtemp()
    uploads_dir = os.path.join(test_dir, "uploads")
    os.makedirs(uploads_dir)
    
    # Create a simple test video using FFmpeg
    video_path = os.path.join(uploads_dir, "test_video.mp4")
    cmd = [
        'ffmpeg', '-y',
        '-f', 'lavfi', '-i', 'color=c=red:s=640x480:d=1:r=24',
        '-c:v', 'libx264', '-preset', 'ultrafast',
        '-pix_fmt', 'yuv420p',
        video_path
    ]
    result = subprocess.run(cmd, capture_output=True, text=True)
    if result.returncode != 0:
        pytest.skip(f"FFmpeg not available or error: {result.stderr}")
    
    yield {
        "test_dir": test_dir,
        "uploads_dir": uploads_dir,
        "video_path": video_path
    }
    
    # Cleanup
    if os.path.exists(test_dir):
        shutil.rmtree(test_dir)


class TestExportRouter:
    """Test class for Export Router endpoints"""
    
    def test_start_export_endpoint(self, client):
        """Test POST /export/start endpoint"""
        # Prepare timeline data
        timeline_data = {
            "duration": 2.0,
            "layers": [
                {
                    "type": "video",
                    "visible": True,
                    "clips": []
                }
            ]
        }
        
        # Make request
        response = client.post(
            "/api/export/start",
            json={
                "timeline_data": timeline_data,
                "resolution": "480p",
                "fps": 24,
                "output_filename": "test_export.mp4"
            }
        )
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert "task_id" in data
        assert data["status"] == "pending"
        assert "message" in data
        
        # Verify task was created
        task_id = data["task_id"]
        with tasks_lock:
            assert task_id in export_tasks
    
    def test_start_export_with_default_filename(self, client):
        """Test export start with auto-generated filename"""
        timeline_data = {
            "duration": 1.0,
            "layers": []
        }
        
        response = client.post(
            "/api/export/start",
            json={
                "timeline_data": timeline_data,
                "resolution": "720p",
                "fps": 30
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "task_id" in data
        
        # Verify task has auto-generated filename
        task_id = data["task_id"]
        with tasks_lock:
            assert "output_filename" in export_tasks[task_id]
            assert export_tasks[task_id]["output_filename"].startswith("export_")
    
    def test_get_export_status_pending(self, client):
        """Test GET /export/status endpoint for pending task"""
        # Create a task manually
        task_id = "test-task-123"
        with tasks_lock:
            export_tasks[task_id] = {
                "task_id": task_id,
                "status": "pending",
                "progress": 0.0,
                "message": "Task pending",
                "output_path": None,
                "created_at": "2026-01-05T12:00:00",
                "completed_at": None
            }
        
        # Make request
        response = client.get(f"/api/export/status/{task_id}")
        
        # Verify response
        assert response.status_code == 200
        data = response.json()
        assert data["task_id"] == task_id
        assert data["status"] == "pending"
        assert data["progress"] == 0.0  # 0.0 * 100 = 0.0
        assert data["output_path"] is None
    
    def test_get_export_status_processing(self, client):
        """Test export status for processing task"""
        task_id = "test-task-456"
        with tasks_lock:
            export_tasks[task_id] = {
                "task_id": task_id,
                "status": "processing",
                "progress": 0.5,
                "message": "Processing...",
                "output_path": None,
                "created_at": "2026-01-05T12:00:00",
                "completed_at": None
            }
        
        response = client.get(f"/api/export/status/{task_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "processing"
        assert data["progress"] == 50.0  # 0.5 * 100 = 50.0
    
    def test_get_export_status_completed(self, client):
        """Test export status for completed task"""
        task_id = "test-task-789"
        with tasks_lock:
            export_tasks[task_id] = {
                "task_id": task_id,
                "status": "completed",
                "progress": 1.0,
                "message": "Export completed",
                "output_path": "/path/to/export.mp4",
                "created_at": "2026-01-05T12:00:00",
                "completed_at": "2026-01-05T12:05:00"
            }
        
        response = client.get(f"/api/export/status/{task_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "completed"
        assert data["progress"] == 100.0  # 1.0 * 100 = 100.0
        assert data["output_path"] == "/path/to/export.mp4"
        assert data["completed_at"] is not None
    
    def test_get_export_status_failed(self, client):
        """Test export status for failed task"""
        task_id = "test-task-fail"
        with tasks_lock:
            export_tasks[task_id] = {
                "task_id": task_id,
                "status": "failed",
                "progress": 0.3,
                "message": "Export failed: error message",
                "output_path": None,
                "created_at": "2026-01-05T12:00:00",
                "completed_at": "2026-01-05T12:01:00"
            }
        
        response = client.get(f"/api/export/status/{task_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert data["status"] == "failed"
        assert "error" in data["message"] or "failed" in data["message"]
    
    def test_get_export_status_not_found(self, client):
        """Test export status for non-existent task"""
        response = client.get("/api/export/status/nonexistent-task")
        
        assert response.status_code == 404
        assert "not found" in response.json()["detail"].lower()
    
    def test_download_export_success(self, client):
        """Test downloading completed export"""
        # Create a temporary file to download
        test_dir = tempfile.mkdtemp()
        output_file = os.path.join(test_dir, "test_export.mp4")
        with open(output_file, 'w') as f:
            f.write("test video content")
        
        task_id = "test-download-123"
        with tasks_lock:
            export_tasks[task_id] = {
                "task_id": task_id,
                "status": "completed",
                "progress": 1.0,
                "message": "Completed",
                "output_path": output_file,
                "created_at": "2026-01-05T12:00:00",
                "completed_at": "2026-01-05T12:05:00",
                "output_filename": "test_export.mp4"
            }
        
        try:
            response = client.get(f"/api/export/download/{task_id}")
            
            assert response.status_code == 200
            assert response.headers["content-type"] == "video/mp4"
            assert "test_export.mp4" in response.headers.get(
                "content-disposition", ""
            )
        finally:
            # Cleanup
            if os.path.exists(test_dir):
                shutil.rmtree(test_dir)
    
    def test_download_export_not_completed(self, client):
        """Test download fails when export not completed"""
        task_id = "test-download-pending"
        with tasks_lock:
            export_tasks[task_id] = {
                "task_id": task_id,
                "status": "processing",
                "progress": 0.5,
                "message": "Processing...",
                "output_path": None,
                "created_at": "2026-01-05T12:00:00",
                "completed_at": None
            }
        
        response = client.get(f"/api/export/download/{task_id}")
        
        assert response.status_code == 400
        assert "not completed" in response.json()["detail"].lower()
    
    def test_download_export_not_found(self, client):
        """Test download for non-existent task"""
        response = client.get("/api/export/download/nonexistent-task")
        
        assert response.status_code == 404
    
    def test_download_export_file_not_found(self, client):
        """Test download when output file doesn't exist"""
        task_id = "test-download-nofile"
        with tasks_lock:
            export_tasks[task_id] = {
                "task_id": task_id,
                "status": "completed",
                "progress": 1.0,
                "message": "Completed",
                "output_path": "/nonexistent/file.mp4",
                "created_at": "2026-01-05T12:00:00",
                "completed_at": "2026-01-05T12:05:00",
                "output_filename": "test.mp4"
            }
        
        response = client.get(f"/api/export/download/{task_id}")
        
        assert response.status_code == 404
        assert "file not found" in response.json()["detail"].lower()
    
    def test_cancel_export(self, client):
        """Test cancelling an export task"""
        task_id = "test-cancel-123"
        with tasks_lock:
            export_tasks[task_id] = {
                "task_id": task_id,
                "status": "processing",
                "progress": 0.3,
                "message": "Processing...",
                "output_path": None,
                "created_at": "2026-01-05T12:00:00",
                "completed_at": None
            }
        
        response = client.delete(f"/api/export/cancel/{task_id}")
        
        assert response.status_code == 200
        data = response.json()
        assert "cancelled" in data["message"].lower()
        
        # Verify task was marked as cancelled
        with tasks_lock:
            assert export_tasks[task_id]["status"] == "cancelled"
    
    def test_cancel_completed_export(self, client):
        """Test cancelling completed export fails"""
        task_id = "test-cancel-completed"
        with tasks_lock:
            export_tasks[task_id] = {
                "task_id": task_id,
                "status": "completed",
                "progress": 1.0,
                "message": "Completed",
                "output_path": "/path/to/file.mp4",
                "created_at": "2026-01-05T12:00:00",
                "completed_at": "2026-01-05T12:05:00"
            }
        
        response = client.delete(f"/api/export/cancel/{task_id}")
        
        assert response.status_code == 400
        assert "cannot cancel" in response.json()["detail"].lower()
    
    def test_cancel_nonexistent_export(self, client):
        """Test cancelling non-existent task"""
        response = client.delete("/api/export/cancel/nonexistent-task")
        
        assert response.status_code == 404
    
    def test_list_export_tasks(self, client):
        """Test listing all export tasks"""
        # Create multiple tasks
        with tasks_lock:
            export_tasks["task-1"] = {
                "task_id": "task-1",
                "status": "pending",
                "progress": 0.0,
                "message": "Pending",
                "output_path": None,
                "created_at": "2026-01-05T12:00:00",
                "completed_at": None
            }
            export_tasks["task-2"] = {
                "task_id": "task-2",
                "status": "completed",
                "progress": 1.0,
                "message": "Completed",
                "output_path": "/path/to/file.mp4",
                "created_at": "2026-01-05T12:00:00",
                "completed_at": "2026-01-05T12:05:00"
            }
        
        response = client.get("/api/export/tasks")
        
        assert response.status_code == 200
        data = response.json()
        assert "tasks" in data
        assert "count" in data
        assert data["count"] == 2
        assert len(data["tasks"]) == 2
    
    def test_list_export_tasks_empty(self, client):
        """Test listing tasks when none exist"""
        response = client.get("/api/export/tasks")
        
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0
        assert len(data["tasks"]) == 0
    
    def test_cleanup_completed_tasks(self, client):
        """Test cleaning up completed tasks"""
        # Create tasks with different statuses
        test_dir = tempfile.mkdtemp()
        
        with tasks_lock:
            export_tasks["task-pending"] = {
                "task_id": "task-pending",
                "status": "pending",
                "progress": 0.0,
                "message": "Pending",
                "output_path": None,
                "created_at": "2026-01-05T12:00:00",
                "completed_at": None
            }
            export_tasks["task-completed"] = {
                "task_id": "task-completed",
                "status": "completed",
                "progress": 1.0,
                "message": "Completed",
                "output_path": None,
                "created_at": "2026-01-05T12:00:00",
                "completed_at": "2026-01-05T12:05:00"
            }
            export_tasks["task-failed"] = {
                "task_id": "task-failed",
                "status": "failed",
                "progress": 0.5,
                "message": "Failed",
                "output_path": None,
                "created_at": "2026-01-05T12:00:00",
                "completed_at": "2026-01-05T12:01:00"
            }
        
        try:
            response = client.delete("/api/export/cleanup")
            
            assert response.status_code == 200
            data = response.json()
            assert data["count"] == 2  # Completed and failed
            
            # Verify only pending task remains
            with tasks_lock:
                assert len(export_tasks) == 1
                assert "task-pending" in export_tasks
        finally:
            if os.path.exists(test_dir):
                shutil.rmtree(test_dir)
    
    def test_cleanup_with_no_completed_tasks(self, client):
        """Test cleanup when no tasks need cleaning"""
        with tasks_lock:
            export_tasks["task-pending"] = {
                "task_id": "task-pending",
                "status": "pending",
                "progress": 0.0,
                "message": "Pending",
                "output_path": None,
                "created_at": "2026-01-05T12:00:00",
                "completed_at": None
            }
        
        response = client.delete("/api/export/cleanup")
        
        assert response.status_code == 200
        data = response.json()
        assert data["count"] == 0
    
    def test_export_request_validation(self, client):
        """Test export request with invalid data"""
        # Missing timeline_data
        response = client.post(
            "/api/export/start",
            json={
                "resolution": "480p",
                "fps": 24
            }
        )
        
        assert response.status_code == 400  # HTTPException from missing timeline data
    
    def test_export_with_custom_fps(self, client):
        """Test export with custom FPS setting"""
        timeline_data = {
            "duration": 1.0,
            "layers": []
        }
        
        response = client.post(
            "/api/export/start",
            json={
                "timeline_data": timeline_data,
                "resolution": "720p",
                "fps": 60
            }
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "task_id" in data
    
    def test_concurrent_export_tasks(self, client):
        """Test starting multiple export tasks concurrently"""
        timeline_data = {
            "duration": 1.0,
            "layers": []
        }
        
        task_ids = []
        for i in range(3):
            response = client.post(
                "/api/export/start",
                json={
                    "timeline_data": timeline_data,
                    "resolution": "480p",
                    "fps": 24,
                    "output_filename": f"export_{i}.mp4"
                }
            )
            assert response.status_code == 200
            task_ids.append(response.json()["task_id"])
        
        # Verify all tasks were created
        assert len(set(task_ids)) == 3  # All unique
        with tasks_lock:
            assert len(export_tasks) == 3
