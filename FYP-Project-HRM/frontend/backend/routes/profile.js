// routes/profile.js
const express = require('express');
const router = express.Router();
const profileController = require('../controllers/profileController'); // You'll need to create this
const { protect } = require('../utils/authMiddleware');

// All profile routes require authentication
router.use(protect);

// Get current user's profile
router.get('/me', profileController.getMyProfile);

// Update current user's profile
router.put('/me', profileController.updateMyProfile);

// Change password (already in auth routes)
// Get profile statistics, etc.

module.exports = router;