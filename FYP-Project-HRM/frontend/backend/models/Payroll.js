const mongoose = require('mongoose');

const payrollSchema = new mongoose.Schema({
  // ✅ Reference to User model (employees)
  employeeId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  
  // ✅ Employee identification (for quick access without population)
  employeeIdCode: { type: String, default: '' },
  
  // Period
  month: { type: String, required: true },
  year: { type: Number, required: true },
  
  // Earnings
  basicSalary: { type: Number, default: 0 },
  hra: { type: Number, default: 0 },
  da: { type: Number, default: 0 },
  conveyance: { type: Number, default: 0 },
  medicalAllowance: { type: Number, default: 0 },
  specialAllowance: { type: Number, default: 0 },
  overtimeHours: { type: Number, default: 0 },
  totalHoursWorked: { type: Number, default: 0 },
  grossSalary: { type: Number, default: 0 },
  
  // Deductions
  tds: { type: Number, default: 0 },
  pf: { type: Number, default: 0 },
  professionalTax: { type: Number, default: 0 },
  totalDeductions: { type: Number, default: 0 },
  
  // Net Pay
  netSalary: { type: Number, default: 0 },
  
  // Attendance
  attendanceDays: { type: Number, default: 0 },
  workingDays: { type: Number, default: 22 },
  halfDays: { type: Number, default: 0 },
  presentDays: { type: Number, default: 0 },
  leaves: { type: Number, default: 0 },
  
  // Status
  status: { 
    type: String, 
    enum: ['Draft', 'Generated', 'Approved', 'Processed', 'Cancelled'], 
    default: 'Generated' 
  },
  
  paymentStatus: { 
    type: String, 
    enum: ['Pending', 'Partially Paid', 'Paid', 'Failed'], 
    default: 'Pending' 
  },
  
  paymentMethod: { 
    type: String, 
    enum: ['Bank Transfer', 'Cash', 'Cheque', 'Online Payment'], 
    default: 'Bank Transfer' 
  },
  
  paymentDate: { type: Date },
  transactionId: { type: String, default: '' },
  paidAt: { type: Date },
  
  // Bank Details (for payment processing)
  bankDetails: {
    bankName: { type: String, default: '' },
    accountNumber: { type: String, default: '' },
    ifscCode: { type: String, default: '' },
    accountHolderName: { type: String, default: '' }
  },
  
  paymentNotes: { type: String, default: '' },
  
  // Metadata
  notes: { type: String, default: '' },
  
  // Tracking
  generatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isManuallyCreated: { type: Boolean, default: false },
  isManuallyAdjusted: { type: Boolean, default: false },
  adjustedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  adjustedAt: { type: Date },
  isBulkGenerated: { type: Boolean, default: false }

}, { timestamps: true });

// Add indexes for better query performance
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ paymentStatus: 1 });
payrollSchema.index({ year: -1, month: -1 });

module.exports = mongoose.model('Payroll', payrollSchema);