// models/Organization.js
//
// Represents a paying company/tenant. One Organization has exactly one
// admin User (the account created at guest checkout) and one Subscription.
// Subscription.owner points here (not directly at User) so plan/employee
// limits are modeled at the company level, matching "50 employees / 100
// employees" style plans rather than per-user billing.

const mongoose = require('mongoose');

const organizationSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Organization name is required'],
      trim: true
    },
    admin: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    planId: { type: String, default: null },
    employeeLimit: { type: Number, default: 0 },
    isActive: { type: Boolean, default: true }
  },
  { timestamps: true }
);

module.exports = mongoose.model('Organization', organizationSchema);