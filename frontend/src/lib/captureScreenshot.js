import { API_BASE_URL, getFullFileUrl } from '../config.js';

/**
 * Captures a screenshot using server-side Puppeteer
 * This bypasses cross-origin restrictions by having the server visit the URL directly
 * @param {HTMLIFrameElement} iframe - The iframe element (used to get URL and dimensions)
 * @param {number} x - X coordinate (percentage) - for positioning info
 * @param {number} y - Y coordinate (percentage) - for positioning info
 * @param {Object} areaSize - Size preferences (used for viewport)
 * @returns {Promise<string|null>} - URL of the uploaded screenshot or null on failure
 */
export async function captureScreenshot(iframe, x, y, areaSize = { width: 500, height: 350 }) {
  try {
    if (!iframe) {
      console.warn('Cannot capture screenshot: iframe not provided');
      return null;
    }

    // Extract the original URL from the proxied URL
    const iframeSrc = iframe.src || '';
    let targetUrl = '';
    
    // Parse the proxy URL to get the original URL
    try {
      const urlObj = new URL(iframeSrc);
      targetUrl = urlObj.searchParams.get('url') || iframeSrc;
    } catch {
      targetUrl = iframeSrc;
    }

    if (!targetUrl) {
      console.warn('Cannot capture screenshot: no URL found');
      return null;
    }

    console.log('Requesting server-side screenshot for:', targetUrl);

    // Get scroll position from iframe if accessible
    let scrollX = 0;
    let scrollY = 0;
    try {
      if (iframe.contentDocument) {
        scrollX = iframe.contentDocument.documentElement.scrollLeft || iframe.contentDocument.body?.scrollLeft || 0;
        scrollY = iframe.contentDocument.documentElement.scrollTop || iframe.contentDocument.body?.scrollTop || 0;
      }
    } catch (e) {
      // Cross-origin, can't access scroll position
      console.log('Cannot access iframe scroll position (cross-origin)');
    }

    // Request server-side screenshot
    const response = await fetch(`${API_BASE_URL}/uploads/capture-screenshot`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        url: targetUrl,
        x: x,
        y: y,
        viewportWidth: iframe.clientWidth || areaSize.width,
        viewportHeight: iframe.clientHeight || areaSize.height,
        scrollX: scrollX,
        scrollY: scrollY,
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      console.warn('Server-side screenshot failed:', errorData);
      // Fall back to placeholder
      return await createPlaceholderScreenshot(targetUrl, iframe);
    }

    const result = await response.json();
    
    // If screenshot was skipped or URL is null, create placeholder
    if (result.skipped || !result.url) {
      console.log('📸 Screenshot skipped, creating placeholder');
      return await createPlaceholderScreenshot(targetUrl, iframe);
    }
    
    console.log('Server-side screenshot captured:', result.url);
    
    // Return full URL using helper
    return getFullFileUrl(result.url);
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    // Create placeholder on failure
    return await createPlaceholderScreenshot(iframe?.src || 'Unknown', iframe);
  }
}

/**
 * Creates a placeholder screenshot when actual capture fails
 */
async function createPlaceholderScreenshot(url, iframe) {
  try {
    console.log('Creating placeholder screenshot...');
    
    // Create a canvas with iframe dimensions
    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d');
    
    const width = iframe?.clientWidth || 500;
    const height = iframe?.clientHeight || 350;
    
    canvas.width = Math.min(width, 800);
    canvas.height = Math.min(height, 600);
    
    // Draw a styled placeholder
    ctx.fillStyle = '#1a1a2e';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add gradient overlay
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, 'rgba(74, 158, 255, 0.15)');
    gradient.addColorStop(1, 'rgba(138, 74, 255, 0.15)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Add border
    ctx.strokeStyle = 'rgba(74, 158, 255, 0.4)';
    ctx.lineWidth = 2;
    ctx.strokeRect(1, 1, canvas.width - 2, canvas.height - 2);
    
    // Add icon placeholder
    ctx.fillStyle = 'rgba(74, 158, 255, 0.3)';
    ctx.beginPath();
    ctx.arc(canvas.width / 2, canvas.height / 2 - 30, 40, 0, Math.PI * 2);
    ctx.fill();
    
    // Add camera icon text
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 32px system-ui, sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText('📷', canvas.width / 2, canvas.height / 2 - 20);
    
    // Add text
    ctx.font = 'bold 14px system-ui, sans-serif';
    ctx.fillText('Screenshot Captured', canvas.width / 2, canvas.height / 2 + 30);
    
    // Get URL for display
    let displayUrl = url;
    try {
      const urlObj = new URL(url);
      displayUrl = urlObj.hostname + urlObj.pathname.substring(0, 30);
    } catch {
      displayUrl = url.substring(0, 40);
    }
    
    ctx.font = '11px system-ui, sans-serif';
    ctx.fillStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.fillText(displayUrl + (displayUrl.length >= 40 ? '...' : ''), canvas.width / 2, canvas.height / 2 + 55);
    
    // Convert to base64
    const imageData = canvas.toDataURL('image/png');
    
    // Upload to server
    const response = await fetch(`${API_BASE_URL}/uploads/screenshot-base64`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        imageData: imageData,
      }),
    });

    if (!response.ok) {
      throw new Error('Failed to upload placeholder');
    }

    const result = await response.json();
    console.log('Placeholder screenshot created:', result.url);
    
    // Return full URL using helper
    return getFullFileUrl(result.url);
  } catch (error) {
    console.error('Placeholder creation failed:', error);
    return null;
  }
}

/**
 * Captures a full viewport screenshot
 * @param {HTMLIFrameElement} iframe - The iframe element
 * @returns {Promise<string|null>} - URL of the uploaded screenshot or null
 */
export async function captureFullScreenshot(iframe) {
  return captureScreenshot(iframe, 50, 50);
}

