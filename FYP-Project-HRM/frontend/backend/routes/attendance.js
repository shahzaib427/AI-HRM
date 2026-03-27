const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../utils/authMiddleware');

const {
  // Employee functions
  requestCheckIn, requestCheckOut, getMyAttendance,
  // Admin functions
  getPendingRequests, approveCheckIn, approveCheckOut, 
  getAllAttendance, rejectRequest, clearStuckCheckout,
  // CRUD
  createAttendance, updateAttendance, deleteAttendance,
  // CSV and email functions
  exportAttendanceCSV, exportEmployeeAttendanceCSV,
  sendAttendanceReportEmail, getAttendanceReports,
  sendBiWeeklyReports,
  // Test endpoint
  testEndpoint
} = require('../controllers/attendanceController');

// ========================================
// EMPLOYEE ROUTES (protect only)
// ========================================

// Check-in/out requests
router.post('/checkin', protect, requestCheckIn);     
router.post('/checkout', protect, requestCheckOut); 

// View own attendance (with query parameters for date range)
router.get('/my-attendance', protect, getMyAttendance);

// Export own attendance (with query parameters for date range)
router.get('/export/my-csv', protect, exportEmployeeAttendanceCSV);

// ========================================
// ADMIN ROUTES (protect + authorize('admin', 'hr'))
// ========================================

// View and manage requests
router.get('/pending-requests', protect, authorize('admin', 'hr'), getPendingRequests);
router.put('/approve-checkin/:id', protect, authorize('admin', 'hr'), approveCheckIn);
router.put('/approve-checkout/:id', protect, authorize('admin', 'hr'), approveCheckOut);
router.put('/reject/:id', protect, authorize('admin', 'hr'), rejectRequest);
router.put('/clear-stuck-checkout/:id', protect, authorize('admin', 'hr'), clearStuckCheckout);

// View all attendance with filters (query params: page, limit, employeeId, dateFrom, dateTo, status, search)
router.get('/', protect, authorize('admin', 'hr'), getAllAttendance);

// CSV Exports (with query parameters: employeeId, startDate, endDate)
router.get('/export/csv', protect, authorize('admin', 'hr'), exportAttendanceCSV);

// Email Reports
router.post('/send-report/:employeeId', protect, authorize('admin', 'hr'), sendAttendanceReportEmail);
router.get('/reports', protect, authorize('admin', 'hr'), getAttendanceReports);

// Automatic email scheduler (for cron jobs)
router.post('/send-biweekly-reports', protect, authorize('admin', 'hr'), sendBiWeeklyReports);

// ========================================
// FULL CRUD OPERATIONS
// ========================================
router.post('/', protect, authorize('admin', 'hr'), createAttendance);
router.put('/:id', protect, authorize('admin', 'hr'), updateAttendance);
router.delete('/:id', protect, authorize('admin', 'hr'), deleteAttendance);

// ========================================
// TEST ROUTE
// ========================================
router.get('/test', protect, testEndpoint);

module.exports = router;