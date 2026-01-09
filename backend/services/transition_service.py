import uuid
from pathlib import Path
from moviepy.editor import (
    VideoFileClip,
    CompositeVideoClip,
    concatenate_videoclips
)
from moviepy.video.fx.fadein import fadein
from moviepy.video.fx.fadeout import fadeout
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
        Apply fade in transition from black
        
        Args:
            video_path: Path to input video file
            duration: Duration of fade in seconds (default: 1.0)
            
        Returns:
            Path to processed video file
        """
        try:
            # Load video clip
            clip = VideoFileClip(video_path)
            
            # Apply fade in effect
            faded_clip = fadein(clip, duration)
            
            # Generate output path
            output_path = self._generate_output_path("fade_in")
            
            # Write processed video
            faded_clip.write_videofile(
                output_path,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=str(
                    self.temp_dir / f'temp_audio_{uuid.uuid4()}.m4a'
                ),
                remove_temp=True,
                logger=None
            )
            
            # Clean up
            clip.close()
            faded_clip.close()
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Error applying fade in: {str(e)}")
    
    def apply_fade_out(self, video_path: str, duration: float = 1.0) -> str:
        """
        Apply fade out transition to black
        
        Args:
            video_path: Path to input video file
            duration: Duration of fade in seconds (default: 1.0)
            
        Returns:
            Path to processed video file
        """
        try:
            # Load video clip
            clip = VideoFileClip(video_path)
            
            # Apply fade out effect
            faded_clip = fadeout(clip, duration)
            
            # Generate output path
            output_path = self._generate_output_path("fade_out")
            
            # Write processed video
            faded_clip.write_videofile(
                output_path,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=str(
                    self.temp_dir / f'temp_audio_{uuid.uuid4()}.m4a'
                ),
                remove_temp=True,
                logger=None
            )
            
            # Clean up
            clip.close()
            faded_clip.close()
            
            return output_path
            
        except Exception as e:
            raise Exception(f"Error applying fade out: {str(e)}")
    
    def apply_cross_dissolve(
        self,
        video1_path: str,
        video2_path: str,
        duration: float = 1.0
    ) -> str:
        """
        Apply cross dissolve transition between two videos
        Overlaps last X seconds of video1 with first X seconds of video2
        
        Args:
            video1_path: Path to first video file
            video2_path: Path to second video file
            duration: Duration of crossfade in seconds (default: 1.0)
            
        Returns:
            Path to merged video file with transition
        """
        try:
            # Load video clips
            clip1 = VideoFileClip(video1_path)
            clip2 = VideoFileClip(video2_path)
            
            # Ensure duration doesn't exceed clip lengths
            transition_duration = min(duration, clip1.duration, clip2.duration)
            
            # Calculate split point
            split_point = clip1.duration - transition_duration
            
            # Split first clip into two parts
            clip1_before = clip1.subclip(0, split_point)
            clip1_overlap = clip1.subclip(split_point, clip1.duration)
            
            # Split second clip
            clip2_overlap = clip2.subclip(0, transition_duration)
            clip2_after = clip2.subclip(transition_duration, clip2.duration)
            
            # Apply fade out to first clip's overlap section
            clip1_overlap = fadeout(clip1_overlap, transition_duration)
            
            # Apply fade in to second clip's overlap section
            clip2_overlap = fadein(clip2_overlap, transition_duration)
            
            # Resize clips to match dimensions if needed
            target_size = clip1.size
            if clip2.size != target_size:
                clip2_overlap = clip2_overlap.resize(target_size)
                clip2_after = clip2_after.resize(target_size)
            
            # Composite the overlapping parts
            # Set clip2_overlap to start at time 0 (same as clip1_overlap)
            clip2_overlap = clip2_overlap.set_start(0)
            
            # Create composite for the transition
            transition_composite = CompositeVideoClip(
                [clip1_overlap, clip2_overlap]
            )
            
            # Concatenate all parts: before + transition + after
            final_clip = concatenate_videoclips([
                clip1_before,
                transition_composite,
                clip2_after
            ])
            
            # Generate output path
            output_path = self._generate_output_path("cross_dissolve")
            
            # Write merged video
            final_clip.write_videofile(
                output_path,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=str(
                    self.temp_dir / f'temp_audio_{uuid.uuid4()}.m4a'
                ),
                remove_temp=True,
                logger=None
            )
            
            # Clean up
            clip1.close()
            clip2.close()
            final_clip.close()
            
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
        Apply wipe transition between two videos
        
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
            # Load video clips
            clip1 = VideoFileClip(video1_path)
            clip2 = VideoFileClip(video2_path)
            
            # Resize clip2 to match clip1 dimensions
            target_size = clip1.size
            if clip2.size != target_size:
                clip2 = clip2.resize(target_size)
            
            # Ensure duration doesn't exceed clip lengths
            transition_duration = min(duration, clip1.duration, clip2.duration)
            
            # Calculate split point
            split_point = clip1.duration - transition_duration
            
            # Split clips
            clip1_before = clip1.subclip(0, split_point)
            clip1_transition = clip1.subclip(split_point, clip1.duration)
            clip2_transition = clip2.subclip(0, transition_duration)
            clip2_after = clip2.subclip(transition_duration, clip2.duration)
            
            # Create wipe effect using mask
            width, height = target_size
            
            def make_frame(t):
                """Generate frame with wipe effect"""
                # Calculate wipe progress (0 to 1)
                progress = t / transition_duration
                
                # Get frames from both clips
                frame1 = clip1_transition.get_frame(t)
                frame2 = clip2_transition.get_frame(t)
                
                # Create mask based on direction
                mask = np.zeros((height, width), dtype=np.uint8)
                
                if direction == "left":
                    # Wipe from right to left
                    split_x = int(width * (1 - progress))
                    mask[:, split_x:] = 255
                elif direction == "right":
                    # Wipe from left to right
                    split_x = int(width * progress)
                    mask[:, :split_x] = 255
                elif direction == "up":
                    # Wipe from bottom to top
                    split_y = int(height * (1 - progress))
                    mask[split_y:, :] = 255
                elif direction == "down":
                    # Wipe from top to bottom
                    split_y = int(height * progress)
                    mask[:split_y, :] = 255
                else:
                    raise ValueError(f"Invalid wipe direction: {direction}")
                
                # Expand mask to 3 channels
                mask_3d = np.stack([mask] * 3, axis=2)
                
                # Composite frames using mask
                # Where mask is 255 (white), show frame2; where 0 (black), show frame1
                result = np.where(mask_3d > 0, frame2, frame1)
                
                return result.astype(np.uint8)
            
            # Create the wipe transition clip
            from moviepy.editor import VideoClip
            transition_clip = VideoClip(make_frame, duration=transition_duration)
            transition_clip = transition_clip.set_fps(clip1.fps)
            
            # Handle audio - crossfade between the two clips
            if clip1_transition.audio is not None and clip2_transition.audio is not None:
                audio1 = clip1_transition.audio.audio_fadeout(transition_duration)
                audio2 = clip2_transition.audio.audio_fadein(transition_duration)
                from moviepy.audio.AudioClip import CompositeAudioClip
                transition_clip = transition_clip.set_audio(
                    CompositeAudioClip([audio1, audio2.set_start(0)])
                )
            elif clip1_transition.audio is not None:
                transition_clip = transition_clip.set_audio(clip1_transition.audio)
            elif clip2_transition.audio is not None:
                transition_clip = transition_clip.set_audio(clip2_transition.audio)
            
            # Concatenate all parts
            final_clip = concatenate_videoclips([
                clip1_before,
                transition_clip,
                clip2_after
            ])
            
            # Generate output path
            output_path = self._generate_output_path(f"wipe_{direction}")
            
            # Write merged video
            final_clip.write_videofile(
                output_path,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=str(
                    self.temp_dir / f'temp_audio_{uuid.uuid4()}.m4a'
                ),
                remove_temp=True,
                logger=None
            )
            
            # Clean up
            clip1.close()
            clip2.close()
            final_clip.close()
            
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
        Apply slide transition between two videos.
        Video2 slides in from the specified direction, pushing video1 out.
        
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
            # Load video clips
            clip1 = VideoFileClip(video1_path)
            clip2 = VideoFileClip(video2_path)
            
            # Resize clip2 to match clip1 dimensions
            target_size = clip1.size
            if clip2.size != target_size:
                clip2 = clip2.resize(target_size)
            
            # Ensure duration doesn't exceed clip lengths
            transition_duration = min(duration, clip1.duration, clip2.duration)
            
            # Calculate split point
            split_point = clip1.duration - transition_duration
            
            # Split clips
            clip1_before = clip1.subclip(0, split_point)
            clip1_transition = clip1.subclip(split_point, clip1.duration)
            clip2_transition = clip2.subclip(0, transition_duration)
            clip2_after = clip2.subclip(transition_duration, clip2.duration)
            
            # Create slide effect
            width, height = target_size
            
            def make_frame(t):
                """Generate frame with slide effect"""
                # Calculate slide progress (0 to 1)
                progress = t / transition_duration
                
                # Get frames from both clips
                frame1 = clip1_transition.get_frame(t)
                frame2 = clip2_transition.get_frame(t)
                
                # Create output frame
                result = np.zeros((height, width, 3), dtype=np.uint8)
                
                if direction == "left":
                    # Video2 slides in from right, pushing video1 to left
                    offset = int(width * progress)
                    # Video1 moves left (exits)
                    if offset < width:
                        result[:, :width - offset] = frame1[:, offset:]
                    # Video2 enters from right
                    if offset > 0:
                        result[:, width - offset:] = frame2[:, :offset]
                        
                elif direction == "right":
                    # Video2 slides in from left, pushing video1 to right
                    offset = int(width * progress)
                    # Video1 moves right (exits)
                    if offset < width:
                        result[:, offset:] = frame1[:, :width - offset]
                    # Video2 enters from left
                    if offset > 0:
                        result[:, :offset] = frame2[:, width - offset:]
                        
                elif direction == "up":
                    # Video2 slides in from bottom, pushing video1 up
                    offset = int(height * progress)
                    # Video1 moves up (exits)
                    if offset < height:
                        result[:height - offset, :] = frame1[offset:, :]
                    # Video2 enters from bottom
                    if offset > 0:
                        result[height - offset:, :] = frame2[:offset, :]
                        
                elif direction == "down":
                    # Video2 slides in from top, pushing video1 down
                    offset = int(height * progress)
                    # Video1 moves down (exits)
                    if offset < height:
                        result[offset:, :] = frame1[:height - offset, :]
                    # Video2 enters from top
                    if offset > 0:
                        result[:offset, :] = frame2[height - offset:, :]
                else:
                    raise ValueError(f"Invalid slide direction: {direction}")
                
                return result.astype(np.uint8)
            
            # Create the slide transition clip
            from moviepy.editor import VideoClip
            transition_clip = VideoClip(make_frame, duration=transition_duration)
            transition_clip = transition_clip.set_fps(clip1.fps)
            
            # Handle audio - crossfade between the two clips
            if clip1_transition.audio is not None and clip2_transition.audio is not None:
                audio1 = clip1_transition.audio.audio_fadeout(transition_duration)
                audio2 = clip2_transition.audio.audio_fadein(transition_duration)
                from moviepy.audio.AudioClip import CompositeAudioClip
                transition_clip = transition_clip.set_audio(
                    CompositeAudioClip([audio1, audio2.set_start(0)])
                )
            elif clip1_transition.audio is not None:
                transition_clip = transition_clip.set_audio(clip1_transition.audio)
            elif clip2_transition.audio is not None:
                transition_clip = transition_clip.set_audio(clip2_transition.audio)
            
            # Concatenate all parts
            final_clip = concatenate_videoclips([
                clip1_before,
                transition_clip,
                clip2_after
            ])
            
            # Generate output path
            output_path = self._generate_output_path(f"slide_{direction}")
            
            # Write merged video
            final_clip.write_videofile(
                output_path,
                codec='libx264',
                audio_codec='aac',
                temp_audiofile=str(
                    self.temp_dir / f'temp_audio_{uuid.uuid4()}.m4a'
                ),
                remove_temp=True,
                logger=None
            )
            
            # Clean up
            clip1.close()
            clip2.close()
            final_clip.close()
            
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
