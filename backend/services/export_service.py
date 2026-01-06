"""
Export Service for rendering final video from timeline data.
"""
import uuid
from typing import Dict, List, Callable, Optional
from pathlib import Path
from moviepy.editor import (
    VideoFileClip,
    CompositeVideoClip,
    AudioFileClip,
    CompositeAudioClip,
    TextClip,
    ColorClip
)
from moviepy.video.fx import fadein, fadeout


class ExportService:
    """Service for exporting timeline to final video file."""

    def __init__(
        self, uploads_dir: str = "uploads", output_dir: str = "exports"
    ):
        """
        Initialize export service.
        
        Args:
            uploads_dir: Directory containing uploaded media files
            output_dir: Directory to save exported videos
        """
        self.uploads_dir = Path(uploads_dir)
        self.output_dir = Path(output_dir)
        self.output_dir.mkdir(exist_ok=True)
        
        # Resolution presets
        self.resolutions = {
            "1080p": (1920, 1080),
            "720p": (1280, 720),
            "480p": (854, 480)
        }

    def export_timeline(
        self,
        timeline_data: Dict,
        output_path: str,
        resolution: str = "1080p",
        fps: int = 30,
        progress_callback: Optional[Callable[[float], None]] = None
    ) -> str:
        """
        Export timeline to final video file.
        
        Args:
            timeline_data: Timeline JSON with layers and clips
            output_path: Path for output video file
            resolution: Resolution preset (1080p, 720p, 480p)
            fps: Frames per second for output video
            progress_callback: Optional callback function for progress updates
            
        Returns:
            Path to exported video file
        """
        try:
            if progress_callback:
                progress_callback(0.0)
            
            # Get resolution dimensions
            width, height = self.resolutions.get(resolution, (1920, 1080))
            
            # Extract layers from timeline data
            layers = timeline_data.get("layers", [])
            duration = timeline_data.get("duration", 0)
            
            if progress_callback:
                progress_callback(0.1)
            
            # Process video layers
            video_clips = []
            audio_clips = []
            text_clips = []
            
            for layer in layers:
                layer_type = layer.get("type", "video")
                clips = layer.get("clips", [])
                visible = layer.get("visible", True)
                
                if not visible:
                    continue
                
                if layer_type == "video":
                    for clip in clips:
                        processed_clip = self._process_video_clip(
                            clip, width, height, fps
                        )
                        if processed_clip:
                            video_clips.append(processed_clip)
                            
                elif layer_type == "audio":
                    for clip in clips:
                        processed_audio = self._process_audio_clip(clip)
                        if processed_audio:
                            audio_clips.append(processed_audio)
                            
                elif layer_type == "text":
                    for clip in clips:
                        processed_text = self._process_text_clip(
                            clip, width, height, fps
                        )
                        if processed_text:
                            text_clips.append(processed_text)
            
            if progress_callback:
                progress_callback(0.3)
            
            # Sort video clips by start time
            video_clips.sort(key=lambda x: x[1])  # Sort by start_time
            
            # Create composite video
            if video_clips:
                composite_video = self._create_composite_video(
                    video_clips, duration, width, height, fps
                )
            else:
                # Create blank video if no video clips
                composite_video = ColorClip(
                    size=(width, height),
                    color=(0, 0, 0),
                    duration=duration
                ).set_fps(fps)
            
            if progress_callback:
                progress_callback(0.5)
            
            # Add text overlays
            if text_clips:
                composite_video = self._add_text_overlays(
                    composite_video, text_clips
                )
            
            if progress_callback:
                progress_callback(0.7)
            
            # Mix audio tracks
            if audio_clips:
                mixed_audio = self._mix_audio_tracks(audio_clips, duration)
                composite_video = composite_video.set_audio(mixed_audio)
            
            if progress_callback:
                progress_callback(0.8)
            
            # Write final video file
            output_path = str(self.output_dir / output_path)
            composite_video.write_videofile(
                output_path,
                fps=fps,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=f'temp-audio-{uuid.uuid4()}.m4a',
                remove_temp=True,
                logger=None  # Suppress moviepy logging
            )
            
            # Clean up clips
            composite_video.close()
            for clip, _, _ in video_clips:
                clip.close()
            for audio, _, _ in audio_clips:
                audio.close()
            
            if progress_callback:
                progress_callback(1.0)
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Export failed: {str(e)}")

    def _process_video_clip(
        self, clip_data: Dict, width: int, height: int, fps: int
    ) -> Optional[tuple]:
        """
        Process a single video clip with trimming and transitions.
        
        Args:
            clip_data: Clip data from timeline
            width: Target width
            height: Target height
            fps: Target fps
            
        Returns:
            Tuple of (clip, start_time, end_time) or None
        """
        try:
            resource_id = clip_data.get("resourceId")
            start_time = clip_data.get("startTime", 0)
            trim_start = clip_data.get("trimStart", 0)
            trim_end = clip_data.get("trimEnd", 0)
            transitions = clip_data.get("transitions", [])
            
            # Find video file
            video_path = self._find_media_file(resource_id)
            if not video_path:
                return None
            
            # Load video clip
            video = VideoFileClip(str(video_path))
            
            # Apply trimming
            if trim_start > 0 or trim_end > 0:
                video = video.subclip(trim_start, video.duration - trim_end)
            
            # Resize to target resolution
            video = video.resize(height=height)
            if video.w > width:
                video = video.resize(width=width)
            
            # Center the video if needed
            if video.w < width or video.h < height:
                video = video.on_color(
                    size=(width, height),
                    color=(0, 0, 0),
                    pos='center'
                )
            
            # Apply transitions
            video = self._apply_transitions(video, transitions)
            
            # Set fps
            video = video.set_fps(fps)
            
            end_time = start_time + video.duration
            
            return (video, start_time, end_time)
            
        except Exception as e:
            print(f"Error processing video clip: {str(e)}")
            return None

    def _process_audio_clip(self, clip_data: Dict) -> Optional[tuple]:
        """
        Process a single audio clip.
        
        Args:
            clip_data: Clip data from timeline
            
        Returns:
            Tuple of (audio, start_time, volume) or None
        """
        try:
            resource_id = clip_data.get("resourceId")
            start_time = clip_data.get("startTime", 0)
            volume = clip_data.get("volume", 1.0)
            trim_start = clip_data.get("trimStart", 0)
            trim_end = clip_data.get("trimEnd", 0)
            
            # Find audio file
            audio_path = self._find_media_file(resource_id)
            if not audio_path:
                return None
            
            # Load audio clip
            audio = AudioFileClip(str(audio_path))
            
            # Apply trimming
            if trim_start > 0 or trim_end > 0:
                audio = audio.subclip(trim_start, audio.duration - trim_end)
            
            # Apply volume
            if volume != 1.0:
                audio = audio.volumex(volume)
            
            return (audio, start_time, volume)
            
        except Exception as e:
            print(f"Error processing audio clip: {str(e)}")
            return None

    def _process_text_clip(
        self, clip_data: Dict, width: int, height: int, fps: int
    ) -> Optional[tuple]:
        """
        Process a single text clip.
        
        Args:
            clip_data: Clip data from timeline
            width: Video width
            height: Video height
            fps: Target fps
            
        Returns:
            Tuple of (text_clip, start_time, end_time) or None
        """
        try:
            data = clip_data.get("data", {})
            start_time = clip_data.get("startTime", 0)
            duration = clip_data.get("duration", 5)
            
            text_content = data.get("text", "")
            font_family = data.get("fontFamily", "Arial")
            font_size = data.get("fontSize", 50)
            color = data.get("color", "white")
            position = data.get("position", {"x": width // 2, "y": height // 2})
            
            # Create text clip
            txt_clip = TextClip(
                text_content,
                fontsize=font_size,
                color=color,
                font=font_family,
                method='caption' if len(text_content) > 50 else 'label'
            )
            
            # Set position and duration
            txt_clip = txt_clip.set_position((position["x"], position["y"]))
            txt_clip = txt_clip.set_duration(duration)
            txt_clip = txt_clip.set_fps(fps)
            
            end_time = start_time + duration
            
            return (txt_clip, start_time, end_time)
            
        except Exception as e:
            print(f"Error processing text clip: {str(e)}")
            return None

    def _apply_transitions(self, clip: VideoFileClip, transitions: List[Dict]) -> VideoFileClip:
        """
        Apply transitions to a video clip.
        
        Args:
            clip: Video clip
            transitions: List of transition effects
            
        Returns:
            Video clip with transitions applied
        """
        for transition in transitions:
            trans_type = transition.get("type", "")
            trans_duration = transition.get("duration", 1.0)
            position = transition.get("position", "start")
            
            if trans_type == "fadeIn" and position == "start":
                clip = fadein(clip, trans_duration)
            elif trans_type == "fadeOut" and position == "end":
                clip = fadeout(clip, trans_duration)
        
        return clip

    def _create_composite_video(
        self,
        video_clips: List[tuple],
        duration: float,
        width: int,
        height: int,
        fps: int
    ) -> CompositeVideoClip:
        """
        Create composite video from multiple clips.
        
        Args:
            video_clips: List of (clip, start_time, end_time) tuples
            duration: Total duration
            width: Video width
            height: Video height
            fps: Target fps
            
        Returns:
            Composite video clip
        """
        # Set start times for all clips
        positioned_clips = []
        for clip, start_time, end_time in video_clips:
            clip = clip.set_start(start_time)
            positioned_clips.append(clip)
        
        # Create composite
        if positioned_clips:
            final_clip = CompositeVideoClip(
                positioned_clips,
                size=(width, height)
            ).set_duration(duration).set_fps(fps)
        else:
            # Create blank video
            final_clip = ColorClip(
                size=(width, height),
                color=(0, 0, 0),
                duration=duration
            ).set_fps(fps)
        
        return final_clip

    def _add_text_overlays(
        self, video: CompositeVideoClip, text_clips: List[tuple]
    ) -> CompositeVideoClip:
        """
        Add text overlays to video.
        
        Args:
            video: Base video clip
            text_clips: List of (text_clip, start_time, end_time) tuples
            
        Returns:
            Video with text overlays
        """
        all_clips = [video]
        
        for txt_clip, start_time, end_time in text_clips:
            txt_clip = txt_clip.set_start(start_time)
            all_clips.append(txt_clip)
        
        return CompositeVideoClip(all_clips)

    def _mix_audio_tracks(
        self, audio_clips: List[tuple], duration: float
    ) -> CompositeAudioClip:
        """
        Mix multiple audio tracks.
        
        Args:
            audio_clips: List of (audio, start_time, volume) tuples
            duration: Total duration
            
        Returns:
            Mixed audio clip
        """
        positioned_audio = []
        for audio, start_time, volume in audio_clips:
            audio = audio.set_start(start_time)
            positioned_audio.append(audio)
        
        if positioned_audio:
            return CompositeAudioClip(positioned_audio).set_duration(duration)
        return None

    def _find_media_file(self, resource_id: str) -> Optional[Path]:
        """
        Find media file by resource ID.
        
        Args:
            resource_id: Resource ID to find
            
        Returns:
            Path to media file or None
        """
        # Search in uploads directory
        for ext in ['.mp4', '.mov', '.avi', '.mp3', '.wav', '.m4a', '.jpg', '.png']:
            file_path = self.uploads_dir / f"{resource_id}{ext}"
            if file_path.exists():
                return file_path
        return None

    def cleanup_export(self, file_path: str):
        """
        Clean up exported file.
        
        Args:
            file_path: Path to file to delete
        """
        try:
            path = Path(file_path)
            if path.exists():
                path.unlink()
        except Exception as e:
            print(f"Error cleaning up file: {str(e)}")
