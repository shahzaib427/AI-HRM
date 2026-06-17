const Leave = require('../models/Leave');
const User = require('../models/User');
const NotificationService = require('../services/notificationService');

// ====================== CONSTANTS ======================
const MONTHLY_LEAVE_CONFIG = {
  TOTAL_LEAVES_PER_MONTH: 2,
  MAX_CONSECUTIVE_DAYS: 2,
  LEAVE_TYPES: ['monthly', 'emergency']
};

// ====================== HELPER FUNCTIONS ======================
const calculateWorkingDays = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  let days = 0;
  
  const currentDate = new Date(start);
  while (currentDate <= end) {
    const day = currentDate.getDay();
    if (day !== 0 && day !== 6) {
      days++;
    }
    currentDate.setDate(currentDate.getDate() + 1);
  }
  
  return Math.max(days, 0.5);
};

const validateLeaveDates = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  
  today.setHours(0, 0, 0, 0);
  start.setHours(0, 0, 0, 0);
  
  if (start < today) {
    return { valid: false, message: 'Start date cannot be in the past' };
  }
  
  if (end < start) {
    return { valid: false, message: 'End date cannot be before start date' };
  }
  
  const days = calculateWorkingDays(startDate, endDate);
  
  if (days > MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS) {
    return { 
      valid: false, 
      message: `Maximum ${MONTHLY_LEAVE_CONFIG.MAX_CONSECUTIVE_DAYS} consecutive days allowed per leave` 
    };
  }
  
  return { valid: true, days };
};

const getMonthYear = (date) => {
  const d = new Date(date);
  return {
    month: d.getMonth() + 1,
    year: d.getFullYear()
  };
};

const calculateMonthlyBalance = async (userId, month, year) => {
  try {
    const startOfMonth = new Date(year, month - 1, 1);
    const endOfMonth = new Date(year, month, 0);
    
    const monthlyLeaves = await Leave.find({
      employee: userId,
      status: 'approved',
      startDate: { $gte: startOfMonth, $lte: endOfMonth }
    });
    
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

// Apply for leave - WITH NOTIFICATION
exports.applyLeave = async (req, res) => {
  try {
    const { type, startDate, endDate, reason, contactNumber } = req.body;
    const userId = req.user.id;
    
    if (!type || !startDate || !endDate || !reason) {
      return res.status(400).json({
        success: false,
        message: 'Please fill all required fields'
      });
    }
    
    if (!MONTHLY_LEAVE_CONFIG.LEAVE_TYPES.includes(type)) {
      return res.status(400).json({
        success: false,
        message: `Invalid leave type. Must be one of: ${MONTHLY_LEAVE_CONFIG.LEAVE_TYPES.join(', ')}`
      });
    }
    
    const dateValidation = validateLeaveDates(startDate, endDate);
    if (!dateValidation.valid) {
      return res.status(400).json({
        success: false,
        message: dateValidation.message
      });
    }
    
    const { month, year } = getMonthYear(startDate);
    
    const monthlyBalance = await calculateMonthlyBalance(userId, month, year);
    if (monthlyBalance.leavesAvailable <= 0) {
      return res.status(400).json({
        success: false,
        message: `No monthly leaves available. You have used ${monthlyBalance.leavesUsed}/${MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH} leaves this month`
      });
    }
    
    const hasOverlap = await checkOverlappingLeaves(userId, startDate, endDate);
    if (hasOverlap) {
      return res.status(400).json({
        success: false,
        message: 'You already have a leave scheduled for these dates'
      });
    }
    
    const leave = new Leave({
      employee: userId,
      type,
      startDate,
      endDate,
      days: dateValidation.days,
      reason,
      contactNumber: contactNumber || null,
      status: 'pending',
      leaveCount: 1,
      monthYear: `${month}-${year}`
    });
    
    await leave.save();
    await leave.populate('employee', 'name email department position');
    
    // ✅ SEND NOTIFICATION TO HR/ADMIN about new leave request
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    const employee = await User.findById(userId).select('name email');
    const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
    
    for (const hr of hrUsers) {
      await notificationService.createNotification({
        recipient: {
          userId: hr._id,
          userModel: 'User',
          role: hr.role
        },
        sender: {
          userId: userId,
          userModel: 'User',
          name: employee.name
        },
        type: 'leave_request',
        title: 'New Leave Request 📅',
        message: `${employee.name} requested ${type} leave from ${new Date(startDate).toLocaleDateString()} to ${new Date(endDate).toLocaleDateString()}`,
        data: {
          leaveId: leave._id,
          employeeId: userId,
          employeeName: employee.name,
          leaveType: type,
          startDate: startDate,
          endDate: endDate,
          days: dateValidation.days,
          reason: reason
        },
        priority: 'high'
      });
    }
    
    res.status(201).json({
      success: true,
      data: leave,
      message: 'Leave application submitted successfully with notification to HR'
    });
  } catch (err) {
    console.error('Apply leave error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// Review leave (approve/reject) - WITH NOTIFICATION
exports.reviewLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const { action, rejectionReason } = req.body;
    const reviewerId = req.user.id;
    
    if (!action || !['approve', 'reject'].includes(action)) {
      return res.status(400).json({
        success: false,
        message: 'Action must be either "approve" or "reject"'
      });
    }
    
    const leave = await Leave.findById(leaveId).populate('employee', 'name email department position');
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    const reviewerRole = req.user.role;
    const isAuthorized = ['admin', 'hr', 'manager'].includes(reviewerRole);
    
    if (!isAuthorized) {
      return res.status(403).json({
        success: false,
        message: 'Only admin, HR, or manager can review leave requests'
      });
    }
    
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: `Leave request has already been ${leave.status}`
      });
    }
    
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    if (action === 'approve') {
      const { month, year } = getMonthYear(leave.startDate);
      const monthlyBalance = await calculateMonthlyBalance(leave.employee._id, month, year);
      
      if (monthlyBalance.leavesAvailable <= 0) {
        return res.status(400).json({
          success: false,
          message: `Cannot approve leave. Employee has used ${monthlyBalance.leavesUsed}/${MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH} leaves this month`
        });
      }
      
      const hasOverlap = await checkOverlappingLeaves(
        leave.employee._id, 
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
      
      await leave.save();
      
      // ✅ NOTIFY EMPLOYEE that leave is APPROVED
      await notificationService.createNotification({
        recipient: {
          userId: leave.employee._id,
          userModel: 'User',
          role: 'employee'
        },
        sender: {
          userId: reviewerId,
          userModel: 'User',
          name: req.user.name
        },
        type: 'leave_approved',
        title: 'Leave Request Approved ✅',
        message: `Your ${leave.type} leave request from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} has been approved`,
        data: {
          leaveId: leave._id,
          leaveType: leave.type,
          startDate: leave.startDate,
          endDate: leave.endDate,
          days: leave.days
        },
        priority: 'high'
      });
      
      // ✅ NOTIFY OTHER HR/ADMIN about the approval
      const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] }, _id: { $ne: reviewerId } });
      for (const hr of hrUsers) {
        await notificationService.createNotification({
          recipient: {
            userId: hr._id,
            userModel: 'User',
            role: hr.role
          },
          type: 'leave_approved',
          title: 'Leave Request Approved',
          message: `${leave.employee.name}'s leave request was approved by ${req.user.name}`,
          data: {
            leaveId: leave._id,
            employeeName: leave.employee.name,
            approvedBy: req.user.name
          },
          priority: 'medium'
        });
      }
      
      res.json({
        success: true,
        data: leave,
        message: 'Leave request approved and notification sent'
      });
      
    } else if (action === 'reject') {
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
      
      await leave.save();
      
      // ✅ NOTIFY EMPLOYEE that leave is REJECTED
      await notificationService.createNotification({
        recipient: {
          userId: leave.employee._id,
          userModel: 'User',
          role: 'employee'
        },
        sender: {
          userId: reviewerId,
          userModel: 'User',
          name: req.user.name
        },
        type: 'leave_rejected',
        title: 'Leave Request Rejected ❌',
        message: `Your ${leave.type} leave request from ${new Date(leave.startDate).toLocaleDateString()} to ${new Date(leave.endDate).toLocaleDateString()} has been rejected. Reason: ${rejectionReason}`,
        data: {
          leaveId: leave._id,
          leaveType: leave.type,
          startDate: leave.startDate,
          endDate: leave.endDate,
          days: leave.days,
          reason: rejectionReason
        },
        priority: 'high'
      });
      
      // ✅ NOTIFY OTHER HR/ADMIN about the rejection
      const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] }, _id: { $ne: reviewerId } });
      for (const hr of hrUsers) {
        await notificationService.createNotification({
          recipient: {
            userId: hr._id,
            userModel: 'User',
            role: hr.role
          },
          type: 'leave_rejected',
          title: 'Leave Request Rejected',
          message: `${leave.employee.name}'s leave request was rejected by ${req.user.name}`,
          data: {
            leaveId: leave._id,
            employeeName: leave.employee.name,
            rejectedBy: req.user.name
          },
          priority: 'medium'
        });
      }
      
      res.json({
        success: true,
        data: leave,
        message: 'Leave request rejected and notification sent'
      });
    }
    
  } catch (err) {
    console.error('Review leave error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// Cancel leave - WITH NOTIFICATION
exports.cancelLeave = async (req, res) => {
  try {
    const leaveId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const leave = await Leave.findById(leaveId).populate('employee', 'name email');
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    const isOwner = leave.employee._id.toString() === userId.toString();
    const isAdminOrManager = ['admin', 'hr', 'manager'].includes(userRole);
    
    if (!isOwner && !isAdminOrManager) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to cancel this leave request'
      });
    }
    
    const validStatuses = ['pending', 'approved'];
    if (!validStatuses.includes(leave.status)) {
      return res.status(400).json({
        success: false,
        message: `Only ${validStatuses.join(' or ')} leaves can be cancelled`
      });
    }
    
    leave.status = 'cancelled';
    leave.cancelledBy = userId;
    leave.cancelledAt = new Date();
    
    await leave.save();
    
    // ✅ NOTIFY HR/ADMIN about cancellation
    const io = req.app.get('io');
    const notificationService = new NotificationService(io);
    
    const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
    for (const hr of hrUsers) {
      await notificationService.createNotification({
        recipient: {
          userId: hr._id,
          userModel: 'User',
          role: hr.role
        },
        type: 'leave_rejected',
        title: 'Leave Request Cancelled',
        message: `${leave.employee.name} has cancelled their ${leave.type} leave request`,
        data: {
          leaveId: leave._id,
          employeeName: leave.employee.name,
          leaveType: leave.type
        },
        priority: 'medium'
      });
    }
    
    const cancelledLeave = await Leave.findById(leaveId)
      .populate('employee', 'name email department position')
      .populate('approvedBy', 'name email')
      .populate('cancelledBy', 'name email');
    
    res.json({
      success: true,
      data: cancelledLeave,
      message: 'Leave request cancelled and HR notified'
    });
  } catch (err) {
    console.error('Cancel leave error:', err);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// Update leave - WITH NOTIFICATION
exports.updateLeave = async (req, res) => {
  try {
    const { startDate, endDate, reason, contactNumber } = req.body;
    const leaveId = req.params.id;
    const userId = req.user.id;
    const userRole = req.user.role;
    
    const leave = await Leave.findById(leaveId).populate('employee', 'name email');
    
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
    const isOwner = leave.employee._id.toString() === userId.toString();
    const isAdminOrManager = ['admin', 'hr', 'manager'].includes(userRole);
    
    if (!isOwner && !isAdminOrManager) {
      return res.status(403).json({
        success: false,
        message: 'Not authorized to update this leave request'
      });
    }
    
    if (leave.status !== 'pending') {
      return res.status(400).json({
        success: false,
        message: 'Only pending leaves can be updated'
      });
    }
    
    let newDays = leave.days;
    let newMonthYear = leave.monthYear;
    let datesChanged = false;
    
    if (startDate || endDate) {
      const newStartDate = startDate || leave.startDate;
      const newEndDate = endDate || leave.endDate;
      
      const dateValidation = validateLeaveDates(newStartDate, newEndDate);
      if (!dateValidation.valid) {
        return res.status(400).json({
          success: false,
          message: dateValidation.message
        });
      }
      
      newDays = dateValidation.days;
      
      const { month, year } = getMonthYear(newStartDate);
      newMonthYear = `${month}-${year}`;
      
      const hasOverlap = await checkOverlappingLeaves(userId, newStartDate, newEndDate, leaveId);
      if (hasOverlap) {
        return res.status(400).json({
          success: false,
          message: 'You already have another leave scheduled for these dates'
        });
      }
      
      datesChanged = true;
    }
    
    leave.startDate = startDate || leave.startDate;
    leave.endDate = endDate || leave.endDate;
    leave.days = newDays;
    leave.reason = reason || leave.reason;
    leave.contactNumber = contactNumber || leave.contactNumber;
    leave.monthYear = newMonthYear;
    
    await leave.save();
    
    // ✅ NOTIFY HR/ADMIN about the update if dates changed
    if (datesChanged) {
      const io = req.app.get('io');
      const notificationService = new NotificationService(io);
      
      const hrUsers = await User.find({ role: { $in: ['hr', 'admin'] } });
      for (const hr of hrUsers) {
        await notificationService.createNotification({
          recipient: {
            userId: hr._id,
            userModel: 'User',
            role: hr.role
          },
          type: 'leave_request',
          title: 'Leave Request Updated',
          message: `${leave.employee.name} has updated their leave request dates`,
          data: {
            leaveId: leave._id,
            employeeName: leave.employee.name,
            newStartDate: leave.startDate,
            newEndDate: leave.endDate
          },
          priority: 'medium'
        });
      }
    }
    
    const updatedLeave = await Leave.findById(leaveId)
      .populate('employee', 'name email department position')
      .populate('approvedBy', 'name email');
    
    res.json({
      success: true,
      data: updatedLeave,
      message: 'Leave request updated successfully'
    });
  } catch (err) {
    console.error('Update leave error:', error);
    res.status(500).json({
      success: false,
      error: err.message || 'Server error'
    });
  }
};

// Keep all your existing functions unchanged below
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

exports.getMyLeaves = async (req, res) => {
  try {
    const userId = req.user.id;
    const { status, month, year } = req.query;
    const query = { employee: userId };
    
    if (status && status !== 'all') query.status = status;
    
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

exports.getLeaveStatistics = async (req, res) => {
  try {
    const userId = req.user.id;
    const year = req.query.year || new Date().getFullYear();
    
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
      { $sort: { '_id': 1 } }
    ]);
    
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

exports.getUpcomingLeaves = async (req, res) => {
  try {
    const userId = req.user.id;
    const today = new Date();
    
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

exports.getTeamLeaves = async (req, res) => {
  try {
    const managerId = req.user.id;
    
    if (req.user.role === 'admin' || req.user.role === 'hr') {
      const { status, startDate, endDate } = req.query;
      const query = {};
      
      if (status && status !== 'all') query.status = status;
      if (startDate && endDate) {
        query.startDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
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
    
    const teamMembers = await User.find({ manager: managerId, isActive: true }).select('_id');
    const teamMemberIds = teamMembers.map(member => member._id);
    teamMemberIds.push(managerId);
    
    const { status, startDate, endDate } = req.query;
    const query = { employee: { $in: teamMemberIds } };
    
    if (status && status !== 'all') query.status = status;
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

exports.getAllLeaves = async (req, res) => {
  try {
    const { status, startDate, endDate, department, page = 1, limit = 50 } = req.query;
    const query = {};
    
    if (status && status !== 'all') query.status = status;
    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    }
    
    if (department && department !== 'all') {
      const usersInDept = await User.find({ department: department, isActive: true }).select('_id');
      const userIds = usersInDept.map(user => user._id);
      query.employee = { $in: userIds };
    }
    
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Leave.countDocuments(query);
    
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

exports.checkLeaveAccess = async (req, res, next) => {
  try {
    const leave = await Leave.findById(req.params.id);
    if (!leave) {
      return res.status(404).json({
        success: false,
        message: 'Leave request not found'
      });
    }
    
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
        emergency: monthlyBalance.leavesAvailable,
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

exports.deleteAllLeaves = async (req, res) => {
  try {
    const { confirmation, filters } = req.body;
    const userRole = req.user.role;
    
    if (!['admin', 'hr'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or HR can delete all leaves'
      });
    }
    
    if (!confirmation || confirmation !== 'DELETE_ALL_LEAVES') {
      return res.status(400).json({
        success: false,
        message: 'Confirmation required. Send confirmation: "DELETE_ALL_LEAVES" in request body'
      });
    }
    
    const query = {};
    if (filters) {
      if (filters.status && filters.status !== 'all') query.status = filters.status;
      if (filters.startDate && filters.endDate) {
        query.createdAt = { $gte: new Date(filters.startDate), $lte: new Date(filters.endDate) };
      }
      if (filters.employeeId) query.employee = filters.employeeId;
    }
    
    const result = await Leave.deleteMany(query);
    
    res.json({
      success: true,
      data: { deletedCount: result.deletedCount, filters: filters || 'all leaves' },
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
    const monthsAgo = parseInt(months) || 12;
    const cutoffDate = new Date();
    cutoffDate.setMonth(cutoffDate.getMonth() - monthsAgo);
    
    const result = await Leave.deleteMany({
      createdAt: { $lt: cutoffDate },
      status: { $in: ['cancelled', 'rejected'] }
    });
    
    res.json({
      success: true,
      data: { deletedCount: result.deletedCount, cutoffDate: cutoffDate.toISOString(), statuses: ['cancelled', 'rejected'] },
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

exports.exportLeavesToCSV = async (req, res) => {
  try {
    const userRole = req.user.role;
    if (!['admin', 'hr'].includes(userRole)) {
      return res.status(403).json({
        success: false,
        message: 'Only admin or HR can export leaves'
      });
    }
    
    const { status, startDate, endDate, department, format = 'csv' } = req.query;
    const query = {};
    
    if (status && status !== 'all') query.status = status;
    if (startDate && endDate) {
      query.startDate = { $gte: new Date(startDate), $lte: new Date(endDate) };
    } else if (startDate) {
      query.startDate = { $gte: new Date(startDate) };
    }
    
    if (department && department !== 'all') {
      const usersInDept = await User.find({ department: department, isActive: true }).select('_id');
      const userIds = usersInDept.map(user => user._id);
      query.employee = { $in: userIds };
    }
    
    const leaves = await Leave.find(query)
      .populate('employee', 'name email department position employeeId')
      .populate('approvedBy', 'name email')
      .populate('cancelledBy', 'name email')
      .sort({ startDate: -1, createdAt: -1 });
    
    if (format === 'csv') {
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
        const reason = `"${(leave.reason || '').replace(/"/g, '""')}"`;
        const appliedDate = new Date(leave.createdAt).toLocaleDateString('en-US');
        const approvedByName = leave.approvedBy?.name || 'N/A';
        const approvedDate = leave.approvedAt ? new Date(leave.approvedAt).toLocaleDateString('en-US') : 'N/A';
        const rejectionReason = leave.rejectionReason ? `"${leave.rejectionReason.replace(/"/g, '""')}"` : 'N/A';
        
        csvContent += `${employeeName},${employeeId},${departmentName},${leaveType},${startDateFormatted},${endDateFormatted},${days},${leavesUsed},${status},${reason},${appliedDate},${approvedByName},${approvedDate},${rejectionReason}\n`;
      });
      
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', `attachment; filename=leaves_export_${Date.now()}.csv`);
      res.send(csvContent);
    } else {
      res.json({ success: true, data: leaves, count: leaves.length, message: 'Leaves data retrieved for export' });
    }
  } catch (err) {
    console.error('Export leaves error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
};

exports.exportMonthlyReport = async (req, res) => {
  try {
    const userRole = req.user.role;
    if (!['admin', 'hr'].includes(userRole)) {
      return res.status(403).json({ success: false, message: 'Only admin or HR can export reports' });
    }
    
    const { month, year } = req.query;
    const targetMonth = month ? parseInt(month) : new Date().getMonth() + 1;
    const targetYear = year ? parseInt(year) : new Date().getFullYear();
    
    const startOfMonth = new Date(targetYear, targetMonth - 1, 1);
    const endOfMonth = new Date(targetYear, targetMonth, 0);
    
    const leaves = await Leave.find({
      startDate: { $gte: startOfMonth, $lte: endOfMonth },
      status: 'approved'
    })
    .populate('employee', 'name email department position employeeId')
    .sort({ employee: 1, startDate: 1 });
    
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
    
    csvContent += `\nSummary\n`;
    csvContent += `Total Employees: ${Object.keys(employeeLeaves).length}\n`;
    csvContent += `Total Approved Leaves: ${leaves.length}\n`;
    csvContent += `Monthly Leave Limit: ${MONTHLY_LEAVE_CONFIG.TOTAL_LEAVES_PER_MONTH} per employee\n`;
    
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename=monthly_leave_report_${targetMonth}_${targetYear}.csv`);
    res.send(csvContent);
  } catch (err) {
    console.error('Export monthly report error:', err);
    res.status(500).json({ success: false, error: err.message || 'Server error' });
  }
};