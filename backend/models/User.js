const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const crypto = require('crypto');

const userSchema = new mongoose.Schema({
  // System Information
  employeeId: { 
    type: String, 
    unique: true,
    default: function() {
      const timestamp = Date.now().toString().slice(-6);
      const random = Math.floor(Math.random() * 900 + 100);
      return `EMP${timestamp}${random}`;
    }
  },
  name: { 
    type: String, 
    required: [true, 'Name is required'], 
    trim: true 
  },
  fatherName: {
    type: String,
    default: '',
    trim: true
  },
  username: { 
    type: String, 
    unique: true,
    sparse: true,
    trim: true, 
    lowercase: true 
  },
  email: { 
    type: String, 
    required: [true, 'Email is required'], 
    unique: true, 
    trim: true, 
    lowercase: true,
    match: [/^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email']
  },
  password: { 
    type: String, 
    required: [true, 'Password is required'],
    minlength: [6, 'Password must be at least 6 characters'],
    select: false 
  },
  role: { 
    type: String, 
    enum: ['admin', 'hr', 'employee', 'manager', 'team-lead'],
    default: 'employee' 
  },
  isActive: { 
    type: Boolean, 
    default: true 
  },
  
  // Personal Information
  gender: {
    type: String,
    enum: ['male', 'female', 'other', 'prefer-not-to-say'],
    default: 'male'
  },
  dateOfBirth: Date,
  bloodGroup: {
    type: String,
    enum: ['', 'A+', 'A-', 'B+', 'B-', 'O+', 'O-', 'AB+', 'AB-'],
    default: ''
  },
  maritalStatus: {
    type: String,
    enum: ['single', 'married', 'divorced', 'widowed', 'separated'],
    default: 'single'
  },
  idCardNumber: {
    type: String,
    default: '',
    trim: true
  },
  idCardIssueDate: Date,
  idCardExpiryDate: Date,
  
  // Employment Information
  employeeType: {
    type: String,
    enum: ['permanent', 'contract', 'intern', 'probation', 'consultant', 'visitor', 'part-time', 'freelance', 'other'],
    default: 'permanent'
  },
  customEmployeeType: {
    type: String,
    default: ''
  },
  employmentStatus: {
    type: String,
    enum: ['active', 'on-leave', 'suspended', 'terminated', 'resigned'],
    default: 'active'
  },
  department: { 
    type: String, 
    default: 'General' 
  },
  customDepartment: {
    type: String,
    default: ''
  },
  position: { 
    type: String, 
    default: 'Employee' 
  },
  customPosition: {
    type: String,
    default: ''
  },
  joiningDate: { 
    type: Date, 
    default: Date.now 
  },
  probationPeriod: {
    type: String,
    enum: ['1', '2', '3', '6', '12', 'none', 'other'],
    default: '3'
  },
  customProbationPeriod: {
    type: String,
    default: ''
  },
  reportingManager: {
    type: String,
    default: ''
  },
  
  // Contact Information
  phone: { 
    type: String,
    validate: {
      validator: function(v) {
        if (!v) return true;
        const digits = v.replace(/\D/g, '');
        return digits.length >= 10 && digits.length <= 15;
      },
      message: 'Phone number must be 10-15 digits'
    }
  },
  alternatePhone: {
    type: String,
    default: ''
  },
  
  // Address Information - Separate fields as in frontend
  presentAddress: {
    type: String,
    default: ''
  },
  permanentAddress: {
    type: String,
    default: ''
  },
  city: {
    type: String,
    default: ''
  },
  state: {
    type: String,
    default: ''
  },
  country: {
    type: String,
    default: 'Pakistan'
  },
  postalCode: {
    type: String,
    default: ''
  },
  
  // Emergency Contacts - Array as in frontend
  emergencyContacts: [{
    name: { type: String, required: true },
    phone: { type: String, required: true },
    relation: { 
      type: String,
      enum: ['parent', 'spouse', 'sibling', 'child', 'friend', 'relative', 'colleague', 'other'],
      default: 'parent'
    }
  }],
  
  // Salary Information
  salary: { 
    type: Number, 
    default: 0,
    min: [0, 'Salary cannot be negative']
  },
  fuelAllowance: {
    type: Number,
    default: 0,
    min: 0
  },
  medicalAllowance: {
    type: Number,
    default: 0,
    min: 0
  },
  specialAllowance: {
    type: Number,
    default: 0,
    min: 0
  },
  otherAllowance: {
    type: Number,
    default: 0,
    min: 0
  },
  currency: {
    type: String,
    default: 'PKR',
    enum: ['PKR', 'USD', 'EUR', 'GBP', 'INR', 'AED', 'SAR'],
    trim: true
  },
  salaryFrequency: {
    type: String,
    default: 'monthly',
    enum: ['hourly', 'daily', 'weekly', 'bi-weekly', 'monthly', 'annually'],
    trim: true
  },
  
  // Bank Information
  bankName: {
    type: String,
    default: ''
  },
  bankAccountNumber: {
    type: String,
    default: ''
  },
  bankAccountTitle: {
    type: String,
    default: ''
  },
  bankBranchCode: {
    type: String,
    default: ''
  },
  ibanNumber: {
    type: String,
    default: ''
  },
  
  // Qualifications & Skills
  qualifications: {
    type: String,
    default: ''
  },
  experiences: [{
    company: String,
    position: String,
    duration: String,
    description: String
  }],
  skills: [{
    name: { type: String, required: true },
    level: {
      type: String,
      enum: ['beginner', 'intermediate', 'advanced', 'expert'],
      default: 'intermediate'
    }
  }],
  previousExperience: {
    type: Number,
    default: 0,
    min: 0
  },
  
  // Profile Information
  profilePicture: {
    type: String,
    default: ''
  },
  
  // System Information
  hasSystemAccess: {
    type: Boolean,
    default: true
  },
  
  // Custom roles
  customSystemRole: {
    type: String,
    default: ''
  },
  
  // Password Management
  passwordChanged: { 
    type: Boolean, 
    default: false 
  },
  lastPasswordChange: { 
    type: Date, 
    default: null 
  },
  passwordExpiryDate: {
    type: Date,
    default: function() {
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 90);
      return expiry;
    }
  },
  passwordHistory: [{
    password: { type: String, required: true },
    changedAt: { type: Date, default: Date.now }
  }],
  temporaryPassword: {
    type: Boolean,
    default: true
  },
  
  // Leave Balance
  leaveBalance: {
    annual: { type: Number, default: 12 },
    casual: { type: Number, default: 7 },
    sick: { type: Number, default: 10 },
    earned: { type: Number, default: 5 },
    maternity: { type: Number, default: 180 },
    paternity: { type: Number, default: 15 }
  },

  // FIXED: Proper Map initialization with default function
  monthlyLeaveTracker: {
    type: Map,
    of: {
      leavesUsed: { type: Number, default: 0 },
      leavesAvailable: { type: Number, default: 2 },
      lastReset: { type: Date, default: Date.now }
    },
    default: () => {
      const now = new Date();
      const monthYear = `${now.getMonth() + 1}-${now.getFullYear()}`;
      const map = new Map();
      map.set(monthYear, {
        leavesUsed: 0,
        leavesAvailable: 2,
        lastReset: now
      });
      return map;
    }
  },
  
  // Login Tracking
  lastLogin: Date,
  loginAttempts: {
    type: Number,
    default: 0
  },
  lockUntil: {
    type: Date,
    default: null
  },

  // Password Reset
  passwordResetToken: {
    type: String,
    default: null
  },
  passwordResetTokenExpires: {
    type: Date,
    default: null
  },
  passwordResetTokenUsed: {
    type: Boolean,
    default: false
  },
  
  // Email notification tracking
  welcomeEmailSent: {
    type: Boolean,
    default: false
  },
  welcomeEmailSentAt: {
    type: Date,
    default: null
  },
  emailNotificationPreferences: {
    type: Map,
    of: Boolean,
    default: () => new Map([
      ['passwordReset', true],
      ['accountUpdates', true],
      ['securityAlerts', true]
    ])
  }
}, { 
  timestamps: true,
  toJSON: { virtuals: true },
  toObject: { virtuals: true }
});

// ===== VIRTUAL FIELDS =====
userSchema.virtual('fullName').get(function() {
  return this.name;
});

userSchema.virtual('accountAgeDays').get(function() {
  const now = new Date();
  const created = new Date(this.createdAt);
  const diffTime = Math.abs(now - created);
  return Math.floor(diffTime / (1000 * 60 * 60 * 24));
});

userSchema.virtual('isPasswordExpired').get(function() {
  if (!this.passwordExpiryDate) return false;
  return new Date() > this.passwordExpiryDate;
});

userSchema.virtual('isLocked').get(function() {
  return this.lockUntil && this.lockUntil > new Date();
});

userSchema.virtual('totalSalary').get(function() {
  const total = (this.salary || 0) + 
                (this.fuelAllowance || 0) + 
                (this.medicalAllowance || 0) + 
                (this.specialAllowance || 0) + 
                (this.otherAllowance || 0);
  return total;
});

userSchema.virtual('formattedSalary').get(function() {
  if (!this.totalSalary || this.totalSalary <= 0) return 'Not Set';
  
  const currencySymbols = {
    'PKR': '₨',
    'USD': '$',
    'EUR': '€',
    'GBP': '£',
    'INR': '₹',
    'AED': 'د.إ',
    'SAR': 'ر.س'
  };
  
  const symbol = currencySymbols[this.currency] || this.currency;
  const formattedAmount = this.totalSalary.toLocaleString();
  
  return `${symbol}${formattedAmount} per ${this.salaryFrequency}`;
});

userSchema.virtual('age').get(function() {
  if (!this.dateOfBirth) return null;
  const today = new Date();
  const birthDate = new Date(this.dateOfBirth);
  let age = today.getFullYear() - birthDate.getFullYear();
  const monthDiff = today.getMonth() - birthDate.getMonth();
  
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
    age--;
  }
  
  return age;
});

userSchema.virtual('serviceDuration').get(function() {
  if (!this.joiningDate) return 'Not Available';
  
  const today = new Date();
  const joinDate = new Date(this.joiningDate);
  const years = today.getFullYear() - joinDate.getFullYear();
  const months = today.getMonth() - joinDate.getMonth();
  
  let duration = '';
  if (years > 0) {
    duration += `${years} year${years > 1 ? 's' : ''}`;
  }
  if (months > 0) {
    if (duration) duration += ', ';
    duration += `${months} month${months > 1 ? 's' : ''}`;
  }
  
  return duration || 'Less than a month';
});

userSchema.virtual('probationStatus').get(function() {
  if (!this.joiningDate || this.probationPeriod === 'none') return 'N/A';
  
  const today = new Date();
  const joinDate = new Date(this.joiningDate);
  const probationMonths = parseInt(this.probationPeriod) || 3;
  const probationEndDate = new Date(joinDate);
  probationEndDate.setMonth(probationEndDate.getMonth() + probationMonths);
  
  if (today > probationEndDate) {
    return 'Completed';
  } else {
    const daysLeft = Math.ceil((probationEndDate - today) / (1000 * 60 * 60 * 24));
    return `${daysLeft} days remaining`;
  }
});

// ===== MIDDLEWARE =====
userSchema.pre('save', async function(next) {
  console.log('🔄 User pre-save hook triggered for:', this.email);
  console.log('Modified paths:', this.modifiedPaths());
  
  // Set username from email if not provided
  if (!this.username && this.email) {
    this.username = this.email.split('@')[0].toLowerCase();
    console.log('👤 Auto-generated username:', this.username);
  }
  
  // Ensure monthlyLeaveTracker is properly initialized
  if (!this.monthlyLeaveTracker || !(this.monthlyLeaveTracker instanceof Map)) {
    console.log('📊 Initializing monthlyLeaveTracker as Map');
    const now = new Date();
    const monthYear = `${now.getMonth() + 1}-${now.getFullYear()}`;
    this.monthlyLeaveTracker = new Map();
    this.monthlyLeaveTracker.set(monthYear, {
      leavesUsed: 0,
      leavesAvailable: 2,
      lastReset: now
    });
  }
  
  // Only hash password if it's modified
  if (this.isModified('password')) {
    console.log('🔑 Password is being modified');
    try {
      // Store current password before hashing
      const currentPassword = this.password;
      
      // Hash the password
      const salt = await bcrypt.genSalt(10);
      this.password = await bcrypt.hash(currentPassword, salt);
      
      // Initialize password history if not exists
      if (!this.passwordHistory) {
        this.passwordHistory = [];
      }
      
      // Keep only last 5 passwords
      if (this.passwordHistory.length >= 5) {
        this.passwordHistory.shift();
      }
      
      // Add hashed password to history
      this.passwordHistory.push({
        password: this.password,
        changedAt: new Date()
      });
      
      this.passwordChanged = true;
      this.lastPasswordChange = new Date();
      this.temporaryPassword = false;
      
      // Set password expiry (90 days from now)
      const expiry = new Date();
      expiry.setDate(expiry.getDate() + 90);
      this.passwordExpiryDate = expiry;
      
      console.log('✅ Password hashed and history updated');
      
    } catch (error) {
      console.error('❌ Password hashing error:', error);
      return next(error);
    }
  }
  
  // Ensure leaveBalance is always an object with all required fields
  if (!this.leaveBalance || typeof this.leaveBalance !== 'object') {
    this.leaveBalance = {};
  }
  
  // Set default leave balances if not present
  const defaultBalances = {
    annual: 12,
    casual: 7,
    sick: 10,
    earned: 5,
    maternity: 180,
    paternity: 15
  };
  
  Object.keys(defaultBalances).forEach(type => {
    if (this.leaveBalance[type] === undefined || this.leaveBalance[type] === null) {
      this.leaveBalance[type] = defaultBalances[type];
    }
  });
  
  next();
});

// FIXED: Instance method to get current month tracker
userSchema.methods.getCurrentMonthTracker = function() {
  // Ensure monthlyLeaveTracker exists and is a Map
  if (!this.monthlyLeaveTracker || !(this.monthlyLeaveTracker instanceof Map)) {
    const now = new Date();
    const monthYear = `${now.getMonth() + 1}-${now.getFullYear()}`;
    this.monthlyLeaveTracker = new Map();
    this.monthlyLeaveTracker.set(monthYear, {
      leavesUsed: 0,
      leavesAvailable: 2,
      lastReset: now
    });
  }
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthYear = `${currentMonth}-${currentYear}`;
  
  let tracker = this.monthlyLeaveTracker.get(monthYear);
  
  // Initialize if doesn't exist
  if (!tracker) {
    // Check if we need to reset from previous month
    const previousMonth = currentMonth === 1 ? 12 : currentMonth - 1;
    const previousYear = currentMonth === 1 ? currentYear - 1 : currentYear;
    const prevMonthYear = `${previousMonth}-${previousYear}`;
    
    const prevTracker = this.monthlyLeaveTracker.get(prevMonthYear);
    const availableLeaves = prevTracker ? 
      Math.min(2, prevTracker.leavesAvailable + (2 - prevTracker.leavesUsed)) : 2;
    
    tracker = {
      leavesUsed: 0,
      leavesAvailable: availableLeaves,
      lastReset: now
    };
    
    this.monthlyLeaveTracker.set(monthYear, tracker);
  }
  
  // Auto-reset if new month (checking month difference)
  const trackerMonth = tracker.lastReset.getMonth();
  const currentTrackerMonth = now.getMonth();
  
  if (trackerMonth !== currentTrackerMonth) {
    tracker.leavesUsed = 0;
    tracker.leavesAvailable = 2;
    tracker.lastReset = now;
    this.monthlyLeaveTracker.set(monthYear, tracker);
  }
  
  return tracker;
};

userSchema.methods.useLeave = function(count = 1) {
  const tracker = this.getCurrentMonthTracker();
  
  if (tracker.leavesAvailable < count) {
    throw new Error(`Insufficient monthly leaves. Available: ${tracker.leavesAvailable}, Requested: ${count}`);
  }
  
  tracker.leavesAvailable -= count;
  tracker.leavesUsed += count;
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthYear = `${currentMonth}-${currentYear}`;
  this.monthlyLeaveTracker.set(monthYear, tracker);
  
  return tracker;
};

userSchema.methods.refundLeave = function(count = 1) {
  const tracker = this.getCurrentMonthTracker();
  
  tracker.leavesAvailable = Math.min(2, tracker.leavesAvailable + count);
  tracker.leavesUsed = Math.max(0, tracker.leavesUsed - count);
  
  const now = new Date();
  const currentMonth = now.getMonth() + 1;
  const currentYear = now.getFullYear();
  const monthYear = `${currentMonth}-${currentYear}`;
  this.monthlyLeaveTracker.set(monthYear, tracker);
  
  return tracker;
};

userSchema.methods.getMonthlyLeaveStats = function(month = null, year = null) {
  const now = new Date();
  const targetMonth = month || now.getMonth() + 1;
  const targetYear = year || now.getFullYear();
  const monthYear = `${targetMonth}-${targetYear}`;
  
  // Ensure monthlyLeaveTracker exists and is a Map
  if (!this.monthlyLeaveTracker || !(this.monthlyLeaveTracker instanceof Map)) {
    this.monthlyLeaveTracker = new Map();
  }
  
  const tracker = this.monthlyLeaveTracker.get(monthYear) || {
    leavesUsed: 0,
    leavesAvailable: 2,
    lastReset: new Date(targetYear, targetMonth - 1, 1)
  };
  
  return {
    month: targetMonth,
    year: targetYear,
    monthName: new Date(targetYear, targetMonth - 1, 1).toLocaleString('default', { month: 'long' }),
    ...tracker,
    totalLeaves: 2
  };
};

userSchema.methods.getLeaveHistory = function() {
  // Ensure monthlyLeaveTracker exists and is a Map
  if (!this.monthlyLeaveTracker || !(this.monthlyLeaveTracker instanceof Map)) {
    return [];
  }
  
  const entries = Array.from(this.monthlyLeaveTracker.entries());
  const history = entries.map(([monthYear, tracker]) => {
    const [month, year] = monthYear.split('-').map(Number);
    return {
      month,
      year,
      monthName: new Date(year, month - 1, 1).toLocaleString('default', { month: 'long' }),
      ...tracker
    };
  });
  
  // Sort by year and month descending
  return history.sort((a, b) => {
    if (a.year !== b.year) return b.year - a.year;
    return b.month - a.month;
  });
};

// VIRTUAL FIELDS for monthly leave tracking
userSchema.virtual('currentMonthlyBalance').get(function() {
  const tracker = this.getCurrentMonthTracker();
  return tracker.leavesAvailable;
});

userSchema.virtual('currentMonthUsage').get(function() {
  const tracker = this.getCurrentMonthTracker();
  return tracker.leavesUsed;
});

userSchema.virtual('monthlyLeaveStatus').get(function() {
  const tracker = this.getCurrentMonthTracker();
  const percentage = (tracker.leavesUsed / 2) * 100;
  
  if (tracker.leavesAvailable === 0) {
    return { status: 'exhausted', message: 'All leaves used this month' };
  } else if (tracker.leavesAvailable === 1) {
    return { status: 'warning', message: '1 leave remaining' };
  } else {
    return { status: 'good', message: `${tracker.leavesAvailable} leaves available` };
  }
});

// Post-save hook for debugging
userSchema.post('save', function(error, doc, next) {
  if (error) {
    console.error('❌ Post-save error:', error.message);
    console.error('❌ Error name:', error.name);
    console.error('❌ Error code:', error.code);
    
    // Handle specific error types
    if (error.name === 'ValidationError') {
      console.error('❌ Validation errors:');
      for (let field in error.errors) {
        console.error(`   - ${field}: ${error.errors[field].message}`);
      }
    }
  } else {
    console.log('✅ User saved successfully:', doc._id);
  }
  next();
});

// ===== INSTANCE METHODS =====
userSchema.methods.matchPassword = async function(enteredPassword) {
  try {
    if (this.isLocked) {
      console.log('🔒 Account is locked');
      return false;
    }
    
    const isMatch = await bcrypt.compare(enteredPassword, this.password);
    
    if (!isMatch) {
      this.loginAttempts += 1;
      console.log(`❌ Login failed. Attempt ${this.loginAttempts}`);
      
      if (this.loginAttempts >= 5) {
        this.lockUntil = new Date(Date.now() + 30 * 60 * 1000);
        console.log('🔒 Account locked for 30 minutes');
      }
      
      await this.save();
    } else {
      this.loginAttempts = 0;
      this.lockUntil = null;
      this.lastLogin = new Date();
      await this.save();
      console.log('✅ Login successful');
    }
    
    return isMatch;
  } catch (error) {
    console.error('❌ Password match error:', error);
    return false;
  }
};

userSchema.methods.changedPasswordAfter = function(JWTTimestamp) {
  if (this.lastPasswordChange) {
    const changedTimestamp = parseInt(
      this.lastPasswordChange.getTime() / 1000,
      10
    );
    return JWTTimestamp < changedTimestamp;
  }
  return false;
};

userSchema.methods.markWelcomeEmailSent = async function() {
  this.welcomeEmailSent = true;
  this.welcomeEmailSentAt = new Date();
  return await this.save();
};

// ===== STATIC METHODS =====
userSchema.statics.generateRandomPassword = function(length = 12) {
  const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*';
  let password = '';
  
  password += 'ABCDEFGHIJKLMNOPQRSTUVWXYZ'[Math.floor(Math.random() * 26)];
  password += 'abcdefghijklmnopqrstuvwxyz'[Math.floor(Math.random() * 26)];
  password += '0123456789'[Math.floor(Math.random() * 10)];
  password += '!@#$%^&*'[Math.floor(Math.random() * 8)];
  
  for (let i = 4; i < length; i++) {
    password += charset[Math.floor(Math.random() * charset.length)];
  }
  
  return password.split('').sort(() => Math.random() - 0.5).join('');
};

// ===== INDEXES =====
userSchema.index({ email: 1 });
userSchema.index({ employeeId: 1 });
userSchema.index({ role: 1 });
userSchema.index({ department: 1 });
userSchema.index({ isActive: 1 });
userSchema.index({ salary: 1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ name: 'text', email: 'text', employeeId: 'text' });

module.exports = mongoose.model('User', userSchema);