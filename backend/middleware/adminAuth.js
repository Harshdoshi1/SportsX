/**
 * Admin Authentication Middleware
 * Validates hardcoded admin credentials and protects admin routes
 */

const ADMIN_EMAIL = 'admin@gmail.com';
const ADMIN_PASSWORD = 'Harshdoshi1$';

export const adminAuth = (req, res, next) => {
  const { email, password } = req.body || req.headers;
  
  if (email === ADMIN_EMAIL && password === ADMIN_PASSWORD) {
    req.isAdmin = true;
    next();
  } else {
    res.status(401).json({ 
      success: false,
      error: 'Unauthorized - Invalid admin credentials' 
    });
  }
};

export const requireAdmin = (req, res, next) => {
  if (req.isAdmin) {
    next();
  } else {
    res.status(403).json({ 
      success: false,
      error: 'Forbidden - Admin access required' 
    });
  }
};
