const mongoose = require('mongoose');

const correctionRequestSchema = new mongoose.Schema({
  issue:       { type: String, default: 'Salary Discrepancy' },
  details:     { type: String, default: '' },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  requestedAt: { type: Date, default: Date.now },
  status:      { type: String, enum: ['Pending', 'Resolved', 'Rejected'], default: 'Pending' }
}, { _id: false });

const payrollSchema = new mongoose.Schema({
  employeeId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  month: { type: String, required: true },
  year:  { type: Number, required: true },

  // ─── Salary fields ───
  salary:           { type: Number, default: 0 },
  fuelAllowance:    { type: Number, default: 0 },
  medicalAllowance: { type: Number, default: 0 },
  specialAllowance: { type: Number, default: 0 },
  otherAllowance:   { type: Number, default: 0 },

  // ─── Employee snapshot (stored at generation time) ───
  employeeName:       { type: String, default: '' },
  employeeCode:       { type: String, default: '' },
  employeeDepartment: { type: String, default: '' },
  employeePosition:   { type: String, default: '' },
  employeeEmail:      { type: String, default: '' },
  employeePhone:      { type: String, default: '' },
  employeeAddress:    { type: String, default: '' },
  employeeImage:      { type: String, default: '' },

  // ─── Bank Details ───
  bankName:          { type: String, default: '' },
  bankAccountNumber: { type: String, default: '' },
  bankAccountTitle:  { type: String, default: '' },

  // ─── Payment ───
  paymentStatus: {
    type: String,
    enum: ['Pending', 'Paid', 'Failed'],
    default: 'Pending'
  },
  paymentMethod: {
    type: String,
    enum: ['Bank Transfer', 'Cash', 'Cheque'],
    default: 'Bank Transfer'
  },
  paymentDate:   { type: Date },
  transactionId: { type: String },
  paidAt:        { type: Date },

  // ─── Email tracking ───
  emailSent:        { type: Boolean, default: false },
  emailSentAt:      { type: Date,    default: null },
  emailResendCount: { type: Number,  default: 0 },

  // ─── Correction requests (employee-initiated) ───
  correctionRequests: { type: [correctionRequestSchema], default: [] },

  // ─── Meta ───
  notes:             { type: String },
  generatedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  processedBy:       { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  isManuallyCreated: { type: Boolean, default: false }
}, {
  timestamps: true
});

// ─── Virtual: total salary ───
payrollSchema.virtual('totalSalary').get(function () {
  return (
    (this.salary || 0) +
    (this.fuelAllowance || 0) +
    (this.medicalAllowance || 0) +
    (this.specialAllowance || 0) +
    (this.otherAllowance || 0)
  );
});

// ─── Indexes ───
// Unique: one payroll per employee per month/year
payrollSchema.index({ employeeId: 1, month: 1, year: 1 }, { unique: true });
payrollSchema.index({ employeeEmail: 1 });
payrollSchema.index({ paymentStatus: 1 });
payrollSchema.index({ year: -1, createdAt: -1 });

module.exports = mongoose.model('Payroll', payrollSchema);