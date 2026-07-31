const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const { protect, authorize } = require('../utils/authMiddleware');
const adminPayroll = require('../controllers/adminPayrollController');

const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, 'uploads/'),
  filename: (req, file, cb) =>
    cb(null, `payroll_import_${Date.now()}${path.extname(file.originalname)}`)
});

const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = ['.xlsx', '.xls', '.csv'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(ext)) cb(null, true);
    else cb(new Error('Only Excel and CSV files are allowed'));
  }
});

router.use(protect);
router.use((req, res, next) => {
  console.log(`[ADMIN PAYROLL] ${req.method} ${req.path} | User: ${req.user?.email} | Role: ${req.user?.role}`);
  next();
});
router.use(authorize('admin', 'superadmin', 'hr'));

// ─────────────────── STATIC / NAMED ROUTES FIRST ───────────────────
router.get('/stats',          adminPayroll.getPayrollStats);
router.get('/months-years',   adminPayroll.getPayrollMonthsYears);
router.get('/employees',      adminPayroll.getEmployeesForPayroll);
router.get('/export/excel',   adminPayroll.exportToExcel);

router.post('/generate',      adminPayroll.generatePayroll);
router.post('/bulk-generate', adminPayroll.bulkGeneratePayroll);
router.post('/manual-create', adminPayroll.createManualPayroll);
router.post('/bulk-payment',  adminPayroll.processBulkPayment);
router.post('/import/excel',  upload.single('file'), adminPayroll.importFromExcel);

// ─────────────────── PAYSLIP ROUTES (must be before /:id) ───────────────────
// FIX: These were after router.get('/:id') before, causing Express to match
//      /:id with id="payslip" and never reaching these handlers.
router.get('/payslip/:id/download', adminPayroll.downloadPayslipFile);
router.get('/payslip/:id',          adminPayroll.generatePayslip);

// ─────────────────── LIST ROUTE ───────────────────
router.get('/', adminPayroll.getAllPayroll);

// ─────────────────── PARAM ROUTES (/:id must be LAST among GETs) ───────────────────
// FIX: /:id/payslip-transcript also placed before plain /:id
router.get('/:id/payslip-transcript', adminPayroll.getPayslipTranscript);
router.get('/:id',                    adminPayroll.getPayrollById);

router.put('/:id',              adminPayroll.updatePayroll);
router.patch('/:id/status',     adminPayroll.updatePayrollStatus);
router.delete('/:id',           adminPayroll.deletePayroll);
router.post('/:id/resend-email', adminPayroll.resendSalarySlipEmail);

console.log('Admin Payroll Routes Loaded');

module.exports = router;