const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../utils/authMiddleware');
const employeeController = require('../controllers/employeeController');
const upload = require('../utils/profilePictureUpload');

// Protect all employee routes
router.use(protect);

// Profile Picture Upload Route (add this BEFORE other routes)
router.post('/upload-profile-picture',
  authorize(['employee', 'hr', 'manager', 'admin', 'administrator']),
  upload.single('profilePicture'),
  employeeController.uploadProfilePicture
);

// Delete profile picture
router.delete('/profile-picture',
  authorize(['employee', 'hr', 'manager', 'admin', 'administrator']),
  employeeController.deleteProfilePicture
);

// Employee Profile Routes
router.get('/profile/me', 
  authorize(['employee', 'hr', 'manager', 'admin', 'administrator']),
  employeeController.getMyProfile
);

router.put('/profile/me', 
  authorize(['employee', 'hr', 'manager', 'admin', 'administrator']),
  employeeController.updateMyProfile
);

// Employee Dashboard
router.get('/dashboard', 
  authorize(['employee', 'hr', 'manager', 'admin', 'administrator']),
  employeeController.getDashboard
);

// Leave Balance
router.get('/leaves/balance', 
  authorize(['employee', 'hr', 'manager', 'admin', 'administrator']),
  employeeController.getLeaveBalance
);

// Alternative endpoint for fallback
router.get('/profile', employeeController.getMyProfile);

module.exports = router;