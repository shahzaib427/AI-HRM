const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Report name is required'],
    trim: true
  },
  type: {
    type: String,
    enum: ['Payroll', 'Attendance', 'Leaves', 'Recruitment', 'Performance', 'Training', 'Finance', 'System'],
    required: true
  },
  dateRange: {
    start: { type: Date, required: true },
    end: { type: Date, required: true }
  },
  format: {
    type: String,
    enum: ['PDF', 'Excel', 'CSV'],
    default: 'PDF'
  },
  fileSize: {
    type: String,
    default: '0 KB'
  },
  status: {
    type: String,
    enum: ['Generated', 'Scheduled', 'Automated', 'Failed'],
    default: 'Generated'
  },
  visibility: {
    type: String,
    enum: ['private', 'shared'],
    default: 'private'
  },
  generatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  generatedByRole: {
    type: String,
    enum: ['admin', 'hr'],
    required: true
  },
  data: {
    type: mongoose.Schema.Types.Mixed,
    default: {}
  },
  downloadCount: {
    type: Number,
    default: 0
  },
  viewCount: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

module.exports = mongoose.model('Report', reportSchema);