const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

// Authentication Routes
// POST /api/mobile/auth/register
router.post('/register', authController.register);

// POST /api/mobile/auth/login
router.post('/login', authController.login);

// POST /api/mobile/auth/logout
router.post('/logout', authController.logout);

// GET /api/mobile/auth/profile
router.get('/profile', authController.getProfile);

// PUT /api/mobile/auth/profile/:userId
router.put('/profile/:userId', authController.updateProfile);

module.exports = router;