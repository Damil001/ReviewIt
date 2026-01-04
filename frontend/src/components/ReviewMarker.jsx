export default function ReviewMarker({ review, scale }) {
  const { position, type, color, resolved, drawing } = review;

  if (!position && type !== 'drawing') return null;

  // Render drawing
  if (type === 'drawing' && drawing) {
    try {
      const drawingData = JSON.parse(drawing);
      const path = drawingData.path || [];
      
      if (path.length === 0) return null;

      // Create SVG path string
      const pathString = path
        .map((point, index) => {
          if (index === 0) return `M ${point.x * scale} ${point.y * scale}`;
          return `L ${point.x * scale} ${point.y * scale}`;
        })
        .join(' ');

      return (
        <svg
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            pointerEvents: 'none',
            opacity: resolved ? 0.5 : 1,
          }}
        >
          <path
            d={pathString}
            stroke={drawingData.color || color || '#ff4444'}
            strokeWidth={(drawingData.lineWidth || 3) * scale}
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      );
    } catch (error) {
      console.error('Error parsing drawing:', error);
      return null;
    }
  }

  const styles = {
    point: {
      position: 'absolute',
      left: `${position.x * scale}px`,
      top: `${position.y * scale}px`,
      width: '20px',
      height: '20px',
      borderRadius: '50%',
      backgroundColor: color,
      border: '2px solid #fff',
      cursor: 'pointer',
      transform: 'translate(-50%, -50%)',
      opacity: resolved ? 0.5 : 1,
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    },
    area: {
      position: 'absolute',
      left: `${position.x * scale}px`,
      top: `${position.y * scale}px`,
      width: `${(position.width || 100) * scale}px`,
      height: `${(position.height || 100) * scale}px`,
      border: `2px solid ${color}`,
      backgroundColor: `${color}20`,
      cursor: 'pointer',
      opacity: resolved ? 0.5 : 1,
    },
  };

  return (
    <div
      style={styles[type] || styles.point}
      title={review.comments?.[0]?.text || 'Review'}
    />
  );
}

