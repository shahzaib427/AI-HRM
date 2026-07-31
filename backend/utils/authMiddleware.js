const jwt = require('jsonwebtoken');
const User = require('../models/User.js');

// ================= PROTECT MIDDLEWARE =================
const protect = async (req, res, next) => {
  let token;

  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (!token) {
      return res.status(401).json({ success: false, error: 'Access denied. No token provided.' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');

    // ✅ Internal Flask service token — skip DB lookup
    if (decoded.id === 'internal-flask-service') {
      req.user = {
        id:         'internal-flask-service',
        _id:        'internal-flask-service',
        role:       'hr',
        systemRole: 'hr',
        isActive:   true,
      };
      return next();
    }

    const user = await User.findById(decoded.id).select('-password');

    if (!user) {
      return res.status(401).json({ success: false, error: 'User no longer exists.' });
    }

    if (user.isActive === false) {
      return res.status(403).json({ success: false, error: 'Account deactivated. Contact administrator.' });
    }

    req.user = {
      id:             user._id,
      _id:            user._id,
      email:          user.email,
      name:           user.name,
      role:           user.role,
      systemRole:     user.systemRole,
      isActive:       user.isActive,
      profilePicture: user.profilePicture
    };

    await User.findByIdAndUpdate(user._id, { lastLogin: new Date() });

    next();
  } catch (err) {
    console.error('AUTH ERROR:', err.message);

    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ success: false, error: 'Session expired. Please login again.', code: 'TOKEN_EXPIRED' });
    }
    if (err.name === 'JsonWebTokenError') {
      return res.status(401).json({ success: false, error: 'Invalid token.', code: 'INVALID_TOKEN' });
    }

    res.status(500).json({ success: false, error: 'Authentication failed.', code: 'AUTH_FAILED' });
  }
};

// ================= AUTHORIZE MIDDLEWARE =================
const authorize = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ success: false, error: 'User not authenticated.' });
    }

    // ✅ Internal Flask service — always allow
    if (req.user.id === 'internal-flask-service') {
      return next();
    }

    const roles   = Array.isArray(allowedRoles[0]) ? allowedRoles[0] : allowedRoles;
    const hasRole = roles.includes(req.user.role) || roles.includes(req.user.systemRole);

    if (!hasRole) {
      return res.status(403).json({
        success: false,
        error:   `Access denied. Required roles: ${roles.join(', ')}. Your role: ${req.user.role || req.user.systemRole}`,
        code:    'INSUFFICIENT_PERMISSIONS'
      });
    }

    next();
  };
};

// ================= OPTIONAL AUTH =================
const optionalAuth = async (req, res, next) => {
  let token;

  try {
    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    } else if (req.cookies?.token) {
      token = req.cookies.token;
    }

    if (token) {
      const decoded = jwt.verify(token, process.env.JWT_SECRET || 'your-secret-key');
      const user    = await User.findById(decoded.id).select('-password');

      if (user && user.isActive) {
        req.user = {
          id:             user._id,
          _id:            user._id,
          email:          user.email,
          name:           user.name,
          role:           user.role,
          systemRole:     user.systemRole,
          isActive:       user.isActive,
          profilePicture: user.profilePicture
        };
      }
    }
  } catch (err) {
    console.log('Optional auth failed (non-critical):', err.message);
  }

  next();
};

module.exports = { protect, authorize, optionalAuth };