const express = require('express');
const path = require('path');
const connectDB = require('./server/config/db');
const userRoutes = require('./server/routes/userRoutes');
const pollRoutes = require('./server/routes/pollRoutes');
const cookieParser = require('cookie-parser');
const clientAuthMiddleware = require('./server/middleware/clientAuthMiddleware');
require('dotenv').config();
const cors = require('cors');



const app = express();

// Connect to database
connectDB();

// Middleware
app.use(express.json());
app.use(express.urlencoded());
app.use(cookieParser());
app.use(cors({
  origin: process.env.CLIENT_URL || 'http://localhost:5000',
  credentials: true // Allow cookies to be sent
}));

// Set up EJS as the view engine
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'client/views'));

// Serve static files
app.use(express.static(path.join(__dirname, 'client/public')));

// API Routes
app.use('/api/users', userRoutes);
app.use('/api/polls', pollRoutes);

// Public client routes
app.get('/', (req, res) => {
  res.render('index', { user: req.cookies.user ? JSON.parse(req.cookies.user) : null });
});

app.get('/login', (req, res) => {
  res.render('login', { message: null });
});

app.get('/register', (req, res) => {
  res.render('register', { message: null });
});

const logout = (req, res) => {
  try {
    res.clearCookie('token', { 
      path: '/',
      httpOnly: true,
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });
    res.clearCookie('user', { 
      path: '/',
      sameSite: 'strict',
      secure: process.env.NODE_ENV === 'production'
    });
    
    // Add cache-control headers
    res.header('Cache-Control', 'no-store, no-cache, must-revalidate, private');
    res.header('Pragma', 'no-cache');
    res.header('Expires', '0');
    
    return res.redirect('/login');
  } catch (error) {
    console.error('Logout error:', error);
    return res.redirect('/login?error=logout_failed');
  }
};

app.get('/logout',logout );



// Protected client routes (require authentication)
app.get('/polls', clientAuthMiddleware, (req, res) => {
  res.render('polls', { user: req.cookies.user ? JSON.parse(req.cookies.user) : null });
});

app.get('/polls/new', clientAuthMiddleware, (req, res) => {
  res.render('poll-new', { user: req.cookies.user ? JSON.parse(req.cookies.user) : null });
});

app.get('/polls/:poll_id', clientAuthMiddleware, (req, res) => {
  res.render('poll-view', { 
    user: req.cookies.user ? JSON.parse(req.cookies.user) : null,
    poll_id: req.params.poll_id
  });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  
  // Check if headers have already been sent
  if (res.headersSent) {
    return next(err);
  }
  
  res.status(500).json({ 
    message: 'Internal server error', 
    error: process.env.NODE_ENV === 'production' ? {} : err.message 
  });
});

// 404 handler - this should be the LAST middleware
app.use((req, res) => {
  if (!res.headersSent) {
    res.status(404).json({ message: 'Route not found' });
  }
});

// Start server
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port http://localhost:${PORT}`);
});