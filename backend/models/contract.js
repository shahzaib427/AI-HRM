const mongoose = require('mongoose');

const contractSchema = new mongoose.Schema({
  contractNumber: { type: String, required: true, unique: true },
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'Employee', required: true },
  employeeName: { type: String, required: true },
  position: { type: String, required: true },
  department: { type: String, required: true },
  contractType: { 
    type: String, 
    enum: ['permanent', 'contractual', 'probationary', 'internship', 'consultant'],
    required: true 
  },
  startDate: { type: Date, required: true },
  endDate: { type: Date },
  probationPeriod: { type: Number, default: 3 }, // in months
  salary: { type: Number, required: true },
  currency: { type: String, default: 'PKR' },
  benefits: [{
    name: String,
    amount: Number,
    description: String
  }],
  workingHours: {
    start: { type: String, default: '09:00' },
    end: { type: String, default: '18:00' },
    daysPerWeek: { type: Number, default: 5 }
  },
  leavePolicy: {
    annualLeave: { type: Number, default: 20 },
    sickLeave: { type: Number, default: 12 },
    casualLeave: { type: Number, default: 10 }
  },
  noticePeriod: { type: Number, default: 30 }, // in days
  status: {
    type: String,
    enum: ['draft', 'pending', 'active', 'expired', 'terminated', 'renewed'],
    default: 'draft'
  },
  signedByEmployee: { type: Boolean, default: false },
  signedByEmployer: { type: Boolean, default: false },
  signedDate: Date,
  documentUrl: String,
  terms: String,
  specialConditions: String,
  attachments: [{
    name: String,
    url: String,
    uploadedAt: Date
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Contract', contractSchema);