import express from 'express';
import axios from 'axios';
import * as cheerio from 'cheerio';
import cors from 'cors';
import { URL } from 'url';
import path from 'path';
import { fileURLToPath } from 'url';
import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { createServer } from 'http';
import { Server } from 'socket.io';
import passport from 'passport';
import authRoutes from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import reviewRoutes from './routes/reviews.js';
import commentRoutes from './routes/comments.js';
import shareRoutes from './routes/share.js';
import uploadRoutes from './routes/uploads.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config();

const app = express();
const httpServer = createServer(app);

const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

// CORS configuration - allow frontend origin
const corsOrigins = process.env.CORS_ORIGINS 
  ? process.env.CORS_ORIGINS.split(',') 
  : [FRONTEND_URL, 'http://localhost:5173', 'http://localhost:3000'];

const io = new Server(httpServer, {
  cors: {
    origin: corsOrigins,
    methods: ['GET', 'POST'],
  },
});

// MongoDB Connection
const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/reviewonly';
console.log("URI" , MONGODB_URI)

// Connect to MongoDB with better error handling
const connectDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI, {
      serverSelectionTimeoutMS: 10000, // 10 second timeout
    });
    
    console.log('✅ MongoDB connected successfully');
    console.log(`   Database: ${mongoose.connection.name}`);
    console.log(`   Host: ${mongoose.connection.host}:${mongoose.connection.port || 'N/A'}`);
  } catch (err) {
    console.error('❌ MongoDB connection error:', err.message);
    
    if (err.message.includes('ETIMEOUT') || err.message.includes('ENOTFOUND')) {
      console.error('\n🔴 Connection Timeout - Your IP is likely NOT whitelisted!');
      console.error('\n💡 Quick Fix:');
      console.error('   1. Go to MongoDB Atlas → Network Access');
      console.error('   2. Click "Add IP Address"');
      console.error('   3. Click "Allow Access from Anywhere" (for development)');
      console.error('   4. Wait 1-2 minutes for changes to apply');
      console.error('   5. Try running: npm run dev');
    } else if (err.message.includes('authentication')) {
      console.error('\n🔴 Authentication Failed!');
      console.error('   - Check your username and password in .env');
      console.error('   - Make sure special characters are URL encoded');
    } else {
      console.error('\n💡 Make sure MongoDB is running:');
      console.error('   - Local: mongod (or start MongoDB service)');
      console.error('   - Atlas: Check your connection string in .env');
    }
    console.error('\n📖 See TROUBLESHOOTING.md for detailed help');
    process.exit(1);
  }
};

// Handle connection events
mongoose.connection.on('disconnected', () => {
  console.warn('⚠️  MongoDB disconnected');
});

mongoose.connection.on('error', (err) => {
  console.error('❌ MongoDB error:', err);
});

// Connect to database
connectDB();

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(passport.initialize());

// Static files for overlay script
app.use(express.static('public'));

// Serve uploaded files
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/uploads', uploadRoutes);
app.use('/api', shareRoutes); // Share routes: /api/projects/:id/share and /api/share/:token

// Helper function to rewrite URLs
function rewriteUrl(originalUrl, baseUrl) {
  if (!originalUrl) return '';
  
  try {
    // If already absolute URL, use it
    if (originalUrl.startsWith('http://') || originalUrl.startsWith('https://')) {
      return `/proxy?url=${encodeURIComponent(originalUrl)}`;
    }
    
    // If protocol-relative URL (//example.com)
    if (originalUrl.startsWith('//')) {
      const protocol = new URL(baseUrl).protocol;
      const absoluteUrl = protocol + originalUrl;
      return `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
    }
    
    // If absolute path (/path)
    if (originalUrl.startsWith('/')) {
      const base = new URL(baseUrl);
      const absoluteUrl = `${base.protocol}//${base.host}${originalUrl}`;
      return `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
    }
    
    // Relative URL (path/to/file)
    const base = new URL(baseUrl);
    const absoluteUrl = new URL(originalUrl, base).href;
    return `/proxy?url=${encodeURIComponent(absoluteUrl)}`;
  } catch (error) {
    console.error('Error rewriting URL:', originalUrl, error);
    return originalUrl;
  }
}

// Helper function to rewrite CSS url() references
function rewriteCssUrls(css, baseUrl) {
  // Rewrite url() references
  let rewritten = css.replace(/url\((['"]?)([^'")]+)\1\)/gi, (match, quote, url) => {
    const trimmedUrl = url.trim();
    // Skip data URLs and already-proxied URLs
    if (trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('/proxy')) {
      return match;
    }
    const rewrittenUrl = rewriteUrl(trimmedUrl, baseUrl);
    return `url(${quote}${rewrittenUrl}${quote})`;
  });
  
  // Rewrite @import statements
  rewritten = rewritten.replace(/@import\s+(['"])([^'"]+)\1/gi, (match, quote, url) => {
    const trimmedUrl = url.trim();
    if (trimmedUrl.startsWith('/proxy')) {
      return match;
    }
    const rewrittenUrl = rewriteUrl(trimmedUrl, baseUrl);
    return `@import ${quote}${rewrittenUrl}${quote}`;
  });
  
  // Rewrite @import url() statements  
  rewritten = rewritten.replace(/@import\s+url\((['"]?)([^'")]+)\1\)/gi, (match, quote, url) => {
    const trimmedUrl = url.trim();
    if (trimmedUrl.startsWith('data:') || trimmedUrl.startsWith('/proxy')) {
      return match;
    }
    const rewrittenUrl = rewriteUrl(trimmedUrl, baseUrl);
    return `@import url(${quote}${rewrittenUrl}${quote})`;
  });
  
  return rewritten;
}

// Proxy endpoint
app.get('/proxy', async (req, res) => {
  const targetUrl = req.query.url;
  
  if (!targetUrl) {
    return res.status(400).json({ error: 'Missing url parameter' });
  }
  
  try {
    console.log('Proxying URL:', targetUrl);
    
    // Fetch the target URL
    const response = await axios.get(targetUrl, {
      responseType: 'arraybuffer',
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36',
        'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
        'Accept-Language': 'en-US,en;q=0.9',
      },
      maxRedirects: 5,
      validateStatus: (status) => status < 500,
    });
    
    const contentType = response.headers['content-type'] || '';
    const isHtml = contentType.includes('text/html');
    const isCss = contentType.includes('text/css') || targetUrl.endsWith('.css');
    
    // Strip blocking headers for all responses
    res.removeHeader('x-frame-options');
    res.removeHeader('content-security-policy');
    res.removeHeader('content-security-policy-report-only');
    
    // Add CORS headers for fonts
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS');
    
    // Handle CSS files - rewrite url() references for fonts, images, etc.
    if (isCss) {
      const css = response.data.toString('utf-8');
      const rewrittenCss = rewriteCssUrls(css, targetUrl);
      
      res.setHeader('Content-Type', 'text/css; charset=utf-8');
      return res.send(rewrittenCss);
    }
    
    // If not HTML and not CSS, proxy as-is (for images, fonts, JS, etc.)
    if (!isHtml) {
      // Set appropriate content type
      if (contentType) {
        res.setHeader('Content-Type', contentType);
      }
      
      return res.send(response.data);
    }
    
    // Parse HTML
    const html = response.data.toString('utf-8');
    const $ = cheerio.load(html);
    
    // Rewrite all image URLs
    $('img').each((i, elem) => {
      const $img = $(elem);
      const src = $img.attr('src');
      const srcset = $img.attr('srcset');
      
      if (src) {
        $img.attr('src', rewriteUrl(src, targetUrl));
      }
      
      if (srcset) {
        const rewrittenSrcset = srcset.split(',').map(part => {
          const parts = part.trim().split(/\s+/);
          if (parts.length > 0) {
            const url = parts[0];
            const rest = parts.slice(1).join(' ');
            return `${rewriteUrl(url, targetUrl)} ${rest}`.trim();
          }
          return part;
        }).join(', ');
        $img.attr('srcset', rewrittenSrcset);
      }
    });
    
    // Rewrite stylesheet links (including Google Fonts)
    $('link[rel="stylesheet"]').each((i, elem) => {
      const $link = $(elem);
      const href = $link.attr('href');
      if (href) {
        $link.attr('href', rewriteUrl(href, targetUrl));
      }
    });
    
    // Rewrite font preload links
    $('link[rel="preload"][as="font"]').each((i, elem) => {
      const $link = $(elem);
      const href = $link.attr('href');
      if (href) {
        $link.attr('href', rewriteUrl(href, targetUrl));
        // Add crossorigin if not present (required for fonts)
        if (!$link.attr('crossorigin')) {
          $link.attr('crossorigin', 'anonymous');
        }
      }
    });
    
    // Rewrite all link tags with href (covers preconnect, dns-prefetch, etc.)
    $('link[href]').each((i, elem) => {
      const $link = $(elem);
      const href = $link.attr('href');
      const rel = $link.attr('rel') || '';
      
      // Skip already processed stylesheet and preload links
      if (rel.includes('stylesheet') || (rel.includes('preload') && $link.attr('as') === 'font')) {
        return;
      }
      
      // Proxy preconnect and dns-prefetch for font services
      if (rel.includes('preconnect') || rel.includes('dns-prefetch')) {
        // Remove preconnect/dns-prefetch hints as they're not needed with proxy
        $link.remove();
        return;
      }
      
      // Rewrite other link hrefs (icons, manifests, etc.)
      if (href && !href.startsWith('data:') && !href.startsWith('/proxy')) {
        $link.attr('href', rewriteUrl(href, targetUrl));
      }
    });
    
    // Rewrite script sources
    $('script[src]').each((i, elem) => {
      const $script = $(elem);
      const src = $script.attr('src');
      if (src) {
        $script.attr('src', rewriteUrl(src, targetUrl));
      }
    });
    
    // Rewrite video sources
    $('video source, video[src]').each((i, elem) => {
      const $video = $(elem);
      const src = $video.attr('src');
      if (src) {
        $video.attr('src', rewriteUrl(src, targetUrl));
      }
    });
    
    // Rewrite CSS in <style> tags
    $('style').each((i, elem) => {
      const $style = $(elem);
      const css = $style.html();
      if (css) {
        $style.html(rewriteCssUrls(css, targetUrl));
      }
    });
    
    // Rewrite inline styles
    $('[style]').each((i, elem) => {
      const $elem = $(elem);
      const style = $elem.attr('style');
      if (style) {
        $elem.attr('style', rewriteCssUrls(style, targetUrl));
      }
    });
    
    // Rewrite CSS @import statements
    $('style').each((i, elem) => {
      const $style = $(elem);
      let css = $style.html();
      if (css) {
        css = css.replace(/@import\s+(['"])([^'"]+)\1/gi, (match, quote, url) => {
          const rewritten = rewriteUrl(url, targetUrl);
          return `@import ${quote}${rewritten}${quote}`;
        });
        $style.html(css);
      }
    });
    
    // Rewrite link tags for other resources (favicons, etc.)
    $('link[href]').each((i, elem) => {
      const $link = $(elem);
      const href = $link.attr('href');
      if (href && !$link.attr('rel') || $link.attr('rel') !== 'stylesheet') {
        $link.attr('href', rewriteUrl(href, targetUrl));
      }
    });
    
    // Inject overlay script
    $('body').append(`
      <script src="${BACKEND_URL}/overlay-script.js"></script>
      <script>
        window.__REVIEW_MODE__ = true;
        window.__TARGET_URL__ = "${targetUrl}";
        window.__SOCKET_URL__ = "${BACKEND_URL}";
      </script>
    `);
    
    // Get modified HTML
    const modifiedHtml = $.html();
    
    // Strip blocking headers and set response
    res.removeHeader('x-frame-options');
    res.removeHeader('content-security-policy');
    res.removeHeader('content-security-policy-report-only');
    
    res.setHeader('Content-Type', 'text/html; charset=utf-8');
    res.send(modifiedHtml);
    
  } catch (error) {
    console.error('Proxy error:', error.message);
    res.status(500).json({ 
      error: 'Failed to proxy URL',
      message: error.message 
    });
  }
});

// Socket.io connection handling
io.on('connection', (socket) => {
  console.log('Client connected:', socket.id);
  
  // User joins a review session
  socket.on('join-session', (data) => {
    const { url } = data;
    socket.join(url);
    socket.to(url).emit('user-joined', { socketId: socket.id });
    console.log(`User ${socket.id} joined session: ${url}`);
  });
  
  // New comment added
  socket.on('add-comment', (data) => {
    io.to(data.url).emit('comment-added', data.comment);
  });
  
  // Comment updated
  socket.on('update-comment', (data) => {
    io.to(data.url).emit('comment-updated', data.comment);
  });
  
  // Comment deleted
  socket.on('delete-comment', (data) => {
    io.to(data.url).emit('comment-deleted', { id: data.commentId });
  });
  
  // Cursor position
  socket.on('cursor-move', (data) => {
    socket.to(data.url).emit('cursor-update', {
      socketId: socket.id,
      x: data.x,
      y: data.y,
      author: data.author,
    });
  });
  
  // Drawing events
  socket.on('drawing-start', (data) => {
    socket.to(data.url).emit('drawing-start', data);
  });
  
  socket.on('drawing-update', (data) => {
    socket.to(data.url).emit('drawing-update', data);
  });
  
  socket.on('drawing-end', (data) => {
    socket.to(data.url).emit('drawing-end', data);
  });
  
  socket.on('disconnect', () => {
    console.log('Client disconnected:', socket.id);
  });
});

// Start server only after MongoDB connection is established
mongoose.connection.once('open', () => {
  httpServer.listen(PORT, () => {
    console.log(`\n🚀 Server running on http://localhost:${PORT}`);
    console.log(`📡 API endpoints available at http://localhost:${PORT}/api`);
    console.log(`🔌 Socket.io ready for real-time connections`);
    console.log(`\n✨ Ready to accept requests!\n`);
  });
});

