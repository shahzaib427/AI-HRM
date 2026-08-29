const User = require('../models/User');
const Leave = require('../models/Leave');
const Job = require('../models/Job');
const fs = require('fs');
const path = require('path');
const NotificationService = require('../services/notificationService');

exports.getHRProfile = async (req, res) => {
  try {
    const user = await User.findById(req.user.id)
      .select('-password -passwordHistory -passwordResetToken')
      .lean();

    if (!user) {
      return res.status(404).json({
        success: false,
        error: 'HR profile not found'
      });
    }

    res.status(200).json({
      success: true,
      data: user
    });
  } catch (error) {
    console.error('Error fetching HR profile:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

// UPDATE HR PROFILE - WITH NOTIFICATION
exports.updateHRProfile = async (req, res) => {
  try {
    const userId = req.user.id;
    const updateData = req.body;

    const oldUser = await User.findById(userId).select('name email department position');

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
      department: updateData.department,
      position: updateData.position,
      reportingManager: updateData.reportingManager,
      probationPeriod: updateData.probationPeriod,
      contractEndDate: updateData.contractEndDate,
      hrSpecialization: updateData.hrSpecialization,
      hrExperience: updateData.hrExperience,
      employeeCountManaged: updateData.employeeCountManaged,
      payrollAccess: updateData.payrollAccess,
      recruitmentAccess: updateData.recruitmentAccess,
      leaveManagementAccess: updateData.leaveManagementAccess,
      contractManagementAccess: updateData.contractManagementAccess,
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
      certifications: updateData.certifications || [],
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

    const io = req.app.get('io');
    const notificationService = new NotificationService(io);

    const adminUsers = await User.find({ role: 'admin' });

    let changeDescription = '';
    if (oldUser.department !== updateData.department) {
      changeDescription = `Department changed from ${oldUser.department} to ${updateData.department}`;
    } else if (oldUser.position !== updateData.position) {
      changeDescription = `Position changed from ${oldUser.position} to ${updateData.position}`;
    } else {
      changeDescription = 'Profile information updated';
    }

    for (const admin of adminUsers) {
      await notificationService.createNotification({
        recipient: {
          userId: admin._id,
          userModel: 'User',
          role: admin.role
        },
        type: 'employee_updated',
        title: 'HR Profile Updated 📝',
        message: `${updatedUser.name} (HR) has updated their profile. ${changeDescription}`,
        data: {
          userId: userId,
          userName: updatedUser.name,
          changes: changeDescription,
          department: updateData.department,
          position: updateData.position
        },
        priority: 'medium'
      });
    }

    res.status(200).json({
      success: true,
      message: 'HR profile updated successfully with notification to Admin',
      data: updatedUser
    });
  } catch (error) {
    console.error('Error updating HR profile:', error);

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

exports.getHRStats = async (req, res) => {
  try {
    const [
      totalEmployees,
      openJobPositions,
      pendingLeaves,
      contractsExpiring,
      departmentStats
    ] = await Promise.all([
      User.countDocuments({ isActive: true, role: { $ne: 'admin' } }),
      Job.countDocuments({ status: 'Open' }),
      Leave.countDocuments({ status: 'pending' }),
      User.countDocuments({
        contractEndDate: {
          $gte: new Date(),
          $lte: new Date(new Date().setDate(new Date().getDate() + 30))
        },
        isActive: true
      }),
      getDepartmentStats()
    ]);

    const stats = {
      totalEmployees,
      activeRecruitments: openJobPositions,
      pendingLeaves,
      contractsExpiring,
      totalDepartments: departmentStats.length,
      departmentDistribution: departmentStats
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching HR stats:', error);
    res.status(500).json({
      success: false,
      error: 'Server error'
    });
  }
};

async function getDepartmentStats() {
  try {
    const departmentStats = await User.aggregate([
      { $match: { isActive: true, department: { $exists: true, $ne: null, $ne: '' } } },
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

// UPLOAD PROFILE PICTURE - WITH NOTIFICATION
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

    const io = req.app.get('io');
    const notificationService = new NotificationService(io);

    const adminUsers = await User.find({ role: 'admin' });
    for (const admin of adminUsers) {
      await notificationService.createNotification({
        recipient: {
          userId: admin._id,
          userModel: 'User',
          role: admin.role
        },
        type: 'employee_updated',
        title: 'Profile Picture Updated 🖼️',
        message: `${user.name} (HR) has updated their profile picture`,
        data: {
          userId: user._id,
          userName: user.name
        },
        priority: 'low'
      });
    }

    res.status(200).json({
      success: true,
      message: 'Profile picture uploaded successfully with notification',
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

// Dashboard Stats — real data only. Training Progress removed (no model to back it).
exports.getDashboardStats = async (req, res) => {
  try {
    const now = new Date();
    const firstDayOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

    const totalEmployees = await User.countDocuments({ isActive: true, role: { $ne: 'admin' } });

    // ✅ Now real: count of open job postings from the Job model
    const openPositions = await Job.countDocuments({ status: 'Open' });

    const recentHires = await User.countDocuments({
      joiningDate: { $gte: firstDayOfMonth, $exists: true, $ne: null },
      role: { $ne: 'admin' }
    });
    const pendingLeaveRequests = await Leave.countDocuments({ status: 'pending' });

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);
    const employeesLeft = await User.countDocuments({
      isActive: false,
      updatedAt: { $gte: sixMonthsAgo }
    });
    const turnoverRate = totalEmployees > 0 ? ((employeesLeft / totalEmployees) * 100).toFixed(1) : 0;

    const stats = {
      totalEmployees: totalEmployees,
      openPositions: openPositions,
      pendingLeave: pendingLeaveRequests,
      newHires: recentHires,
      turnoverRate: parseFloat(turnoverRate)
      // trainingProgress removed — no Training model exists to back it
    };

    res.status(200).json({
      success: true,
      data: stats
    });
  } catch (error) {
    console.error('Error fetching dashboard stats:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch dashboard stats'
    });
  }
};

// Recent Activity - Real data only
exports.getRecentActivity = async (req, res) => {
  try {
    const activities = [];

    // ✅ FIX: Leave schema uses `employee`, not `userId` — the old check
    // `if (leave.userId)` was always false, so leave activity never appeared.
    const recentLeaves = await Leave.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .populate('employee', 'name')
      .lean();

    recentLeaves.forEach(leave => {
      if (leave.employee && leave.employee.name) {
        activities.push({
          id: leave._id.toString(),
          message: `${leave.employee.name} requested ${leave.type || 'leave'} leave`,
          time: leave.createdAt,
          status: leave.status || 'pending',
          icon: getLeaveIcon(leave.type)
        });
      }
    });

    // Get recent new employees (last 30 days)
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
        message: `New employee joined: ${emp.name} (${emp.department || 'No department'})`,
        time: emp.joiningDate,
        status: 'completed',
        icon: '👋'
      });
    });

    // Real: recently posted/opened job listings
    const recentJobs = await Job.find({ status: 'Open' })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(5)
      .lean();

    recentJobs.forEach(job => {
      activities.push({
        id: job._id.toString(),
        message: `New job posted: ${job.title} (${job.department})`,
        time: job.publishedAt || job.createdAt,
        status: 'completed',
        icon: '📋'
      });
    });

    activities.sort((a, b) => new Date(b.time) - new Date(a.time));

    const formattedActivities = activities.slice(0, 10).map(activity => ({
      ...activity,
      time: formatTimeAgo(activity.time)
    }));

    res.status(200).json({
      success: true,
      data: formattedActivities
    });
  } catch (error) {
    console.error('Error fetching recent activity:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recent activity'
    });
  }
};

// Pending Approvals - Real data only (contractEndDate now exists on User)
exports.getPendingApprovals = async (req, res) => {
  try {
    const approvals = [];

    const pendingLeaves = await Leave.countDocuments({ status: 'pending' });
    if (pendingLeaves > 0) {
      approvals.push({
        id: 'leave-requests',
        title: 'Leave Requests',
        count: pendingLeaves,
        color: 'yellow'
      });
    }

    const probationEmployees = await User.countDocuments({
      isActive: true,
      employeeType: 'probation',
      role: { $ne: 'admin' }
    });
    if (probationEmployees > 0) {
      approvals.push({
        id: 'probation',
        title: 'Probation Period',
        count: probationEmployees,
        color: 'blue'
      });
    }

    // ✅ Now real: contractEndDate exists on User, so this actually matches records
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    const contractsExpiring = await User.countDocuments({
      contractEndDate: {
        $lte: thirtyDaysFromNow,
        $gte: new Date(),
        $exists: true,
        $ne: null
      },
      isActive: true
    });
    if (contractsExpiring > 0) {
      approvals.push({
        id: 'contracts',
        title: 'Contract Renewals',
        count: contractsExpiring,
        color: 'green'
      });
    }

    res.status(200).json({
      success: true,
      data: approvals
    });
  } catch (error) {
    console.error('Error fetching pending approvals:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch pending approvals'
    });
  }
};

// Recruitment Data — now real, built from the Job model
exports.getRecruitmentData = async (req, res) => {
  try {
    const openJobs = await Job.find({ status: 'Open' })
      .sort({ publishedAt: -1, createdAt: -1 })
      .limit(6)
      .lean();

    const now = new Date();

    const recruitmentData = openJobs.map(job => {
      // Progress is a time-based proxy: how far through the posting-to-deadline
      // window we are. There's no applicant-pipeline/stage field in the Job
      // schema, so this is NOT a literal "screening/interview/offer" percentage —
      // it's how much of the hiring window has elapsed.
      let progress = 0;
      if (job.deadline && job.publishedAt) {
        const totalWindow = new Date(job.deadline) - new Date(job.publishedAt);
        const elapsed = now - new Date(job.publishedAt);
        if (totalWindow > 0) {
          progress = Math.min(100, Math.max(0, Math.round((elapsed / totalWindow) * 100)));
        }
      }

      return {
        id: job._id.toString(),
        position: job.title,
        applicants: job.applicantsCount || 0,
        stage: job.status,
        progress
      };
    });

    res.status(200).json({
      success: true,
      data: recruitmentData
    });
  } catch (error) {
    console.error('Error fetching recruitment data:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch recruitment data'
    });
  }
};

// HR Metrics - Real data only
exports.getHRMetrics = async (req, res) => {
  try {
    const metrics = [];

    const timeToHireAgg = await User.aggregate([
      {
        $match: {
          joiningDate: { $exists: true, $ne: null },
          createdAt: { $exists: true, $ne: null },
          role: { $ne: 'admin' }
        }
      },
      {
        $project: {
          daysToHire: {
            $ceil: {
              $divide: [
                { $subtract: ['$joiningDate', '$createdAt'] },
                1000 * 60 * 60 * 24
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: null,
          averageDays: { $avg: '$daysToHire' }
        }
      }
    ]);

    const avgTimeToHire = timeToHireAgg[0]?.averageDays;
    if (avgTimeToHire && avgTimeToHire > 0) {
      metrics.push({
        label: 'Time to Hire',
        value: Math.round(avgTimeToHire),
        color: 'from-blue-500 to-cyan-500',
        description: 'Average days from account creation to joining'
      });
    }

    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const employeesStartOfPeriod = await User.countDocuments({
      createdAt: { $lte: sixMonthsAgo },
      role: { $ne: 'admin' }
    });

    const currentEmployees = await User.countDocuments({
      isActive: true,
      role: { $ne: 'admin' }
    });

    if (employeesStartOfPeriod > 0 && currentEmployees > 0) {
      const retentionRate = Math.round((currentEmployees / employeesStartOfPeriod) * 100);
      metrics.push({
        label: 'Retention Rate',
        value: retentionRate,
        color: 'from-purple-500 to-pink-500',
        description: '6 month retention'
      });
    }

    const genderStats = await User.aggregate([
      {
        $match: {
          gender: { $exists: true, $ne: null, $ne: '' },
          role: { $ne: 'admin' }
        }
      },
      {
        $group: {
          _id: '$gender',
          count: { $sum: 1 }
        }
      }
    ]);

    const totalWithGender = genderStats.reduce((sum, g) => sum + g.count, 0);
    if (totalWithGender > 0) {
      const femaleCount = genderStats.find(g => g._id === 'female')?.count || 0;
      const maleCount = genderStats.find(g => g._id === 'male')?.count || 0;
      if (maleCount > 0) {
        const diversityScore = Math.round((Math.min(femaleCount, maleCount) / Math.max(femaleCount, maleCount)) * 100);
        metrics.push({
          label: 'Diversity Score',
          value: diversityScore,
          color: 'from-indigo-500 to-purple-500',
          description: 'Gender diversity metric'
        });
      }
    }

    // ✅ New real metric, now possible thanks to the Job model
    const totalOpenJobs = await Job.countDocuments({ status: 'Open' });
    if (totalOpenJobs > 0) {
      const avgApplicantsAgg = await Job.aggregate([
        { $match: { status: 'Open' } },
        { $group: { _id: null, avgApplicants: { $avg: '$applicantsCount' } } }
      ]);
      const avgApplicants = avgApplicantsAgg[0]?.avgApplicants || 0;
      metrics.push({
        label: 'Avg Applicants/Job',
        value: Math.round(avgApplicants),
        color: 'from-emerald-500 to-teal-500',
        description: `Across ${totalOpenJobs} open position${totalOpenJobs !== 1 ? 's' : ''}`
      });
    }

    if (metrics.length === 0) {
      metrics.push({
        label: 'No Data Available',
        value: 0,
        color: 'from-gray-500 to-gray-500',
        description: 'Add employee data to see metrics'
      });
    }

    res.status(200).json({
      success: true,
      data: metrics
    });
  } catch (error) {
    console.error('Error fetching HR metrics:', error);
    res.status(500).json({
      success: false,
      error: 'Failed to fetch HR metrics'
    });
  }
};

// Helper functions
function formatTimeAgo(date) {
  if (!date) return 'Just now';

  const dateObj = new Date(date);
  if (isNaN(dateObj.getTime())) return 'Just now';

  const seconds = Math.floor((new Date() - dateObj) / 1000);

  const intervals = {
    year: 31536000,
    month: 2592000,
    week: 604800,
    day: 86400,
    hour: 3600,
    minute: 60
  };

  for (const [unit, secondsInUnit] of Object.entries(intervals)) {
    const interval = Math.floor(seconds / secondsInUnit);
    if (interval >= 1) {
      return `${interval} ${unit}${interval === 1 ? '' : 's'} ago`;
    }
  }
  return 'Just now';
}

function getLeaveIcon(type) {
  // Matches the current Leave.type enum: ['monthly', 'emergency']
  const icons = {
    monthly: '🏖️',
    emergency: '🚨'
  };
  return icons[type] || '📝';
}