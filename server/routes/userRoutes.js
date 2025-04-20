const express = require('express');
const router = express.Router(); // Create a router instance
const userController = require('../controllers/userController'); // Import the user controller functions
const authMiddleware = require('../middleware/authMiddleware'); // Import the authentication middleware

//publique routes
router.post('/register', userController.registerUser);
router.post('/login', userController.loginUser);

//protected routes
router.get('/profile/:user_id', authMiddleware, userController.getUserProfile);
router.put('/profile/:user_id', authMiddleware, userController.updateUserProfile);

module.exports = router;
