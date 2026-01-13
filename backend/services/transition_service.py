import uuid
from pathlib import Path
import ffmpeg
import numpy as np


class TransitionService:
    """Service for applying video transition effects"""
    
    def __init__(self, temp_dir: str = "temp_video"):
        self.temp_dir = Path(temp_dir)
        self.temp_dir.mkdir(parents=True, exist_ok=True)
    
    def _generate_output_path(self, prefix: str = "transition") -> str:
        """Generate unique output file path"""
        filename = f"{prefix}_{uuid.uuid4()}.mp4"
        return str(self.temp_dir / filename)
    
    def apply_fade_in(self, video_path: str, duration: float = 1.0) -> str:
        """
        Apply fade in transition from black using FFmpeg
        
        Args:
            video_path: Path to input video file
            duration: Duration of fade in seconds (default: 1.0)
            
        Returns:
            Path to processed video file
        """
        try:
            # Generate output path
            output_path = self._generate_output_path("fade_in")
            
            # Get input stream
            input_stream = ffmpeg.input(video_path)
            
            # Apply fade in effect to video stream only
            video = input_stream.video.filter('fade', type='in', duration=duration, start_time=0)
            
            # Copy audio stream unchanged
            audio = input_stream.audio
            
            # Output with both video and audio
            (
                ffmpeg
                .output(video, audio, str(output_path), vcodec='libx264', acodec='aac')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )
            
            return output_path
            
        except ffmpeg.Error as e:
            raise Exception(f"Error applying fade in: {e.stderr.decode() if e.stderr else str(e)}")
        except Exception as e:
            raise Exception(f"Error applying fade in: {str(e)}")
    
    def apply_fade_out(self, video_path: str, duration: float = 1.0) -> str:
        """
        Apply fade out transition to black using FFmpeg
        
        Args:
            video_path: Path to input video file
            duration: Duration of fade in seconds (default: 1.0)
            
        Returns:
            Path to processed video file
        """
        try:
            # Get video duration first to calculate start time for fade out
            probe = ffmpeg.probe(video_path)
            video_duration = float(probe['format']['duration'])
            start_time = max(0, video_duration - duration)
            
            # Generate output path
            output_path = self._generate_output_path("fade_out")
            
            # Get input stream
            input_stream = ffmpeg.input(video_path)
            
            # Apply fade out effect to video stream only
            video = input_stream.video.filter('fade', type='out', duration=duration, start_time=start_time)
            
            # Copy audio stream unchanged
            audio = input_stream.audio
            
            # Output with both video and audio
            (
                ffmpeg
                .output(video, audio, str(output_path), vcodec='libx264', acodec='aac')
                .overwrite_output()
                .run(capture_stdout=True, capture_stderr=True, quiet=True)
            )
            
            return output_path
            
        except ffmpeg.Error as e:
            raise Exception(f"Error applying fade out: {e.stderr.decode() if e.stderr else str(e)}")
        except Exception as e:
            raise Exception(f"Error applying fade out: {str(e)}")
    
    def apply_cross_dissolve(
        self,
        video1_path: str,
        video2_path: str,
        duration: float = 1.0
    ) -> str:
        """
        Apply cross dissolve transition between two videos using FFmpeg xfade filter
        
        Args:
            video1_path: Path to first video file
            video2_path: Path to second video file
            duration: Duration of crossfade in seconds (default: 1.0)
            
        Returns:
            Path to merged video file with transition
        """
        try:
            # Get video info
            probe1 = ffmpeg.probe(video1_path)
            probe2 = ffmpeg.probe(video2_path)
            duration1 = float(probe1['format']['duration'])
            duration2 = float(probe2['format']['duration'])
            
            # Get video dimensions
            video_stream1 = next((s for s in probe1['streams'] if s['codec_type'] == 'video'), None)
            video_stream2 = next((s for s in probe2['streams'] if s['codec_type'] == 'video'), None)
            
            # Check for audio streams
            audio_stream1 = next((s for s in probe1['streams'] if s['codec_type'] == 'audio'), None)
            audio_stream2 = next((s for s in probe2['streams'] if s['codec_type'] == 'audio'), None)
            has_audio = audio_stream1 is not None and audio_stream2 is not None
            
            if video_stream1 and video_stream2:
                width1, height1 = int(video_stream1['width']), int(video_stream1['height'])
                width2, height2 = int(video_stream2['width']), int(video_stream2['height'])
            else:
                width1, height1 = 640, 480
                width2, height2 = 640, 480
            
            # Ensure duration doesn't exceed clip lengths
            transition_duration = min(duration, duration1, duration2)
            
            # Calculate offset for second video (when to start the transition)
            offset = duration1 - transition_duration
            
            # Generate output path
            output_path = self._generate_output_path("cross_dissolve")
            
            # TRUE FILM DISSOLVE:
            # Video 2 fades in as TRANSPARENT over Video 1
            # - Video 1 remains fully visible as base layer
            # - Video 2's alpha (transparency) animates from 0% to 100%
            # - During transition: see Video 1 THROUGH the transparent Video 2
            #
            # Using fade filter on alpha channel and overlay
            
            if width1 != width2 or height1 != height2:
                scale_filter = f"[1:v]scale={width1}:{height1}:force_original_aspect_ratio=decrease,pad={width1}:{height1}:(ow-iw)/2:(oh-ih)/2,setsar=1[v2scaled];"
                v2_ref = "[v2scaled]"
            else:
                scale_filter = ""
                v2_ref = "[1:v]"
            
            # Build filter:
            # 1. Video1 before transition (plays normally)
            # 2. Transition: Video2 with alpha fade-in overlaid on Video1
            # 3. Video2 after transition (plays normally)
            #
            # fade=t=in:alpha=1 makes only the alpha channel fade (0->255)
            # Video2 starts fully transparent, becomes opaque
            # Video1 shows through the transparent parts
            
            video_filter = (
                f"{scale_filter}"
                # Part 1: Video1 before transition starts
                f"[0:v]trim=0:{offset},setpts=PTS-STARTPTS[v1_before];"
                # Part 2a: Video1 during transition (base layer - convert to rgba for overlay)
                f"[0:v]trim={offset}:{duration1},setpts=PTS-STARTPTS,format=rgba[v1_base];"
                # Part 2b: Video2 during transition with alpha fade-in
                # format=rgba adds alpha channel, fade=alpha=1 fades only the alpha (not RGB)
                f"{v2_ref}trim=0:{transition_duration},setpts=PTS-STARTPTS,format=rgba,"
                f"fade=t=in:st=0:d={transition_duration}:alpha=1[v2_fading];"
                # Overlay Video2 (fading in via alpha) on top of Video1
                # Video1 shows through transparent parts of Video2
                f"[v1_base][v2_fading]overlay=0:0:format=auto,format=yuv420p[blended];"
                # Part 3: Video2 after transition
                f"{v2_ref}trim={transition_duration}:{duration2},setpts=PTS-STARTPTS[v2_after];"
                # Concatenate: before + blended + after
                f"[v1_before][blended][v2_after]concat=n=3:v=1:a=0[vout]"
            )
            
            if has_audio:
                audio_filter = f";[0:a][1:a]acrossfade=d={transition_duration}:c1=tri:c2=tri[aout]"
                filter_complex = video_filter + audio_filter
                output_maps = ['-map', '[vout]', '-map', '[aout]']
            else:
                filter_complex = video_filter
                output_maps = ['-map', '[vout]']
            
            # Run FFmpeg with filter_complex
            import subprocess
            cmd = [
                'ffmpeg', '-y',
                '-i', video1_path,
                '-i', video2_path,
                '-filter_complex', filter_complex,
                *output_maps,
                '-c:v', 'libx264',
                '-c:a', 'aac',
                str(output_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(result.stderr)
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Error applying cross dissolve: {str(e)}")
    
    def apply_wipe(
        self,
        video1_path: str,
        video2_path: str,
        duration: float = 1.0,
        direction: str = "left"
    ) -> str:
        """
        Apply wipe transition between two videos using FFmpeg xfade filter
        
        Args:
            video1_path: Path to first video file
            video2_path: Path to second video file
            duration: Duration of wipe in seconds (default: 1.0)
            direction: Direction of wipe - 'left', 'right', 'up', 'down'
                (default: 'left')
            
        Returns:
            Path to merged video file with transition
        """
        try:
            # Get video info
            probe1 = ffmpeg.probe(video1_path)
            probe2 = ffmpeg.probe(video2_path)
            duration1 = float(probe1['format']['duration'])
            duration2 = float(probe2['format']['duration'])
            
            # Get video dimensions
            video_stream1 = next((s for s in probe1['streams'] if s['codec_type'] == 'video'), None)
            video_stream2 = next((s for s in probe2['streams'] if s['codec_type'] == 'video'), None)
            
            # Check for audio streams
            audio_stream1 = next((s for s in probe1['streams'] if s['codec_type'] == 'audio'), None)
            audio_stream2 = next((s for s in probe2['streams'] if s['codec_type'] == 'audio'), None)
            has_audio = audio_stream1 is not None and audio_stream2 is not None
            
            if video_stream1 and video_stream2:
                width1, height1 = int(video_stream1['width']), int(video_stream1['height'])
                width2, height2 = int(video_stream2['width']), int(video_stream2['height'])
            else:
                width1, height1 = 640, 480
                width2, height2 = 640, 480
            
            # Ensure duration doesn't exceed clip lengths
            transition_duration = min(duration, duration1, duration2)
            
            # Calculate offset for second video
            offset = duration1 - transition_duration
            
            # Map direction to xfade transition type
            transition_map = {
                'left': 'wipeleft',
                'right': 'wiperight',
                'up': 'wipeup',
                'down': 'wipedown'
            }
            
            # Validate direction
            if direction not in transition_map:
                raise ValueError(f"Invalid wipe direction: '{direction}'. Must be one of: {list(transition_map.keys())}")
            
            transition_type = transition_map[direction]
            
            # Generate output path
            output_path = self._generate_output_path(f"wipe_{direction}")
            
            # Build filter complex for both video and audio
            if width1 != width2 or height1 != height2:
                scale_filter = f"[1:v]scale={width1}:{height1}[v1scaled];"
                video_filter = f"[0:v][v1scaled]xfade=transition={transition_type}:duration={transition_duration}:offset={offset}[vout]"
            else:
                scale_filter = ""
                video_filter = f"[0:v][1:v]xfade=transition={transition_type}:duration={transition_duration}:offset={offset}[vout]"
            
            if has_audio:
                audio_filter = f";[0:a][1:a]acrossfade=d={transition_duration}:c1=tri:c2=tri[aout]"
                filter_complex = scale_filter + video_filter + audio_filter
                output_maps = ['-map', '[vout]', '-map', '[aout]']
            else:
                filter_complex = scale_filter + video_filter
                output_maps = ['-map', '[vout]']
            
            # Run FFmpeg with filter_complex
            import subprocess
            cmd = [
                'ffmpeg', '-y',
                '-i', video1_path,
                '-i', video2_path,
                '-filter_complex', filter_complex,
                *output_maps,
                '-c:v', 'libx264',
                '-c:a', 'aac',
                str(output_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(result.stderr)
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Error applying wipe transition: {str(e)}")
    
    def apply_slide(
        self,
        video1_path: str,
        video2_path: str,
        duration: float = 1.0,
        direction: str = "left"
    ) -> str:
        """
        Apply slide/push transition between two videos.
        
        Both videos move together - video1 slides out while video2 slides in,
        creating a "push" effect where video2 pushes video1 off screen.
        
        Args:
            video1_path: Path to first video file
            video2_path: Path to second video file
            duration: Duration of slide in seconds (default: 1.0)
            direction: Direction of movement - 'left', 'right', 'up', 'down'
                - 'left': video1 exits left, video2 enters from right
                - 'right': video1 exits right, video2 enters from left
                - 'up': video1 exits top, video2 enters from bottom
                - 'down': video1 exits bottom, video2 enters from top
                (default: 'left')
            
        Returns:
            Path to merged video file with transition
        """
        try:
            # Validate direction
            valid_directions = ['left', 'right', 'up', 'down']
            if direction not in valid_directions:
                raise ValueError(f"Invalid slide direction: '{direction}'. Must be one of: {valid_directions}")
            
            # Get video info
            probe1 = ffmpeg.probe(video1_path)
            probe2 = ffmpeg.probe(video2_path)
            duration1 = float(probe1['format']['duration'])
            duration2 = float(probe2['format']['duration'])
            
            # Get video dimensions
            video_stream1 = next((s for s in probe1['streams'] if s['codec_type'] == 'video'), None)
            video_stream2 = next((s for s in probe2['streams'] if s['codec_type'] == 'video'), None)
            
            # Check for audio streams
            audio_stream1 = next((s for s in probe1['streams'] if s['codec_type'] == 'audio'), None)
            audio_stream2 = next((s for s in probe2['streams'] if s['codec_type'] == 'audio'), None)
            has_audio = audio_stream1 is not None and audio_stream2 is not None
            
            if video_stream1 and video_stream2:
                width = int(video_stream1['width'])
                height = int(video_stream1['height'])
                width2 = int(video_stream2['width'])
                height2 = int(video_stream2['height'])
            else:
                width, height = 640, 480
                width2, height2 = 640, 480
            
            # Ensure duration doesn't exceed clip lengths
            transition_duration = min(duration, duration1, duration2)
            
            # Calculate offset (when transition starts in video1)
            offset = duration1 - transition_duration
            
            # Generate output path
            output_path = self._generate_output_path(f"slide_{direction}")
            
            # Build the filter complex for a true slide/push transition
            # Both videos move together - video1 slides out, video2 slides in
            #
            # For "left" direction:
            #   - video1 moves from x=0 to x=-width (exits left)
            #   - video2 moves from x=width to x=0 (enters from right)
            #
            # We use overlay filter with animated x/y positions
            
            # Scale video2 to match video1 dimensions if needed
            if width != width2 or height != height2:
                scale_filter = f"[1:v]scale={width}:{height}:force_original_aspect_ratio=decrease,pad={width}:{height}:(ow-iw)/2:(oh-ih)/2,setsar=1[v2scaled];"
                v2_ref = "[v2scaled]"
            else:
                scale_filter = ""
                v2_ref = "[1:v]"
            
            # Create a canvas twice the size to hold both videos side by side
            # Then crop to original size with animated position
            if direction == 'left':
                # Horizontal: video1 on left, video2 on right, crop moves right
                canvas_w, canvas_h = width * 2, height
                # Stack horizontally: v1 | v2
                stack_filter = f"[0:v]trim={offset}:{duration1},setpts=PTS-STARTPTS[v1_trans];{v2_ref}trim=0:{transition_duration},setpts=PTS-STARTPTS[v2_trans];[v1_trans][v2_trans]hstack=inputs=2[stacked];"
                # Crop with x moving from 0 to width over transition_duration
                crop_filter = f"[stacked]crop={width}:{height}:'min({width},t/{transition_duration}*{width})':0[blended];"
            elif direction == 'right':
                # Horizontal: video2 on left, video1 on right, crop moves left
                canvas_w, canvas_h = width * 2, height
                stack_filter = f"[0:v]trim={offset}:{duration1},setpts=PTS-STARTPTS[v1_trans];{v2_ref}trim=0:{transition_duration},setpts=PTS-STARTPTS[v2_trans];[v2_trans][v1_trans]hstack=inputs=2[stacked];"
                # Crop with x moving from width to 0 over transition_duration
                crop_filter = f"[stacked]crop={width}:{height}:'max(0,{width}-t/{transition_duration}*{width})':0[blended];"
            elif direction == 'up':
                # Vertical: video1 on top, video2 on bottom, crop moves down
                canvas_w, canvas_h = width, height * 2
                stack_filter = f"[0:v]trim={offset}:{duration1},setpts=PTS-STARTPTS[v1_trans];{v2_ref}trim=0:{transition_duration},setpts=PTS-STARTPTS[v2_trans];[v1_trans][v2_trans]vstack=inputs=2[stacked];"
                # Crop with y moving from 0 to height over transition_duration
                crop_filter = f"[stacked]crop={width}:{height}:0:'min({height},t/{transition_duration}*{height})'[blended];"
            else:  # direction == 'down'
                # Vertical: video2 on top, video1 on bottom, crop moves up
                canvas_w, canvas_h = width, height * 2
                stack_filter = f"[0:v]trim={offset}:{duration1},setpts=PTS-STARTPTS[v1_trans];{v2_ref}trim=0:{transition_duration},setpts=PTS-STARTPTS[v2_trans];[v2_trans][v1_trans]vstack=inputs=2[stacked];"
                # Crop with y moving from height to 0 over transition_duration
                crop_filter = f"[stacked]crop={width}:{height}:0:'max(0,{height}-t/{transition_duration}*{height})'[blended];"
            
            # Build complete video filter:
            # Part 1: video1 before transition (plays normally)
            # Part 2: transition section (both videos sliding)
            # Part 3: video2 after transition (plays normally)
            video_filter = (
                f"{scale_filter}"
                # Part 1: Video1 before transition starts
                f"[0:v]trim=0:{offset},setpts=PTS-STARTPTS[v1_before];"
                # Part 2: Transition with sliding effect
                f"{stack_filter}"
                f"{crop_filter}"
                # Part 3: Video2 after transition
                f"{v2_ref}trim={transition_duration}:{duration2},setpts=PTS-STARTPTS[v2_after];"
                # Concatenate all parts
                f"[v1_before][blended][v2_after]concat=n=3:v=1:a=0[vout]"
            )
            
            if has_audio:
                audio_filter = f";[0:a][1:a]acrossfade=d={transition_duration}:c1=tri:c2=tri[aout]"
                filter_complex = video_filter + audio_filter
                output_maps = ['-map', '[vout]', '-map', '[aout]']
            else:
                filter_complex = video_filter
                output_maps = ['-map', '[vout]']
            
            # Run FFmpeg with filter_complex
            import subprocess
            cmd = [
                'ffmpeg', '-y',
                '-i', video1_path,
                '-i', video2_path,
                '-filter_complex', filter_complex,
                *output_maps,
                '-c:v', 'libx264',
                '-c:a', 'aac',
                str(output_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(result.stderr)
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Error applying slide transition: {str(e)}")
    
    def apply_zoom_in(self, video_path: str, duration: float = 1.0, direction: str = "in") -> str:
        """
        Apply zoom transition at the start of the video
        
        Args:
            video_path: Path to input video file
            duration: Duration of zoom in seconds (default: 1.0)
            direction: "in" (grow from small to normal) or "out" (shrink from large to normal)
            
        Returns:
            Path to processed video file
        """
        try:
            # Get video info
            probe = ffmpeg.probe(video_path)
            video_stream = next((s for s in probe['streams'] if s['codec_type'] == 'video'), None)
            video_duration = float(probe['format']['duration'])
            
            if video_stream:
                width = int(video_stream['width'])
                height = int(video_stream['height'])
            else:
                width, height = 640, 480
            
            # Generate output path
            output_path = self._generate_output_path("zoom_in")
            
            # Create zoompan filter that matches preview behavior exactly
            # During transition: scale changes, but viewport stays centered
            if direction == "in":
                # Zoom in: scale from 0.5x to 1.0x (content grows from small to normal)
                # Formula: scale = 0.5 + 0.5 * (t / duration)
                # x and y need to be adjusted to keep content centered as it grows
                filter_complex = (
                    f"[0:v]zoompan="
                    f"z='if(lt(t,{duration}),1/(0.5+0.5*t/{duration}),1)':"
                    f"x='(iw-iw*zoom)/2':"
                    f"y='(ih-ih*zoom)/2':"
                    f"d=1:"
                    f"s={width}x{height}[vout]"
                )
            else:  # direction == "out"
                # Zoom out: scale from 2.0x to 1.0x (content shrinks from large to normal)
                # Formula: scale = 2.0 - (t / duration)
                filter_complex = (
                    f"[0:v]zoompan="
                    f"z='if(lt(t,{duration}),1/(2.0-t/{duration}),1)':"
                    f"x='(iw-iw*zoom)/2':"
                    f"y='(ih-ih*zoom)/2':"
                    f"d=1:"
                    f"s={width}x{height}[vout]"
                )
            
            # Use subprocess for complex filter
            import subprocess
            cmd = [
                'ffmpeg', '-y',
                '-i', video_path,
                '-filter_complex', filter_complex,
                '-map', '[vout]',
                '-map', '0:a?',
                '-c:v', 'libx264',
                '-c:a', 'copy',
                str(output_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(result.stderr)
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Error applying zoom in: {str(e)}")
    
    def apply_zoom_out(self, video_path: str, duration: float = 1.0, direction: str = "out") -> str:
        """
        Apply zoom transition at the end of the video
        
        Args:
            video_path: Path to input video file
            duration: Duration of zoom in seconds (default: 1.0)
            direction: "in" (grow from normal to large) or "out" (shrink from normal to small)
            
        Returns:
            Path to processed video file
        """
        try:
            # Get video duration first to calculate start time for zoom out
            probe = ffmpeg.probe(video_path)
            video_duration = float(probe['format']['duration'])
            start_time = max(0, video_duration - duration)
            
            video_stream = next((s for s in probe['streams'] if s['codec_type'] == 'video'), None)
            
            if video_stream:
                width = int(video_stream['width'])
                height = int(video_stream['height'])
            else:
                width, height = 640, 480
            
            # Generate output path
            output_path = self._generate_output_path("zoom_out")
            
            # Create zoompan filter that matches preview behavior exactly
            # During transition at the end: scale changes, but viewport stays centered
            if direction == "in":
                # Zoom in: scale from 1.0x to 2.0x (content grows from normal to large)
                # Formula: scale = 1.0 + (t - start_time) / duration
                filter_complex = (
                    f"[0:v]zoompan="
                    f"z='if(gte(t,{start_time}),1/(1.0+(t-{start_time})/{duration}),1)':"
                    f"x='(iw-iw*zoom)/2':"
                    f"y='(ih-ih*zoom)/2':"
                    f"d=1:"
                    f"s={width}x{height}[vout]"
                )
            else:  # direction == "out"
                # Zoom out: scale from 1.0x to 0.5x (content shrinks from normal to small)
                # Formula: scale = 1.0 - 0.5 * (t - start_time) / duration
                filter_complex = (
                    f"[0:v]zoompan="
                    f"z='if(gte(t,{start_time}),1/(1.0-0.5*(t-{start_time})/{duration}),1)':"
                    f"x='(iw-iw*zoom)/2':"
                    f"y='(ih-ih*zoom)/2':"
                    f"d=1:"
                    f"s={width}x{height}[vout]"
                )
            
            # Use subprocess for complex filter
            import subprocess
            cmd = [
                'ffmpeg', '-y',
                '-i', video_path,
                '-filter_complex', filter_complex,
                '-map', '[vout]',
                '-map', '0:a?',
                '-c:v', 'libx264',
                '-c:a', 'copy',
                str(output_path)
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True)
            if result.returncode != 0:
                raise Exception(result.stderr)
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Error applying zoom out: {str(e)}")

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
                        print(f"Error deleting {file_path}: {str(e)}")
