console.log('🔥🔥🔥 ADMIN DASHBOARD ROUTES FILE IS BEING LOADED! 🔥🔥🔥');

const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../utils/authMiddleware');
const {
  getSystemStats,
  getRecentActivity,
  getTeamMembers,
  getNotifications,
  getPerformanceMetrics,
  getQuickActions,
  getDepartmentDistribution,
  getAttendanceOverview,
  getLeaveAnalytics,
  getRevenueMetrics,
  markNotificationRead,
  markAllNotificationsRead
} = require('../controllers/adminDashboardController');

// Debug middleware - remove in production
router.use((req, res, next) => {
  console.log(`📡 Dashboard Route: ${req.method} ${req.originalUrl}`);
  next();
});

// Apply middleware: all routes require authentication and admin/superadmin role
router.use(protect);
router.use(authorize('admin', 'superadmin'));

// ==================== DASHBOARD ROUTES ====================

// Main dashboard stats
router.get('/stats', getSystemStats);
router.get('/recent-activity', getRecentActivity);
router.get('/team-members', getTeamMembers);
router.get('/notifications', getNotifications);
router.get('/performance-metrics', getPerformanceMetrics);
router.get('/quick-actions', getQuickActions);

// Additional analytics routes
router.get('/department-distribution', getDepartmentDistribution);
router.get('/attendance-overview', getAttendanceOverview);
router.get('/leave-analytics', getLeaveAnalytics);
router.get('/revenue-metrics', getRevenueMetrics);

// Notification actions
router.patch('/notifications/:id/read', markNotificationRead);
router.post('/notifications/read-all', markAllNotificationsRead);

// Test route (for debugging)
router.get('/test', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Dashboard route works!',
    user: req.user 
  });
});

module.exports = router;