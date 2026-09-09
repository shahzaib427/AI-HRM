const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../utils/authMiddleware');
const hrController = require('../controllers/hrController');
const upload = require('../utils/profilePictureUpload');

// Protect all HR routes
router.use(protect);

// Profile Picture Upload Routes
router.post('/upload-profile-picture',
  authorize(['hr', 'admin', 'administrator']),
  upload.single('profilePicture'),
  hrController.uploadProfilePicture
);

router.delete('/profile-picture',
  authorize(['hr', 'admin', 'administrator']),
  hrController.deleteProfilePicture
);

// HR Profile Routes
router.get('/profile', 
  authorize(['hr', 'admin', 'administrator']), 
  hrController.getHRProfile
);

router.put('/profile', 
  authorize(['hr', 'admin', 'administrator']), 
  hrController.updateHRProfile
);

// HR Stats
router.get('/stats', 
  authorize(['hr', 'admin', 'administrator']), 
  hrController.getHRStats
);

// ============= DASHBOARD ENDPOINTS =============

// Dashboard Stats
router.get('/dashboard/stats',
  authorize(['hr', 'admin', 'administrator']),
  hrController.getDashboardStats
);

// Recent Activity
router.get('/dashboard/recent-activity',
  authorize(['hr', 'admin', 'administrator']),
  hrController.getRecentActivity
);

// Pending Approvals
router.get('/dashboard/pending-approvals',
  authorize(['hr', 'admin', 'administrator']),
  hrController.getPendingApprovals
);

// Recruitment Data
router.get('/dashboard/recruitment-data',
  authorize(['hr', 'admin', 'administrator']),
  hrController.getRecruitmentData
);

// HR Metrics
router.get('/dashboard/metrics',
  authorize(['hr', 'admin', 'administrator']),
  hrController.getHRMetrics
);

module.exports = router;