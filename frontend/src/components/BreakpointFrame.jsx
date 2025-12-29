import { useState, useRef } from 'react';
import ReviewOverlay from './ReviewOverlay';

export default function BreakpointFrame({ 
  url, 
  width, 
  height, 
  label, 
  proxyBaseUrl, 
  scale = 1, 
  isDragging = false, 
  onDelete, 
  canDelete = false, 
  isSelected = false,
  mode = 'pan',
  currentUser = 'Anonymous',
  projectId,
  onCommentsUpdate,
}) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const iframeRef = useRef(null);

  const proxiedUrl = `${proxyBaseUrl}/proxy?url=${encodeURIComponent(url)}`;

  const handleLoad = () => {
    setLoading(false);
    setError(null);
  };

  const handleError = () => {
    setLoading(false);
    setError('Failed to load frame');
  };

  return (
    <div style={styles.container}>
      <div 
        style={{
          ...styles.labelContainer,
          cursor: 'grab',
          userSelect: 'none',
        }}
      >
        <div style={styles.label}>
          {label} ({width} × {height})
        </div>
        {canDelete && onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              if (window.confirm(`Delete ${label} breakpoint?`)) {
                onDelete();
              }
            }}
            style={styles.deleteButton}
            title="Delete breakpoint"
          >
            ×
          </button>
        )}
      </div>
      <div style={{
        ...styles.frameWrapper,
        boxShadow: isDragging ? '0 8px 24px rgba(74, 158, 255, 0.4)' : isSelected ? '0 4px 16px rgba(74, 158, 255, 0.3)' : '0 4px 12px rgba(0, 0, 0, 0.3)',
        transition: isDragging ? 'none' : 'box-shadow 0.2s',
        borderColor: isDragging ? '#4a9eff' : isSelected ? '#4a9eff' : '#333',
        position: 'relative',
        cursor: mode === 'comment' ? 'crosshair' : 'default',
      }}>
        {loading && (
          <div style={styles.loading}>
            <div style={styles.spinner}></div>
            <div>Loading...</div>
          </div>
        )}
        {error && (
          <div style={styles.error}>
            {error}
          </div>
        )}
        <iframe
          ref={iframeRef}
          src={proxiedUrl}
          width={width}
          height={height}
          style={{
            ...styles.iframe,
            pointerEvents: mode === 'comment' ? 'auto' : 'auto',
          }}
          onLoad={handleLoad}
          onError={handleError}
          sandbox="allow-same-origin allow-scripts allow-forms allow-popups allow-modals"
        />
        {/* ReviewOverlay is rendered via portal, so it doesn't block iframe clicks */}
        <ReviewOverlay
          targetUrl={url}
          breakpoint={label.toLowerCase()}
          iframeRef={iframeRef}
          mode={mode}
          currentUser={currentUser}
          projectId={projectId}
          onCommentsUpdate={onCommentsUpdate}
        />
      </div>
    </div>
  );
}

const styles = {
  container: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
  },
  labelContainer: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    position: 'relative',
    width: '100%',
  },
  label: {
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
    textAlign: 'center',
  },
  deleteButton: {
    background: 'rgba(255, 68, 68, 0.2)',
    border: '1px solid rgba(255, 68, 68, 0.4)',
    color: '#ff4444',
    borderRadius: '4px',
    width: '20px',
    height: '20px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    cursor: 'pointer',
    fontSize: '16px',
    padding: 0,
    lineHeight: 1,
    transition: 'all 0.2s',
    flexShrink: 0,
  },
  frameWrapper: {
    position: 'relative',
    border: '2px solid #333',
    borderRadius: '8px',
    overflow: 'hidden',
    backgroundColor: '#fff',
  },
  iframe: {
    border: 'none',
    display: 'block',
    backgroundColor: '#fff',
  },
  loading: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'center',
    gap: '12px',
    color: '#666',
    fontSize: '14px',
    zIndex: 10,
  },
  spinner: {
    width: '32px',
    height: '32px',
    border: '3px solid #333',
    borderTopColor: '#4a9eff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
  error: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    color: '#ff4444',
    fontSize: '14px',
    textAlign: 'center',
    padding: '12px',
    zIndex: 10,
  },
};

