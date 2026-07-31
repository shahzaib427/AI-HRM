// controllers/notificationController.js
const Notification = require('../models/Notification');

class NotificationController {
  // Create a notification (static method for internal use)
  static async createNotification(notificationData, io) {
    try {
      const notification = new Notification(notificationData);
      await notification.save();

      if (io) {
        io.to(`user_${notificationData.recipient.userId}`).emit('new_notification', {
          _id:       notification._id,
          title:     notification.title,
          message:   notification.message,
          type:      notification.type,
          createdAt: notification.createdAt,
          isRead:    notification.isRead,
          priority:  notification.priority,
          data:      notification.data
        });
      }

      return notification;
    } catch (error) {
      console.error('Error creating notification:', error);
      throw error;
    }
  }

  // Get user notifications with pagination
  async getUserNotifications(req, res) {
    try {
      // ✅ FIX: middleware sets id/_id, NOT userId
      const userId = req.user.id || req.user._id;
      const { role } = req.user;
      const { page = 1, limit = 20, unreadOnly = false } = req.query;

      console.log('📋 Fetching notifications for userId:', userId, 'role:', role);

      const query = {
        'recipient.userId': userId,
        'recipient.role':   role
      };

      if (unreadOnly === 'true') {
        query.isRead = false;
      }

      const notifications = await Notification.find(query)
        .sort({ createdAt: -1 })
        .limit(limit * 1)
        .skip((page - 1) * limit);

      const total = await Notification.countDocuments(query);
      const unreadCount = await Notification.countDocuments({ ...query, isRead: false });

      console.log(`📋 Found ${notifications.length} notifications, ${unreadCount} unread`);

      res.json({
        success: true,
        data: notifications,
        pagination: {
          page:  parseInt(page),
          limit: parseInt(limit),
          total,
          pages: Math.ceil(total / limit)
        },
        unreadCount
      });
    } catch (error) {
      console.error('Error getting notifications:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Mark notification as read
  async markAsRead(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id || req.user._id; // ✅ FIX

      const notification = await Notification.findOneAndUpdate(
        { _id: id, 'recipient.userId': userId },
        { isRead: true, readAt: new Date() },
        { new: true }
      );

      if (!notification) {
        return res.status(404).json({ success: false, error: 'Notification not found' });
      }

      res.json({ success: true, data: notification });
    } catch (error) {
      console.error('Error marking notification as read:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Mark all notifications as read
  async markAllAsRead(req, res) {
    try {
      const userId = req.user.id || req.user._id; // ✅ FIX
      const { role } = req.user;

      const result = await Notification.updateMany(
        { 'recipient.userId': userId, 'recipient.role': role, isRead: false },
        { isRead: true, readAt: new Date() }
      );

      res.json({
        success: true,
        message: 'All notifications marked as read',
        count:   result.modifiedCount
      });
    } catch (error) {
      console.error('Error marking all as read:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Delete notification
  async deleteNotification(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id || req.user._id; // ✅ FIX

      const notification = await Notification.findOneAndDelete({
        _id: id,
        'recipient.userId': userId
      });

      if (!notification) {
        return res.status(404).json({ success: false, error: 'Notification not found' });
      }

      res.json({ success: true, message: 'Notification deleted' });
    } catch (error) {
      console.error('Error deleting notification:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Get unread count
  async getUnreadCount(req, res) {
    try {
      const userId = req.user.id || req.user._id; // ✅ FIX
      const { role } = req.user;

      const count = await Notification.countDocuments({
        'recipient.userId': userId,
        'recipient.role':   role,
        isRead: false
      });

      res.json({ success: true, unreadCount: count });
    } catch (error) {
      console.error('Error getting unread count:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }

  // Bulk delete old notifications (admin only)
  async bulkDeleteOldNotifications(req, res) {
    try {
      const { daysOld = 30 } = req.query;
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysOld);

      const result = await Notification.deleteMany({
        createdAt: { $lt: cutoffDate },
        isRead: true
      });

      res.json({
        success:      true,
        message:      `Deleted ${result.deletedCount} old notifications`,
        deletedCount: result.deletedCount
      });
    } catch (error) {
      console.error('Error bulk deleting notifications:', error);
      res.status(500).json({ success: false, error: error.message });
    }
  }
}

module.exports = NotificationController;