const Leave = require('../models/Leave');
const User = require('../models/User');

// ====================== CONSTANTS ======================
const MONTHLY_LEAVE_CONFIG = {
  TOTAL_LEAVES_PER_MONTH: 2,
  MAX_CONSECUTIVE_DAYS: 5,
  LEAVE_TYPES: ['monthly', 'emergency'] // Simplified to only 2 types
};

// ====================== HELPER FUNCTIONS ======================
// Calculate working days (excluding weekends)


// Validate leave dates
// ====================== HELPER FUNCTIONS ======================
// Calculate working days (excluding weekends) - FIXED VERSION
const calculateWorkingDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let days = 0;
  
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) { // 0 = Sunday, 6 = Saturday
      days++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  // FIX: Ensure minimum 0.5 days for weekend-only leaves
  return Math.max(days, 0.5);
};

// Validate leave dates - FIXED VERSION
const validateLeaveDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  
  // Reset times to compare dates only
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  
  if (start < today) {
    return { valid: false, message: 'Start date cannot be in the past' };
  }
  
  if (end < start) {
    return { valid: false, message: 'End date cannot be before start date' };
  }
  
  // Calculate working days with minimum 0.5
  const days = calculateWorkingDays(startDate, endDate);
  
  // Check maximum consecutive days
  if (days > MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS) {
    return { 
      valid: false, 
      message: `Maximum ${MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS} consecutive days allowed per leave` 
    };
  }
  
  return { valid: true, days };
};

// Get month and year from date
const getMonthYear = (date) => {
  const d = new Date(date);
  return {
    month: d.getMonth() + 1, // 1-12
    year: d.getFullYear()
  };
};

// Calculate monthly leave balance
const calculateMonthlyBalance = async (userId, month, year) => {
  try {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    
    // Get approved leaves for the month
    const monthlyLeaves = await Leave.find({
      employee: userId,
      status: 'approved',
      startDate: { $gte: startOfMonth, $lte: endOfMonth }
    });
    
    // Count leaves used (each leave counts as 1)
    const leavesUsed = monthlyLeaves.length;
    const leavesAvailable = Math.max(0, MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH - leavesUsed);
    
    return {
      totalLeaves: MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH,
      leavesUsed,
      leavesAvailable,
      leaves: monthlyLeaves
    };
  } catch (error) {
    console.error('Calculate monthly balance error:', error);
    return {
      totalLeaves: MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH,
      leavesUsed: 0,
      leavesAvailable: MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH,
      leaves: []
    };
  }
};

// Check for overlapping leaves
const checkOverlappingLeaves = async (userId, startDate, endDate, excludeLeaveId = null) => {
  try {
    const query = {
      employee: userId,
      status: { $in: ['pending', 'approved'] },
      $or: [
        { startDate: { $lte: endDate }, endDate: { $gte: startDate } }
      ]
    };
    
    if (excludeLeaveId) {
      query._id = { $ne: excludeLeaveId };
    }
    
    const overlappingLeaves = await Leave.find(query);
    return overlappingLeaves.length > 0;
  } catch (error) {
    console.error('Check overlapping leaves error:', error);
    return false;
  }
};

// ====================== CONTROLLER FUNCTIONS ======================
// Get monthly leave balance
exports.getMonthlyBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const { month, year } = getMonthYear(currentDate);
    
    const monthlyBalance = await calculateMonthlyBalance(userId, month, year);
    
    res.json({
      success: true,
      data: {
        ...monthlyBalance,
        currentMonth: month,
        currentYear: year,
        monthName: currentDate.toLocaleString('default', { month: 'long' })
      },
      message: 'Monthly leave balance retrieved successfully'
    });
  } catch (err) {
    console.error('Get monthly balance error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Apply for leave (Updated for monthly system)
exports.applyLeave = async (req, res) => {
  try {
    const { type, startDate, endDate, reason, contactNumber } = req.body;
    const userId = req.user.id;
    
    // Validate required fields
    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields'
      });
    }
    
    // Validate leave type
    if (!MONTHLY_LEAVE_CONFIG.LEAVE_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid leave type. Must be one of: ${MONTHLY_LEAVE_CONFIG.LEAVE_TYPES.join(', ')}`
      });
    }
    
    // Validate leave dates
    const dateValidation = validateLeaveDates(startDate, endDate);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dateValidation.message
      });
    }
    
    const { month, year } = getMonthYear(startDate);
    
    // Check monthly balance
    const monthlyBalance = await calculateMonthlyBalance(userId, month, year);
    if (monthlyBalance.leavesAvailable <= 0) {
      return res.status(400).json({
        success: false,
        message: `No monthly leaves available. You have used ${monthlyBalance.leavesUsed}/${MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH} leaves this month`
      });
    }
    
    // Check for overlapping leaves
    const hasOverlap = await checkOverlappingLeaves(userId, startDate, endDate);
    if (hasOverlap) {
      return res.status(400).json({
        success: false,
        message: 'You already have a leave scheduled for these dates'
      });
    }
    
    // Create leave request
    const leave = new Leave({
      employee: userId,
      type,
      startDate,
      endDate,
      days: dateValidation.days,
      reason,
      contactNumber: contactNumber || null,
      status: 'pending',
      // For monthly system, each leave uses 1 leave from monthly quota
      leaveCount: 1,
      monthYear: `${month}-${year}`
    });
    
    await leave.save();
    await leave.populate('employee', 'name email department position');
    
    res.status(201).json({
      success: true,
      data: leave,
      message: 'Leave application submitted successfully'
    });
  } catch (err) {
    console.error('Apply leave error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// Get user's leave requests (Updated for monthly system)
exports.getMyLeaves = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, month, year } = req.query;
    
    // Build query
    const query = { employee: userId };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    // Filter by month/year if provided
    if (month && year) {
      const monthNum = parseInt(month);
      const yearNum = parseInt(year);
      const startDate = new Date(yearNum, monthNum - 1, 1);
      const endDate = new Date(yearNum, monthNum, 0);
      query.startDate = { $gte: startDate, $lte: endDate };
    }
    
    const leaves = await Leave.find(query)
      .populate('employee', 'name email department position')
      .populate('approvedBy', 'name email')
      .sort({ startDate: -1 });
    
    // Get current month's balance
    const currentDate = new Date();
    const currentMonth = currentDate.getMonth() + 1;
    const currentYear = currentDate.getFullYear();
    const monthlyBalance = await calculateMonthlyBalance(userId, currentMonth, currentYear);
    
    res.json({
      success: true,
      data: leaves,
      monthlyBalance,
      message: 'Leave requests retrieved successfully'
    });
  } catch (err) {
    console.error('Get my leaves error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Get leave by ID
exports.getLeaveById = async (req, res) => {
  try {
    const leave = await Leave.findById(req.params.id)
      .populate('employee', 'name email department position')
      .populate('approvedBy', 'name email');
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    // Check if user is authorized to view this leave
    if (leave.employee._id.toString() !== req.user.id.toString() && 
        !['manager', 'admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to view this leave request'
      });
    }
    
    res.json({
      success: true,
      data: leave,
      message: 'Leave details retrieved successfully'
    });
  } catch (err) {
    console.error('Get leave by ID error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Update leave request (Updated for monthly system)
exports.updateLeave = async (req, res) => {
  try {
    const { startDate, endDate, reason, contactNumber } = req.body;
    const leaveId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Find the leave
    const leave = await Leave.findById(leaveId);
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    // Check if user is authorized
    const isOwner = leave.employee.toString() === userId.toString();
    const isAdminOrManager = ['admin', 'hr', 'manager'].includes(userRole);
    
    if (!isOwner && !isAdminOrManager) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this leave request'
      });
    }
    
    // Check if leave can be updated
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending leaves can be updated'
      });
    }
    
    // Calculate new days if dates changed
    let newDays = leave.days;
    let newMonthYear = leave.monthYear;
    
    if (startDate || endDate) {
      const newStartDate = startDate || leave.startDate;
      const newEndDate = endDate || leave.endDate;
      
      // Validate new dates
      const dateValidation = validateLeaveDates(newStartDate, newEndDate);
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          message: dateValidation.message
        });
      }
      
      newDays = dateValidation.days;
      
      // Check if month changed
      const { month, year } = getMonthYear(newStartDate);
      newMonthYear = `${month}-${year}`;
      
      // Check for overlapping leaves (excluding current leave)
      const hasOverlap = await checkOverlappingLeaves(userId, newStartDate, newEndDate, leaveId);
      if (hasOverlap) {
        return res.status(400).json({
          success: false,
          message: 'You already have another leave scheduled for these dates'
        });
      }
    }
    
    // Update leave
    leave.startDate = startDate || leave.startDate;
    leave.endDate = endDate || leave.endDate;
    leave.days = newDays;
    leave.reason = reason || leave.reason;
    leave.contactNumber = contactNumber || leave.contactNumber;
    leave.monthYear = newMonthYear;
    
    await leave.save();
    
    // Re-populate for response
    const updatedLeave = await Leave.findById(leaveId)
      .populate('employee', 'name email department position')
      .populate('approvedBy', 'name email');
    
    res.json({
      success: true,
      data: updatedLeave,
      message: 'Leave request updated successfully'
    });
  } catch (err) {
    console.error('Update leave error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// Cancel leave request (Updated for monthly system)
exports.cancelLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    // Find the leave
    const leave = await Leave.findById(leaveId);
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    // Check if user is authorized
    const isOwner = leave.employee.toString() === userId.toString();
    const isAdminOrManager = ['admin', 'hr', 'manager'].includes(userRole);
    
    if (!isOwner && !isAdminOrManager) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this leave request'
      });
    }
    
    // Check if leave can be cancelled
    const validStatuses = ['pending', 'approved'];
    if (!validStatuses.includes(leave.status)) {
      return res.status(400).json({
        success: false,
        message: `Only ${validStatuses.join(' or ')} leaves can be cancelled`
      });
    }
    
    // Update status to cancelled
    leave.status = 'cancelled';
    leave.cancelledBy = userId;
    leave.cancelledAt = new Date();
    
    await leave.save();
    
    // Re-populate for response
    const cancelledLeave = await Leave.findById(leaveId)
      .populate('employee', 'name email department position')
      .populate('approvedBy', 'name email')
      .populate('cancelledBy', 'name email');
    
    res.json({
      success: true,
      data: cancelledLeave,
      message: 'Leave request cancelled successfully'
    });
  } catch (err) {
    console.error('Cancel leave error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// Review leave (approve/reject) - Updated for monthly system
// Review leave (approve/reject) - Updated for monthly system
exports.reviewLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const { action, rejectionReason } = req.body;
    const reviewerId = req.user.id;
    
    // Validate action
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      });
    }
    
    // Find the leave
    const leave = await Leave.findById(leaveId);
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    // Check if user is authorized to review this leave
    const reviewerRole = req.user.role;
    const isAuthorized = ['admin', 'hr', 'manager'].includes(reviewerRole);
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Only admin, HR, or manager can review leave requests'
      });
    }
    
    // Check if leave is pending
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request has already been ${leave.status}`
      });
    }
    
    if (action === 'approve') {
      // Check monthly balance before approving
      const { month, year } = getMonthYear(leave.startDate);
      const monthlyBalance = await calculateMonthlyBalance(leave.employee, month, year);
      
      if (monthlyBalance.leavesAvailable <= 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve leave. Employee has used ${monthlyBalance.leavesUsed}/${MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH} leaves this month`
        });
      }
      
      // Check for overlapping leaves
      const hasOverlap = await checkOverlappingLeaves(
        leave.employee, 
        leave.startDate, 
        leave.endDate, 
        leaveId
      );
      
      if (hasOverlap) {
        return res.status(400).json({
          success: false,
          message: 'Cannot approve leave. Employee has overlapping approved leaves'
        });
      }
      
      leave.status = 'approved';
      leave.approvedBy = reviewerId;
      leave.approvedAt = new Date();
      
    } else if (action === 'reject') {
      // Reject leave
      if (!rejectionReason || rejectionReason.trim() === '') {
        return res.status(400).json({
          success: false,
          message: 'Rejection reason is required'
        });
      }
      
      leave.status = 'rejected';
      leave.rejectionReason = rejectionReason.trim();
      leave.approvedBy = reviewerId;
      leave.approvedAt = new Date();
    }
    
    await leave.save();
    
    // Populate for response
    const updatedLeave = await Leave.findById(leaveId)
      .populate('employee', 'name email department position')
      .populate('approvedBy', 'name email');
    
    res.json({
      success: true,
      data: updatedLeave,
      message: `Leave request ${action}ed successfully`
    });
    
  } catch (err) {
    console.error('Review leave error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// Get leave statistics (Updated for monthly system)
exports.getLeaveStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const year = req.query.year || new Date().getFullYear();
    
    // Get leaves for the year
    const startDate = new Date(year, 0, 1);
    const endDate = new Date(year, 11, 31);
    
    const statistics = await Leave.aggregate([
      {
        $match: {
          employee: userId,
          startDate: { $gte: startDate, $lte: endDate },
          status: { $in: ['approved', 'pending'] }
        }
      },
      {
        $group: {
          _id: { $month: '$startDate' },
          leavesUsed: { $sum: 1 },
          totalDays: { $sum: '$days' }
        }
      },
      {
        $sort: { '_id': 1 }
      }
    ]);
    
    // Format monthly statistics
    const monthlyStats = {};
    for (let month = 1; month <= 12; month++) {
      const stat = statistics.find(s => s._id === month);
      monthlyStats[month] = {
        leavesUsed: stat ? stat.leavesUsed : 0,
        totalDays: stat ? stat.totalDays : 0,
        leavesAvailable: MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH - (stat ? stat.leavesUsed : 0)
      };
    }
    
    res.json({
      success: true,
      data: {
        monthlyStats,
        yearlySummary: {
          totalLeavesUsed: statistics.reduce((sum, stat) => sum + stat.leavesUsed, 0),
          totalDaysUsed: statistics.reduce((sum, stat) => sum + stat.totalDays, 0),
          maxLeavesPerMonth: MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH
        }
      },
      message: 'Leave statistics retrieved successfully'
    });
  } catch (err) {
    console.error('Get leave statistics error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Get upcoming leaves
exports.getUpcomingLeaves = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    
    // Get user's upcoming approved leaves
    const upcomingLeaves = await Leave.find({
      employee: userId,
      status: 'approved',
      startDate: { $gte: today }
    })
    .sort({ startDate: 1 })
    .limit(10);
    
    res.json({
      success: true,
      data: upcomingLeaves,
      message: 'Upcoming leaves retrieved successfully'
    });
  } catch (err) {
    console.error('Get upcoming leaves error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Get team leaves (for managers)
exports.getTeamLeaves = async (req, res) => {
  try {
    const managerId = req.user.id;
    
    // If user is admin or hr, return all leaves
    if (req.user.role === 'admin' || req.user.role === 'hr') {
      const { status, startDate, endDate } = req.query;
      
      const query = {};
      
      if (status && status !== 'all') {
        query.status = status;
      }
      
      if (startDate && endDate) {
        query.startDate = { 
          $gte: new Date(startDate), 
          $lte: new Date(endDate) 
        };
      }
      
      const leaves = await Leave.find(query)
        .populate('employee', 'name email department position avatar employeeId')
        .populate('approvedBy', 'name email')
        .sort({ startDate: -1 });
      
      return res.json({
        success: true,
        data: leaves,
        message: 'All leaves retrieved successfully'
      });
    }
    
    // For managers, get their team
    const teamMembers = await User.find({ 
      manager: managerId,
      isActive: true 
    }).select('_id');
    
    const teamMemberIds = teamMembers.map(member => member._id);
    teamMemberIds.push(managerId);
    
    const { status, startDate, endDate } = req.query;
    
    // Build query
    const query = { employee: { $in: teamMemberIds } };
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    }
    
    const leaves = await Leave.find(query)
      .populate('employee', 'name email department position avatar employeeId')
      .populate('approvedBy', 'name email')
      .sort({ startDate: -1 });
    
    res.json({
      success: true,
      data: leaves,
      message: 'Team leaves retrieved successfully'
    });
  } catch (err) {
    console.error('Get team leaves error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Get all leaves (for admin/HR)
exports.getAllLeaves = async (req, res) => {
  try {
    const { 
      status, 
      startDate, 
      endDate, 
      department,
      page = 1, 
      limit = 50 
    } = req.query;
    
    // Build query
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (startDate && endDate) {
      query.startDate = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    } else if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    }
    
    // If department filter is provided
    if (department && department !== 'all') {
      const usersInDept = await User.find({ 
        department: department,
        isActive: true 
      }).select('_id');
      
      const userIds = usersInDept.map(user => user._id);
      query.employee = { $in: userIds };
    }
    
    // Calculate pagination
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Leave.countDocuments(query);
    
    // Fetch leaves with pagination
    const leaves = await Leave.find(query)
      .populate('employee', 'name email department position employeeId avatar')
      .populate('approvedBy', 'name email')
      .sort({ startDate: -1, createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));
    
    res.json({
      success: true,
      data: leaves,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total,
        pages: Math.ceil(total / parseInt(limit))
      },
      message: 'All leaves retrieved successfully'
    });
  } catch (err) {
    console.error('Get all leaves error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Check leave access (for authorization)
exports.checkLeaveAccess = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    // Check if user owns the leave or has manager/admin/hr role
    if (leave.employee.toString() !== req.user.id.toString() && 
        !['manager', 'admin', 'hr'].includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to access this leave request'
      });
    }
    
    req.leave = leave;
    next();
  } catch (error) {
    console.error('Check leave access error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Get leave balance (kept for compatibility, but redirects to monthly balance)
exports.getLeaveBalance = async (req, res) => {
  try {
    const userId = req.user.id;
    const currentDate = new Date();
    const { month, year } = getMonthYear(currentDate);
    
    const monthlyBalance = await calculateMonthlyBalance(userId, month, year);
    
    res.json({
      success: true,
      data: {
        monthly: monthlyBalance.leavesAvailable,
        emergency: monthlyBalance.leavesAvailable, // Same for both types
        totalLeavesPerMonth: MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH
      },
      message: 'Leave balance retrieved successfully'
    });
  } catch (err) {
    console.error('Get leave balance error:', err);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Delete all leaves (admin/HR only) - BULK DELETE
exports.deleteAllLeaves = async (req, res) => {
  try {
    const { confirmation, filters } = req.body;
    const userRole = req.user.role;
    
    // Only admin and HR can delete all leaves
    if (!['admin', 'hr'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or HR can delete all leaves'
      });
    }
    
    // Require confirmation
    if (!confirmation || confirmation !== 'DELETE_ALL_LEAVES') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required. Send confirmation: "DELETE_ALL_LEAVES" in request body'
      });
    }
    
    // Build query based on filters
    const query = {};
    
    if (filters) {
      if (filters.status && filters.status !== 'all') {
        query.status = filters.status;
      }
      
      if (filters.startDate && filters.endDate) {
        query.createdAt = {
          $gte: new Date(filters.startDate),
          $lte: new Date(filters.endDate)
        };
      }
      
      if (filters.employeeId) {
        query.employee = filters.employeeId;
      }
    }
    
    // Delete matching leaves
    const result = await Leave.deleteMany(query);
    
    res.json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        filters: filters || 'all leaves'
      },
      message: `Successfully deleted ${result.deletedCount} leave request(s)`
    });
    
  } catch (err) {
    console.error('Delete all leaves error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// Delete expired/cancelled leaves (scheduled cleanup)
exports.cleanupOldLeaves = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    if (!['admin', 'hr'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or HR can perform cleanup'
      });
    }
    
    const { months } = req.query;
    const monthsAgo = parseInt(months) || 12; // Default: 12 months
    
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo);
    
    // Delete leaves older than cutoff date that are cancelled or rejected
    const result = await Leave.deleteMany({
      createdAt: { $lt: cutoffDate },
      status: { $in: ['cancelled', 'rejected'] }
    });
    
    res.json({
      success: true,
      data: {
        deletedCount: result.deletedCount,
        cutoffDate: cutoffDate.toISOString(),
        statuses: ['cancelled', 'rejected']
      },
      message: `Cleaned up ${result.deletedCount} old leave requests`
    });
    
  } catch (err) {
    console.error('Cleanup old leaves error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
}; 


// Export leaves to CSV (for admin/HR)
exports.exportLeavesToCSV = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    if (!['admin', 'hr'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or HR can export leaves'
      });
    }
    
    const { 
      status, 
      startDate, 
      endDate, 
      department,
      format = 'csv' 
    } = req.query;
    
    // Build query
    const query = {};
    
    if (status && status !== 'all') {
      query.status = status;
    }
    
    if (startDate && endDate) {
      query.startDate = { 
        $gte: new Date(startDate), 
        $lte: new Date(endDate) 
      };
    } else if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    }
    
    // If department filter is provided
    if (department && department !== 'all') {
      const usersInDept = await User.find({ 
        department: department,
        isActive: true 
      }).select('_id');
      
      const userIds = usersInDept.map(user => user._id);
      query.employee = { $in: userIds };
    }
    
    // Fetch all leaves (no pagination for export)
    const leaves = await Leave.find(query)
      .populate('employee', 'name email department position employeeId')
      .populate('approvedBy', 'name email')
      .populate('cancelledBy', 'name email')
      .sort({ startDate: -1, createdAt: -1 });
    
    if (format === 'csv') {
      // Generate CSV content
      let csvContent = 'Employee Name,Employee ID,Department,Leave Type,Start Date,End Date,Days,Leaves Used,Status,Reason,Applied Date,Approved By,Approved Date,Rejection Reason\n';
      
      leaves.forEach(leave => {
        const employeeName = leave.employee?.name || 'Unknown';
        const employeeId = leave.employee?.employeeId || 'N/A';
        const departmentName = leave.employee?.department || 'N/A';
        const leaveType = leave.type === 'monthly' ? 'Monthly Leave' : 'Emergency Leave';
        const startDateFormatted = new Date(leave.startDate).toLocaleDateString('en-US');
        const endDateFormatted = new Date(leave.endDate).toLocaleDateString('en-US');
        const days = leave.days || 0;
        const leavesUsed = leave.leaveCount || 1;
        const status = leave.status.charAt(0).toUpperCase() + leave.status.slice(1);
        const reason = `"${(leave.reason || '').replace(/"/g, '""')}"`; // Escape quotes for CSV
        const appliedDate = new Date(leave.createdAt).toLocaleDateString('en-US');
        const approvedByName = leave.approvedBy?.name || 'N/A';
        const approvedDate = leave.approvedAt ? new Date(leave.approvedAt).toLocaleDateString('en-US') : 'N/A';
        const rejectionReason = leave.rejectionReason ? `"${leave.rejectionReason.replace(/"/g, '""')}"` : 'N/A';
        
        csvContent += `${employeeName},${employeeId},${departmentName},${leaveType},${startDateFormatted},${endDateFormatted},${days},${leavesUsed},${status},${reason},${appliedDate},${approvedByName},${approvedDate},${rejectionReason}\n`;
      });
      
      // Set response headers for CSV download
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=leaves_export_${Date.now()}.csv`);
      res.send(csvContent);
      
    } else {
      // Return JSON if format is not CSV
      res.json({
        success: true,
        data: leaves,
        count: leaves.length,
        message: 'Leaves data retrieved for export'
      });
    }
    
  } catch (err) {
    console.error('Export leaves error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// Export monthly leave report
exports.exportMonthlyReport = async (req, res) => {
  try {
    const userRole = req.user.role;
    
    if (!['admin', 'hr'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or HR can export reports'
      });
    }
    
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0);
    
    // Get all leaves for the month
    const leaves = await Leave.find({
      startDate: { $gte: startOfMonth, $lte: endOfMonth },
      status: 'approved'
    })
    .populate('employee', 'name email department position employeeId')
    .sort({ employee: 1, startDate: 1 });
    
    // Group leaves by employee
    const employeeLeaves = {};
    leaves.forEach(leave => {
      const employeeId = leave.employee._id.toString();
      if (!employeeLeaves[employeeId]) {
        employeeLeaves[employeeId] = {
          employee: leave.employee,
          leaves: [],
          totalLeavesUsed: 0
        };
      }
      employeeLeaves[employeeId].leaves.push(leave);
      employeeLeaves[employeeId].totalLeavesUsed += (leave.leaveCount || 1);
    });
    
    // Generate CSV report
    let csvContent = 'Monthly Leave Report\n';
    csvContent += `Month: ${startOfMonth.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}\n\n`;
    csvContent += 'Employee Name,Employee ID,Department,Total Leaves Used,Leave 1 Dates,Leave 2 Dates,Remaining Leaves\n';
    
    Object.values(employeeLeaves).forEach(data => {
      const employeeName = data.employee.name;
      const employeeId = data.employee.employeeId || 'N/A';
      const department = data.employee.department || 'N/A';
      const totalLeavesUsed = data.totalLeavesUsed;
      const remainingLeaves = Math.max(0, MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH - totalLeavesUsed);
      
      let leave1Dates = 'N/A';
      let leave2Dates = 'N/A';
      
      if (data.leaves[0]) {
        const start1 = new Date(data.leaves[0].startDate).toLocaleDateString('en-US');
        const end1 = new Date(data.leaves[0].endDate).toLocaleDateString('en-US');
        leave1Dates = `${start1} - ${end1}`;
      }
      
      if (data.leaves[1]) {
        const start2 = new Date(data.leaves[1].startDate).toLocaleDateString('en-US');
        const end2 = new Date(data.leaves[1].endDate).toLocaleDateString('en-US');
        leave2Dates = `${start2} - ${end2}`;
      }
      
      csvContent += `${employeeName},${employeeId},${department},${totalLeavesUsed},${leave1Dates},${leave2Dates},${remainingLeaves}\n`;
    });
    
    // Add summary
    csvContent += `\nSummary\n`;
    csvContent += `Total Employees: ${Object.keys(employeeLeaves).length}\n`;
    csvContent += `Total Approved Leaves: ${leaves.length}\n`;
    csvContent += `Monthly Leave Limit: ${MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH} per employee\n`;
    
    // Set response headers for CSV download
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=monthly_leave_report_${targetMonth}_${targetYear}.csv`);
    res.send(csvContent);
    
  } catch (err) {
    console.error('Export monthly report error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};