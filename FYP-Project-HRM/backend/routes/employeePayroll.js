const express = require('express');
const router = express.Router();
const {
  getMyDashboard,
  getMyPayroll,
  getPayrollYears,
  getMyPayslip,
  downloadPayslip,
  requestCorrection
} = require('../controllers/employeePayrollController');

const { protect, authorize } = require('../utils/authMiddleware');

// All routes require authentication
router.use(protect);
router.use(authorize('employee', 'hr', 'admin'));

// Static routes (no params)
router.get('/dashboard', getMyDashboard);
router.get('/years', getPayrollYears);

// List route with pagination
// GET /api/employee/payroll?year=2025&status=Paid&page=1&limit=10
router.get('/', getMyPayroll);

// Param routes (must be after static routes)
router.get('/:id/payslip', getMyPayslip);
router.get('/:id/payslip/download', downloadPayslip);
router.post('/:id/request-correction', requestCorrection);

console.log('✅ Employee Payroll Routes Loaded');

module.exports = router;