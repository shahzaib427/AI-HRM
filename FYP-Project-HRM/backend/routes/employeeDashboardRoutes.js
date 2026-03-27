// routes/employeeDashboardRoutes.js
const express = require('express');
const router = express.Router();
const employeeDashboardController = require('../controllers/employeeDashboardController');

// Your auth middleware exports "protect", not "authenticate"
const { protect } = require('../utils/authMiddleware');

router.use(protect);

// Employee dashboard routes
router.get('/stats', employeeDashboardController.getEmployeeStats);
router.get('/upcoming-events', employeeDashboardController.getUpcomingEvents);
router.get('/activities', employeeDashboardController.getEmployeeActivities);
router.get('/team-members', employeeDashboardController.getTeamMembers);
router.get('/performance-metrics', employeeDashboardController.getPerformanceMetrics);

module.exports = router;