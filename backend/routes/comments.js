import express from 'express';
import Comment from '../models/Comment.js';
import User from '../models/User.js';
import Project from '../models/Project.js';
import { optionalAuth } from '../middleware/auth.js';
import { sendTagNotification } from '../services/emailService.js';

const router = express.Router();

// Helper function to parse @mentions from text
const parseMentions = (text) => {
  const mentionRegex = /@([\w.-]+@[\w.-]+\.\w+)|@(\w+)/g;
  const mentions = [];
  let match;
  
  while ((match = mentionRegex.exec(text)) !== null) {
    // Check if it's an email (group 1) or username (group 2)
    const email = match[1];
    const username = match[2];
    mentions.push({ email, username, fullMatch: match[0] });
  }
  
  return mentions;
};

// Helper function to find users by email or name
const findTaggedUsers = async (mentions, projectId = null) => {
  const userIds = [];
  const userMap = new Map(); // To avoid duplicates
  
  for (const mention of mentions) {
    let user = null;
    
    // Try to find by email first
    if (mention.email) {
      user = await User.findOne({ email: mention.email.toLowerCase() });
    }
    
    // If not found by email, try by name
    if (!user && mention.username) {
      user = await User.findOne({ 
        name: { $regex: new RegExp(`^${mention.username}$`, 'i') }
      });
    }
    
    // If projectId is provided, also check if user is a collaborator or owner
    if (user && projectId) {
      const project = await Project.findById(projectId);
      if (project) {
        const isCollaborator = project.collaborators.some(
          id => id.toString() === user._id.toString()
        );
        const isOwner = project.owner.toString() === user._id.toString();
        
        if (!isCollaborator && !isOwner) {
          // User is not part of the project, skip
          continue;
        }
      }
    }
    
    if (user && !userMap.has(user._id.toString())) {
      userIds.push(user._id);
      userMap.set(user._id.toString(), user);
    }
  }
  
  return { userIds, userMap };
};

// Get all comments for a URL
router.get('/', async (req, res) => {
  try {
    const { url, breakpoint, projectId } = req.query;
    
    const query = {};
    if (url) query.url = url;
    if (breakpoint) query.breakpoint = breakpoint;
    if (projectId) query.projectId = projectId;
    
    const comments = await Comment.find(query)
      .populate('taggedUsers', 'name email')
      .populate('replies.taggedUsers', 'name email')
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
    
    // Parse mentions and find tagged users
    const mentions = parseMentions(text);
    const { userIds, userMap } = await findTaggedUsers(mentions, projectId);
    
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
      taggedUsers: userIds,
      metadata: metadata || null,
    });
    
    await comment.save();
    await comment.populate('taggedUsers', 'name email');
    
    // Send email notifications to tagged users (async, don't wait)
    if (userIds.length > 0 && projectId) {
      const project = await Project.findById(projectId).populate('owner', 'name');
      const projectName = project?.name || 'Untitled Project';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const commentUrl = `${frontendUrl}/project/${projectId}?comment=${comment._id}`;
      
      const senderName = author || req.user?.name || 'Anonymous';
      
      // Send emails asynchronously
      Promise.all(
        Array.from(userMap.values()).map(async (user) => {
          // Don't send email to the person who created the comment
          if (req.user && user._id.toString() === req.user.id) {
            return;
          }
          
          try {
            await sendTagNotification({
              to: user.email,
              toName: user.name,
              fromName: senderName,
              commentText: text,
              projectName,
              projectUrl: `${frontendUrl}/project/${projectId}`,
              commentUrl,
              isReply: false,
            });
          } catch (emailError) {
            console.error(`Failed to send email to ${user.email}:`, emailError);
          }
        })
      ).catch(err => {
        console.error('Error sending tag notifications:', err);
      });
    }
    
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
    ).populate('taggedUsers', 'name email');
    
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
    
    // Get the comment first to access projectId
    const comment = await Comment.findById(id);
    if (!comment) {
      return res.status(404).json({ error: 'Comment not found' });
    }
    
    // Parse mentions and find tagged users
    const mentions = parseMentions(text);
    const { userIds, userMap } = await findTaggedUsers(mentions, comment.projectId);
    
    const reply = {
      text,
      author: author || req.user?.name || 'Anonymous',
      image: image || null,
      timestamp: new Date(),
      taggedUsers: userIds,
    };
    
    const updatedComment = await Comment.findByIdAndUpdate(
      id,
      { $push: { replies: reply } },
      { new: true }
    ).populate('taggedUsers', 'name email')
     .populate('replies.taggedUsers', 'name email');
    
    const lastReply = updatedComment.replies[updatedComment.replies.length - 1];
    
    // Send email notifications to tagged users (async, don't wait)
    if (userIds.length > 0 && comment.projectId) {
      const project = await Project.findById(comment.projectId).populate('owner', 'name');
      const projectName = project?.name || 'Untitled Project';
      const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:5173';
      const commentUrl = `${frontendUrl}/project/${comment.projectId}?comment=${id}`;
      
      const senderName = author || req.user?.name || 'Anonymous';
      
      // Send emails asynchronously
      Promise.all(
        Array.from(userMap.values()).map(async (user) => {
          // Don't send email to the person who created the reply
          if (req.user && user._id.toString() === req.user.id) {
            return;
          }
          
          try {
            await sendTagNotification({
              to: user.email,
              toName: user.name,
              fromName: senderName,
              commentText: text,
              projectName,
              projectUrl: `${frontendUrl}/project/${comment.projectId}`,
              commentUrl,
              isReply: true,
            });
          } catch (emailError) {
            console.error(`Failed to send email to ${user.email}:`, emailError);
          }
        })
      ).catch(err => {
        console.error('Error sending tag notifications:', err);
      });
    }
    
    res.status(201).json({ 
      reply: {
        ...lastReply.toObject(),
        id: lastReply._id.toString(),
      },
      comment: {
        ...updatedComment.toObject(),
        id: updatedComment._id.toString(),
        timestamp: updatedComment.createdAt?.getTime() || Date.now(),
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
