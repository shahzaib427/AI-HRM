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

// Apply middleware
router.use(protect);
router.use(authorize('employee', 'hr', 'admin'));

// Employee payroll routes
router.get('/dashboard', getMyDashboard);
router.get('/', getMyPayroll);
router.get('/years', getPayrollYears);
router.get('/payslip/:id', getMyPayslip);
router.get('/payslip/:id/download', downloadPayslip);
router.post('/:id/request-correction', requestCorrection);

module.exports = router;