import { useRef, useEffect, useState } from 'react';

export default function DrawingCanvas({ 
  enabled, 
  color = '#FF6B6B', 
  lineWidth = 2,
  onDrawingComplete,
  onDrawingUpdate
}) {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [currentPath, setCurrentPath] = useState([]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    
    // Set canvas size
    const resizeCanvas = () => {
      canvas.width = canvas.offsetWidth;
      canvas.height = canvas.offsetHeight;
    };
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    return () => {
      window.removeEventListener('resize', resizeCanvas);
    };
  }, []);

  const startDrawing = (e) => {
    if (!enabled) return;
    
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    setIsDrawing(true);
    setCurrentPath([{ x, y }]);
  };

  const draw = (e) => {
    if (!isDrawing || !enabled) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    
    const newPath = [...currentPath, { x, y }];
    setCurrentPath(newPath);
    
    // Draw line
    if (currentPath.length > 0) {
      ctx.beginPath();
      ctx.moveTo(currentPath[currentPath.length - 1].x, currentPath[currentPath.length - 1].y);
      ctx.lineTo(x, y);
      ctx.strokeStyle = color;
      ctx.lineWidth = lineWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.stroke();
    }
    
    // Notify parent of drawing update
    if (onDrawingUpdate) {
      onDrawingUpdate(newPath);
    }
  };

  const stopDrawing = () => {
    if (!isDrawing) return;
    
    setIsDrawing(false);
    
    if (currentPath.length > 0 && onDrawingComplete) {
      onDrawingComplete({
        path: currentPath,
        color,
        lineWidth,
      });
    }
    
    setCurrentPath([]);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
  };

  // Expose clear function
  useEffect(() => {
    if (canvasRef.current) {
      canvasRef.current.clear = clearCanvas;
    }
  }, []);

  if (!enabled) {
    return null;
  }

  return (
    <canvas
      ref={canvasRef}
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'auto',
        cursor: 'crosshair',
        zIndex: 1000,
      }}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
      onTouchStart={(e) => {
        e.preventDefault();
        startDrawing(e.touches[0]);
      }}
      onTouchMove={(e) => {
        e.preventDefault();
        draw(e.touches[0]);
      }}
      onTouchEnd={(e) => {
        e.preventDefault();
        stopDrawing();
      }}
    />
  );
}

