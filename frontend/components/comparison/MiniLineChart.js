import { useEffect, useRef } from 'react';

/**
 * MiniLineChart Component
 * Tiny sparkline chart for showing trends
 */
export default function MiniLineChart({ data = [], className = '' }) {
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

    // Normalize data (invert because lower rank is better)
    const max = Math.max(...validData);
    const min = Math.min(...validData);
    const range = max - min || 1;

    const points = validData.map((value, index) => ({
      x: (index / (validData.length - 1)) * width,
      y: height - ((value - min) / range) * (height - 10) - 5 // 5px padding
    }));

    // Draw line
    ctx.beginPath();
    ctx.strokeStyle = validData[0] > validData[validData.length - 1] ? '#10b981' : '#ef4444'; // green if improving
    ctx.lineWidth = 2;
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

    // Draw dots
    points.forEach((point, index) => {
      ctx.beginPath();
      ctx.fillStyle = index === points.length - 1 ? '#4f46e5' : '#94a3b8';
      ctx.arc(point.x, point.y, index === points.length - 1 ? 3 : 2, 0, 2 * Math.PI);
      ctx.fill();
    });
  }, [data]);

  return (
    <canvas
      ref={canvasRef}
      width={120}
      height={40}
      className={`${className}`}
      style={{ maxWidth: '100%', height: 'auto' }}
    />
  );
}
