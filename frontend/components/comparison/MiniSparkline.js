import { useEffect, useRef } from 'react';

/**
 * MiniSparkline Component
 * Simple area chart for showing trends in cards
 */
export default function MiniSparkline({ data = [], color = 'indigo' }) {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current || !data || data.length === 0) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const width = canvas.width;
    const height = canvas.height;

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Filter out null/undefined values
    const validData = data.filter(d => d !== null && d !== undefined && !isNaN(d));
    if (validData.length === 0) return;

    // Normalize data
    const max = Math.max(...validData);
    const min = Math.min(...validData);
    const range = max - min || 1;

    const points = validData.map((value, index) => ({
      x: (index / (validData.length - 1)) * width,
      y: height - ((value - min) / range) * (height - 4) - 2 // 2px padding
    }));

    // Create gradient
    const gradient = ctx.createLinearGradient(0, 0, 0, height);
    const colors = {
      indigo: ['rgba(99, 102, 241, 0.3)', 'rgba(99, 102, 241, 0.05)'],
      green: ['rgba(16, 185, 129, 0.3)', 'rgba(16, 185, 129, 0.05)'],
      red: ['rgba(239, 68, 68, 0.3)', 'rgba(239, 68, 68, 0.05)'],
      blue: ['rgba(59, 130, 246, 0.3)', 'rgba(59, 130, 246, 0.05)']
    };
    
    const [startColor, endColor] = colors[color] || colors.indigo;
    gradient.addColorStop(0, startColor);
    gradient.addColorStop(1, endColor);

    // Draw area
    ctx.beginPath();
    ctx.moveTo(points[0].x, height);
    points.forEach((point, index) => {
      if (index === 0) {
        ctx.lineTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.lineTo(points[points.length - 1].x, height);
    ctx.closePath();
    ctx.fillStyle = gradient;
    ctx.fill();

    // Draw line
    ctx.beginPath();
    const lineColors = {
      indigo: '#6366f1',
      green: '#10b981',
      red: '#ef4444',
      blue: '#3b82f6'
    };
    ctx.strokeStyle = lineColors[color] || lineColors.indigo;
    ctx.lineWidth = 1.5;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';

    points.forEach((point, index) => {
      if (index === 0) {
        ctx.moveTo(point.x, point.y);
      } else {
        ctx.lineTo(point.x, point.y);
      }
    });
    ctx.stroke();
  }, [data, color]);

  return (
    <canvas
      ref={canvasRef}
      width={200}
      height={48}
      className="w-full h-full"
    />
  );
}
