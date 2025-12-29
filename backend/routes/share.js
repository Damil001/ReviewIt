import express from 'express';
import bcrypt from 'bcryptjs';
import Project from '../models/Project.js';
import { auth, optionalAuth } from '../middleware/auth.js';

const router = express.Router();

// Generate or update share link for a project
// POST /api/projects/:id/share
router.post('/projects/:id/share', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    // Check ownership
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const { 
      password, 
      expiresAt, 
      allowGuestComments = true,
      allowGuestDrawing = false,
      requireName = true 
    } = req.body;
    
    // Generate new token if doesn't exist
    if (!project.shareSettings?.token) {
      project.generateShareToken();
    } else {
      project.shareSettings.enabled = true;
    }
    
    // Update settings
    if (password) {
      project.shareSettings.password = await bcrypt.hash(password, 10);
    } else if (password === null) {
      project.shareSettings.password = null;
    }
    
    if (expiresAt !== undefined) {
      project.shareSettings.expiresAt = expiresAt ? new Date(expiresAt) : null;
    }
    
    project.shareSettings.allowGuestComments = allowGuestComments;
    project.shareSettings.allowGuestDrawing = allowGuestDrawing;
    project.shareSettings.requireName = requireName;
    
    await project.save();
    
    // Generate the share URL
    const shareUrl = `${req.protocol}://${req.get('host').replace(':3001', ':5173')}/share/${project.shareSettings.token}`;
    
    res.json({
      message: 'Share link generated',
      shareToken: project.shareSettings.token,
      shareUrl,
      settings: {
        enabled: project.shareSettings.enabled,
        hasPassword: !!project.shareSettings.password,
        expiresAt: project.shareSettings.expiresAt,
        allowGuestComments: project.shareSettings.allowGuestComments,
        allowGuestDrawing: project.shareSettings.allowGuestDrawing,
        requireName: project.shareSettings.requireName,
      },
    });
  } catch (error) {
    console.error('Error generating share link:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Disable sharing for a project
// DELETE /api/projects/:id/share
router.delete('/projects/:id/share', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    project.disableSharing();
    await project.save();
    
    res.json({ message: 'Sharing disabled' });
  } catch (error) {
    console.error('Error disabling sharing:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Get share settings for a project (owner only)
// GET /api/projects/:id/share
router.get('/projects/:id/share', auth, async (req, res) => {
  try {
    const project = await Project.findById(req.params.id);
    
    if (!project) {
      return res.status(404).json({ message: 'Project not found' });
    }
    
    if (project.owner.toString() !== req.user.id) {
      return res.status(403).json({ message: 'Not authorized' });
    }
    
    const shareUrl = project.shareSettings?.token 
      ? `${req.protocol}://${req.get('host').replace(':3001', ':5173')}/share/${project.shareSettings.token}`
      : null;
    
    res.json({
      shareToken: project.shareSettings?.token || null,
      shareUrl,
      settings: {
        enabled: project.shareSettings?.enabled || false,
        hasPassword: !!project.shareSettings?.password,
        expiresAt: project.shareSettings?.expiresAt || null,
        allowGuestComments: project.shareSettings?.allowGuestComments ?? true,
        allowGuestDrawing: project.shareSettings?.allowGuestDrawing ?? false,
        requireName: project.shareSettings?.requireName ?? true,
      },
    });
  } catch (error) {
    console.error('Error getting share settings:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Access shared project (public endpoint)
// GET /api/share/:token
router.get('/share/:token', optionalAuth, async (req, res) => {
  try {
    const project = await Project.findOne({
      'shareSettings.token': req.params.token,
    }).populate('owner', 'name email');
    
    if (!project) {
      return res.status(404).json({ message: 'Shared project not found' });
    }
    
    // Check if sharing is valid
    if (!project.isShareValid()) {
      return res.status(403).json({ message: 'Share link has expired or is disabled' });
    }
    
    // Check if password is required
    if (project.shareSettings.password) {
      const providedPassword = req.headers['x-share-password'] || req.query.password;
      
      if (!providedPassword) {
        return res.status(401).json({ 
          message: 'Password required',
          requiresPassword: true,
        });
      }
      
      const isValidPassword = await bcrypt.compare(providedPassword, project.shareSettings.password);
      if (!isValidPassword) {
        return res.status(401).json({ message: 'Invalid password' });
      }
    }
    
    // Return project data (without sensitive info)
    res.json({
      project: {
        id: project._id,
        name: project.name,
        url: project.url,
        breakpoints: project.breakpoints,
        canvasState: project.canvasState,
        owner: {
          name: project.owner.name,
        },
        createdAt: project.createdAt,
      },
      permissions: {
        allowGuestComments: project.shareSettings.allowGuestComments,
        allowGuestDrawing: project.shareSettings.allowGuestDrawing,
        requireName: project.shareSettings.requireName,
      },
      isAuthenticated: !!req.user,
      user: req.user ? { id: req.user.id, name: req.user.name } : null,
    });
  } catch (error) {
    console.error('Error accessing shared project:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Verify share password (for client-side validation)
// POST /api/share/:token/verify
router.post('/share/:token/verify', async (req, res) => {
  try {
    const project = await Project.findOne({
      'shareSettings.token': req.params.token,
    });
    
    if (!project || !project.isShareValid()) {
      return res.status(404).json({ message: 'Invalid share link' });
    }
    
    if (!project.shareSettings.password) {
      return res.json({ valid: true, requiresPassword: false });
    }
    
    const { password } = req.body;
    if (!password) {
      return res.json({ valid: false, requiresPassword: true });
    }
    
    const isValid = await bcrypt.compare(password, project.shareSettings.password);
    res.json({ valid: isValid, requiresPassword: true });
  } catch (error) {
    console.error('Error verifying password:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

export default router;

