(function() {
  // Only run once
  if (window.__OVERLAY_INITIALIZED__) return;
  window.__OVERLAY_INITIALIZED__ = true;

  // Store breakpoint identifier
  window.__BREAKPOINT__ = null;

  // Create overlay container - positioned absolute to cover entire document
  const overlay = document.createElement('div');
  overlay.id = 'review-overlay';
  overlay.style.cssText = `
    position: absolute;
    top: 0;
    left: 0;
    width: 100%;
    min-height: 100%;
    pointer-events: none;
    z-index: 999999;
  `;
  document.body.appendChild(overlay);
  
  // Update overlay size when document changes
  function updateOverlaySize() {
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    overlay.style.height = docHeight + 'px';
  }
  
  // Update on load and resize
  window.addEventListener('load', updateOverlaySize);
  window.addEventListener('resize', updateOverlaySize);
  new MutationObserver(updateOverlaySize).observe(document.body, { 
    childList: true, 
    subtree: true,
    attributes: true 
  });
  updateOverlaySize();

  // Handle clicks to add comments
  document.addEventListener('click', function(e) {
    if (!window.__COMMENT_MODE__) return;
    
    // Don't capture clicks on markers or overlay elements
    if (e.target.closest('#review-overlay') && e.target.closest('.comment-marker')) {
      return;
    }
    
    e.preventDefault();
    e.stopPropagation();
    e.stopImmediatePropagation();
    
    // Calculate position relative to the DOCUMENT (not viewport)
    // This ensures pins stay in the correct position even when scrolling
    const docWidth = Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.offsetWidth
    );
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    
    // Use pageX/pageY which include scroll offset
    const x = (e.pageX / docWidth) * 100;
    const y = (e.pageY / docHeight) * 100;
    
    console.log('Comment mode click detected:', { 
      breakpoint: window.__BREAKPOINT__,
      x, 
      y, 
      pageX: e.pageX,
      pageY: e.pageY,
      docWidth,
      docHeight
    });
    
    // Post message to parent frame with breakpoint identifier
    if (window.parent && window.parent !== window) {
      window.parent.postMessage({
        type: 'ADD_COMMENT_REQUEST',
        breakpoint: window.__BREAKPOINT__,
        x: x,
        y: y,
        pageX: e.pageX,
        pageY: e.pageY,
        docWidth: docWidth,
        docHeight: docHeight
      }, '*');
    } else {
      console.warn('Could not find parent window for postMessage');
    }
  }, true);

  // Listen for commands from parent
  window.addEventListener('message', function(e) {
    if (!e.data || !e.data.type) return;
    
    if (e.data.type === 'TOGGLE_COMMENT_MODE') {
      window.__COMMENT_MODE__ = e.data.enabled;
      window.__BREAKPOINT__ = e.data.breakpoint || null;
      document.body.style.cursor = e.data.enabled ? 'crosshair' : 'default';
      console.log('Comment mode toggled:', e.data.enabled, 'breakpoint:', e.data.breakpoint);
    }
    
    if (e.data.type === 'RENDER_MARKERS') {
      renderCommentMarkers(e.data.comments);
    }
    
    if (e.data.type === 'CLEAR_MARKERS') {
      overlay.innerHTML = '';
    }
  });

  // Render comment markers at document-relative positions
  function renderCommentMarkers(comments) {
    overlay.innerHTML = '';
    
    if (!comments || !Array.isArray(comments)) return;
    
    // Get current document dimensions
    const docWidth = Math.max(
      document.body.scrollWidth,
      document.documentElement.scrollWidth,
      document.body.offsetWidth,
      document.documentElement.offsetWidth
    );
    const docHeight = Math.max(
      document.body.scrollHeight,
      document.documentElement.scrollHeight,
      document.body.offsetHeight,
      document.documentElement.offsetHeight
    );
    
    comments.forEach(comment => {
      const marker = document.createElement('div');
      marker.className = 'comment-marker';
      marker.dataset.commentId = comment.id;
      
      // Convert percentage to pixel position based on document size
      const leftPx = (comment.x / 100) * docWidth;
      const topPx = (comment.y / 100) * docHeight;
      
      marker.style.cssText = `
        position: absolute;
        left: ${leftPx}px;
        top: ${topPx}px;
        width: 32px;
        height: 32px;
        background: ${comment.resolved ? '#51CF66' : '#FF6B6B'};
        border: 3px solid white;
        border-radius: 50%;
        pointer-events: auto;
        cursor: pointer;
        display: flex;
        align-items: center;
        justify-content: center;
        color: white;
        font-weight: bold;
        font-size: 14px;
        box-shadow: 0 2px 8px rgba(0,0,0,0.3);
        transform: translate(-50%, -50%);
        transition: transform 0.2s;
        z-index: 1000000;
      `;
      
      const count = comment.count || 1;
      marker.textContent = count > 1 ? count : '💬';
      
      marker.addEventListener('click', (e) => {
        e.stopPropagation();
        if (window.parent && window.parent !== window) {
          window.parent.postMessage({
            type: 'OPEN_COMMENT',
            breakpoint: window.__BREAKPOINT__,
            commentId: comment.id
          }, '*');
        }
      });
      
      marker.addEventListener('mouseenter', () => {
        marker.style.transform = 'translate(-50%, -50%) scale(1.2)';
      });
      
      marker.addEventListener('mouseleave', () => {
        marker.style.transform = 'translate(-50%, -50%) scale(1)';
      });
      
      overlay.appendChild(marker);
    });
  }

  console.log('Review overlay initialized');
})();
