import os
import uuid
from pathlib import Path
from typing import List, Tuple, Optional
from moviepy.editor import (
    VideoFileClip, concatenate_videoclips, CompositeVideoClip
)
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
        Cut video at specified timestamp into two segments

        Args:
            video_path: Path to the video file
            cut_time: Time in seconds where to cut the video

        Returns:
            Tuple of (segment1_id, segment2_id) - IDs of the two new segments
        """
        try:
            # Load video
            video = VideoFileClip(video_path)

            # Validate cut time
            if cut_time <= 0 or cut_time >= video.duration:
                raise ValueError(
                    f"Cut time must be between 0 and {video.duration} seconds")

            # Create two segments
            segment1 = video.subclip(0, cut_time)
            segment2 = video.subclip(cut_time, video.duration)

            # Generate unique IDs for new segments
            segment1_id = str(uuid.uuid4())
            segment2_id = str(uuid.uuid4())

            # Get file extension from original
            file_extension = Path(video_path).suffix

            # Save segments
            segment1_path = self.temp_dir / f"{segment1_id}{file_extension}"
            segment2_path = self.temp_dir / f"{segment2_id}{file_extension}"

            segment1.write_videofile(
                str(segment1_path),
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=str(
                    self.temp_dir / f"temp_audio_{segment1_id}.m4a"),
                remove_temp=True,
                logger=None
            )

            segment2.write_videofile(
                str(segment2_path),
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=str(
                    self.temp_dir / f"temp_audio_{segment2_id}.m4a"),
                remove_temp=True,
                logger=None
            )

            # Clean up
            segment1.close()
            segment2.close()
            video.close()

            return (
                segment1_id, segment2_id,
                str(segment1_path), str(segment2_path)
            )

        except Exception as e:
            raise Exception(f"Error cutting video: {str(e)}")

    def trim_video(
        self, video_path: str, start_time: float, end_time: float
    ) -> Tuple[str, str]:
        """
        Trim video to specified time range

        Args:
            video_path: Path to the video file
            start_time: Start time in seconds
            end_time: End time in seconds

        Returns:
            Tuple of (trimmed_video_id, trimmed_video_path)
        """
        try:
            # Load video
            video = VideoFileClip(video_path)

            # Validate times
            if (start_time < 0 or end_time > video.duration or
                    start_time >= end_time):
                raise ValueError(
                    f"Invalid trim times. Video duration: {video.duration}s")

            # Extract subclip
            trimmed = video.subclip(start_time, end_time)

            # Generate unique ID
            trimmed_id = str(uuid.uuid4())

            # Get file extension
            file_extension = Path(video_path).suffix

            # Save trimmed video
            trimmed_path = self.temp_dir / f"{trimmed_id}{file_extension}"

            trimmed.write_videofile(
                str(trimmed_path),
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=str(
                    self.temp_dir / f"temp_audio_{trimmed_id}.m4a"),
                remove_temp=True,
                logger=None
            )

            # Clean up
            trimmed.close()
            video.close()

            return trimmed_id, str(trimmed_path)

        except Exception as e:
            raise Exception(f"Error trimming video: {str(e)}")

    def merge_videos(
        self,
        clip_data: List[dict],
        method: str = "compose"
    ) -> Tuple[str, str]:
        """
        Merge multiple video clips into a single video

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

            # Load all video clips
            clips = []
            for clip_info in clip_data:
                video_path = clip_info.get('video_path')
                if not video_path or not os.path.exists(video_path):
                    raise ValueError(f"Video file not found: {video_path}")

                clip = VideoFileClip(video_path)

                # If start_time is provided and using compose method
                if method == "compose" and 'start_time' in clip_info:
                    clip = clip.set_start(clip_info['start_time'])

                clips.append(clip)

            # Handle different resolutions by resizing to match first clip
            if clips:
                target_size = (clips[0].w, clips[0].h)
                resized_clips = []

                for clip in clips:
                    if (clip.w, clip.h) != target_size:
                        resized_clip = clip.resize(target_size)
                        resized_clips.append(resized_clip)
                    else:
                        resized_clips.append(clip)

                clips = resized_clips

            # Merge based on method
            if method == "concatenate":
                # Sequential concatenation
                merged = concatenate_videoclips(clips, method="compose")
            else:
                # Composite overlay by time
                merged = CompositeVideoClip(clips)

            # Generate unique ID
            merged_id = str(uuid.uuid4())

            # Save merged video
            merged_path = self.temp_dir / f"{merged_id}.mp4"

            merged.write_videofile(
                str(merged_path),
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=str(
                    self.temp_dir / f"temp_audio_{merged_id}.m4a"),
                remove_temp=True,
                logger=None
            )

            # Clean up
            merged.close()
            for clip in clips:
                clip.close()

            return merged_id, str(merged_path)

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
