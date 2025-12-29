export default function CommentMarker({ x, y, commentId, count = 1, resolved = false, onClick }) {
  return (
    <div
      style={{
        ...styles.marker,
        left: `${x}%`,
        top: `${y}%`,
        backgroundColor: resolved ? '#51CF66' : '#FF6B6B',
      }}
      onClick={onClick}
      className="comment-marker"
    >
      {count > 1 ? count : '💬'}
      {!resolved && <div style={styles.pulse} />}
    </div>
  );
}

const styles = {
  marker: {
    position: 'absolute',
    width: '32px',
    height: '32px',
    border: '3px solid white',
    borderRadius: '50%',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    color: 'white',
    fontWeight: 'bold',
    fontSize: '14px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.3)',
    transform: 'translate(-50%, -50%)',
    transition: 'transform 0.2s',
    zIndex: 1000,
  },
  pulse: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: '50%',
    border: '2px solid currentColor',
    animation: 'pulse 2s infinite',
  },
};

