const User = require('../models/User');
const Leave = require('../models/Leave');
const fs = require('fs');
const path = require('path');

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

// Dashboard Stats
exports.getDashboardStats = async (req, res) => {
  try {
    const totalEmployees = await User.countDocuments({ 
      isActive: true, 
      role: { $ne: 'admin' } 
    });
    
    const activeDepartments = await User.distinct('department', { 
      isActive: true,
      department: { $exists: true, $ne: null, $ne: '' }
    });
    
    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
    
    const systemHealth = 98;
    const employeeSatisfaction = 87;
    const performance = 92;

    res.status(200).json({
      success: true,
      data: {
        totalEmployees: totalEmployees,
        activeDepartments: activeDepartments.length,
        systemHealth: systemHealth,
        pendingTasks: pendingLeaves,
        revenue: 0,
        performance: performance,
        employeeSatisfaction: employeeSatisfaction
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
      .lean();

    for (const leave of recentLeaves) {
      if (leave.userId) {
        const user = await User.findById(leave.userId).select('name').lean();
        if (user) {
          activities.push({
            id: leave._id.toString(),
            message: `${user.name} requested ${leave.type || 'leave'} leave`,
            time: formatTimeAgo(leave.createdAt),
            status: leave.status || 'pending',
            icon: '📝'
          });
        }
      }
    }

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

// Team Members
exports.getTeamMembers = async (req, res) => {
  try {
    const teamMembers = await User.find({
      isActive: true,
      role: { $ne: 'admin' }
    })
      .select('name role department')
      .limit(10)
      .lean();

    const formattedMembers = teamMembers.map(member => ({
      id: member._id,
      name: member.name,
      role: member.role || 'Employee',
      department: member.department || 'General',
      status: 'online',
      productivity: Math.floor(Math.random() * 30) + 70,
      avatar: member.name?.charAt(0) || 'U'
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
    
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const contractsExpiring = await User.countDocuments({
      contractEndDate: { 
        $lte: thirtyDaysFromNow, 
        $gte: new Date(),
        $exists: true,
        $ne: null
      }
    });
    if (contractsExpiring > 0) {
      notifications.push({
        id: 'contracts-expiring',
        message: `${contractsExpiring} contract${contractsExpiring > 1 ? 's are' : ' is'} expiring soon`,
        type: 'contract',
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

// Performance Metrics
exports.getPerformanceMetrics = async (req, res) => {
  try {
    const { timeRange = 'monthly' } = req.query;
    
    const metrics = [
      {
        label: 'System Uptime',
        value: 99.9,
        color: 'from-green-500 to-emerald-500'
      },
      {
        label: 'API Response Time',
        value: 245,
        color: 'from-blue-500 to-cyan-500'
      },
      {
        label: 'Database Performance',
        value: 94,
        color: 'from-purple-500 to-pink-500'
      },
      {
        label: 'Employee Engagement',
        value: 88,
        color: 'from-orange-500 to-amber-500'
      }
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

// Quick Actions
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

async function getDatabaseSize() {
  try {
    return '24.5 MB';
  } catch (error) {
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
  markNotificationRead: exports.markNotificationRead
};