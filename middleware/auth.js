/**
 * Authentication Middleware
 * LADYBUGNODES V(5.1)
 */

const jwt = require('jsonwebtoken');
const { User } = require('../models');

const JWT_SECRET = process.env.JWT_SECRET || 'ladybugnodes-secret-change-me';

/**
 * Authentication middleware
 */
const auth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') 
      ? authHeader.slice(7) 
      : req.query.token;
    
    if (!token) {
      return res.status(401).json({ error: 'Unauthorized - No token provided' });
    }
    
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Try to find user in MongoDB if connected
    if (require('mongoose').connection.readyState === 1) {
      const user = await User.findById(decoded.id);
      if (!user) {
        return res.status(401).json({ error: 'User not found' });
      }
      if (user.isBanned) {
        return res.status(403).json({ error: 'Account has been banned' });
      }
      req.user = user;
      req.user._id = user._id;
      req.user.id = user._id.toString();
      req.user.role = user.role;
      req.user.username = user.username;
    } else {
      // Fallback to file-based auth
      req.user = decoded;
    }
    
    next();
  } catch (error) {
    if (error.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expired' });
    }
    if (error.name === 'JsonWebTokenError') {
      return res.status(401).json({ error: 'Invalid token' });
    }
    return res.status(500).json({ error: 'Authentication error' });
  }
};

/**
 * Admin middleware
 */
const adminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role !== 'admin' && req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Admin access required' });
    }
    next();
  });
};

/**
 * Super admin middleware
 */
const superAdminAuth = (req, res, next) => {
  auth(req, res, () => {
    if (req.user.role !== 'superadmin') {
      return res.status(403).json({ error: 'Super admin access required' });
    }
    next();
  });
};

/**
 * Optional auth - doesn't fail if no token
 */
const optionalAuth = async (req, res, next) => {
  try {
    const authHeader = req.headers.authorization || '';
    const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : req.query.token;
    
    if (token) {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    }
    next();
  } catch {
    next();
  }
};

/**
 * Rate limit by user
 */
const rateLimitByUser = (maxRequests = 100, windowMs = 60000) => {
  const requests = new Map();
  
  return (req, res, next) => {
    const userId = req.user?.id || req.ip;
    const now = Date.now();
    
    if (!requests.has(userId)) {
      requests.set(userId, { count: 1, resetTime: now + windowMs });
      return next();
    }
    
    const userData = requests.get(userId);
    
    if (now > userData.resetTime) {
      userData.count = 1;
      userData.resetTime = now + windowMs;
      return next();
    }
    
    if (userData.count >= maxRequests) {
      return res.status(429).json({ 
        error: 'Too many requests',
        retryAfter: Math.ceil((userData.resetTime - now) / 1000)
      });
    }
    
    userData.count++;
    next();
  };
};

/**
 * Check feature access
 */
const checkFeature = (feature) => {
  const featurePermissions = {
    'bots.create': ['user', 'moderator', 'admin', 'superadmin'],
    'bots.unlimited': ['admin', 'superadmin'],
    'sessions.create': ['user', 'moderator', 'admin', 'superadmin'],
    'sessions.unlimited': ['moderator', 'admin', 'superadmin'],
    'webhooks.create': ['user', 'moderator', 'admin', 'superadmin'],
    'api.keys': ['user', 'moderator', 'admin', 'superadmin'],
    'admin.panel': ['admin', 'superadmin'],
    'users.manage': ['admin', 'superadmin'],
    'system.config': ['superadmin']
  };
  
  return (req, res, next) => {
    const allowedRoles = featurePermissions[feature] || [];
    if (!allowedRoles.includes(req.user?.role)) {
      return res.status(403).json({ 
        error: `Feature '${feature}' not available for your plan` 
      });
    }
    next();
  };
};

/**
 * Validate request body
 */
const validate = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ 
        error: 'Validation error', 
        details: error.details.map(d => d.message) 
      });
    }
    next();
  };
};

module.exports = {
  auth,
  adminAuth,
  superAdminAuth,
  optionalAuth,
  rateLimitByUser,
  checkFeature,
  validate
};