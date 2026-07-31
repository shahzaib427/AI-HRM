const mongoose = require('mongoose');

const LeaveSchema = new mongoose.Schema({
  employee: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User', 
    required: true 
  },
  // NEW: Simplified to only 2 leave types for monthly system
  type: { 
    type: String, 
    enum: ['monthly', 'emergency'],  // Changed from multiple types
    required: true 
  },
  startDate: { 
    type: Date, 
    required: true 
  },
  endDate: { 
    type: Date, 
    required: true 
  },
  days: { 
    type: Number, 
    required: true,
    min: 0.5
  },
  // NEW: Track leave count (each leave counts as 1)
  leaveCount: {
    type: Number,
    default: 1,
    min: 1,
    max: 2  // Max 2 leaves per month
  },
  reason: { 
    type: String, 
    required: true,
    trim: true 
  },
  contactNumber: { 
    type: String 
  },
  status: { 
    type: String, 
    enum: ['pending', 'approved', 'rejected', 'cancelled'],
    default: 'pending'
  },
  approvedBy: { 
    type: mongoose.Schema.Types.ObjectId, 
    ref: 'User' 
  },
  rejectionReason: { 
    type: String 
  },
  approvedAt: { 
    type: Date 
  },
  appliedAt: { 
    type: Date, 
    default: Date.now 
  },
  // NEW: Track which month this leave belongs to
  monthYear: {
    type: String,
    default: function() {
      const date = new Date(this.startDate || Date.now());
      return `${date.getMonth() + 1}-${date.getFullYear()}`;
    }
  },
  attachments: [{ 
    url: String,
    fileName: String
  }]
}, { 
  timestamps: true 
});

// Index for efficient queries
LeaveSchema.index({ employee: 1, startDate: -1 });
LeaveSchema.index({ status: 1, startDate: -1 });
LeaveSchema.index({ employee: 1, monthYear: 1 });  // NEW: For monthly tracking

// NEW: Method to get monthly usage
LeaveSchema.statics.getMonthlyUsage = async function(employeeId, month, year) {
  const monthYear = `${month}-${year}`;
  return this.aggregate([
    {
      $match: {
        employee: mongoose.Types.ObjectId(employeeId),
        monthYear: monthYear,
        status: 'approved'
      }
    },
    {
      $group: {
        _id: '$employee',
        totalLeavesUsed: { $sum: '$leaveCount' },
        totalDaysUsed: { $sum: '$days' }
      }
    }
  ]);
};

module.exports = mongoose.model('Leave', LeaveSchema);