import React, { useEffect, useRef } from 'react';

interface TimelineRulerProps {
  width: number; // Total width in pixels
  zoom: number; // Pixels per second
  duration: number; // Total duration in seconds
}

/**
 * TimelineRuler component renders time markers and labels
 * Adjusts marker density based on zoom level for optimal readability
 */
export const TimelineRuler: React.FC<TimelineRulerProps> = ({ width, zoom, duration }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  /**
   * Format time in seconds to MM:SS or HH:MM:SS format
   */
  const formatTime = (seconds: number): string => {
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hrs > 0) {
      return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width;
    canvas.height = 40;

    // Clear canvas
    ctx.clearRect(0, 0, width, canvas.height);

    // Determine marker interval based on zoom level
    let majorInterval: number; // seconds
    let minorInterval: number; // seconds

    if (zoom >= 100) {
      // High zoom: show every second with 0.5s minor markers
      majorInterval = 1;
      minorInterval = 0.5;
    } else if (zoom >= 50) {
      // Medium-high zoom: show every 5 seconds with 1s minor markers
      majorInterval = 5;
      minorInterval = 1;
    } else if (zoom >= 20) {
      // Medium zoom: show every 10 seconds with 5s minor markers
      majorInterval = 10;
      minorInterval = 5;
    } else if (zoom >= 10) {
      // Medium-low zoom: show every 30 seconds with 10s minor markers
      majorInterval = 30;
      minorInterval = 10;
    } else {
      // Low zoom: show every 60 seconds with 30s minor markers
      majorInterval = 60;
      minorInterval = 30;
    }

    // Draw minor markers
    ctx.strokeStyle = '#444';
    ctx.lineWidth = 1;
    for (let time = 0; time <= duration; time += minorInterval) {
      const x = time * zoom;
      if (x > width) break;

      ctx.beginPath();
      ctx.moveTo(x, canvas.height - 5);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }

    // Draw major markers and labels
    ctx.strokeStyle = '#888';
    ctx.lineWidth = 2;
    ctx.fillStyle = '#ddd';
    ctx.font = '11px sans-serif';
    ctx.textAlign = 'center';

    for (let time = 0; time <= duration; time += majorInterval) {
      const x = time * zoom;
      if (x > width) break;

      // Draw marker line
      ctx.beginPath();
      ctx.moveTo(x, canvas.height - 10);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();

      // Draw time label
      const label = formatTime(time);
      ctx.fillText(label, x, 15);
    }
  }, [width, zoom, duration, formatTime]);

  return (
    <div className="timeline-ruler bg-gray-900 border-b border-gray-700" data-testid="timeline-ruler">
      <canvas
        ref={canvasRef}
        className="block"
        style={{ width: `${width}px`, height: '40px' }}
      />
    </div>
  );
};
