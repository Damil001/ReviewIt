import { useState, useRef, useEffect } from 'react';
import BreakpointFrame from './BreakpointFrame';
import AddBreakpointModal from './AddBreakpointModal';
import ReviewMarker from './ReviewMarker';
import { createReviewHandler } from './ReviewTools';

const defaultBreakpoints = [
  { name: 'Mobile', width: 375, height: 667 },
  { name: 'Tablet', width: 768, height: 1024 },
  { name: 'Laptop', width: 1024, height: 768 },
  { name: 'Desktop', width: 1440, height: 900 },
];

// Calculate initial positions side by side
const getInitialPositions = (breakpoints) => {
  let x = 100;
  const y = 100;
  const gap = 50;
  
  return breakpoints.map((bp) => {
    const position = { x, y };
    x += bp.width + gap;
    return position;
  });
};

const MIN_ZOOM = 0.25;
const MAX_ZOOM = 2;
const ZOOM_STEP = 0.1;

export default function Canvas({ 
  url, 
  proxyBaseUrl, 
  initialBreakpoints = null,
  initialCanvasState = null,
  onSave = null,
  reviewMode = false,
  onBreakpointSelect = null,
  selectedBreakpoint = null,
  projectId = null,
  reviews = [],
  onReviewAdd = null,
  reviewToolState = null, // { tool, color } from ReviewTools
  overlayMode = 'pan', // 'pan', 'comment', 'draw'
  currentUser = 'Anonymous',
  onCommentsUpdate = null,
}) {
  const [breakpoints, setBreakpoints] = useState(
    (initialBreakpoints && initialBreakpoints.length > 0) ? initialBreakpoints : defaultBreakpoints
  );
  const [pan, setPan] = useState(
    initialCanvasState?.pan || { x: 0, y: 0 }
  );
  const [zoom, setZoom] = useState(initialCanvasState?.zoom || 0.5);
  const [isDraggingCanvas, setIsDraggingCanvas] = useState(false);
  const [canvasDragStart, setCanvasDragStart] = useState({ x: 0, y: 0 });
  const [framePositions, setFramePositions] = useState(() => {
    const initialBps = (initialBreakpoints && initialBreakpoints.length > 0) ? initialBreakpoints : defaultBreakpoints;
    return getInitialPositions(initialBps);
  });
  const [draggingFrame, setDraggingFrame] = useState(null);
  const [frameDragStart, setFrameDragStart] = useState({ x: 0, y: 0, frameIndex: -1 });
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [reviewTool, setReviewTool] = useState(null);
  const [reviewColor, setReviewColor] = useState('#ff4444');
  const [areaStart, setAreaStart] = useState(null);
  const [areaPreview, setAreaPreview] = useState(null);
  const canvasRef = useRef(null);
  
  // Update review tool state when prop changes
  useEffect(() => {
    if (reviewToolState) {
      setReviewTool(reviewToolState.tool);
      setReviewColor(reviewToolState.color);
    } else {
      setReviewTool(null);
    }
  }, [reviewToolState]);

  // Handle mouse wheel zoom
  const handleWheel = (e) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -ZOOM_STEP : ZOOM_STEP;
    setZoom((prevZoom) => {
      const newZoom = Math.max(MIN_ZOOM, Math.min(MAX_ZOOM, prevZoom + delta));
      return newZoom;
    });
  };

  // Handle mouse down for canvas panning or review creation
  const handleMouseDown = (e) => {
    // If in review mode with a tool selected and breakpoint selected, create review
    if (reviewMode && reviewTool && selectedBreakpoint !== null && 
        !e.target.closest('.breakpoint-frame') && !e.target.closest('.controls') && 
        !e.target.closest('iframe') && !e.target.closest('.review-marker') &&
        !e.target.closest('.review-tools')) {
      
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect && projectId) {
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        // Convert screen coordinates to canvas coordinates
        const canvasX = (mouseX - pan.x) / zoom;
        const canvasY = (mouseY - pan.y) / zoom;
        
        // Get the selected breakpoint frame position
        const framePos = framePositions[selectedBreakpoint];
        if (framePos) {
          // Calculate position relative to the frame
          const frameX = canvasX - framePos.x;
          const frameY = canvasY - framePos.y;
          
          // Check if click is within the frame bounds
          const bp = breakpoints[selectedBreakpoint];
          if (frameX >= 0 && frameX <= bp.width && frameY >= 0 && frameY <= bp.height) {
            if (reviewTool === 'point') {
              // Create point review
              createReviewHandler(
                projectId,
                selectedBreakpoint,
                'point',
                { x: frameX, y: frameY },
                null,
                reviewColor
              ).then(() => {
                if (onReviewAdd) onReviewAdd();
              });
              e.preventDefault();
              return;
            } else if (reviewTool === 'area') {
              // Start area selection
              setAreaStart({ x: frameX, y: frameY });
              setAreaPreview({ x: frameX, y: frameY, width: 0, height: 0 });
              e.preventDefault();
              return;
            }
          }
        }
      }
    }
    
    // Normal canvas panning
    if (e.button === 0 && !e.target.closest('.breakpoint-frame') && !e.target.closest('.controls') && !e.target.closest('iframe')) {
      setIsDraggingCanvas(true);
      setCanvasDragStart({
        x: e.clientX - pan.x,
        y: e.clientY - pan.y,
      });
      e.preventDefault();
    }
  };

  // Handle mouse move for canvas panning, frame dragging, or area selection
  const handleMouseMove = (e) => {
    // Handle area selection preview in review mode
    if (reviewMode && reviewTool === 'area' && areaStart && selectedBreakpoint !== null) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        const canvasX = (mouseX - pan.x) / zoom;
        const canvasY = (mouseY - pan.y) / zoom;
        
        const framePos = framePositions[selectedBreakpoint];
        if (framePos) {
          const frameX = canvasX - framePos.x;
          const frameY = canvasY - framePos.y;
          
          const width = frameX - areaStart.x;
          const height = frameY - areaStart.y;
          
          setAreaPreview({
            x: width < 0 ? frameX : areaStart.x,
            y: height < 0 ? frameY : areaStart.y,
            width: Math.abs(width),
            height: Math.abs(height),
          });
        }
      }
      return;
    }
    
    if (isDraggingCanvas) {
      setPan({
        x: e.clientX - canvasDragStart.x,
        y: e.clientY - canvasDragStart.y,
      });
    } else if (draggingFrame !== null) {
      // Calculate new position accounting for zoom and pan
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        // Convert screen coordinates to canvas coordinates
        const canvasX = (mouseX - pan.x) / zoom;
        const canvasY = (mouseY - pan.y) / zoom;
        
        const newPositions = [...framePositions];
        newPositions[draggingFrame] = {
          x: canvasX - frameDragStart.x,
          y: canvasY - frameDragStart.y,
        };
        setFramePositions(newPositions);
      }
    }
  };

  // Handle mouse up
  const handleMouseUp = (e) => {
    // Complete area selection if in progress
    if (reviewMode && reviewTool === 'area' && areaStart && selectedBreakpoint !== null) {
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        const canvasX = (mouseX - pan.x) / zoom;
        const canvasY = (mouseY - pan.y) / zoom;
        
        const framePos = framePositions[selectedBreakpoint];
        if (framePos) {
          const frameX = canvasX - framePos.x;
          const frameY = canvasY - framePos.y;
          
          const width = Math.abs(frameX - areaStart.x);
          const height = Math.abs(frameY - areaStart.y);
          const x = Math.min(frameX, areaStart.x);
          const y = Math.min(frameY, areaStart.y);
          
          if (width > 10 && height > 10) { // Minimum size
            createReviewHandler(
              projectId,
              selectedBreakpoint,
              'area',
              { x, y, width, height },
              null,
              reviewColor
            ).then(() => {
              if (onReviewAdd) onReviewAdd();
            });
          }
        }
      }
      setAreaStart(null);
    }
    
    setIsDraggingCanvas(false);
    setDraggingFrame(null);
  };

  // Handle frame drag start
  const handleFrameMouseDown = (e, frameIndex) => {
    // Allow dragging from label or frame wrapper, but not from iframe
    const target = e.target;
    const isIframe = target.tagName === 'IFRAME' || target.closest('iframe');
    
    if (e.button === 0 && !isIframe) {
      e.stopPropagation();
      e.preventDefault();
      setDraggingFrame(frameIndex);
      
      const canvasRect = canvasRef.current?.getBoundingClientRect();
      if (canvasRect) {
        const mouseX = e.clientX - canvasRect.left;
        const mouseY = e.clientY - canvasRect.top;
        
        // Convert screen coordinates to canvas coordinates
        const canvasX = (mouseX - pan.x) / zoom;
        const canvasY = (mouseY - pan.y) / zoom;
        
        // Calculate offset from frame position
        const offsetX = canvasX - framePositions[frameIndex].x;
        const offsetY = canvasY - framePositions[frameIndex].y;
        
        setFrameDragStart({
          x: offsetX,
          y: offsetY,
          frameIndex,
        });
      }
    }
  };

  // Handle zoom controls
  const handleZoomIn = () => {
    setZoom((prevZoom) => Math.min(MAX_ZOOM, prevZoom + ZOOM_STEP));
  };

  const handleZoomOut = () => {
    setZoom((prevZoom) => Math.max(MIN_ZOOM, prevZoom - ZOOM_STEP));
  };

  const handleResetZoom = () => {
    setZoom(0.5);
    setPan({ x: 0, y: 0 });
    setFramePositions(getInitialPositions(breakpoints));
  };

  const handleAddBreakpoint = (newBreakpoint) => {
    const updatedBreakpoints = [...breakpoints, newBreakpoint];
    setBreakpoints(updatedBreakpoints);
    
    // Calculate position for new breakpoint (place it after the last one)
    const lastPosition = framePositions[framePositions.length - 1];
    const lastBreakpoint = breakpoints[breakpoints.length - 1];
    const gap = 50;
    const newX = lastPosition.x + lastBreakpoint.width + gap;
    const newY = lastPosition.y;
    
    setFramePositions([...framePositions, { x: newX, y: newY }]);
  };

  const handleDeleteBreakpoint = (index) => {
    if (breakpoints.length <= 1) {
      alert('You must have at least one breakpoint');
      return;
    }
    
    const updatedBreakpoints = breakpoints.filter((_, i) => i !== index);
    const updatedPositions = framePositions.filter((_, i) => i !== index);
    
    setBreakpoints(updatedBreakpoints);
    setFramePositions(updatedPositions);
  };

  // Convert zoom to percentage for display
  const zoomPercent = Math.round(zoom * 100);

  return (
    <div style={styles.wrapper}>
      {/* Zoom Controls */}
      <div style={styles.controls}>
        <button onClick={handleZoomOut} style={styles.controlButton} title="Zoom Out">
          −
        </button>
        <span style={styles.zoomDisplay}>{zoomPercent}%</span>
        <button onClick={handleZoomIn} style={styles.controlButton} title="Zoom In">
          +
        </button>
        <button onClick={handleResetZoom} style={styles.resetButton} title="Reset View">
          Reset
        </button>
        <button onClick={() => setIsModalOpen(true)} style={styles.addButton} title="Add Custom Breakpoint">
          + Add
        </button>
      </div>

      {/* URL Display */}
      <div style={styles.urlDisplay}>
        {url}
      </div>

      {/* Canvas Container */}
      <div
        ref={canvasRef}
        style={{
          ...styles.container,
          cursor: isDraggingCanvas ? 'grabbing' : draggingFrame !== null ? 'grabbing' : 'grab',
        }}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Grid Background */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            backgroundImage: `
              linear-gradient(rgba(255, 255, 255, 0.05) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255, 255, 255, 0.05) 1px, transparent 1px)
            `,
            backgroundSize: `${20 * zoom}px ${20 * zoom}px`,
            backgroundPosition: '0 0',
            pointerEvents: 'none',
          }}
        />

        {/* Canvas Content */}
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
            transformOrigin: '0 0',
            width: '100%',
            height: '100%',
          }}
          className="canvas-content"
        >
          {breakpoints.map((bp, index) => (
            <div
              key={`${bp.name}-${index}`}
              style={{
                position: 'absolute',
                left: `${framePositions[index]?.x || 100}px`,
                top: `${framePositions[index]?.y || 100}px`,
                cursor: draggingFrame === index ? 'grabbing' : 'grab',
              }}
              className="breakpoint-frame"
              onMouseDown={(e) => {
                handleFrameMouseDown(e, index);
                if (onBreakpointSelect) {
                  onBreakpointSelect(index);
                }
              }}
            >
              <BreakpointFrame
                url={url}
                width={bp.width}
                height={bp.height}
                label={bp.name}
                proxyBaseUrl={proxyBaseUrl}
                scale={zoom}
                isDragging={draggingFrame === index}
                onDelete={() => handleDeleteBreakpoint(index)}
                canDelete={breakpoints.length > 1}
                isSelected={selectedBreakpoint === index}
                mode={overlayMode}
                currentUser={currentUser}
                projectId={projectId}
                onCommentsUpdate={onCommentsUpdate}
              />
              {reviewMode && selectedBreakpoint === index && reviews
                .filter(r => r.breakpointIndex === index)
                .map((review) => (
                  <ReviewMarker
                    key={review._id}
                    review={review}
                    scale={zoom}
                  />
                ))}
              {/* Area selection preview */}
              {reviewMode && selectedBreakpoint === index && areaPreview && (
                <div
                  className="review-marker"
                  style={{
                    position: 'absolute',
                    left: `${areaPreview.x}px`,
                    top: `${areaPreview.y}px`,
                    width: `${areaPreview.width}px`,
                    height: `${areaPreview.height}px`,
                    border: `2px dashed ${reviewColor}`,
                    backgroundColor: `${reviewColor}20`,
                    pointerEvents: 'none',
                    zIndex: 1000,
                  }}
                />
              )}
            </div>
          ))}
        </div>
      </div>

      {/* Add Breakpoint Modal */}
      <AddBreakpointModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        onAdd={handleAddBreakpoint}
      />
    </div>
  );
}

const styles = {
  wrapper: {
    width: '100vw',
    height: '100vh',
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1a1a1a',
  },
  controls: {
    position: 'absolute',
    top: '80px',
    right: '16px',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    backgroundColor: 'rgba(42, 42, 42, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '8px 12px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    zIndex: 100,
    boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
  },
  urlDisplay: {
    position: 'absolute',
    top: '80px',
    left: '16px',
    backgroundColor: 'rgba(42, 42, 42, 0.95)',
    backdropFilter: 'blur(10px)',
    padding: '8px 16px',
    borderRadius: '8px',
    border: '1px solid rgba(255, 255, 255, 0.1)',
    fontSize: '12px',
    color: '#999',
    maxWidth: '400px',
    overflow: 'hidden',
    textOverflow: 'ellipsis',
    whiteSpace: 'nowrap',
    zIndex: 100,
  },
  controlButton: {
    width: '32px',
    height: '32px',
    backgroundColor: '#3a3a3a',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '18px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    transition: 'background-color 0.2s',
  },
  zoomDisplay: {
    minWidth: '50px',
    textAlign: 'center',
    fontSize: '14px',
    fontWeight: '600',
    color: '#fff',
  },
  resetButton: {
    padding: '6px 12px',
    backgroundColor: '#3a3a3a',
    color: '#fff',
    border: '1px solid #444',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    marginLeft: '8px',
    transition: 'background-color 0.2s',
  },
  addButton: {
    padding: '6px 12px',
    backgroundColor: '#3a3a3a',
    color: '#fff',
    border: '1px solid rgba(74, 158, 255, 0.3)',
    borderRadius: '4px',
    cursor: 'pointer',
    fontSize: '12px',
    fontWeight: '600',
    marginLeft: '8px',
    transition: 'all 0.2s',
    display: 'flex',
    alignItems: 'center',
    gap: '4px',
  },
  container: {
    width: '100%',
    height: '100%',
    position: 'relative',
    overflow: 'hidden',
  },
};

