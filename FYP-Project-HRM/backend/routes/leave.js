const express = require('express');
const router = express.Router();
const leaveController = require('../controllers/leaveController');
const auth = require('../utils/authMiddleware');

// All routes require authentication
router.use(auth.protect);

// ============ MONTHLY LEAVE SYSTEM ROUTES ============
// Get monthly leave balance (2 leaves per month system)
router.get('/monthly-balance', leaveController.getMonthlyBalance);

// Employee routes (updated for monthly system)
router.get('/balance', leaveController.getLeaveBalance);
router.get('/statistics', leaveController.getLeaveStatistics);
router.get('/upcoming', leaveController.getUpcomingLeaves);
router.post('/apply', leaveController.applyLeave);
router.get('/my-leaves', leaveController.getMyLeaves);

// Admin/HR routes - MUST COME BEFORE :id ROUTES
router.get('/all', auth.authorize('admin', 'hr'), leaveController.getAllLeaves);
// Add delete all routes - IMPORTANT: Place BEFORE :id route
router.delete('/delete-all', auth.authorize('admin', 'hr'), leaveController.deleteAllLeaves);
router.delete('/cleanup', auth.authorize('admin', 'hr'), leaveController.cleanupOldLeaves);

// Manager routes
router.get('/team/leaves', auth.authorize('manager', 'admin', 'hr'), leaveController.getTeamLeaves);

// Review leave (approve/reject) - for admin/hr/manager
router.post('/:id/review', auth.authorize('admin', 'hr', 'manager'), leaveController.reviewLeave);

// Individual leave operations - THIS MUST BE LAST
router
  .route('/:id')
  .get(leaveController.checkLeaveAccess, leaveController.getLeaveById)
  .put(leaveController.checkLeaveAccess, leaveController.updateLeave)
  .delete(leaveController.checkLeaveAccess, leaveController.cancelLeave);

  router.get('/export', auth.authorize('admin', 'hr'), leaveController.exportLeavesToCSV);
router.get('/export/monthly-report', auth.authorize('admin', 'hr'), leaveController.exportMonthlyReport);

module.exports = router;