import jwt from 'jsonwebtoken';

// Required authentication middleware
export const authenticate = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }
    
    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
    req.userId = decoded.userId;
    req.user = { id: decoded.userId, name: decoded.name, email: decoded.email };
    next();
  } catch (error) {
    res.status(401).json({ error: 'Invalid token' });
  }
};

// Alias for authenticate
export const auth = authenticate;

// Optional authentication - doesn't fail if no token, but adds user info if present
export const optionalAuth = (req, res, next) => {
  try {
    const token = req.headers.authorization?.split(' ')[1];
    
    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      req.userId = decoded.userId;
      req.user = { id: decoded.userId, name: decoded.name, email: decoded.email };
    }
    next();
  } catch (error) {
    // Token invalid, but we continue without user info
    next();
  }
};

