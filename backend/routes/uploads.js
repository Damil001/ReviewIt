import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import puppeteer from 'puppeteer';
import { uploadToCloud, isCloudStorageEnabled, generateFilename } from '../lib/cloudStorage.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const router = express.Router();

// Ensure uploads directory exists (for local fallback)
const uploadsDir = path.join(__dirname, '..', 'uploads', 'screenshots');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

// Browser instance for reuse
let browserInstance = null;

async function getBrowser() {
  if (!browserInstance) {
    const launchOptions = {
      headless: 'new',
      args: [
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage',
        '--disable-gpu',
        '--no-first-run',
        '--no-zygote',
        '--single-process',
      ],
    };
    
    // Use custom executable path if set (for Render)
    if (process.env.PUPPETEER_EXECUTABLE_PATH) {
      launchOptions.executablePath = process.env.PUPPETEER_EXECUTABLE_PATH;
    }
    
    browserInstance = await puppeteer.launch(launchOptions);
    console.log('✅ Browser launched successfully');
  }
  return browserInstance;
}

// Always use memory storage - we decide at request time whether to save to cloud or local
const upload = multer({
  storage: multer.memoryStorage(),
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

// Log storage mode (delayed to allow dotenv to load)
setTimeout(() => {
  if (isCloudStorageEnabled()) {
    console.log('☁️  Cloud storage enabled - uploads will go to S3/R2');
  } else {
    console.log('📁 Cloud storage not configured - using local storage');
    console.log('   Set S3_BUCKET_NAME, S3_ACCESS_KEY_ID, S3_SECRET_ACCESS_KEY to enable cloud storage');
  }
}, 100);

/**
 * Helper function to save a buffer either to cloud or local storage
 * @param {Buffer} buffer - The image buffer
 * @param {string} filename - The filename
 * @param {string} contentType - MIME type
 * @returns {Promise<{url: string, filename: string}>}
 */
async function saveScreenshot(buffer, filename, contentType = 'image/png') {
  if (isCloudStorageEnabled()) {
    // Upload to cloud storage
    const result = await uploadToCloud(buffer, filename, contentType);
    return {
      url: result.url,
      filename: filename,
      storage: 'cloud',
    };
  } else {
    // Save locally
    const filepath = path.join(uploadsDir, filename);
    fs.writeFileSync(filepath, buffer);
    const localUrl = `/uploads/screenshots/${filename}`;
    console.log('📁 Screenshot saved locally:', localUrl);
    return {
      url: localUrl,
      filename: filename,
      storage: 'local',
    };
  }
}


// Upload screenshot endpoint
router.post('/screenshot', upload.single('screenshot'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded' });
    }

    let screenshotUrl;
    let filename;

    // Determine file extension from mimetype
    const extension = req.file.mimetype.split('/')[1] || 'png';
    filename = generateFilename(extension);
    
    // Use the helper function which handles both cloud and local storage
    const result = await saveScreenshot(req.file.buffer, filename, req.file.mimetype);
    screenshotUrl = result.url;
    
    res.json({
      success: true,
      url: screenshotUrl,
      filename: filename,
    });
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
});

// Handle base64 screenshot upload (alternative method)
router.post('/screenshot-base64', express.json({ limit: '10mb' }), async (req, res) => {
  try {
    const { imageData, filename: providedFilename } = req.body;
    
    if (!imageData) {
      return res.status(400).json({ error: 'No image data provided' });
    }

    // Remove data URL prefix if present
    const base64Data = imageData.replace(/^data:image\/\w+;base64,/, '');
    const buffer = Buffer.from(base64Data, 'base64');
    
    // Determine content type from data URL
    const contentTypeMatch = imageData.match(/^data:(image\/\w+);base64,/);
    const contentType = contentTypeMatch ? contentTypeMatch[1] : 'image/png';
    const extension = contentType.split('/')[1] || 'png';
    
    // Generate unique filename
    const filename = providedFilename || generateFilename(extension);
    
    const result = await saveScreenshot(buffer, filename, contentType);
    
    res.json({
      success: true,
      url: result.url,
      filename: result.filename,
      storage: result.storage,
    });
  } catch (error) {
    console.error('Error uploading screenshot:', error);
    res.status(500).json({ error: 'Failed to upload screenshot' });
  }
});

// Server-side screenshot capture using Puppeteer
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

    // Take screenshot as buffer
    const screenshotBuffer = await page.screenshot({
      type: 'jpeg',
      quality: 85,
    });

    // Generate unique filename
    const filename = generateFilename('jpg');
    
    // Save to cloud or local storage
    const result = await saveScreenshot(screenshotBuffer, filename, 'image/jpeg');
    
    console.log(`Screenshot captured at position: { x: ${x}, y: ${y} } → ${result.url}`);
    
    res.json({
      success: true,
      url: result.url,
      filename: result.filename,
      storage: result.storage,
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
