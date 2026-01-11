"""
Export Service for rendering final video from timeline data.
Optimized for performance using ffmpeg-python for video processing.
"""
import uuid
import logging
import subprocess
import tempfile
import os
import shutil
from typing import Dict, List, Callable, Optional, Union
from pathlib import Path
import ffmpeg

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
        self.temp_dir = Path(tempfile.gettempdir()) / "video_editor_export"
        self.temp_dir.mkdir(exist_ok=True)

        # Resolution presets
        self.resolutions = {
            "1080p": (1920, 1080),
            "720p": (1280, 720),
            "480p": (854, 480)
        }

    def _get_media_info(self, file_path: str) -> Dict:
        """
        Get media file information using ffprobe.

        Args:
            file_path: Path to media file

        Returns:
            Dict with width, height, duration, has_audio, fps
        """
        try:
            probe = ffmpeg.probe(file_path)
            video_info = next(
                (s for s in probe['streams'] if s['codec_type'] == 'video'),
                None
            )
            audio_info = next(
                (s for s in probe['streams'] if s['codec_type'] == 'audio'),
                None
            )

            result = {
                'width': int(video_info['width']) if video_info else 0,
                'height': int(video_info['height']) if video_info else 0,
                'duration': float(probe['format'].get('duration', 0)),
                'has_audio': audio_info is not None,
                'fps': 30  # Default fps
            }

            # Parse fps from video stream
            if video_info and 'r_frame_rate' in video_info:
                fps_parts = video_info['r_frame_rate'].split('/')
                if len(fps_parts) == 2 and int(fps_parts[1]) > 0:
                    result['fps'] = int(fps_parts[0]) / int(fps_parts[1])
                elif fps_parts[0].isdigit():
                    result['fps'] = int(fps_parts[0])

            return result
        except Exception as e:
            logger.warning(f"Error probing media file {file_path}: {e}")
            return {
                'width': 0, 'height': 0, 'duration': 0,
                'has_audio': False, 'fps': 30
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
                return next_val

        return None

    def _calculate_content_duration(self, layers: List[Dict]) -> float:
        """
        Calculate the actual content duration based on the end time of the last resource placed.

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

    def _find_media_file(self, resource_id: str) -> Optional[Path]:
        """
        Find media file by resource ID.

        Args:
            resource_id: Resource ID to find

        Returns:
            Path to media file or None
        """
        for ext in ['.mp4', '.mov', '.avi', '.mp3', '.wav', '.m4a', '.jpg', '.png', '.jpeg', '.gif', '.webp']:
            file_path = self.uploads_dir / f"{resource_id}{ext}"
            if file_path.exists():
                return file_path
        return None

    def _create_text_image(
        self, text: str, font_size: int, color: str, font_family: str,
        width: int, height: int, pos_x: int = None, pos_y: int = None
    ) -> Optional[str]:
        """
        Create a text image using Pillow.

        Args:
            text: Text content
            font_size: Font size in pixels
            color: Text color
            font_family: Font family name
            width: Canvas width
            height: Canvas height
            pos_x: X position for text (None = center)
            pos_y: Y position for text (None = center)

        Returns:
            Path to generated PNG image or None
        """
        try:
            from PIL import Image, ImageDraw, ImageFont

            # Convert color from hex or name to RGB
            if color.startswith('#'):
                hex_color = color.lstrip('#')
                rgb_color = tuple(int(hex_color[i:i + 2], 16) for i in (0, 2, 4))
            else:
                color_map = {
                    'white': (255, 255, 255), 'black': (0, 0, 0),
                    'red': (255, 0, 0), 'green': (0, 255, 0),
                    'blue': (0, 0, 255), 'yellow': (255, 255, 0),
                    'cyan': (0, 255, 255), 'magenta': (255, 0, 255),
                    'orange': (255, 165, 0), 'purple': (128, 0, 128),
                    'pink': (255, 192, 203), 'gray': (128, 128, 128),
                }
                rgb_color = color_map.get(color.lower(), (255, 255, 255))

            # Try to load font
            font = None
            try:
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
                    except (IOError, OSError):
                        continue
                if font is None:
                    font = ImageFont.truetype(font_family, font_size)
            except (IOError, OSError):
                font = ImageFont.load_default()

            # Create transparent image
            img = Image.new('RGBA', (width, height), (0, 0, 0, 0))
            draw = ImageDraw.Draw(img)

            # Get text bounding box
            bbox = draw.textbbox((0, 0), text, font=font)
            text_width = bbox[2] - bbox[0]
            text_height = bbox[3] - bbox[1]

            # Use provided position or center
            if pos_x is not None:
                x = pos_x
            else:
                x = (width - text_width) // 2
            
            if pos_y is not None:
                y = pos_y
            else:
                y = (height - text_height) // 2

            # Draw text with alpha
            draw.text((x, y), text, font=font, fill=rgb_color + (255,))

            # Save to temp file
            output_path = str(self.temp_dir / f"text_{uuid.uuid4()}.png")
            img.save(output_path, 'PNG')

            return output_path
        except Exception as e:
            logger.error(f"Error creating text image: {e}")
            return None

    def _get_transition_filter(
        self, transition_type: str, duration: float, direction: str = "left"
    ) -> str:
        """
        Get FFmpeg xfade filter parameters for transition type.

        Args:
            transition_type: Type of transition (fade, dissolve, wipe, slide)
            duration: Transition duration in seconds
            direction: Direction for directional transitions

        Returns:
            FFmpeg xfade transition name
        """
        if transition_type in ("fade", "dissolve"):
            return "fade"
        elif transition_type == "wipe":
            direction_map = {
                'left': 'wipeleft', 'right': 'wiperight',
                'up': 'wipeup', 'down': 'wipedown'
            }
            return direction_map.get(direction, 'wipeleft')
        elif transition_type == "slide":
            direction_map = {
                'left': 'slideleft', 'right': 'slideright',
                'up': 'slideup', 'down': 'slidedown'
            }
            return direction_map.get(direction, 'slideleft')
        return "fade"

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
        Export timeline to final video file using FFmpeg.

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
        logger.info(f"Starting export: {width}x{height} @ {fps}fps")

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

            # Calculate content duration
            content_duration = self._calculate_content_duration(layers)
            timeline_duration = timeline_data.get("duration", 0)
            duration = content_duration if content_duration > 0 else timeline_duration

            if duration <= 0:
                raise Exception("No content to export: timeline has no clips")

            if progress_callback:
                progress_callback(0.1)

            # Collect all clips
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

                        video_clips.append({
                            'clip': clip,
                            'type': actual_clip_type,
                            'layer_index': layer_index,
                            'muted': muted
                        })

                        # Extract audio from video clips if not muted
                        # Check if video has audio stream first
                        if not muted and actual_clip_type == "video":
                            media_path_for_audio = self._find_media_file(resource_id)
                            if media_path_for_audio:
                                media_info = self._get_media_info(str(media_path_for_audio))
                                if media_info.get('has_audio', False):
                                    audio_clips.append({
                                        'clip': clip,
                                        'type': 'video_audio',
                                        'layer_index': layer_index
                                    })

                elif layer_type == "image":
                    for clip in clips:
                        video_clips.append({
                            'clip': clip,
                            'type': 'image',
                            'layer_index': layer_index,
                            'muted': True
                        })

                elif layer_type == "audio":
                    if not muted:
                        for clip in clips:
                            audio_clips.append({
                                'clip': clip,
                                'type': 'audio',
                                'layer_index': layer_index
                            })

                elif layer_type == "text":
                    for clip in clips:
                        text_clips.append({
                            'clip': clip,
                            'layer_index': layer_index
                        })

                layer_index += 1

            logger.info(f"Processing: {len(video_clips)} video, {len(audio_clips)} audio, {len(text_clips)} text clips")

            if progress_callback:
                progress_callback(0.3)

            # Sort video clips by layer then start time
            video_clips.sort(key=lambda x: (x['layer_index'], x['clip'].get('startTime', 0)))

            # Build FFmpeg command using complex filter
            full_output_path = str(self.output_dir / output_path)
            temp_files = []

            try:
                # Process each clip individually and create intermediate files
                processed_video_paths = []
                processed_audio_paths = []

                for i, video_item in enumerate(video_clips):
                    clip_data = video_item['clip']
                    clip_type = video_item['type']

                    resource_id = clip_data.get("resourceId")
                    if not resource_id:
                        continue

                    media_path = self._find_media_file(resource_id)
                    if not media_path:
                        logger.warning(f"Media file not found: {resource_id}")
                        continue

                    start_time = clip_data.get("startTime", 0)
                    clip_duration = clip_data.get("duration", 0)
                    trim_start = clip_data.get("trimStart", 0)
                    trim_end = clip_data.get("trimEnd", 0)
                    transitions = clip_data.get("transitions", {})

                    # Get media info
                    media_info = self._get_media_info(str(media_path))
                    original_width = media_info.get('width') or width
                    original_height = media_info.get('height') or height
                    # Ensure we have valid numeric values
                    if original_width is None or original_width == 0:
                        original_width = width if width is not None else 1920
                    if original_height is None or original_height == 0:
                        original_height = height if height is not None else 1080

                    # Create temp output for this clip
                    temp_output = str(self.temp_dir / f"clip_{i}_{uuid.uuid4()}.mp4")
                    temp_files.append(temp_output)

                    # Get transform values
                    user_scale = clip_data.get("scale", 1)
                    if isinstance(user_scale, dict):
                        user_scale_x = user_scale.get("x", 1)
                        user_scale_y = user_scale.get("y", 1)
                    else:
                        user_scale_x = user_scale
                        user_scale_y = user_scale

                    position = clip_data.get("position", {})
                    pos_x = position.get("x", 0) if position else 0
                    pos_y = position.get("y", 0) if position else 0
                    opacity = clip_data.get("opacity", 1)
                    rotation = clip_data.get("rotation", 0)

                    # Build FFmpeg command using subprocess for more control
                    filter_parts = []

                    # Input setup
                    if clip_type == "image":
                        input_args = ['-loop', '1', '-t', str(clip_duration), '-i', str(media_path)]
                    else:
                        input_args = []
                        if trim_start > 0:
                            input_args.extend(['-ss', str(trim_start)])
                        input_args.extend(['-i', str(media_path)])
                        if clip_duration > 0:
                            media_duration = media_info['duration'] - trim_start - trim_end
                            actual_duration = min(clip_duration, media_duration) if media_duration > 0 else clip_duration
                            input_args.extend(['-t', str(actual_duration)])

                    # Build video filter
                    # For compositing, we need to:
                    # 1. Scale to the intended size based on user scale and canvas ratio
                    # 2. Keep track of position for overlay
                    # 3. Crop will be applied at composite stage to show only visible part
                    overlay_x = 0
                    overlay_y = 0
                    
                    # Calculate canvas scale factors (export resolution vs preview resolution)
                    canvas_scale_x = width / source_width if source_width > 0 else 1.0
                    canvas_scale_y = height / source_height if source_height > 0 else 1.0
                    
                    # Apply user scale on top of canvas scale
                    final_scale_x = user_scale_x * canvas_scale_x
                    final_scale_y = user_scale_y * canvas_scale_y
                    
                    # Calculate scaled dimensions
                    scaled_clip_width = int(original_width * final_scale_x)
                    scaled_clip_height = int(original_height * final_scale_y)
                    
                    # Ensure minimum size
                    scaled_clip_width = max(scaled_clip_width, 2)
                    scaled_clip_height = max(scaled_clip_height, 2)
                    
                    filter_parts.append(f"scale={scaled_clip_width}:{scaled_clip_height}")
                    
                    # Calculate overlay position
                    # Frontend logic: if position is (0,0), center the clip
                    # x = position.x !== 0 ? position.x : (canvas.width - imgWidth) / 2
                    # y = position.y !== 0 ? position.y : (canvas.height - imgHeight) / 2
                    if pos_x != 0:
                        overlay_x = int(pos_x * canvas_scale_x)
                    else:
                        # Center horizontally: (canvas_width - scaled_clip_width) / 2
                        overlay_x = int((width - scaled_clip_width) / 2)
                    
                    if pos_y != 0:
                        overlay_y = int(pos_y * canvas_scale_y)
                    else:
                        # Center vertically: (canvas_height - scaled_clip_height) / 2
                        overlay_y = int((height - scaled_clip_height) / 2)
                    
                    # Determine if this clip fills canvas exactly (for optimization)
                    is_full_canvas = (
                        overlay_x == 0 and overlay_y == 0
                        and scaled_clip_width == width and scaled_clip_height == height
                    )

                    # Apply rotation
                    if rotation != 0:
                        rad = rotation * 3.14159265359 / 180
                        filter_parts.append(f"rotate={rad}:c=none")

                    # Apply fade transitions
                    if transitions:
                        # Handle both list format and dict format
                        if isinstance(transitions, list):
                            # List format: [{type: "fadeIn", duration: 0.5, position: "start"}, ...]
                            for trans in transitions:
                                trans_type = trans.get("type", "").lower()
                                trans_duration = trans.get("duration", 1.0)
                                position = trans.get("position", "")
                                
                                if trans_type in ("fadein", "fade_in", "fade"):
                                    if position == "start" or not position:
                                        filter_parts.append(f"fade=t=in:st=0:d={trans_duration}")
                                elif trans_type in ("fadeout", "fade_out"):
                                    fade_start = max(0, clip_duration - trans_duration)
                                    filter_parts.append(f"fade=t=out:st={fade_start}:d={trans_duration}")
                        elif isinstance(transitions, dict):
                            # Dict format: {in: {type, duration}, out: {type, duration}}
                            if transitions.get("in"):
                                trans_in = transitions["in"]
                                trans_type = trans_in.get("type", "").lower()
                                trans_duration = trans_in.get("duration", 1.0)
                                if trans_type in ("fade", "dissolve"):
                                    filter_parts.append(f"fade=t=in:st=0:d={trans_duration}")

                            if transitions.get("out"):
                                trans_out = transitions["out"]
                                trans_type = trans_out.get("type", "").lower()
                                trans_duration = trans_out.get("duration", 1.0)
                                if trans_type in ("fade", "dissolve"):
                                    fade_start = max(0, clip_duration - trans_duration)
                                    filter_parts.append(f"fade=t=out:st={fade_start}:d={trans_duration}")

                    # Set fps and format
                    filter_parts.append(f"fps={fps}")
                    
                    # Check if this is an image that might have transparency (PNG)
                    is_transparent_image = clip_type == "image" and str(media_path).lower().endswith('.png')
                    
                    # For clips that aren't full canvas, or transparent images,
                    # preserve alpha channel for proper compositing
                    needs_alpha = (not is_full_canvas) or is_transparent_image
                    
                    if needs_alpha:
                        filter_parts.append("format=rgba")
                        # Use output format that supports alpha
                        temp_output = temp_output.replace('.mp4', '.mov')
                        temp_files[-1] = temp_output  # Update the temp file reference
                        
                        # Build command with alpha support using qtrle codec
                        cmd = ['ffmpeg', '-y']
                        cmd.extend(input_args)
                        cmd.extend(['-vf', ','.join(filter_parts)])
                        cmd.extend(['-c:v', 'qtrle'])  # QuickTime Animation codec for alpha support
                        cmd.extend(['-an'])
                        cmd.append(temp_output)
                    else:
                        filter_parts.append("format=yuv420p")
                        
                        # Build command
                        cmd = ['ffmpeg', '-y']
                        cmd.extend(input_args)
                        cmd.extend(['-vf', ','.join(filter_parts)])
                        cmd.extend(['-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23'])
                        cmd.extend(['-an'])
                        cmd.append(temp_output)

                    result = subprocess.run(cmd, capture_output=True, text=True)
                    if result.returncode == 0:
                        processed_video_paths.append({
                            'path': temp_output,
                            'start_time': start_time,
                            'duration': clip_duration,
                            'overlay_x': overlay_x,
                            'overlay_y': overlay_y,
                            'is_full_canvas': is_full_canvas,
                            'layer_index': video_item['layer_index'],
                            'has_alpha': needs_alpha
                        })
                    else:
                        logger.error(f"Error processing clip {i}: {result.stderr}")

                if progress_callback:
                    progress_callback(0.5)

                # Process audio clips
                for i, audio_item in enumerate(audio_clips):
                    clip_data = audio_item['clip']
                    audio_type = audio_item['type']

                    resource_id = clip_data.get("resourceId")
                    if not resource_id:
                        continue

                    media_path = self._find_media_file(resource_id)
                    if not media_path:
                        continue

                    start_time = clip_data.get("startTime", 0)
                    clip_duration = clip_data.get("duration", 0)
                    trim_start = clip_data.get("trimStart", 0)
                    trim_end = clip_data.get("trimEnd", 0)
                    volume = clip_data.get("volume", 1.0)

                    # Extract/process audio
                    temp_audio = str(self.temp_dir / f"audio_{i}_{uuid.uuid4()}.m4a")
                    temp_files.append(temp_audio)

                    try:
                        cmd = ['ffmpeg', '-y']
                        if trim_start > 0:
                            cmd.extend(['-ss', str(trim_start)])
                        cmd.extend(['-i', str(media_path)])
                        if clip_duration > 0:
                            cmd.extend(['-t', str(clip_duration)])

                        filter_parts = []
                        if volume != 1.0:
                            filter_parts.append(f"volume={volume}")

                        if filter_parts:
                            cmd.extend(['-af', ','.join(filter_parts)])

                        cmd.extend(['-c:a', 'aac', '-b:a', '192k'])
                        cmd.append(temp_audio)

                        result = subprocess.run(cmd, capture_output=True, text=True)
                        if result.returncode == 0:
                            processed_audio_paths.append({
                                'path': temp_audio,
                                'start_time': start_time,
                                'duration': clip_duration
                            })
                    except Exception as e:
                        logger.warning(f"Error processing audio {i}: {e}")

                if progress_callback:
                    progress_callback(0.7)

                # Ensure width and height are valid integers for text processing
                final_width: int = width if width is not None else 1920
                final_height: int = height if height is not None else 1080

                # Process text clips
                for i, text_item in enumerate(text_clips):
                    clip_data = text_item['clip']
                    data = clip_data.get("data", {})
                    start_time = clip_data.get("startTime", 0)
                    clip_duration = clip_data.get("duration", 5)

                    text_content = data.get("text", "")
                    font_family = data.get("fontFamily", "Arial")
                    font_size = data.get("fontSize", 50)
                    color = data.get("color", "white")
                    
                    # Get text position from clip data
                    text_position = clip_data.get("position", {})
                    text_pos_x = text_position.get("x", None) if text_position else None
                    text_pos_y = text_position.get("y", None) if text_position else None

                    # Scale font and position for export
                    canvas_scale_x = final_width / source_width if source_width > 0 else 1.0
                    canvas_scale_y = final_height / source_height if source_height > 0 else 1.0
                    canvas_scale = (canvas_scale_x + canvas_scale_y) / 2
                    scaled_font_size = int(font_size * canvas_scale)
                    
                    # Scale position for export (if position is provided)
                    scaled_pos_x = int(text_pos_x * canvas_scale_x) if text_pos_x is not None else None
                    scaled_pos_y = int(text_pos_y * canvas_scale_y) if text_pos_y is not None else None

                    # Create text overlay image with text at the correct position
                    text_image_path = self._create_text_image(
                        text_content, scaled_font_size, color, font_family, 
                        final_width, final_height, scaled_pos_x, scaled_pos_y
                    )

                    if text_image_path:
                        temp_files.append(text_image_path)
                        temp_text_video = str(self.temp_dir / f"text_{i}_{uuid.uuid4()}.mov")
                        temp_files.append(temp_text_video)

                        # Convert text image to video with alpha support
                        # Use qtrle codec which properly supports RGBA
                        cmd = [
                            'ffmpeg', '-y',
                            '-loop', '1', '-t', str(clip_duration),
                            '-i', text_image_path,
                            '-vf', f'fps={fps}',
                            '-c:v', 'qtrle',
                            temp_text_video
                        ]

                        result = subprocess.run(cmd, capture_output=True, text=True)
                        if result.returncode == 0:
                            processed_video_paths.append({
                                'path': temp_text_video,
                                'start_time': start_time,
                                'duration': clip_duration,
                                'overlay_x': 0,  # Text is positioned within the image
                                'overlay_y': 0,
                                'is_overlay': True,
                                'is_full_canvas': True,  # Full canvas with text at position
                                'has_alpha': True,
                                'layer_index': text_item['layer_index']
                            })
                        else:
                            logger.warning(f"Text video creation error: {result.stderr}")

                if progress_callback:
                    progress_callback(0.8)

                # Composite all clips
                if processed_video_paths:
                    # Sort by layer index first (lower layers first), then by start time
                    processed_video_paths.sort(key=lambda x: (x.get('layer_index', 0), x['start_time']))

                    # Create a black background video
                    bg_path = str(self.temp_dir / f"bg_{uuid.uuid4()}.mp4")
                    temp_files.append(bg_path)

                    cmd = [
                        'ffmpeg', '-y',
                        '-f', 'lavfi',
                        '-i', f'color=c=black:s={width}x{height}:d={duration}:r={fps}',
                        '-c:v', 'libx264', '-preset', 'ultrafast',
                        '-pix_fmt', 'yuv420p',
                        bg_path
                    ]
                    subprocess.run(cmd, capture_output=True)

                    # Build complex filter for overlaying all clips
                    current_output = bg_path
                    for idx, clip_info in enumerate(processed_video_paths):
                        overlay_input = clip_info['path']
                        start_time = clip_info['start_time']
                        clip_dur = clip_info['duration']
                        
                        # Get overlay position (default to 0,0 for full canvas clips)
                        overlay_x = clip_info.get('overlay_x', 0)
                        overlay_y = clip_info.get('overlay_y', 0)
                        is_full_canvas = clip_info.get('is_full_canvas', False)
                        has_alpha = clip_info.get('has_alpha', False)

                        temp_overlay = str(self.temp_dir / f"overlay_{idx}_{uuid.uuid4()}.mp4")
                        temp_files.append(temp_overlay)

                        # Use overlay filter with timing handled via setpts
                        # The overlay input needs to be time-shifted to start at the correct time
                        # We use setpts to delay the overlay video's timestamps
                        # and eof_action=pass to continue the background when overlay ends
                        
                        # Build overlay filter:
                        # 1. Use setpts=PTS+{start_time}/TB on overlay input to shift its timeline
                        # 2. Use eof_action=pass so background continues after overlay ends
                        # 3. Use shortest=0 to not stop when overlay ends
                        pts_offset = start_time
                        
                        # Build overlay filter - use format=auto for alpha support
                        # Add crop filter to ensure output stays within canvas bounds
                        if is_full_canvas and overlay_x == 0 and overlay_y == 0 and not has_alpha:
                            overlay_filter = f"[1:v]setpts=PTS+{pts_offset}/TB[ov];[0:v][ov]overlay=0:0:eof_action=pass,crop={width}:{height}:0:0[out]"
                        else:
                            # For clips with alpha or custom position, use format=auto to handle transparency
                            # Crop to canvas size to handle clips that extend beyond canvas bounds
                            overlay_filter = f"[1:v]setpts=PTS+{pts_offset}/TB[ov];[0:v][ov]overlay={overlay_x}:{overlay_y}:format=auto:eof_action=pass,crop={width}:{height}:0:0[out]"

                        cmd = [
                            'ffmpeg', '-y',
                            '-i', current_output,
                            '-i', overlay_input,
                            '-filter_complex', overlay_filter,
                            '-map', '[out]',
                            '-c:v', 'libx264', '-preset', 'ultrafast',
                            '-pix_fmt', 'yuv420p',
                            '-t', str(duration),
                            temp_overlay
                        ]

                        result = subprocess.run(cmd, capture_output=True, text=True)
                        if result.returncode == 0:
                            current_output = temp_overlay
                        else:
                            logger.warning(f"Overlay error for clip {idx}: {result.stderr}")

                    final_video_path = current_output
                else:
                    # No video clips, create black video
                    final_video_path = str(self.temp_dir / f"black_{uuid.uuid4()}.mp4")
                    temp_files.append(final_video_path)

                    cmd = [
                        'ffmpeg', '-y',
                        '-f', 'lavfi',
                        '-i', f'color=c=black:s={width}x{height}:d={duration}:r={fps}',
                        '-c:v', 'libx264', '-preset', 'ultrafast',
                        '-pix_fmt', 'yuv420p',
                        final_video_path
                    ]
                    subprocess.run(cmd, capture_output=True)

                # Mix audio if present
                if processed_audio_paths:
                    # Create mixed audio
                    mixed_audio_path = str(self.temp_dir / f"mixed_audio_{uuid.uuid4()}.m4a")
                    temp_files.append(mixed_audio_path)

                    if len(processed_audio_paths) > 1:
                        # Build filter for mixing multiple audio streams with delays
                        input_args = []
                        filter_parts = []

                        for idx, audio_info in enumerate(processed_audio_paths):
                            input_args.extend(['-i', audio_info['path']])
                            delay_ms = int(audio_info['start_time'] * 1000)
                            filter_parts.append(f"[{idx}:a]adelay={delay_ms}|{delay_ms}[a{idx}]")

                        mix_inputs = "".join([f"[a{i}]" for i in range(len(processed_audio_paths))])
                        filter_parts.append(f"{mix_inputs}amix=inputs={len(processed_audio_paths)}:duration=longest[aout]")

                        cmd = ['ffmpeg', '-y']
                        cmd.extend(input_args)
                        cmd.extend(['-filter_complex', ';'.join(filter_parts)])
                        cmd.extend(['-map', '[aout]', '-c:a', 'aac', '-b:a', '192k'])
                        cmd.append(mixed_audio_path)

                        subprocess.run(cmd, capture_output=True)
                    else:
                        # Single audio, apply delay if needed
                        audio_info = processed_audio_paths[0]
                        delay_ms = int(audio_info['start_time'] * 1000)

                        cmd = ['ffmpeg', '-y', '-i', audio_info['path']]
                        if delay_ms > 0:
                            cmd.extend(['-af', f"adelay={delay_ms}|{delay_ms}"])
                        cmd.extend(['-c:a', 'aac', '-b:a', '192k'])
                        cmd.append(mixed_audio_path)

                        subprocess.run(cmd, capture_output=True)

                    # Combine video and audio
                    cmd = [
                        'ffmpeg', '-y',
                        '-i', final_video_path,
                        '-i', mixed_audio_path,
                        '-c:v', 'copy',
                        '-c:a', 'aac',
                        '-movflags', '+faststart',
                        '-shortest',
                        full_output_path
                    ]
                    subprocess.run(cmd, capture_output=True)
                else:
                    # No audio, just copy video
                    shutil.copy(final_video_path, full_output_path)

                if progress_callback:
                    progress_callback(1.0)

                logger.info(f"✅ Export completed: {full_output_path}")
                return full_output_path

            finally:
                # Cleanup temp files
                for temp_file in temp_files:
                    try:
                        if os.path.exists(temp_file):
                            os.unlink(temp_file)
                    except OSError:
                        pass

        except Exception as e:
            logger.error(f"❌ Export failed: {str(e)}")
            raise Exception(f"Export failed: {str(e)}")

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
