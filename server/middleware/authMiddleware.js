const jwt = require('jsonwebtoken');
require('dotenv').config();

// Main authentication middleware
const authMiddleware = (req, res, next) => {
  try {
    let token;
    
    // First try to get token from Authorization header
    const authHeader = req.header('Authorization');
    if (authHeader) {
      token = authHeader.split(' ')[1]; // Get token after 'Bearer '
    }
    
    // If no token in header, try from cookies (for browser clients)
    if (!token && req.cookies && req.cookies.token) {
      token = req.cookies.token;
    }
    
    // If still no token, deny access
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Ensure we have user ID (adjust based on your JWT payload structure)
    req.user = {
      id: decoded.userId || decoded.user?.id || decoded.id
    };
    
    if (!req.user.id) {
      return res.status(401).json({ message: 'Invalid token payload' });
    }
    
    next();
  } catch (err) {
    console.error('Authentication error:', err.message);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

module.exports = authMiddleware;