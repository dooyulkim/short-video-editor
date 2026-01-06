import React, { useEffect, useRef } from 'react';

interface AudioWaveformProps {
  audioData: number[];
  width: number;
  height: number;
  color?: string;
}

const AudioWaveform: React.FC<AudioWaveformProps> = ({ 
  audioData, 
  width, 
  height,
  color = 'hsl(var(--primary))' 
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !audioData || audioData.length === 0) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Set canvas dimensions
    canvas.width = width;
    canvas.height = height;

    // Calculate center line
    const centerY = height / 2;
    
    // Calculate bar width based on available width and data points
    const barWidth = width / audioData.length;
    
    // Set fill style
    ctx.fillStyle = color;

    // Draw waveform bars
    audioData.forEach((amplitude, index) => {
      // Normalize amplitude to -1 to 1 range (if not already)
      const normalizedAmplitude = Math.max(-1, Math.min(1, amplitude));
      
      // Calculate bar height (scale to fit half the canvas height)
      const barHeight = Math.abs(normalizedAmplitude) * (height / 2);
      
      // Calculate x position
      const x = index * barWidth;
      
      // Draw bar from center line
      if (normalizedAmplitude >= 0) {
        // Positive amplitude - draw upward from center
        ctx.fillRect(x, centerY - barHeight, barWidth, barHeight);
      } else {
        // Negative amplitude - draw downward from center
        ctx.fillRect(x, centerY, barWidth, barHeight);
      }
    });

    // Optional: Draw center line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, centerY);
    ctx.lineTo(width, centerY);
    ctx.stroke();

  }, [audioData, width, height, color]);

  return (
    <canvas 
      ref={canvasRef}
      className="audio-waveform"
      style={{ width: `${width}px`, height: `${height}px` }}
    />
  );
};

export default AudioWaveform;
