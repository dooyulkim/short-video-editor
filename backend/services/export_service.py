"""
Export Service for rendering final video from timeline data.
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

# Configure logger
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
        canvas_width: int, canvas_height: int
    ):
        """
        Apply keyframe-based transformations to a clip.

        Args:
            clip: MoviePy clip object
            clip_data: Clip data containing keyframes
            original_width: Original width of the clip
            original_height: Original height of the clip
            canvas_width: Canvas/output width for centering
            canvas_height: Canvas/output height for centering

        Returns:
            Transformed clip
        """
        keyframes = clip_data.get("keyframes")
        if not keyframes:
            # Apply static transforms
            return self._apply_static_transforms(
                clip, clip_data, original_width, original_height,
                canvas_width, canvas_height
            )

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

            # Handle scale as number or dict - apply directly without base scaling
            if isinstance(scale_val, dict):
                scale_x = scale_val.get("x", 1)
                scale_y = scale_val.get("y", 1)
            else:
                scale_x = scale_y = scale_val

            position_val = self._interpolate_keyframes(keyframes, t, "position")
            if position_val is None:
                position_val = clip_data.get("position", {"x": 0, "y": 0})

            # Calculate position - center clip if position is (0, 0)
            # Use ORIGINAL dimensions like frontend VideoPlayer
            if isinstance(position_val, dict):
                pos_x = position_val.get("x", 0)
                pos_y = position_val.get("y", 0)
            else:
                pos_x = 0
                pos_y = 0

            # Center clip using ORIGINAL dimensions (matching frontend)
            if pos_x == 0:
                pos_x = (canvas_width - original_width) / 2
            if pos_y == 0:
                pos_y = (canvas_height - original_height) / 2

            return (scale_x, scale_y, pos_x, pos_y)

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
        self, clip, clip_data: Dict, original_width: int, original_height: int,
        canvas_width: int, canvas_height: int
    ):
        """
        Apply static (non-keyframed) transformations to a clip.

        Args:
            clip: MoviePy clip object
            clip_data: Clip data
            original_width: Original width
            original_height: Original height
            canvas_width: Canvas/output width for centering
            canvas_height: Canvas/output height for centering

        Returns:
            Transformed clip
        """
        # Get user scale - apply directly without any base scaling
        # This matches frontend VideoPlayer behavior exactly
        user_scale = clip_data.get("scale", 1)
        if isinstance(user_scale, dict):
            scale_x = user_scale.get("x", 1)
            scale_y = user_scale.get("y", 1)
        else:
            scale_x = user_scale
            scale_y = user_scale

        # Calculate scaled dimensions
        scaled_width = int(original_width * scale_x)
        scaled_height = int(original_height * scale_y)

        logger.info(
            f"         Transform: original={original_width}x{original_height}, "
            f"scale={scale_x},{scale_y}, scaled={scaled_width}x{scaled_height}, "
            f"canvas={canvas_width}x{canvas_height}"
        )

        # Resize clip if scale is not 1
        if scale_x != 1 or scale_y != 1:
            clip = clip.resize(width=scaled_width, height=scaled_height)

        # Apply position - match frontend VideoPlayer centering logic exactly
        # Frontend: x = position.x !== 0 ? position.x : (canvasWidth - imgWidth) / 2
        # Note: Frontend uses ORIGINAL dimensions for centering calculation,
        # but the scaled dimensions are what's drawn
        position = clip_data.get("position", {})
        pos_x = position.get("x", 0) if position else 0
        pos_y = position.get("y", 0) if position else 0

        logger.info(f"         Raw position from clip: ({pos_x}, {pos_y})")

        # Center clip if position is (0, 0) - using ORIGINAL dimensions like frontend
        # This can result in negative positions for large images, which is correct
        if pos_x == 0:
            pos_x = (canvas_width - original_width) / 2
        if pos_y == 0:
            pos_y = (canvas_height - original_height) / 2

        logger.info(f"         Final position: ({pos_x}, {pos_y})")

        clip = clip.set_position((pos_x, pos_y))

        # Apply rotation
        rotation = clip_data.get("rotation")
        if rotation:
            clip = clip.rotate(rotation)

        # Apply opacity
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
            resolution: Resolution preset (1080p, 720p, 480p) - used as fallback
            fps: Frames per second for output video
            progress_callback: Optional callback function for progress updates
            width: Optional explicit width (overrides resolution preset)
            height: Optional explicit height (overrides resolution preset)

        Returns:
            Path to exported video file
        """
        logger.info(f"🎬 export_timeline called: resolution={resolution}, fps={fps}, output={output_path}")

        try:
            if progress_callback:
                progress_callback(0.0)

            # Get resolution dimensions - prefer explicit width/height, then timeline resolution, then preset
            if width and height:
                # Use explicit dimensions passed in
                pass
            elif timeline_data.get("resolution"):
                # Use timeline resolution (from frontend canvas size)
                timeline_res = timeline_data["resolution"]
                width = timeline_res.get("width", 1080)
                height = timeline_res.get("height", 1920)
            else:
                # Fall back to resolution preset
                width, height = self.resolutions.get(resolution, (1920, 1080))
            
            logger.info(f"   Output dimensions: {width}x{height}")

            # Extract layers from timeline data
            layers = timeline_data.get("layers", [])
            logger.info(f"   Processing {len(layers)} layers")

            # Calculate content duration based on the end of the last resource placed
            # This ensures we only export actual content, not empty timeline space
            content_duration = self._calculate_content_duration(layers)

            # Use content duration if available, otherwise fall back to timeline duration
            # but ensure we have at least some duration
            timeline_duration = timeline_data.get("duration", 0)
            duration = content_duration if content_duration > 0 else timeline_duration
            logger.info(
                f"   Content duration: {content_duration:.2f}s, "
                f"Timeline duration: {timeline_duration:.2f}s, Using: {duration:.2f}s"
            )

            if duration <= 0:
                logger.error("   No content to export: timeline has no clips")
                raise Exception("No content to export: timeline has no clips")

            if progress_callback:
                progress_callback(0.1)

            # Process video layers
            # Each layer is processed in order (index 0 = bottom, higher index = top)
            # Within a layer, clips are ordered by start time
            video_clips = []
            audio_clips = []
            text_clips = []

            # Track layer index for proper compositing order
            layer_index = 0

            for layer in layers:
                layer_type = layer.get("type", "video")
                clips = layer.get("clips", [])
                visible = layer.get("visible", True)
                muted = layer.get("muted", False)

                logger.info(
                    f"   Processing layer {layer_index}: type={layer_type}, "
                    f"clips={len(clips)}, visible={visible}, muted={muted}"
                )

                if not visible:
                    logger.info(f"      Skipping layer {layer_index} (not visible)")
                    layer_index += 1
                    continue

                if layer_type == "video":
                    for clip in clips:
                        clip_id = clip.get("id", "unknown")
                        resource_id = clip.get("resourceId", "unknown")
                        # Check if clip data indicates this is actually an image
                        clip_data = clip.get("data", {})
                        actual_clip_type = clip_data.get("type", None)
                        
                        # If type not explicitly set, try to detect from file extension
                        if actual_clip_type is None:
                            media_path = self._find_media_file(resource_id)
                            if media_path:
                                ext = media_path.suffix.lower()
                                if ext in ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg']:
                                    actual_clip_type = "image"
                                    logger.info(f"      Detected image type from extension: {ext}")
                                else:
                                    actual_clip_type = "video"
                            else:
                                actual_clip_type = "video"
                        
                        logger.info(f"      Processing clip {clip_id} (resource: {resource_id}, type: {actual_clip_type})")

                        # Process clip with the correct type (image or video)
                        processed_clip = self._process_video_clip(
                            clip, width, height, fps, muted=True, clip_type=actual_clip_type
                        )
                        if processed_clip:
                            video_clip, start_time, end_time = processed_clip
                            # Store with layer index for proper z-ordering
                            video_clips.append((video_clip, start_time, end_time, layer_index))
                            logger.info(f"         Clip processed: start={start_time:.2f}s, end={end_time:.2f}s")
                        else:
                            logger.warning(f"         Failed to process clip {clip_id}")

                        # Extract and add audio from video clip if layer is not muted
                        # Only extract audio from actual video clips, not images
                        if not muted and actual_clip_type == "video":
                            video_audio = self._extract_audio_from_video_clip(clip)
                            if video_audio:
                                audio_clips.append(video_audio)
                                logger.info("         Audio extracted from video clip")
                            else:
                                logger.info("         No audio in video clip or extraction failed")

                elif layer_type == "image":
                    # Process image layers - treat images like video clips for compositing
                    for clip in clips:
                        clip_id = clip.get("id", "unknown")
                        resource_id = clip.get("resourceId", "unknown")
                        logger.info(f"      Processing image clip {clip_id} (resource: {resource_id})")

                        # Process image clip (images have no audio)
                        processed_clip = self._process_video_clip(
                            clip, width, height, fps, muted=True, clip_type="image"
                        )
                        if processed_clip:
                            image_clip, start_time, end_time = processed_clip
                            # Store with layer index for proper z-ordering
                            video_clips.append((image_clip, start_time, end_time, layer_index))
                            logger.info(f"         Image clip processed: start={start_time:.2f}s, end={end_time:.2f}s")
                        else:
                            logger.warning(f"         Failed to process image clip {clip_id}")

                elif layer_type == "audio":
                    # Process audio layers
                    if not muted:
                        for clip in clips:
                            clip_id = clip.get("id", "unknown")
                            logger.info(f"      Processing audio clip {clip_id}")
                            processed_audio = self._process_audio_clip(clip)
                            if processed_audio:
                                audio_clips.append(processed_audio)
                                logger.info("         Audio clip processed")
                            else:
                                logger.warning(f"         Failed to process audio clip {clip_id}")

                elif layer_type == "text":
                    for clip in clips:
                        clip_id = clip.get("id", "unknown")
                        logger.info(f"      Processing text clip {clip_id}")
                        processed_text = self._process_text_clip(
                            clip, width, height, fps
                        )
                        if processed_text:
                            text_clips.append(processed_text)
                            logger.info("         Text clip processed")

                layer_index += 1

            logger.info(
                f"   Totals: {len(video_clips)} video clips, "
                f"{len(audio_clips)} audio clips, {len(text_clips)} text clips"
            )

            if progress_callback:
                progress_callback(0.3)

            # Sort video clips: first by layer (bottom to top), then by start time within each layer
            # This ensures proper layering - lower layers render first, higher layers on top
            video_clips.sort(key=lambda x: (x[3], x[1]))  # Sort by layer_index, then start_time
            logger.info("   Creating composite video...")

            # Create composite video with proper layering
            if video_clips:
                composite_video = self._create_composite_video(
                    [(clip, start, end) for clip, start, end, _ in video_clips],  # Remove layer_index for composite
                    duration, width, height, fps
                )
            else:
                # Create blank video if no video clips
                logger.info("   No video clips, creating blank video")
                composite_video = ColorClip(
                    size=(width, height),
                    color=(0, 0, 0),
                    duration=duration
                ).set_fps(fps)

            if progress_callback:
                progress_callback(0.5)

            # Add text overlays
            if text_clips:
                logger.info(f"   Adding {len(text_clips)} text overlays...")
                composite_video = self._add_text_overlays(
                    composite_video, text_clips
                )

            if progress_callback:
                progress_callback(0.7)

            # Mix audio tracks
            if audio_clips:
                logger.info(f"   Mixing {len(audio_clips)} audio tracks...")
                mixed_audio = self._mix_audio_tracks(audio_clips, duration)
                composite_video = composite_video.set_audio(mixed_audio)
                logger.info("   Audio mixed successfully")
            else:
                logger.info("   No audio tracks to mix")

            if progress_callback:
                progress_callback(0.8)

            # Write final video file
            output_path = str(self.output_dir / output_path)
            logger.info(f"   Writing final video to: {output_path}")
            composite_video.write_videofile(
                output_path,
                fps=fps,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=f'temp-audio-{uuid.uuid4()}.m4a',
                remove_temp=True,
                logger=None  # Suppress moviepy logging
            )
            logger.info("   Video file written successfully")

            # Clean up clips
            logger.info("   Cleaning up clips...")
            composite_video.close()
            for clip, _, _, _ in video_clips:  # 4 values: clip, start_time, end_time, layer_index
                clip.close()
            for audio, _, _ in audio_clips:
                audio.close()

            if progress_callback:
                progress_callback(1.0)

            logger.info(f"✅ Export completed: {output_path}")
            return output_path

        except Exception as e:
            logger.error(f"❌ Export failed: {str(e)}", exc_info=True)
            raise Exception(f"Export failed: {str(e)}")

    def _process_video_clip(
        self, clip_data: Dict, width: int, height: int, fps: int,
        muted: bool = False, clip_type: str = "video"
    ) -> Optional[tuple]:
        """
        Process a single video or image clip with trimming, transitions, and keyframe transforms.

        Args:
            clip_data: Clip data from timeline
            width: Target width
            height: Target height
            fps: Target fps
            muted: If True, remove audio from video clip
            clip_type: Type of clip - "video" or "image" (from layer type)

        Returns:
            Tuple of (clip, start_time, end_time) or None
        """
        try:
            resource_id = clip_data.get("resourceId")
            if not resource_id:
                logger.warning("         No resourceId in clip data")
                return None

            start_time = clip_data.get("startTime", 0)
            duration = clip_data.get("duration", 0)
            trim_start = clip_data.get("trimStart", 0)
            trim_end = clip_data.get("trimEnd", 0)
            transitions = clip_data.get("transitions", {})

            # Find media file
            media_path = self._find_media_file(resource_id)
            if not media_path:
                logger.warning(f"         Media file not found for resource: {resource_id}")
                return None

            logger.debug(f"         Loading {clip_type} from: {media_path}")

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
            # Pass canvas dimensions (width, height) for proper centering
            clip = self._apply_keyframe_transforms(
                clip, clip_data, original_width, original_height,
                width, height  # Canvas dimensions for centering
            )

            # Apply transitions
            clip = self._apply_transitions_dict(clip, transitions)

            # Remove audio if layer is muted (only for video clips, not images)
            if muted and clip_type == "video":
                clip = clip.without_audio()

            # Set fps
            clip = clip.set_fps(fps)

            end_time = start_time + clip.duration

            return (clip, start_time, end_time)

        except Exception as e:
            logger.error(f"         Error processing video/image clip: {str(e)}", exc_info=True)
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

            # Only extract audio from video clips, not images
            if clip_type != "video":
                return None

            # Find video file
            video_path = self._find_media_file(resource_id)
            if not video_path:
                logger.warning(f"         Video file not found for audio extraction: {resource_id}")
                return None

            # Load video clip to extract audio
            video = VideoFileClip(str(video_path))

            # Check if video has audio
            if video.audio is None:
                logger.debug("         Video has no audio track")
                video.close()
                return None

            # Extract audio
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

            # Note: We don't close the video here because the audio references it
            # It will be closed when the audio is closed during cleanup

            return (audio, start_time, volume)

        except Exception as e:
            logger.error(f"         Error extracting audio from video clip: {str(e)}", exc_info=True)
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
                logger.warning("         No resourceId in audio clip data")
                return None

            start_time = clip_data.get("startTime", 0)
            volume = clip_data.get("volume", 1.0)
            trim_start = clip_data.get("trimStart", 0)
            trim_end = clip_data.get("trimEnd", 0)

            # Find audio file
            audio_path = self._find_media_file(resource_id)
            if not audio_path:
                logger.warning(f"         Audio file not found: {resource_id}")
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
            logger.error(f"         Error processing audio clip: {str(e)}", exc_info=True)
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
            logger.info(f"         _process_text_clip received clip_data: {clip_data}")
            
            data = clip_data.get("data", {})
            start_time = clip_data.get("startTime", 0)
            duration = clip_data.get("duration", 5)

            text_content = data.get("text", "")
            font_family = data.get("fontFamily", "Arial")
            font_size = data.get("fontSize", 50)
            color = data.get("color", "white")
            
            logger.info(f"         Text content: '{text_content}', font: {font_family}, size: {font_size}, color: {color}")
            
            # Position can be at clip level or in data
            position = clip_data.get("position") or data.get("position", {"x": width // 2, "y": height // 2})
            
            # Handle scale and rotation
            scale = clip_data.get("scale", 1)
            if isinstance(scale, dict):
                scale_factor = (scale.get("x", 1) + scale.get("y", 1)) / 2
            else:
                scale_factor = scale
            
            scaled_font_size = int(font_size * scale_factor)
            rotation = clip_data.get("rotation", 0)
            pos_x = position.get("x", width // 2)
            pos_y = position.get("y", height // 2)
            
            logger.info(f"         Creating text clip: text='{text_content}', font={font_family}, size={scaled_font_size}, color={color}")

            # Try using MoviePy's TextClip (requires ImageMagick)
            try:
                txt_clip = TextClip(
                    text_content,
                    fontsize=scaled_font_size,
                    color=color,
                    font=font_family,
                    method='caption' if len(text_content) > 50 else 'label'
                )
                
                logger.info(f"         TextClip created successfully with ImageMagick, size: {txt_clip.size}")
                
            except (OSError, IOError) as e:
                # ImageMagick not available, use Pillow fallback
                logger.warning(f"         ImageMagick not available, using Pillow fallback: {e}")
                txt_clip = self._create_text_clip_with_pillow(
                    text_content, scaled_font_size, color, font_family
                )
                if txt_clip is None:
                    logger.error("         Pillow fallback also failed")
                    return None
                logger.info(f"         TextClip created with Pillow, size: {txt_clip.size}")

            # Apply rotation if present
            if rotation != 0:
                txt_clip = txt_clip.rotate(rotation)
                logger.info(f"         Applied rotation: {rotation} degrees")

            # Set position and duration
            logger.info(f"         Setting position: ({pos_x}, {pos_y}), duration: {duration}s, start_time: {start_time}s")
            
            txt_clip = txt_clip.set_position((pos_x, pos_y))
            txt_clip = txt_clip.set_duration(duration)
            txt_clip = txt_clip.set_fps(fps)

            end_time = start_time + duration
            
            logger.info(f"         Text clip ready: start={start_time}s, end={end_time}s")

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
            logger.error(f"         Error creating text with Pillow: {str(e)}", exc_info=True)
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
        logger.debug(f"   _create_composite_video: {len(video_clips)} clips, duration={duration:.2f}s")

        # Set start times for all clips
        positioned_clips = []
        for clip, start_time, end_time in video_clips:
            clip = clip.set_start(start_time)
            positioned_clips.append(clip)
            logger.debug(f"      Positioned clip at start={start_time:.2f}s")

        # Create composite
        if positioned_clips:
            final_clip = CompositeVideoClip(
                positioned_clips,
                size=(width, height)
            ).set_duration(duration).set_fps(fps)
            logger.debug(f"   Composite created with {len(positioned_clips)} clips")
        else:
            # Create blank video
            logger.debug("   Creating blank video (no clips)")
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
        logger.debug(f"   _mix_audio_tracks: {len(audio_clips)} audio clips, duration={duration:.2f}s")

        positioned_audio = []
        for audio, start_time, volume in audio_clips:
            audio = audio.set_start(start_time)
            positioned_audio.append(audio)
            logger.debug(f"      Audio positioned at start={start_time:.2f}s, volume={volume}")

        if positioned_audio:
            logger.debug(f"   Creating composite audio with {len(positioned_audio)} tracks")
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
                logger.info(f"🧹 Cleaned up export file: {file_path}")
        except Exception as e:
            logger.error(f"Error cleaning up file: {str(e)}")
