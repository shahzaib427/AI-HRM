const express = require('express');
const router  = express.Router();
const { protect, authorize } = require('../utils/authMiddleware');

const {
  // ── Employee (manual – needs HR approval) ──────────────────────────────────
  requestCheckIn,
  requestCheckOut,
  getMyAttendance,

  // ── Admin ──────────────────────────────────────────────────────────────────
  getPendingRequests,
  approveCheckIn,
  approveCheckOut,
  rejectRequest,
  clearStuckCheckout,
  getAllAttendance,

  // ── CRUD ───────────────────────────────────────────────────────────────────
  createAttendance,
  updateAttendance,
  deleteAttendance,

  // ── CSV & Email ────────────────────────────────────────────────────────────
  exportAttendanceCSV,
  exportEmployeeAttendanceCSV,
  sendAttendanceReportEmail,
  getAttendanceReports,
  sendBiWeeklyReports,

  // ── AI (face + GPS – auto-approved) ───────────────────────────────────────
  aiCheckIn,
  aiCheckOut,
  registerFace,
  validateGPSEndpoint,
  aiServiceHealth,

  // ── Test ───────────────────────────────────────────────────────────────────
  testEndpoint,
} = require('../controllers/attendanceController');

// ============================================================================
// EMPLOYEE ROUTES  (any logged-in user)
// ============================================================================

// Manual check-in/out  →  creates a pending request, HR must approve
router.post('/checkin',  protect, requestCheckIn);
router.post('/checkout', protect, requestCheckOut);

// AI check-in/out  →  face recognition + GPS, auto-approved instantly
router.post('/ai/checkin',  protect, aiCheckIn);
router.post('/ai/checkout', protect, aiCheckOut);

// View own attendance history
router.get('/my-attendance', protect, getMyAttendance);

// Export own attendance as CSV
router.get('/export/my-csv', protect, exportEmployeeAttendanceCSV);

// GPS pre-check before opening the camera  (?lat=xx&lng=yy)
router.get('/ai/gps-validate', protect, validateGPSEndpoint);

// ============================================================================
// ADMIN / HR ROUTES
// ============================================================================

// Pending approval queue
router.get('/pending-requests',           protect, authorize('admin', 'hr'), getPendingRequests);
router.put('/approve-checkin/:id',        protect, authorize('admin', 'hr'), approveCheckIn);
router.put('/approve-checkout/:id',       protect, authorize('admin', 'hr'), approveCheckOut);
router.put('/reject/:id',                 protect, authorize('admin', 'hr'), rejectRequest);
router.put('/clear-stuck-checkout/:id',   protect, authorize('admin', 'hr'), clearStuckCheckout);

// All attendance records  (query: page, limit, employeeId, dateFrom, dateTo, status, search)
router.get('/', protect, authorize('admin', 'hr'), getAllAttendance);

// Register an employee face embedding
router.post('/ai/register-face', protect, authorize('admin', 'hr'), registerFace);

// Check whether the Python AI service is reachable
router.get('/ai/service-health', protect, authorize('admin', 'hr'), aiServiceHealth);

// CSV exports
router.get('/export/csv', protect, authorize('admin', 'hr'), exportAttendanceCSV);

// Email reports
router.post('/send-report/:employeeId',   protect, authorize('admin', 'hr'), sendAttendanceReportEmail);
router.get('/reports',                    protect, authorize('admin', 'hr'), getAttendanceReports);
router.post('/send-biweekly-reports',     protect, authorize('admin', 'hr'), sendBiWeeklyReports);

// ============================================================================
// FULL CRUD
// ============================================================================

router.post('/',    protect, authorize('admin', 'hr'), createAttendance);
router.put('/:id',  protect, authorize('admin', 'hr'), updateAttendance);
router.delete('/:id', protect, authorize('admin', 'hr'), deleteAttendance);

// ============================================================================
// TEST
// ============================================================================

router.get('/test', protect, testEndpoint);

module.exports = router;