// API Configuration - uses environment variables for deployment flexibility
// In development: defaults to localhost
// In production: set VITE_API_URL and VITE_SOCKET_URL in your environment

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
export const SERVER_BASE_URL = import.meta.env.VITE_SERVER_URL || 'http://localhost:3001';
export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3001';

// Helper to get full URL for uploaded files
export const getFullFileUrl = (url) => {
  if (!url) return null;
  // Already absolute URL (cloud storage, data URL, etc.)
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('data:')) {
    return url;
  }
  // Relative URL - prepend server base
  return `${SERVER_BASE_URL}${url}`;
};

