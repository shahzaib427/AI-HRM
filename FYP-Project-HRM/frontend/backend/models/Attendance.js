const mongoose = require('mongoose');

const attendanceSchema = new mongoose.Schema(
  {
    // Main employee reference
    employee: { 
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User', 
      required: true,
      index: true
    },
    
    // Backward compatibility field
    employeeId: {  
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      index: true,
      sparse: true // Allows null values
    },
    
    date: {
      type: Date,
      required: true,
      index: true,
      set: function(date) {
        // Auto-set to start of day
        const d = new Date(date);
        d.setHours(0, 0, 0, 0);
        return d;
      }
    },
    
    // Original check-in/out times (direct entries)
    checkIn: Date,
    checkOut: Date,
    
    // Requested times (by employee)
    requestedCheckIn: Date,
    requestedCheckOut: Date,
    
    // Approved times (by admin)
    approvedCheckIn: Date,
    approvedCheckOut: Date,
    
    // Status management
    status: {
      type: String,
      enum: [
        'pending', 
        'present', 
        'absent', 
        'late', 
        'half-day', 
        'Not Checked In', 
        'checkout_pending',
        'checkin_pending',
        'rejected',
        'approved'
      ],
      default: 'Not Checked In',
      index: true
    },
    
    // Working hours calculation
    totalHours: {
      type: Number,
      default: 0,
      min: 0,
      max: 24
    },
    
    lateMinutes: {
      type: Number,
      default: 0,
      min: 0
    },
    
    // Employee info for quick access (denormalized)
    employeeEmail: {
      type: String,
      index: true
    },
    employeeName: {
      type: String,
      index: true
    },
    employeeDepartment: String,
    
    // Check-in approval workflow
    checkInRequest: {
      requestedAt: Date,
      approved: { 
        type: Boolean, 
        default: false 
      },
      approvedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
      },
      approvedAt: Date,
      actualTime: Date,
      remarks: String,
      ipAddress: String,
      userAgent: String
    },
    
    // Check-out approval workflow
    checkOutRequest: {
      requestedAt: Date,
      approved: { 
        type: Boolean, 
        default: false 
      },
      approvedBy: { 
        type: mongoose.Schema.Types.ObjectId, 
        ref: 'User' 
      },
      approvedAt: Date,
      actualTime: Date,
      remarks: String,
      ipAddress: String,
      userAgent: String
    },
    
    // Additional metadata
    remarks: String,
    lastUpdatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    lastUpdatedAt: Date,
    
    // Location tracking (optional)
    checkInLocation: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    checkOutLocation: {
      latitude: Number,
      longitude: Number,
      address: String
    },
    
    // Request metadata
    requestSource: {
      type: String,
      enum: ['web', 'mobile', 'api', 'admin'],
      default: 'web'
    },
    
    // Auto-calculated fields
    workDuration: {
      type: Number, // in minutes
      default: 0
    },
    
    // Flags
    isAutoCheckedOut: {
      type: Boolean,
      default: false
    },
    isEdited: {
      type: Boolean,
      default: false
    },
    editHistory: [{
      editedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
      editedAt: Date,
      changes: mongoose.Schema.Types.Mixed,
      reason: String
    }]
  },
  { 
    timestamps: true,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  }
);

// ==================== INDEXES ====================
// Unique constraint: One attendance per employee per day
attendanceSchema.index({ employee: 1, date: 1 }, { 
  unique: true, 
  name: "employee_date_unique",
  partialFilterExpression: { employee: { $exists: true } }
});

// Backward compatibility index
attendanceSchema.index({ employeeId: 1, date: 1 }, { 
  unique: true, 
  sparse: true, 
  name: "employeeId_date_unique" 
});

// Performance indexes
attendanceSchema.index({ status: 1, date: -1 });
attendanceSchema.index({ employee: 1, status: 1 });
attendanceSchema.index({ 'checkInRequest.approved': 1 });
attendanceSchema.index({ 'checkOutRequest.approved': 1 });
attendanceSchema.index({ date: -1, employeeName: 1 });
attendanceSchema.index({ employeeDepartment: 1, date: -1 });

// ==================== VIRTUAL FIELDS ====================
attendanceSchema.virtual('actualCheckIn').get(function() {
  return this.approvedCheckIn || this.requestedCheckIn || this.checkIn;
});

attendanceSchema.virtual('actualCheckOut').get(function() {
  return this.approvedCheckOut || this.requestedCheckOut || this.checkOut;
});

attendanceSchema.virtual('isPendingApproval').get(function() {
  return (this.checkInRequest?.approved === false) || 
         (this.checkOutRequest?.approved === false);
});

attendanceSchema.virtual('isFullyApproved').get(function() {
  return this.approvedCheckIn && this.approvedCheckOut;
});

attendanceSchema.virtual('isCheckedIn').get(function() {
  return !!(this.approvedCheckIn || this.checkIn);
});

attendanceSchema.virtual('isCheckedOut').get(function() {
  return !!(this.approvedCheckOut || this.checkOut);
});

attendanceSchema.virtual('isActiveSession').get(function() {
  return this.isCheckedIn && !this.isCheckedOut;
});

// ==================== PRE-SAVE MIDDLEWARE ====================
attendanceSchema.pre('save', function(next) {
  // 1. Sync employee and employeeId fields
  if (this.employee && !this.employeeId) {
    this.employeeId = this.employee;
  }
  if (this.employeeId && !this.employee) {
    this.employee = this.employeeId;
  }
  
  // 2. Ensure date is start of day
  if (this.date && this.date instanceof Date) {
    const dateOnly = new Date(this.date);
    dateOnly.setHours(0, 0, 0, 0);
    this.date = dateOnly;
  }
  
  // 3. Calculate late minutes
  if (this.approvedCheckIn || this.checkIn) {
    const checkInTime = new Date(this.approvedCheckIn || this.checkIn);
    const expectedStart = new Date(this.date);
    expectedStart.setHours(9, 0, 0, 0); // 9 AM
    
    if (checkInTime > expectedStart) {
      this.lateMinutes = Math.round((checkInTime - expectedStart) / (1000 * 60));
      if (this.status === 'Not Checked In' || this.status === 'present') {
        this.status = 'late';
      }
    } else {
      this.lateMinutes = this.lateMinutes || 0;
    }
  }
  
  // 4. Calculate total hours
  if ((this.approvedCheckIn || this.checkIn) && (this.approvedCheckOut || this.checkOut)) {
    const checkIn = new Date(this.approvedCheckIn || this.checkIn);
    const checkOut = new Date(this.approvedCheckOut || this.checkOut);
    const diffMs = checkOut - checkIn;
    
    if (diffMs > 0) {
      this.totalHours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
      this.workDuration = Math.round(diffMs / (1000 * 60)); // in minutes
    }
  }
  
  // 5. Auto-set status based on other fields
  if (!this.status || this.status === 'Not Checked In') {
    if (this.approvedCheckIn && this.approvedCheckOut) {
      this.status = this.lateMinutes > 0 ? 'late' : 'present';
    } else if (this.approvedCheckIn || this.checkIn) {
      this.status = 'present';
    } else if (this.checkInRequest?.approved === false) {
      this.status = 'checkin_pending';
    } else if (this.checkOutRequest?.approved === false) {
      this.status = 'checkout_pending';
    }
  }
  
  // 6. Track edits
// 6. Track edits - FIXED ✅
if (this.isModified() && !this.isNew) {
  this.isEdited = true;
  this.editHistory = this.editHistory || [];
  
  // ✅ SAFE: Just store modified paths (no reduce crash)
  this.editHistory.push({
    editedAt: new Date(),
    changes: this.modifiedPaths(),  // Array of changed fields
    reason: 'System auto-update'
  });
}

  
  // 7. Set last updated timestamp
  if (this.isModified()) {
    this.lastUpdatedAt = new Date();
  }
  
  next();
});

// ==================== POST-SAVE MIDDLEWARE ====================
attendanceSchema.post('save', function(doc, next) {
  // Clean up employeeId if it's null (sparse index allows this)
  if (doc.employeeId === null) {
    mongoose.model('Attendance').updateOne(
      { _id: doc._id },
      { $unset: { employeeId: "" } }
    ).catch(err => console.error('Cleanup error:', err));
  }
  
  console.log(`📊 Attendance saved: ${doc._id} for ${doc.employeeName} on ${doc.date}`);
  next();
});

// ==================== STATIC METHODS ====================
attendanceSchema.statics.findByEmployeeAndDate = function(employeeId, date) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);
  
  const endOfDay = new Date(startOfDay);
  endOfDay.setDate(endOfDay.getDate() + 1);
  
  return this.findOne({
    $or: [
      { employee: employeeId, date: { $gte: startOfDay, $lt: endOfDay } },
      { employeeId: employeeId, date: { $gte: startOfDay, $lt: endOfDay } }
    ]
  });
};

attendanceSchema.statics.fixEmployeeReferences = async function() {
  try {
    // Find records with employeeId but no employee
    const records = await this.find({ 
      employeeId: { $exists: true, $ne: null },
      $or: [
        { employee: { $exists: false } },
        { employee: null }
      ]
    });
    
    console.log(`🔧 Fixing ${records.length} records with missing employee reference`);
    
    for (const record of records) {
      if (record.employeeId) {
        record.employee = record.employeeId;
        await record.save();
      }
    }
    
    // Find records with employee but no employeeId
    const records2 = await this.find({ 
      employee: { $exists: true, $ne: null },
      $or: [
        { employeeId: { $exists: false } },
        { employeeId: null }
      ]
    });
    
    console.log(`🔧 Fixing ${records2.length} records with missing employeeId reference`);
    
    for (const record of records2) {
      if (record.employee) {
        record.employeeId = record.employee;
        await record.save();
      }
    }
    
    console.log('✅ All records fixed successfully');
    return records.length + records2.length;
    
  } catch (error) {
    console.error('❌ Error fixing records:', error);
    throw error;
  }
};

attendanceSchema.statics.findPendingRequests = function(type = 'all') {
  let query = {};
  
  if (type === 'checkin') {
    query = { 'checkInRequest.approved': false };
  } else if (type === 'checkout') {
    query = { 'checkOutRequest.approved': false };
  } else {
    query = {
      $or: [
        { 'checkInRequest.approved': false },
        { 'checkOutRequest.approved': false }
      ]
    };
  }
  
  return this.find(query)
    .populate('employee', 'name email employeeId department profilePicture')
    .populate('checkInRequest.approvedBy checkOutRequest.approvedBy', 'name email')
    .sort({ createdAt: -1 });
};

// ==================== INSTANCE METHODS ====================
attendanceSchema.methods.getTimeStatus = function() {
  const checkInTime = this.actualCheckIn;
  const checkOutTime = this.actualCheckOut;
  
  if (!checkInTime) {
    return { status: 'Not Checked In', color: 'gray' };
  }
  
  const checkInDate = new Date(checkInTime);
  const checkInHour = checkInDate.getHours();
  const checkInMinute = checkInDate.getMinutes();
  const checkInTotalMinutes = checkInHour * 60 + checkInMinute;
  
  const PRESENT_THRESHOLD = 9 * 60; // 9:00 AM
  const LATE_THRESHOLD = 9 * 60 + 30; // 9:30 AM
  
  if (checkOutTime) {
    const checkOutDate = new Date(checkOutTime);
    const checkOutHour = checkOutDate.getHours();
    const checkOutMinute = checkOutDate.getMinutes();
    const checkOutTotalMinutes = checkOutHour * 60 + checkOutMinute;
    
    const ON_TIME_THRESHOLD = 17 * 60; // 5:00 PM
    const EARLY_THRESHOLD = 17 * 60 - 30; // 4:30 PM
    
    // Check-in status
    let checkInStatus = '';
    let checkInColor = '';
    
    if (checkInTotalMinutes < PRESENT_THRESHOLD) {
      checkInStatus = 'Present';
      checkInColor = 'green';
    } else if (checkInTotalMinutes < LATE_THRESHOLD) {
      checkInStatus = 'Late';
      checkInColor = 'orange';
    } else {
      checkInStatus = 'Very Late';
      checkInColor = 'red';
    }
    
    // Check-out status
    let checkOutStatus = '';
    let checkOutColor = '';
    
    if (checkOutTotalMinutes >= ON_TIME_THRESHOLD) {
      checkOutStatus = 'On Time';
      checkOutColor = 'green';
    } else if (checkOutTotalMinutes >= EARLY_THRESHOLD) {
      checkOutStatus = 'Early Leave';
      checkOutColor = 'yellow';
    } else {
      checkOutStatus = 'Very Early';
      checkOutColor = 'red';
    }
    
    return {
      checkIn: { status: checkInStatus, color: checkInColor },
      checkOut: { status: checkOutStatus, color: checkOutColor },
      overall: checkInStatus === 'Present' && checkOutStatus === 'On Time' ? 'Perfect' : 'Needs Review'
    };
  } else {
    // Only check-in
    if (checkInTotalMinutes < PRESENT_THRESHOLD) {
      return { status: 'Present', color: 'green' };
    } else if (checkInTotalMinutes < LATE_THRESHOLD) {
      return { status: 'Late', color: 'orange' };
    } else {
      return { status: 'Very Late', color: 'red' };
    }
  }
};

attendanceSchema.methods.calculateHours = function() {
  if (this.actualCheckIn && this.actualCheckOut) {
    const checkIn = new Date(this.actualCheckIn);
    const checkOut = new Date(this.actualCheckOut);
    const diffMs = checkOut - checkIn;
    
    if (diffMs > 0) {
      const hours = diffMs / (1000 * 60 * 60);
      const rounded = Math.round(hours * 100) / 100;
      
      this.totalHours = rounded;
      this.workDuration = Math.round(diffMs / (1000 * 60));
      
      return rounded;
    }
  }
  return 0;
};

attendanceSchema.methods.isToday = function() {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const recordDate = new Date(this.date);
  recordDate.setHours(0, 0, 0, 0);
  
  return today.getTime() === recordDate.getTime();
};

// ==================== QUERY HELPERS ====================
attendanceSchema.query.byDateRange = function(startDate, endDate) {
  const query = {};
  
  if (startDate) {
    const start = new Date(startDate);
    start.setHours(0, 0, 0, 0);
    query.date = { ...query.date, $gte: start };
  }
  
  if (endDate) {
    const end = new Date(endDate);
    end.setHours(23, 59, 59, 999);
    query.date = { ...query.date, $lte: end };
  }
  
  return this.find(query);
};

attendanceSchema.query.byEmployee = function(employeeId) {
  return this.find({
    $or: [
      { employee: employeeId },
      { employeeId: employeeId }
    ]
  });
};

attendanceSchema.query.byStatus = function(status) {
  return this.find({ status: status });
};

module.exports = mongoose.model('Attendance', attendanceSchema);