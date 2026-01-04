import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Review from '../models/Review.js';
import Project from '../models/Project.js';
import { emitToProject } from '../services/socketService.js';

const router = express.Router();

// Get reviews for a project
router.get('/project/:projectId', authenticate, async (req, res) => {
  try {
    const project = await Project.findById(req.params.projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const reviews = await Review.find({ project: req.params.projectId })
      .populate('createdBy', 'name email')
      .populate('comments.user', 'name email')
      .sort({ createdAt: -1 });

    res.json({ reviews });
  } catch (error) {
    console.error('Get reviews error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create review
router.post('/', authenticate, async (req, res) => {
  try {
    const { projectId, breakpointIndex, type, position, drawing, color } = req.body;

    const project = await Project.findById(projectId);
    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const review = new Review({
      project: projectId,
      breakpointIndex,
      type,
      position,
      drawing,
      color: color || '#ff4444',
      createdBy: req.userId,
    });

    await review.save();
    await review.populate('createdBy', 'name email');

    // Emit real-time update
    emitToProject(projectId, 'review-added', review);

    res.status(201).json({ review });
  } catch (error) {
    console.error('Create review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Add comment to review
router.post('/:id/comments', authenticate, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    const { text } = req.body;
    review.comments.push({
      user: req.userId,
      text,
    });

    await review.save();
    await review.populate('comments.user', 'name email');

    res.json({ review });
  } catch (error) {
    console.error('Add comment error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Resolve review
router.patch('/:id/resolve', authenticate, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    review.resolved = !review.resolved;
    await review.save();
    await review.populate('createdBy', 'name email');

    // Emit real-time update
    const project = await Project.findById(review.project);
    if (project) {
      emitToProject(project._id.toString(), 'review-updated', review);
    }

    res.json({ review });
  } catch (error) {
    console.error('Resolve review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete review
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const review = await Review.findById(req.params.id);
    if (!review) {
      return res.status(404).json({ error: 'Review not found' });
    }

    // Only creator or project owner can delete
    const project = await Project.findById(review.project);
    if (review.createdBy.toString() !== req.userId && 
        project.owner.toString() !== req.userId) {
      return res.status(403).json({ error: 'Not authorized' });
    }

    const reviewId = req.params.id;
    await Review.deleteOne({ _id: reviewId });

    // Emit real-time update
    emitToProject(project._id.toString(), 'review-deleted', { id: reviewId });

    res.json({ message: 'Review deleted' });
  } catch (error) {
    console.error('Delete review error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

