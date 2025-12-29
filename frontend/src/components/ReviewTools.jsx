import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_BASE_URL } from '../config.js';

export default function ReviewTools({ projectId, breakpointIndex, onReviewAdd, onToolChange }) {
  const [tool, setTool] = useState('point'); // point, area, drawing
  const [color, setColor] = useState('#ff4444');
  const [isDrawing, setIsDrawing] = useState(false);
  
  // Notify parent of tool changes
  useEffect(() => {
    if (onToolChange) {
      onToolChange({ tool, color });
    }
  }, [tool, color, onToolChange]);

  const colors = ['#ff4444', '#4a9eff', '#44ff44', '#ffaa44', '#aa44ff'];

  const handleCreateReview = async (type, position, drawing = null) => {
    try {
      await axios.post(`${API_BASE_URL}/reviews`, {
        projectId,
        breakpointIndex,
        type,
        position,
        drawing,
        color,
      });
      onReviewAdd();
    } catch (error) {
      console.error('Error creating review:', error);
    }
  };

  return (
    <div style={styles.container} className="review-tools-container">
      <div style={styles.toolbar}>
        <div style={styles.toolGroup}>
          <button
            onClick={() => setTool('point')}
            style={{
              ...styles.toolButton,
              backgroundColor: tool === 'point' ? '#4a9eff' : '#3a3a3a',
            }}
            title="Point annotation"
          >
            📍
          </button>
          <button
            onClick={() => setTool('area')}
            style={{
              ...styles.toolButton,
              backgroundColor: tool === 'area' ? '#4a9eff' : '#3a3a3a',
            }}
            title="Area annotation"
          >
            ▭
          </button>
          <button
            onClick={() => setTool('drawing')}
            style={{
              ...styles.toolButton,
              backgroundColor: tool === 'drawing' ? '#4a9eff' : '#3a3a3a',
            }}
            title="Free drawing"
          >
            ✏️
          </button>
        </div>

        <div style={styles.colorGroup}>
          {colors.map((c) => (
            <button
              key={c}
              onClick={() => setColor(c)}
              style={{
                ...styles.colorButton,
                backgroundColor: c,
                border: color === c ? '2px solid #fff' : '2px solid transparent',
              }}
              title={`Color: ${c}`}
            />
          ))}
        </div>

        <div style={styles.info}>
          <span style={styles.infoText}>
            {tool === 'point' && 'Click on canvas to add a point'}
            {tool === 'area' && 'Click and drag to select an area'}
            {tool === 'drawing' && 'Click and drag to draw'}
          </span>
        </div>
      </div>
    </div>
  );
}

// Export handler for canvas to use
export const createReviewHandler = async (projectId, breakpointIndex, type, position, drawing, color) => {
  try {
    const response = await axios.post(`${API_BASE_URL}/reviews`, {
      projectId,
      breakpointIndex,
      type,
      position,
      drawing,
      color,
    });
    return response.data.review;
  } catch (error) {
    console.error('Error creating review:', error);
    return null;
  }
};

const styles = {
  container: {
    position: 'absolute',
    bottom: '20px',
    left: '50%',
    transform: 'translateX(-50%)',
    zIndex: 200,
  },
  toolbar: {
    backgroundColor: 'rgba(42, 42, 42, 0.95)',
    backdropFilter: 'blur(10px)',
    borderRadius: '12px',
    padding: '12px 16px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    display: 'flex',
    alignItems: 'center',
    gap: '16px',
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  toolGroup: {
    display: 'flex',
    gap: '8px',
  },
  toolButton: {
    width: '40px',
    height: '40px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    borderRadius: '8px',
    cursor: 'pointer',
    fontSize: '18px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'all 0.2s',
  },
  colorGroup: {
    display: 'flex',
    gap: '8px',
    paddingLeft: '16px',
    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
  },
  colorButton: {
    width: '32px',
    height: '32px',
    borderRadius: '6px',
    cursor: 'pointer',
    transition: 'all 0.2s',
  },
  info: {
    paddingLeft: '16px',
    borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
  },
  infoText: {
    fontSize: '12px',
    color: '#999',
  },
};

