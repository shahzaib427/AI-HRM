const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, authorize } = require('../utils/authMiddleware');
const hrPayroll = require('../controllers/hrPayrollController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, `payroll_import_${Date.now()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowed = ['.xlsx', '.xls', '.csv'];
    allowed.includes(path.extname(file.originalname).toLowerCase())
      ? cb(null, true)
      : cb(new Error('Only Excel and CSV files allowed'));
  }
});

router.use(protect);
router.use((req, res, next) => {
  console.log(`[HR PAYROLL] ${req.method} ${req.path} | User: ${req.user?.email} | Role: ${req.user?.role}`);
  next();
});
router.use(authorize('hr', 'admin', 'superadmin'));

// ======================= STATIC ROUTES FIRST =======================
router.get('/stats', hrPayroll.getPayrollStats);
router.get('/months-years', hrPayroll.getPayrollMonthsYears);
router.get('/employees', hrPayroll.getEmployeesForPayroll);
router.get('/export/excel', hrPayroll.exportToExcel);
router.get('/correction-requests', hrPayroll.getCorrectionRequests);

// ======================= HR OWN PAYROLL ROUTES =======================
router.get('/my-salary', hrPayroll.getMyOwnPayroll);
router.get('/my-payrolls', hrPayroll.getMyOwnPayroll);
router.get('/my-stats', hrPayroll.getMyOwnPayrollStats);
router.get('/my-own-payroll', hrPayroll.getMyOwnPayroll);
router.get('/my-own-stats', hrPayroll.getMyOwnPayrollStats);

// ======================= EMPLOYEE PAYROLL MANAGEMENT ROUTES =======================
router.get('/employee-payrolls', hrPayroll.getEmployeePayrolls);
router.get('/employee-stats', hrPayroll.getEmployeePayrollStats);

// ======================= MY PAYSLIP ROUTES =======================  ← ADD HERE
router.get('/my-payslip/:id/download', hrPayroll.downloadPayslipFile);
router.get('/my-payslip/:id',          hrPayroll.generatePayslip);

// ======================= ALIAS ROUTES =======================
router.get('/all-payrolls', hrPayroll.getAllPayroll);
router.get('/payslip-download/:id', hrPayroll.downloadPayslipFile);
router.get('/payslip-view/:id', hrPayroll.generatePayslip);

// ======================= PAYSLIP ROUTES =======================
router.get('/payslip/:id/download', hrPayroll.downloadPayslipFile);
router.get('/payslip/:id', hrPayroll.generatePayslip);

// ======================= LIST =======================
router.get('/', hrPayroll.getAllPayroll);

// ======================= PARAM ROUTES LAST =======================
router.get('/:id/payslip-transcript', hrPayroll.getPayslipTranscript);
router.get('/:id', hrPayroll.getPayrollById);

router.patch('/:id/status', hrPayroll.updatePayrollStatus);
router.delete('/:id', hrPayroll.deletePayroll);

console.log('✅ HR Payroll Routes Loaded Successfully');

module.exports = router;