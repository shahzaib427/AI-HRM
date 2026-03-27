// models/Message.js - UPDATED VERSION with broadcast support
const mongoose = require('mongoose');

const responseSchema = new mongoose.Schema({
  sender: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    role: { type: String, required: true }
  },
  message: { type: String, required: true },
  attachments: [{
    filename: String,
    originalname: String,
    path: String,
    size: Number,
    mimetype: String
  }],
  respondedAt: { type: Date, default: Date.now }
});

// Broadcast Info sub-schema
const broadcastInfoSchema = new mongoose.Schema({
  type: {
    type: String,
    enum: ['individual', 'multiple', 'department', 'all'],
    default: 'individual'
  },
  count: { type: Number, default: 1 },
  department: { type: String }
});

const messageSchema = new mongoose.Schema({
  // Message Info
  referenceNumber: { 
    type: String, 
    unique: true 
  },
  
  // Sender (Employee)
  sender: {
    id: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    name: { type: String, required: true },
    email: { type: String, required: true },
    employeeId: { type: String, required: true },
    department: String,
    position: String,
    role: String
  },
  
  // Recipient Info
  recipientType: { 
    type: String, 
    enum: ['hr', 'admin', 'employee', 'department', 'all', 'hr-team', 'individual', 'multiple'], // ✅ ADDED 'individual' and 'multiple'
    required: true,
    default: 'hr'
  },
  recipient: { 
    type: String, 
    required: true 
  },
  recipientId: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  recipientEmail: { type: String }, // ✅ ADDED: Store recipient email
  recipientEmployeeId: { type: String }, // ✅ ADDED: Store recipient employee ID
  recipientDepartment: { type: String },
  recipientRole: { type: String },
  
  // Broadcast Information
  isBroadcast: { // ✅ ADDED: Flag for broadcast messages
    type: Boolean,
    default: false
  },
  broadcastInfo: broadcastInfoSchema, // ✅ ADDED: Details about broadcast
  
  // Message Content
  subject: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 200 
  },
  message: { 
    type: String, 
    required: true, 
    trim: true, 
    maxlength: 5000 
  },
  category: { 
    type: String, 
    enum: [
      'general', 'announcement', 'policy', 'training', 'benefits', 
      'compliance', 'appreciation', 'warning', 'survey',
      'leave', 'payroll', 'technical', 'complaint', 'suggestion', 'document', 'other'
    ],
    default: 'general'
  },
  priority: { 
    type: String, 
    enum: ['low', 'normal', 'high', 'urgent'],
    default: 'normal' 
  },
  messageType: {
    type: String,
    enum: ['informational', 'action-required', 'follow-up', 'reminder', 'urgent'],
    default: 'informational'
  },
  
  // Options
  requiresConfirmation: { type: Boolean, default: false },
  confidential: { type: Boolean, default: false },
  sendCopyToAdmin: { type: Boolean, default: false },
  
  // Attachments
  attachments: [{
    filename: String,
    originalname: String,
    path: String,
    size: Number,
    mimetype: String,
    uploadedAt: { type: Date, default: Date.now }
  }],
  
  // Status Tracking
  status: { 
    type: String, 
    enum: ['new','pending', 'sent', 'read', 'archived', 'deleted', 'in-progress', 'awaiting-approval', 'resolved', 'closed', 'escalated'],
    default: 'new'
  },
  
  // Response Chain
  responses: [responseSchema],
  
  // Timestamps
  sentAt: { type: Date, default: Date.now },
  readAt: Date,
  lastUpdated: { type: Date, default: Date.now },
  
  // Metadata
  tags: [String],
  
  // Tracking
  deletedAt: { type: Date } // ✅ ADDED: For soft delete tracking
}, {
  timestamps: true
});

// Pre-save middleware for reference number
messageSchema.pre('save', async function(next) {
  if (this.isNew && !this.referenceNumber) {
    const date = new Date();
    const prefix = 'MSG';
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    
    const count = await this.constructor.countDocuments({
      createdAt: {
        $gte: new Date(date.getFullYear(), date.getMonth(), 1),
        $lt: new Date(date.getFullYear(), date.getMonth() + 1, 1)
      }
    });
    
    this.referenceNumber = `${prefix}-${year}${month}-${(count + 1).toString().padStart(4, '0')}`;
  }
  
  // Set isBroadcast flag based on recipientType
  if (this.isNew) {
    this.isBroadcast = ['multiple', 'department', 'all'].includes(this.recipientType);
    
    // Set broadcastInfo if it's a broadcast
    if (this.isBroadcast && !this.broadcastInfo) {
      this.broadcastInfo = {
        type: this.recipientType,
        count: 1, // Will be updated by controller if needed
        department: this.recipientType === 'department' ? this.recipientDepartment : null
      };
    }
  }
  
  next();
});

// Indexes for better performance
messageSchema.index({ 'sender.id': 1 });
messageSchema.index({ 'recipientId': 1 });
messageSchema.index({ status: 1 });
messageSchema.index({ isBroadcast: 1 });
messageSchema.index({ 'broadcastInfo.type': 1 });
messageSchema.index({ createdAt: -1 });
messageSchema.index({ referenceNumber: 1 }, { unique: true });

// Virtual for formatted date
messageSchema.virtual('formattedDate').get(function() {
  return this.sentAt.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
});

// Virtual for formatted time
messageSchema.virtual('formattedTime').get(function() {
  return this.sentAt.toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });
});

const Message = mongoose.model('Message', messageSchema);
module.exports = Message;