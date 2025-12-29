import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists
const uploadsDir = path.join(__dirname, '..', 'uploads', 'screenshots');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Browser instance for reuse
let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    browserInstance = await puppeteer.launch({
      headless: 'new',
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
    });
  }
  return browserInstance;
}

// Configure multer for screenshot storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadsDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'screenshot-' + uniqueSuffix + '.png');
  }
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    // Accept only images
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed!'), false);
    }
  }
});

// Upload screenshot endpoint
router.post('/screenshot', upload.single('screenshot'), (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    // Return the URL to access the uploaded file
    const screenshotUrl = `/uploads/screenshots/${req.file.filename}`;
    
    console.log('Screenshot uploaded:', screenshotUrl);
    
    res.json({
      success: true,
      url: screenshotUrl,
      filename: req.file.filename,
    });
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
});

// Handle base64 screenshot upload (alternative method)
router.post('/screenshot-base64', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { imageData, filename } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    
    // Generate unique filename
    const uniqueFilename = filename || `screenshot-${Date.now()}-${Math.round(Math.random() * 1E9)}.png`;
    const filepath = path.join(uploadsDir, uniqueFilename);
    
    // Write the file
    fs.writeFileSync(filepath, base64Data, 'base64');
    
    const screenshotUrl = `/uploads/screenshots/${uniqueFilename}`;
    
    console.log('Screenshot (base64) uploaded:', screenshotUrl);
    
    res.json({
      success: true,
      url: screenshotUrl,
      filename: uniqueFilename,
    });
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
});

// Server-side screenshot capture using Puppeteer (optimized for speed)
router.post('/capture-screenshot', express.json(), async (req, res) => {
  let page = null;
  
  try {
    const { url, x, y, viewportWidth, viewportHeight } = req.body;
    
    if (!url) {
      return res.status(400).json({ error: 'URL is required' });
    }

    console.log('Capturing screenshot for:', url);
    console.log('Comment position (%):', { x, y });

    const browser = await getBrowser();
    page = await browser.newPage();
    
    // Set viewport size
    const width = Math.min(viewportWidth || 800, 1200);
    const height = Math.min(viewportHeight || 600, 900);
    
    await page.setViewport({
      width: width,
      height: height,
      deviceScaleFactor: 1,
    });

    // Block unnecessary resources for faster loading
    await page.setRequestInterception(true);
    page.on('request', (request) => {
      const resourceType = request.resourceType();
      // Block fonts, media for speed
      if (['font', 'media'].includes(resourceType)) {
        request.abort();
      } else {
        request.continue();
      }
    });

    // Navigate with faster settings
    await page.goto(url, {
      waitUntil: 'domcontentloaded',
      timeout: 15000,
    });

    // Wait for initial render
    await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 500)));

    // Calculate scroll position based on comment's percentage coordinates
    // and scroll so the comment area is visible in the screenshot
    if (x !== undefined && y !== undefined) {
      await page.evaluate((percentX, percentY, vpWidth, vpHeight) => {
        // Get document dimensions
        const docWidth = Math.max(
          document.documentElement.scrollWidth,
          document.body.scrollWidth
        );
        const docHeight = Math.max(
          document.documentElement.scrollHeight,
          document.body.scrollHeight
        );
        
        // Convert percentage to pixels
        const pixelX = (percentX / 100) * docWidth;
        const pixelY = (percentY / 100) * docHeight;
        
        // Calculate scroll position to center the comment in viewport
        const scrollX = Math.max(0, pixelX - (vpWidth / 2));
        const scrollY = Math.max(0, pixelY - (vpHeight / 2));
        
        console.log('Scrolling to:', { scrollX, scrollY, pixelX, pixelY, docWidth, docHeight });
        
        window.scrollTo(scrollX, scrollY);
      }, x, y, width, height);
      
      // Wait for scroll to complete
      await page.evaluate(() => new Promise(resolve => setTimeout(resolve, 200)));
    }

    // Take screenshot
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 85,
    });

    // Generate unique filename
    const uniqueFilename = `screenshot-${Date.now()}-${Math.round(Math.random() * 1E9)}.jpg`;
    const filepath = path.join(uploadsDir, uniqueFilename);
    
    // Write the file
    fs.writeFileSync(filepath, screenshotBuffer);
    
    const screenshotUrl = `/uploads/screenshots/${uniqueFilename}`;
    
    console.log('Screenshot captured at position:', { x, y }, '→', screenshotUrl);
    
    res.json({
      success: true,
      url: screenshotUrl,
      filename: uniqueFilename,
    });
  } catch (error) {
    console.error('Error capturing screenshot:', error);
    res.status(500).json({ error: 'Failed to capture screenshot', details: error.message });
  } finally {
    if (page) {
      await page.close().catch(() => {});
    }
  }
});

// Cleanup browser on process exit
process.on('SIGINT', async () => {
  if (browserInstance) {
    await browserInstance.close();
  }
  process.exit();
});

export default router;

