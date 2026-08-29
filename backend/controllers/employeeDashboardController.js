// backend/controllers/employeeDashboardController.js
const mongoose = require('mongoose');
const User = require('../models/User');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const asyncHandler = require('express-async-handler');

// Attendance statuses that mean the employee actually showed up.
// 'present' AND 'late' both count as attended — being late doesn't mean absent.
const ATTENDED_STATUSES = ['present', 'late', 'half-day'];

// Get employee-specific dashboard stats
exports.getEmployeeStats = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    // Get user details
    const user = await User.findById(userId).select('name email department position leaveBalance joiningDate');

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }

    // ✅ FIX: aggregate() does NOT auto-cast strings to ObjectId the way
    // find()/findOne() do — without this cast, $match never matched anything
    // and leaveStats/usedLeaves silently returned empty results.
    const leaveStats = await Leave.aggregate([
      {
        $match: {
          employee: userObjectId,
          status: { $in: ['approved', 'pending', 'rejected'] }
        }
      },
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 },
          totalDays: { $sum: '$days' }
        }
      }
    ]);

    // Format leave stats
    const formattedLeaveStats = {};
    leaveStats.forEach(stat => {
      formattedLeaveStats[stat._id] = {
        count: stat.count,
        totalDays: stat.totalDays || 0
      };
    });

    // Calculate leave balance
    const leaveBalance = user.leaveBalance || {};
    const totalAvailableLeaves = Object.values(leaveBalance).reduce((sum, balance) => sum + balance, 0);

    // Get total approved leaves for current year
    const currentYear = new Date().getFullYear();
    const startOfYear = new Date(currentYear, 0, 1);
    const endOfYear = new Date(currentYear, 11, 31);

    const usedLeaves = await Leave.aggregate([
      {
        $match: {
          employee: userObjectId, // ✅ same ObjectId fix
          status: 'approved',
          startDate: { $gte: startOfYear, $lte: endOfYear }
        }
      },
      {
        $group: {
          _id: null,
          totalDays: { $sum: '$days' }
        }
      }
    ]);

    const totalUsedLeaves = usedLeaves.length > 0 ? usedLeaves[0].totalDays : 0;

    // Get attendance for current month
    let presentDays = 0;
    let workingDays = 0;
    let attendanceRate = 0;

    const currentDate = new Date();
    const currentMonth = currentDate.getMonth();
    const attYear = currentDate.getFullYear();
    const startOfMonth = new Date(attYear, currentMonth, 1);
    const endOfMonth = new Date(attYear, currentMonth + 1, 0, 23, 59, 59, 999);

    const attendance = await Attendance.find({
      employee: userId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).lean();

    workingDays = attendance.length;
    // ✅ FIX: 'late' and 'half-day' both mean the employee showed up — only
    // filtering on 'present' silently excluded anyone who arrived after 9 AM.
    presentDays = attendance.filter(a => ATTENDED_STATUSES.includes(a.status)).length;
    attendanceRate = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

    res.json({
      success: true,
      data: {
        userInfo: {
          name: user.name,
          email: user.email,
          department: user.department,
          position: user.position,
          joiningDate: user.joiningDate
        },
        stats: {
          leaveBalance: leaveBalance,
          totalAvailableLeaves,
          totalUsedLeaves,
          leaveRequests: {
            pending: formattedLeaveStats.pending?.count || 0,
            approved: formattedLeaveStats.approved?.count || 0,
            rejected: formattedLeaveStats.rejected?.count || 0,
            total: (formattedLeaveStats.pending?.count || 0) +
                   (formattedLeaveStats.approved?.count || 0) +
                   (formattedLeaveStats.rejected?.count || 0)
          },
          attendance: {
            presentDays,
            workingDays,
            attendanceRate
          }
        }
      }
    });

  } catch (error) {
    console.error('Get employee stats error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Get upcoming events
// ✅ Fake "Team Meeting" / "Training Session" entries removed per request —
// this now returns ONLY real, DB-backed upcoming approved leaves.
exports.getUpcomingEvents = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);

    const upcomingLeaves = await Leave.find({
      employee: userId,
      status: 'approved',
      startDate: { $gte: new Date(), $lte: thirtyDaysFromNow }
    })
      .select('type startDate endDate days reason')
      .sort('startDate')
      .limit(5);

    const events = upcomingLeaves.map(leave => ({
      id: leave._id,
      title: `${leave.type.charAt(0).toUpperCase() + leave.type.slice(1)} Leave`,
      date: new Date(leave.startDate),
      endDate: new Date(leave.endDate),
      type: 'leave',
      description: leave.reason,
      icon: '🏖️',
      color: leave.type === 'emergency' ? 'red' : 'blue'
    }));

    res.json({
      success: true,
      data: events
    });

  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Get employee activities (already real — pulls actual leave request history)
exports.getEmployeeActivities = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    const recentLeaves = await Leave.find({
      employee: userId
    })
      .select('type startDate endDate days status reason appliedAt')
      .sort('-appliedAt')
      .limit(10);

    const activities = recentLeaves.map(leave => ({
      id: leave._id,
      type: 'leave',
      title: `${leave.type.charAt(0).toUpperCase() + leave.type.slice(1)} Leave ${leave.status}`,
      description: `${leave.days} day(s): ${leave.reason}`,
      time: leave.appliedAt,
      status: leave.status,
      icon: leave.status === 'approved' ? '✅' :
            leave.status === 'pending' ? '⏳' : '❌',
      color: leave.status === 'approved' ? 'green' :
             leave.status === 'pending' ? 'yellow' : 'red'
    }));

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    res.json({
      success: true,
      data: activities.slice(0, 8)
    });

  } catch (error) {
    console.error('Get employee activities error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Get team members — real attendance-based status & productivity, no randomness
exports.getTeamMembers = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;

    const user = await User.findById(userId).select('department');

    if (!user || !user.department) {
      return res.json({
        success: true,
        data: []
      });
    }

    const teamMembers = await User.find({
      department: user.department,
      _id: { $ne: userId },
      isActive: true
    })
      .select('name email department position profilePicture')
      .limit(6)
      .lean();

    const thirtyDaysAgo = new Date(); thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    const todayStart = new Date(); todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date(); todayEnd.setHours(23, 59, 59, 999);

    const members = await Promise.all(teamMembers.map(async (member) => {
      // Real productivity proxy: attendance rate over the last 30 days
      const presentDays = await Attendance.countDocuments({
        employee: member._id,
        date: { $gte: thirtyDaysAgo },
        status: { $in: ATTENDED_STATUSES }
      });
      const productivity = Math.min(100, Math.round((presentDays / 22) * 100)); // ~22 working days/month

      // Real online status: checked in today, not checked out yet
      const activeToday = await Attendance.exists({
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
        email: member.email,
        role: member.position || 'Team Member',
        department: member.department,
        avatar: member.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&color=fff`,
        status: activeToday ? 'online' : 'offline',
        productivity
      };
    }));

    res.json({
      success: true,
      data: members
    });

  } catch (error) {
    console.error('Get team members error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Get performance metrics — fully real, no invented Quality/Teamwork scores
exports.getPerformanceMetrics = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    const userObjectId = new mongoose.Types.ObjectId(userId);

    const now = new Date();
    const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
    const endOfMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);

    const attendanceThisMonth = await Attendance.find({
      employee: userId,
      date: { $gte: startOfMonth, $lte: endOfMonth }
    }).select('status lateMinutes totalHours').lean();

    // 1. Attendance: % of working days this month the employee showed up
    const workingDays = attendanceThisMonth.length;
    const presentDays = attendanceThisMonth.filter(a => ATTENDED_STATUSES.includes(a.status)).length;
    const attendanceValue = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;

    // 2. Punctuality: % of check-ins this month that were on time (lateMinutes === 0)
    const checkedInRecords = attendanceThisMonth.filter(a => ATTENDED_STATUSES.includes(a.status));
    const onTimeCount = checkedInRecords.filter(a => (a.lateMinutes || 0) === 0).length;
    const punctualityValue = checkedInRecords.length > 0
      ? Math.round((onTimeCount / checkedInRecords.length) * 100)
      : 0;

    // 3. Work Hours: average hours logged this month vs 8h/day target
    const withHours = attendanceThisMonth.filter(a => a.totalHours && a.totalHours > 0);
    const avgHours = withHours.length > 0
      ? withHours.reduce((sum, a) => sum + a.totalHours, 0) / withHours.length
      : 0;
    const workHoursValue = Math.min(100, Math.round((avgHours / 8) * 100));

    // 4. Leave Utilization: % of this employee's total leave balance used this year
    const user = await User.findById(userId).select('leaveBalance').lean();
    const leaveBalance = user?.leaveBalance || {};
    const totalAvailableLeaves = Object.values(leaveBalance).reduce((sum, b) => sum + b, 0);

    const currentYear = now.getFullYear();
    const usedLeaves = await Leave.aggregate([
      {
        $match: {
          employee: userObjectId,
          status: 'approved',
          startDate: { $gte: new Date(currentYear, 0, 1), $lte: new Date(currentYear, 11, 31) }
        }
      },
      { $group: { _id: null, totalDays: { $sum: '$days' } } }
    ]);
    const totalUsedLeaves = usedLeaves.length > 0 ? usedLeaves[0].totalDays : 0;
    // "Utilization" here means used-vs-total (denominator includes both used + remaining)
    const leaveUtilizationValue = (totalAvailableLeaves + totalUsedLeaves) > 0
      ? Math.round((totalUsedLeaves / (totalAvailableLeaves + totalUsedLeaves)) * 100)
      : 0;

    const metrics = [
      {
        label: 'Attendance',
        value: attendanceValue,
        icon: '📅',
        color: 'from-green-500 to-emerald-500',
        description: `${presentDays} of ${workingDays} working days this month`
      },
      {
        label: 'Punctuality',
        value: punctualityValue,
        icon: '⏰',
        color: 'from-blue-500 to-cyan-500',
        description: 'On-time check-ins this month'
      },
      {
        label: 'Work Hours',
        value: workHoursValue,
        icon: '⏱️',
        color: 'from-purple-500 to-pink-500',
        description: `Avg ${avgHours.toFixed(1)}h/day vs 8h target`
      },
      {
        label: 'Leave Utilization',
        value: leaveUtilizationValue,
        icon: '🏖️',
        color: 'from-amber-500 to-orange-500',
        description: `${totalUsedLeaves} day(s) used this year`
      }
    ];

    res.json({
      success: true,
      data: metrics
    });

  } catch (error) {
    console.error('Get performance metrics error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});