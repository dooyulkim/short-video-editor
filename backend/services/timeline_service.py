import os
import uuid
from pathlib import Path
from typing import List, Tuple, Optional
import ffmpeg
from concurrent.futures import ThreadPoolExecutor
import threading

# cSpell:ignore videoclips subclip videofile libx audiofile


class TimelineService:
    """Service for video processing operations on timeline"""

    def __init__(
        self, upload_dir: str = "uploads", temp_dir: str = "temp_video"
    ):
        self.upload_dir = Path(upload_dir)
        self.temp_dir = Path(temp_dir)

        # Create directories if they don't exist
        self.upload_dir.mkdir(parents=True, exist_ok=True)
        self.temp_dir.mkdir(parents=True, exist_ok=True)

        # Thread pool for background processing
        self.executor = ThreadPoolExecutor(max_workers=3)
        self.processing_status = {}
        self.processing_lock = threading.Lock()

    def cut_video(
        self, video_path: str, cut_time: float
    ) -> Tuple[str, str, str, str]:
        """
        Cut video at specified timestamp into two segments using FFmpeg

        Args:
            video_path: Path to the video file
            cut_time: Time in seconds where to cut the video

        Returns:
            Tuple of (segment1_id, segment1_path, segment2_id, segment2_path)
        """
        try:
            # Get video duration first
            probe = ffmpeg.probe(video_path)
            duration = float(probe['format']['duration'])
            
            # Validate cut time
            if cut_time <= 0 or cut_time >= duration:
                raise ValueError(
                    f"Cut time must be between 0 and {duration} seconds")

            # Generate unique IDs for new segments
            segment1_id = str(uuid.uuid4())
            segment2_id = str(uuid.uuid4())

            # Get file extension from original
            file_extension = Path(video_path).suffix

            # Save segments
            segment1_path = self.temp_dir / f"{segment1_id}{file_extension}"
            segment2_path = self.temp_dir / f"{segment2_id}{file_extension}"

            # First segment: from start to cut_time
            (
                ffmpeg
                .input(video_path, ss=0, t=cut_time)
                .output(str(segment1_path), vcodec='libx264', acodec='aac')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )

            # Second segment: from cut_time to end
            (
                ffmpeg
                .input(video_path, ss=cut_time)
                .output(str(segment2_path), vcodec='libx264', acodec='aac')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )

            return (
                segment1_id, segment2_id,
                str(segment1_path), str(segment2_path)
            )

        except ffmpeg.Error as e:
            raise Exception(f"Error cutting video: {e.stderr.decode() if e.stderr else str(e)}")
        except Exception as e:
            raise Exception(f"Error cutting video: {str(e)}")

    def trim_video(
        self, video_path: str, start_time: float, end_time: float
    ) -> Tuple[str, str]:
        """
        Trim video to specified time range using FFmpeg

        Args:
            video_path: Path to the video file
            start_time: Start time in seconds
            end_time: End time in seconds

        Returns:
            Tuple of (trimmed_video_id, trimmed_video_path)
        """
        try:
            # Get video duration first
            probe = ffmpeg.probe(video_path)
            duration = float(probe['format']['duration'])

            # Validate times
            if (start_time < 0 or end_time > duration or
                    start_time >= end_time):
                raise ValueError(
                    f"Invalid trim times. Video duration: {duration}s")

            # Calculate duration of trimmed segment
            trim_duration = end_time - start_time

            # Generate unique ID
            trimmed_id = str(uuid.uuid4())

            # Get file extension
            file_extension = Path(video_path).suffix

            # Save trimmed video
            trimmed_path = self.temp_dir / f"{trimmed_id}{file_extension}"

            # Use ffmpeg to extract the segment
            (
                ffmpeg
                .input(video_path, ss=start_time, t=trim_duration)
                .output(str(trimmed_path), vcodec='libx264', acodec='aac')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )

            return trimmed_id, str(trimmed_path)

        except ffmpeg.Error as e:
            raise Exception(f"Error trimming video: {e.stderr.decode() if e.stderr else str(e)}")
        except Exception as e:
            raise Exception(f"Error trimming video: {str(e)}")

    def merge_videos(
        self,
        clip_data: List[dict],
        method: str = "compose"
    ) -> Tuple[str, str]:
        """
        Merge multiple video clips into a single video using FFmpeg

        Args:
            clip_data: List of dicts with 'video_id', 'video_path',
                and 'start_time'
            method: Merge method - 'compose' (overlay by time) or
                'concatenate' (sequential)

        Returns:
            Tuple of (merged_video_id, merged_video_path)
        """
        try:
            if not clip_data:
                raise ValueError("No clips provided for merging")

            # Verify all video files exist
            for clip_info in clip_data:
                video_path = clip_info.get('video_path')
                if not video_path or not os.path.exists(video_path):
                    raise ValueError(f"Video file not found: {video_path}")

            # Generate unique ID
            merged_id = str(uuid.uuid4())
            merged_path = self.temp_dir / f"{merged_id}.mp4"

            if method == "concatenate":
                # Sequential concatenation using concat demuxer
                # Create a temporary file list for concat
                concat_file_path = self.temp_dir / f"concat_{merged_id}.txt"
                
                with open(concat_file_path, 'w') as f:
                    for clip_info in clip_data:
                        video_path = clip_info.get('video_path')
                        # Write file path in format required by concat demuxer
                        # Use absolute path and escape special characters
                        abs_path = os.path.abspath(video_path)
                        f.write(f"file '{abs_path}'\n")
                
                # Use concat demuxer for concatenation
                (
                    ffmpeg
                    .input(str(concat_file_path), format='concat', safe=0)
                    .output(str(merged_path), vcodec='libx264', acodec='aac')
                    .overwrite_output()
                    .run(capture_stdout=True, capture_stderr=True, quiet=True)
                )
                
                # Clean up concat file
                try:
                    concat_file_path.unlink()
                except:
                    pass
            else:
                # For compose method (overlay by time), we need complex filtering
                # This is more complex and requires building a filter graph
                # For now, we'll use concatenate as the default behavior
                # To properly support compose with start_time offsets, we'd need
                # to build a complex filter graph with overlay filters
                raise NotImplementedError(
                    "Compose method with time offsets is not yet implemented with FFmpeg. "
                    "Use 'concatenate' method instead."
                )

            return merged_id, str(merged_path)

        except ffmpeg.Error as e:
            raise Exception(f"Error merging videos: {e.stderr.decode() if e.stderr else str(e)}")
        except Exception as e:
            raise Exception(f"Error merging videos: {str(e)}")

    def process_in_background(self, task_id: str, task_func, *args, **kwargs):
        """
        Process a video operation in background thread

        Args:
            task_id: Unique identifier for the task
            task_func: Function to execute
            *args, **kwargs: Arguments to pass to the function
        """
        with self.processing_lock:
            self.processing_status[task_id] = {
                'status': 'processing',
                'progress': 0,
                'result': None,
                'error': None
            }

        def _execute():
            try:
                result = task_func(*args, **kwargs)
                with self.processing_lock:
                    self.processing_status[task_id]['status'] = 'completed'
                    self.processing_status[task_id]['progress'] = 100
                    self.processing_status[task_id]['result'] = result
            except Exception as e:
                with self.processing_lock:
                    self.processing_status[task_id]['status'] = 'failed'
                    self.processing_status[task_id]['error'] = str(e)

        self.executor.submit(_execute)

    def get_task_status(self, task_id: str) -> Optional[dict]:
        """
        Get status of a background task

        Args:
            task_id: Task identifier

        Returns:
            Task status dictionary or None if not found
        """
        with self.processing_lock:
            return self.processing_status.get(task_id)

    def cleanup_temp_files(self, max_age_hours: int = 24):
        """
        Clean up old temporary files

        Args:
            max_age_hours: Maximum age of files to keep in hours
        """
        import time
        current_time = time.time()
        max_age_seconds = max_age_hours * 3600

        for file_path in self.temp_dir.glob("*"):
            if file_path.is_file():
                file_age = current_time - file_path.stat().st_mtime
                if file_age > max_age_seconds:
                    try:
                        file_path.unlink()
                    except Exception as e:
                        print(f"Error deleting {file_path}: {e}")
