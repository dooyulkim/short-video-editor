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
        Apply slide transition between two videos using FFmpeg xfade filter
        
        Args:
            video1_path: Path to first video file
            video2_path: Path to second video file
            duration: Duration of slide in seconds (default: 1.0)
            direction: Direction video2 slides in from - 'left', 'right', 'up', 'down'
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
                'left': 'slideleft',
                'right': 'slideright',
                'up': 'slideup',
                'down': 'slidedown'
            }
            
            # Validate direction
            if direction not in transition_map:
                raise ValueError(f"Invalid slide direction: '{direction}'. Must be one of: {list(transition_map.keys())}")
            
            transition_type = transition_map[direction]
            
            # Generate output path
            output_path = self._generate_output_path(f"slide_{direction}")
            
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
            raise Exception(f"Error applying slide transition: {str(e)}")

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
