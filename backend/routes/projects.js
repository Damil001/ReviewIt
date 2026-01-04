import express from 'express';
import { authenticate } from '../middleware/auth.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

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
      .populate('collaborators', 'name email')
      .populate('participants.user', 'name email');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    res.json({ project });
  } catch (error) {
    console.error('Get project error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Get all participants for a project (owner + collaborators + participants)
router.get('/:id/participants', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      $or: [
        { owner: req.userId },
        { collaborators: req.userId },
      ],
    })
      .populate('owner', 'name email')
      .populate('collaborators', 'name email')
      .populate('participants.user', 'name email');

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Combine all users (owner, collaborators, participants)
    const allUsers = new Map();
    
    // Add owner
    if (project.owner) {
      allUsers.set(project.owner._id.toString(), {
        id: project.owner._id,
        name: project.owner.name,
        email: project.owner.email,
        role: 'owner',
      });
    }

    // Add collaborators
    project.collaborators.forEach(collab => {
      if (collab && !allUsers.has(collab._id.toString())) {
        allUsers.set(collab._id.toString(), {
          id: collab._id,
          name: collab.name,
          email: collab.email,
          role: 'collaborator',
        });
      }
    });

    // Add participants
    project.participants.forEach(participant => {
      if (participant.user) {
        if (!allUsers.has(participant.user._id.toString())) {
          allUsers.set(participant.user._id.toString(), {
            id: participant.user._id,
            name: participant.user.name,
            email: participant.user.email,
            role: 'participant',
            accessedAt: participant.accessedAt,
          });
        }
      } else if (participant.email) {
        // Guest user (not authenticated)
        const guestKey = `guest_${participant.email}`;
        if (!allUsers.has(guestKey)) {
          allUsers.set(guestKey, {
            id: guestKey,
            name: participant.name || participant.email,
            email: participant.email,
            role: 'guest',
            accessedAt: participant.accessedAt,
          });
        }
      }
    });

    res.json({ participants: Array.from(allUsers.values()) });
  } catch (error) {
    console.error('Get participants error:', error);
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

// Add collaborator to project
router.post('/:id/collaborators', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    const { email } = req.body;
    
    if (!email) {
      return res.status(400).json({ error: 'Email is required' });
    }

    // Find user by email
    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Check if user is already a collaborator or owner
    if (project.owner.toString() === user._id.toString()) {
      return res.status(400).json({ error: 'User is already the owner' });
    }

    if (project.collaborators.includes(user._id)) {
      return res.status(400).json({ error: 'User is already a collaborator' });
    }

    // Add collaborator
    project.collaborators.push(user._id);
    await project.save();
    await project.populate('collaborators', 'name email');
    await project.populate('owner', 'name email');

    res.json({ project, message: 'Collaborator added successfully' });
  } catch (error) {
    console.error('Add collaborator error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Remove collaborator from project
router.delete('/:id/collaborators/:userId', authenticate, async (req, res) => {
  try {
    const project = await Project.findOne({
      _id: req.params.id,
      owner: req.userId,
    });

    if (!project) {
      return res.status(404).json({ error: 'Project not found' });
    }

    // Remove collaborator
    project.collaborators = project.collaborators.filter(
      collabId => collabId.toString() !== req.params.userId
    );
    await project.save();
    await project.populate('collaborators', 'name email');
    await project.populate('owner', 'name email');

    res.json({ project, message: 'Collaborator removed successfully' });
  } catch (error) {
    console.error('Remove collaborator error:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

export default router;

