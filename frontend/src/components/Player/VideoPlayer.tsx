import { useEffect, useRef, useState, useCallback } from 'react';
import { useTimeline } from '@/context/TimelineContext';
import type { Clip, TimelineLayer } from '@/types/timeline';

interface VideoPlayerProps {
  width?: number;
  height?: number;
  className?: string;
}

/**
 * VideoPlayer component for rendering composite video preview
 * Renders all visible clips at current time with proper layering
 */
export function VideoPlayer({ width = 1920, height = 1080, className = '' }: VideoPlayerProps) {
  const { state } = useTimeline();
  const { layers, currentTime } = state;
  
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoElementsRef = useRef<Map<string, HTMLVideoElement>>(new Map());
  const [isReady, setIsReady] = useState(false);

  /**
   * Load video elements for all video clips
   */
  useEffect(() => {
    const loadVideoElements = async () => {
      const videoClips = layers
        .flatMap(layer => layer.clips)
        .filter(clip => clip.data?.type === 'video');

      // Create video elements for clips that don't have them
      for (const clip of videoClips) {
        if (!videoElementsRef.current.has(clip.resourceId)) {
          const video = document.createElement('video');
          video.crossOrigin = 'anonymous';
          video.preload = 'auto';
          video.muted = true;
          
          // Set video source (assuming resourceId is the URL or needs to be fetched)
          // TODO: Replace with actual media URL from resource
          video.src = `/api/media/${clip.resourceId}/file`;
          
          videoElementsRef.current.set(clip.resourceId, video);
          
          // Wait for video to be ready
          await new Promise<void>((resolve) => {
            video.addEventListener('loadeddata', () => resolve(), { once: true });
          });
        }
      }
      
      setIsReady(true);
    };

    loadVideoElements();
  }, [layers]);

  /**
   * Get clips that should be visible at the current time
   */
  const getVisibleClips = (currentTime: number): Array<{ clip: Clip; layer: TimelineLayer }> => {
    const visibleClips: Array<{ clip: Clip; layer: TimelineLayer }> = [];

    for (const layer of layers) {
      if (!layer.visible) continue;

      for (const clip of layer.clips) {
        const clipEndTime = clip.startTime + clip.duration;
        
        // Check if current time falls within clip's time range
        if (currentTime >= clip.startTime && currentTime < clipEndTime) {
          visibleClips.push({ clip, layer });
        }
      }
    }

    // Sort by layer order (bottom to top)
    visibleClips.sort((a, b) => {
      const layerIndexA = layers.indexOf(a.layer);
      const layerIndexB = layers.indexOf(b.layer);
      return layerIndexA - layerIndexB;
    });

    return visibleClips;
  };

  /**
   * Calculate opacity for transition effects
   */
  const calculateTransitionOpacity = (clip: Clip, localTime: number): number => {
    let opacity = clip.opacity ?? 1.0;

    // Apply fade in transition
    if (clip.transitions?.in) {
      const transition = clip.transitions.in;
      if (localTime < transition.duration) {
        const fadeProgress = localTime / transition.duration;
        
        if (transition.type === 'fade') {
          opacity *= fadeProgress;
        }
      }
    }

    // Apply fade out transition
    if (clip.transitions?.out) {
      const transition = clip.transitions.out;
      const fadeOutStart = clip.duration - transition.duration;
      
      if (localTime > fadeOutStart) {
        const fadeProgress = (clip.duration - localTime) / transition.duration;
        
        if (transition.type === 'fade') {
          opacity *= fadeProgress;
        }
      }
    }

    return opacity;
  };

  /**
   * Draw video frame to canvas
   */
  const drawVideoClip = (
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    localTime: number
  ) => {
    const video = videoElementsRef.current.get(clip.resourceId);
    if (!video || video.readyState < 2) return; // Not ready

    // Calculate video time with trim offset
    const videoTime = localTime + clip.trimStart;
    
    // Seek video to correct time if needed
    if (Math.abs(video.currentTime - videoTime) > 0.1) {
      video.currentTime = videoTime;
    }

    // Calculate position and scale
    const x = clip.position?.x ?? 0;
    const y = clip.position?.y ?? 0;
    const scale = clip.scale ?? 1.0;
    const rotation = clip.rotation ?? 0;

    // Calculate transition opacity
    const opacity = calculateTransitionOpacity(clip, localTime);

    // Save canvas state
    ctx.save();

    // Apply transformations
    ctx.globalAlpha = opacity;
    ctx.translate(x + (width * scale) / 2, y + (height * scale) / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.translate(-(width * scale) / 2, -(height * scale) / 2);

    // Draw video frame
    ctx.drawImage(video, 0, 0, width * scale, height * scale);

    // Restore canvas state
    ctx.restore();
  };

  /**
   * Draw image clip to canvas
   */
  const drawImageClip = (
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    localTime: number
  ) => {
    // TODO: Load and cache image elements similar to video
    const opacity = calculateTransitionOpacity(clip, localTime);

    ctx.save();
    ctx.globalAlpha = opacity;
    
    // Draw image (placeholder - need to load image first)
    // const x = clip.position?.x ?? 0;
    // const y = clip.position?.y ?? 0;
    // const scale = clip.scale ?? 1.0;
    // ctx.drawImage(image, x, y, width * scale, height * scale);
    
    ctx.restore();
  };

  /**
   * Draw text clip to canvas
   */
  const drawTextClip = (
    ctx: CanvasRenderingContext2D,
    clip: Clip,
    localTime: number
  ) => {
    if (!clip.data) return;

    const {
      text = '',
      fontFamily = 'Arial',
      fontSize = 48,
      color = '#ffffff',
      textAlign = 'center',
      textBaseline = 'middle',
    } = clip.data;

    const x = clip.position?.x ?? width / 2;
    const y = clip.position?.y ?? height / 2;
    const opacity = calculateTransitionOpacity(clip, localTime);

    ctx.save();
    ctx.globalAlpha = opacity;
    ctx.font = `${fontSize}px ${fontFamily}`;
    ctx.fillStyle = color;
    ctx.textAlign = textAlign as CanvasTextAlign;
    ctx.textBaseline = textBaseline as CanvasTextBaseline;

    // Draw text with optional stroke
    if (clip.data.strokeColor) {
      ctx.strokeStyle = clip.data.strokeColor;
      ctx.lineWidth = clip.data.strokeWidth || 2;
      ctx.strokeText(text, x, y);
    }
    
    ctx.fillText(text, x, y);
    ctx.restore();
  };

  /**
   * Render all visible clips to canvas
   */
  const renderFrame = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, width, height);

    // Get all visible clips at current time
    const visibleClips = getVisibleClips(currentTime);

    // Render clips from bottom to top
    for (const { clip, layer } of visibleClips) {
      const localTime = currentTime - clip.startTime;

      // Skip if outside clip duration (shouldn't happen due to getVisibleClips filter)
      if (localTime < 0 || localTime > clip.duration) continue;

      // Render based on clip type
      if (layer.type === 'video' || clip.data?.type === 'video') {
        drawVideoClip(ctx, clip, localTime);
      } else if (layer.type === 'image' || clip.data?.type === 'image') {
        drawImageClip(ctx, clip, localTime);
      } else if (layer.type === 'text' || clip.data?.type === 'text') {
        drawTextClip(ctx, clip, localTime);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentTime, layers, width, height]);

  /**
   * Redraw canvas when currentTime changes
   */
  useEffect(() => {
    if (!isReady) return;
    renderFrame();
  }, [renderFrame, isReady]);

  /**
   * Set up canvas and render first frame
   */
  useEffect(() => {
    if (isReady) {
      renderFrame();
    }
  }, [isReady, renderFrame]);

  return (
		<div className={`relative ${className}`}>
			<canvas ref={canvasRef} width={width} height={height} className="w-full h-full object-contain bg-black" />
			{!isReady && (
				<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
					<div className="text-white text-sm">Loading preview...</div>
				</div>
			)}
			{isReady && layers.length === 0 && (
				<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
					<div className="text-center text-gray-400 space-y-2 p-4">
						<p className="text-sm font-medium">Timeline Preview</p>
						<p className="text-xs">Drag resources to the timeline to see them here</p>
					</div>
				</div>
			)}
			{isReady && layers.length > 0 && layers.every((layer) => layer.clips.length === 0) && (
				<div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
					<div className="text-center text-gray-400 space-y-2 p-4">
						<p className="text-sm font-medium">Timeline Preview</p>
						<p className="text-xs">No clips on timeline yet</p>
					</div>
				</div>
			)}
		</div>
	);
}
