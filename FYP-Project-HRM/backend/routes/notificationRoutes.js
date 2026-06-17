// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const NotificationController = require('../controllers/notificationController');
const { protect } = require('../utils/authMiddleware');

const notificationController = new NotificationController();

// All routes require authentication
router.use(protect);

// Get user notifications
router.get('/', (req, res) => notificationController.getUserNotifications(req, res));

// Get unread count
router.get('/unread-count', (req, res) => notificationController.getUnreadCount(req, res));

// Mark all as read
router.put('/mark-all-read', (req, res) => notificationController.markAllAsRead(req, res));

// Mark single notification as read
router.put('/:id/read', (req, res) => notificationController.markAsRead(req, res));

// Delete notification
router.delete('/:id', (req, res) => notificationController.deleteNotification(req, res));

// Admin only: Bulk delete old notifications
router.delete('/admin/bulk-delete', protect, (req, res) => {
  if (req.user.role !== 'admin') {
    return res.status(403).json({ success: false, error: 'Admin access required' });
  }
  notificationController.bulkDeleteOldNotifications(req, res);
});

module.exports = router;