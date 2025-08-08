const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middleware/auth.middleware');

// Register a new user
router.post('/register', authController.register);

// Login a user
router.post('/login', authController.login);

// Get user profile (protected route)
router.get('/profile', authenticate, authController.getProfile);

module.exports = router;