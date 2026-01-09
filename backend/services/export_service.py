"""
Export Service for rendering final video from timeline data.
Optimized for performance with minimal overhead.
"""
import uuid
import logging
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

# Configure logger - set to INFO level for cleaner output
logger = logging.getLogger("video-editor.export_service")


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
        self, clip, clip_data: Dict, original_width: int, original_height: int,
        canvas_width: int, canvas_height: int,
        source_width: int = None, source_height: int = None
    ):
        """
        Apply keyframe-based transformations to a clip.

        Args:
            clip: MoviePy clip object
            clip_data: Clip data containing keyframes
            original_width: Original width of the clip
            original_height: Original height of the clip
            canvas_width: Export canvas width
            canvas_height: Export canvas height
            source_width: Source canvas width (for scaling)
            source_height: Source canvas height (for scaling)

        Returns:
            Transformed clip
        """
        # Use source dimensions if provided, otherwise use canvas dimensions
        if source_width is None:
            source_width = canvas_width
        if source_height is None:
            source_height = canvas_height
            
        keyframes = clip_data.get("keyframes")
        if not keyframes:
            # Apply static transforms
            return self._apply_static_transforms(
                clip, clip_data, original_width, original_height,
                canvas_width, canvas_height,
                source_width=source_width, source_height=source_height
            )

        # Calculate canvas-to-canvas scale factors
        canvas_scale_x = canvas_width / source_width if source_width > 0 else 1.0
        canvas_scale_y = canvas_height / source_height if source_height > 0 else 1.0

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

        # Apply time-varying scale and position with canvas scaling
        def make_frame(t):
            scale_val = self._interpolate_keyframes(keyframes, t, "scale")
            if scale_val is None:
                scale_val = clip_data.get("scale", 1)

            # Handle scale as number or dict
            if isinstance(scale_val, dict):
                user_scale_x = scale_val.get("x", 1)
                user_scale_y = scale_val.get("y", 1)
            else:
                user_scale_x = scale_val
                user_scale_y = scale_val

            position_val = self._interpolate_keyframes(keyframes, t, "position")
            if position_val is None:
                position_val = clip_data.get("position", {"x": 0, "y": 0})

            # Calculate position - scale from source to export canvas
            if isinstance(position_val, dict):
                raw_pos_x = position_val.get("x", 0)
                raw_pos_y = position_val.get("y", 0)
            else:
                raw_pos_x = 0
                raw_pos_y = 0

            # ============================================================
            # FILL MODE: When position is (0,0) and scale is 1 (default),
            # stretch the video to fill the entire export canvas.
            # ============================================================
            is_default_transform = (
                raw_pos_x == 0 and raw_pos_y == 0
                and user_scale_x == 1 and user_scale_y == 1
            )
            
            if is_default_transform:
                # FILL MODE: Stretch video to fill entire export canvas
                final_scale_x = canvas_width / original_width if original_width > 0 else 1.0
                final_scale_y = canvas_height / original_height if original_height > 0 else 1.0
                pos_x = 0
                pos_y = 0
            else:
                # PRESERVE MODE: Scale proportionally from preview to export canvas
                final_scale_x = user_scale_x * canvas_scale_x
                final_scale_y = user_scale_y * canvas_scale_y
                
                # Calculate scaled dimensions
                scaled_width = int(original_width * final_scale_x)
                scaled_height = int(original_height * final_scale_y)
                
                # Scale positions proportionally
                pos_x = raw_pos_x * canvas_scale_x
                pos_y = raw_pos_y * canvas_scale_y

            return (final_scale_x, final_scale_y, pos_x, pos_y)

        # Apply resize based on keyframes
        def resize_func(t):
            final_scale_x, final_scale_y, _, _ = make_frame(t)
            new_width = int(original_width * final_scale_x)
            new_height = int(original_height * final_scale_y)
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
        self, clip, clip_data: Dict, original_width: int, original_height: int,
        canvas_width: int, canvas_height: int,
        source_width: int = None, source_height: int = None
    ):
        """
        Apply static transformations to a clip.
        Scales from source canvas (preview) to export canvas dimensions.

        Args:
            clip: MoviePy clip object
            clip_data: Clip data
            original_width: Original width of the media
            original_height: Original height of the media
            canvas_width: Export canvas width
            canvas_height: Export canvas height
            source_width: Source canvas width (for scaling)
            source_height: Source canvas height (for scaling)

        Returns:
            Transformed clip
        """
        # Use source dimensions if provided, otherwise use canvas dimensions
        if source_width is None:
            source_width = canvas_width
        if source_height is None:
            source_height = canvas_height
            
        # Get user scale from clip data
        user_scale = clip_data.get("scale", 1)
        if isinstance(user_scale, dict):
            user_scale_x = user_scale.get("x", 1)
            user_scale_y = user_scale.get("y", 1)
        else:
            user_scale_x = user_scale
            user_scale_y = user_scale

        # Get position from clip data
        position = clip_data.get("position", {})
        pos_x = position.get("x", 0) if position else 0
        pos_y = position.get("y", 0) if position else 0

        # Check if default transform (fill mode)
        is_default_transform = (
            pos_x == 0 and pos_y == 0
            and user_scale_x == 1 and user_scale_y == 1
        )

        if is_default_transform:
            # FILL MODE: Stretch video to fill entire export canvas
            scaled_width = canvas_width
            scaled_height = canvas_height
            final_pos_x = 0
            final_pos_y = 0
        else:
            # PRESERVE MODE: Scale proportionally from preview to export canvas
            canvas_scale_x = canvas_width / source_width if source_width > 0 else 1.0
            canvas_scale_y = canvas_height / source_height if source_height > 0 else 1.0
            
            final_scale_x = user_scale_x * canvas_scale_x
            final_scale_y = user_scale_y * canvas_scale_y
            
            scaled_width = int(original_width * final_scale_x)
            scaled_height = int(original_height * final_scale_y)

            # Scale positions proportionally
            final_pos_x = pos_x * canvas_scale_x
            final_pos_y = pos_y * canvas_scale_y

        # Resize clip
        clip = clip.resize(width=scaled_width, height=scaled_height)
        clip = clip.set_position((final_pos_x, final_pos_y))

        # Apply rotation if present
        rotation = clip_data.get("rotation")
        if rotation:
            clip = clip.rotate(rotation)

        # Apply opacity if not 1
        opacity = clip_data.get("opacity")
        if opacity is not None and opacity != 1:
            clip = clip.set_opacity(opacity)

        return clip

    def _calculate_content_duration(self, layers: List[Dict]) -> float:
        """
        Calculate the actual content duration based on the end time of the last resource placed.
        This ensures the exported video only includes the actual content, not empty timeline space.

        Args:
            layers: List of timeline layers with clips

        Returns:
            The end time of the last clip, or 0 if no clips exist
        """
        max_end_time = 0.0

        for layer in layers:
            clips = layer.get("clips", [])
            for clip in clips:
                start_time = clip.get("startTime", 0)
                duration = clip.get("duration", 0)
                clip_end_time = start_time + duration
                if clip_end_time > max_end_time:
                    max_end_time = clip_end_time

        return max_end_time

    def export_timeline(
        self,
        timeline_data: Dict,
        output_path: str,
        resolution: str = "1080p",
        fps: int = 30,
        progress_callback: Optional[Callable[[float], None]] = None,
        width: Optional[int] = None,
        height: Optional[int] = None
    ) -> str:
        """
        Export timeline to final video file.

        Args:
            timeline_data: Timeline JSON with layers and clips
            output_path: Path for output video file
            resolution: Resolution preset (1080p, 720p, 480p) - fallback
            fps: Frames per second for output video
            progress_callback: Optional callback for progress updates
            width: Optional explicit width
            height: Optional explicit height

        Returns:
            Path to exported video file
        """
        logger.info(f"🎬 Starting export: {width}x{height} @ {fps}fps")

        try:
            if progress_callback:
                progress_callback(0.0)

            # Get resolution dimensions
            if not (width and height):
                if timeline_data.get("resolution"):
                    timeline_res = timeline_data["resolution"]
                    width = timeline_res.get("width", 1080)
                    height = timeline_res.get("height", 1920)
                else:
                    width, height = self.resolutions.get(resolution, (1920, 1080))
            
            # Get source resolution for scaling positions
            source_res = timeline_data.get("sourceResolution", {})
            source_width = source_res.get("width", width)
            source_height = source_res.get("height", height)

            layers = timeline_data.get("layers", [])

            # Calculate content duration based on the end of the last resource placed
            content_duration = self._calculate_content_duration(layers)
            timeline_duration = timeline_data.get("duration", 0)
            duration = content_duration if content_duration > 0 else timeline_duration

            if duration <= 0:
                raise Exception("No content to export: timeline has no clips")

            if progress_callback:
                progress_callback(0.1)

            # Process layers
            video_clips = []
            audio_clips = []
            text_clips = []
            layer_index = 0

            for layer in layers:
                layer_type = layer.get("type", "video")
                clips = layer.get("clips", [])
                visible = layer.get("visible", True)
                muted = layer.get("muted", False)

                if not visible:
                    layer_index += 1
                    continue

                if layer_type == "video":
                    for clip in clips:
                        resource_id = clip.get("resourceId", "unknown")
                        clip_data = clip.get("data", {})
                        actual_clip_type = clip_data.get("type", None)
                        
                        # Detect type from file extension if not set
                        if actual_clip_type is None:
                            media_path = self._find_media_file(resource_id)
                            if media_path:
                                ext = media_path.suffix.lower()
                                actual_clip_type = "image" if ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'] else "video"
                            else:
                                actual_clip_type = "video"

                        processed_clip = self._process_video_clip(
                            clip, width, height, fps, muted=True, clip_type=actual_clip_type,
                            source_width=source_width, source_height=source_height
                        )
                        if processed_clip:
                            video_clip, start_time, end_time = processed_clip
                            video_clips.append((video_clip, start_time, end_time, layer_index))

                        # Extract audio from video clips if layer is not muted
                        if not muted and actual_clip_type == "video":
                            video_audio = self._extract_audio_from_video_clip(clip)
                            if video_audio:
                                audio_clips.append(video_audio)

                elif layer_type == "image":
                    for clip in clips:
                        processed_clip = self._process_video_clip(
                            clip, width, height, fps, muted=True, clip_type="image",
                            source_width=source_width, source_height=source_height
                        )
                        if processed_clip:
                            image_clip, start_time, end_time = processed_clip
                            video_clips.append((image_clip, start_time, end_time, layer_index))

                elif layer_type == "audio":
                    if not muted:
                        for clip in clips:
                            processed_audio = self._process_audio_clip(clip)
                            if processed_audio:
                                audio_clips.append(processed_audio)

                elif layer_type == "text":
                    for clip in clips:
                        processed_text = self._process_text_clip(
                            clip, width, height, fps,
                            source_width=source_width, source_height=source_height
                        )
                        if processed_text:
                            text_clips.append(processed_text)

                layer_index += 1

            logger.info(f"Processing: {len(video_clips)} video, {len(audio_clips)} audio, {len(text_clips)} text clips")

            if progress_callback:
                progress_callback(0.3)

            # Sort by layer then start time for proper z-ordering
            video_clips.sort(key=lambda x: (x[3], x[1]))

            # Create composite video
            if video_clips:
                composite_video = self._create_composite_video(
                    [(clip, start, end) for clip, start, end, _ in video_clips],
                    duration, width, height, fps
                )
            else:
                composite_video = ColorClip(
                    size=(width, height),
                    color=(0, 0, 0),
                    duration=duration
                ).set_fps(fps)

            if progress_callback:
                progress_callback(0.5)

            # Add text overlays
            if text_clips:
                composite_video = self._add_text_overlays(composite_video, text_clips)

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
            logger.info(f"Writing video: {output_path}")
            
            # Optimized encoding for fast export
            # 'ultrafast' preset is ~5-10x faster than 'medium' with slightly larger file
            composite_video.write_videofile(
                output_path,
                fps=fps,
                codec='libx264',
                audio_codec='aac',
                preset='ultrafast',  # Fastest encoding
                threads=0,  # Auto-detect optimal thread count
                ffmpeg_params=[
                    '-crf', '23',  # Quality (18-28, lower=better)
                    '-movflags', '+faststart',  # Fast web playback
                ],
                temp_audiofile=f'temp-audio-{uuid.uuid4()}.m4a',
                remove_temp=True,
                logger=None
            )

            # Clean up clips
            composite_video.close()
            for clip, _, _, _ in video_clips:
                clip.close()
            for audio, _, _ in audio_clips:
                audio.close()

            if progress_callback:
                progress_callback(1.0)

            logger.info(f"✅ Export completed: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"❌ Export failed: {str(e)}")
            raise Exception(f"Export failed: {str(e)}")

    def _process_video_clip(
        self, clip_data: Dict, width: int, height: int, fps: int,
        muted: bool = False, clip_type: str = "video",
        source_width: int = None, source_height: int = None
    ) -> Optional[tuple]:
        """
        Process a single video or image clip with trimming, transitions, and transforms.

        Args:
            clip_data: Clip data from timeline
            width: Target/export width
            height: Target/export height
            fps: Target fps
            muted: If True, remove audio from video clip
            clip_type: Type of clip - "video" or "image"
            source_width: Source canvas width (for scaling)
            source_height: Source canvas height (for scaling)

        Returns:
            Tuple of (clip, start_time, end_time) or None
        """
        try:
            resource_id = clip_data.get("resourceId")
            if not resource_id:
                return None

            start_time = clip_data.get("startTime", 0)
            duration = clip_data.get("duration", 0)
            trim_start = clip_data.get("trimStart", 0)
            trim_end = clip_data.get("trimEnd", 0)
            transitions = clip_data.get("transitions", {})

            # Find media file
            media_path = self._find_media_file(resource_id)
            if not media_path:
                logger.warning(f"Media file not found: {resource_id}")
                return None

            # Load clip based on type
            if clip_type == "image":
                clip = ImageClip(str(media_path), duration=duration)
                original_width = clip.w
                original_height = clip.h
            else:
                clip = VideoFileClip(str(media_path))
                # Apply trimming
                if trim_start > 0 or trim_end > 0:
                    clip = clip.subclip(trim_start, clip.duration - trim_end)
                original_width = clip.w
                original_height = clip.h

            # Apply transforms
            clip = self._apply_keyframe_transforms(
                clip, clip_data, original_width, original_height,
                width, height,
                source_width=source_width, source_height=source_height
            )

            # Apply transitions
            clip = self._apply_transitions_dict(clip, transitions)

            # Remove audio if muted (only for video clips)
            if muted and clip_type == "video":
                clip = clip.without_audio()

            clip = clip.set_fps(fps)
            end_time = start_time + clip.duration

            return (clip, start_time, end_time)

        except Exception as e:
            logger.error(f"Error processing clip: {str(e)}")
            return None

    def _extract_audio_from_video_clip(self, clip_data: Dict) -> Optional[tuple]:
        """
        Extract audio track from a video clip for mixing.

        Args:
            clip_data: Clip data from timeline

        Returns:
            Tuple of (audio, start_time, volume) or None
        """
        try:
            resource_id = clip_data.get("resourceId")
            if not resource_id:
                return None

            start_time = clip_data.get("startTime", 0)
            duration = clip_data.get("duration", 0)
            trim_start = clip_data.get("trimStart", 0)
            trim_end = clip_data.get("trimEnd", 0)
            volume = clip_data.get("volume", 1.0)
            data = clip_data.get("data", {})
            clip_type = data.get("type", "video")

            # Only extract audio from video clips
            if clip_type != "video":
                return None

            video_path = self._find_media_file(resource_id)
            if not video_path:
                return None

            video = VideoFileClip(str(video_path))

            if video.audio is None:
                video.close()
                return None

            audio = video.audio

            # Apply trimming
            if trim_start > 0 or trim_end > 0:
                audio = audio.subclip(trim_start, video.duration - trim_end)

            # Ensure audio matches clip duration
            if duration > 0 and audio.duration > duration:
                audio = audio.set_duration(duration)

            # Apply volume
            if volume != 1.0:
                audio = audio.volumex(volume)

            return (audio, start_time, volume)

        except Exception as e:
            logger.error(f"Error extracting audio: {str(e)}")
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
            if not resource_id:
                return None

            start_time = clip_data.get("startTime", 0)
            volume = clip_data.get("volume", 1.0)
            trim_start = clip_data.get("trimStart", 0)
            trim_end = clip_data.get("trimEnd", 0)

            audio_path = self._find_media_file(resource_id)
            if not audio_path:
                return None

            audio = AudioFileClip(str(audio_path))

            # Apply trimming
            if trim_start > 0 or trim_end > 0:
                audio = audio.subclip(trim_start, audio.duration - trim_end)

            # Apply volume
            if volume != 1.0:
                audio = audio.volumex(volume)

            return (audio, start_time, volume)

        except Exception as e:
            logger.error(f"Error processing audio clip: {str(e)}")
            return None

    def _process_text_clip(
        self, clip_data: Dict, width: int, height: int, fps: int,
        source_width: int = None, source_height: int = None
    ) -> Optional[tuple]:
        """
        Process a single text clip.

        Args:
            clip_data: Clip data from timeline
            width: Export video width
            height: Export video height
            fps: Target fps
            source_width: Source canvas width (for scaling)
            source_height: Source canvas height (for scaling)

        Returns:
            Tuple of (text_clip, start_time, end_time) or None
        """
        try:
            # Use source dimensions if provided
            if source_width is None:
                source_width = width
            if source_height is None:
                source_height = height
            
            # Calculate canvas scale
            canvas_scale_x = width / source_width if source_width > 0 else 1.0
            canvas_scale_y = height / source_height if source_height > 0 else 1.0
            
            data = clip_data.get("data", {})
            start_time = clip_data.get("startTime", 0)
            duration = clip_data.get("duration", 5)

            text_content = data.get("text", "")
            font_family = data.get("fontFamily", "Arial")
            font_size = data.get("fontSize", 50)
            color = data.get("color", "white")
            
            # Position can be at clip level or in data
            position = clip_data.get("position") or data.get("position", {"x": source_width // 2, "y": source_height // 2})
            
            # Handle scale
            scale = clip_data.get("scale", 1)
            if isinstance(scale, dict):
                scale_factor = (scale.get("x", 1) + scale.get("y", 1)) / 2
            else:
                scale_factor = scale
            
            # Scale font size for export resolution
            avg_canvas_scale = (canvas_scale_x + canvas_scale_y) / 2
            scaled_font_size = int(font_size * scale_factor * avg_canvas_scale)
            rotation = clip_data.get("rotation", 0)
            
            # Scale positions
            pos_x = int(position.get("x", source_width // 2) * canvas_scale_x)
            pos_y = int(position.get("y", source_height // 2) * canvas_scale_y)

            # Create TextClip
            try:
                txt_clip = TextClip(
                    text_content,
                    fontsize=scaled_font_size,
                    color=color,
                    font=font_family,
                    method='caption' if len(text_content) > 50 else 'label'
                )
            except (OSError, IOError):
                # ImageMagick not available, use Pillow fallback
                txt_clip = self._create_text_clip_with_pillow(
                    text_content, scaled_font_size, color, font_family
                )
                if txt_clip is None:
                    return None

            # Apply rotation if present
            if rotation != 0:
                txt_clip = txt_clip.rotate(rotation)

            txt_clip = txt_clip.set_position((pos_x, pos_y))
            txt_clip = txt_clip.set_duration(duration)
            txt_clip = txt_clip.set_fps(fps)

            end_time = start_time + duration

            return (txt_clip, start_time, end_time)

        except Exception as e:
            logger.error(f"         Error processing text clip: {str(e)}", exc_info=True)
            return None
    
    def _create_text_clip_with_pillow(
        self, text: str, font_size: int, color: str, font_family: str
    ):
        """
        Create a text clip using Pillow (PIL) as a fallback when ImageMagick is not available.
        
        Args:
            text: Text content to render
            font_size: Font size in pixels
            color: Text color (hex or name)
            font_family: Font family name
            
        Returns:
            ImageClip with rendered text or None if failed
        """
        try:
            from PIL import Image, ImageDraw, ImageFont
            import numpy as np
            
            # Convert color from hex or name to RGB
            if color.startswith('#'):
                # Hex color
                hex_color = color.lstrip('#')
                rgb_color = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
            else:
                # Named color - try to match common colors
                color_map = {
                    'white': (255, 255, 255),
                    'black': (0, 0, 0),
                    'red': (255, 0, 0),
                    'green': (0, 255, 0),
                    'blue': (0, 0, 255),
                    'yellow': (255, 255, 0),
                    'cyan': (0, 255, 255),
                    'magenta': (255, 0, 255),
                    'orange': (255, 165, 0),
                    'purple': (128, 0, 128),
                    'pink': (255, 192, 203),
                    'gray': (128, 128, 128),
                    'grey': (128, 128, 128),
                }
                rgb_color = color_map.get(color.lower(), (255, 255, 255))
            
            # Try to load font, fallback to default if not found
            font = None
            try:
                # Try system font paths
                font_paths = [
                    f"C:/Windows/Fonts/{font_family}.ttf",
                    f"C:/Windows/Fonts/{font_family.lower()}.ttf",
                    f"/usr/share/fonts/truetype/{font_family.lower()}.ttf",
                    f"/usr/share/fonts/TTF/{font_family}.ttf",
                ]
                for font_path in font_paths:
                    try:
                        font = ImageFont.truetype(font_path, font_size)
                        break
                    except:
                        continue
                
                if font is None:
                    # Try loading by name (works if font is installed)
                    font = ImageFont.truetype(font_family, font_size)
                    
            except Exception:
                # Use default font with size
                try:
                    font = ImageFont.load_default()
                    logger.warning(f"         Could not load font '{font_family}', using default")
                except:
                    font = None
            
            # Calculate text size
            if font:
                # Create a dummy image to get text bounding box
                dummy_img = Image.new('RGBA', (1, 1), (0, 0, 0, 0))
                dummy_draw = ImageDraw.Draw(dummy_img)
                bbox = dummy_draw.textbbox((0, 0), text, font=font)
                text_width = bbox[2] - bbox[0]
                text_height = bbox[3] - bbox[1]
            else:
                # Estimate size without font metrics
                text_width = len(text) * font_size // 2
                text_height = font_size
            
            # Add padding
            padding = 10
            img_width = text_width + padding * 2
            img_height = text_height + padding * 2
            
            # Create RGBA image (transparent background)
            img = Image.new('RGBA', (img_width, img_height), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)
            
            # Draw text with color and alpha
            text_color = rgb_color + (255,)  # Add full alpha
            if font:
                draw.text((padding, padding), text, font=font, fill=text_color)
            else:
                draw.text((padding, padding), text, fill=text_color)
            
            # Convert to numpy array for MoviePy
            img_array = np.array(img)
            
            # Create ImageClip from the array
            clip = ImageClip(img_array, ismask=False)
            
            return clip
            
        except Exception as e:
            logger.error(f"Error creating text with Pillow: {str(e)}")
            return None

    def _apply_transitions_dict(self, clip, transitions) -> VideoFileClip:
        """
        Apply fade transitions to a video clip.

        Args:
            clip: Video clip
            transitions: Dict with 'in' and 'out' transition objects, or empty list

        Returns:
            Video clip with transitions applied
        """
        if not transitions or not isinstance(transitions, dict):
            return clip
            
        # Apply fade in transition
        if transitions.get("in"):
            trans_in = transitions["in"]
            if trans_in.get("type") == "fade":
                clip = fadein(clip, trans_in.get("duration", 1.0))

        # Apply fade out transition
        if transitions.get("out"):
            trans_out = transitions["out"]
            if trans_out.get("type") == "fade":
                clip = fadeout(clip, trans_out.get("duration", 1.0))

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
        positioned_clips = []
        for clip, start_time, end_time in video_clips:
            clip = clip.set_start(start_time)
            positioned_clips.append(clip)

        if positioned_clips:
            return CompositeVideoClip(
                positioned_clips,
                size=(width, height)
            ).set_duration(duration).set_fps(fps)
        else:
            return ColorClip(
                size=(width, height),
                color=(0, 0, 0),
                duration=duration
            ).set_fps(fps)

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
            logger.error(f"Error cleaning up file: {str(e)}")
