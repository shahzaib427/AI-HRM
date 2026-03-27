const express = require('express');
const router = express.Router();
const adminPayrollController = require('../controllers/adminPayrollController');
const { protect, authorize } = require('../utils/authMiddleware');

// All routes require authentication and admin/hr role
router.use(protect);
router.use(authorize('admin', 'hr'));

// ==================== MAIN PAYROLL ROUTES ====================

// GET routes
router.get('/', adminPayrollController.getAllPayroll);                    // GET /api/admin/payroll
router.get('/stats', adminPayrollController.getPayrollStats);             // GET /api/admin/payroll/stats
router.get('/months-years', adminPayrollController.getPayrollMonthsYears);// GET /api/admin/payroll/months-years
router.get('/employees', adminPayrollController.getEmployeesForPayroll);  // GET /api/admin/payroll/employees
router.get('/export', adminPayrollController.exportPayroll);              // GET /api/admin/payroll/export
router.get('/payslip/:id', adminPayrollController.generatePayslip);       // GET /api/admin/payroll/payslip/:id
router.get('/:id/payslip-transcript', adminPayrollController.getPayslipTranscript); // GET /api/admin/payroll/:id/payslip-transcript
router.get('/:id/payslip-pdf', adminPayrollController.generatePayslipPDF); // GET /api/admin/payroll/:id/payslip-pdf

// POST routes (Create/Generate)
router.post('/generate', adminPayrollController.generatePayroll);         // POST /api/admin/payroll/generate
router.post('/generate-individual', adminPayrollController.generateIndividualPayroll); // POST /api/admin/payroll/generate-individual
router.post('/bulk-generate', adminPayrollController.bulkGeneratePayroll); // POST /api/admin/payroll/bulk-generate
router.post('/manual-create', adminPayrollController.createManualPayroll); // POST /api/admin/payroll/manual-create
router.post('/import', adminPayrollController.importPayroll);             // POST /api/admin/payroll/import
router.post('/send-payslip', adminPayrollController.sendPayslip);         // POST /api/admin/payroll/send-payslip

// PATCH routes (Update specific fields)
router.patch('/:id', adminPayrollController.updatePayroll);               // PATCH /api/admin/payroll/:id
router.patch('/:id/status', adminPayrollController.updatePayrollStatus);  // PATCH /api/admin/payroll/:id/status
router.patch('/:id/bank-transfer', adminPayrollController.processBankTransfer); // PATCH /api/admin/payroll/:id/bank-transfer
router.patch('/:id/bulk-payment', adminPayrollController.processBulkPayment); // PATCH /api/admin/payroll/:id/bulk-payment

// PUT routes (Full update)
router.put('/:id', adminPayrollController.updatePayroll);                 // PUT /api/admin/payroll/:id

// DELETE routes
router.delete('/:id', adminPayrollController.deletePayroll);              // DELETE /api/admin/payroll/:id

module.exports = router;