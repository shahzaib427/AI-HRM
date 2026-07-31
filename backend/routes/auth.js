// routes/auth.js
const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');
const { protect } = require('../utils/authMiddleware');
const employeeController = require('../controllers/employeeController');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/send-welcome-email', authController.sendWelcomeEmail); // ADD THIS LINE

// Protected routes (require authentication)
router.post('/change-password', protect, authController.changePassword);
router.get('/check-password-status', protect, authController.checkPasswordStatus);

// Profile routes
router.get('/me', protect, employeeController.getMyProfile);
router.get('/profile', protect, employeeController.getMyProfile);
router.put('/profile', protect, employeeController.updateMyProfile);

module.exports = router;