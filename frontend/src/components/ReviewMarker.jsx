export default function ReviewMarker({ review, scale }) {
  const { position, type, color, resolved } = review;

  if (!position) return null;

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

