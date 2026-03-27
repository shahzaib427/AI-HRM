// routes/employee.js
const express = require('express');
const router = express.Router();
const employeeController = require('../controllers/employeeController');
const { protect, authorize } = require('../utils/authMiddleware');

console.log('✅✅✅ EMPLOYEE ROUTES LOADED ✅✅✅');

// Apply authentication to all routes
router.use(protect);

// ===== ADMIN/HR ROUTES =====
router.get('/', authorize('admin', 'hr'), employeeController.getAllEmployees);
router.get('/:id', authorize('admin', 'hr'), employeeController.getEmployeeById);

// NEW ROUTE - Unified employee creation with account
router.post('/create-with-account', 
  authorize('admin'), 
  employeeController.createEmployeeWithAccount
);

// Existing routes
router.post('/', authorize('admin'), employeeController.createEmployee);
router.put('/:id', authorize('admin'), employeeController.updateEmployee);
router.delete('/:id', authorize('admin'), employeeController.deleteEmployee);

// ===== EMPLOYEE SELF-SERVICE ROUTES =====
router.get('/profile/me', employeeController.getMyProfile);
router.put('/profile/me', employeeController.updateMyProfile);

module.exports = router;