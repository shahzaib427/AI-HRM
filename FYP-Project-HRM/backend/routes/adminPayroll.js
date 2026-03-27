const express = require('express');
const router = express.Router();
const adminPayrollController = require('../controllers/adminPayrollController');
const { protect, authorize } = require('../utils/authMiddleware');

router.use(protect);
router.use(authorize('admin', 'hr'));

// ✅ INDIVIDUAL GENERATION - Add this route
router.post('/generate-individual', adminPayrollController.generatePayroll);

// ✅ BULK GENERATION - You already have this
router.post('/bulk-generate', adminPayrollController.bulkGeneratePayroll);

// Your existing routes
router.get('/', adminPayrollController.getAllPayroll);
router.get('/stats', adminPayrollController.getPayrollStats);
router.get('/months-years', adminPayrollController.getPayrollMonthsYears);
router.get('/employees', adminPayrollController.getEmployeesForPayroll);
router.post('/generate', adminPayrollController.generatePayroll); // Keep this too
router.put('/:id', adminPayrollController.updatePayroll);
router.patch('/:id/status', adminPayrollController.updatePayrollStatus);
router.delete('/:id', adminPayrollController.deletePayroll);
router.get('/payslip/:id', adminPayrollController.generatePayslip);
router.post('/manual-create', adminPayrollController.createManualPayroll);

module.exports = router;