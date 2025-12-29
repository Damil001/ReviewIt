import mongoose from 'mongoose';

const replySchema = new mongoose.Schema({
  text: {
    type: String,
    required: true,
  },
  author: {
    type: String,
    default: 'Anonymous',
  },
  // Optional image attachment
  image: {
    type: String,
    default: null,
  },
  timestamp: {
    type: Date,
    default: Date.now,
  },
});

const commentSchema = new mongoose.Schema({
  // The target website URL
  url: {
    type: String,
    required: true,
    index: true,
  },
  // Position as percentage of document
  x: {
    type: Number,
    required: true,
  },
  y: {
    type: Number,
    required: true,
  },
  // Which breakpoint (mobile, tablet, laptop, desktop)
  breakpoint: {
    type: String,
    default: 'desktop',
  },
  // The comment text
  text: {
    type: String,
    required: true,
  },
  // Who made the comment
  author: {
    type: String,
    default: 'Anonymous',
  },
  // Optional: link to user if logged in
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  // Optional: link to project
  projectId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    default: null,
  },
  // Is the comment resolved?
  resolved: {
    type: Boolean,
    default: false,
  },
  // Replies to this comment
  replies: [replySchema],
  // Browser/device metadata captured at comment creation
  metadata: {
    // Browser info
    browser: {
      name: String,
      version: String,
    },
    // Operating system
    os: {
      name: String,
      version: String,
    },
    // Screen/window info
    screen: {
      width: Number,
      height: Number,
      pixelRatio: Number,
    },
    viewport: {
      width: Number,
      height: Number,
    },
    // URL info
    pageUrl: String,
    pageTitle: String,
    // Location (optional, from timezone)
    timezone: String,
    language: String,
    // Device type
    deviceType: String,
    // User agent (full)
    userAgent: String,
    // Timestamp
    capturedAt: Date,
    // Screenshot of the commented area
    screenshot: String,
  },
}, {
  timestamps: true,
});

// Index for faster queries
commentSchema.index({ url: 1, breakpoint: 1 });
commentSchema.index({ projectId: 1 });

export default mongoose.model('Comment', commentSchema);

