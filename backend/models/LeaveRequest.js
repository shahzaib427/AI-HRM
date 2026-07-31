const mongoose = require('mongoose');

const leaveRequestSchema = new mongoose.Schema({
  employee: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee' },
  startDate: Date,
  endDate: Date,
  reason: String,
  status: { type: String, enum: ['Pending','Approved','Rejected'], default: 'Pending' }
}, { timestamps: true });

module.exports = mongoose.model('LeaveRequest', leaveRequestSchema);
