"""
Export Service for rendering final video from timeline data.
"""
import uuid
from typing import Dict, List, Callable, Optional, Union
from pathlib import Path
from moviepy.editor import (
    VideoFileClip,
    CompositeVideoClip,
    AudioFileClip,
    CompositeAudioClip,
    TextClip,
    ColorClip,
    ImageClip
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

    def _interpolate_keyframes(
        self, keyframes: List[Dict], time: float, property_name: str
    ) -> Union[float, Dict[str, float], None]:
        """
        Interpolate keyframe values at a specific time.
        
        Args:
            keyframes: List of keyframes with time and properties
            time: Time within clip to interpolate at
            property_name: Name of property to interpolate
            
        Returns:
            Interpolated value or None
        """
        if not keyframes:
            return None
        
        # Sort keyframes by time
        sorted_keyframes = sorted(keyframes, key=lambda kf: kf.get("time", 0))
        
        # Find surrounding keyframes
        prev_kf = None
        next_kf = None
        
        for kf in sorted_keyframes:
            kf_time = kf.get("time", 0)
            if kf_time <= time:
                prev_kf = kf
            if kf_time > time and next_kf is None:
                next_kf = kf
                break
        
        # Get property from keyframes
        prev_val = prev_kf.get("properties", {}).get(property_name) if prev_kf else None
        next_val = next_kf.get("properties", {}).get(property_name) if next_kf else None
        
        # If no keyframes with this property, return None
        if prev_val is None and next_val is None:
            return None
        
        # If only one keyframe or after last keyframe
        if prev_kf and not next_kf:
            return prev_val
        
        # If before first keyframe
        if not prev_kf and next_kf:
            # Interpolate from None to first keyframe (use next value)
            return next_val
        
        # Interpolate between two keyframes
        if prev_kf and next_kf:
            prev_time = prev_kf.get("time", 0)
            next_time = next_kf.get("time", 0)
            
            if next_time <= prev_time:
                return prev_val
            
            # Calculate progress between keyframes
            progress = (time - prev_time) / (next_time - prev_time)
            progress = max(0, min(1, progress))  # Clamp to [0, 1]
            
            # Apply easing (currently only linear)
            easing = next_kf.get("easing", "linear")
            if easing == "ease-in":
                progress = progress * progress
            elif easing == "ease-out":
                progress = progress * (2 - progress)
            elif easing == "ease-in-out":
                progress = progress * progress * (3 - 2 * progress)
            
            # Interpolate based on type
            if isinstance(prev_val, (int, float)) and isinstance(next_val, (int, float)):
                return prev_val + (next_val - prev_val) * progress
            elif isinstance(prev_val, dict) and isinstance(next_val, dict):
                # Interpolate dict values (for scale, position)
                result = {}
                for key in set(list(prev_val.keys()) + list(next_val.keys())):
                    prev_v = prev_val.get(key, 0)
                    next_v = next_val.get(key, 0)
                    result[key] = prev_v + (next_v - prev_v) * progress
                return result
            else:
                # Can't interpolate, return next value
                return next_val
        
        return None

    def _apply_keyframe_transforms(
        self, clip, clip_data: Dict, original_width: int, original_height: int
    ):
        """
        Apply keyframe-based transformations to a clip.
        
        Args:
            clip: MoviePy clip object
            clip_data: Clip data containing keyframes
            original_width: Original width of the clip
            original_height: Original height of the clip
            
        Returns:
            Transformed clip
        """
        keyframes = clip_data.get("keyframes")
        if not keyframes:
            # Apply static transforms
            return self._apply_static_transforms(clip, clip_data, original_width, original_height)
        
        def transform_func(get_frame, t):
            """Transform function applied to each frame."""
            # Get interpolated properties at time t
            scale_val = self._interpolate_keyframes(keyframes, t, "scale")
            position_val = self._interpolate_keyframes(keyframes, t, "position")
            rotation_val = self._interpolate_keyframes(keyframes, t, "rotation")
            opacity_val = self._interpolate_keyframes(keyframes, t, "opacity")
            
            # Fall back to static values if no keyframes
            if scale_val is None:
                scale_val = clip_data.get("scale", 1)
            if position_val is None:
                position_val = clip_data.get("position", {"x": 0, "y": 0})
            if rotation_val is None:
                rotation_val = clip_data.get("rotation", 0)
            if opacity_val is None:
                opacity_val = clip_data.get("opacity", 1)
            
            # Get the frame
            frame = get_frame(t)
            
            # Apply opacity
            if opacity_val != 1:
                frame = (frame * opacity_val).astype('uint8')
            
            return frame
        
        # Apply time-varying function
        clip = clip.fl(transform_func)
        
        # Apply time-varying scale and position
        def make_frame(t):
            scale_val = self._interpolate_keyframes(keyframes, t, "scale")
            if scale_val is None:
                scale_val = clip_data.get("scale", 1)
            
            # Handle scale as number or dict
            if isinstance(scale_val, dict):
                scale_x = scale_val.get("x", 1)
                scale_y = scale_val.get("y", 1)
            else:
                scale_x = scale_y = scale_val
            
            position_val = self._interpolate_keyframes(keyframes, t, "position")
            if position_val is None:
                position_val = clip_data.get("position", {"x": 0, "y": 0})
            
            return (scale_x, scale_y, position_val.get("x", 0), position_val.get("y", 0))
        
        # Create a time-varying resize and position
        duration = clip.duration
        
        # Apply resize based on keyframes
        def resize_func(t):
            scale_x, scale_y, _, _ = make_frame(t)
            new_width = int(original_width * scale_x)
            new_height = int(original_height * scale_y)
            return (new_width, new_height)
        
        # Apply position based on keyframes
        def position_func(t):
            _, _, pos_x, pos_y = make_frame(t)
            return (pos_x, pos_y)
        
        # Apply the transforms
        clip = clip.resize(lambda t: resize_func(t))
        clip = clip.set_position(lambda t: position_func(t))
        
        return clip

    def _apply_static_transforms(
        self, clip, clip_data: Dict, original_width: int, original_height: int
    ):
        """
        Apply static (non-keyframed) transformations to a clip.
        
        Args:
            clip: MoviePy clip object
            clip_data: Clip data
            original_width: Original width
            original_height: Original height
            
        Returns:
            Transformed clip
        """
        # Apply scale
        scale = clip_data.get("scale", 1)
        if isinstance(scale, dict):
            scale_x = scale.get("x", 1)
            scale_y = scale.get("y", 1)
            clip = clip.resize(width=int(original_width * scale_x), height=int(original_height * scale_y))
        elif scale != 1:
            clip = clip.resize(scale)
        
        # Apply position
        position = clip_data.get("position")
        if position:
            clip = clip.set_position((position.get("x", 0), position.get("y", 0)))
        
        # Apply rotation
        rotation = clip_data.get("rotation")
        if rotation:
            clip = clip.rotate(rotation)
        
        # Apply opacity
        opacity = clip_data.get("opacity")
        if opacity is not None and opacity != 1:
            clip = clip.set_opacity(opacity)
        
        return clip

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
        Process a single video clip with trimming, transitions, and keyframe transforms.
        
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
            duration = clip_data.get("duration", 0)
            trim_start = clip_data.get("trimStart", 0)
            trim_end = clip_data.get("trimEnd", 0)
            transitions = clip_data.get("transitions", {})
            data = clip_data.get("data", {})
            clip_type = data.get("type", "video")
            
            # Find media file
            media_path = self._find_media_file(resource_id)
            if not media_path:
                return None
            
            # Load clip based on type
            if clip_type == "image":
                # Load image as clip
                clip = ImageClip(str(media_path), duration=duration)
                original_width = clip.w
                original_height = clip.h
            else:
                # Load video clip
                clip = VideoFileClip(str(media_path))
                
                # Apply trimming
                if trim_start > 0 or trim_end > 0:
                    clip = clip.subclip(trim_start, clip.duration - trim_end)
                
                original_width = clip.w
                original_height = clip.h
            
            # Apply keyframe transforms or static transforms
            clip = self._apply_keyframe_transforms(clip, clip_data, original_width, original_height)
            
            # Apply transitions
            clip = self._apply_transitions_dict(clip, transitions)
            
            # Set fps
            clip = clip.set_fps(fps)
            
            end_time = start_time + clip.duration
            
            return (clip, start_time, end_time)
            
        except Exception as e:
            print(f"Error processing video/image clip: {str(e)}")
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
        Apply transitions to a video clip (legacy list format).
        
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

    def _apply_transitions_dict(self, clip, transitions: Dict) -> VideoFileClip:
        """
        Apply transitions to a video clip (new dict format with 'in' and 'out').
        
        Args:
            clip: Video clip
            transitions: Dict with 'in' and 'out' transition objects
            
        Returns:
            Video clip with transitions applied
        """
        # Apply fade in transition
        if transitions.get("in"):
            trans_in = transitions["in"]
            trans_type = trans_in.get("type", "")
            trans_duration = trans_in.get("duration", 1.0)
            
            if trans_type == "fade":
                clip = fadein(clip, trans_duration)
        
        # Apply fade out transition
        if transitions.get("out"):
            trans_out = transitions["out"]
            trans_type = trans_out.get("type", "")
            trans_duration = trans_out.get("duration", 1.0)
            
            if trans_type == "fade":
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
