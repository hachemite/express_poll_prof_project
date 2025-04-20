const jwt = require('jsonwebtoken');
require('dotenv').config();

// Middleware to check if user is authenticated for EJS routes
const clientAuthMiddleware = (req, res, next) => {
  // Get token from cookies
  const token = req.cookies.token;
  
  if (!token) {
    return res.redirect('/login');
  }
  
  try {
    // Verify token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    res.clearCookie('token');
    res.clearCookie('user');
    return res.redirect('/login');
  }
};

module.exports = clientAuthMiddleware;