const User = require('../models/User');
const Leave = require('../models/Leave');

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

    // Define allowed fields for update
    const allowedFields = {
      // Personal Information
      name: updateData.name,
      fatherName: updateData.fatherName,
      gender: updateData.gender,
      dateOfBirth: updateData.dateOfBirth,
      bloodGroup: updateData.bloodGroup,
      maritalStatus: updateData.maritalStatus,
      idCardNumber: updateData.idCardNumber,
      idCardIssueDate: updateData.idCardIssueDate,
      idCardExpiryDate: updateData.idCardExpiryDate,
      
      // Contact Information
      phone: updateData.phone,
      alternatePhone: updateData.alternatePhone,
      
      // Address Information
      presentAddress: updateData.presentAddress,
      permanentAddress: updateData.permanentAddress,
      city: updateData.city,
      state: updateData.state,
      country: updateData.country,
      postalCode: updateData.postalCode,
      
      // Employment Information
      employeeType: updateData.employeeType,
      customEmployeeType: updateData.customEmployeeType,
      department: updateData.department,
      customDepartment: updateData.customDepartment,
      position: updateData.position,
      customPosition: updateData.customPosition,
      reportingManager: updateData.reportingManager,
      probationPeriod: updateData.probationPeriod,
      customProbationPeriod: updateData.customProbationPeriod,
      
      // Emergency Contacts
      emergencyContacts: updateData.emergencyContacts || [],
      
      // Salary Information
      salary: updateData.salary,
      fuelAllowance: updateData.fuelAllowance,
      medicalAllowance: updateData.medicalAllowance,
      specialAllowance: updateData.specialAllowance,
      otherAllowance: updateData.otherAllowance,
      currency: updateData.currency,
      salaryFrequency: updateData.salaryFrequency,
      
      // Bank Information
      bankName: updateData.bankName,
      bankAccountNumber: updateData.bankAccountNumber,
      bankAccountTitle: updateData.bankAccountTitle,
      bankBranchCode: updateData.bankBranchCode,
      ibanNumber: updateData.ibanNumber,
      
      // Qualifications & Skills
      qualifications: updateData.qualifications,
      experiences: updateData.experiences || [],
      skills: updateData.skills || [],
      previousExperience: updateData.previousExperience,
      
      // Profile
      profilePicture: updateData.profilePicture,
      
      // Security & Preferences
      twoFactorEnabled: updateData.twoFactorEnabled,
      notificationPreferences: updateData.notificationPreferences || {}
    };

    // Remove undefined values
    Object.keys(allowedFields).forEach(key => {
      if (allowedFields[key] === undefined) {
        delete allowedFields[key];
      }
    });

    const updatedUser = await User.findByIdAndUpdate(
      userId,
      allowedFields,
      { 
        new: true, 
        runValidators: true,
        context: 'query'
      }
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

// Helper functions
async function getDepartmentStats() {
  try {
    const departmentStats = await User.aggregate([
      {
        $match: { isActive: true }
      },
      {
        $group: {
          _id: '$department',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          name: '$_id',
          value: '$count',
          _id: 0
        }
      }
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
      {
        $group: {
          _id: '$role',
          count: { $sum: 1 }
        }
      },
      {
        $sort: { count: -1 }
      },
      {
        $project: {
          name: '$_id',
          value: '$count',
          _id: 0
        }
      }
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
    // Simple placeholder
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
module.exports = {
  getAdminProfile: exports.getAdminProfile,
  updateAdminProfile: exports.updateAdminProfile,
  getSystemStats: exports.getSystemStats,
  toggle2FA: exports.toggle2FA
};
