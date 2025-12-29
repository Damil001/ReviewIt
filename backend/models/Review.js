import mongoose from 'mongoose';

const commentSchema = new mongoose.Schema({
  user: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  text: {
    type: String,
    required: true,
  },
  resolved: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

const reviewSchema = new mongoose.Schema({
  project: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Project',
    required: true,
  },
  breakpointIndex: {
    type: Number,
    required: true,
  },
  type: {
    type: String,
    enum: ['point', 'area', 'drawing'],
    required: true,
  },
  position: {
    x: Number,
    y: Number,
    width: Number,
    height: Number,
  },
  drawing: {
    type: String, // SVG path or base64 image
  },
  color: {
    type: String,
    default: '#ff4444',
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true,
  },
  comments: [commentSchema],
  resolved: {
    type: Boolean,
    default: false,
  },
}, {
  timestamps: true,
});

export default mongoose.model('Review', reviewSchema);

