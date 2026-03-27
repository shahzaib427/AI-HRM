// routes/messageRoutes.js
const express = require('express');
const router = express.Router();
const controller = require('../controllers/messageController');
const { protect, authorize } = require('../utils/authMiddleware');

// ========================================
// 1️⃣ GENERAL ROUTES (FIRST)
// ========================================
router.get('/', protect, controller.getAllMessages);                  
router.get('/stats', protect, authorize(['admin', 'hr']), controller.getMessageStats);
router.get('/users/list', protect, controller.getEmployeeMessageUsers);

// ========================================
// 2️⃣ EMPLOYEE ROUTES (MOVE THESE UP - BEFORE /:id ROUTES!)
// ========================================
router.get('/employee/messages', protect, controller.getEmployeeReceivedMessages);     
router.delete('/employee/message/:id', protect, controller.deleteEmployeeMessage);     
router.get('/employee/users/list', protect, controller.getEmployeeMessageUsers);       
router.post('/employee/send', protect, controller.sendEmployeeMessage);               

// ========================================
// 3️⃣ HR ROUTES
// ========================================
router.post('/send', protect, controller.sendHRMessage);                               
router.post('/send/bulk', protect, controller.sendBulkHRMessages);                     
router.post('/bulk-delete', protect, authorize(['admin', 'hr']), controller.bulkDeleteMessages);

// ========================================
// 4️⃣ SINGLE MESSAGE ROUTES (LAST - THESE CATCH EVERYTHING ELSE!)
// ========================================
router.get('/:id', protect, controller.getMessageById);                // ← MOVED DOWN
router.delete('/:id', protect, authorize(['admin', 'hr']), controller.deleteMessage); // ← MOVED DOWN
router.post('/:id/reply', protect, authorize(['admin', 'hr']), controller.replyToMessage); 

module.exports = router;