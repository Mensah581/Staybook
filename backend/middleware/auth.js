// Authentication middleware
const isAuthenticated = (req, res, next) => {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ success: false, error: 'Not authenticated' });
  }
  next();
};

// Authorization middleware - check role
const hasRole = (...roles) => {
  return (req, res, next) => {
    if (!req.session || !req.session.userId) {
      return res.status(401).json({ success: false, error: 'Not authenticated' });
    }
    
    if (!roles.includes(req.session.role)) {
      return res.status(403).json({ success: false, error: 'Insufficient permissions' });
    }
    
    next();
  };
};

// Middleware for admin only
const isAdmin = hasRole('admin', 'main_admin');

// Middleware for front desk and admin
const isFrontDeskOrAdmin = hasRole('front_desk', 'admin', 'main_admin');

// Middleware for manager and admin
const isManagerOrAdmin = hasRole('manager', 'admin', 'main_admin');

module.exports = {
  isAuthenticated,
  hasRole,
  isAdmin,
  isFrontDeskOrAdmin,
  isManagerOrAdmin
};
