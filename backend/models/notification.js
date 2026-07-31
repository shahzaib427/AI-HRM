// models/Notification.js
const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  recipient: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      required: true,
      refPath: 'recipient.userModel'
    },
    userModel: {
      type: String,
      required: true,
      enum: ['User', 'Employee']
    },
    role: {
      type: String,
      required: true,
      enum: ['admin', 'hr', 'employee']
    }
  },
  sender: {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      refPath: 'sender.userModel'
    },
    userModel: {
      type: String,
      enum: ['User', 'Employee']
    },
    name: String
  },
  type: {
    type: String,
    required: true,
    enum: [
      'leave_request', 'leave_approved', 'leave_rejected',
      'payroll_processed', 'attendance_marked', 'attendance_updated',
      'employee_onboarded', 'employee_deleted', 'employee_updated',
      'contract_signed', 'contract_expiring',
      'system_maintenance', 'announcement', 'task_assigned',
      'performance_review', 'training_assigned', 'document_uploaded',
      'message_received', 'onboarding_completed', 'recruitment_update'
    ]
  },
  title: {
    type: String,
    required: true
  },
  message: {
    type: String,
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  isRead: {
    type: Boolean,
    default: false
  },
  readAt: Date,
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  expiresAt: Date,
  createdAt: {
    type: Date,
    default: Date.now,
    index: { expires: '30d' }
  }
});

// Indexes for faster queries
notificationSchema.index({ 'recipient.userId': 1, isRead: 1 });
notificationSchema.index({ createdAt: -1 });
notificationSchema.index({ 'recipient.role': 1, createdAt: -1 });
notificationSchema.index({ type: 1, createdAt: -1 });

module.exports = mongoose.model('Notification', notificationSchema);