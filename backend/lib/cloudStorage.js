import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import path from 'path';

// Initialize S3 client - works with AWS S3, Cloudflare R2, Backblaze B2, etc.
const getS3Client = () => {
  const config = {
    region: process.env.S3_REGION || 'auto',
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY_ID,
      secretAccessKey: process.env.S3_SECRET_ACCESS_KEY,
    },
  };

  // For Cloudflare R2 and other S3-compatible services
  if (process.env.S3_ENDPOINT) {
    config.endpoint = process.env.S3_ENDPOINT;
  }

  return new S3Client(config);
};

// Check if cloud storage is configured
export const isCloudStorageEnabled = () => {
  return !!(
    process.env.S3_BUCKET_NAME &&
    process.env.S3_ACCESS_KEY_ID &&
    process.env.S3_SECRET_ACCESS_KEY
  );
};

/**
 * Upload a file buffer to cloud storage
 * @param {Buffer} buffer - The file buffer to upload
 * @param {string} filename - The filename to use
 * @param {string} contentType - The MIME type of the file
 * @returns {Promise<{url: string, key: string}>} - The public URL and storage key
 */
export const uploadToCloud = async (buffer, filename, contentType = 'image/png') => {
  if (!isCloudStorageEnabled()) {
    throw new Error('Cloud storage is not configured. Please set S3 environment variables.');
  }

  const s3Client = getS3Client();
  const bucketName = process.env.S3_BUCKET_NAME;
  
  // Create a unique key with folder structure
  const key = `screenshots/${filename}`;

  // Ensure buffer is a proper Buffer object
  const bodyBuffer = Buffer.isBuffer(buffer) ? buffer : Buffer.from(buffer);
  
  const commandInput = {
    Bucket: bucketName,
    Key: key,
    Body: bodyBuffer,
    ContentType: contentType,
    ContentLength: bodyBuffer.length,
  };
  
  // Add ACL only if not using R2 (R2 doesn't support ACL, use public bucket instead)
  if (!process.env.S3_ENDPOINT?.includes('r2.cloudflarestorage.com')) {
    commandInput.ACL = process.env.S3_ACL || 'public-read';
  }
  
  const command = new PutObjectCommand(commandInput);

  await s3Client.send(command);

  // Construct the public URL
  let publicUrl;
  
  if (process.env.S3_PUBLIC_URL) {
    // Custom public URL (for CDN or custom domains)
    publicUrl = `${process.env.S3_PUBLIC_URL}/${key}`;
  } else if (process.env.S3_ENDPOINT) {
    // For R2 and other S3-compatible services with public bucket
    const endpoint = process.env.S3_ENDPOINT.replace('https://', '').replace('http://', '');
    publicUrl = `https://${bucketName}.${endpoint}/${key}`;
  } else {
    // Standard AWS S3 URL
    publicUrl = `https://${bucketName}.s3.${process.env.S3_REGION}.amazonaws.com/${key}`;
  }

  console.log(`☁️  Uploaded to cloud storage: ${key}`);
  console.log(`☁️  Public URL: ${publicUrl}`);
  
  return {
    url: publicUrl,
    key: key,
  };
};

/**
 * Delete a file from cloud storage
 * @param {string} key - The storage key to delete
 */
export const deleteFromCloud = async (key) => {
  if (!isCloudStorageEnabled()) {
    throw new Error('Cloud storage is not configured.');
  }

  const s3Client = getS3Client();
  const bucketName = process.env.S3_BUCKET_NAME;

  const command = new DeleteObjectCommand({
    Bucket: bucketName,
    Key: key,
  });

  await s3Client.send(command);
  console.log(`☁️  Deleted from cloud storage: ${key}`);
};

/**
 * Generate a unique filename for screenshots
 * @param {string} extension - File extension (default: 'png')
 * @returns {string} - Unique filename
 */
export const generateFilename = (extension = 'png') => {
  const timestamp = Date.now();
  const random = Math.round(Math.random() * 1e9);
  return `screenshot-${timestamp}-${random}.${extension}`;
};

