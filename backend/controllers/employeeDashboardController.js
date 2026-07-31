// backend/controllers/employeeDashboardController.js
const User = require('../models/User');
const Leave = require('../models/Leave');
const Attendance = require('../models/Attendance');
const asyncHandler = require('express-async-handler');

// Get employee-specific dashboard stats
exports.getEmployeeStats = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get user details
    const user = await User.findById(userId).select('name email department position leaveBalance joiningDate');
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'Employee not found'
      });
    }
    
    // Get leave statistics
    const leaveStats = await Leave.aggregate([
      {
        $match: {
          employee: userId,
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
          employee: userId,
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
    
    // Get attendance for current month (if you have Attendance model)
    let presentDays = 0;
    let workingDays = 0;
    let attendanceRate = 0;
    
    // Check if Attendance model exists
    if (Attendance) {
      const currentDate = new Date();
      const currentMonth = currentDate.getMonth();
      const currentYear = currentDate.getFullYear();
      const startOfMonth = new Date(currentYear, currentMonth, 1);
      const endOfMonth = new Date(currentYear, currentMonth + 1, 0);
      
      const attendance = await Attendance.find({
        employee: userId,
        date: { $gte: startOfMonth, $lte: endOfMonth }
      });
      
      workingDays = attendance.length;
      presentDays = attendance.filter(a => a.status === 'present').length;
      attendanceRate = workingDays > 0 ? Math.round((presentDays / workingDays) * 100) : 0;
    }
    
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
exports.getUpcomingEvents = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get upcoming leaves (next 30 days)
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
    
    // Format events
    const events = upcomingLeaves.map(leave => ({
      id: leave._id,
      title: `${leave.type.charAt(0).toUpperCase() + leave.type.slice(1)} Leave`,
      date: new Date(leave.startDate),
      endDate: new Date(leave.endDate),
      type: 'leave',
      description: leave.reason,
      icon: '🏖️',
      color: leave.type === 'annual' ? 'blue' : 
             leave.type === 'sick' ? 'red' : 
             leave.type === 'casual' ? 'green' : 'purple'
    }));
    
    // Add company events
    const companyEvents = [
      {
        id: 'event-1',
        title: 'Team Meeting',
        date: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000),
        type: 'meeting',
        description: 'Weekly team sync',
        icon: '👥',
        color: 'indigo'
      },
      {
        id: 'event-2',
        title: 'Training Session',
        date: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        type: 'training',
        description: 'New software training',
        icon: '📚',
        color: 'amber'
      }
    ];
    
    const allEvents = [...events, ...companyEvents]
      .sort((a, b) => a.date - b.date)
      .slice(0, 5);
    
    res.json({
      success: true,
      data: allEvents
    });
    
  } catch (error) {
    console.error('Get upcoming events error:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
});

// Get employee activities
exports.getEmployeeActivities = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get recent leave requests
    const recentLeaves = await Leave.find({
      employee: userId
    })
    .select('type startDate endDate days status reason appliedAt')
    .sort('-appliedAt')
    .limit(10);
    
    // Format activities
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
    
    // Sort by time
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

// Get team members
exports.getTeamMembers = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Get current user's department
    const user = await User.findById(userId).select('department');
    
    if (!user || !user.department) {
      return res.json({
        success: true,
        data: []
      });
    }
    
    // Find team members in same department (excluding current user)
    const teamMembers = await User.find({
      department: user.department,
      _id: { $ne: userId },
      isActive: true
    })
    .select('name email department position profilePicture')
    .limit(6);
    
    const members = teamMembers.map(member => ({
      id: member._id,
      name: member.name,
      email: member.email,
      role: member.position || 'Team Member',
      department: member.department,
      avatar: member.profilePicture || `https://ui-avatars.com/api/?name=${encodeURIComponent(member.name)}&background=random&color=fff`,
      status: 'online', // You can implement actual status logic
      productivity: Math.floor(Math.random() * 30) + 70 // Mock data for now
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

// Get performance metrics
exports.getPerformanceMetrics = asyncHandler(async (req, res) => {
  try {
    const userId = req.user.id;
    
    // Mock performance metrics - replace with actual calculations
    const metrics = [
      {
        label: 'Attendance',
        value: 95,
        icon: '📅',
        color: 'from-green-500 to-emerald-500',
        description: 'Present days this month'
      },
      {
        label: 'Productivity',
        value: 88,
        icon: '📊',
        color: 'from-blue-500 to-cyan-500',
        description: 'Based on task completion'
      },
      {
        label: 'Quality',
        value: 92,
        icon: '⭐',
        color: 'from-purple-500 to-pink-500',
        description: 'Work quality score'
      },
      {
        label: 'Teamwork',
        value: 87,
        icon: '👥',
        color: 'from-amber-500 to-orange-500',
        description: 'Collaboration rating'
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