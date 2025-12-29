import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Project from '../models/Project.js';

const router = express.Router();

// Get all projects for user
router.get('/', authenticate, async (req, res) => {
  try {
    const projects = await Project.find({
      $or: [
        { owner: req.userId },
        { collaborators: req.userId },
      ],
    })
      .populate('owner', 'name email')
      .sort({ updatedAt: -1 });

    res.json({ projects });
  } catch (error) {
    console.error('Get projects error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get single project
router.get('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.userId },
        { collaborators: req.userId },
        { isPublic: true },
      ],
    })
      .populate('owner', 'name email')
      .populate('collaborators', 'name email');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Create project
router.post('/', authenticate, async (req, res) => {
  try {
    const { name, url, breakpoints, canvasState } = req.body;

    const project = new Project({
      name: name || 'Untitled Project',
      url,
      owner: req.userId,
      breakpoints: breakpoints || [],
      canvasState: canvasState || { pan: { x: 0, y: 0 }, zoom: 0.5 },
    });

    await project.save();
    await project.populate('owner', 'name email');

    res.status(201).json({ project });
  } catch (error) {
    console.error('Create project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update project
router.put('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { name, url, breakpoints, canvasState } = req.body;
    
    if (name) project.name = name;
    if (url) project.url = url;
    if (breakpoints) project.breakpoints = breakpoints;
    if (canvasState) project.canvasState = canvasState;

    await project.save();
    res.json({ project });
  } catch (error) {
    console.error('Update project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete project
router.delete('/:id', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    await Project.deleteOne({ _id: req.params.id });
    res.json({ message: 'Project deleted' });
  } catch (error) {
    console.error('Delete project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Generate share link
router.post('/:id/share', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const shareToken = project.generateShareToken();
    await project.save();

    res.json({ shareToken, shareUrl: `/shared/${shareToken}` });
  } catch (error) {
    console.error('Share project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get shared project
router.get('/shared/:token', async (req, res) => {
  try {
    const project = await Project.findOne({ shareToken: req.params.token })
      .populate('owner', 'name email');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get shared project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

