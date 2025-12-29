import express from 'express';
import Comment from '../models/Comment.js';
import { optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Get all comments for a URL
router.get('/', async (req, res) => {
  try {
    const { url, breakpoint, projectId } = req.query;
    
    const query = {};
    if (url) query.url = url;
    if (breakpoint) query.breakpoint = breakpoint;
    if (projectId) query.projectId = projectId;
    
    const comments = await Comment.find(query)
      .sort({ createdAt: -1 })
      .lean();
    
    // Transform MongoDB _id to id for frontend compatibility
    const transformedComments = comments.map(c => ({
      ...c,
      id: c._id.toString(),
      timestamp: c.createdAt?.getTime() || Date.now(),
    }));
    
    res.json({ comments: transformedComments });
  } catch (error) {
    console.error('Error fetching comments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create new comment
router.post('/', optionalAuth, async (req, res) => {
  try {
    const { url, x, y, breakpoint, text, author, projectId, metadata } = req.body;
    
    console.log('Creating comment with metadata:', metadata ? 'Yes' : 'No');
    if (metadata) {
      console.log('Metadata received:', JSON.stringify(metadata, null, 2));
    }
    
    if (!url || x === undefined || y === undefined || !text) {
      return res.status(400).json({ error: 'Missing required fields: url, x, y, text' });
    }
    
    const comment = new Comment({
      url,
      x: parseFloat(x),
      y: parseFloat(y),
      breakpoint: breakpoint || 'desktop',
      text,
      author: author || req.user?.name || 'Anonymous',
      userId: req.user?.id || null,
      projectId: projectId || null,
      resolved: false,
      replies: [],
      metadata: metadata || null,
    });
    
    await comment.save();
    
    // Return in format expected by frontend
    res.status(201).json({ 
      comment: {
        ...comment.toObject(),
        id: comment._id.toString(),
        timestamp: comment.createdAt?.getTime() || Date.now(),
      }
    });
  } catch (error) {
    console.error('Error creating comment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update comment
router.patch('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { text, resolved } = req.body;
    
    const updateData = {};
    if (text !== undefined) updateData.text = text;
    if (resolved !== undefined) updateData.resolved = resolved;
    
    const comment = await Comment.findByIdAndUpdate(
      id,
      updateData,
      { new: true }
    );
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    res.json({ 
      comment: {
        ...comment.toObject(),
        id: comment._id.toString(),
        timestamp: comment.createdAt?.getTime() || Date.now(),
      }
    });
  } catch (error) {
    console.error('Error updating comment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update comment screenshot (for background capture)
router.patch('/:id/screenshot', async (req, res) => {
  try {
    const { id } = req.params;
    const { screenshot } = req.body;
    
    if (!screenshot) {
      return res.status(400).json({ error: 'Screenshot URL required' });
    }
    
    const comment = await Comment.findByIdAndUpdate(
      id,
      { 'metadata.screenshot': screenshot },
      { new: true }
    );
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    console.log('Screenshot added to comment:', id);
    
    res.json({ 
      success: true,
      comment: {
        ...comment.toObject(),
        id: comment._id.toString(),
        timestamp: comment.createdAt?.getTime() || Date.now(),
      }
    });
  } catch (error) {
    console.error('Error updating screenshot:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete comment
router.delete('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    
    const comment = await Comment.findByIdAndDelete(id);
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    res.json({ success: true });
  } catch (error) {
    console.error('Error deleting comment:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add reply to comment
router.post('/:id/replies', optionalAuth, async (req, res) => {
  try {
    const { id } = req.params;
    const { text, author, image } = req.body;
    
    if (!text) {
      return res.status(400).json({ error: 'Reply text required' });
    }
    
    const reply = {
      text,
      author: author || req.user?.name || 'Anonymous',
      image: image || null,
      timestamp: new Date(),
    };
    
    const comment = await Comment.findByIdAndUpdate(
      id,
      { $push: { replies: reply } },
      { new: true }
    );
    
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    const lastReply = comment.replies[comment.replies.length - 1];
    
    res.status(201).json({ 
      reply: {
        ...lastReply.toObject(),
        id: lastReply._id.toString(),
      },
      comment: {
        ...comment.toObject(),
        id: comment._id.toString(),
        timestamp: comment.createdAt?.getTime() || Date.now(),
      }
    });
  } catch (error) {
    console.error('Error adding reply:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete all comments for a URL (for testing/cleanup)
router.delete('/url/:encodedUrl', async (req, res) => {
  try {
    const url = decodeURIComponent(req.params.encodedUrl);
    
    const result = await Comment.deleteMany({ url });
    
    res.json({ 
      success: true, 
      deletedCount: result.deletedCount 
    });
  } catch (error) {
    console.error('Error deleting comments:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;
