const User = require('../models/User');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const Payroll = require('../models/Payroll');
const mongoose = require('mongoose');
const axios = require('axios');
const fs = require('fs');
const path = require('path');

// ==================== DATE RANGE HELPER ====================
function getDateRangeFilter(timeRange) {
  const now = new Date();
  const start = new Date(now);
  switch (timeRange) {
    case 'daily':
      start.setHours(0, 0, 0, 0);
      break;
    case 'weekly':
      start.setDate(now.getDate() - 7);
      break;
    case 'monthly':
      start.setDate(now.getDate() - 30);
      break;
    case 'yearly':
      start.setDate(now.getDate() - 365);
      break;
    default:
      start.setDate(now.getDate() - 30);
  }
  return { $gte: start, $lte: now };
}

exports.getAdminProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -passwordHistory -passwordResetToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Admin profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching admin profile:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.updateAdminProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    const allowedFields = {
      name: updateData.name,
      fatherName: updateData.fatherName,
      gender: updateData.gender,
      dateOfBirth: updateData.dateOfBirth,
      bloodGroup: updateData.bloodGroup,
      maritalStatus: updateData.maritalStatus,
      idCardNumber: updateData.idCardNumber,
      idCardIssueDate: updateData.idCardIssueDate,
      idCardExpiryDate: updateData.idCardExpiryDate,
      phone: updateData.phone,
      alternatePhone: updateData.alternatePhone,
      presentAddress: updateData.presentAddress,
      permanentAddress: updateData.permanentAddress,
      city: updateData.city,
      state: updateData.state,
      country: updateData.country,
      postalCode: updateData.postalCode,
      employeeType: updateData.employeeType,
      customEmployeeType: updateData.customEmployeeType,
      department: updateData.department,
      customDepartment: updateData.customDepartment,
      position: updateData.position,
      customPosition: updateData.customPosition,
      reportingManager: updateData.reportingManager,
      probationPeriod: updateData.probationPeriod,
      customProbationPeriod: updateData.customProbationPeriod,
      emergencyContacts: updateData.emergencyContacts || [],
      salary: updateData.salary,
      fuelAllowance: updateData.fuelAllowance,
      medicalAllowance: updateData.medicalAllowance,
      specialAllowance: updateData.specialAllowance,
      otherAllowance: updateData.otherAllowance,
      currency: updateData.currency,
      salaryFrequency: updateData.salaryFrequency,
      bankName: updateData.bankName,
      bankAccountNumber: updateData.bankAccountNumber,
      bankAccountTitle: updateData.bankAccountTitle,
      bankBranchCode: updateData.bankBranchCode,
      ibanNumber: updateData.ibanNumber,
      qualifications: updateData.qualifications,
      experiences: updateData.experiences || [],
      skills: updateData.skills || [],
      previousExperience: updateData.previousExperience,
      profilePicture: updateData.profilePicture,
      twoFactorEnabled: updateData.twoFactorEnabled,
      notificationPreferences: updateData.notificationPreferences || {}
    };

    Object.keys(allowedFields).forEach(key => {
      if (allowedFields[key] === undefined) {
        delete allowedFields[key];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      allowedFields,
      { new: true, runValidators: true, context: 'query' }
    ).select('-password -passwordHistory');

    res.status(200).json({
      success: true,
      message: 'Admin profile updated successfully',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating admin profile:', error);

    if (error.name === 'ValidationError') {
      const errors = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({
        success: false,
        error: 'Validation failed',
        details: errors
      });
    }

    if (error.code === 11000) {
      const field = Object.keys(error.keyValue)[0];
      return res.status(400).json({
        success: false,
        error: `${field} already exists`,
        field: field
      });
    }

    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

exports.getSystemStats = async (req, res) => {
  try {
    const [
      totalUsers,
      activeEmployees,
      inactiveEmployees,
      pendingLeaves,
      recentUsers,
      departmentStats,
      roleStats
    ] = await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: true }),
      User.countDocuments({ isActive: false }),
      Leave.countDocuments({ status: 'pending' }),
      User.find().sort({ createdAt: -1 }).limit(5).select('name email role createdAt'),
      getDepartmentStats(),
      getRoleStats()
    ]);

    const stats = {
      totalUsers,
      activeEmployees,
      inactiveEmployees,
      pendingLeaves,
      recentUsers,
      departments: departmentStats,
      roles: roleStats,
      uptime: calculateUptime(),
      dbSize: await getDatabaseSize(),
      userChange: await calculateUserChange()
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching system stats:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// Upload Profile Picture
exports.uploadProfilePicture = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: 'No file uploaded'
      });
    }

    const profilePictureUrl = `/uploads/profile-pictures/${req.file.filename}`;

    const user = await User.findByIdAndUpdate(
      req.user.id,
      { profilePicture: profilePictureUrl },
      { new: true }
    ).select('-password');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully',
      data: { profilePicture: profilePictureUrl }
    });
  } catch (error) {
    console.error('Error uploading profile picture:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to upload profile picture'
    });
  }
};

// Delete Profile Picture
exports.deleteProfilePicture = async (req, res) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    if (user.profilePicture) {
      const filePath = path.join(__dirname, '..', user.profilePicture);
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
      }
    }

    user.profilePicture = null;
    await user.save();

    res.status(200).json({
      success: true,
      message: 'Profile picture removed successfully'
    });
  } catch (error) {
    console.error('Error deleting profile picture:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to delete profile picture'
    });
  }
};

exports.toggle2FA = async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'User not found'
      });
    }

    user.twoFactorEnabled = !user.twoFactorEnabled;
    await user.save();

    res.status(200).json({
      success: true,
      message: `Two-factor authentication ${user.twoFactorEnabled ? 'enabled' : 'disabled'}`,
      twoFactorEnabled: user.twoFactorEnabled
    });
  } catch (error) {
    console.error('Error toggling 2FA:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// ==================== DASHBOARD STATS (real, timeRange-aware) ====================
exports.getDashboardStats = async (req, res) => {
  try {
    const { timeRange = 'monthly' } = req.query;
    const dateFilter = getDateRangeFilter(timeRange);

    const totalEmployees = await User.countDocuments({
      isActive: true,
      role: { $ne: 'admin' }
    });

    const activeDepartments = await User.distinct('department', {
      isActive: true,
      department: { $exists: true, $ne: null, $ne: '' }
    });

    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });

    // Real "system health": % of active employees who checked in at least
    // once within the selected time range (was locked to "today only" before)
    const distinctCheckedIn = await Attendance.distinct('employee', {
      date: dateFilter,
      $or: [
        { approvedCheckIn: { $exists: true, $ne: null } },
        { checkIn: { $exists: true, $ne: null } }
      ]
    });

    const systemHealth = totalEmployees > 0
      ? Math.round((distinctCheckedIn.length / totalEmployees) * 100)
      : 0;

    // Real "employee satisfaction" proxy: on-time check-in rate within timeRange
    // (before 9:00 AM cutoff, matching the schema's own late-detection logic)
    const attendanceInRange = await Attendance.find({
      date: dateFilter,
      $or: [
        { approvedCheckIn: { $exists: true, $ne: null } },
        { checkIn: { $exists: true, $ne: null } }
      ]
    }).select('approvedCheckIn checkIn lateMinutes').lean();

    const onTimeCount = attendanceInRange.filter(a => (a.lateMinutes || 0) === 0).length;
    const employeeSatisfaction = attendanceInRange.length > 0
      ? Math.round((onTimeCount / attendanceInRange.length) * 100)
      : 0;

    // Real "performance": average hours worked vs 8h target, within timeRange
    const withHours = await Attendance.find({
      date: dateFilter,
      totalHours: { $exists: true, $gt: 0 }
    }).select('totalHours').lean();

    const avgHours = withHours.length > 0
      ? withHours.reduce((sum, a) => sum + a.totalHours, 0) / withHours.length
      : 0;
    const performance = Math.min(100, Math.round((avgHours / 8) * 100));

    // Real "payroll cost": Payroll records are month/year-granular, so this
    // is the finest real precision available — 'yearly' sums every month of
    // the current year; daily/weekly/monthly all show the current month's
    // paid total, since payroll simply doesn't run at daily/weekly granularity.
    const now = new Date();
    const currentYear = now.getFullYear();
    const currentMonthName = now.toLocaleString('default', { month: 'long' });

    const payrollQuery = timeRange === 'yearly'
      ? { year: currentYear, paymentStatus: 'Paid' }
      : { month: currentMonthName, year: currentYear, paymentStatus: 'Paid' };

    const paidPayrolls = await Payroll.find(payrollQuery).lean();

    const payrollCost = paidPayrolls.reduce((sum, p) => {
      const total = (p.salary || 0) + (p.fuelAllowance || 0) + (p.medicalAllowance || 0) +
                    (p.specialAllowance || 0) + (p.otherAllowance || 0);
      return sum + total;
    }, 0);

    res.status(200).json({
      success: true,
      data: {
        totalEmployees,
        activeDepartments: activeDepartments.length,
        systemHealth,
        pendingTasks: pendingLeaves,
        payrollCost, // real: sum of Paid payroll for the current month
        performance,
        employeeSatisfaction
      }
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    });
  }
};

// Recent Activity
exports.getRecentActivity = async (req, res) => {
  try {
    const activities = [];

    const recentLeaves = await Leave.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('employee', 'name')
      .lean();

    recentLeaves.forEach(leave => {
      if (leave.employee) {
        activities.push({
          id: leave._id.toString(),
          message: `${leave.employee.name} requested ${leave.type || 'leave'} leave (${leave.days} day${leave.days !== 1 ? 's' : ''})`,
          time: formatTimeAgo(leave.createdAt),
          status: leave.status || 'pending',
          icon: '📝'
        });
      }
    });

    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentEmployees = await User.find({
      role: { $ne: 'admin' },
      joiningDate: { $gte: thirtyDaysAgo, $exists: true, $ne: null }
    })
      .sort({ joiningDate: -1 })
      .limit(5)
      .lean();

    recentEmployees.forEach(emp => {
      activities.push({
        id: emp._id.toString(),
        message: `New employee joined: ${emp.name}`,
        time: formatTimeAgo(emp.joiningDate),
        status: 'completed',
        icon: '👋'
      });
    });

    // Real: recent AI-verified check-ins (uses your actual checkInRequest.remarks field)
    const recentCheckIns = await Attendance.find({
      approvedCheckIn: { $exists: true, $ne: null }
    })
      .sort({ 'checkInRequest.approvedAt': -1, createdAt: -1 })
      .limit(5)
      .lean();

    recentCheckIns.forEach(att => {
      activities.push({
        id: att._id.toString(),
        message: `${att.employeeName || 'An employee'} checked in${att.checkInRequest?.remarks?.includes('AI') ? ' (AI verified)' : ''}`,
        time: formatTimeAgo(att.checkInRequest?.approvedAt || att.createdAt),
        status: att.lateMinutes > 0 ? 'pending' : 'completed',
        icon: '🕘'
      });
    });

    activities.sort((a, b) => {
      const timeA = parseTimeValue(a.time);
      const timeB = parseTimeValue(b.time);
      return timeB - timeA;
    });

    res.status(200).json({
      success: true,
      data: activities.slice(0, 10)
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity'
    });
  }
};

// ==================== TEAM MEMBERS (real productivity, real online status) ====================
// Expected working days per range — used as the denominator for the
// productivity %. Rough business-day estimates; adjust if you track a real
// work calendar/holidays.
function getExpectedWorkingDays(timeRange) {
  switch (timeRange) {
    case 'daily': return 1;
    case 'weekly': return 5;
    case 'monthly': return 22;
    case 'yearly': return 260;
    default: return 22;
  }
}

exports.getTeamMembers = async (req, res) => {
  try {
    const { timeRange = 'monthly' } = req.query;
    const dateFilter = getDateRangeFilter(timeRange);
    const expectedDays = getExpectedWorkingDays(timeRange);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const teamMembers = await User.find({
      isActive: true,
      role: { $ne: 'admin' }
    }).select('name role department').limit(10).lean();

    const formattedMembers = await Promise.all(teamMembers.map(async (member) => {
      const presentDays = await Attendance.countDocuments({
        employee: member._id,
        date: dateFilter,
        $or: [
          { approvedCheckIn: { $exists: true, $ne: null } },
          { checkIn: { $exists: true, $ne: null } }
        ]
      });

      const productivity = Math.min(100, Math.round((presentDays / expectedDays) * 100));

      const checkedInToday = await Attendance.exists({
        employee: member._id,
        date: { $gte: todayStart, $lte: todayEnd },
        $or: [
          { approvedCheckIn: { $exists: true, $ne: null } },
          { checkIn: { $exists: true, $ne: null } }
        ],
        $and: [{
          $or: [
            { approvedCheckOut: { $exists: false } },
            { approvedCheckOut: null },
            { checkOut: { $exists: false } },
            { checkOut: null }
          ]
        }]
      });

      return {
        id: member._id,
        name: member.name,
        role: member.role || 'Employee',
        department: member.department || 'General',
        status: checkedInToday ? 'online' : 'offline',
        productivity,
        avatar: member.name?.charAt(0) || 'U'
      };
    }));

    res.status(200).json({
      success: true,
      data: formattedMembers
    });
  } catch (error) {
    console.error('Error fetching team members:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch team members'
    });
  }
};

// Notifications
exports.getNotifications = async (req, res) => {
  try {
    const notifications = [];

    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
    if (pendingLeaves > 0) {
      notifications.push({
        id: 'pending-leaves',
        message: `${pendingLeaves} leave request${pendingLeaves > 1 ? 's are' : ' is'} pending approval`,
        type: 'leave',
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const newEmployees = await User.countDocuments({
      joiningDate: { $gte: sevenDaysAgo, $exists: true, $ne: null },
      role: { $ne: 'admin' }
    });
    if (newEmployees > 0) {
      notifications.push({
        id: 'new-employees',
        message: `${newEmployees} new employee${newEmployees > 1 ? 's have' : ' has'} joined this week`,
        type: 'onboarding',
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    // Real: pending attendance approval requests (uses your actual workflow fields)
    const pendingAttendanceApprovals = await Attendance.countDocuments({
      $or: [
        { 'checkInRequest.approved': false },
        { 'checkOutRequest.approved': false }
      ]
    });
    if (pendingAttendanceApprovals > 0) {
      notifications.push({
        id: 'pending-attendance',
        message: `${pendingAttendanceApprovals} attendance request${pendingAttendanceApprovals > 1 ? 's need' : ' needs'} approval`,
        type: 'attendance',
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    // Real: unpaid payroll for the current month
    const now = new Date();
    const currentMonthName = now.toLocaleString('default', { month: 'long' });
    const currentYear = now.getFullYear();
    const unpaidPayrolls = await Payroll.countDocuments({
      month: currentMonthName,
      year: currentYear,
      paymentStatus: { $ne: 'Paid' }
    });
    if (unpaidPayrolls > 0) {
      notifications.push({
        id: 'unpaid-payroll',
        message: `${unpaidPayrolls} payroll record${unpaidPayrolls > 1 ? 's are' : ' is'} unpaid for ${currentMonthName}`,
        type: 'payroll',
        read: false,
        createdAt: new Date().toISOString()
      });
    }

    res.status(200).json({
      success: true,
      data: {
        notifications: notifications,
        unreadCount: notifications.filter(n => !n.read).length
      }
    });
  } catch (error) {
    console.error('Error fetching notifications:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch notifications'
    });
  }
};

// ==================== PERFORMANCE METRICS (real, timeRange-aware) ====================
exports.getPerformanceMetrics = async (req, res) => {
  try {
    const { timeRange = 'monthly' } = req.query;
    const dateFilter = getDateRangeFilter(timeRange);

    const totalEmployees = await User.countDocuments({ isActive: true, role: { $ne: 'admin' } });

    // 1. Attendance Rate: % of employees who checked in at least once in range
    const distinctCheckedIn = await Attendance.distinct('employee', {
      date: dateFilter,
      $or: [
        { approvedCheckIn: { $exists: true, $ne: null } },
        { checkIn: { $exists: true, $ne: null } }
      ]
    });
    const attendanceRate = totalEmployees > 0
      ? Math.round((distinctCheckedIn.length / totalEmployees) * 100)
      : 0;

    // 2. Punctuality Rate: % of check-ins in range that were on-time (lateMinutes === 0)
    const attendanceRecords = await Attendance.find({
      date: dateFilter,
      $or: [
        { approvedCheckIn: { $exists: true, $ne: null } },
        { checkIn: { $exists: true, $ne: null } }
      ]
    }).select('lateMinutes').lean();

    const onTimeCount = attendanceRecords.filter(a => (a.lateMinutes || 0) === 0).length;
    const punctualityRate = attendanceRecords.length > 0
      ? Math.round((onTimeCount / attendanceRecords.length) * 100)
      : 0;

    // 3. Avg Work Hours: average totalHours logged in range
    const withHours = await Attendance.find({
      date: dateFilter,
      totalHours: { $exists: true, $gt: 0 }
    }).select('totalHours').lean();

    const avgWorkHours = withHours.length > 0
      ? parseFloat((withHours.reduce((sum, a) => sum + a.totalHours, 0) / withHours.length).toFixed(1))
      : 0;

    // 4. Leave Utilization: % of employees who took approved leave in range
    const distinctOnLeave = await Leave.distinct('employee', {
      status: 'approved',
      startDate: dateFilter
    });
    const leaveUtilization = totalEmployees > 0
      ? Math.round((distinctOnLeave.length / totalEmployees) * 100)
      : 0;

    const metrics = [
      { label: 'Attendance Rate', value: attendanceRate, color: 'from-green-500 to-emerald-500' },
      { label: 'Punctuality Rate', value: punctualityRate, color: 'from-blue-500 to-cyan-500' },
      { label: 'Avg Work Hours', value: avgWorkHours, color: 'from-purple-500 to-pink-500' },
      { label: 'Leave Utilization', value: leaveUtilization, color: 'from-orange-500 to-amber-500' }
    ];

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching performance metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch performance metrics'
    });
  }
};

// Quick Actions (static navigation shortcuts — not data, fine as-is)
exports.getQuickActions = async (req, res) => {
  try {
    const quickActions = [
      {
        id: 'add-employee',
        title: 'Add Employee',
        description: 'Add a new employee to the system',
        icon: '👤',
        color: 'bg-blue-100 text-blue-600',
        path: '/admin/employees/new'
      },
      {
        id: 'process-payroll',
        title: 'Process Payroll',
        description: 'Run payroll for current month',
        icon: '💰',
        color: 'bg-green-100 text-green-600',
        path: '/admin/payroll'
      },
      {
        id: 'view-reports',
        title: 'View Reports',
        description: 'Generate system reports',
        icon: '📊',
        color: 'bg-purple-100 text-purple-600',
        path: '/admin/reports'
      },
      {
        id: 'manage-leave',
        title: 'Manage Leave',
        description: 'Review pending leave requests',
        icon: '🏖️',
        color: 'bg-yellow-100 text-yellow-600',
        path: '/admin/leave'
      }
    ];

    res.status(200).json({
      success: true,
      data: quickActions
    });
  } catch (error) {
    console.error('Error fetching quick actions:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch quick actions'
    });
  }
};

// Mark notification as read
exports.markNotificationRead = async (req, res) => {
  try {
    res.status(200).json({
      success: true,
      message: 'Notification marked as read'
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to mark notification as read'
    });
  }
};

// ==================== ATTENDANCE OVERVIEW (new — real, timeRange-aware) ====================
// Weekly: last 7 days, one bucket per day.
// Monthly (default): last 4 weeks, one bucket per week (30 daily points would
// be unreadable in a compact chart).
// Present = distinct employees with an approved/raw check-in and lateMinutes === 0
// Late    = distinct employees with an approved/raw check-in and lateMinutes > 0
// Absent  = active employees who did not check in at all that bucket
exports.getAttendanceOverview = async (req, res) => {
  try {
    const { timeRange = 'weekly' } = req.query;
    const totalEmployees = await User.countDocuments({ isActive: true, role: { $ne: 'admin' } });

    const now = new Date();
    let buckets = [];

    if (timeRange === 'weekly') {
      for (let i = 6; i >= 0; i--) {
        const day = new Date(now);
        day.setDate(now.getDate() - i);
        const start = new Date(day); start.setHours(0, 0, 0, 0);
        const end = new Date(day); end.setHours(23, 59, 59, 999);
        buckets.push({
          label: start.toLocaleDateString('default', { weekday: 'short' }),
          start,
          end
        });
      }
    } else {
      for (let i = 3; i >= 0; i--) {
        const end = new Date(now);
        end.setDate(now.getDate() - (i * 7));
        end.setHours(23, 59, 59, 999);
        const start = new Date(end);
        start.setDate(end.getDate() - 6);
        start.setHours(0, 0, 0, 0);
        buckets.push({
          label: `Week ${4 - i}`,
          start,
          end
        });
      }
    }

    const present = [];
    const absent = [];
    const late = [];

    for (const bucket of buckets) {
      const records = await Attendance.find({
        date: { $gte: bucket.start, $lte: bucket.end },
        $or: [
          { approvedCheckIn: { $exists: true, $ne: null } },
          { checkIn: { $exists: true, $ne: null } }
        ]
      }).select('employee lateMinutes').lean();

      const distinctEmployees = new Set(records.map(r => String(r.employee)));
      const lateEmployees = new Set(records.filter(r => (r.lateMinutes || 0) > 0).map(r => String(r.employee)));

      const lateCount = lateEmployees.size;
      const presentCount = distinctEmployees.size - lateCount;
      const absentCount = Math.max(0, totalEmployees - distinctEmployees.size);

      present.push(presentCount);
      late.push(lateCount);
      absent.push(absentCount);
    }

    res.status(200).json({
      success: true,
      data: {
        categories: buckets.map(b => b.label),
        series: [
          { name: 'Present', data: present },
          { name: 'Late', data: late },
          { name: 'Absent', data: absent }
        ]
      }
    });
  } catch (error) {
    console.error('Error fetching attendance overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch attendance overview'
    });
  }
};

// ==================== LEAVE OVERVIEW (new — real) ====================
exports.getLeaveOverview = async (req, res) => {
  try {
    const [pending, approved, rejected] = await Promise.all([
      Leave.countDocuments({ status: 'pending' }),
      Leave.countDocuments({ status: 'approved' }),
      Leave.countDocuments({ status: 'rejected' })
    ]);

    res.status(200).json({
      success: true,
      data: { pending, approved, rejected }
    });
  } catch (error) {
    console.error('Error fetching leave overview:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch leave overview'
    });
  }
};

// ==================== SYSTEM STATUS (new — real, per-service) ====================
exports.getSystemStatus = async (req, res) => {
  const services = [];

  // Database — mongoose's own connection state
  const dbState = mongoose.connection.readyState; // 1 = connected
  services.push({ name: 'Database', status: dbState === 1 ? 'Operational' : 'Critical' });

  // API — if this handler is running, the API itself is up
  services.push({ name: 'API', status: 'Operational' });

  // Attendance service — verify the Attendance collection actually responds
  try {
    await Attendance.estimatedDocumentCount();
    services.push({ name: 'Attendance Service', status: 'Operational' });
  } catch (err) {
    services.push({ name: 'Attendance Service', status: 'Critical' });
  }

  // AI service — real health check against the Python face-recognition service
  const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:5001';
  try {
    await axios.get(`${AI_SERVICE_URL}/health`, { timeout: 3000 });
    services.push({ name: 'AI Services', status: 'Operational' });
  } catch (err) {
    services.push({ name: 'AI Services', status: 'Warning' });
  }

  res.status(200).json({
    success: true,
    data: services
  });
};

// ==================== AI INSIGHTS (new — real, derived from attendance data) ====================
// Every insight here is computed from actual records for this week vs last
// week. If there isn't enough data yet for a given insight, it's omitted
// rather than shown with a made-up number.
exports.getAIInsights = async (req, res) => {
  try {
    const insights = [];
    const now = new Date();

    const thisWeekStart = new Date(now); thisWeekStart.setDate(now.getDate() - 7);
    const lastWeekStart = new Date(now); lastWeekStart.setDate(now.getDate() - 14);
    const lastWeekEnd = new Date(thisWeekStart);

    // 1. Late-arrival trend
    const [thisWeekRecords, lastWeekRecords] = await Promise.all([
      Attendance.find({ date: { $gte: thisWeekStart, $lte: now } }).select('lateMinutes').lean(),
      Attendance.find({ date: { $gte: lastWeekStart, $lt: lastWeekEnd } }).select('lateMinutes').lean()
    ]);

    if (thisWeekRecords.length > 0 && lastWeekRecords.length > 0) {
      const thisWeekLateRate = thisWeekRecords.filter(r => (r.lateMinutes || 0) > 0).length / thisWeekRecords.length;
      const lastWeekLateRate = lastWeekRecords.filter(r => (r.lateMinutes || 0) > 0).length / lastWeekRecords.length;
      const change = lastWeekLateRate > 0
        ? Math.round(((thisWeekLateRate - lastWeekLateRate) / lastWeekLateRate) * 100)
        : (thisWeekLateRate > 0 ? 100 : 0);

      insights.push({
        type: 'attendance',
        title: 'AI Attendance Insights',
        insight: change === 0
          ? 'Late arrivals are steady compared to last week.'
          : `Late arrivals are ${change > 0 ? 'up' : 'down'} ${Math.abs(change)}% vs last week.`
      });
    }

    // 2. Overtime / wellness signal — % of logged days over 10 hours, this week
    const longDays = await Attendance.find({
      date: { $gte: thisWeekStart, $lte: now },
      totalHours: { $exists: true, $gt: 0 }
    }).select('totalHours').lean();

    if (longDays.length > 0) {
      const overtimeCount = longDays.filter(a => a.totalHours > 10).length;
      const overtimeRate = Math.round((overtimeCount / longDays.length) * 100);
      insights.push({
        type: 'wellness',
        title: 'AI Employee Wellness',
        insight: overtimeRate > 0
          ? `${overtimeRate}% of logged shifts this week ran over 10 hours — worth a wellness check-in.`
          : 'No excessive-hours shifts logged this week.'
      });
    }

    // 3. Face registration coverage — real count from User.hasFaceRegistered
    const [totalActive, registered] = await Promise.all([
      User.countDocuments({ isActive: true, role: { $ne: 'admin' } }),
      User.countDocuments({ isActive: true, role: { $ne: 'admin' }, hasFaceRegistered: true })
    ]);
    if (totalActive > 0) {
      insights.push({
        type: 'resume',
        title: 'AI Face Recognition Coverage',
        insight: `${registered}/${totalActive} active employees have a registered face for AI check-in.`
      });
    }

    // 4. HR Assistant — informational, not data-driven, always shown
    insights.push({
      type: 'assistant',
      title: 'AI HR Assistant',
      insight: 'Ask about leave balances, payroll status, or attendance policy any time.'
    });

    res.status(200).json({
      success: true,
      data: insights
    });
  } catch (error) {
    console.error('Error fetching AI insights:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch AI insights'
    });
  }
};

// Helper functions
async function getDepartmentStats() {
  try {
    const departmentStats = await User.aggregate([
      { $match: { isActive: true } },
      { $group: { _id: '$department', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { name: '$_id', value: '$count', _id: 0 } }
    ]);

    const colors = ['#3B82F6', '#10B981', '#8B5CF6', '#F59E0B', '#EF4444', '#6366F1'];

    return departmentStats.map((dept, index) => ({
      ...dept,
      color: colors[index % colors.length]
    }));
  } catch (error) {
    console.error('Error getting department stats:', error);
    return [];
  }
}

async function getRoleStats() {
  try {
    const roleStats = await User.aggregate([
      { $group: { _id: '$role', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $project: { name: '$_id', value: '$count', _id: 0 } }
    ]);
    return roleStats;
  } catch (error) {
    console.error('Error getting role stats:', error);
    return [];
  }
}

function calculateUptime() {
  try {
    const startTime = process.uptime();
    const uptimeSeconds = Math.floor(startTime);
    const days = Math.floor(uptimeSeconds / (3600 * 24));
    const hours = Math.floor((uptimeSeconds % (3600 * 24)) / 3600);
    const minutes = Math.floor((uptimeSeconds % 3600) / 60);
    const seconds = uptimeSeconds % 60;
    return `${days}d ${hours}h ${minutes}m ${seconds}s`;
  } catch (error) {
    return '0d 0h 0m 0s';
  }
}

// Real database size via MongoDB's own stats
async function getDatabaseSize() {
  try {
    const stats = await mongoose.connection.db.stats();
    const sizeMB = (stats.dataSize / (1024 * 1024)).toFixed(2);
    return `${sizeMB} MB`;
  } catch (error) {
    console.error('Error getting database size:', error);
    return 'Unknown';
  }
}

async function calculateUserChange() {
  try {
    const today = new Date();
    const oneWeekAgo = new Date(today);
    oneWeekAgo.setDate(today.getDate() - 7);

    const usersThisWeek = await User.countDocuments({
      createdAt: { $gte: oneWeekAgo }
    });

    const usersLastWeek = await User.countDocuments({
      createdAt: {
        $gte: new Date(oneWeekAgo.getTime() - 7 * 24 * 60 * 60 * 1000),
        $lt: oneWeekAgo
      }
    });

    if (usersLastWeek === 0) return '+100%';
    const change = ((usersThisWeek - usersLastWeek) / usersLastWeek) * 100;
    return change >= 0 ? `+${change.toFixed(1)}%` : `${change.toFixed(1)}%`;
  } catch (error) {
    return '+0%';
  }
}

function formatTimeAgo(date) {
  if (!date) return 'Just now';
  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Just now';

  const seconds = Math.floor((new Date() - dateObj) / 1000);
  const intervals = {
    year: 31536000, month: 2592000, week: 604800,
    day: 86400, hour: 3600, minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }
  return 'Just now';
}

function parseTimeValue(timeStr) {
  if (timeStr === 'Just now') return Date.now();
  const match = timeStr.match(/(\d+) (second|minute|hour|day|week|month|year)s? ago/);
  if (!match) return 0;

  const value = parseInt(match[1]);
  const unit = match[2];
  const now = Date.now();
  const multipliers = {
    second: 1000, minute: 60 * 1000, hour: 60 * 60 * 1000,
    day: 24 * 60 * 60 * 1000, week: 7 * 24 * 60 * 60 * 1000,
    month: 30 * 24 * 60 * 60 * 1000, year: 365 * 24 * 60 * 60 * 1000
  };
  return now - (value * multipliers[unit]);
}

// MODULE EXPORTS
module.exports = {
  getAdminProfile: exports.getAdminProfile,
  updateAdminProfile: exports.updateAdminProfile,
  getSystemStats: exports.getSystemStats,
  toggle2FA: exports.toggle2FA,
  uploadProfilePicture: exports.uploadProfilePicture,
  deleteProfilePicture: exports.deleteProfilePicture,
  getDashboardStats: exports.getDashboardStats,
  getRecentActivity: exports.getRecentActivity,
  getTeamMembers: exports.getTeamMembers,
  getNotifications: exports.getNotifications,
  getPerformanceMetrics: exports.getPerformanceMetrics,
  getQuickActions: exports.getQuickActions,
  markNotificationRead: exports.markNotificationRead,
  getAttendanceOverview: exports.getAttendanceOverview,
  getLeaveOverview: exports.getLeaveOverview,
  getSystemStatus: exports.getSystemStatus,
  getAIInsights: exports.getAIInsights
};