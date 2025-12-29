import { useState, useEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { io } from 'socket.io-client';
import axios from 'axios';
import CommentThread from './CommentThread';
import DrawingCanvas from './DrawingCanvas';
import { captureMetadata } from '@/lib/captureMetadata';
import { captureScreenshot } from '@/lib/captureScreenshot';
import { API_BASE_URL, SOCKET_URL } from '../config.js';

export default function ReviewOverlay({ 
  targetUrl, 
  breakpoint, 
  iframeRef,
  mode = 'pan',
  currentUser = 'Anonymous',
  projectId,
  onCommentsUpdate,
}) {
  const [comments, setComments] = useState([]);
  const [activeComment, setActiveComment] = useState(null);
  const [drawings, setDrawings] = useState([]);
  const [socket, setSocket] = useState(null);
  const [pendingComment, setPendingComment] = useState(null);
  const [iframeLoaded, setIframeLoaded] = useState(false);
  const [isCreatingComment, setIsCreatingComment] = useState(false);

  // Function to send message to iframe
  const sendMessageToIframe = useCallback((message) => {
    if (!iframeRef?.current?.contentWindow) {
      console.log('Iframe not ready yet');
      return false;
    }
    
    try {
      iframeRef.current.contentWindow.postMessage(message, '*');
      return true;
    } catch (e) {
      console.error('Error sending message to iframe:', e);
      return false;
    }
  }, [iframeRef]);

  // Initialize Socket.io connection
  useEffect(() => {
    if (!targetUrl) return;

    const newSocket = io(SOCKET_URL, {
      transports: ['websocket', 'polling'],
    });
    
    newSocket.emit('join-session', { url: targetUrl });
    
    newSocket.on('comment-added', (comment) => {
      setComments(prev => {
        if (prev.find(c => c.id === comment.id)) return prev;
        return [...prev, comment];
      });
    });
    
    newSocket.on('comment-updated', (comment) => {
      setComments(prev => 
        prev.map(c => c.id === comment.id ? comment : c)
      );
    });
    
    newSocket.on('comment-deleted', (data) => {
      setComments(prev => prev.filter(c => c.id !== data.id));
    });
    
    setSocket(newSocket);
    
    return () => {
      newSocket.disconnect();
    };
  }, [targetUrl]);

  // Fetch comments function
  const fetchComments = useCallback(async () => {
    if (!targetUrl) return;
    try {
      const response = await axios.get(`${API_BASE_URL}/comments`, {
        params: { url: targetUrl, breakpoint, projectId },
      });
      setComments(response.data.comments || []);
    } catch (error) {
      console.error('Error fetching comments:', error);
    }
  }, [targetUrl, breakpoint, projectId]);

  // Fetch comments on mount
  useEffect(() => {
    fetchComments();
    
    // Set up polling to refresh comments (less frequent)
    const interval = setInterval(fetchComments, 5000);
    return () => clearInterval(interval);
  }, [fetchComments]);

  // Listen for iframe load
  useEffect(() => {
    const iframe = iframeRef?.current;
    if (!iframe) return;

    const handleLoad = () => {
      console.log('Iframe loaded for breakpoint:', breakpoint);
      setIframeLoaded(true);
      
      // Send initial mode after load
      setTimeout(() => {
        sendMessageToIframe({
          type: 'TOGGLE_COMMENT_MODE',
          enabled: mode === 'comment',
        });
      }, 200);
    };

    // Check if already loaded
    if (iframe.contentDocument?.readyState === 'complete') {
      handleLoad();
    } else {
      iframe.addEventListener('load', handleLoad);
    }

    return () => {
      iframe.removeEventListener('load', handleLoad);
    };
  }, [iframeRef, breakpoint, mode, sendMessageToIframe]);

  // Send comment mode toggle when mode changes
  useEffect(() => {
    if (!iframeLoaded) return;
    
    console.log('Sending mode to iframe:', mode, 'for breakpoint:', breakpoint);
    
    sendMessageToIframe({
      type: 'TOGGLE_COMMENT_MODE',
      enabled: mode === 'comment',
      breakpoint: breakpoint, // Include breakpoint identifier
    });
    
    // Send markers if in comment mode
    if (mode === 'comment' && comments.length > 0) {
      const filteredComments = comments.filter(c => c.breakpoint === breakpoint);
      sendMessageToIframe({
        type: 'RENDER_MARKERS',
        comments: filteredComments,
      });
    } else {
      sendMessageToIframe({
        type: 'CLEAR_MARKERS',
      });
    }
  }, [mode, iframeLoaded, comments, breakpoint, sendMessageToIframe]);

  // Listen for messages from iframe
  useEffect(() => {
    const handleMessage = (event) => {
      if (!event.data || !event.data.type) return;
      
      // Only handle messages from our breakpoint
      if (event.data.breakpoint && event.data.breakpoint !== breakpoint) {
        return; // Message is for a different breakpoint
      }
      
      if (event.data.type === 'ADD_COMMENT_REQUEST') {
        // Only show modal if we're in comment mode
        if (mode !== 'comment') {
          console.warn('Comment request received but not in comment mode');
          return;
        }
        
        console.log(`Comment request received for ${breakpoint}:`, event.data);
        
        // Use viewport coordinates for modal position
        setPendingComment({
          x: event.data.x,
          y: event.data.y,
          clientX: event.data.clientX,
          clientY: event.data.clientY,
        });
      }
      
      if (event.data.type === 'OPEN_COMMENT') {
        const comment = comments.find(c => c.id === event.data.commentId);
        if (comment) {
          setActiveComment(comment);
        }
      }
    };
    
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [comments, mode, breakpoint]);

  const handleCreateComment = async (text) => {
    if (!pendingComment || isCreatingComment) {
      return;
    }

    const commentText = typeof text === 'string' ? text.trim() : '';
    if (!commentText) {
      setPendingComment(null);
      return;
    }

    setIsCreatingComment(true);
    
    // Store position for screenshot capture
    const commentPosition = { x: pendingComment.x, y: pendingComment.y };

    try {
      // Capture browser/device metadata (fast - no screenshot yet)
      const metadata = captureMetadata(targetUrl);
      console.log('Captured metadata:', metadata);
      
      // Create comment immediately (without screenshot for speed)
      const response = await axios.post(`${API_BASE_URL}/comments`, {
        url: targetUrl,
        x: commentPosition.x,
        y: commentPosition.y,
        breakpoint: breakpoint || 'desktop',
        text: commentText,
        author: currentUser,
        metadata: metadata,
        projectId: projectId,
      });

      const newComment = response.data.comment;
      setComments(prev => [...prev, newComment]);
      
      // Broadcast via socket
      if (socket) {
        socket.emit('add-comment', {
          url: targetUrl,
          comment: newComment,
        });
      }
      
      // Refresh comments and notify parent
      fetchComments();
      onCommentsUpdate?.();
      
      // Close modal and show comment immediately
      setPendingComment(null);
      setIsCreatingComment(false);
      setActiveComment(newComment);
      
      // Capture screenshot in background (non-blocking)
      if (iframeRef?.current) {
        captureScreenshotInBackground(newComment.id, commentPosition);
      }
    } catch (error) {
      console.error('Error creating comment:', error);
      setPendingComment(null);
      setIsCreatingComment(false);
    }
  };

  // Background screenshot capture - doesn't block UI
  const captureScreenshotInBackground = async (commentId, position) => {
    try {
      console.log('Capturing screenshot in background...');
      const screenshotUrl = await captureScreenshot(
        iframeRef.current,
        position.x,
        position.y,
        { width: 500, height: 350 }
      );
      
      if (screenshotUrl) {
        console.log('Screenshot captured, updating comment:', screenshotUrl);
        // Update comment with screenshot
        await axios.patch(`${API_BASE_URL}/comments/${commentId}/screenshot`, {
          screenshot: screenshotUrl,
        });
        
        // Refresh to show screenshot
        fetchComments();
        onCommentsUpdate?.();
        
        // Update active comment if it's the same one
        setActiveComment(prev => {
          if (prev?.id === commentId) {
            return { ...prev, metadata: { ...prev.metadata, screenshot: screenshotUrl } };
          }
          return prev;
        });
      }
    } catch (error) {
      console.error('Background screenshot capture failed:', error);
      // Silent fail - comment is already created
    }
  };

  const handleReply = async (text, author, image = null) => {
    if (!activeComment || (!text.trim() && !image)) return;

    try {
      console.log('Adding reply to comment:', activeComment.id);
      const response = await axios.post(`${API_BASE_URL}/comments/${activeComment.id}/replies`, {
        text: text.trim() || '📷 Image',
        author: author || currentUser,
        image: image,
      });
      
      console.log('Reply response:', response.data);
      
      // Update active comment with the response data
      if (response.data.comment) {
        setActiveComment(response.data.comment);
        setComments(prev => 
          prev.map(c => c.id === response.data.comment.id ? response.data.comment : c)
        );
      }
      
      // Also fetch to ensure sync and notify parent
      fetchComments();
      onCommentsUpdate?.();
    } catch (error) {
      console.error('Error adding reply:', error);
    }
  };

  const handleResolve = async () => {
    if (!activeComment) return;

    try {
      const response = await axios.patch(`${API_BASE_URL}/comments/${activeComment.id}`, {
        resolved: !activeComment.resolved,
      });
      
      const updated = response.data.comment;
      setComments(prev => 
        prev.map(c => c.id === updated.id ? updated : c)
      );
      setActiveComment(updated);
      
      // Broadcast via socket
      if (socket) {
        socket.emit('update-comment', {
          url: targetUrl,
          comment: updated,
        });
      }
      
      // Notify parent
      onCommentsUpdate?.();
    } catch (error) {
      console.error('Error resolving comment:', error);
    }
  };

  const handleDelete = async () => {
    if (!activeComment) return;

    if (!window.confirm('Are you sure you want to delete this comment?')) return;

    try {
      await axios.delete(`${API_BASE_URL}/comments/${activeComment.id}`);
      
      setComments(prev => prev.filter(c => c.id !== activeComment.id));
      setActiveComment(null);
      
      // Broadcast via socket
      if (socket) {
        socket.emit('delete-comment', {
          url: targetUrl,
          commentId: activeComment.id,
        });
      }
      
      // Notify parent
      onCommentsUpdate?.();
    } catch (error) {
      console.error('Error deleting comment:', error);
    }
  };

  const handleDrawingComplete = (drawingData) => {
    setDrawings(prev => [...prev, drawingData]);
    
    // Broadcast via socket
    if (socket) {
      socket.emit('drawing-end', {
        url: targetUrl,
        breakpoint,
        drawing: drawingData,
      });
    }
  };

  // Render modal using Portal to escape container constraints
  const renderModal = () => {
    if (!pendingComment) return null;
    
    return createPortal(
      <div style={styles.modalOverlay} onClick={() => !isCreatingComment && setPendingComment(null)}>
        <div 
          style={styles.modal}
          onClick={(e) => e.stopPropagation()}
        >
          <div style={styles.modalHeader}>
            <h3 style={styles.modalTitle}>Add Comment ({breakpoint})</h3>
            <button
              onClick={() => !isCreatingComment && setPendingComment(null)}
              style={{...styles.closeButton, opacity: isCreatingComment ? 0.5 : 1}}
              title="Close"
              disabled={isCreatingComment}
            >
              ×
            </button>
          </div>
          <textarea
            autoFocus
            placeholder="Enter your comment..."
            style={{...styles.textarea, opacity: isCreatingComment ? 0.6 : 1}}
            id={`comment-textarea-${breakpoint}`}
            disabled={isCreatingComment}
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.ctrlKey && !isCreatingComment) {
                e.preventDefault();
                handleCreateComment(e.target.value);
              }
              if (e.key === 'Escape' && !isCreatingComment) {
                setPendingComment(null);
              }
            }}
          />
          <div style={styles.modalActions}>
            <button
              onClick={() => !isCreatingComment && setPendingComment(null)}
              style={{...styles.cancelButton, opacity: isCreatingComment ? 0.5 : 1}}
              disabled={isCreatingComment}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                const textarea = document.getElementById(`comment-textarea-${breakpoint}`);
                if (textarea && !isCreatingComment) {
                  handleCreateComment(textarea.value);
                }
              }}
              style={{
                ...styles.submitButton,
                opacity: isCreatingComment ? 0.8 : 1,
                cursor: isCreatingComment ? 'wait' : 'pointer',
              }}
              disabled={isCreatingComment}
            >
              {isCreatingComment ? (
                <span style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <span style={styles.spinner}></span>
                  Adding...
                </span>
              ) : (
                'Add Comment'
              )}
            </button>
          </div>
        </div>
      </div>,
      document.body
    );
  };

  // Render comment thread using Portal
  const renderCommentThread = () => {
    if (!activeComment) return null;
    
    return createPortal(
      <CommentThread
        comment={activeComment}
        onClose={() => setActiveComment(null)}
        onReply={handleReply}
        onResolve={handleResolve}
        onDelete={handleDelete}
        currentUser={currentUser}
      />,
      document.body
    );
  };

  return (
    <>
      {renderModal()}
      {renderCommentThread()}

      {/* Drawing Canvas */}
      {mode === 'draw' && (
        <DrawingCanvas
          enabled={mode === 'draw'}
          color="#FF6B6B"
          lineWidth={2}
          onDrawingComplete={handleDrawingComplete}
        />
      )}
    </>
  );
}

const styles = {
  modalOverlay: {
    position: 'fixed',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    zIndex: 9999999,
    pointerEvents: 'auto',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  },
  modal: {
    position: 'relative',
    backgroundColor: '#fff',
    borderRadius: '12px',
    padding: '0',
    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.4)',
    width: '320px',
    maxHeight: '300px',
    display: 'flex',
    flexDirection: 'column',
    animation: 'fadeIn 0.2s',
  },
  modalHeader: {
    padding: '16px',
    borderBottom: '1px solid rgba(0, 0, 0, 0.1)',
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalTitle: {
    margin: 0,
    fontSize: '16px',
    fontWeight: '600',
    color: '#1a1a1a',
  },
  closeButton: {
    background: 'none',
    border: 'none',
    fontSize: '24px',
    cursor: 'pointer',
    color: '#666',
    padding: 0,
    width: '24px',
    height: '24px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    lineHeight: 1,
  },
  textarea: {
    width: '100%',
    minHeight: '100px',
    maxHeight: '150px',
    padding: '12px 16px',
    border: 'none',
    fontSize: '14px',
    fontFamily: 'inherit',
    resize: 'none',
    outline: 'none',
    flex: 1,
    overflowY: 'auto',
    boxSizing: 'border-box',
    color: '#1a1a1a',
    backgroundColor: '#fff',
  },
  modalActions: {
    display: 'flex',
    gap: '8px',
    justifyContent: 'flex-end',
    padding: '12px 16px',
    borderTop: '1px solid rgba(0, 0, 0, 0.1)',
  },
  cancelButton: {
    padding: '8px 16px',
    backgroundColor: 'transparent',
    border: '1px solid rgba(0, 0, 0, 0.2)',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    color: '#333',
  },
  submitButton: {
    padding: '8px 16px',
    backgroundColor: '#4C6EF5',
    color: '#fff',
    border: 'none',
    borderRadius: '6px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '600',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: '120px',
  },
  spinner: {
    width: '14px',
    height: '14px',
    border: '2px solid rgba(255, 255, 255, 0.3)',
    borderTopColor: '#fff',
    borderRadius: '50%',
    animation: 'spin 0.8s linear infinite',
  },
};

// Add keyframes for spinner animation
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = `
    @keyframes spin {
      to { transform: rotate(360deg); }
    }
  `;
  if (!document.querySelector('#review-overlay-styles')) {
    styleSheet.id = 'review-overlay-styles';
    document.head.appendChild(styleSheet);
  }
}
