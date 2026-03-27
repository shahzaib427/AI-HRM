const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../utils/authMiddleware');
const adminController = require('../controllers/adminController');

// Protect all admin routes
router.use(protect);

// Admin Profile Routes ✅ WORKING
router.get('/profile', 
  authorize(['admin', 'administrator']), 
  adminController.getAdminProfile
);

router.put('/profile', 
  authorize(['admin', 'administrator']), 
  adminController.updateAdminProfile
);

// System Stats ✅ WORKING
router.get('/system-stats', 
  authorize(['admin', 'administrator']), 
  adminController.getSystemStats
);

// 2FA Toggle ✅ WORKING
router.post('/toggle-2fa', 
  authorize(['admin', 'administrator']), 
  adminController.toggle2FA
);

// Admin User Management ❌ MISSING - COMMENT OUT THESE TWO
/*
router.get('/users', 
  authorize(['admin', 'administrator']), 
  adminController.getAllUsers  // ← LINE 33 - UNDEFINED
);

router.put('/users/:id/status', 
  authorize(['admin', 'administrator']), 
  adminController.updateUserStatus  // ← ALSO UNDEFINED
);
*/

module.exports = router;
