const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../utils/authMiddleware');
const {
  generateReport,
  getAllReports,
  getReportById,
  updateReportVisibility,
  deleteReport,
  getReportStats,
  getSharedReports
} = require('../controllers/reportController');

// All routes require authentication
router.use(protect);

// Admin & HR routes
router.post('/generate', authorize('admin', 'hr'), generateReport);
router.get('/stats', authorize('admin', 'hr'), getReportStats);

// Admin only routes
router.get('/all', authorize('admin'), getAllReports);
router.put('/:id/visibility', authorize('admin'), updateReportVisibility);
router.delete('/:id', authorize('admin'), deleteReport);

// Shared routes (HR can view shared reports)
router.get('/shared', authorize('admin', 'hr'), getSharedReports);
router.get('/:id', authorize('admin', 'hr'), getReportById);

module.exports = router;