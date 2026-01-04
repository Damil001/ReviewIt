import mongoose from 'mongoose';
import crypto from 'crypto';

const breakpointSchema = new mongoose.Schema({
  name: String,
  width: Number,
  height: Number,
  x: Number,
  y: Number,
  browser: {
    type: String,
    default: 'chromium',
    enum: ['chromium', 'firefox', 'webkit', 'edge'],
  },
}, { _id: false });

const shareSettingsSchema = new mongoose.Schema({
  enabled: {
    type: Boolean,
    default: false,
  },
  token: {
    type: String,
    unique: true,
    sparse: true,
  },
  password: {
    type: String,
    default: null,
  },
  expiresAt: {
    type: Date,
    default: null,
  },
  allowGuestComments: {
    type: Boolean,
    default: true,
  },
  allowGuestDrawing: {
    type: Boolean,
    default: false,
  },
  requireName: {
    type: Boolean,
    default: true,
  },
}, { _id: false });

const projectSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    trim: true,
  },
  url: {
    type: String,
    required: true,
  },
  owner: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  collaborators: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  // Users who accessed via share link (for tracking and mentions)
  participants: [{
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
    accessedAt: {
      type: Date,
      default: Date.now,
    },
    email: String, // Store email for non-authenticated users
    name: String, // Store name for non-authenticated users
  }],
  breakpoints: [breakpointSchema],
  canvasState: {
    pan: { x: Number, y: Number },
    zoom: Number,
  },
  isPublic: {
    type: Boolean,
    default: false,
  },
  // Legacy field - kept for backward compatibility
  shareToken: {
    type: String,
    unique: true,
    sparse: true,
  },
  // New sharing settings
  shareSettings: {
    type: shareSettingsSchema,
    default: () => ({}),
  },
}, {
  timestamps: true,
});

// Generate share token
projectSchema.methods.generateShareToken = function() {
  const token = crypto.randomBytes(16).toString('hex');
  this.shareSettings = this.shareSettings || {};
  this.shareSettings.token = token;
  this.shareSettings.enabled = true;
  // Also set legacy field
  this.shareToken = token;
  return token;
};

// Check if share link is valid
projectSchema.methods.isShareValid = function() {
  if (!this.shareSettings?.enabled) return false;
  if (!this.shareSettings?.token) return false;
  if (this.shareSettings.expiresAt && new Date() > this.shareSettings.expiresAt) {
    return false;
  }
  return true;
};

// Disable sharing
projectSchema.methods.disableSharing = function() {
  if (this.shareSettings) {
    this.shareSettings.enabled = false;
  }
};

export default mongoose.model('Project', projectSchema);

