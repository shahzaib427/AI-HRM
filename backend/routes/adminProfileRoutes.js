const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../utils/authMiddleware');
const adminController = require('../controllers/adminController');
const upload = require('../utils/profilePictureUpload');

// Protect all admin routes
router.use(protect);
router.use(authorize(['admin', 'administrator']));

// Profile Picture Routes
router.post('/upload-profile-picture',
  upload.single('profilePicture'),
  adminController.uploadProfilePicture
);

router.delete('/profile-picture',
  adminController.deleteProfilePicture
);

// Admin Profile Routes
router.get('/profile', adminController.getAdminProfile);
router.put('/profile', adminController.updateAdminProfile);

// System Stats
router.get('/stats', adminController.getSystemStats);

// Dashboard Routes
router.get('/dashboard/stats', adminController.getDashboardStats);
router.get('/dashboard/recent-activity', adminController.getRecentActivity);
router.get('/dashboard/team-members', adminController.getTeamMembers);
router.get('/dashboard/notifications', adminController.getNotifications);
router.patch('/dashboard/notifications/:id/read', adminController.markNotificationRead);
router.get('/dashboard/performance-metrics', adminController.getPerformanceMetrics);
router.get('/dashboard/quick-actions', adminController.getQuickActions);

// NEW: Dashboard enhancement routes — attendance chart, leave breakdown,
// system status widget, and AI insights. Same protect/authorize chain as
// every other route in this file (applied globally above via router.use).
router.get('/dashboard/attendance-overview', adminController.getAttendanceOverview);
router.get('/dashboard/leave-overview', adminController.getLeaveOverview);
router.get('/dashboard/system-status', adminController.getSystemStatus);
router.get('/dashboard/ai-insights', adminController.getAIInsights);

// 2FA Toggle
router.post('/toggle-2fa', adminController.toggle2FA);

module.exports = router;